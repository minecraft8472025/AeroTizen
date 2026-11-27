const { readFileSync } = require("node:fs");
const path = require("node:path");
const { loadTypeScript } = require("./helpers/load_typescript.cjs");
const assert = require("node:assert/strict");
const test = require("node:test");

const { launcherConfig } = loadTypeScript("launcher/src/launcherConfig.ts");
const manifest = readFileSync(path.join(__dirname, "..", "launcher", "config.xml"), "utf8");

test("the plain launcher manifest registers no watcher or startup hooks", () => {
  assert.equal(launcherConfig.PLAIN_APP, true);
  assert.match(manifest, /version="3\.5\.6"/);
  assert.doesNotMatch(manifest, /<tizen:service\b/);
  assert.doesNotMatch(manifest, /prelaunch\.support/);
  assert.doesNotMatch(manifest, /appcontrol\/operation\/main/);
  assert.match(manifest, /background-support="disable"/);
});
