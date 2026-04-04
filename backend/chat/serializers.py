from rest_framework import serializers
from .models import RuangChat, Pesan
from lostfound.serializers import UserPublicSerializer


class PesanSerializer(serializers.ModelSerializer):
    pengirim     = UserPublicSerializer(read_only=True)
    pengirim_id  = serializers.IntegerField(source='pengirim.id', read_only=True)

    class Meta:
        model  = Pesan
        fields = ['id', 'pengirim', 'pengirim_id', 'isi', 'sudah_dibaca', 'created_at']
        read_only_fields = fields


class RuangChatSerializer(serializers.ModelSerializer):
    peserta         = UserPublicSerializer(many=True, read_only=True)
    pesan_terakhir  = serializers.SerializerMethodField()
    jumlah_belum_dibaca = serializers.SerializerMethodField()
    laporan_info    = serializers.SerializerMethodField()

    class Meta:
        model  = RuangChat
        fields = ['id', 'peserta', 'laporan_info', 'pesan_terakhir',
                  'jumlah_belum_dibaca', 'created_at', 'updated_at']

    def get_pesan_terakhir(self, obj):
        pesan = obj.pesan.last()
        if not pesan:
            return None
        return {
            'isi':           pesan.isi[:80],
            'pengirim_nama': pesan.pengirim.nama_lengkap,
            'created_at':    pesan.created_at.isoformat(),
        }

    def get_jumlah_belum_dibaca(self, obj):
        user = self.context['request'].user
        return obj.pesan.filter(sudah_dibaca=False).exclude(pengirim=user).count()

    def get_laporan_info(self, obj):
        if not obj.laporan:
            return None
        return {
            'id':    obj.laporan.id,
            'judul': obj.laporan.judul,
            'jenis': obj.laporan.jenis,
        }


class BuatRuangChatSerializer(serializers.Serializer):
    """Untuk membuat / membuka ruang DM dengan user lain."""
    user_id    = serializers.IntegerField(help_text='ID user yang ingin diajak chat')
    laporan_id = serializers.IntegerField(
        required=False, allow_null=True,
        help_text='Opsional: kaitkan chat dengan laporan barang'
    )

    def validate_user_id(self, value):
        from lostfound.models import User
        if not User.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError('User tidak ditemukan.')
        if value == self.context['request'].user.id:
            raise serializers.ValidationError('Tidak bisa chat dengan diri sendiri.')
        return value

    def validate_laporan_id(self, value):
        if value is None:
            return value
        from lostfound.models import LaporanBarang
        if not LaporanBarang.objects.filter(id=value).exists():
            raise serializers.ValidationError('Laporan tidak ditemukan.')
        return value
