// Optional controlled-stream integration checks; requires Playwright and OpenSSL.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openambience-radio-'));
const key = path.join(fixtureDir, 'key.pem');
const cert = path.join(fixtureDir, 'cert.pem');
// Temporary self-signed certificate for our loopback-only test station.
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '2', '-subj', '/CN=localhost', '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost'], { stdio: 'ignore' });
process.on('exit', () => fs.rmSync(fixtureDir, { recursive: true, force: true }));
async function chooseCategory(page, name) {
 if (!await page.locator('#filters').evaluate(element => element.open)) await page.locator('#filter-toggle').click();
 while (await page.locator('#categories input:checked').count()) await page.locator('#categories input:checked').first().uncheck();
 if (name !== 'All sounds') await page.getByRole('checkbox', { name, exact: true }).check();
 await page.locator('#filter-toggle').click();
}
async function importFile(page, file) {
 await page.locator('#add-sounds').click();
 await page.locator('#sound-files').setInputFiles(file);
 await page.locator('#import-submit').click();
 await page.waitForFunction(() => !document.querySelector('#import-submit').disabled);
 if (await page.locator('#upload-dialog').evaluate(element => element.open)) await page.getByRole('button', { name: 'Close sound import', exact: true }).click();
}
(async () => {
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true});
 const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,ignoreHTTPSErrors:true});
 const audio = fs.readFileSync(path.resolve(__dirname, '../audio/ocean-waves.mp3'));
 let requests=0;
 const server=require('node:https').createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{
  requests++;
  res.writeHead(200,{'content-type':'audio/mpeg','content-length':audio.length,...(req.url.includes('blocked')?{}:{'access-control-allow-origin':'*'})});res.end(audio);
 });
 await new Promise(resolve=>server.listen(8443,'127.0.0.1',resolve));
 await context.addInitScript(() => {
   window.__contexts=[];window.__radios=[];window.__analysers=[];
   const Native=window.AudioContext;
   window.AudioContext=class extends Native {
     constructor(...args){super(...args);window.__contexts.push(this);}
     createMediaElementSource(media){const node=super.createMediaElementSource(media);if(media.crossOrigin==='anonymous'){const analyser=this.createAnalyser();node.connect(analyser);window.__radios.push(media);window.__analysers.push(analyser);}return node;}
   };
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
 await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:8080/');await page.waitForSelector('.sound-card:visible');
 assert.equal(await page.locator('.sound-card').count(),25);
 assert.equal(await page.locator('#categories input').count(),9);
 for(const [category,count] of [['Weather',5],['Water',2],['Wildlife',4],['Indoors',4],['Noise & textures',6],['Binaural beats',3]]){
  await chooseCategory(page, category);
  assert.equal(await page.locator('.sound-card:visible').count(),count);
 }
 await page.locator('#add-radio').click();await page.locator('#radio-name').fill('Station <test>');
 await page.locator('#radio-url').fill('http://127.0.0.1:8443/live.mp3');await page.locator('#radio-form button').click();
 assert.match(await page.locator('#radio-form-status').textContent(),/HTTPS/);
 await page.locator('#radio-url').fill('https://127.0.0.1:8443/list.m3u');await page.locator('#radio-form button').click();
 assert.match(await page.locator('#radio-form-status').textContent(),/playlist/);
 await page.locator('#radio-url').fill('https://127.0.0.1:8443/live.mp3');await page.locator('#radio-form button').click();
 await page.waitForFunction(()=>!document.querySelector('#radio-dialog').open);
 assert.equal(requests,0,'Saving a station must not connect');
 const radioID=await page.locator('[data-kind="radio"]').getAttribute('data-sound');
 await page.locator('[data-kind="radio"] .sound-toggle').click();
 await chooseCategory(page, 'Noise & textures');await page.locator('[data-sound="brown"] .sound-toggle').click();
 await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('.radio-state').textContent.includes('Live'));
 await page.waitForFunction(()=>{const values=new Float32Array(2048);window.__analysers[0].getFloatTimeDomainData(values);return values.some(value=>Math.abs(value)>.001);});
 assert.equal(await page.evaluate(()=>window.__radios[0].crossOrigin),'anonymous');
 await chooseCategory(page, 'Radio');await page.locator(`[data-sound="${radioID}"] input`).fill('31');
 await page.locator('#volume-toggle').click();
 await page.locator('#master').fill('28');
 await page.locator('#mute').click();assert.equal(await page.locator('#master').inputValue(),'0');
 assert.equal(await page.evaluate(()=>window.__radios.at(-1).paused),false);
 await page.locator('#mute').click();assert.equal(await page.locator('#master').inputValue(),'28');
 await page.locator('#open-mixer').click();await page.locator('#mix-name').fill('Radio and brown');await page.locator('#save-form button').click();await page.locator('#mixer-dialog .close').click();
 await page.locator('#play').click();assert.equal(await page.evaluate(()=>window.__radios.every(media=>media.paused&&!media.hasAttribute('src'))),true);
 await page.locator('#add-radio').click();await page.locator('#radio-name').fill('Duplicate');await page.locator('#radio-url').fill('https://127.0.0.1:8443/live.mp3');await page.locator('#radio-form button').click();
 assert.match(await page.locator('#radio-form-status').textContent(),/already/);
 await page.locator('#radio-name').fill('Blocked station');await page.locator('#radio-url').fill('https://127.0.0.1:8443/blocked.mp3');await page.locator('#radio-form button').click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-kind="radio"]').length===2);
 const blocked = page.locator('[data-kind="radio"]').filter({hasText:'Blocked station'});
 await blocked.locator('.sound-toggle').click();await page.locator('#play').click();
 await page.waitForFunction(()=>[...document.querySelectorAll('[data-kind="radio"]')].find(card=>card.querySelector('.sound-name').textContent==='Blocked station')?.querySelector('.radio-state').textContent.includes('could not play'));
 assert.equal(await page.locator('[data-sound="brown"]').getAttribute('class'),'sound-card active');
 assert.match(await page.locator('#play').textContent(),/Pause/);
 assert.equal(await page.evaluate(()=>window.__contexts[0].state),'running');
 await blocked.locator('.remove-sound').click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-kind="radio"]').length===1);
 await context.setOffline(true);
 await page.waitForFunction(()=>document.querySelector('.radio-state').textContent.includes('Offline'));
 assert.equal(await page.evaluate(()=>window.__radios.every(media=>media.paused&&!media.hasAttribute('src'))),true);
 assert.match(await page.locator('#play').textContent(),/Pause/);
 await context.setOffline(false);await page.locator('.retry-radio').click();
 await page.waitForFunction(()=>document.querySelector('.radio-state').textContent.includes('Live'));
 await page.locator('#play').click();
 await importFile(page, path.resolve(__dirname, '../audio/fire.mp3'));await page.waitForFunction(()=>document.querySelectorAll('[data-kind="custom"]').length===1);
 await chooseCategory(page, 'My sounds');await page.locator('.custom-category select').selectOption('Water');
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('category saved'));
 assert.equal(await page.locator('[data-kind="custom"]:visible').count(),1);
 await chooseCategory(page, 'Water');assert.equal(await page.locator('.sound-card:visible').count(),3);
 await page.waitForFunction(()=>document.querySelector('#offline').textContent.includes('ready offline'));
 await page.reload();await page.waitForSelector('.sound-card:visible');assert.equal(await page.locator('#category-heading').textContent(),'Water');
 await page.locator('#mixes-tab').click();await page.getByRole('button',{name:'Radio and brown',exact:true}).click();await page.locator('#library-tab').click();
 await chooseCategory(page, 'Radio');assert.equal(await page.locator('[data-kind="radio"] input').inputValue(),'31');
 await context.setOffline(true);await page.reload();await page.waitForSelector('.sound-card:visible');
 const before=requests;await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#play').textContent.includes('Pause'));
 assert.equal(requests,before);assert.match(await page.locator('.radio-state').textContent(),/Offline/);
 assert.equal(await page.evaluate(()=>window.__contexts[0].state),'running');
 const keys=await page.evaluate(async()=>{const names=await caches.keys();return(await Promise.all(names.map(async name=>(await(await caches.open(name)).keys()).map(request=>request.url)))).flat();});
 assert.equal(keys.some(url=>url.includes('127.0.0.1:8443')),false);
 await page.locator('#play').click();await context.setOffline(false);
 await page.locator('#open-mixer').click();await page.locator('#timer').selectOption('15');await page.locator('#mixer-dialog .close').click();
 await page.clock.install();await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('.radio-state').textContent.includes('Live'));await page.clock.fastForward(901000);
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Sleep timer finished'));
 assert.equal(await page.evaluate(()=>window.__radios.every(media=>media.paused&&!media.hasAttribute('src'))),true);
 await chooseCategory(page, 'All sounds');
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('#filter-toggle').isVisible(),true);}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(os.tmpdir(), 'openambience-categories-mobile.png'),fullPage:true});
 await chooseCategory(page, 'Radio');await page.screenshot({path:path.join(os.tmpdir(), 'openambience-radio-mobile.png')});
 await page.locator('#open-mixer').click();await page.locator('#timer').selectOption('0');await page.locator('#mixer-dialog .close').click();
 await chooseCategory(page, 'Noise & textures');await page.locator('[data-sound="brown"] .sound-toggle').click();
 await chooseCategory(page, 'Radio');await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('.radio-state').textContent.includes('Live'));
 await page.locator('[data-kind="radio"] .sound-toggle').click();
 await page.waitForFunction(()=>window.__radios.every(media=>media.paused&&!media.hasAttribute('src')));
 await page.locator('#play').click();assert.equal(await page.evaluate(()=>window.__contexts[0].state),'suspended');
 await page.locator('[data-kind="radio"] .remove-sound').click();await page.waitForFunction(()=>!document.querySelector('[data-kind="radio"]'));
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('openambience.v2')).saved.some(item=>item.mix.enabled.some(id=>id.startsWith('radio-')))),false);
 assert.deepEqual(errors,[]);
 console.log('PASS: categories/counts, custom categorization persistence, radio URL validation/duplicates, no request on save, CORS-enabled audible stream, CORS rejection preserves local audio, pause releases stream, offline/online retry, saved station mix reload, offline local playback, no radio cache, timer stops stream, responsive categories.');
 await browser.close();server.close();
})().catch(error=>{console.error(error);process.exit(1);});
