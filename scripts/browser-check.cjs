// Optional browser checks: see docs/testing.md for setup.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
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
 const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(() => {
   window.__contexts=[];
   const Native=window.AudioContext;
   window.AudioContext=class extends Native {constructor(...args){super(...args);window.__contexts.push(this);}
     createGain(){const gain=super.createGain();this.__gains ||= [];this.__gains.push(gain);return gain;}
   };
 });
 const page = await context.newPage(), errors=[];
 page.on('pageerror', error=>errors.push(error.message));
 page.on('dialog', dialog=>dialog.type()==='prompt'?dialog.accept('Renamed mix'):dialog.accept());
 await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:8080/');
 await page.waitForSelector('.sound-card:visible');
 assert.equal(await page.locator('.sound-card').count(),18);
 assert.equal(await page.evaluate(()=>window.__contexts.length),0);
 assert.equal(await page.locator('#player-notice').getAttribute('class'),'sr-only');
 assert.equal(await page.locator('.player-dock .player-summary').count(),0);
 for (const width of [320,390,768,1440]) {
   await page.setViewportSize({width,height:844});
   for (const selector of ['#play','#volume-toggle','#open-mixer']) {
     const bounds=await page.locator(selector).boundingBox();
     assert.ok(bounds.width>=44&&bounds.height>=44&&bounds.y+bounds.height<=844, `${selector} touch target at ${width}`);
     assert.equal(bounds.width,bounds.height);
   }
   const play=await page.locator('#play').boundingBox(), options=await page.locator('#open-mixer').boundingBox(), volume=await page.locator('#volume-toggle').boundingBox();
   assert.ok(Math.abs(play.x+play.width/2-width/2)<1, `Play centered at ${width}`);
   assert.ok(options.x<play.x&&volume.x>play.x);
   for (const side of [options,volume]) {
     assert.ok(side.height<play.height);
     assert.ok(Math.abs(side.y+side.height/2-play.y-play.height/2)<1, 'Side controls vertically centered');
   }
   await page.locator('#volume-toggle').click();
   const slider=await page.locator('#master').boundingBox();assert.ok(slider.width>=44&&slider.height>=100);
   const panel=await page.locator('#volume-popout').boundingBox();
   assert.ok(panel.x>=0&&panel.x+panel.width<=width&&panel.y>=0);
   assert.equal(await page.locator('#master').evaluate(element=>element===document.activeElement),true);
   assert.equal(await page.locator('#master-value').textContent(),`${await page.locator('#master').inputValue()}%`);
   if (width === 1440) await page.screenshot({path:'/tmp/openambience-volume-desktop.png'});
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#volume-toggle').evaluate(element=>element===document.activeElement),true);
   assert.equal(await page.locator('#volume-popout').isVisible(),false);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
 await page.setViewportSize({width:320,height:844});
 await page.locator('#volume-toggle').click();
 const track=await page.locator('#master').boundingBox();
 await page.touchscreen.tap(track.x+track.width/2,track.y+track.height*.25);
 assert.ok(Number(await page.locator('#master').inputValue())>60);
 await page.locator('#master').focus();const previous=Number(await page.locator('#master').inputValue());await page.keyboard.press('ArrowDown');
 assert.equal(Number(await page.locator('#master').inputValue()),previous-1);
 await page.keyboard.press('ArrowUp');assert.equal(Number(await page.locator('#master').inputValue()),previous);
 await page.keyboard.press('Home');assert.equal(await page.locator('#master').inputValue(),'0');
 await page.keyboard.press('End');assert.equal(await page.locator('#master').inputValue(),'100');
 assert.equal(await page.locator('#master-value').textContent(),'100%');
 await page.keyboard.press('Tab');assert.equal(await page.locator('#mute').evaluate(element=>element===document.activeElement),true);
 await page.keyboard.press('Tab');assert.equal(await page.locator('#volume-popout').isVisible(),false);
 await page.locator('#volume-toggle').click();await page.locator('#volume-toggle').click();
 assert.equal(await page.locator('#volume-popout').isVisible(),false);
 await page.locator('#volume-toggle').click();await page.locator('h1').click();
 assert.equal(await page.locator('#volume-popout').isVisible(),false);
 await page.setViewportSize({width:568,height:320});
 await page.locator('#volume-toggle').click();
 const landscape=await page.locator('#volume-popout').boundingBox();assert.ok(landscape.y>=0);
 await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});
 await page.locator('#volume-toggle').click();
 await page.locator('#master').fill('40');
 await page.screenshot({path:'/tmp/openambience-volume-mobile.png'});
 await page.keyboard.press('Escape');
 const toggle = id=>page.locator(`[data-sound="${id}"] .sound-toggle`);
 await toggle('rain-leaves').click(); await toggle('brown').click();
 for(const id of ['rain-glass','thunder','forest-wind','stream']) await toggle(id).click();
 await toggle('fire').click();assert.match(await page.locator('#status').textContent(),/Six sounds/);
 assert.equal(await page.locator('#dismiss-status').isVisible(),true);
 await page.locator('#dismiss-status').click();
 assert.equal(await page.locator('#player-notice').getAttribute('class'),'sr-only');
 assert.equal(await page.locator('.sound-card.active').count(),6);
 for(const id of ['rain-glass','thunder','forest-wind','stream']) await toggle(id).click();
 await page.locator('#play').click();
 await page.waitForFunction(()=>document.querySelector('#play').textContent.includes('Pause'));
 assert.equal(await page.evaluate(()=>window.__contexts[0].state),'running');
 assert.equal(await page.locator('#player-notice').getAttribute('class'),'sr-only');
 await page.locator('#volume-rain-leaves').fill('27');
 await page.locator('#volume-toggle').click();
 await page.locator('#master').fill('35');
 await page.getByRole('button',{name:'Mute volume',exact:true}).click();
 assert.equal(await page.locator('#master').inputValue(),'0');
 assert.equal(await page.locator('#play').getAttribute('aria-label'),'Pause mix');
 await page.waitForFunction(()=>window.__contexts[0].__gains[0].gain.value<.001);
 await page.getByRole('button',{name:'Unmute volume',exact:true}).click();
 assert.equal(await page.locator('#master').inputValue(),'35');
 await page.waitForFunction(()=>window.__contexts[0].__gains[0].gain.value>.34);
 await page.locator('#master').fill('0');
 assert.equal(await page.locator('#mute').getAttribute('aria-pressed'),'true');
 await page.locator('#mute').click();assert.equal(await page.locator('#master').inputValue(),'35');
 await page.locator('#open-mixer').click();
 assert.equal(await page.locator('#volume-popout').isVisible(),false);
 await page.locator('#mix-name').fill('Evening <test>'); await page.locator('#save-form button').click();
 await page.locator('#mixer-dialog .close').click();
 await page.locator('#mixes-tab').click();
 assert.equal(await page.locator('.saved-item').count(),1);
 await page.getByRole('button',{name:'Duplicate Evening <test>',exact:true}).click();
 assert.equal(await page.locator('.saved-item').count(),2);
 await page.getByRole('button',{name:'Rename Evening <test>',exact:true}).click();
 await page.locator('.preset').first().click();
 await page.getByRole('button',{name:'Renamed mix',exact:true}).click();
 await page.locator('#library-tab').click();
 assert.equal(await page.locator('#volume-rain-leaves').inputValue(),'27');
 await page.locator('#play').click();
 assert.equal(await page.locator('#sound-files').getAttribute('accept'),null);
 await importFile(page, [
   {name:'notes.txt',mimeType:'text/plain',buffer:Buffer.from('not an audio recording')},
   {name:'fire',mimeType:'application/octet-stream',buffer:require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../audio/fire.mp3'))}
 ]);
 await page.waitForFunction(()=>document.querySelectorAll('.sound-card').length===19);
 assert.match(await page.locator('#status').textContent(),/1 recording added.*notes.txt: not readable audio/);
 await importFile(page, require('node:path').resolve(__dirname, '../audio/fire.mp3'));
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('already in your library'));
 assert.equal(await page.locator('.sound-card').count(),19);
 await importFile(page, {name:'invalid.wav',mimeType:'audio/wav',buffer:Buffer.from('not audio')});
 await page.waitForFunction(()=>!document.querySelector('#add-sounds').disabled);
 assert.equal(await page.locator('.sound-card').count(),19);
 assert.match(await page.locator('#status').textContent(),/0 recordings added.*invalid.wav: not readable audio/);
 for (const file of [
   {name:'photo.png',mimeType:'image/png',buffer:require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../icons/icon-192.png'))},
   {name:'document.mp3',mimeType:'audio/mpeg',buffer:Buffer.from('%PDF-1.4\nThis is not audio.')}
 ]) {
   await importFile(page,file);
   assert.equal(await page.locator('.sound-card').count(),19);
   assert.match(await page.locator('#status').textContent(),/0 recordings added.*not readable audio/);
 }
 await chooseCategory(page, 'My sounds');
 await page.locator('.sound-card:visible .sound-toggle').click();
 const customID=await page.locator('.sound-card:visible').getAttribute('data-sound');
 await page.locator('#open-mixer').click(); await page.locator('#mix-name').fill('With import'); await page.locator('#save-form button').click(); await page.locator('#mixer-dialog .close').click();
 await page.waitForFunction(()=>document.querySelector('#offline').textContent.includes('ready offline'));
 await page.reload(); await page.waitForSelector('.sound-card:visible');
 assert.equal(await page.locator('.sound-card').count(),19);
 assert.match(await page.locator('#play').textContent(),/Play mix/);
 assert.equal(await page.evaluate(()=>window.__contexts.length),0);
 await context.setOffline(true); await page.reload(); await page.waitForSelector('.sound-card:visible');
 await page.locator('#play').click(); await page.waitForFunction(()=>document.querySelector('#play').textContent.includes('Pause'));
 assert.equal(await page.locator(`[data-sound="${customID}"]`).getAttribute('class'),'sound-card active');
 await page.locator('#play').click();
 const decoded=await page.evaluate(async()=>{
   const {RECORDINGS}=await import('./js/catalog.js'); const ctx=new AudioContext();
   const results=[];
   for(const sound of RECORDINGS){
     const response=await fetch(sound.url); const buffer=await ctx.decodeAudioData(await response.arrayBuffer());
     let sum=0;const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)sum+=data[i]*data[i];
     results.push({id:sound.id,duration:buffer.duration,rms:Math.sqrt(sum/data.length)});
   }
   await ctx.close();return results;
 });
 assert.equal(decoded.length,12); for(const sound of decoded){assert.ok(sound.duration>5);assert.ok(sound.rms>.001);}
 await chooseCategory(page, 'All sounds');
 await page.locator('#search').fill('ocean');assert.equal(await page.locator('.sound-card:visible').count(),2);
 await page.locator('#search').fill('unknown-sound');assert.equal(await page.locator('#empty').isVisible(),true);
 await page.locator('#search').fill('');
 for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Overflow at ${width}`);
 }
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(), 'openambience-mobile.png'),fullPage:true});
 await page.locator('#open-mixer').click();
 await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(), 'openambience-mixer.png')});
 await page.locator('#timer').selectOption('15');await page.locator('#mixer-dialog .close').click();
 await page.clock.install();await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#play').textContent.includes('Pause'));
 await page.clock.fastForward(901000);await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Sleep timer finished'));
 await chooseCategory(page, 'My sounds');await page.locator('.remove-sound').click();
 await page.waitForFunction(()=>document.querySelectorAll('.sound-card').length===18);
 await page.locator('#mixes-tab').click();await page.getByRole('button',{name:'With import',exact:true}).click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('openambience.v2')).mix.enabled.some(id=>id.startsWith('custom-'))),false);
 await page.getByRole('button',{name:'Delete Renamed mix',exact:true}).click();
 assert.equal(await page.locator('.saved-item').count(),2);
 await page.locator('#library-tab').click(); await chooseCategory(page, 'All sounds');
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(), 'openambience-desktop.png'),fullPage:true});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({browser:await browser.version(),checks:['player touch targets at four widths','vertical volume touch/keyboard controls, visible percentage, Escape/Tab/outside dismissal, short landscape layout','mute and restore actual master gain','18 sounds','no autoplay','recording playback','per-layer and master levels','save/load/duplicate/rename/delete','multi-format validation','custom import and duplicate detection','persistence','offline reload/playback including imports','all 12 assets decoded offline and non-silent','search','320/390/768/1440px overflow','timer expiry','custom deletion updates saved mixes','no uncaught errors'],decoded},null,2));
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
