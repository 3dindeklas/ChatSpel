const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const roots = ["server", "src"];
const files = [];

function collectJavaScriptFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectJavaScriptFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }
}

for (const root of roots) {
  if (fs.existsSync(root)) {
    collectJavaScriptFiles(root);
  }
}

let hasErrors = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    stdio: "inherit"
  });
  if (result.status !== 0) {
    hasErrors = true;
  }
}

if (hasErrors) {
  process.exit(1);
}
