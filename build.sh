#!/bin/bash

# Configuration
OUTPUT_TYPE="html"
THEME_FILE="theme.css"
SLIDES_DIR="slides"
DIST_DIR="dist"

# Help message
usage() {
    echo "Usage: $0 [options] [filename]"
    echo ""
    echo "Arguments:"
    echo "  filename     Optional: Specific markdown file in $SLIDES_DIR/ to build (e.g., example.md)"
    echo ""
    echo "Options:"
    echo "  -p, --pdf    Build to PDF (default is HTML)"
    echo "  -h, --help   Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                # Builds all slides in $SLIDES_DIR/ to $DIST_DIR/ as HTML"
    echo "  $0 --pdf          # Builds all slides in $SLIDES_DIR/ to $DIST_DIR/ as PDF"
    echo "  $0 example.md     # Builds only slides/example.md to $DIST_DIR/ as HTML"
    exit 0
}

# Parse arguments
TARGET_FILE=""
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -p|--pdf) OUTPUT_TYPE="pdf"; shift ;;
        -h|--help) usage ;;
        *) 
            if [[ "$1" == *.md ]]; then
                TARGET_FILE="$1"
            else
                echo "Unknown parameter: $1"
                usage
            fi
            shift ;;
    esac
done

# Determine the command to use for Marp
if command -v marp &> /dev/null; then
    MARP_CMD="marp"
elif command -v npx &> /dev/null; then
    MARP_CMD="npx @marp-team/marp-cli"
else
    echo "Error: marp-cli is not installed and npx is not available."
    echo "Run: npm install -g @marp-team/marp-cli"
    exit 1
fi

# Ensure output directory exists and sync assets
mkdir -p "$DIST_DIR"
if [ -d "assets" ]; then
    cp -r assets "$DIST_DIR/"
fi

build_file() {
    local file=$1
    local filename=$(basename "$file" .md)
    local output_ext=$OUTPUT_TYPE
    
    echo "Building $file to $DIST_DIR/$filename.$output_ext..."
    
    if [ "$OUTPUT_TYPE" = "pdf" ]; then
        $MARP_CMD --theme "$THEME_FILE" --html --pdf "$file" -o "$DIST_DIR/$filename.pdf"
    else
        $MARP_CMD --theme "$THEME_FILE" --html "$file" -o "$DIST_DIR/$filename.html"
    fi
}

generate_index() {
    echo "Generating $DIST_DIR/index.html..."
    cat > "$DIST_DIR/index.html" <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BYUI Slide Decks</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #f4f4f4; color: #333; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #204491; border-bottom: 2px solid #204491; padding-bottom: 10px; }
        ul { list-style: none; padding: 0; }
        li { padding: 10px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        a { color: #4F9ACF; text-decoration: none; font-weight: bold; }
        a:hover { text-decoration: underline; }
        .type { font-size: 0.8em; color: #666; background: #eee; padding: 2px 6px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>BYU-Idaho Slide Decks</h1>
        <p>Select a slide deck to view:</p>
        <ul>
EOF

    # List HTML files first
    for f in "$DIST_DIR"/*.html; do
        [ -e "$f" ] || continue
        filename=$(basename "$f")
        if [ "$filename" != "index.html" ]; then
            echo "            <li><a href=\"$filename\">${filename%.html}</a> <span class=\"type\">HTML</span></li>" >> "$DIST_DIR/index.html"
        fi
    done

    # List PDF files
    for f in "$DIST_DIR"/*.pdf; do
        [ -e "$f" ] || continue
        filename=$(basename "$f")
        echo "            <li><a href=\"$filename\">${filename%.pdf}</a> <span class=\"type\">PDF</span></li>" >> "$DIST_DIR/index.html"
    done

    cat >> "$DIST_DIR/index.html" <<EOF
        </ul>
    </div>
</body>
</html>
EOF
}

if [ -n "$TARGET_FILE" ]; then
    # Build specific file
    if [ -f "$SLIDES_DIR/$TARGET_FILE" ]; then
        build_file "$SLIDES_DIR/$TARGET_FILE"
    elif [ -f "$TARGET_FILE" ]; then
        build_file "$TARGET_FILE"
    else
        echo "Error: File $TARGET_FILE not found."
        exit 1
    fi
else
    # Build all files in slides directory
    echo "Building all slides in $SLIDES_DIR/..."
    for f in "$SLIDES_DIR"/*.md; do
        [ -e "$f" ] || continue
        build_file "$f"
    done
fi

generate_index
echo "Build complete! Files are in the '$DIST_DIR/' directory."
