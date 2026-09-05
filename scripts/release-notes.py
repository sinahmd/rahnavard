#!/usr/bin/env python3
"""Generate GitHub release notes from conventional commits since the previous tag.

Used by .github/workflows/release.yml; GITHUB_REF_NAME must hold the tag
being released.
"""
import os
import subprocess

GROUPS = [
    ("feat", "Features"),
    ("security", "Security"),
    ("perf", "Performance"),
    ("fix", "Fixes"),
    ("refactor", "Refactoring"),
    ("test", "Tests"),
    ("docs", "Documentation"),
    ("ci", "CI"),
    ("build", "Build"),
    ("chore", "Chores"),
]


def main():
    tag = os.environ.get("GITHUB_REF_NAME", "")
    if not tag:
        raise SystemExit("GITHUB_REF_NAME is not set")

    tags = subprocess.run(
        ["git", "tag", "--sort=-creatordate"],
        capture_output=True, text=True, check=True,
    ).stdout.split()
    prev = tags[1] if len(tags) > 1 else ""

    if not prev:
        print(f"## {tag}\n\nInitial release.")
        return

    rng = f"{prev}..{tag}"
    subjects = [
        s
        for s in subprocess.run(
            ["git", "log", "--format=%s", rng],
            capture_output=True, text=True, check=True,
        ).stdout.splitlines()
        if s
    ]

    used = set()
    out = [f"## {tag}", ""]
    for prefix, title in GROUPS:
        items = []
        for s in subjects:
            if s in used:
                continue
            if s.startswith(prefix + ":") or s.startswith(prefix + "("):
                items.append(f"- {s}")
                used.add(s)
        if items:
            out += [f"### {title}"] + items + [""]

    rest = [s for s in subjects if s not in used]
    if rest:
        out += ["### Other"] + [f"- {s}" for s in rest] + [""]

    if len(out) <= 2:
        out.append("No notable changes.")

    print("\n".join(out))


if __name__ == "__main__":
    main()
