from rest_framework import generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404

from lostfound.models import (
    KategoriBarang, LaporanBarang, FotoBarang, KlaimBarang, Notifikasi
)
from lostfound.serializers import (
    KategoriSerializer,
    LaporanListSerializer,
    LaporanDetailSerializer,
    FotoBarangSerializer,
    KlaimSerializer,
    KlaimVerifikasiSerializer,
)
from lostfound.filters import LaporanFilter


# ── Kategori ──────────────────────────────────────────────────────────────────

class KategoriListView(generics.ListAPIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset           = KategoriBarang.objects.all()
    serializer_class   = KategoriSerializer


# ── Laporan Barang ────────────────────────────────────────────────────────────

class LaporanListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class    = LaporanFilter
    search_fields      = ['judul', 'deskripsi', 'lokasi']
    ordering_fields    = ['created_at', 'tanggal_kejadian']
    ordering           = ['-created_at']

    def get_queryset(self):
        return LaporanBarang.objects.select_related(
            'pelapor', 'kategori'
        ).prefetch_related('fotos', 'klaim').all()

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return LaporanListSerializer
        return LaporanDetailSerializer

    def perform_create(self, serializer):
        serializer.save(pelapor=self.request.user)


class LaporanDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = LaporanBarang.objects.select_related(
        'pelapor', 'kategori'
    ).prefetch_related('fotos', 'klaim')
    serializer_class = LaporanDetailSerializer

    def _cek_izin(self, request, instance):
        if instance.pelapor != request.user and not request.user.is_staff:
            return Response({'error': 'Tidak memiliki izin.'}, status=status.HTTP_403_FORBIDDEN)
        return None

    def update(self, request, *args, **kwargs):
        err = self._cek_izin(request, self.get_object())
        if err: return err
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        err = self._cek_izin(request, self.get_object())
        if err: return err
        return super().destroy(request, *args, **kwargs)


class MyLaporanView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = LaporanListSerializer

    def get_queryset(self):
        return LaporanBarang.objects.filter(
            pelapor=self.request.user
        ).select_related('kategori').prefetch_related('fotos', 'klaim').order_by('-created_at')


# ── Upload Foto ───────────────────────────────────────────────────────────────

class FotoUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def post(self, request, laporan_id):
        laporan = get_object_or_404(LaporanBarang, id=laporan_id)
        if laporan.pelapor != request.user and not request.user.is_staff:
            return Response({'error': 'Tidak memiliki izin.'}, status=status.HTTP_403_FORBIDDEN)

        fotos_uploaded = request.FILES.getlist('fotos')
        if not fotos_uploaded:
            return Response({'error': 'Tidak ada file foto.'}, status=status.HTTP_400_BAD_REQUEST)

        hasil = []
        for i, foto_file in enumerate(fotos_uploaded):
            is_primary = (i == 0 and not laporan.fotos.exists())
            obj = FotoBarang.objects.create(
                laporan=laporan, foto=foto_file, is_primary=is_primary
            )
            hasil.append(FotoBarangSerializer(obj, context={'request': request}).data)

        return Response({'uploaded': hasil}, status=status.HTTP_201_CREATED)

    def delete(self, request, laporan_id):
        """Hapus foto tertentu."""
        foto_id = request.data.get('foto_id')
        foto    = get_object_or_404(FotoBarang, id=foto_id, laporan__id=laporan_id)
        if foto.laporan.pelapor != request.user and not request.user.is_staff:
            return Response({'error': 'Tidak memiliki izin.'}, status=status.HTTP_403_FORBIDDEN)
        foto.foto.delete(save=False)
        foto.delete()
        return Response({'message': 'Foto dihapus.'})


# ── Klaim Barang ──────────────────────────────────────────────────────────────

class KlaimCreateView(generics.CreateAPIView):
    """
    POST /api/barang/<laporan_id>/klaim/
    Pengklaim upload foto KTM + keterangan untuk mengklaim barang.
    """
    permission_classes = [IsAuthenticated]
    serializer_class   = KlaimSerializer
    parser_classes     = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        laporan = get_object_or_404(LaporanBarang, id=self.kwargs['laporan_id'])
        serializer.save(laporan=laporan)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        # Inject laporan ke context serializer untuk validasi
        ctx['laporan_id'] = self.kwargs.get('laporan_id')
        return ctx


class KlaimListView(generics.ListAPIView):
    """
    GET /api/barang/<laporan_id>/klaim/
    Hanya pelapor & admin yang bisa lihat semua klaim untuk laporan miliknya.
    """
    permission_classes = [IsAuthenticated]
    serializer_class   = KlaimSerializer

    def get_queryset(self):
        laporan = get_object_or_404(LaporanBarang, id=self.kwargs['laporan_id'])
        if laporan.pelapor != self.request.user and not self.request.user.is_staff:
            return KlaimBarang.objects.none()
        return KlaimBarang.objects.filter(
            laporan=laporan
        ).select_related('pengklaim').order_by('-created_at')


class KlaimVerifikasiView(APIView):
    """
    POST /api/barang/klaim/<klaim_id>/verifikasi/
    Pelapor/admin approve atau reject klaim.
    Body: { "aksi": "approve"|"reject", "catatan": "..." }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, klaim_id):
        klaim = get_object_or_404(KlaimBarang, id=klaim_id)

        # Hanya pelapor atau admin yang bisa verifikasi
        if klaim.laporan.pelapor != request.user and not request.user.is_staff:
            return Response({'error': 'Tidak memiliki izin.'}, status=status.HTTP_403_FORBIDDEN)

        if klaim.status != 'menunggu':
            return Response(
                {'error': f'Klaim sudah diproses sebelumnya (status: {klaim.get_status_display()}).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = KlaimVerifikasiSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        aksi    = serializer.validated_data['aksi']
        catatan = serializer.validated_data['catatan']

        if aksi == 'approve':
            klaim.approve(catatan=catatan)
            return Response({
                'message': 'Klaim disetujui. Status barang diubah menjadi "Barang Telah Diambil".',
                'status_laporan': klaim.laporan.status,
            })
        else:
            klaim.reject(catatan=catatan)
            return Response({'message': 'Klaim ditolak dan notifikasi telah dikirim.'})


class MyKlaimView(generics.ListAPIView):
    """GET /api/barang/klaim/saya/ — daftar klaim yang pernah diajukan user."""
    permission_classes = [IsAuthenticated]
    serializer_class   = KlaimSerializer

    def get_queryset(self):
        return KlaimBarang.objects.filter(
            pengklaim=self.request.user
        ).select_related('laporan', 'laporan__kategori').order_by('-created_at')


class UpdateStatusManualView(APIView):
    """
    PATCH /api/barang/<laporan_id>/status/
    Pelapor bisa manual set status (misal batalkan dari 'proses' ke 'aktif').
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, laporan_id):
        laporan    = get_object_or_404(LaporanBarang, id=laporan_id)
        new_status = request.data.get('status')

        if laporan.pelapor != request.user and not request.user.is_staff:
            return Response({'error': 'Tidak memiliki izin.'}, status=status.HTTP_403_FORBIDDEN)

        valid = [s[0] for s in LaporanBarang.STATUS_CHOICES]
        if new_status not in valid:
            return Response({'error': f'Status tidak valid. Pilihan: {valid}'}, status=400)

        laporan.status = new_status
        laporan.save(update_fields=['status', 'updated_at'])
        return Response({'message': f'Status diubah ke "{laporan.get_status_display()}".'})
