// Runs the SAME engine file the browser loads (assets/gtl-live.js) over the whole ladder and
// prints the canon as JSON. Usage: node materials/run_ladder_node.js
var path = require("path"), fs = require("fs");
var E = require(path.join(__dirname, "..", "assets", "gtl-live.js"));
var D = JSON.parse(fs.readFileSync(path.join(__dirname, "gtl-data.json"), "utf8"));
var out = E.ladder(D);
out.selfTest = E.selfTest(D);
process.stdout.write(JSON.stringify(out, null, 1) + "\n");
