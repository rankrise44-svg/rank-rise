/* ═══════════════════════════════════════════════════════════════
   RANKRISE — EXPO MODE
   ───────────────────────────────────────────────────────────────
   For a touch screen on a stand (iPad / laptop). Turn it on once on
   that device by opening   rankrise.media/?expo   — it stays on for
   that device only. Turn it off with   rankrise.media/?expo=off

   What changes on that device:
   - the entry waits for a touch, and starts with sound
   - after IDLE seconds with nobody touching, it warns, then goes back
     to the start screen for the next visitor
   - links that would leave the site (WhatsApp, Instagram, email, phone,
     maps…) show a QR code instead, so visitors take it on their phone
   - the business form opens inside the site, not in a new tab
   - the whole site is cached on the device, so it keeps working if
     the expo Wi-Fi drops
   ═══════════════════════════════════════════════════════════════ */
(function(){
  var q = new URLSearchParams(location.search), on = false;
  try{
    if(q.has('expo')) localStorage.setItem('rr-expo', q.get('expo') === 'off' ? '0' : '1');
    on = localStorage.getItem('rr-expo') === '1';
  }catch(e){ on = q.has('expo') && q.get('expo') !== 'off'; }
  window.RR_EXPO = on;
  if(!on){
    /* a device that left expo mode drops its offline cache too */
    if(q.get('expo') === 'off' && navigator.serviceWorker)
      navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ r.unregister(); }); });
    return;
  }
  document.documentElement.classList.add('expo');

  var IDLE = 75, WARN = 12;            /* seconds */
  var HOME = '/';
  var FORM_HOST = 'rankrise-start.netlify.app';

  /* ── offline: cache the site on this device ── */
  if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(function(){});

  /* the QR maker is only needed on the stand */
  var qs = document.createElement('script'); qs.src = '/assets/vendor/qrcode.min.js'; qs.async = true;
  (document.head || document.documentElement).appendChild(qs);

  function ready(fn){ if(document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(function(){
    var css = document.createElement('style');
    css.textContent =
      '.expo-sheet{position:fixed;inset:0;z-index:600;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(5,5,8,.78);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);opacity:0;visibility:hidden;transition:opacity .35s,visibility .35s}' +
      '.expo-sheet.open{opacity:1;visibility:visible}' +
      '.expo-card{width:min(420px,100%);border:1px solid rgba(241,241,238,.14);border-radius:28px;background:linear-gradient(180deg,#14141c,#0b0b10);padding:34px 30px 28px;text-align:center;box-shadow:0 40px 120px -30px rgba(127,100,208,.55);transform:translateY(18px) scale(.97);transition:transform .45s cubic-bezier(.2,.8,.2,1)}' +
      '.expo-sheet.open .expo-card{transform:none}' +
      '.expo-card small{display:block;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#A38FE3}' +
      '.expo-card h3{font-family:Anton,sans-serif;font-weight:400;font-size:34px;line-height:1;margin:12px 0 22px;color:#F1F1EE}' +
      '.expo-qr{display:inline-block;padding:16px;border-radius:20px;background:#fff;box-shadow:0 0 0 6px rgba(127,100,208,.35),0 0 60px rgba(127,100,208,.45)}' +
      '.expo-qr svg{display:block;width:min(240px,60vw);height:auto}' +
      '.expo-card p{color:rgba(241,241,238,.62);font-size:15px;margin:18px 0 4px}' +
      '.expo-card .u{color:#F1F1EE;font-weight:600;font-size:15px;word-break:break-all}' +
      '.expo-card button{margin-top:24px;width:100%;padding:17px;border-radius:100px;border:0;background:#7F64D0;color:#fff;font:600 16px "DM Sans",sans-serif;cursor:pointer}' +
      '.expo-idle{position:fixed;left:50%;bottom:28px;z-index:610;transform:translate(-50%,30px);opacity:0;transition:opacity .4s,transform .4s;padding:16px 26px;border-radius:100px;background:#7F64D0;color:#fff;font:600 16px "DM Sans",sans-serif;box-shadow:0 18px 50px -12px rgba(127,100,208,.7);pointer-events:none;white-space:nowrap}' +
      '.expo-idle.show{opacity:1;transform:translate(-50%,0)}';
    document.head.appendChild(css);

    /* ── the QR sheet ── */
    var sheet = document.createElement('div');
    sheet.className = 'expo-sheet';
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true');
    sheet.innerHTML = '<div class="expo-card"><small>Scan with your phone</small><h3></h3><div class="expo-qr"></div><p>or find us at</p><div class="u"></div><button type="button">Done</button></div>';
    document.body.appendChild(sheet);
    function closeSheet(){ sheet.classList.remove('open'); }
    sheet.addEventListener('click', function(e){ if(e.target === sheet || e.target.tagName === 'BUTTON') closeSheet(); });

    function qrSVG(text){
      if(!window.qrcode) return '';
      var qr = window.qrcode(0, 'M'); qr.addData(text); qr.make();
      return qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
    }
    function describe(href, a){
      var u; try{ u = new URL(href, location.href); }catch(e){ return null; }
      if(u.protocol === 'mailto:') return { t: 'Email us', show: u.pathname };
      if(u.protocol === 'tel:') return { t: 'Call us', show: u.pathname };
      var h = u.hostname.replace(/^www\./, '');
      if(h === 'wa.me' || h.indexOf('whatsapp') > -1) return { t: 'WhatsApp us', show: '+' + u.pathname.replace(/\D/g, '').replace(/^(961)(\d{2})(\d{3})(\d{3})$/, '$1 $2 $3 $4') };
      if(h.indexOf('instagram') > -1) return { t: 'Follow on Instagram', show: '@' + u.pathname.replace(/\//g, '') };
      if(h.indexOf('facebook') > -1) return { t: 'Find us on Facebook', show: h + u.pathname };
      if(h.indexOf('linkedin') > -1) return { t: 'Connect on LinkedIn', show: h + u.pathname };
      if(h.indexOf('linktr.ee') > -1) return { t: 'All our socials', show: h + u.pathname };
      if(h.indexOf('maps.') > -1 || u.pathname.indexOf('/maps') === 0) return { t: 'Visit the studio', show: 'Sin El Fil, Lebanon' };
      return { t: (a && a.textContent.trim().slice(0, 40)) || 'Open on your phone', show: h + (u.pathname === '/' ? '' : u.pathname) };
    }
    function openSheet(href, a){
      var d = describe(href, a); if(!d) return;
      sheet.querySelector('h3').textContent = d.t;
      sheet.querySelector('.u').textContent = d.show;
      sheet.querySelector('.expo-qr').innerHTML = qrSVG(href);
      sheet.classList.add('open');
      if(window.__tapTone) window.__tapTone();
    }
    window.__expoQR = openSheet;

    /* ── links that would leave the device ── */
    document.addEventListener('click', function(e){
      var a = e.target.closest && e.target.closest('a[href]'); if(!a) return;
      var href = a.getAttribute('href'), u;
      try{ u = new URL(href, location.href); }catch(err){ return; }
      var external = u.protocol === 'mailto:' || u.protocol === 'tel:' || ((u.protocol === 'http:' || u.protocol === 'https:') && u.host !== location.host);
      if(!external) return;
      e.preventDefault(); e.stopPropagation();
      /* the business form stays on the stand, inside the site */
      if(u.hostname === FORM_HOST && typeof window.openProject === 'function'){ window.openProject(u.href, 'Tell us about your business'); return; }
      openSheet(u.href, a);
    }, true);

    /* ── idle: back to the start for the next visitor ── */
    var toast = document.createElement('div'); toast.className = 'expo-idle';
    document.body.appendChild(toast);
    var last = Date.now();
    function poke(){ last = Date.now(); if(toast.classList.contains('show')) toast.classList.remove('show'); }
    ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'].forEach(function(ev){ addEventListener(ev, poke, { passive: true, capture: true }); });
    function atStart(){
      var en = document.getElementById('enter');
      var onHome = location.pathname === '/' || /\/index\.html$/.test(location.pathname);
      return onHome && en && !en.classList.contains('done');
    }
    setInterval(function(){
      if(atStart()){ last = Date.now(); return; }
      /* typing in the business form happens inside a frame we can't hear,
         so give it longer */
      var v = document.getElementById('viewer'), limit = v && v.classList.contains('open') ? 240 : IDLE;
      var idle = (Date.now() - last) / 1000;
      if(idle > limit - WARN && idle < limit){
        toast.textContent = 'Still exploring? Touch anywhere · ' + Math.ceil(limit - idle);
        toast.classList.add('show');
      } else if(idle >= limit){
        try{ sessionStorage.removeItem('rr-in'); sessionStorage.removeItem('rr-snd'); }catch(e){}
        location.href = HOME;
      }
    }, 500);

    /* ── portal is staff-only: hide it on the stand ── */
    document.querySelectorAll('a[href="portal.html"],a[href="/portal"]').forEach(function(a){ a.style.display = 'none'; });
  });
})();
