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
        klaim = obj.klaim.filter(
            pengklaim=request.user
        ).exclude(status='ditolak').order_by('-updated_at').first()
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
    foto_barang_url = serializers.SerializerMethodField()
    laporan_info = serializers.SerializerMethodField()

    class Meta:
        model  = KlaimBarang
        fields = ['id', 'laporan', 'laporan_info', 'pengklaim', 'foto_ktm',
                  'foto_ktm_url', 'foto_barang', 'foto_barang_url', 'keterangan',
                  'status', 'catatan_admin', 'created_at', 'updated_at']
        read_only_fields = ['id', 'pengklaim', 'status', 'catatan_admin',
                            'created_at', 'updated_at', 'foto_barang_url', 'foto_ktm_url']
        extra_kwargs = {
            'foto_barang': {'write_only': True},
        }

    def get_foto_ktm_url(self, obj):
        request = self.context.get('request')
        if obj.foto_ktm and request:
            return request.build_absolute_uri(obj.foto_ktm.url)
        return None

    def get_foto_barang_url(self, obj):
        request = self.context.get('request')
        if getattr(obj, 'foto_barang', None) and request:
            return request.build_absolute_uri(obj.foto_barang.url)
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
        ada_klaim_non_ditolak = KlaimBarang.objects.filter(
            laporan=laporan,
            pengklaim=user
        ).exclude(status='ditolak').exists()
        if ada_klaim_non_ditolak:
            raise serializers.ValidationError('Anda sudah pernah mengajukan klaim untuk barang ini.')
        return laporan

    def validate(self, attrs):
        if not attrs.get('foto_barang'):
            raise serializers.ValidationError({'foto_barang': 'Upload foto barang wajib diisi.'})
        return attrs

    def create(self, validated_data):
        validated_data['pengklaim'] = self.context['request'].user
        laporan = validated_data['laporan']
        pengklaim = validated_data['pengklaim']

        # Jika klaim sebelumnya ditolak, pakai record lama agar user bisa ajukan ulang.
        klaim_lama = KlaimBarang.objects.filter(
            laporan=laporan,
            pengklaim=pengklaim,
            status='ditolak'
        ).order_by('-updated_at').first()

        if klaim_lama:
            klaim_lama.foto_ktm = validated_data['foto_ktm']
            klaim_lama.foto_barang = validated_data['foto_barang']
            klaim_lama.keterangan = validated_data.get('keterangan', '')
            klaim_lama.status = 'menunggu'
            klaim_lama.catatan_admin = ''
            klaim_lama.save(update_fields=[
                'foto_ktm', 'foto_barang', 'keterangan', 'status', 'catatan_admin', 'updated_at'
            ])
            klaim = klaim_lama
        else:
            klaim = super().create(validated_data)

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
    ruang_chat_id = serializers.SerializerMethodField()

    class Meta:
        model  = Notifikasi
        fields = ['id', 'judul', 'pesan', 'tipe', 'laporan',
                  'ruang_chat_id', 'sudah_dibaca', 'created_at']
        read_only_fields = fields

    def get_ruang_chat_id(self, obj):
        """
        Untuk notifikasi pesan, kirim ID ruang chat agar frontend bisa
        langsung membuka percakapan yang relevan.
        """
        if obj.tipe != 'pesan_baru':
            return None

        from chat.models import RuangChat

        qs = RuangChat.objects.filter(peserta=obj.user)
        if obj.laporan_id:
            qs = qs.filter(laporan_id=obj.laporan_id)

        prefix = 'Pesan baru dari '
        if obj.judul.startswith(prefix):
            nama_pengirim = obj.judul[len(prefix):].strip()
            if nama_pengirim:
                qs = qs.filter(peserta__nama_lengkap=nama_pengirim).exclude(peserta=obj.user)

        return qs.order_by('-updated_at').values_list('id', flat=True).distinct().first()
