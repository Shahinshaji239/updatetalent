# Generated by Django 4.2 on 2025-05-30 22:31

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('adminside', '0004_user_reset_code'),
    ]

    operations = [
        migrations.AlterField(
            model_name='candidate',
            name='email',
            field=models.EmailField(max_length=254, unique=True),
        ),
    ]
