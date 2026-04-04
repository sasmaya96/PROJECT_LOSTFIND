from django.core.management.base import BaseCommand
from lostfound.models import KategoriBarang

KATEGORI = [
    ('Dompet / Tas',        'wallet'),
    ('Handphone / Gadget',  'smartphone'),
    ('Kunci',               'key'),
    ('Dokumen / KTM / KTP', 'file-text'),
    ('Pakaian / Aksesoris', 'shirt'),
    ('Alat Tulis',          'pen'),
    ('Laptop / Tablet',     'laptop'),
    ('Kartu ATM / E-Money', 'credit-card'),
    ('Kacamata',            'glasses'),
    ('Sepatu / Sandal',     'footprints'),
    ('Jam Tangan',          'watch'),
    ('Lainnya',             'package'),
]


class Command(BaseCommand):
    help = 'Isi data kategori barang awal'

    def handle(self, *args, **options):
        created = 0
        for nama, ikon in KATEGORI:
            _, is_new = KategoriBarang.objects.get_or_create(nama=nama, defaults={'ikon': ikon})
            if is_new:
                created += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ {nama}'))
            else:
                self.stdout.write(f'  - {nama} (sudah ada)')
        self.stdout.write(self.style.SUCCESS(f'\n{created} kategori baru ditambahkan.'))
