from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from lostfound.models import Notifikasi
from lostfound.serializers import NotifikasiSerializer


class NotifikasiListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = NotifikasiSerializer

    def get_queryset(self):
        return Notifikasi.objects.filter(user=self.request.user)


class BacaNotifikasiView(APIView):
    """PATCH /api/notif/<id>/baca/ atau PATCH /api/notif/baca-semua/"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, notif_id=None):
        if notif_id:
            notif = Notifikasi.objects.filter(id=notif_id, user=request.user).first()
            if not notif:
                return Response({'error': 'Notifikasi tidak ditemukan.'}, status=404)
            notif.sudah_dibaca = True
            notif.save(update_fields=['sudah_dibaca'])
            return Response({'message': 'Notifikasi ditandai sudah dibaca.'})

        # Tandai semua sebagai sudah dibaca
        Notifikasi.objects.filter(user=request.user, sudah_dibaca=False).update(sudah_dibaca=True)
        return Response({'message': 'Semua notifikasi ditandai sudah dibaca.'})


class JumlahBelumDibacaView(APIView):
    """GET /api/notif/unread-count/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notifikasi.objects.filter(user=request.user, sudah_dibaca=False).count()
        return Response({'unread_count': count})
