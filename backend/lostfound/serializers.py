from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, KategoriBarang, LaporanBarang, FotoBarang, KlaimBarang, Notifikasi


# ── Auth ──────────────────────────────────────────────────────────────────────

class CustomTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email']        = user.email
        token['nama_lengkap'] = user.nama_lengkap
        token['role']         = user.role
        return token


class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ['email', 'nama_lengkap', 'nim_nik', 'no_hp',
                  'role', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password': 'Password tidak cocok.'})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['id', 'nama_lengkap', 'no_hp', 'role', 'foto_profil']


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['id', 'email', 'nama_lengkap', 'nim_nik', 'no_hp',
                  'role', 'foto_profil', 'created_at']
        read_only_fields = ['id', 'email', 'role', 'created_at']


# ── Kategori ──────────────────────────────────────────────────────────────────

class KategoriSerializer(serializers.ModelSerializer):
    jumlah_laporan = serializers.SerializerMethodField()

    class Meta:
        model  = KategoriBarang
        fields = ['id', 'nama', 'ikon', 'jumlah_laporan']

    def get_jumlah_laporan(self, obj):
        return obj.laporan.filter(status='aktif').count()


# ── Foto ──────────────────────────────────────────────────────────────────────

class FotoBarangSerializer(serializers.ModelSerializer):
    foto_url = serializers.SerializerMethodField()

    class Meta:
        model  = FotoBarang
        fields = ['id', 'foto', 'foto_url', 'is_primary']

    def get_foto_url(self, obj):
        request = self.context.get('request')
        if obj.foto and request:
            return request.build_absolute_uri(obj.foto.url)
        return None


# ── Laporan ───────────────────────────────────────────────────────────────────

class LaporanListSerializer(serializers.ModelSerializer):
    """Versi ringkas untuk list & pencarian."""
    kategori     = KategoriSerializer(read_only=True)
    foto_primary = serializers.SerializerMethodField()
    pelapor_nama = serializers.CharField(source='pelapor.nama_lengkap', read_only=True)
    jumlah_klaim = serializers.SerializerMethodField()

    class Meta:
        model  = LaporanBarang
        fields = ['id', 'jenis', 'judul', 'kategori', 'lokasi',
                  'tanggal_kejadian', 'status', 'foto_primary',
                  'pelapor_nama', 'jumlah_klaim', 'created_at']

    def get_foto_primary(self, obj):
        request = self.context.get('request')
        foto = obj.fotos.filter(is_primary=True).first() or obj.fotos.first()
        if foto and request:
            return request.build_absolute_uri(foto.foto.url)
        return None

    def get_jumlah_klaim(self, obj):
        return obj.klaim.filter(status='menunggu').count()


class LaporanDetailSerializer(serializers.ModelSerializer):
    """Versi lengkap untuk detail view."""
    pelapor  = UserPublicSerializer(read_only=True)
    kategori = KategoriSerializer(read_only=True)
    fotos    = FotoBarangSerializer(many=True, read_only=True)
    kategori_id = serializers.PrimaryKeyRelatedField(
        queryset=KategoriBarang.objects.all(),
        source='kategori', write_only=True, required=False, allow_null=True
    )
    klaim_saya = serializers.SerializerMethodField()

    class Meta:
        model  = LaporanBarang
        fields = ['id', 'pelapor', 'jenis', 'judul', 'deskripsi',
                  'kategori', 'kategori_id', 'lokasi', 'tanggal_kejadian',
                  'kontak_wa', 'status', 'fotos', 'klaim_saya',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'pelapor', 'status', 'created_at', 'updated_at']

    def get_klaim_saya(self, obj):
        """Cek apakah user yg request sudah pernah klaim laporan ini."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        klaim = obj.klaim.filter(pengklaim=request.user).first()
        if klaim:
            return {'id': klaim.id, 'status': klaim.status}
        return None

    def create(self, validated_data):
        validated_data['pelapor'] = self.context['request'].user
        return super().create(validated_data)


# ── Klaim ─────────────────────────────────────────────────────────────────────

class KlaimSerializer(serializers.ModelSerializer):
    pengklaim    = UserPublicSerializer(read_only=True)
    foto_ktm_url = serializers.SerializerMethodField()
    laporan_info = serializers.SerializerMethodField()

    class Meta:
        model  = KlaimBarang
        fields = ['id', 'laporan', 'laporan_info', 'pengklaim', 'foto_ktm',
                  'foto_ktm_url', 'keterangan', 'status', 'catatan_admin',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'pengklaim', 'status', 'catatan_admin',
                            'created_at', 'updated_at']

    def get_foto_ktm_url(self, obj):
        request = self.context.get('request')
        if obj.foto_ktm and request:
            return request.build_absolute_uri(obj.foto_ktm.url)
        return None

    def get_laporan_info(self, obj):
        return {
            'id':    obj.laporan.id,
            'judul': obj.laporan.judul,
            'jenis': obj.laporan.jenis,
        }

    def validate_laporan(self, laporan):
        user = self.context['request'].user
        if laporan.pelapor == user:
            raise serializers.ValidationError('Anda tidak bisa klaim laporan sendiri.')
        if laporan.status != 'aktif':
            raise serializers.ValidationError(
                f'Barang ini sudah berstatus "{laporan.get_status_display()}".'
            )
        if KlaimBarang.objects.filter(laporan=laporan, pengklaim=user).exists():
            raise serializers.ValidationError('Anda sudah pernah mengajukan klaim untuk barang ini.')
        return laporan

    def create(self, validated_data):
        validated_data['pengklaim'] = self.context['request'].user
        klaim = super().create(validated_data)

        # Ubah status laporan jadi 'proses'
        klaim.laporan.status = 'proses'
        klaim.laporan.save(update_fields=['status', 'updated_at'])

        # Kirim notifikasi ke pelapor
        Notifikasi.objects.create(
            user    = klaim.laporan.pelapor,
            judul   = 'Ada Klaim Baru 🔔',
            pesan   = (f'{klaim.pengklaim.nama_lengkap} mengajukan klaim untuk '
                       f'barang "{klaim.laporan.judul}". Cek dan verifikasi foto KTM-nya.'),
            tipe    = 'klaim_masuk',
            laporan = klaim.laporan,
        )
        return klaim


class KlaimVerifikasiSerializer(serializers.Serializer):
    """Untuk approve / reject klaim."""
    aksi     = serializers.ChoiceField(choices=['approve', 'reject'])
    catatan  = serializers.CharField(required=False, allow_blank=True, default='')


# ── Notifikasi ────────────────────────────────────────────────────────────────

class NotifikasiSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notifikasi
        fields = ['id', 'judul', 'pesan', 'tipe', 'laporan',
                  'sudah_dibaca', 'created_at']
        read_only_fields = fields
