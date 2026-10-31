// The cover art, checked against the disk rather than against itself.
//
// A COVER entry is a promise that a file exists. Nothing enforced it, so a pointer at a
// file that had never been written sat in the data unnoticed: the panel asked for it,
// got a 404, and fell back to the initials tile, which is exactly what a style with no
// art does. The failure was invisible because its symptom was the normal state.
const fs=require("fs"), path=require("path");
const D=require("../src/data.js");
const ART=path.join(__dirname,"..","art"), EXT=".jpg";
const say=(k,v)=>console.log((v===true?"PASS ":v===false?"FAIL ":"     ")+k+(typeof v!=="boolean"?": "+v:""));

const files=new Set(fs.readdirSync(ART).filter(f=>f.endsWith(EXT)).map(f=>f.slice(0,-EXT.length)));
const styles=new Set(D.DATA.map(r=>r[0]));
// what the app does: a style's file is COVER[id], or the id itself
const fileFor=id=>D.COVER[id]||id;
const covered=D.DATA.map(r=>r[0]).filter(id=>files.has(fileFor(id)));

say("art on disk: "+files.size+" files", files.size>0);
say("  covering "+covered.length+" of "+styles.size+" styles", covered.length>0);

// the check that was missing
const dead=Object.entries(D.COVER).filter(([,f])=>!files.has(f));
say("every COVER entry points at a file that is there",
  dead.length===0 ? true : dead.map(([k,v])=>k+" -> "+v+EXT).join(", "));

// a COVER entry for a style that does not exist is dead weight that reads as coverage
const ghost=Object.keys(D.COVER).filter(id=>!styles.has(id));
say("  and belongs to a style that exists",
  ghost.length===0 ? true : ghost.join(", "));

// two styles sharing one picture is a real choice sometimes, but never silently: the
// panel would show the same art twice in one lineage and look like a bug
const by={}; for(const id of covered) (by[fileFor(id)]=by[fileFor(id)]||[]).push(id);
const shared=Object.entries(by).filter(([,ids])=>ids.length>1);
say("  no two styles share one picture",
  shared.length===0 ? true : shared.map(([f,ids])=>f+": "+ids.join("+")).join(" | "));

// the extension is fixed in app.js, so a .jpeg or .png in art/ is a file that will never
// be asked for, however correct its name looks
const other=fs.readdirSync(ART).filter(f=>!f.endsWith(EXT)&&!f.startsWith("."));
say("  nothing in art/ that the app cannot ask for ("+EXT+" only)",
  other.length===0 ? true : other.join(", "));

// square, because the panel draws them in a square and a stray aspect ratio crops badly
let odd=[], small=[];
for(const id of covered){
  const f=path.join(ART,fileFor(id)+EXT);
  const b=fs.readFileSync(f);
  // JPEG SOF marker: walk the segments rather than pulling in a dependency
  let i=2, w=0, h=0;
  while(i<b.length-9){
    if(b[i]!==0xFF){ i++; continue; }
    const m=b[i+1];
    if(m>=0xC0&&m<=0xCF&&m!==0xC4&&m!==0xC8&&m!==0xCC){ h=b.readUInt16BE(i+5); w=b.readUInt16BE(i+7); break; }
    i+=2+b.readUInt16BE(i+2);
  }
  if(!w||!h) continue;
  if(Math.abs(w-h)>1) odd.push(fileFor(id)+" "+w+"x"+h);
  if(Math.min(w,h)<300) small.push(fileFor(id)+" "+w+"x"+h);
}
say("  every cover square", odd.length===0 ? true : odd.slice(0,6).join(", "));
say("  and at least 300px", small.length===0 ? true : small.slice(0,6).join(", "));

const fails=[dead.length,ghost.length,shared.length,other.length,odd.length,small.length]
  .reduce((a,b)=>a+b,0);
process.exitCode = fails ? 1 : 0;
