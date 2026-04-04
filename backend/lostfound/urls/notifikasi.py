from django.urls import path
from lostfound.views.notif_views import (
    NotifikasiListView,
    BacaNotifikasiView,
    JumlahBelumDibacaView,
)

urlpatterns = [
    path('',                    NotifikasiListView.as_view(),  name='notif-list'),
    path('unread-count/',       JumlahBelumDibacaView.as_view(), name='notif-unread'),
    path('baca-semua/',         BacaNotifikasiView.as_view(),  name='notif-baca-semua'),
    path('<int:notif_id>/baca/', BacaNotifikasiView.as_view(), name='notif-baca'),
]
