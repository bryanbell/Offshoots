const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
let browser,server;
(async()=>{
 const raw=fs.readFileSync(path.join(root,'wiki/preparation/preparation.json'),'utf8');const d=JSON.parse(raw);
 assert.equal(d.classes.length,84);assert.equal(d.classes.filter(c=>c.status==='prepared_unpublished').length,81);
 assert(d.classes.every(c=>c.publicationAllowed===false));assert(!/\/Users\/|\/private\//.test(raw));
 const checkPublicProperties=value=>{if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){assert(!/(libraryid|persistentid|databaseid)$/i.test(key.replace(/[_-]/g,'')),`Private service property in served data: ${key}`);checkPublicProperties(item);}};
 checkPublicProperties(d);
 assert.equal(d.classes.reduce((n,c)=>n+c.tracks.length,0),1264);
 assert.equal(d.classes.reduce((n,c)=>n+(c.importText?c.importText.split('\n').length:0),0),1240);
 assert.equal(d.classes.find(c=>c.id==='artmusic').importText,'');
 // Publication can grow independently of this frozen preparation snapshot.
 // Test the boundary, not a dated catalog total.
 const published=JSON.parse(fs.readFileSync(path.join(root,'wiki/catalog.json'))).classes;
 assert(Array.isArray(published)&&published.length>0);
 for(const c of published){
  assert.equal(typeof c.title,'string');assert.equal(typeof c.number,'string');
  assert(c.status!=='prepared_unpublished'&&c.publicationAllowed!==false,`Preparation record in published catalog: ${c.id}`);
  assert(c.links&&Object.values(c.links).some(url=>typeof url==='string'&&/^https:\/\/(music\.apple\.com|open\.spotify\.com)\//.test(url)),`Missing public playlist link: ${c.id}`);
 }
 assert(fs.readFileSync(path.join(root,'wiki/preparation/index.html'),'utf8').includes('noindex, nofollow'));
 console.log('PASS 84 preparations remain separate from the published catalog; 1240 candidates and 24 references; public links retained and no private paths or service properties');
 server=http.createServer((req,res)=>{const file=path.join(root,decodeURI(req.url.split('?')[0]));const p=file.endsWith(path.sep)?file+'index.html':file;fs.readFile(p,(e,b)=>{if(e){res.statusCode=404;res.end();return;}res.setHeader('Content-Type',p.endsWith('.json')?'application/json':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'/wiki/preparation/');await page.waitForSelector('#prep-search');
 assert.equal(await page.locator('#prep-results button').count(),84);
 await page.fill('#prep-search','sissy break nobby');assert.equal(await page.locator('#prep-results button').count(),1);await page.locator('#prep-results button').click();
 assert((await page.locator('#detail').innerText()).includes('2006–2010'));
 const list=await page.locator('#prep-import').inputValue();assert(list.includes('Sissy Nobby - Break It Down'));assert(!list.includes('Fas Stupid'));assert(!list.includes("Gin 'N My System"));
 assert(!(await page.locator('#detail').innerText()).includes('prepared_unpublished'));
 console.log('PASS multiword artist/song search, bounded date display, readable status and exclusion-safe copy list');
 await page.goto(url+'/wiki/preparation/?class=artmusic');await page.waitForSelector('#detail h2');assert.equal(await page.locator('#prep-import').count(),0);assert.equal(await page.locator('#detail ol > li').count(),24);
 await page.goto(url+'/wiki/preparation/?class=ukgarage');await page.waitForSelector('#prep-import');assert((await page.locator('#detail').innerText()).includes('Do not create a duplicate'));
 await page.locator('#prep-back').click();await page.locator('#prep-batch').selectOption('0');assert.equal(await page.locator('#prep-results button').count(),3);
 assert.equal(errors.length,0,errors.join('; '));
 await page.screenshot({path:path.join(root,'test/failures/preparation-review.png'),fullPage:false});
 console.log('PASS Classical reference-only detail, UK Garage reconciliation, batch filtering and no browser errors');
})().catch(e=>{console.error('FAIL',e.stack);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));});
