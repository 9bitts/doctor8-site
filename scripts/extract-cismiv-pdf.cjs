const fs = require("node:fs");
const pdf = require("pdf-parse");

const buf = fs.readFileSync(process.argv[2]);
pdf(buf).then((data) => console.log(data.text)).catch((e) => {
  console.error(e);
  process.exit(1);
});
