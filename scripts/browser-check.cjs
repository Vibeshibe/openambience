// Optional browser checks: see docs/testing.md for setup.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true});
 const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(() => {
   window.__contexts=[];
   const Native=window.AudioContext;
   window.AudioContext=class extends Native {constructor(...args){super(...args);window.__contexts.push(this);}};
 });
 const page = await context.newPage(), errors=[];
 page.on('pageerror', error=>errors.push(error.message));
 page.on('dialog', dialog=>dialog.type()==='prompt'?dialog.accept('Renamed mix'):dialog.accept());
 await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:8080/');
 await page.waitForSelector('.sound-card:visible');
 assert.equal(await page.locator('.sound-card').count(),18);
 assert.equal(await page.evaluate(()=>window.__contexts.length),0);
 const toggle = id=>page.locator(`[data-sound="${id}"] .sound-toggle`);
 await toggle('rain-leaves').click(); await toggle('brown').click();
 for(const id of ['rain-glass','thunder','forest-wind','stream']) await toggle(id).click();
 await toggle('fire').click();assert.match(await page.locator('#status').textContent(),/Six sounds/);
 assert.equal(await page.locator('.sound-card.active').count(),6);
 for(const id of ['rain-glass','thunder','forest-wind','stream']) await toggle(id).click();
 await page.locator('#play').click();
 await page.waitForFunction(()=>document.querySelector('#play').textContent.includes('Pause'));
 assert.equal(await page.evaluate(()=>window.__contexts[0].state),'running');
 await page.locator('#volume-rain-leaves').fill('27');
 await page.locator('#open-mixer').click(); await page.locator('#master').fill('35');
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
 await page.locator('#sound-files').setInputFiles(require('node:path').resolve(__dirname, '../audio/fire.mp3'));
 await page.waitForFunction(()=>document.querySelectorAll('.sound-card').length===19);
 await page.locator('#sound-files').setInputFiles(require('node:path').resolve(__dirname, '../audio/fire.mp3'));
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('already in your library'));
 assert.equal(await page.locator('.sound-card').count(),19);
 await page.locator('#sound-files').setInputFiles({name:'invalid.wav',mimeType:'audio/wav',buffer:Buffer.from('not audio')});
 await page.waitForFunction(()=>!document.querySelector('#add-sounds').disabled);
 assert.equal(await page.locator('.sound-card').count(),19);
 await page.getByRole('button',{name:'My sounds',exact:true}).click();
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
 await page.getByRole('button',{name:'All sounds',exact:true}).click();
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
 await page.getByRole('button',{name:'My sounds',exact:true}).click();await page.locator('.remove-sound').click();
 await page.waitForFunction(()=>document.querySelectorAll('.sound-card').length===18);
 await page.locator('#mixes-tab').click();await page.getByRole('button',{name:'With import',exact:true}).click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('openambience.v2')).mix.enabled.some(id=>id.startsWith('custom-'))),false);
 await page.getByRole('button',{name:'Delete Renamed mix',exact:true}).click();
 assert.equal(await page.locator('.saved-item').count(),2);
 await page.locator('#library-tab').click(); await page.getByRole('button',{name:'All sounds',exact:true}).click();
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(), 'openambience-desktop.png'),fullPage:true});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({browser:await browser.version(),checks:['18 sounds','no autoplay','recording playback','per-layer and master levels','save/load/duplicate/rename/delete','multi-format validation','custom import and duplicate detection','persistence','offline reload/playback including imports','all 12 assets decoded offline and non-silent','search','320/390/768/1440px overflow','timer expiry','custom deletion updates saved mixes','no uncaught errors'],decoded},null,2));
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
