# Changelog

All notable changes to Garida will be documented in this file. After the first
published release, this project will follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Public-release governance and contribution guidance for the upcoming alpha.

No Garida package has been published yet.

## [0.1.0-alpha.1] - 2026-08-02

### Added

- Deterministic, explainable TypeScript routing core.
- MCP stdio adapter with the `garida-mcp` executable.
- Experimental HTTP adapter and shared public types.
- Node 22/24 CI, package dry runs, and clean consumer smoke checks.

### Changed

- Public package dependencies use registry-resolvable alpha versions.

### Limitations

- Routing is policy-based and explainable; it does not claim universal cost or
  quality optimality.
- Provider executors and host plugins remain unpublished experimental packages.
