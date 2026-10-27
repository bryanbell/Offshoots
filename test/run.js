// Runs every *.test.js against the built index.html and exits non-zero if any check fails.
//
//   node src/build.js && node test/run.js            all suites, four at a time
//   node test/run.js root sheet                      just those
//   node test/run.js -1                              one at a time, output in order
//
// Each suite drives a real Chromium through Playwright and prints one line per check,
// prefixed PASS or FAIL. They load index.html over file://, so art/ resolves from the
// repo's own folder and covers render exactly as they do when served.
//
// Why it runs them in parallel: almost none of the ~4 minutes is work. The build itself
// is 50ms. The suites spend about 100 seconds sitting in waitForTimeout, waiting out
// animations and sheet transitions, and the rest launching Chromium and painting 460
// nodes. Sleeping processes do not contend, so four at a time on two cores cuts the wall
// clock to roughly the longest suite plus change. Output is captured per suite and
// printed whole, so interleaving never garbles a line.
//
// One trap worth knowing: changing location.hash on a page that is already loaded is a
// same-document navigation, so the app does not re-select. Every suite opens a style on
// a fresh page instead. Several false failures in this project came from reusing one.
const {execFile}=require("child_process");
const fs=require("fs"), path=require("path");

const args=process.argv.slice(2);
const lim=Math.max(1,+(args.find(a=>/^-\d+$/.test(a))||"-4").slice(1));
const only=args.filter(a=>!/^-\d+$/.test(a));
const all=fs.readdirSync(__dirname).filter(f=>f.endsWith(".test.js")).sort();
const files=only.length ? all.filter(f=>only.some(o=>f===o||f===o+".test.js")) : all;
if(!files.length){ console.error("no suites matched "+only.join(" ")); process.exit(2); }

// sheet.test.js samples a CSS transition frame by frame to prove the sheet animates
// rather than jumping. Four Chromiums on two cores starve those frames and it reports
// failures that are the machine, not the code. It runs on its own, after the rest.
const SOLO=["sheet.test.js"];

const run=f=>new Promise(res=>{
  const t0=Date.now();
  execFile(process.execPath,[path.join(__dirname,f)],{encoding:"utf8",maxBuffer:1<<24},
    (err,stdout,stderr)=>res({f,ms:Date.now()-t0,out:(stdout||"")+(stderr||""),crashed:!!err}));
});

(async()=>{
  const queue=files.filter(f=>!SOLO.includes(f)), solo=files.filter(f=>SOLO.includes(f)), done=[];
  await Promise.all(Array.from({length:Math.min(lim,queue.length)},async()=>{
    while(queue.length) done.push(await run(queue.shift()));
  }));
  for(const f of solo) done.push(await run(f));
  done.sort((a,b)=>files.indexOf(a.f)-files.indexOf(b.f));

  let failed=0, checks=0, crashed=0;
  const rows=[];
  for(const r of done){
    const lines=r.out.split("\n").filter(Boolean);
    const bad=lines.filter(l=>l.startsWith("FAIL"));
    const n=lines.filter(l=>/^(PASS|FAIL)/.test(l)).length;
    checks+=n; failed+=bad.length; if(r.crashed) crashed++;
    rows.push([r.f, n, bad.length, r.crashed, (r.ms/1000).toFixed(1)]);
    // a crashed suite stops early and reports no failures, which reads as a pass: print
    // everything so the exception is visible, not just the checks that got as far as running
    if(r.crashed || bad.length){
      process.stdout.write("\n"+r.f+"\n"+lines.map(l=>"  "+l).join("\n")+"\n");
      if(r.crashed) process.stdout.write("  !! suite crashed\n");
    }
  }
  process.stdout.write("\n");
  for(const [f,n,bad,crash,secs] of rows)
    process.stdout.write(f.replace(".test.js","").padEnd(10)+String(n).padStart(4)+" checks"
      + (crash?"  CRASHED":bad?"  "+bad+" FAILED":"         ")+secs.padStart(7)+"s\n");
  process.stdout.write("\n"+checks+" checks, "+failed+" failed"
    +(crashed?", "+crashed+" crashed":"")+"\n");
  process.exit(failed||crashed?1:0);
})();
