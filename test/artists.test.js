// Key artists are read from the head of a style's note, which is usually the artist list
// but sometimes opens with where the style came from: "UK; named by Whistla 2009".
// Those places were being drawn as artists. A single-word rule would have been the wrong
// fix, since Nirvana, Prince, Chic and Burial are all one word, so the places are named
// instead; this checks both halves of that, the ones that should go and the ones that
// must stay. Each style opens on a fresh page: a hash change on a loaded page is a
// same-document navigation and does not re-select.
const {chromium}=require("playwright");
const URL="file://"+__dirname+"/../index.html";
const say=(k,v)=>console.log((v===true?"PASS ":v===false?"FAIL ":"     ")+k+(typeof v!=="boolean"?": "+v:""));

(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1440,height:900}});
  const who=async id=>{ const p=await ctx.newPage(); await p.goto(URL+"#"+id); await p.waitForTimeout(700);
    const w=await p.$$eval(".who a, .who button, .who .am", e=>e.map(x=>x.textContent.trim()).filter(Boolean));
    await p.close(); return w; };

  // a place at the head of the note is not a key artist
  for(const [id,place,keep] of [["futuregarage","UK","Burial"],["amapiano","South Africa","Kabza De Small"],
      ["psytrance","Goa","Astral Projection"],["conjunto","Accordion-led","Flaco Jiménez"]]){
    const w=await who(id);
    say(id+" does not list "+place+" as an artist", !w.includes(place));
    say("  and still lists "+keep, w.includes(keep));
  }
  // one-word artist names must survive, which is what makes the place list necessary
  for(const [id,name] of [["grunge","Nirvana"],["minneapolis","Prince"],["disco","Chic"],["krautrock","Can"]]){
    const w=await who(id);
    say(id+" still lists "+name, w.includes(name));
  }
  // Fred again.. belongs to this lineage and was nowhere on the map
  const fg=await who("futuregarage");
  say("Future Garage lists Fred again..", fg.includes("Fred again.."));
  say("  alongside "+fg.join(", "), fg.length>=3);

  // the playlist roster: search reaches every artist on a style's playlist, while the
  // panel still shows only the handful ART names
  { const p=await ctx.newPage();
    await p.goto(URL); await p.waitForTimeout(900);
    await p.$eval("#mapSearch",e=>e.click()); await p.waitForTimeout(300);
    const find=async t=>{ await p.fill("#bottomSearch input",t); await p.waitForTimeout(350);
      return p.$$eval("#bottomSearch .results li",e=>e.map(x=>x.innerText.split("\n")[0])); };
    // none of these four is in ART, so each one fails before the roster exists
    for(const [name,style] of [["Marshall Jefferson","Chicago House"],["Patti Page","Traditional Pop"],
        ["Doug Carn","Spiritual Jazz"],["Bush Tetras","No Wave"]]){
      const r=await find(name);
      say(name+" finds "+style+" ("+(r.join(", ")||"nothing")+")", r.includes(style));
    }
    // and a name on several playlists returns each of those styles
    const th=await find("Talking Heads");
    say("Talking Heads returns "+th.length+" styles ("+th.join(", ")+")", th.length>=3);
    // the row says which artist matched, so the hit does not look arbitrary
    const line=await p.$eval("#bottomSearch .results li button small",e=>e.textContent);
    say("the row names the artist ("+line+")", /Talking Heads/.test(line));
    // the panel is unchanged: still the short curated list, not the whole playlist
    const sizes=await p.evaluate(()=>{
      const A=ROSTER, keys=Object.keys(A);
      return {styles:keys.length, names:keys.reduce((n,k)=>n+A[k].length,0),
        panel:Math.max(...keys.map(k=>(ART[k]||[]).length))};});
    say("roster covers "+sizes.styles+" styles and "+sizes.names+" artists", sizes.names>1500);
    say("and the panel still lists at most "+sizes.panel+" per style", sizes.panel<=5);
    await p.close(); }

  await b.close();
})();
