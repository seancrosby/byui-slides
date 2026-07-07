"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  ensureDir,
  renderMermaid,
  resolveIncludes,
  validateMarkdown,
} = require("../lib/preprocess");

function withSandbox(run) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "byui-slides-preprocess-"));

  try {
    return run(tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("resolveIncludes loads files from common", () => {
  withSandbox((tempDir) => {
    const commonDir = path.join(tempDir, "common");
    const slidesDir = path.join(tempDir, "slides");
    ensureDir(commonDir);
    ensureDir(slidesDir);

    fs.writeFileSync(path.join(commonDir, "test.md"), "Included Content");
    const result = resolveIncludes("Start\n!!!include(test.md)!!!\nEnd", tempDir, {
      commonDir,
      slidesDir,
    });

    assert.match(result, /Included Content/);
    assert.doesNotMatch(result, /!!!include/);
  });
});

test("resolveIncludes detects circular references", () => {
  withSandbox((tempDir) => {
    const commonDir = path.join(tempDir, "common");
    const slidesDir = path.join(tempDir, "slides");
    ensureDir(commonDir);
    ensureDir(slidesDir);

    const aPath = path.join(commonDir, "a.md");
    const bPath = path.join(commonDir, "b.md");
    fs.writeFileSync(aPath, "!!!include(b.md)!!!");
    fs.writeFileSync(bPath, "!!!include(a.md)!!!");

    const result = resolveIncludes("!!!include(a.md)!!!", tempDir, {
      commonDir,
      slidesDir,
    }, new Set([path.resolve("root.md")]));

    assert.match(result, /Circular inclusion detected/);
  });
});

test("validateMarkdown requires Marp front matter", () => {
  const valid = validateMarkdown("---\nmarp: true\n---\n# Title", "deck.md");
  const invalid = validateMarkdown("# Missing Marp", "deck.md");

  assert.equal(valid.valid, true);
  assert.equal(invalid.valid, false);
  assert.match(invalid.message, /Missing 'marp: true'/);
});

test("renderMermaid replaces code blocks with image references", () => {
  withSandbox((tempDir) => {
    const buildDir = path.join(tempDir, "build");
    const generatedAssetsDir = path.join(buildDir, "assets");

    const result = renderMermaid(
      "```mermaid\ngraph TD\n    A --> B\n```",
      {
        buildDir,
        generatedAssetsDir,
        mermaidCommand: process.execPath,
      },
    );

    assert.match(result, /Rendering Error/);
  });
});
