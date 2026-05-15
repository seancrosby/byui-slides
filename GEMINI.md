# BYUI Marp Slide Template

This project provides a Marp-based slide template inspired by the official BYU-Idaho PowerPoint styles.

## Project Goals
- Create a reusable Marp Markdown template.
- Implement a custom Marp theme that matches the BYUI brand (colors, logo, layout).
- Provide examples for common slide types: Title, Content, Section Header, YouTube Embed, and Image Content.
- Include a build script for generating HTML and PDF outputs.
- **Decoupled Build/Host:** Separate the build logic from the hosting logic to support different environments.
- **Index Navigation:** Automatically generate an entry point for all compiled slide decks.

## Requirements
- **Multi-Deck Support:** Support multiple `.md` files in a `slides/` directory.
- **Theme:** Custom CSS to include the BYUI logo in the bottom-right corner of every slide and match PPTX styles.
- **Assets:** Extract images and logos from `byui-slide-template.pptx`.
- **Markdown Template (`slides/example.md`):**
    - Title slide with background image.
    - Content slide.
    - Section header slide.
    - YouTube video example.
    - Image example.
- **Build Script (`build.sh`):**
    - Build all slides in `slides/` or a specific file.
    - Default: Build to HTML in `dist/`.
    - Flag `-p` or `--pdf`: Build to PDF in `dist/`.
    - **Automatic Index:** Generate `dist/index.html` with links to all built files.
- **Serve Script (`serve.sh`):**
    - Serve the `dist/` folder on a local port (default 8080).
    - Support both `marp-cli` and `npx serve` as backends.
- **Documentation (`README.md`):**
    - Instructions for installing `marp-cli`.
    - Usage instructions for the template and build script.
    - **Crash Course:** A section explaining Marp-specific Markdown syntax.

