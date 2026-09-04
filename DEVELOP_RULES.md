# Develop Branch — Rules & Mindset

> **This branch is where the product becomes complete.**
> Every commit here is a step toward a production-ready MVP.

---

## 🎯 Mindset

**This branch is a workshop, not a showroom.**

- Features are being built, tested, and refined
- Bugs are found and fixed
- The code evolves daily
- Nothing is sacred — refactor freely
- But every change must be **safe to merge** when stable

**Think of it this way:**
> `develop` = "What's working NOW"
> `main` = "What's LIVE in production"

---

## 📏 Rules

### Rule 1: Every Change Must Have Tests

```
Code change → Test update → All tests pass → Commit
```

- If you add a feature → write tests for it
- If you fix a bug → write a test that would have caught it
- If you refactor → ensure existing tests still pass
- **No exceptions.** No "I'll add tests later."

### Rule 2: Atomic Commits

Each commit must be:
- **One logical change** (not 5 things at once)
- **Self-contained** (project works after this commit)
- **Descriptive** (future-you understands what happened)

```
✅ GOOD:
  commit 1: "feat: add soft delete to Car model"
  commit 2: "test: add soft delete tests for Car"
  commit 3: "fix: admin view shows soft-deleted items"

❌ BAD:
  commit 1: "update everything"
```

### Rule 3: Code Must Pass Before Commit

Run checks inside the local Docker stack — the owner's dev environment (see DEVELOPMENT.md §3.4–3.5 for details):

```bash
# Frontend (jest/tsc/eslint/next are installed in the image)
docker compose exec -T frontend npm run lint
docker compose exec -T frontend npx tsc --noEmit
docker compose exec -T frontend npm test -- --runInBand

# Backend (dev requirements are NOT in the image — install once per image rebuild)
docker compose exec -T backend pip install -r requirements-dev.txt
docker compose exec -T backend python manage.py check
docker compose exec -T backend python -m pytest -q

# If any of these fail → fix before committing
```

### Rule 4: Document Local-Only Changes

If a change should NOT go to production:
- Document it in `DEVELOPMENT.md` (Section 11)
- Mark it clearly as `[LOCAL ONLY]`
- Never merge it to `main`

**Current local-only changes:**
| File | Why it's local-only |
|------|-------------------|
| `frontend/Dockerfile` | Removed Arvan npm mirror (403 outside Iran) |

> `frontend/lib/authFetch.ts` was deleted in Phase 1 of the senior refactor — all
> admin requests now go through the typed `lib/api/*` boundary. Local dev reaches
> the API through the nginx proxy (`docker compose up`, http://localhost), so no
> URL-prefixing workaround exists or is needed anymore.

### Rule 5: Keep Merges Clean

Before merging `develop` → `main`:
- [ ] All tests pass
- [ ] No `console.log` or debug code
- [ ] No hardcoded secrets
- [ ] All migrations committed
- [ ] `DEVELOPMENT.md` updated if workflow changed
- [ ] Local-only changes reverted (see Section 11 in DEVELOPMENT.md)
- [ ] PR reviewed (even if by yourself)

**Local-only changes to revert before merge:**
```bash
# Restore Arvan mirror in frontend/Dockerfile
# See DEVELOPMENT.md Section 11 for exact code
```

---

## 🔄 Workflow

```
1. Pull latest develop
   git pull origin develop

2. Make changes
   - Write code
   - Write/update tests
   - Run checks

3. Commit atomically
   git add <files>
   git commit -m "type: description"

4. Push
   git push origin develop

5. When ready for production
   - Create PR: develop → main
   - Wait for CI
   - Merge
   - Deploy auto-triggers
```

---

## 📝 Commit Types

| Type | Use for | Example |
|------|---------|---------|
| `feat` | New feature | `feat: add car comparison tool` |
| `fix` | Bug fix | `fix: slider not auto-playing on mobile` |
| `test` | Adding/updating tests | `test: add soft delete tests for Car` |
| `refactor` | Code restructuring | `refactor: extract API helpers into lib/` |
| `docs` | Documentation | `docs: update DEVELOPMENT.md` |
| `chore` | Maintenance | `chore: update dependencies` |
| `perf` | Performance | `perf: add database indexes` |
| `security` | Security fix | `security: remove IP storage for GDPR` |

---

## 🚫 What NOT to Commit

- `.env` files (secrets)
- `node_modules/` or `venv/`
- Build artifacts (`.next/`, `staticfiles/`)
- Large media files (use URLs instead)
- Debug code (`console.log`, `print()` debugging)
- Temporary fixes without TODO comments

---

## ✅ Current Product Status

### Working (v0.1):
- ✅ Home page with hero slider
- ✅ Cars listing and detail
- ✅ Articles listing and detail
- ✅ Branches display
- ✅ Consultation form
- ✅ Admin panel (CRUD)
- ✅ Session-cookie admin auth + CSRF (dual-mode with the legacy token until cutover)
- ✅ SEO basics
- ✅ Docker development setup
- ✅ CI/CD pipeline
- ✅ Mobile responsive

### In Progress (develop):
- ✅ Soft delete for data safety
- ✅ Database optimization (indexes)
- ✅ GDPR compliance (IP/User-Agent removed)
- ✅ Accidental hard delete prevention
- ✅ Unique slug constraint fix
- ✅ Restore endpoints
- ✅ SiteSettings singleton protection

### Planned:
- 🔲 Car comparison tool
- 🔲 Advanced search/filter
- 🔲 Contact page
- 🔲 About page
- 🔲 Email notifications
- 🔲 Multi-language support
- 🔲 Refactor Phases 5-6: UI/a11y polish (ConfirmDialog, skip link, reduced motion), CSP headers, compose consolidation, ADRs
- 🔲 Phase 2 cutover: remove TokenAuthentication after staging smoke + owner approval (DEVELOPMENT.md §3.6)

---

## 🧠 Remember

> **Develop is where the product is BUILT.**
> **Main is where the product LIVES.**

Every commit on develop is a brick in the foundation.
Make it solid. Make it tested. Make it count.

---

*Last updated: 2026-09-05 (Phase 4 of docs/SENIOR_REFACTOR_PLAN.md complete)*
