// Runs every *.test.js against the built index.html and exits non-zero if any check fails.
//
//   node src/build.js && node test/run.js
//
// Each suite drives a real Chromium through Playwright and prints one line per check,
// prefixed PASS or FAIL. They load index.html over file://, so art/ resolves from the
// repo's own folder and covers render exactly as they do when served.
//
// One trap worth knowing: changing location.hash on a page that is already loaded is a
// same-document navigation, so the app does not re-select. Every suite opens a style on
// a fresh page instead. Several false failures in this project came from reusing one.
const {execFileSync}=require("child_process");
const fs=require("fs"), path=require("path");

const files=fs.readdirSync(__dirname).filter(f=>f.endsWith(".test.js")).sort();
let failed=0, checks=0;

for(const f of files){
  process.stdout.write("\n"+f+"\n");
  let out="";
  try{
    out=execFileSync(process.execPath,[path.join(__dirname,f)],{encoding:"utf8",stdio:["ignore","pipe","pipe"]});
  }catch(e){
    out=(e.stdout||"")+(e.stderr||"");
    failed++;
    process.stdout.write(out.replace(/^/gm,"  "));
    process.stdout.write("  !! suite crashed\n");
    continue;
  }
  const lines=out.split("\n").filter(Boolean);
  const bad=lines.filter(l=>l.startsWith("FAIL"));
  checks+=lines.filter(l=>/^(PASS|FAIL)/.test(l)).length;
  failed+=bad.length;
  process.stdout.write(lines.map(l=>"  "+l).join("\n")+"\n");
}

process.stdout.write("\n"+checks+" checks, "+failed+" failed\n");
process.exit(failed?1:0);
