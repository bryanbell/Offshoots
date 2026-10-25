// Offshoots is served as one self-contained page, but it is not written as one.
// This joins the three sources into that page:
//
//   head.html   CSS and markup
//   data.js     FAMS, DATA, ART, PLAY, SPLAY, DESC, COVER, PTITLE, FAMSKIN, FAMMAP, MODES
//   app.js      layout, rendering, interaction
//
//   node src/build.js      ->  writes index.html at the repo root
//
// data.js ends with a module.exports tail so it can be required by scripts and tests;
// that tail is stripped on the way in, since the page has no module system.
const fs=require("fs"), path=require("path");
const SRC=__dirname, ROOT=path.join(__dirname,"..");
const head=fs.readFileSync(path.join(SRC,"head.html"),"utf8");
const data=fs.readFileSync(path.join(SRC,"data.js"),"utf8").replace(/if \(typeof module[\s\S]*$/,"");
const app=fs.readFileSync(path.join(SRC,"app.js"),"utf8");
const out=head+"<script>\n"+data.trim()+"\n"+app+"\n</script>\n";
fs.writeFileSync(path.join(ROOT,"index.html"),out);
console.log("built index.html — "+out.length+" bytes");
