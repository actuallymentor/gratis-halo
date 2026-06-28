# Changelog

## [0.2.2] - 2026-06-28

### Fixed
- prevent installed service workers from intercepting Oura OAuth start and callback
- return an external Oura authorize URL directly after invite verification

## [0.2.1] - 2026-06-28

### Fixed
- show wrong invite codes and Oura callback failures as visible login errors with toast feedback
- run local D1 migrations before browser tests so invite verification uses the expected schema

## [0.2.0] - 2026-06-28

### Added
- add Worker PWA, Oura OAuth, D1 schema, HRV dashboard, and PVT (pending)
- add local/remote D1 migrations, CI deploy workflow, and production route (pending)
- add unit and browser smoke coverage for baselines, PVT, OAuth, and legal pages (pending)

## Unreleased - 2026-06-28

### Added
- add Halo implementation spec and deployment README (9c4d3c6)
- clarify Worker routing, D1 migrations, identity, baselines, and PVT score
- define SPA fallback, identity uniqueness, and PVT aggregate metrics
