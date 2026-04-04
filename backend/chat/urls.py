from django.urls import path
from .views import (
    DaftarRuangChatView,
    BukaRuangChatView,
    DetailRuangChatView,
    RiwayatPesanView,
)

urlpatterns = [
    path('',                        DaftarRuangChatView.as_view(),  name='chat-list'),
    path('buka/',                   BukaRuangChatView.as_view(),    name='chat-buka'),
    path('<int:ruang_id>/',         DetailRuangChatView.as_view(),  name='chat-detail'),
    path('<int:ruang_id>/pesan/',   RiwayatPesanView.as_view(),     name='chat-pesan'),
]
