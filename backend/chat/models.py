from django.db import models
from django.conf import settings


class RuangChat(models.Model):
    """
    Satu ruang DM antara dua user.
    Dibuat otomatis saat salah satu user kirim pesan pertama.
    """
    peserta     = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='ruang_chat')
    laporan     = models.ForeignKey(
        'lostfound.LaporanBarang',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='ruang_chat',
        help_text='Opsional: chat terkait laporan barang tertentu'
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)   # update saat ada pesan baru

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        peserta = ', '.join([u.nama_lengkap for u in self.peserta.all()])
        return f'Chat [{peserta}]'

    @classmethod
    def get_or_create_dm(cls, user1, user2, laporan=None):
        """Cari ruang chat yang sudah ada antara dua user, atau buat baru."""
        # Cari room yang sudah ada untuk dua user ini
        ruang = cls.objects.filter(peserta=user1).filter(peserta=user2)
        if laporan:
            ruang = ruang.filter(laporan=laporan)
        ruang = ruang.first()

        if not ruang:
            ruang = cls.objects.create(laporan=laporan)
            ruang.peserta.add(user1, user2)

        return ruang


class Pesan(models.Model):
    ruang      = models.ForeignKey(RuangChat, on_delete=models.CASCADE, related_name='pesan')
    pengirim   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pesan_terkirim'
    )
    isi        = models.TextField()
    sudah_dibaca = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.pengirim.nama_lengkap}: {self.isi[:50]}'
