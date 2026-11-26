# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Governance standardization: `.gitattributes`, `.github/CODEOWNERS`, and `CHANGELOG.md`.

## [11.0.0] - 2026-11-26

### Added
- Declarative `.mts` catalog stamper (`catalog/awesome-os-apps.mts`) generating `install.ps1`, `install.sh`, `splash_layout.h`, and `v11` CAS layout wiring.
- Browser OPFS + `showDirectoryPicker` direct-drop installer (`web/opfs-installer.html`) and Ed25519 + SHA-512 signed `web/v11-bundle.json`.
- Zero-checkout `Clean-Box Stranger E2E` and `Holo-E2E` verification workflows alongside `holo-ci@v1`.
