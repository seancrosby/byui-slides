import os
import re
import sys
import hashlib
import subprocess

# Configuration
BUILD_DIR = "build"
ASSETS_DIR = os.path.join(BUILD_DIR, "assets")
SLIDES_DIR = "slides"
COMMON_DIR = "common"

def ensure_dir(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)

def resolve_includes(content, base_dir, visited=None):
    """
    Recursively resolve [$filename.md$] tags.
    """
    if visited is None:
        visited = set()

    pattern = r'\[\$(.*?)\$\]'
    
    def replace_include(match):
        include_path = match.group(1).strip()
        
        # Search priority:
        # 1. Relative to base_dir (current file)
        # 2. Inside COMMON_DIR
        # 3. Inside SLIDES_DIR
        search_paths = [
            os.path.join(base_dir, include_path),
            os.path.join(COMMON_DIR, include_path),
            os.path.join(SLIDES_DIR, include_path)
        ]
        
        full_path = None
        for path in search_paths:
            if os.path.exists(path):
                full_path = os.path.abspath(path)
                break
        
        if full_path:
            if full_path in visited:
                print(f"  Error: Circular inclusion detected: {full_path}")
                return f"<!-- Error: Circular inclusion detected: {include_path} -->"
            
            print(f"  Including: {full_path}")
            new_visited = visited.copy()
            new_visited.add(full_path)
            
            with open(full_path, 'r') as f:
                included_content = f.read()
            
            # Recursively resolve includes in the included content
            return resolve_includes(included_content, os.path.dirname(full_path), new_visited)
        else:
            print(f"  Warning: Included file not found: {include_path}")
            return f"<!-- Error: Included file not found: {include_path} -->"

    return re.sub(pattern, replace_include, content)

def render_mermaid(content):
    """
    Find mermaid code blocks, render to PNG, and replace with image tag.
    """
    ensure_dir(ASSETS_DIR)
    
    pattern = r'```mermaid\s+(.*?)\s+```'
    
    def replace_mermaid(match):
        mermaid_code = match.group(1).strip()
        
        # Generate a unique filename based on the content
        content_hash = hashlib.md5(mermaid_code.encode()).hexdigest()
        png_filename = f"mermaid-{content_hash}.png"
        png_path = os.path.join(ASSETS_DIR, png_filename)
        
        # Temporary file for mermaid code
        temp_mmd = os.path.join(BUILD_DIR, f"temp-{content_hash}.mmd")
        with open(temp_mmd, 'w') as f:
            f.write(mermaid_code)
        
        if not os.path.exists(png_path):
            print(f"  Rendering Mermaid diagram: {png_filename}")
            try:
                # Use npx to run mermaid-cli (mmdc)
                # Since it's in package.json, npx will use the local version.
                subprocess.run([
                    "npx", "mmdc",
                    "-i", temp_mmd,
                    "-o", png_path,
                    "-b", "transparent"
                ], check=True, capture_output=True)
            except subprocess.CalledProcessError as e:
                print(f"  Error rendering Mermaid: {e.stderr.decode()}")
                return f"```mermaid\n{mermaid_code}\n```\n<!-- Rendering Error -->"
            finally:
                if os.path.exists(temp_mmd):
                    os.remove(temp_mmd)
        else:
            print(f"  Using cached Mermaid diagram: {png_filename}")
            if os.path.exists(temp_mmd):
                os.remove(temp_mmd)

        # Return the markdown image tag
        # The path should be relative to the preprocessed markdown file in 'build/'
        return f"![Mermaid Diagram](assets/{png_filename})"

    # Use re.DOTALL to match across multiple lines
    return re.sub(pattern, replace_mermaid, content, flags=re.DOTALL)

def validate_markdown(content, filename):
    """
    Perform basic validation on the markdown content.
    Returns (is_valid, error_message)
    """
    # 1. Check for Marp front-matter
    # Must contain 'marp: true'
    if not re.search(r'^marp:\s*true', content, re.MULTILINE):
        return False, f"Error in {filename}: Missing 'marp: true' in front-matter. This file will not be rendered as a slide deck."
    
    # 2. Basic Mermaid syntax check (unclosed blocks)
    mermaid_blocks = re.findall(r'```mermaid', content)
    end_blocks = re.findall(r'```', content)
    # This is a very loose check, but helps catch obvious formatting errors
    if len(mermaid_blocks) > 0 and (len(end_blocks) < len(mermaid_blocks) * 2):
         print(f"  Warning in {filename}: Possible unclosed Mermaid or code block detected.")

    return True, ""

def preprocess(input_path):
    print(f"Preprocessing: {input_path}")
    
    with open(input_path, 'r') as f:
        content = f.read()
    
    # 0. Validate original content
    is_valid, error_msg = validate_markdown(content, input_path)
    if not is_valid:
        print(f"  {error_msg}")
        sys.exit(1)

    # 1. Resolve Includes
    # Initialize visited with the absolute path of the root file
    content = resolve_includes(content, os.path.dirname(input_path), {os.path.abspath(input_path)})
    
    # 2. Render Mermaid
    content = render_mermaid(content)
    
    # Ensure build directory exists
    ensure_dir(BUILD_DIR)
    
    filename = os.path.basename(input_path)
    output_path = os.path.join(BUILD_DIR, filename)
    
    with open(output_path, 'w') as f:
        f.write(content)
    
    print(f"  Output saved to: {output_path}")
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python preprocess.py <input_file>")
        sys.exit(1)
    
    preprocess(sys.argv[1])
