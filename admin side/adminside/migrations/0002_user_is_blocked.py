# Generated by Django 4.2 on 2025-05-27 09:40

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('adminside', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_blocked',
            field=models.BooleanField(default=False),
        ),
    ]
