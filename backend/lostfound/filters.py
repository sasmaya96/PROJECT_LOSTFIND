import django_filters
from .models import LaporanBarang


class LaporanFilter(django_filters.FilterSet):
    jenis          = django_filters.ChoiceFilter(choices=LaporanBarang.JENIS_CHOICES)
    status         = django_filters.ChoiceFilter(choices=LaporanBarang.STATUS_CHOICES)
    kategori       = django_filters.NumberFilter(field_name='kategori__id')
    tanggal_dari   = django_filters.DateFilter(field_name='tanggal_kejadian', lookup_expr='gte')
    tanggal_sampai = django_filters.DateFilter(field_name='tanggal_kejadian', lookup_expr='lte')
    pelapor        = django_filters.NumberFilter(field_name='pelapor__id')

    class Meta:
        model  = LaporanBarang
        fields = ['jenis', 'status', 'kategori', 'tanggal_dari', 'tanggal_sampai', 'pelapor']
