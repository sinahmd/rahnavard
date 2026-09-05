# Contributing

This is a solo-maintained production codebase for a real business, so it
follows a tight workflow rather than open collaboration.

- **Bugs and ideas:** open an issue — clear reproduction steps are
  especially welcome. For security matters, see [SECURITY.md](SECURITY.md)
  instead.
- **Pull requests:** this repository is the live site's source, so PRs
  are held to a strict bar. Please open an issue first to discuss any
  change before sending code.
- **Local development:** see [DEVELOPMENT.md](DEVELOPMENT.md) — Docker
  Compose stack, test suites, and the branching workflow (`develop` →
  `main` via PR; `main` auto-deploys to production).
- **Commits:** Conventional Commits, one logical change per commit.
- **Never commit:** real secrets, `.env` files, or the local-only dev
  files listed in `LOCAL_ONLY_FILES.txt` — CI enforces both the secret
  scan and the local-only files guard.
