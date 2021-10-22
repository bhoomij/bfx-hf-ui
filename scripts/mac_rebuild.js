const { execSync } = require("child_process");
const yaml = require('js-yaml');
const fs   = require('fs');

var info = require("../package.json");
var appPath = "dist/mac/" + info.build.productName + ".app";

console.log("Zipping...")
console.log(execSync('ditto -c -k --sequesterRsrc --keepParent "'+appPath+'" "dist/'+info.build.productName+'-'+info.version+'-mac.zip"').toString());
console.log("Finished zipping!");

console.log("Collect data...");
var blockmap = JSON.parse(execSync('../node_modules/app-builder-bin/mac/app-builder blockmap -i ../dist/'+info.build.productName+'-'+info.version+'-mac.zip -o ../dist/th.zip').toString());
blockmap.blockMapSize = parseInt(execSync("ls -l ../dist/th.zip | awk '{print $5}' && rm ../dist/th.zip").toString());

var doc = yaml.safeLoad(fs.readFileSync('../dist/latest-mac.yml', 'utf8'));

doc.files[0].sha512 = blockmap.sha512
doc.files[0].size = blockmap.size
doc.files[0].blockMapSize = blockmap.blockMapSize
doc.sha512 = blockmap.sha512

fs.writeFileSync('../dist/latest-mac.yml', yaml.safeDump(doc, {lineWidth: 65535}), 'utf8');
