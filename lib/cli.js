"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { ensureDir, preprocess } = require("./preprocess");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const TEMPLATE_DIRS = ["slides", "assets", "common"];
const DEFAULT_PORT = 8080;

function main(argv) {
  const [subcommand, ...rest] = argv;

  switch (subcommand) {
    case "init":
      return Promise.resolve(runInit(rest));
    case "build":
      return Promise.resolve(runBuild(rest));
    case "serve":
      return Promise.resolve(runServe(rest));
    case "-h":
    case "--help":
    case undefined:
      printHelp();
      return Promise.resolve();
    default:
      throw new Error(`Unknown subcommand '${subcommand}'.`);
  }
}

function printHelp() {
  console.log(`byui-slides

Usage:
  byui-slides init [target-dir] [--force]
  byui-slides build [deck.md] [--pdf]
  byui-slides serve [port]

Commands:
  init   Copy starter slides, assets, and common content into a project.
  build  Preprocess Markdown and compile slide decks into dist/.
  serve  Serve dist/ with a local web server.
`);
}

function runInit(args) {
  const { positionals, flags } = parseArgs(args);
  const targetDir = path.resolve(positionals[0] || process.cwd());
  const force = Boolean(flags.force);

  ensureDir(targetDir);

  for (const directoryName of TEMPLATE_DIRS) {
    const source = path.join(PACKAGE_ROOT, directoryName);
    const destination = path.join(targetDir, directoryName);

    if (fs.existsSync(destination)) {
      if (!force) {
        throw new Error(`${path.relative(process.cwd(), destination) || directoryName} already exists. Use --force to overwrite.`);
      }

      fs.rmSync(destination, { recursive: true, force: true });
    }

    fs.cpSync(source, destination, { recursive: true });
  }

  console.log(`Initialized BYUI slide project in ${targetDir}`);
}

function runBuild(args) {
  const { positionals, flags } = parseArgs(args);
  const cwd = process.cwd();
  const outputType = flags.pdf ? "pdf" : "html";
  const distDir = path.resolve(cwd, "dist");
  const buildDir = path.resolve(cwd, "build");
  const slidesDir = path.resolve(cwd, "slides");
  const commonDir = path.resolve(cwd, "common");
  const projectAssetsDir = path.resolve(cwd, "assets");
  const generatedAssetsDir = path.join(buildDir, "assets");
  const target = positionals[0];

  if (!fs.existsSync(slidesDir)) {
    throw new Error("slides/ was not found. Run 'byui-slides init' first.");
  }

  const decks = target ? [resolveDeckPath(target, slidesDir)] : listDecks(slidesDir);

  if (decks.length === 0) {
    throw new Error("No slide decks found in slides/.");
  }

  if (!target) {
    fs.rmSync(distDir, { recursive: true, force: true });
    fs.rmSync(buildDir, { recursive: true, force: true });
  }

  ensureDir(distDir);
  ensureDir(buildDir);
  copyAssets(path.join(PACKAGE_ROOT, "assets"), path.join(distDir, "assets"));
  copyAssets(projectAssetsDir, path.join(distDir, "assets"));

  const marpCommand = resolveBinary("marp");
  const mermaidCommand = resolveBinary("mmdc");
  const themePath = path.join(PACKAGE_ROOT, "theme.css");

  for (const deck of decks) {
    const { outputPath, warning } = preprocess(deck, {
      buildDir,
      commonDir,
      generatedAssetsDir,
      mermaidCommand,
      slidesDir,
    });

    if (warning) {
      console.warn(`Warning: ${warning}`);
    }

    copyAssets(generatedAssetsDir, path.join(distDir, "assets"));

    const deckName = path.basename(deck, ".md");
    const outputPathFinal = path.join(distDir, `${deckName}.${outputType}`);
    const marpArgs = ["--theme", themePath, "--html"];

    if (outputType === "pdf") {
      marpArgs.push("--pdf");
    }

    marpArgs.push(outputPath, "-o", outputPathFinal);
    runCommand(marpCommand, marpArgs);
  }

  generateIndex(distDir);
  console.log(`Built ${decks.length} deck${decks.length === 1 ? "" : "s"} into ${distDir}`);
}

function runServe(args) {
  const { positionals } = parseArgs(args);
  const port = Number(positionals[0] || DEFAULT_PORT);
  const distDir = path.resolve(process.cwd(), "dist");

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid port: ${positionals[0]}`);
  }

  if (!fs.existsSync(distDir)) {
    throw new Error("dist/ was not found. Run 'byui-slides build' first.");
  }

  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || "/", `http://localhost:${port}`);
    const requestPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
    const normalized = path
      .normalize(decodeURIComponent(requestPath))
      .replace(/^[/\\]+/, "")
      .replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(distDir, normalized);

    if (!filePath.startsWith(distDir)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "Content-Type": getContentType(filePath) });
    fs.createReadStream(filePath).pipe(response);
  });

  server.listen(port, () => {
    console.log(`Serving ${distDir} at http://localhost:${port}`);
  });
}

function parseArgs(args) {
  const positionals = [];
  const flags = {};

  for (const arg of args) {
    if (arg === "--pdf") {
      flags.pdf = true;
      continue;
    }

    if (arg === "--force") {
      flags.force = true;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option '${arg}'.`);
    }

    positionals.push(arg);
  }

  return { flags, positionals };
}

function listDecks(slidesDir) {
  return fs
    .readdirSync(slidesDir)
    .filter((entry) => entry.endsWith(".md"))
    .sort()
    .map((entry) => path.join(slidesDir, entry));
}

function resolveDeckPath(target, slidesDir) {
  const candidates = [
    path.resolve(process.cwd(), target),
    path.resolve(slidesDir, target),
  ];

  if (!target.endsWith(".md")) {
    candidates.push(path.resolve(slidesDir, `${target}.md`));
  }

  const resolved = candidates.find((candidate) => fs.existsSync(candidate));

  if (!resolved) {
    throw new Error(`Slide deck not found: ${target}`);
  }

  return resolved;
}

function resolveBinary(name) {
  const extension = process.platform === "win32" ? ".cmd" : "";
  const binaryPath = path.join(PACKAGE_ROOT, "node_modules", ".bin", `${name}${extension}`);

  if (fs.existsSync(binaryPath)) {
    return binaryPath;
  }

  throw new Error(`Missing required binary '${name}'. Run 'npm install' in the CLI package first.`);
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status ?? "unknown"}.`);
  }
}

function copyAssets(sourceDir, destinationDir) {
  if (!fs.existsSync(sourceDir)) {
    return;
  }

  ensureDir(destinationDir);

  for (const entry of fs.readdirSync(sourceDir)) {
    fs.cpSync(
      path.join(sourceDir, entry),
      path.join(destinationDir, entry),
      { recursive: true },
    );
  }
}

function generateIndex(distDir) {
  const entries = fs
    .readdirSync(distDir)
    .filter((entry) => (entry.endsWith(".html") || entry.endsWith(".pdf")) && entry !== "index.html")
    .sort((left, right) => left.localeCompare(right));

  const listItems = entries
    .map((entry) => {
      const extension = path.extname(entry).slice(1).toUpperCase();
      const name = path.basename(entry, path.extname(entry));
      return `            <li><a href="${entry}">${name}</a> <span class="type">${extension}</span></li>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
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
${listItems}
        </ul>
    </div>
</body>
</html>
`;

  fs.writeFileSync(path.join(distDir, "index.html"), html);
}

function getContentType(filePath) {
  switch (path.extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

module.exports = {
  main,
  parseArgs,
  resolveDeckPath,
};
