from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lostfound', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='klaimbarang',
            name='foto_barang',
            field=models.ImageField(
                blank=True,
                help_text='Foto barang sebagai bukti kecocokan dengan laporan',
                null=True,
                upload_to='klaim-barang/%Y/%m/',
            ),
        ),
    ]
