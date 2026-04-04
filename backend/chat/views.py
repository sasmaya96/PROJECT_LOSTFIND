from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import RuangChat, Pesan
from .serializers import RuangChatSerializer, PesanSerializer, BuatRuangChatSerializer
from lostfound.models import User


class DaftarRuangChatView(generics.ListAPIView):
    """
    GET /api/chat/
    Daftar semua ruang DM milik user yang sedang login,
    diurutkan dari yang paling baru ada pesannya.
    """
    permission_classes = [IsAuthenticated]
    serializer_class   = RuangChatSerializer

    def get_queryset(self):
        return RuangChat.objects.filter(
            peserta=self.request.user
        ).prefetch_related('peserta', 'pesan', 'pesan__pengirim').order_by('-updated_at')


class BukaRuangChatView(APIView):
    """
    POST /api/chat/buka/
    Buka atau buat ruang DM baru dengan user lain.
    Body: { "user_id": 5, "laporan_id": 12 }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BuatRuangChatSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user_id    = serializer.validated_data['user_id']
        laporan_id = serializer.validated_data.get('laporan_id')

        user_lain = User.objects.get(id=user_id)
        laporan   = None
        if laporan_id:
            from lostfound.models import LaporanBarang
            laporan = LaporanBarang.objects.get(id=laporan_id)

        ruang = RuangChat.get_or_create_dm(request.user, user_lain, laporan=laporan)

        return Response(
            RuangChatSerializer(ruang, context={'request': request}).data,
            status=status.HTTP_200_OK
        )


class DetailRuangChatView(generics.RetrieveAPIView):
    """
    GET /api/chat/<ruang_id>/
    Detail ruang chat beserta info peserta.
    """
    permission_classes = [IsAuthenticated]
    serializer_class   = RuangChatSerializer

    def get_object(self):
        ruang = get_object_or_404(
            RuangChat,
            id=self.kwargs['ruang_id'],
            peserta=self.request.user
        )
        return ruang


class RiwayatPesanView(generics.ListAPIView):
    """
    GET /api/chat/<ruang_id>/pesan/
    Ambil riwayat pesan (REST, untuk load awal / pagination).
    Untuk realtime gunakan WebSocket.
    """
    permission_classes = [IsAuthenticated]
    serializer_class   = PesanSerializer

    def get_queryset(self):
        ruang = get_object_or_404(
            RuangChat,
            id=self.kwargs['ruang_id'],
            peserta=self.request.user
        )
        # Tandai pesan dari lawan sebagai sudah dibaca saat riwayat diambil
        Pesan.objects.filter(
            ruang=ruang,
            sudah_dibaca=False
        ).exclude(pengirim=self.request.user).update(sudah_dibaca=True)

        return Pesan.objects.filter(ruang=ruang).select_related('pengirim')
