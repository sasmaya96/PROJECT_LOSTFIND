from django.contrib import admin
from .models import RuangChat, Pesan


class PesanInline(admin.TabularInline):
    model       = Pesan
    extra       = 0
    fields      = ['pengirim', 'isi', 'sudah_dibaca', 'created_at']
    readonly_fields = ['pengirim', 'isi', 'sudah_dibaca', 'created_at']
    can_delete  = False


@admin.register(RuangChat)
class RuangChatAdmin(admin.ModelAdmin):
    list_display  = ['id', 'daftar_peserta', 'laporan', 'updated_at']
    inlines       = [PesanInline]
    filter_horizontal = ['peserta']

    def daftar_peserta(self, obj):
        return ', '.join([u.nama_lengkap for u in obj.peserta.all()])
    daftar_peserta.short_description = 'Peserta'


@admin.register(Pesan)
class PesanAdmin(admin.ModelAdmin):
    list_display  = ['pengirim', 'ruang', 'isi_singkat', 'sudah_dibaca', 'created_at']
    list_filter   = ['sudah_dibaca']
    search_fields = ['pengirim__nama_lengkap', 'isi']

    def isi_singkat(self, obj):
        return obj.isi[:60]
    isi_singkat.short_description = 'Isi Pesan'
