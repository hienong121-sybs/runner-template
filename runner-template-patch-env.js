#!/usr/bin/env node

const path = require("path");
const { runCli } = require("./runner-template-copy");

runCli(["patch-env", ...process.argv.slice(2)], {
  scriptName: path.basename(__filename),
}).catch((error) => {
  console.error(`fatal: ${error.message}`);
  process.exit(1);
});

