# Changelog

All notable changes to `runner-template` are documented in this file.

This project follows:
- Semantic Versioning: https://semver.org
- Keep a Changelog style: https://keepachangelog.com

## [0.3.0] - 2026-02-08

### Added
- Added npm CLI package `runner-template-copy` with:
  - `package.json` (no dependencies)
  - `runner-template-copy.js` for copying template files into current directory
- Added detailed copy logs with emoji, source path, destination path, and summary.
- Added safe default behavior: skip existing files (use `--force` to overwrite).

## [0.2.0] - 2026-02-08

### Added
- Expanded GitHub Actions template with commentable options in `.github/workflows/deploy.yml`.
- Added Azure Pipelines equivalent in `.azure/deploy.yml`.
- Added usage documentation in `README.md`.
- Added standard environment sample in `.env.example`.
- Added this `CHANGELOG.md` for template version tracking.

## [0.1.0] - 2026-02-08

### Added
- Initial deploy template workflow for GitHub Actions.
- Base `.gitignore` and `.npmignore` for secrets/runtime safety.
