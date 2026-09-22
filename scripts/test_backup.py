#!/usr/bin/env python3
"""Linux command-stub tests: python3 scripts/test_backup.py.

All data lives in TemporaryDirectory; docker/ssh/rsync are replaced with
fail-closed stubs. No real stack, remote host, or user data is accessed.
Requires bash, flock, GNU coreutils/tar and gzip (same as production scripts).
"""
import gzip
import hashlib
import io
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import time
import unittest

SCRIPTS = Path(__file__).resolve().parent
STUB = r'''#!/usr/bin/env python3
import os, pathlib, sys
args = sys.argv[1:]
name = pathlib.Path(sys.argv[0]).name
with open(os.environ['CALL_LOG'], 'a') as log:
    log.write(name + ' ' + repr(args) + '\n')
if name == 'docker':
    text = ' '.join(args)
    if 'pg_dump' in text:
        assert '${POSTGRES_USER:?}' in text and '${POSTGRES_DB:?}' in text
        assert '--clean --if-exists' in text
        sys.stdout.write('-- fixture SQL\nSELECT 1;\n')
        sys.exit(17 if os.environ.get('DUMP_FAIL') else 0)
    if 'exec -T backend tar -czf - -C /app/media .' in text:
        sys.stdout.buffer.write(pathlib.Path(os.environ['MEDIA_FIXTURE']).read_bytes())
        sys.exit(0)
    if 'pg_isready' in text or 'psql' in text:
        assert '${POSTGRES_USER:?}' in text and '${POSTGRES_DB:?}' in text
        if 'psql' in text:
            assert '--single-transaction' in text and 'ON_ERROR_STOP=1' in text
            assert 'SELECT 1' in sys.stdin.read()
        sys.exit(0)
    if 'run --rm --no-deps -T --entrypoint sh backend' in text:
        assert '/app/media' in text and '--no-same-owner' in text
        assert sys.stdin.buffer.read() == pathlib.Path(os.environ['MEDIA_FIXTURE']).read_bytes()
        sys.exit(0)
    if 'stop nginx frontend backend' in text or 'up -d' in text:
        sys.exit(0)
    sys.exit('Unexpected docker call: ' + text)
if name == 'rsync':
    sys.exit(23 if os.environ.get('RSYNC_FAIL') else 0)
if name == 'ssh':
    assert 'BatchMode=yes' in args and 'StrictHostKeyChecking=yes' in args
    if 'sha256sum -c' in args[-1] and os.environ.get('REMOTE_CHECK_FAIL'):
        sys.exit(1)
    sys.exit(0)
sys.exit('Unexpected stub invocation')
'''


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='rahnavard-backup-test-')
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.project = root / 'project with spaces'
        self.project.mkdir()
        self.backups = root / 'backups'
        self.backups.mkdir()
        (self.project / '.env').write_text('POSTGRES_USER=not_the_runtime_user\nSECRET_KEY=test\n')
        (self.project / 'docker-compose.prod.yml').write_text('services: {}\n')
        self.log = root / 'calls'
        self.bin = root / 'bin'
        self.bin.mkdir()
        for name in ('docker', 'ssh', 'rsync'):
            target = self.bin / name
            target.write_text(STUB)
            target.chmod(0o700)
        media = root / 'media.tar.gz'
        with tarfile.open(media, 'w:gz') as archive:
            entry = tarfile.TarInfo('./fixture.txt')
            entry.size = 5
            archive.addfile(entry, io.BytesIO(b'media'))
        self.env = dict(os.environ, PATH=str(self.bin) + os.pathsep + os.environ['PATH'],
                        PROJECT_DIR=str(self.project), BACKUP_DIR=str(self.backups),
                        COMPOSE_FILE='docker-compose.prod.yml', OFFSITE_HOST='', OFFSITE_DIR='',
                        CALL_LOG=str(self.log), MEDIA_FIXTURE=str(media))
        for key in ('DUMP_FAIL', 'RSYNC_FAIL', 'REMOTE_CHECK_FAIL'):
            self.env.pop(key, None)

    def run_script(self, name='backup.sh', input_text='', **changes):
        return subprocess.run(['bash', str(SCRIPTS / name)], input=input_text, text=True,
                              capture_output=True, env=dict(self.env, **changes), timeout=20)

    def create_set(self):
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('LOCAL-ONLY', result.stdout)
        return next(self.backups.glob('rahnavard_*'))

    def old_set(self, source):
        target = self.backups / 'rahnavard_20000101_000000'
        shutil.copytree(source, target)
        old = time.time() - 40 * 86400
        os.utime(target, (old, old))
        return target

    def calls(self):
        return self.log.read_text() if self.log.exists() else ''

    def test_complete_set_checksums_permissions_and_volume(self):
        backup = self.create_set()
        self.assertEqual(backup.stat().st_mode & 0o777, 0o700)
        self.assertEqual((backup / 'env.backup').stat().st_mode & 0o777, 0o600)
        for line in (backup / 'manifest.sha256').read_text().splitlines():
            checksum, filename = line.split('  ')
            self.assertEqual(hashlib.sha256((backup / filename).read_bytes()).hexdigest(), checksum)
        self.assertIn('SELECT 1', gzip.decompress((backup / 'db.sql.gz').read_bytes()).decode())
        self.assertIn('/app/media', self.calls())
        self.assertFalse(list(self.backups.glob('.staging.*')))

    def test_dump_failure_never_publishes_or_leaves_staging(self):
        result = self.run_script(DUMP_FAIL='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(list(self.backups.glob('rahnavard_*')))
        self.assertFalse(list(self.backups.glob('.staging.*')))

    def test_checksum_failure_stops_before_docker(self):
        backup = self.create_set()
        (backup / 'env.backup').write_text('tampered')
        self.log.unlink()
        result = self.run_script('restore.sh', backup.name + '\nyes\n')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Manifest mismatch', result.stderr)
        self.assertEqual(self.calls(), '')

    def test_truncated_manifest_rejected_before_docker(self):
        backup = self.create_set()
        manifest = backup / 'manifest.sha256'
        manifest.write_text(manifest.read_text().splitlines()[0] + '\n')
        self.log.unlink()
        result = self.run_script('restore.sh', backup.name + '\nyes\n')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.calls(), '')

    def test_retention_only_own_complete_old_sets(self):
        source = self.create_set()
        old = self.old_set(source)
        incomplete = self.backups / 'rahnavard_20000102_000000'
        incomplete.mkdir()
        (incomplete / 'db.sql.gz').write_text('not complete')
        unrelated = self.backups / 'db_20000101.sql.gz'
        unrelated.write_text('legacy')
        os.utime(incomplete, (0, 0))
        # Free the current timestamp so a second backup needs no sleep.
        recent = self.backups / 'rahnavard_20000103_000000'
        source.rename(recent)
        os.utime(recent, None)
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(old.exists())
        self.assertTrue(incomplete.exists())
        self.assertTrue(unrelated.exists())
        self.assertTrue(recent.exists())

    def test_offsite_failure_retains_local_set_and_skips_retention(self):
        for flag in ('RSYNC_FAIL', 'REMOTE_CHECK_FAIL'):
            with self.subTest(flag=flag):
                source = self.create_set()
                old = self.old_set(source)
                shutil.rmtree(source)
                result = self.run_script(OFFSITE_HOST='backup@example.test',
                                         OFFSITE_DIR='/srv/backups', **{flag: '1'})
                self.assertNotEqual(result.returncode, 0)
                self.assertTrue(old.exists())
                self.assertEqual(len(list(self.backups.glob('rahnavard_*'))), 2)
                self.assertNotIn('Offsite copy verified', result.stdout)
                for directory in self.backups.glob('rahnavard_*'):
                    shutil.rmtree(directory)

    def test_offsite_input_rejected_without_commands(self):
        result = self.run_script(OFFSITE_HOST='-oProxyCommand=bad', OFFSITE_DIR='/srv/backups')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.calls(), '')
        result = self.run_script(OFFSITE_HOST='backup@example.test', OFFSITE_DIR='/tmp/$(bad)')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.calls(), '')

    def test_cancel_restore_leaves_services_untouched(self):
        backup = self.create_set()
        self.log.unlink()
        result = self.run_script('restore.sh', backup.name + '\nno\n')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.calls(), '')

    def test_confirmed_restore_uses_volume_and_runtime_credentials(self):
        backup = self.create_set()
        self.log.unlink()
        result = self.run_script('restore.sh', backup.name + '\nyes\n')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("'stop', 'nginx', 'frontend', 'backend'", self.calls())
        self.assertIn('/app/media', self.calls())
        self.assertEqual((self.project / '.env').read_bytes(), (backup / 'env.backup').read_bytes())

    def test_overlapping_backup_refused(self):
        import fcntl
        with (self.backups / '.backup.lock').open('w') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            result = self.run_script()
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('already running', result.stderr)
            self.assertEqual(self.calls(), '')


if __name__ == '__main__':
    unittest.main()
