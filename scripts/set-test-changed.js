const fs = require("fs");
const p = "package.json";
const j = JSON.parse(fs.readFileSync(p, "utf8"));
j.scripts = j.scripts || {};
j.scripts["test:changed"] = "node scripts/test-changed-unified.js";
fs.writeFileSync(p, JSON.stringify(j, null, 2));
console.log("set scripts.test:changed -> unified runner");
