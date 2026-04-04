from django.urls import path
from lostfound.views.barang_views import (
    KategoriListView,
    LaporanListCreateView,
    LaporanDetailView,
    FotoUploadView,
    KlaimCreateView,
    KlaimListView,
    KlaimVerifikasiView,
    MyKlaimView,
    MyLaporanView,
    UpdateStatusManualView,
)

urlpatterns = [
    # Kategori
    path('kategori/',                           KategoriListView.as_view(),       name='kategori-list'),

    # Laporan CRUD
    path('',                                    LaporanListCreateView.as_view(),  name='laporan-list-create'),
    path('<int:pk>/',                           LaporanDetailView.as_view(),      name='laporan-detail'),
    path('saya/',                               MyLaporanView.as_view(),          name='my-laporan'),

    # Foto
    path('<int:laporan_id>/fotos/',             FotoUploadView.as_view(),         name='foto-upload'),

    # Status manual
    path('<int:laporan_id>/status/',            UpdateStatusManualView.as_view(), name='update-status'),

    # Klaim
    path('<int:laporan_id>/klaim/',             KlaimCreateView.as_view(),        name='klaim-create'),
    path('<int:laporan_id>/klaim/list/',        KlaimListView.as_view(),          name='klaim-list'),
    path('klaim/saya/',                         MyKlaimView.as_view(),            name='my-klaim'),
    path('klaim/<int:klaim_id>/verifikasi/',    KlaimVerifikasiView.as_view(),    name='klaim-verifikasi'),
]
