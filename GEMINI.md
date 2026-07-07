# BYUI Slides CLI Instructions

This project is a CLI for scaffolding, building, and serving BYU-Idaho-branded Marp slide decks.

## Project Goals
- Provide a reusable CLI for BYUI slide workflows.
- Keep slide scaffolding in the `init` subcommand instead of requiring template folders to live in every consumer repo.
- Build Marp slide decks from Markdown with support for preprocessing, Mermaid rendering, and multi-deck output.
- Serve generated slide decks locally for review.
- Preserve the custom BYUI theme, starter slide content, and shared assets distributed by the CLI.

## Requirements
- **CLI-first workflow:** The package should expose a `byui-slides` CLI with subcommands for `init`, `build`, and `serve`.
- **Init scaffolding:** `init` should create or copy starter `slides/`, `common/`, and `assets/` content into a target project.
- **Build behavior:** `build` should compile one or many slide decks from `slides/` into `dist/`, support HTML by default and PDF via a flag, and regenerate `dist/index.html`.
- **Preprocessing:** Keep support for reusable slide includes and Mermaid rendering, with intermediate output stored in `build/`.
- **Theme and assets:** Preserve the BYUI theme styling and bundled visual assets used by starter decks.
- **Multi-deck support:** A project created by the CLI should support multiple `.md` decks in `slides/`.
- **Documentation:** `README.md` should document installation, CLI usage, and Marp authoring basics.

## Quality Expectations
- Maintain automated tests for CLI and preprocessing behavior.
- Prefer focused tests that cover the changed behavior directly.
- Keep changes cohesive and production-ready rather than leaving partial scaffolding or placeholder flows.
- Preserve compatibility with the existing starter content unless a change is intentional and documented.
