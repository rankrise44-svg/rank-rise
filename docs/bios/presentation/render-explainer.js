// usage: node render-explainer.js out.mp4 [fps] [t0,t1 stills...]
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const FF=process.env.FF, OUT=process.argv[2], FPS=+(process.argv[3]||30), STILLS=process.argv[4];
const FD=process.env.FONTS||path.join(__dirname,'fonts'); // local copy of the Google Fonts CSS + ttf files
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1920,height:1080}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:fs.readFileSync(FD+'/css.css','utf8').replace(/url\((f\d\.ttf)\)/g,'url(https://fonts.gstatic.com/local/$1)')}));
 await p.route('https://fonts.gstatic.com/local/*',r=>r.fulfill({contentType:'font/ttf',body:fs.readFileSync(FD+'/'+r.request().url().split('/').pop())}));
 await p.goto('file://'+path.join(__dirname,'riser-explainer.html'));
 await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(500);
 const fam=await p.evaluate(()=>[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+f.weight).join(','));
 console.log('fonts',fam); if(!/Anton/.test(fam)) throw new Error('Anton not loaded');
 if(STILLS){ for(const t of STILLS.split(',').map(Number)){await p.evaluate(t=>seek(t),t);await p.screenshot({path:`t${t}.jpg`,quality:75});} await b.close(); console.log(errs.join('\n')||'ok'); return; }
 const D=await p.evaluate(()=>window.DURATION), N=Math.round(D*FPS);
 const ff=spawn(FF,['-y','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',OUT],{stdio:['pipe','ignore','inherit']});
 for(let i=0;i<N;i++){ await p.evaluate(t=>seek(t),i/FPS); const buf=await p.screenshot({type:'jpeg',quality:92});
   if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r)); if(i%300===0) console.log('frame',i,'/',N); }
 ff.stdin.end(); await new Promise(r=>ff.on('close',r)); await b.close(); console.log('done',OUT,errs.join('\n')||'no page errors');
})().catch(e=>{console.error(e);process.exit(1)});
