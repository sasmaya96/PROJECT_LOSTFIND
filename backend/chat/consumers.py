import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer untuk DM realtime.

    URL: ws://localhost:8000/ws/chat/<ruang_id>/
    Token JWT dikirim sebagai query param: ?token=<access_token>

    Events dari client:
      { "type": "pesan", "isi": "Halo!" }
      { "type": "baca" }           <- tandai semua pesan sebagai sudah dibaca

    Events ke client:
      { "type": "pesan_baru", "pesan": {...} }
      { "type": "error", "message": "..." }
      { "type": "info", "message": "..." }
    """

    async def connect(self):
        self.ruang_id    = self.scope['url_route']['kwargs']['ruang_id']
        self.group_name  = f'chat_{self.ruang_id}'
        self.user        = self.scope.get('user')

        # Tolak koneksi jika user tidak terautentikasi
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Cek apakah user adalah peserta ruang ini
        is_peserta = await self._cek_peserta()
        if not is_peserta:
            await self.close(code=4003)
            return

        # Gabung ke channel group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Kirim riwayat 30 pesan terakhir ke user yang baru connect
        riwayat = await self._ambil_riwayat()
        await self.send(text_data=json.dumps({
            'type':    'riwayat',
            'pesan':   riwayat,
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Format JSON tidak valid.'}))
            return

        tipe = data.get('type')

        if tipe == 'pesan':
            isi = (data.get('isi') or '').strip()
            if not isi:
                await self.send(text_data=json.dumps({'type': 'error', 'message': 'Isi pesan kosong.'}))
                return
            pesan_data = await self._simpan_pesan(isi)
            # Broadcast ke semua peserta di group
            await self.channel_layer.group_send(
                self.group_name,
                {'type': 'broadcast_pesan', 'pesan': pesan_data}
            )

        elif tipe == 'baca':
            await self._tandai_sudah_dibaca()
            await self.send(text_data=json.dumps({'type': 'info', 'message': 'Pesan ditandai sudah dibaca.'}))

        else:
            await self.send(text_data=json.dumps({'type': 'error', 'message': f'Tipe event tidak dikenal: {tipe}'}))

    # ── Channel layer event handlers ─────────────────────────────────────────

    async def broadcast_pesan(self, event):
        """Dipanggil oleh channel layer, kirim ke WebSocket client."""
        await self.send(text_data=json.dumps({
            'type':  'pesan_baru',
            'pesan': event['pesan'],
        }))

    # ── Database helpers (sync_to_async) ─────────────────────────────────────

    @database_sync_to_async
    def _cek_peserta(self):
        from chat.models import RuangChat
        return RuangChat.objects.filter(
            id=self.ruang_id,
            peserta=self.user
        ).exists()

    @database_sync_to_async
    def _simpan_pesan(self, isi):
        from chat.models import RuangChat, Pesan
        from lostfound.models import Notifikasi

        ruang = RuangChat.objects.get(id=self.ruang_id)
        pesan = Pesan.objects.create(ruang=ruang, pengirim=self.user, isi=isi)

        # Update timestamp ruang agar muncul di atas list
        ruang.updated_at = timezone.now()
        ruang.save(update_fields=['updated_at'])

        # Notifikasi in-app ke peserta lain
        for peserta in ruang.peserta.exclude(id=self.user.id):
            Notifikasi.objects.create(
                user   = peserta,
                judul  = f'Pesan baru dari {self.user.nama_lengkap}',
                pesan  = isi[:100],
                tipe   = 'pesan_baru',
                laporan= ruang.laporan,
            )

        return {
            'id':            pesan.id,
            'isi':           pesan.isi,
            'pengirim_id':   self.user.id,
            'pengirim_nama': self.user.nama_lengkap,
            'created_at':    pesan.created_at.isoformat(),
        }

    @database_sync_to_async
    def _ambil_riwayat(self):
        from chat.models import Pesan
        pesan_list = Pesan.objects.filter(
            ruang__id=self.ruang_id
        ).select_related('pengirim').order_by('-created_at')[:30]

        return [
            {
                'id':            p.id,
                'isi':           p.isi,
                'pengirim_id':   p.pengirim.id,
                'pengirim_nama': p.pengirim.nama_lengkap,
                'sudah_dibaca':  p.sudah_dibaca,
                'created_at':    p.created_at.isoformat(),
            }
            for p in reversed(list(pesan_list))
        ]

    @database_sync_to_async
    def _tandai_sudah_dibaca(self):
        from chat.models import Pesan
        Pesan.objects.filter(
            ruang__id=self.ruang_id,
            sudah_dibaca=False
        ).exclude(pengirim=self.user).update(sudah_dibaca=True)
