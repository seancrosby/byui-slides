"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function ensureDir(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function resolveIncludes(content, baseDir, options, visited = new Set()) {
  const includePattern = /!!!include\((.*?)\)!!!/g;
  const searchRoots = [baseDir, options.commonDir, options.slidesDir];

  return content.replace(includePattern, (_, includePathRaw) => {
    const includePath = includePathRaw.trim();
    const fullPath = searchRoots
      .map((root) => path.resolve(root, includePath))
      .find((candidate) => fs.existsSync(candidate));

    if (!fullPath) {
      return `<!-- Error: Included file not found: ${includePath} -->`;
    }

    if (visited.has(fullPath)) {
      return `<!-- Error: Circular inclusion detected: ${includePath} -->`;
    }

    const includedContent = fs.readFileSync(fullPath, "utf8");
    const nestedVisited = new Set(visited);
    nestedVisited.add(fullPath);

    return resolveIncludes(
      includedContent,
      path.dirname(fullPath),
      options,
      nestedVisited,
    );
  });
}

function renderMermaid(content, options) {
  ensureDir(options.generatedAssetsDir);

  return content.replace(/```mermaid\s+([\s\S]*?)\s+```/g, (_, mermaidCodeRaw) => {
    const mermaidCode = mermaidCodeRaw.trim();
    const contentHash = crypto
      .createHash("md5")
      .update(mermaidCode)
      .digest("hex");
    const pngFilename = `mermaid-${contentHash}.png`;
    const pngPath = path.join(options.generatedAssetsDir, pngFilename);
    const tempMmdPath = path.join(options.buildDir, `temp-${contentHash}.mmd`);

    if (!fs.existsSync(pngPath)) {
      ensureDir(options.buildDir);
      fs.writeFileSync(tempMmdPath, mermaidCode);

      try {
        const result = spawnSync(
          options.mermaidCommand,
          ["-i", tempMmdPath, "-o", pngPath, "-b", "transparent"],
          { encoding: "utf8" },
        );

        if (result.status !== 0) {
          const details = (result.stderr || result.stdout || "Unknown mermaid-cli error").trim();
          throw new Error(details);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `\`\`\`mermaid\n${mermaidCode}\n\`\`\`\n<!-- Rendering Error: ${message} -->`;
      } finally {
        if (fs.existsSync(tempMmdPath)) {
          fs.rmSync(tempMmdPath, { force: true });
        }
      }
    }

    return `![Mermaid Diagram](assets/${pngFilename})`;
  });
}

function validateMarkdown(content, filename) {
  if (!/^marp:\s*true$/m.test(content)) {
    return {
      valid: false,
      message: `Missing 'marp: true' in front-matter for ${filename}.`,
    };
  }

  const mermaidBlocks = content.match(/```mermaid/g) || [];
  const endBlocks = content.match(/```/g) || [];

  if (mermaidBlocks.length > 0 && endBlocks.length < mermaidBlocks.length * 2) {
    return {
      valid: true,
      warning: `Possible unclosed Mermaid or code block detected in ${filename}.`,
    };
  }

  return { valid: true };
}

function preprocess(inputPath, options) {
  const rawContent = fs.readFileSync(inputPath, "utf8");
  const validation = validateMarkdown(rawContent, inputPath);

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  let content = resolveIncludes(rawContent, path.dirname(inputPath), options, new Set([path.resolve(inputPath)]));
  content = renderMermaid(content, options);
  content = content.replaceAll("](../assets/", "](assets/");

  ensureDir(options.buildDir);

  const outputPath = path.join(options.buildDir, path.basename(inputPath));
  fs.writeFileSync(outputPath, content);

  return {
    outputPath,
    warning: validation.warning,
  };
}

module.exports = {
  ensureDir,
  preprocess,
  renderMermaid,
  resolveIncludes,
  validateMarkdown,
};
