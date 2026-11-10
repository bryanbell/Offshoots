// Reads a School of Listening update manifest and says what it would change.
//
// The manifest is the spreadsheet's own account of a batch of classes: the Music Atlas node
// id, the public playlist URLs (Apple Music, Spotify and, once they exist, Qobuz and YouTube Music), the playlist title, the artists and the ordered songs.
// It is written for a person, so this parses it rather than trusting a shape, and it
// reports before it writes: a manifest is often a re-issue of one already applied, and the
// interesting part is the handful of lines that differ, not the 40 that do not.
//
//   node tools/manifest.js <file>            what it would change
//   node tools/manifest.js <file> --apply    change it
const fs=require("fs"), path=require("path");
const SRC=path.join(__dirname,"..","src","data.js");

function parse(txt){
  const out=[];
  for(const block of txt.split(/^={10,}$/m)){
    const id=(block.match(/^(?:Offshoots|Music Atlas) node ID:\s*(\S+)/m)||[])[1];
    if(!id) continue;
    const title=(block.match(/^([0-9][0-9.]*\s+.+·.+)$/m)||[])[1];
    const ap=(block.match(/^Apple Music URL:\s*(\S+)/m)||[])[1]||"";
    const sp=(block.match(/^Spotify URL:\s*(\S+)/m)||[])[1]||"";
    // Qobuz, once the playlists are there: open.qobuz.com/playlist/<id>, play.qobuz.com
    // or www.qobuz.com/<locale>/playlists/<slug>/<id>; the id is the last run of digits
    const qb=(block.match(/^Qobuz URL:\s*(\S+)/m)||[])[1]||"";
    // YouTube Music: music.youtube.com/playlist?list=<id>, the same on www.youtube.com, or
    // music.youtube.com/browse/VL<id>; the id is the list= value, without the VL
    const yt=(block.match(/^YouTube Music URL:\s*(\S+)/m)||[])[1]||"";
    const artists=((block.match(/^Artists:\s*(.+)$/m)||[])[1]||"")
      .split(";").map(s=>s.trim()).filter(Boolean);
    const songs=[];
    const list=block.split(/^Songs — Apple Music order:$/m)[1]||"";
    for(const line of list.split("\n")){
      const m=line.match(/^\s*\d+\.\s+(.+?)\s+-\s+(.+?)\s*$/);
      if(!m) { if(/^\s*$/.test(line) && songs.length) break; continue; }
      songs.push([m[1],m[2]]);
    }
    out.push({id,title:title?title.trim():"",
      ap:(ap.match(/\/playlist\/(pl\.[A-Za-z0-9-]+)/)||[])[1],
      sp:(sp.match(/playlist\/([A-Za-z0-9]+)/)||[])[1],
      qb:(qb.match(/playlists?\/(?:[^\s\/]+\/)?(\d+)/)||[])[1],
      yt:(yt.match(/[?&]list=([A-Za-z0-9_-]+)/)||yt.match(/\/browse\/VL([A-Za-z0-9_-]+)/)||[])[1],
      artists,songs});
  }
  return out;
}

if(require.main===module){
  const file=process.argv[2];
  if(!file){ console.error("usage: node tools/manifest.js <manifest.txt> [--apply]"); process.exit(2); }
  const apply=process.argv.includes("--apply");
  const M=parse(fs.readFileSync(file,"utf8"));
  const D=require(SRC);
  const ids=new Set(D.DATA.map(r=>r[0]));
  const same=(a,b)=>JSON.stringify(a||[])===JSON.stringify(b||[]);
  const changes=[];
  console.log(M.length+" classes in the manifest");
  for(const c of M){
    const why=[];
    if(!ids.has(c.id)){ console.log("  ?? "+c.id+" is not a style in the map"); continue; }
    if(c.ap && D.PLAY[c.id]!=="/playlist/"+c.ap) why.push("apple");
    if(c.sp && (D.SPLAY||{})[c.id]!==c.sp) why.push("spotify");
    if(c.qb && (D.QPLAY||{})[c.id]!==c.qb) why.push("qobuz");
    if(c.yt && (D.YPLAY||{})[c.id]!==c.yt) why.push("youtube");
    if(c.title && D.PTITLE[c.id]!==c.title) why.push("title");
    if(c.artists.length && !same(D.ROSTER[c.id],c.artists)) why.push("artists");
    const songs=c.songs.map(s=>s[1]);
    if(songs.length && !same(D.SONGS[c.id],songs)) why.push("songs");
    if(why.length){ changes.push({c,why}); console.log("  -> "+c.id+": "+why.join(", ")); }
  }
  if(!changes.length){ console.log("nothing to change: every class is already in as given"); return; }
  if(!apply){ console.log("\n"+changes.length+" would change. Re-run with --apply."); return; }

  let s=fs.readFileSync(SRC,"utf8");
  // Every table is one entry per line, "key":value, with the key quoted (CLAUDE.md). An
  // existing entry is found quoted or not and rewritten quoted; a new one goes in right
  // after the table opens. Matching only the bare key missed the quoted entries, added a
  // second one at the top, and the old one further down was the one JavaScript kept.
  const put=(table,id,val)=>{
    const key=JSON.stringify(id), bare=id.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    const re=new RegExp("(\\b"+table+"\\s*=\\s*\\{)","");
    const line="\n  "+key+":"+JSON.stringify(val)+",";
    const ex=new RegExp("(\\b"+table+"\\s*=\\s*\\{(?:\\n(?!\\};)[^\\n]*)*?\\n\\s*)(?:\""+bare+"\"|"+bare+")\\s*:\\s*(?:\"(?:[^\"\\\\]|\\\\.)*\"|\\[[^\\n]*?\\])\\s*,","");
    if(ex.test(s)) s=s.replace(ex,(m,head)=>head+key+":"+JSON.stringify(val)+",");
    else s=s.replace(re,(m,head)=>head+line);
  };
  for(const {c,why} of changes){
    if(why.includes("apple")) put("PLAY",c.id,"/playlist/"+c.ap);
    if(why.includes("spotify")) put("SPLAY",c.id,c.sp);
    if(why.includes("qobuz")) put("QPLAY",c.id,c.qb);
    if(why.includes("youtube")) put("YPLAY",c.id,c.yt);
    if(why.includes("title")) put("PTITLE",c.id,c.title);
    if(why.includes("artists")) put("ROSTER",c.id,c.artists);
    if(why.includes("songs")) put("SONGS",c.id,c.songs.map(x=>x[1]));
  }
  fs.writeFileSync(SRC,s);
  console.log("\nwrote src/data.js");
}
module.exports={parse};
