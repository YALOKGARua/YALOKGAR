const fs = require("fs");
const path = require("path");
const { minify } = require("terser");
const CleanCSS = require("clean-css");

const read = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");
const write = (f, data) => fs.writeFileSync(path.join(__dirname, f), data);
const kb = (n) => (n / 1024).toFixed(1) + " KB";

async function build() {
  const cssSource = read("styles.css");
  const jsSource = read("script.js");

  const cssResult = new CleanCSS({
    level: 1,
    compatibility: "*"
  }).minify(cssSource);

  if (cssResult.errors.length) {
    console.error("CSS:", cssResult.errors);
    process.exit(1);
  }

  const jsResult = await minify(jsSource, {
    compress: { passes: 2, drop_console: false, pure_getters: true },
    mangle: { toplevel: false },
    format: { comments: false }
  });

  if (jsResult.error) {
    console.error("JS:", jsResult.error);
    process.exit(1);
  }

  write("styles.min.css", cssResult.styles);
  write("script.min.js", jsResult.code);

  const cssOrig = Buffer.byteLength(cssSource);
  const cssMin = Buffer.byteLength(cssResult.styles);
  const jsOrig = Buffer.byteLength(jsSource);
  const jsMin = Buffer.byteLength(jsResult.code);

  const sitemap = read("sitemap.xml");
  const today = new Date().toISOString().split("T")[0];
  write("sitemap.xml", sitemap.replace(/<lastmod>[^<]+<\/lastmod>/, `<lastmod>${today}</lastmod>`));

  console.log(`styles.css  ${kb(cssOrig)} -> ${kb(cssMin)}  (${((1 - cssMin / cssOrig) * 100).toFixed(1)}% saved)`);
  console.log(`script.js   ${kb(jsOrig)} -> ${kb(jsMin)}  (${((1 - jsMin / jsOrig) * 100).toFixed(1)}% saved)`);
  console.log(`sitemap.xml lastmod -> ${today}`);
  console.log("done");
}

build().catch((e) => { console.error(e); process.exit(1); });
