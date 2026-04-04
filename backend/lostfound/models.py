from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


# ══════════════════════════════════════════════════════════════════════════════
# USER
# ══════════════════════════════════════════════════════════════════════════════

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError('Email harus diisi')
        email = self.normalize_email(email)
        user  = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault('is_staff',     True)
        extra.setdefault('is_superuser', True)
        extra.setdefault('role',         'admin')
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('mahasiswa', 'Mahasiswa'),
        ('dosen',     'Dosen'),
        ('staf',      'Staf Kampus'),
        ('security',  'Petugas Keamanan'),
        ('admin',     'Administrator'),
    ]

    email        = models.EmailField(unique=True)
    nama_lengkap = models.CharField(max_length=150)
    nim_nik      = models.CharField(max_length=20, blank=True, null=True, unique=True)
    no_hp        = models.CharField(max_length=15, blank=True, null=True)
    role         = models.CharField(max_length=20, choices=ROLE_CHOICES, default='mahasiswa')
    foto_profil  = models.ImageField(upload_to='profil/', blank=True, null=True)
    is_active    = models.BooleanField(default=True)
    is_staff     = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['nama_lengkap']
    objects         = UserManager()

    class Meta:
        verbose_name = 'Pengguna'

    def __str__(self):
        return f'{self.nama_lengkap} ({self.email})'


# ══════════════════════════════════════════════════════════════════════════════
# KATEGORI BARANG
# ══════════════════════════════════════════════════════════════════════════════

class KategoriBarang(models.Model):
    nama = models.CharField(max_length=100, unique=True)
    ikon = models.CharField(max_length=50, blank=True)

    class Meta:
        verbose_name = 'Kategori Barang'

    def __str__(self):
        return self.nama


# ══════════════════════════════════════════════════════════════════════════════
# LAPORAN BARANG (hilang & temuan)
# ══════════════════════════════════════════════════════════════════════════════

class LaporanBarang(models.Model):
    JENIS_CHOICES = [
        ('hilang', 'Barang Hilang'),
        ('temuan', 'Barang Temuan'),
    ]
    STATUS_CHOICES = [
        ('aktif',   'Aktif'),
        ('proses',  'Dalam Proses Klaim'),
        ('diambil', 'Barang Telah Diambil'),
    ]

    pelapor          = models.ForeignKey(User, on_delete=models.CASCADE, related_name='laporan')
    jenis            = models.CharField(max_length=10, choices=JENIS_CHOICES)
    judul            = models.CharField(max_length=200)
    deskripsi        = models.TextField()
    kategori         = models.ForeignKey(KategoriBarang, on_delete=models.SET_NULL,
                                         null=True, blank=True, related_name='laporan')
    lokasi           = models.CharField(max_length=200)
    tanggal_kejadian = models.DateField()
    kontak_wa        = models.CharField(max_length=20, blank=True, null=True)
    status           = models.CharField(max_length=10, choices=STATUS_CHOICES, default='aktif')
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.get_jenis_display()}] {self.judul}'


class FotoBarang(models.Model):
    laporan    = models.ForeignKey(LaporanBarang, on_delete=models.CASCADE, related_name='fotos')
    foto       = models.ImageField(upload_to='barang/%Y/%m/')
    is_primary = models.BooleanField(default=False)

    def __str__(self):
        return f'Foto #{self.id} — {self.laporan.judul}'


# ══════════════════════════════════════════════════════════════════════════════
# KLAIM BARANG — verifikasi dengan foto KTM
# ══════════════════════════════════════════════════════════════════════════════

class KlaimBarang(models.Model):
    STATUS_CHOICES = [
        ('menunggu',  'Menunggu Verifikasi'),
        ('disetujui', 'Disetujui'),
        ('ditolak',   'Ditolak'),
    ]

    laporan      = models.ForeignKey(LaporanBarang, on_delete=models.CASCADE,
                                     related_name='klaim')
    pengklaim    = models.ForeignKey(User, on_delete=models.CASCADE,
                                     related_name='klaim_saya')
    foto_ktm     = models.ImageField(upload_to='ktm/%Y/%m/',
                                     help_text='Foto KTM/KTP sebagai bukti identitas')
    keterangan   = models.TextField(blank=True,
                                    help_text='Jelaskan ciri khas barang untuk verifikasi')
    status       = models.CharField(max_length=15, choices=STATUS_CHOICES, default='menunggu')
    catatan_admin = models.TextField(blank=True,
                                     help_text='Catatan dari admin/pelapor saat approve/tolak')
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        # Satu user hanya bisa klaim satu laporan sekali
        unique_together = ('laporan', 'pengklaim')

    def __str__(self):
        return f'Klaim {self.pengklaim} → {self.laporan}'

    def approve(self, catatan=''):
        """Setujui klaim — otomatis ubah status laporan jadi 'diambil'."""
        self.status        = 'disetujui'
        self.catatan_admin = catatan
        self.save(update_fields=['status', 'catatan_admin', 'updated_at'])

        self.laporan.status = 'diambil'
        self.laporan.save(update_fields=['status', 'updated_at'])

        # Tolak klaim lain yang masih menunggu untuk laporan yang sama
        KlaimBarang.objects.filter(
            laporan=self.laporan,
            status='menunggu'
        ).exclude(pk=self.pk).update(
            status='ditolak',
            catatan_admin='Klaim lain telah disetujui untuk barang ini.'
        )

        # Buat notifikasi untuk pengklaim
        Notifikasi.objects.create(
            user     = self.pengklaim,
            judul    = 'Klaim Disetujui ✅',
            pesan    = f'Klaim Anda untuk barang "{self.laporan.judul}" telah disetujui. Silakan ambil barang.',
            tipe     = 'klaim_disetujui',
            laporan  = self.laporan,
        )

    def reject(self, catatan=''):
        """Tolak klaim dan kirim notifikasi."""
        self.status        = 'ditolak'
        self.catatan_admin = catatan
        self.save(update_fields=['status', 'catatan_admin', 'updated_at'])

        Notifikasi.objects.create(
            user    = self.pengklaim,
            judul   = 'Klaim Ditolak ❌',
            pesan   = f'Klaim Anda untuk barang "{self.laporan.judul}" ditolak. {catatan}',
            tipe    = 'klaim_ditolak',
            laporan = self.laporan,
        )


# ══════════════════════════════════════════════════════════════════════════════
# NOTIFIKASI
# ══════════════════════════════════════════════════════════════════════════════

class Notifikasi(models.Model):
    TIPE_CHOICES = [
        ('klaim_masuk',     'Ada klaim baru untuk laporan Anda'),
        ('klaim_disetujui', 'Klaim Anda disetujui'),
        ('klaim_ditolak',   'Klaim Anda ditolak'),
        ('pesan_baru',      'Pesan baru dari pengguna lain'),
        ('info',            'Informasi umum'),
    ]

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifikasi')
    judul      = models.CharField(max_length=200)
    pesan      = models.TextField()
    tipe       = models.CharField(max_length=25, choices=TIPE_CHOICES, default='info')
    laporan    = models.ForeignKey(LaporanBarang, on_delete=models.SET_NULL,
                                   null=True, blank=True)
    sudah_dibaca = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.tipe}] {self.judul} → {self.user}'
