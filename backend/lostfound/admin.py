from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, KategoriBarang, LaporanBarang, FotoBarang, KlaimBarang, Notifikasi


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ['email', 'nama_lengkap', 'nim_nik', 'role', 'is_active']
    list_filter   = ['role', 'is_active']
    search_fields = ['email', 'nama_lengkap', 'nim_nik']
    ordering      = ['email']
    fieldsets = (
        (None,           {'fields': ('email', 'password')}),
        ('Info Pribadi', {'fields': ('nama_lengkap', 'nim_nik', 'no_hp', 'foto_profil')}),
        ('Peran',        {'fields': ('role',)}),
        ('Hak Akses',    {'fields': ('is_active', 'is_staff', 'is_superuser',
                                     'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': (
            'email', 'nama_lengkap', 'nim_nik', 'role', 'password1', 'password2'
        )}),
    )


@admin.register(KategoriBarang)
class KategoriAdmin(admin.ModelAdmin):
    list_display = ['nama', 'ikon']


class FotoInline(admin.TabularInline):
    model  = FotoBarang
    extra  = 0
    fields = ['foto', 'is_primary']


class KlaimInline(admin.TabularInline):
    model        = KlaimBarang
    extra        = 0
    fields       = ['pengklaim', 'status', 'created_at']
    readonly_fields = ['pengklaim', 'created_at']
    can_delete   = False


@admin.register(LaporanBarang)
class LaporanBarangAdmin(admin.ModelAdmin):
    list_display  = ['judul', 'jenis', 'kategori', 'pelapor', 'status', 'created_at']
    list_filter   = ['jenis', 'status', 'kategori']
    search_fields = ['judul', 'deskripsi', 'pelapor__nama_lengkap']
    inlines       = [FotoInline, KlaimInline]
    readonly_fields = ['created_at', 'updated_at']


@admin.register(KlaimBarang)
class KlaimBarangAdmin(admin.ModelAdmin):
    list_display  = ['laporan', 'pengklaim', 'status', 'preview_ktm', 'created_at']
    list_filter   = ['status']
    search_fields = ['laporan__judul', 'pengklaim__nama_lengkap']
    readonly_fields = ['laporan', 'pengklaim', 'foto_ktm', 'keterangan', 'created_at']
    actions       = ['action_approve', 'action_reject']

    def preview_ktm(self, obj):
        if obj.foto_ktm:
            return format_html('<img src="{}" style="height:40px;border-radius:4px">', obj.foto_ktm.url)
        return '-'
    preview_ktm.short_description = 'Foto KTM'

    @admin.action(description='✅ Setujui klaim terpilih')
    def action_approve(self, request, queryset):
        for klaim in queryset.filter(status='menunggu'):
            klaim.approve(catatan='Disetujui oleh admin.')
        self.message_user(request, 'Klaim berhasil disetujui.')

    @admin.action(description='❌ Tolak klaim terpilih')
    def action_reject(self, request, queryset):
        for klaim in queryset.filter(status='menunggu'):
            klaim.reject(catatan='Ditolak oleh admin.')
        self.message_user(request, 'Klaim berhasil ditolak.')


@admin.register(Notifikasi)
class NotifikasiAdmin(admin.ModelAdmin):
    list_display  = ['judul', 'user', 'tipe', 'sudah_dibaca', 'created_at']
    list_filter   = ['tipe', 'sudah_dibaca']
    search_fields = ['user__nama_lengkap', 'judul']
