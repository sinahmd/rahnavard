# Security Policy

## Reporting a vulnerability

Use GitHub's **private vulnerability reporting** (Security → Report a
vulnerability) on this repository. Please do not open public issues for
security problems.

Helpful details: the affected URL/endpoint, reproduction steps or a PoC,
and your assessment of the impact.

Please avoid: automated scanning or load testing against the production
site, and testing the public inquiry form beyond a couple of submissions.

## Scope

- The production site at https://rahnavard.co
- This repository's application code and CI/CD configuration

## Handling

Reports are triaged on a best-effort basis, usually within a few days.
Fixes land on `develop` and reach production through the normal path:
PR → CI → health-gated rolling deploy. If you would like attribution in
the release notes, say so in your report.
