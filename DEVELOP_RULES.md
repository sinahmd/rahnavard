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

```bash
# Frontend
cd frontend && npm run lint && npx tsc --noEmit && npm test

# Backend
cd backend && python manage.py check && pytest

# If any of these fail → fix before committing
```

### Rule 4: Document Local-Only Changes

If a change should NOT go to production:
- Document it in `DEVELOPMENT.md`
- Mark it clearly as `[LOCAL ONLY]`
- Never merge it to `main`

### Rule 5: Keep Merges Clean

Before merging `develop` → `main`:
- [ ] All tests pass
- [ ] No `console.log` or debug code
- [ ] No hardcoded secrets
- [ ] All migrations committed
- [ ] `DEVELOPMENT.md` updated if workflow changed
- [ ] PR reviewed (even if by yourself)

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
- ✅ Token authentication
- ✅ SEO basics
- ✅ Docker development setup
- ✅ CI/CD pipeline
- ✅ Mobile responsive

### In Progress (develop):
- 🔄 Soft delete for data safety (Phase 1 ✅)
- 🔄 Database optimization (indexes)
- 🔄 GDPR compliance

### Planned:
- 🔲 Car comparison tool
- 🔲 Advanced search/filter
- 🔲 Pagination
- 🔲 Image gallery lightbox
- 🔲 Contact page
- 🔲 About page
- 🔲 Email notifications
- 🔲 Admin analytics
- 🔲 Multi-language support

---

## 🧠 Remember

> **Develop is where the product is BUILT.**
> **Main is where the product LIVES.**

Every commit on develop is a brick in the foundation.
Make it solid. Make it tested. Make it count.

---

*Last updated: 2026-08-27*
