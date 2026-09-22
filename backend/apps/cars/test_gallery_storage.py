"""Phase 3 storage-correctness tests: gallery writes are atomic, no orphans.

`IMPLEMENTATION_PLAN.md` §7.2 defines the DB/filesystem failure matrix and §14.2
requires each case to be covered (A-D). The invariant being pinned:

    `transaction.atomic()` rolls back the DATABASE and never the FILESYSTEM.

So both halves of a gallery upload must undo their own work on failure —
`GalleryField.save_gallery_files()` deletes the staged/moved files, and
`CarAdminSerializer._commit_gallery()` deletes the files this upload moved when
the gallery JSONField cannot be persisted. Neither may ever delete a file that
already existed before the request.

Path scheme and rationale: `docs/adr/0007-uuid-gallery-storage.md`.
"""

import tempfile
from io import BytesIO
from pathlib import Path

import pytest
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError
from PIL import Image

from .models import Car
from .serializers import GalleryField


def _make_valid_png(width=800, height=600):
    """A valid PNG at the smallest size the Phase 1 validator accepts."""
    image = Image.new('RGB', (width, height), 'white')
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    return buffer.getvalue()


def _files_in(root):
    """Every file currently under `root` (empty set when it does not exist)."""
    root = Path(root)
    return {path for path in root.rglob('*') if path.is_file()} if root.exists() else set()


def _staging_dirs():
    """Leftover upload staging directories — an orphan on any failure path."""
    return sorted(path for path in Path(settings.MEDIA_ROOT).glob('.gallery-upload-*'))


def _car_payload(slug):
    return {
        'brand': 'Toyota',
        'model': 'RAV4',
        'persian_name': 'تویوتا راو۴',
        'slug': slug,
        'year': 2025,
        'fuel_type': 'gasoline',
        'transmission': 'automatic',
        'is_active': True,
        'main_image': SimpleUploadedFile('main.png', _make_valid_png(), 'image/png'),
    }


def _gallery_upload(name='g0.png'):
    return SimpleUploadedFile(name, _make_valid_png(), 'image/png')


class _FailingUpload(SimpleUploadedFile):
    """An upload whose bytes cannot be read — a mid-write disk failure.

    The content is a genuinely valid PNG so the Phase 1 validator passes; the
    failure happens later, while the bytes are being streamed to disk.
    """

    def chunks(self, chunk_size=None):
        raise OSError('simulated disk failure')


def _failing_upload(name):
    return _FailingUpload(name, _make_valid_png(), 'image/png')


def _create_car(slug):
    """Create a car without touching the media tree."""
    return Car.objects.create(
        brand='Toyota',
        model='RAV4',
        persian_name='تویوتا راو۴',
        slug=slug,
        year=2025,
        fuel_type='gasoline',
        transmission='automatic',
        is_active=True,
        main_image='cars/seed.jpg',
        gallery=[],
    )


@pytest.fixture
def media_tracker():
    """Yield the files that already exist under MEDIA_ROOT, then undo the test.

    Tests assert the media tree is byte-for-byte back to this set, which is the
    "no orphans" requirement stated positively.
    """
    root = Path(settings.MEDIA_ROOT)
    before_files = _files_in(root)
    before_dirs = {path for path in root.rglob('*') if path.is_dir()}
    yield before_files
    for path in sorted(_files_in(root) - before_files, key=str, reverse=True):
        try:
            path.unlink()
        except OSError:  # pragma: no cover - cleanup is best-effort
            pass
    for path in sorted((p for p in root.rglob('*') if p.is_dir()), key=str, reverse=True):
        if path not in before_dirs:
            try:
                path.rmdir()
            except OSError:  # pragma: no cover - non-empty dir stays
                pass


@pytest.mark.django_db
class TestCaseADbFailsAfterFilesMoved:
    """Case A (§7.2): the gallery JSONField write fails after the files moved.

    The files are already at their final paths and the transaction rolls back
    the row, so `_commit_gallery` is the only thing that can delete them.
    """

    def test_rolled_back_create_leaves_no_files_behind(
        self, admin_client, monkeypatch, media_tracker
    ):
        pks = []
        original_save = Car.save

        def failing_save(instance, *args, **kwargs):
            if kwargs.get('update_fields') == ['gallery']:
                pks.append(instance.pk)
                raise IntegrityError('simulated gallery write failure')
            return original_save(instance, *args, **kwargs)

        monkeypatch.setattr(Car, 'save', failing_save)
        admin_client.raise_request_exception = False

        response = admin_client.post(
            '/api/v1/admin/cars/',
            {**_car_payload('gallery-case-a'), 'gallery_0': _gallery_upload()},
            format='multipart',
        )

        # `CarAdminViewSet.create` maps any IntegrityError to a 400 slug field
        # error (the admin form only surfaces field errors from a 400), so this
        # simulated database failure is reported that way. What matters here is
        # what the request leaves behind, not the status code.
        assert response.status_code == 400
        assert 'slug' in response.data
        assert pks, 'the gallery write must have been attempted'
        assert not Car.objects.filter(slug='gallery-case-a').exists()
        # The moved gallery file was deleted by the serializer; the car's own
        # `main_image` orphan is FileField behaviour and belongs to the Phase 5
        # `cleanup_orphan_media` command, so it is excluded from the assertion.
        gallery_dir = Path(settings.MEDIA_ROOT) / 'cars' / str(pks[0]) / 'gallery'
        assert _files_in(gallery_dir) == set()
        assert _staging_dirs() == []
        assert _files_in(settings.MEDIA_ROOT) - media_tracker == {
            Path(settings.MEDIA_ROOT) / 'cars' / 'main.png'
        }


@pytest.mark.django_db
class TestCaseBFileFailsBeforeCommit:
    """Case B (§7.2): the filesystem write fails and the row never commits.

    The row is inserted inside the transaction, but the exception rolls it back,
    so the observable guarantee is the one the plan requires: no car and no
    files. The failure is injected at the first disk operation (creating the
    upload's staging directory) — the shape of a full or read-only volume.
    """

    def test_no_row_and_no_orphans_when_a_write_fails(
        self, admin_client, monkeypatch, media_tracker
    ):
        def failing_mkdtemp(*args, **kwargs):
            raise OSError('simulated disk failure')

        monkeypatch.setattr(tempfile, 'mkdtemp', failing_mkdtemp)
        admin_client.raise_request_exception = False

        response = admin_client.post(
            '/api/v1/admin/cars/',
            {**_car_payload('gallery-case-b'), 'gallery_0': _gallery_upload()},
            format='multipart',
        )

        assert response.status_code == 500
        assert not Car.objects.filter(slug='gallery-case-b').exists()
        assert _staging_dirs() == []
        # Only the pre-existing `main_image` write survives (see Case A).
        assert _files_in(settings.MEDIA_ROOT) - media_tracker == {
            Path(settings.MEDIA_ROOT) / 'cars' / 'main.png'
        }


@pytest.mark.django_db
class TestCaseCSecondFileFailsMidBatch:
    """Case C (§7.2): the second file fails after the first was staged.

    Staging happens for the whole batch before anything is moved, so a failure
    on file N must discard files 1..N-1 with it.
    """

    def test_half_a_batch_leaves_nothing_behind(self, media_tracker):
        car = _create_car('gallery-case-c')
        uploads = {
            'gallery_0': _gallery_upload('g0.png'),
            'gallery_1': _failing_upload('g1.png'),
            'gallery_2': _gallery_upload('g2.png'),
        }

        with pytest.raises(OSError):
            GalleryField().save_gallery_files(car, uploads)

        assert _files_in(settings.MEDIA_ROOT) == media_tracker
        assert _staging_dirs() == []
        # The failed write never touched the stored URL list.
        car.refresh_from_db()
        assert car.gallery == []


@pytest.mark.django_db
class TestCaseDUpdateFailureKeepsOldGallery:
    """Case D (§7.2): an update fails after new files were moved.

    The previous gallery's files and URLs must survive untouched — the new
    files are the only thing deleted.
    """

    def test_old_files_and_urls_survive_a_failed_update(
        self, admin_client, monkeypatch, media_tracker
    ):
        car = _create_car('gallery-case-d')
        gallery_dir = Path(settings.MEDIA_ROOT) / 'cars' / str(car.pk) / 'gallery'
        gallery_dir.mkdir(parents=True, exist_ok=True)
        old_file = gallery_dir / f'{"a" * 32}.png'
        old_file.write_bytes(_make_valid_png())
        old_url = f'{settings.MEDIA_URL}cars/{car.pk}/gallery/{old_file.name}'
        car.gallery = [old_url]
        car.save(update_fields=['gallery'])

        original_save = Car.save

        def failing_save(instance, *args, **kwargs):
            if kwargs.get('update_fields') == ['gallery']:
                raise IntegrityError('simulated gallery write failure')
            return original_save(instance, *args, **kwargs)

        monkeypatch.setattr(Car, 'save', failing_save)
        admin_client.raise_request_exception = False

        response = admin_client.patch(
            f'/api/v1/admin/cars/{car.pk}/',
            {'gallery_0': _gallery_upload()},
            format='multipart',
        )

        # There is no IntegrityError mapping on the update path, so an
        # unexpected database error is reported as the server error it is.
        assert response.status_code == 500
        car.refresh_from_db()
        assert car.gallery == [old_url]
        assert old_file.exists()
        # The new upload is the only thing gone: the directory still holds
        # exactly the previous gallery file.
        assert _files_in(gallery_dir) == {old_file}
        assert _staging_dirs() == []
