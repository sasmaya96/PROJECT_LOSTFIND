from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/',       admin.site.urls),
    path('api/auth/',    include('lostfound.urls.auth')),
    path('api/barang/',  include('lostfound.urls.barang')),
    path('api/notif/',   include('lostfound.urls.notifikasi')),
    path('api/chat/',    include('chat.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
