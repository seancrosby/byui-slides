"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { main } = require("../lib/cli");

test("init copies starter project folders", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "byui-slides-init-"));

  try {
    await main(["init", tempDir]);

    assert.equal(fs.existsSync(path.join(tempDir, "slides", "example.md")), true);
    assert.equal(fs.existsSync(path.join(tempDir, "common", "questions.md")), true);
    assert.equal(fs.existsSync(path.join(tempDir, "assets", "logo.png")), true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
