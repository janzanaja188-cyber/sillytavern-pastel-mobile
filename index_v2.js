// ============================================================
// iPhone Simulator v2.0 — SillyTavern Extension
// ============================================================
const extensionName = 'iphone-simulator';
const LS = 'isim_v2';

// ---- Defaults ----
const DEF = {
    theme: 'dark', accent: '#0a84ff',
    friends: [],       // [{ id, name, avatar, persona }]
    history: {},       // { fid: [msg,...] }
    notes: {},         // { fid: string } — user note per friend
    botnotes: {},      // { fid: string } — bot note per friend
    chatnotes: {},     // { fid: string } — bot's IG-style note shown near avatar
    wallpapers: {},    // { fid: base64 }
    stickers: [],      // [base64,...]
    myNote: '',        // user's own IG-style profile note
    userName: 'Me',
    tweets: [],
    tweetId: 1,
};

let _cfg = null;
function cfg() {
    if (_cfg) return _cfg;
    try { _cfg = Object.assign({}, DEF, JSON.parse(localStorage.getItem(LS)||'{}')); }
    catch { _cfg = Object.assign({}, DEF); }
    // ensure nested objects
    for (const k of ['history','notes','botnotes','chatnotes','wallpapers']) {
        if (!_cfg[k] || typeof _cfg[k] !== 'object') _cfg[k] = {};
    }
    if (!Array.isArray(_cfg.friends)) _cfg.friends = [];
    if (!Array.isArray(_cfg.stickers)) _cfg.stickers = [];
    if (!Array.isArray(_cfg.tweets)) _cfg.tweets = [];
    return _cfg;
}
function save() { try { localStorage.setItem(LS, JSON.stringify(_cfg||cfg())); } catch {} }

// ---- State ----
let activeFriend = null;  // current chat friend
let pendingMsgs = [];     // queued before bot send
let isTyping = false;
let callActive = false, callTimer = 0, callInterval = null, callMuted = false;
let currentScreen = 'home';
let clockInterval = null;

// ---- Helpers ----
function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function now() {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function toast(msg, dur=2000) {
    const el = document.getElementById('isim-toast');
    if (!el) return;
    el.textContent = msg; el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), dur);
}
function sysMsg(text) {
    const msgs = document.getElementById('isim-msgs');
    if (!msgs) return;
    msgs.insertAdjacentHTML('beforeend', `<div class="isim-sys">${esc(text)}</div>`);
    msgs.scrollTop = msgs.scrollHeight;
}
function playerName() {
    try { const ctx = SillyTavern.getContext(); if (ctx?.name1) return ctx.name1; } catch {}
    return cfg().userName || 'Me';
}

// ============================================================
// CSS (all injected from JS — no style.css dependency)
// ============================================================
function injectCSS() {
    if (document.getElementById('isim-css')) return;
    const el = document.createElement('style');
    el.id = 'isim-css';
    el.textContent = `
#isim-wrap{position:fixed;inset:0;z-index:2147483645;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);}
#isim-wrap.open{display:flex;}
#isim-frame{
    width:min(390px,100vw);height:min(844px,100vh);
    border-radius:clamp(0px,4vw,48px);
    border:clamp(0px,1vw,7px) solid #1c1c1e;
    box-shadow:0 0 0 1px #3a3a3c,0 24px 80px rgba(0,0,0,.9);
    overflow:hidden;display:flex;flex-direction:column;position:relative;
    font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;
    --acc:#0a84ff;
}
#isim-frame.dark{--bg:#000;--bg2:#1c1c1e;--bg3:#2c2c2e;--txt:#fff;--txt2:rgba(235,235,245,.7);--txt3:rgba(235,235,245,.35);--sep:#38383a;--bo:#1c1c1e;--bi:#e5e5ea;--inp:#1c1c1e;}
#isim-frame.light{--bg:#f2f2f7;--bg2:#fff;--bg3:#e5e5ea;--txt:#000;--txt2:rgba(60,60,67,.7);--txt3:rgba(60,60,67,.35);--sep:#c6c6c8;--bo:var(--acc);--bi:#e5e5ea;--inp:#fff;}
/* Island */
#isim-island{position:absolute;top:10px;left:50%;transform:translateX(-50%);width:min(126px,34%);height:34px;background:#000;border-radius:20px;z-index:10;pointer-events:none;}
/* Statusbar */
#isim-sb{height:52px;background:var(--bg);display:flex;align-items:flex-end;justify-content:space-between;padding:0 28px 7px;flex-shrink:0;}
#isim-sb-t{font-size:15px;font-weight:600;color:var(--txt);}
#isim-sb-r{font-size:12px;color:var(--txt);display:flex;align-items:center;gap:4px;}
/* Close btn */
#isim-x{position:absolute;top:56px;right:10px;z-index:20;width:28px;height:28px;border-radius:50%;border:none;background:rgba(255,255,255,.12);color:var(--txt);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;}
/* Screen container */
#isim-screen{flex:1;overflow:hidden;position:relative;background:var(--bg);}
/* Home */
#isim-home{position:absolute;inset:0;background:linear-gradient(165deg,#1a1a2e 0%,#0f3460 60%,#16213e 100%);display:flex;flex-direction:column;}
#isim-home.off{display:none;}
.isim-home-time{font-size:clamp(48px,15vw,72px);font-weight:200;color:#fff;text-align:center;padding-top:clamp(16px,4vw,28px);letter-spacing:-2px;line-height:1;}
.isim-home-date{font-size:clamp(13px,3.5vw,16px);color:rgba(255,255,255,.65);text-align:center;margin:2px 0 auto;}
.isim-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(8px,2vw,14px);padding:clamp(12px,3vw,20px);margin-top:auto;}
.isim-app{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;background:none;border:none;}
.isim-app:active .isim-ico{transform:scale(.88);}
.isim-ico{width:clamp(48px,14vw,62px);height:clamp(48px,14vw,62px);border-radius:clamp(11px,3.5vw,16px);display:flex;align-items:center;justify-content:center;font-size:clamp(20px,6vw,28px);}
.isim-app span{font-size:clamp(9px,2.5vw,12px);color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.5);}
.ic-msg{background:linear-gradient(145deg,#34c759,#30d158);}
.ic-set{background:linear-gradient(145deg,#636366,#48484a);}
.ic-tw{background:linear-gradient(145deg,#1d9bf0,#0a84ff);}
.isim-bar-home{height:5px;width:min(130px,35%);background:rgba(255,255,255,.3);border-radius:3px;margin:8px auto;}
/* Generic screen */
.isim-scr{position:absolute;inset:0;display:none;flex-direction:column;background:var(--bg);}
.isim-scr.on{display:flex;}
/* Nav */
.isim-nav{height:44px;background:var(--bg2);border-bottom:.5px solid var(--sep);display:flex;align-items:center;padding:0 10px;flex-shrink:0;gap:4px;}
.isim-bk{background:none;border:none;color:var(--acc);font-size:clamp(13px,3.5vw,16px);cursor:pointer;padding:4px 6px;white-space:nowrap;}
.isim-nav-ttl{flex:1;text-align:center;font-size:clamp(14px,4vw,17px);font-weight:600;color:var(--txt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.isim-nav-act{background:none;border:none;color:var(--acc);font-size:13px;cursor:pointer;padding:4px 6px;white-space:nowrap;}
/* Messages list screen */
#isim-msglist{flex:1;overflow-y:auto;}
.isim-thread-row{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:.5px solid var(--sep);cursor:pointer;position:relative;}
.isim-thread-row:active{background:var(--bg3);}
.isim-thread-av{width:48px;height:48px;border-radius:50%;background:var(--bg3);object-fit:cover;flex-shrink:0;position:relative;}
.isim-thread-av img{width:100%;height:100%;border-radius:50%;object-fit:cover;}
.isim-thread-info{flex:1;min-width:0;}
.isim-thread-name{font-size:15px;font-weight:600;color:var(--txt);}
.isim-thread-preview{font-size:13px;color:var(--txt3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.isim-thread-time{font-size:11px;color:var(--txt3);flex-shrink:0;}
/* Bot IG-note bubble */
.isim-ig-note{position:absolute;top:-14px;left:54px;background:linear-gradient(135deg,var(--acc),#bf5af2);color:#fff;padding:4px 10px;border-radius:14px 14px 14px 2px;font-size:11px;max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 8px rgba(0,0,0,.3);pointer-events:none;z-index:5;}
/* Chat header */
.isim-chat-hdr{padding:8px 12px 6px;background:var(--bg2);border-bottom:.5px solid var(--sep);display:flex;align-items:center;gap:8px;flex-shrink:0;}
.isim-chat-hdr-av{width:34px;height:34px;border-radius:50%;background:var(--bg3);object-fit:cover;}
.isim-chat-hdr-info{flex:1;min-width:0;}
.isim-chat-hdr-name{font-size:14px;font-weight:600;color:var(--txt);}
.isim-chat-hdr-status{font-size:10px;color:var(--acc);}
.isim-chat-hdr-btns{display:flex;gap:3px;flex-wrap:wrap;}
.isim-hbtn{background:var(--bg3);border:none;border-radius:10px;padding:3px 7px;font-size:10px;color:var(--txt2);cursor:pointer;white-space:nowrap;}
/* Note panel */
.isim-notepanel{background:var(--bg2);border-bottom:.5px solid var(--sep);padding:8px 12px;display:none;flex-shrink:0;}
.isim-notepanel.on{display:block;}
.isim-notepanel textarea{width:100%;min-height:52px;background:var(--inp);border:.5px solid var(--sep);border-radius:8px;padding:7px;font-size:13px;color:var(--txt);resize:none;box-sizing:border-box;}
.isim-note-btns{display:flex;justify-content:flex-end;gap:6px;margin-top:5px;}
.isim-note-btns button{padding:5px 14px;border-radius:8px;border:none;cursor:pointer;font-size:13px;background:var(--bg3);color:var(--txt);}
.isim-note-btns .prim{background:var(--acc);color:#fff;}
/* Messages */
#isim-msgs{flex:1;overflow-y:auto;padding:10px 10px 4px;display:flex;flex-direction:column;gap:3px;background:var(--bg);}
.isim-sys{text-align:center;font-size:11px;color:var(--txt3);padding:5px 0;}
.isim-row{display:flex;align-items:flex-end;gap:5px;max-width:82%;}
.isim-row.in{align-self:flex-start;}
.isim-row.out{align-self:flex-end;flex-direction:row-reverse;}
.isim-av{width:24px;height:24px;border-radius:50%;background:var(--bg3);flex-shrink:0;object-fit:cover;}
.isim-wrap2{display:flex;flex-direction:column;gap:2px;}
.isim-bub{padding:8px 12px;border-radius:18px;font-size:14px;line-height:1.45;word-break:break-word;}
.isim-row.in .isim-bub{background:var(--bi);color:var(--txt);border-bottom-left-radius:4px;}
.isim-row.out .isim-bub{background:var(--bo);color:#fff;border-bottom-right-radius:4px;}
.isim-t{font-size:10px;color:var(--txt3);padding:0 2px;}
/* Typing */
.isim-dots{display:flex;gap:4px;padding:10px 14px;background:var(--bi);border-radius:18px;border-bottom-left-radius:4px;}
.isim-dots span{width:7px;height:7px;border-radius:50%;background:var(--txt3);animation:idot .9s infinite;}
.isim-dots span:nth-child(2){animation-delay:.15s;}
.isim-dots span:nth-child(3){animation-delay:.3s;}
@keyframes idot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
/* Pending badge */
#isim-pending-badge{display:none;position:absolute;top:6px;right:6px;background:#ff375f;color:#fff;border-radius:10px;padding:1px 6px;font-size:11px;font-weight:700;}
#isim-pending-badge.on{display:block;}
/* Sticker tray */
#isim-stray{display:none;flex-wrap:wrap;gap:6px;padding:8px;background:var(--bg2);border-top:.5px solid var(--sep);max-height:120px;overflow-y:auto;flex-shrink:0;}
#isim-stray.on{display:flex;}
.isim-stk{width:52px;height:52px;object-fit:contain;border-radius:8px;cursor:pointer;background:var(--bg3);}
.isim-stk-add{width:52px;height:52px;border-radius:8px;background:var(--bg3);border:none;cursor:pointer;font-size:22px;display:flex;align-items:center;justify-content:center;color:var(--txt2);}
/* Plus tray */
#isim-ptray{display:none;flex-wrap:wrap;gap:10px;padding:10px;background:var(--bg2);border-top:.5px solid var(--sep);flex-shrink:0;justify-content:center;}
#isim-ptray.on{display:flex;}
.isim-pi{display:flex;flex-direction:column;align-items:center;gap:3px;background:var(--bg3);border:none;border-radius:14px;padding:10px 12px;cursor:pointer;font-size:22px;min-width:56px;}
.isim-pi span{font-size:10px;color:var(--txt2);}
/* Red envelope sheet */
#isim-redenv{display:none;position:absolute;bottom:0;left:0;right:0;background:var(--bg2);border-radius:20px 20px 0 0;padding:18px;z-index:40;box-shadow:0 -4px 20px rgba(0,0,0,.4);}
#isim-redenv.on{display:block;}
#isim-redenv input{width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:.5px solid var(--sep);background:var(--inp);color:var(--txt);font-size:15px;margin-bottom:8px;}
/* Input bar */
#isim-ibar{background:var(--bg2);border-top:.5px solid var(--sep);padding:6px 10px;display:flex;gap:6px;align-items:flex-end;flex-shrink:0;position:relative;}
#isim-ibar textarea{flex:1;background:var(--inp);border:.5px solid var(--sep);border-radius:18px;padding:7px 12px;font-size:14px;color:var(--txt);resize:none;line-height:1.4;max-height:80px;overflow-y:auto;}
#isim-ibar textarea::placeholder{color:var(--txt3);}
.isim-ibtn{width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:15px;}
#isim-plus-btn{background:var(--bg3);color:var(--txt);}
#isim-stk-btn{background:var(--bg3);color:var(--txt);}
#isim-nudge-btn{background:var(--bg3);color:var(--txt2);position:relative;}
#isim-send-btn{background:var(--acc);color:#fff;}
#isim-send-btn:disabled{opacity:.35;cursor:default;}
/* Call */
#isim-call{position:absolute;inset:0;background:#000;display:none;flex-direction:column;z-index:30;}
#isim-call.on{display:flex;}
#isim-cbg{position:absolute;inset:0;background-size:cover;background-position:center;filter:blur(22px) brightness(.4);}
#isim-cmid{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;}
#isim-cav{width:clamp(80px,22vw,110px);height:clamp(80px,22vw,110px);border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.25);}
#isim-cname{font-size:clamp(20px,6vw,28px);font-weight:600;color:#fff;}
#isim-cstat{font-size:clamp(12px,3.5vw,16px);color:rgba(255,255,255,.65);}
#isim-cdur{font-size:clamp(14px,4vw,20px);color:rgba(255,255,255,.75);font-variant-numeric:tabular-nums;}
#isim-cfloat{position:relative;z-index:2;min-height:48px;padding:0 16px 6px;text-align:center;}
.ifw{display:inline-block;font-size:clamp(14px,4.5vw,19px);font-weight:600;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.9);opacity:0;animation:ifl .35s forwards;}
@keyframes ifl{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
#isim-call-wait{position:relative;z-index:2;text-align:center;padding:4px;font-size:12px;color:rgba(255,255,255,.5);}
.isim-cbar{position:relative;z-index:2;display:flex;gap:8px;padding:8px 14px;}
#isim-cinp{flex:1;background:rgba(255,255,255,.12);border:none;border-radius:20px;padding:9px 14px;color:#fff;font-size:14px;}
#isim-cinp::placeholder{color:rgba(255,255,255,.35);}
#isim-csendbtn{width:36px;height:36px;border-radius:50%;border:none;background:var(--acc);color:#fff;font-size:15px;cursor:pointer;}
.isim-cctls{position:relative;z-index:2;display:flex;justify-content:center;gap:clamp(16px,5vw,32px);padding:12px 0 24px;}
.isim-cc{display:flex;flex-direction:column;align-items:center;gap:5px;background:none;border:none;cursor:pointer;}
.isim-cc-bg{width:clamp(52px,15vw,64px);height:clamp(52px,15vw,64px);border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:clamp(18px,5vw,24px);}
.isim-cc-bg.red{background:#ff3b30;}
.isim-cc-bg.on{background:rgba(255,255,255,.55);}
.isim-cc span{font-size:11px;color:rgba(255,255,255,.65);}
/* Toast */
#isim-toast{position:absolute;bottom:68px;left:50%;transform:translateX(-50%) translateY(12px);background:rgba(30,30,30,.95);color:#fff;padding:6px 16px;border-radius:16px;font-size:13px;opacity:0;transition:opacity .2s,transform .2s;z-index:99;white-space:nowrap;pointer-events:none;}
#isim-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
/* Settings */
.isim-sec{margin-top:20px;}
.isim-sec-hdr{font-size:12px;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;padding:0 16px 5px;}
.isim-sec-grp{background:var(--bg2);border-top:.5px solid var(--sep);border-bottom:.5px solid var(--sep);}
.isim-sec-row{display:flex;align-items:center;justify-content:space-between;padding:11px 16px;font-size:15px;color:var(--txt);border-bottom:.5px solid var(--sep);cursor:pointer;}
.isim-sec-row:last-child{border-bottom:none;}
.isim-sec-row.danger{color:#ff375f;}
.isim-toggle-wrap{position:relative;width:44px;height:26px;display:inline-block;}
.isim-toggle-wrap input{opacity:0;width:0;height:0;}
.isim-toggle-wrap span{position:absolute;inset:0;background:var(--bg3);border-radius:13px;cursor:pointer;transition:background .2s;}
.isim-toggle-wrap span::before{content:'';position:absolute;width:20px;height:20px;left:3px;top:3px;background:#fff;border-radius:50%;transition:transform .2s;}
.isim-toggle-wrap input:checked+span{background:var(--acc);}
.isim-toggle-wrap input:checked+span::before{transform:translateX(18px);}
.isim-sw{width:26px;height:26px;border-radius:50%;cursor:pointer;border:2px solid transparent;}
.isim-sw.on{border-color:var(--txt);}
/* Friends (contacts) */
.isim-fr-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:.5px solid var(--sep);}
.isim-fr-av{width:44px;height:44px;border-radius:50%;background:var(--bg3);object-fit:cover;flex-shrink:0;}
.isim-fr-info{flex:1;min-width:0;}
.isim-fr-name{font-size:15px;font-weight:500;color:var(--txt);}
.isim-fr-bio{font-size:12px;color:var(--txt3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.isim-fr-add{background:var(--acc);color:#fff;border:none;border-radius:12px;padding:4px 12px;font-size:13px;cursor:pointer;}
.isim-fr-added{font-size:12px;color:var(--acc);}
/* Profile */
#isim-profile-av{width:70px;height:70px;border-radius:50%;background:var(--bg3);object-fit:cover;border:3px solid var(--acc);}
.isim-profile-note-box{background:var(--bg2);border-radius:16px;padding:12px;margin:12px 16px;border:.5px solid var(--sep);}
.isim-profile-note-box textarea{width:100%;background:transparent;border:none;outline:none;font-size:14px;color:var(--txt);resize:none;min-height:60px;}
/* Twitter */
.isim-tw-tabs{display:flex;background:var(--bg2);border-bottom:.5px solid var(--sep);flex-shrink:0;}
.isim-tw-tab{flex:1;background:none;border:none;border-bottom:2px solid transparent;padding:10px 0;font-size:13px;color:var(--txt3);cursor:pointer;}
.isim-tw-tab.on{color:var(--acc);border-bottom-color:var(--acc);}
.isim-tw-pg{display:none;flex:1;overflow-y:auto;flex-direction:column;}
.isim-tw-pg.on{display:flex;}
.isim-tw-compose{display:flex;gap:8px;padding:10px;border-bottom:.5px solid var(--sep);flex-shrink:0;}
#isim-tw-input{flex:1;background:var(--inp);border:.5px solid var(--sep);border-radius:12px;padding:7px 10px;font-size:14px;color:var(--txt);resize:none;}
#isim-tw-post{background:var(--acc);color:#fff;border:none;border-radius:14px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;align-self:flex-end;}
#isim-tw-post:disabled{opacity:.4;}
.isim-tweet{display:flex;gap:8px;padding:10px 12px;border-bottom:.5px solid var(--sep);cursor:pointer;}
.isim-tweet:active{background:var(--bg3);}
.isim-tweet-av{width:38px;height:38px;border-radius:50%;background:var(--bg3);flex-shrink:0;object-fit:cover;}
.isim-tweet-body{flex:1;min-width:0;}
.isim-tweet-top{display:flex;gap:5px;flex-wrap:wrap;align-items:baseline;}
.isim-tweet-name{font-size:14px;font-weight:700;color:var(--txt);}
.isim-tweet-handle{font-size:12px;color:var(--txt3);}
.isim-tweet-time{font-size:11px;color:var(--txt3);margin-left:auto;}
.isim-tweet-text{font-size:14px;color:var(--txt);margin:3px 0 5px;line-height:1.4;}
.isim-tweet-acts{display:flex;gap:14px;font-size:12px;color:var(--txt3);}
.isim-tact{background:none;border:none;cursor:pointer;color:var(--txt3);font-size:12px;display:flex;align-items:center;gap:3px;}
.isim-tact.liked{color:#ff375f;}
.isim-tact.rted{color:#30d158;}
/* Responsive */
@media(max-width:400px),(max-height:600px){
    #isim-frame{border-radius:0 !important;border:none !important;width:100vw !important;height:100vh !important;}
    #isim-island{display:none !important;}
    #isim-sb{height:40px !important;}
}
    `;
    document.head.appendChild(el);
}

// ============================================================
// HTML
// ============================================================
function buildHTML() {
    return `
<div id="isim-frame" class="dark">
  <div id="isim-island"></div>
  <button id="isim-x" onclick="window.__isimClose()">✕</button>
  <div id="isim-sb"><span id="isim-sb-t">9:41</span><span id="isim-sb-r">▲ WiFi ▪</span></div>
  <div id="isim-screen">

    <!-- HOME -->
    <div id="isim-home">
      <div class="isim-home-time" id="isim-htime">9:41</div>
      <div class="isim-home-date" id="isim-hdate">Tuesday, May 12</div>
      <div class="isim-grid">
        <button class="isim-app" onclick="window.__isimNav('messages')">
          <div class="isim-ico ic-msg">💬</div><span>Messages</span>
        </button>
        <button class="isim-app" onclick="window.__isimNav('twitter')">
          <div class="isim-ico ic-tw">🐦</div><span>Tweeter</span>
        </button>
        <button class="isim-app" onclick="window.__isimNav('settings')">
          <div class="isim-ico ic-set">⚙</div><span>Settings</span>
        </button>
      </div>
      <div class="isim-bar-home"></div>
    </div>

    <!-- MESSAGES (list + contacts + profile tabs) -->
    <div class="isim-scr" id="isim-scr-messages">
      <div class="isim-nav">
        <button class="isim-bk" onclick="window.__isimNav('home')">‹</button>
        <span class="isim-nav-ttl">Messages</span>
        <button class="isim-nav-act" id="isim-msg-tab-chats" onclick="window.__isimMsgTab('chats')" style="font-weight:700;color:var(--acc)">Chats</button>
        <button class="isim-nav-act" id="isim-msg-tab-contacts" onclick="window.__isimMsgTab('contacts')">Contacts</button>
        <button class="isim-nav-act" id="isim-msg-tab-profile" onclick="window.__isimMsgTab('profile')">Me</button>
      </div>

      <!-- CHATS TAB -->
      <div id="isim-tab-chats" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;">
        <div id="isim-msglist"></div>
      </div>

      <!-- CONTACTS TAB -->
      <div id="isim-tab-contacts" style="flex:1;overflow-y:auto;display:none;flex-direction:column;">
        <input id="isim-fr-search" placeholder="Search characters..." style="margin:8px 12px;padding:8px 12px;border-radius:10px;border:none;background:var(--bg3);color:var(--txt);font-size:14px;box-sizing:border-box;width:calc(100% - 24px);flex-shrink:0;" oninput="window.__isimFilterContacts(this.value)">
        <div id="isim-contacts-list"></div>
      </div>

      <!-- PROFILE TAB -->
      <div id="isim-tab-profile" style="flex:1;overflow-y:auto;display:none;flex-direction:column;padding:16px;">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
          <img id="isim-profile-av" src="" alt="" onerror="this.style.background='var(--bg3)'">
          <div>
            <div style="font-size:18px;font-weight:700;color:var(--txt)" id="isim-profile-name">Me</div>
            <div style="font-size:13px;color:var(--txt3)">Your profile</div>
          </div>
        </div>
        <div class="isim-profile-note-box">
          <div style="font-size:12px;color:var(--txt3);margin-bottom:6px;">My Note (like IG notes — visible to contacts)</div>
          <textarea id="isim-my-note-ta" placeholder="What's on your mind?" rows="3"></textarea>
          <div style="display:flex;justify-content:flex-end;margin-top:6px;">
            <button onclick="window.__isimSaveMyNote()" style="background:var(--acc);color:#fff;border:none;border-radius:10px;padding:5px 14px;font-size:13px;cursor:pointer;">Save Note</button>
          </div>
        </div>
        <div style="font-size:12px;color:var(--txt3);text-align:center;padding:8px;">Your note shows up next to your name in contacts' view</div>
      </div>
    </div>

    <!-- CHAT SCREEN -->
    <div class="isim-scr" id="isim-scr-chat">
      <div class="isim-nav">
        <button class="isim-bk" onclick="window.__isimNav('messages')">‹ Back</button>
        <span class="isim-nav-ttl" id="isim-chat-ttl">Chat</span>
        <button class="isim-nav-act" onclick="window.__isimStartCall()">📞</button>
      </div>
      <div class="isim-chat-hdr" id="isim-chat-hdr">
        <img class="isim-chat-hdr-av" id="isim-chat-av" src="" alt="">
        <div class="isim-chat-hdr-info">
          <div class="isim-chat-hdr-name" id="isim-chat-name">-</div>
          <div class="isim-chat-hdr-status">Active now</div>
        </div>
        <div class="isim-chat-hdr-btns">
          <button class="isim-hbtn" onclick="window.__isimToggleNote()">Note</button>
          <button class="isim-hbtn" onclick="window.__isimSend2()" id="isim-send2-btn" style="background:var(--acc);color:#fff">Send ✓</button>
          <button class="isim-hbtn" onclick="window.__isimCancelBot()">Cancel</button>
          <button class="isim-hbtn" onclick="window.__isimRetry()">Retry</button>
        </div>
      </div>
      <div class="isim-notepanel" id="isim-notepanel">
        <div style="font-size:11px;color:var(--txt3);margin-bottom:4px">My note (bot reacts when you save)</div>
        <textarea id="isim-note-ta" placeholder="Write a note..."></textarea>
        <div class="isim-note-btns">
          <button onclick="window.__isimToggleNote()">Cancel</button>
          <button class="prim" onclick="window.__isimSaveNote()">Save</button>
        </div>
      </div>
      <div id="isim-msgs"></div>
      <!-- Sticker tray -->
      <div id="isim-stray"></div>
      <!-- Plus tray -->
      <div id="isim-ptray">
        <button class="isim-pi" onclick="window.__isimSendLocation()">📍<span>Location</span></button>
        <button class="isim-pi" onclick="window.__isimOpenRedEnv()">🧧<span>Red Envelope</span></button>
        <button class="isim-pi" onclick="document.getElementById('isim-photo-inp').click()">📷<span>Photo</span></button>
      </div>
      <!-- Red envelope -->
      <div id="isim-redenv">
        <div style="text-align:center;font-size:28px;margin-bottom:6px">🧧</div>
        <div style="text-align:center;font-size:15px;font-weight:600;color:var(--txt);margin-bottom:12px">Red Envelope</div>
        <input id="isim-re-amt" type="number" placeholder="Amount (THB)">
        <input id="isim-re-note" type="text" placeholder="Message (optional)">
        <button onclick="window.__isimSendRedEnv()" style="width:100%;padding:11px;border-radius:12px;border:none;background:#e02020;color:#fff;font-size:15px;font-weight:600;cursor:pointer">Send 🧧</button>
        <button onclick="window.__isimCloseRedEnv()" style="width:100%;padding:9px;border-radius:12px;border:none;background:var(--bg3);color:var(--txt);font-size:14px;cursor:pointer;margin-top:6px">Cancel</button>
      </div>
      <!-- Input bar -->
      <div id="isim-ibar">
        <button class="isim-ibtn" id="isim-plus-btn" onclick="window.__isimTogglePlus()">＋</button>
        <button class="isim-ibtn" id="isim-stk-btn" onclick="window.__isimToggleStray()">🖼</button>
        <textarea id="isim-inp" placeholder="iMessage" rows="1"></textarea>
        <button class="isim-ibtn" id="isim-nudge-btn" onclick="window.__isimSend2()" title="Send to bot (confirm all pending)">
          <span id="isim-pending-badge" class=""></span>⤴
        </button>
        <button class="isim-ibtn" id="isim-send-btn" onclick="window.__isimSend1()" title="Send message">⬆</button>
      </div>
      <!-- hidden inputs -->
      <input type="file" id="isim-stk-inp" accept="image/*" style="display:none" onchange="window.__isimAddSticker(this)">
      <input type="file" id="isim-photo-inp" accept="image/*" style="display:none" onchange="window.__isimSendPhoto(this)">
      <input type="file" id="isim-chat-bg-inp" accept="image/*" style="display:none" onchange="window.__isimSetChatBg(this)">
    </div>

    <!-- CALL SCREEN -->
    <div id="isim-call">
      <div id="isim-cbg"></div>
      <div id="isim-cmid">
        <img id="isim-cav" src="" alt="">
        <div id="isim-cname"></div>
        <div id="isim-cstat">Calling...</div>
        <div id="isim-cdur">0:00</div>
        <div id="isim-cfloat"></div>
        <div id="isim-call-wait"></div>
      </div>
      <div class="isim-cbar">
        <input id="isim-cinp" placeholder="Type during call...">
        <button id="isim-csendbtn" onclick="window.__isimCallSend()">⬆</button>
      </div>
      <div class="isim-cctls">
        <button class="isim-cc" onclick="window.__isimMute()">
          <div class="isim-cc-bg" id="isim-mute-bg">🎤</div><span>Mute</span>
        </button>
        <button class="isim-cc" onclick="window.__isimEndCall()">
          <div class="isim-cc-bg red">📵</div><span>End</span>
        </button>
        <button class="isim-cc">
          <div class="isim-cc-bg">🔊</div><span>Speaker</span>
        </button>
      </div>
    </div>

    <!-- TWITTER -->
    <div class="isim-scr" id="isim-scr-twitter">
      <div class="isim-nav">
        <button class="isim-bk" onclick="window.__isimNav('home')">‹</button>
        <span class="isim-nav-ttl">🐦 Tweeter</span>
      </div>
      <div class="isim-tw-tabs">
        <button class="isim-tw-tab on" data-tw="feed" onclick="window.__isimTwTab('feed',this)">Home</button>
        <button class="isim-tw-tab" data-tw="trends" onclick="window.__isimTwTab('trends',this)">Trends</button>
        <button class="isim-tw-tab" data-tw="profile" onclick="window.__isimTwTab('profile',this)">Profile</button>
      </div>
      <div id="isim-tw-feed" class="isim-tw-pg on">
        <div class="isim-tw-compose">
          <textarea id="isim-tw-input" placeholder="What's happening?" rows="2"></textarea>
          <button id="isim-tw-post" disabled onclick="window.__isimTwPost()">Post</button>
        </div>
        <div id="isim-tw-list"></div>
      </div>
      <div id="isim-tw-trends" class="isim-tw-pg">
        <div id="isim-tw-trends-list"></div>
      </div>
      <div id="isim-tw-profile" class="isim-tw-pg" style="padding:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="width:56px;height:56px;border-radius:50%;background:var(--acc);display:flex;align-items:center;justify-content:center;font-size:24px;">👤</div>
          <div>
            <div style="font-size:16px;font-weight:700;color:var(--txt)" id="isim-tw-pname">Me</div>
            <div style="font-size:13px;color:var(--txt3)" id="isim-tw-phandle">@me</div>
          </div>
        </div>
        <div id="isim-tw-mytweets"></div>
      </div>
    </div>

    <!-- SETTINGS -->
    <div class="isim-scr" id="isim-scr-settings">
      <div class="isim-nav">
        <button class="isim-bk" onclick="window.__isimNav('home')">‹</button>
        <span class="isim-nav-ttl">Settings</span>
      </div>
      <div style="flex:1;overflow-y:auto">
        <div class="isim-sec"><div class="isim-sec-hdr">Appearance</div>
          <div class="isim-sec-grp">
            <div class="isim-sec-row" style="cursor:default">
              <span>Dark Mode</span>
              <label class="isim-toggle-wrap"><input type="checkbox" id="isim-dark-chk" onchange="window.__isimToggleDark(this.checked)"><span></span></label>
            </div>
            <div class="isim-sec-row" onclick="window.__isimPickBg()">Chat Wallpaper <span style="color:var(--txt3)">›</span></div>
            <div class="isim-sec-row" onclick="window.__isimRemoveBg()">Remove Wallpaper <span style="color:#ff375f">✕</span></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;padding:12px 16px;background:var(--bg2);border-bottom:.5px solid var(--sep)">
            ${['#0a84ff','#30d158','#ff375f','#ff9f0a','#bf5af2','#ff6961'].map(c=>
                `<div class="isim-sw" data-c="${c}" style="background:${c}" onclick="window.__isimAccent('${c}',this)"></div>`
            ).join('')}
          </div>
        </div>
        <div class="isim-sec"><div class="isim-sec-hdr">Data</div>
          <div class="isim-sec-grp">
            <div class="isim-sec-row danger" onclick="window.__isimResetChat()">Reset Chat History ↺</div>
            <div class="isim-sec-row danger" onclick="window.__isimClearFriends()">Remove All Contacts ✕</div>
            <div class="isim-sec-row danger" onclick="window.__isimResetAll()">Reset Everything ✕</div>
          </div>
        </div>
        <div class="isim-sec"><div class="isim-sec-hdr">About</div>
          <div class="isim-sec-grp">
            <div class="isim-sec-row" style="cursor:default"><span>Version</span><span style="color:var(--txt3)">2.0.0</span></div>
          </div>
        </div>
        <div style="height:30px"></div>
      </div>
      <input type="file" id="isim-bg-inp" accept="image/*" style="display:none" onchange="window.__isimSetBg(this)">
    </div>

    <div id="isim-toast"></div>
  </div><!-- /screen -->
</div><!-- /frame -->
    `;
}

function injectHTML() {
    if (document.getElementById('isim-wrap')) return;
    const wrap = document.createElement('div');
    wrap.id = 'isim-wrap';
    wrap.innerHTML = buildHTML();
    wrap.addEventListener('click', e => { if (e.target === wrap) closePhone(); });
    document.body.appendChild(wrap);
}

// ---- Open/Close ----
function openPhone() {
    document.getElementById('isim-wrap')?.classList.add('open');
    applyTheme(); applyAccent(); syncSettings();
    startClock();
    renderMsgList();
    const f = cfg().friends;
    if (f.length && !activeFriend) activeFriend = f[0];
}
function closePhone() { document.getElementById('isim-wrap')?.classList.remove('open'); }
window.__isimClose = closePhone;

// ---- Navigation ----
window.__isimNav = function(screen) {
    document.getElementById('isim-home')?.classList.add('off');
    document.querySelectorAll('#isim-screen .isim-scr').forEach(s => s.classList.remove('on'));
    if (screen === 'home') {
        document.getElementById('isim-home')?.classList.remove('off');
    } else {
        document.getElementById('isim-scr-' + screen)?.classList.add('on');
        if (screen === 'messages') { renderMsgList(); window.__isimMsgTab('chats'); }
        if (screen === 'twitter') renderTwFeed();
        if (screen === 'settings') syncSettings();
    }
    currentScreen = screen;
};

// ---- Messages tabs ----
window.__isimMsgTab = function(tab) {
    ['chats','contacts','profile'].forEach(t => {
        document.getElementById('isim-tab-'+t).style.display = t===tab ? 'flex' : 'none';
        const btn = document.getElementById('isim-msg-tab-'+t);
        if (btn) { btn.style.fontWeight = t===tab ? '700' : '400'; btn.style.color = t===tab ? 'var(--acc)' : 'var(--txt3)'; }
    });
    if (tab === 'contacts') loadContacts();
    if (tab === 'profile') loadProfile();
};

// ---- Clock ----
function startClock() {
    if (clockInterval) return;
    function tick() {
        const d = new Date();
        const t = `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
        ['isim-sb-t','isim-htime'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = t; });
        const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const hd = document.getElementById('isim-hdate');
        if (hd) hd.textContent = `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
    }
    tick(); clockInterval = setInterval(tick, 15000);
}

// ---- Theme ----
function applyTheme() {
    const f = document.getElementById('isim-frame');
    if (f) f.className = cfg().theme || 'dark';
}
function applyAccent() {
    const f = document.getElementById('isim-frame');
    if (f) { f.style.setProperty('--acc', cfg().accent||'#0a84ff'); f.style.setProperty('--bo', cfg().accent||'#0a84ff'); }
}
function syncSettings() {
    applyTheme(); applyAccent();
    const chk = document.getElementById('isim-dark-chk');
    if (chk) chk.checked = (cfg().theme||'dark') === 'dark';
    document.querySelectorAll('.isim-sw').forEach(s => s.classList.toggle('on', s.dataset.c === cfg().accent));
}
window.__isimToggleDark = c => { cfg().theme = c ? 'dark' : 'light'; save(); applyTheme(); };
window.__isimAccent = (c, el) => {
    cfg().accent = c; save(); applyAccent();
    document.querySelectorAll('.isim-sw').forEach(s => s.classList.remove('on'));
    el?.classList.add('on');
};

// ---- Msg list (threads) ----
function renderMsgList() {
    const list = document.getElementById('isim-msglist');
    if (!list) return;
    const friends = cfg().friends || [];
    if (!friends.length) {
        list.innerHTML = '<div style="padding:30px;text-align:center;font-size:14px;color:var(--txt3)">No contacts yet<br><small>Go to Contacts tab to add</small></div>';
        return;
    }
    list.innerHTML = friends.map(f => {
        const hist = cfg().history[f.id] || [];
        const last = hist[hist.length-1];
        const preview = last ? last.content?.substring(0,40) : 'Tap to chat';
        const bnote = cfg().chatnotes[f.id] || '';
        return `<div class="isim-thread-row" onclick="window.__isimOpenChat('${esc(f.id)}')">
          <div class="isim-thread-av" style="position:relative">
            <img src="${esc(f.avatar)}" alt="" onerror="this.style.display='none'" style="width:48px;height:48px;border-radius:50%;object-fit:cover;background:var(--bg3)">
            ${bnote ? `<div class="isim-ig-note">${esc(bnote)}</div>` : ''}
          </div>
          <div class="isim-thread-info">
            <div class="isim-thread-name">${esc(f.name)}</div>
            <div class="isim-thread-preview">${esc(preview)}</div>
          </div>
          <span class="isim-thread-time">${last?.time||''}</span>
        </div>`;
    }).join('');
}

window.__isimOpenChat = function(fid) {
    const f = cfg().friends.find(x => x.id === fid);
    if (!f) return;
    activeFriend = f;
    window.__isimNav('chat');
    renderChat();
};

// ---- Chat ----
function renderChat() {
    if (!activeFriend) return;
    const f = activeFriend;
    const av = document.getElementById('isim-chat-av');
    if (av) { av.src = f.avatar||''; av.onerror = () => av.style.visibility='hidden'; }
    document.getElementById('isim-chat-name').textContent = f.name;
    document.getElementById('isim-chat-ttl').textContent = f.name;
    document.getElementById('isim-note-ta').value = cfg().notes[f.id] || '';
    loadHistory();
    applyWallpaper();
    pendingMsgs = [];
    updatePendingBadge();
}

function loadHistory() {
    const msgs = document.getElementById('isim-msgs');
    if (!msgs) return;
    msgs.innerHTML = '';
    const hist = cfg().history[activeFriend?.id] || [];
    if (!hist.length) msgs.innerHTML = '<div class="isim-sys">Start chatting</div>';
    else hist.forEach(m => appendBubble(m, false));
    msgs.scrollTop = msgs.scrollHeight;
}

function appendBubble(msg, scroll=true) {
    const msgs = document.getElementById('isim-msgs');
    if (!msgs) return;
    const dir = msg.from === 'user' ? 'out' : 'in';
    const av = dir === 'in' ? `<img class="isim-av" src="${esc(activeFriend?.avatar||'')}" alt="" onerror="this.style.visibility='hidden'">` : '';
    let inner = '';
    if (msg.type === 'sticker') inner = `<img src="${esc(msg.content)}" style="max-width:90px;border-radius:8px;display:block">`;
    else if (msg.type === 'photo') inner = `<img src="${esc(msg.content)}" style="max-width:160px;border-radius:12px;display:block">`;
    else if (msg.type === 'location') inner = `📍 ${esc(msg.content)}`;
    else if (msg.type === 'redenv') {
        const c = typeof msg.content === 'object' ? msg.content : {amount:msg.content,note:''};
        inner = `<div style="text-align:center">🧧<br><b style="font-size:17px">${esc(c.amount)} บาท</b>${c.note?`<br><span style="font-size:11px;opacity:.7">${esc(c.note)}</span>`:''}`;
    } else inner = esc(msg.content||'');
    msgs.insertAdjacentHTML('beforeend', `<div class="isim-row ${dir}">${av}<div class="isim-wrap2"><div class="isim-bub">${inner}</div><span class="isim-t">${esc(msg.time||'')}</span></div></div>`);
    if (scroll) msgs.scrollTop = msgs.scrollHeight;
}

function saveMsg(msg) {
    const fid = activeFriend?.id; if (!fid) return;
    const h = cfg().history; if (!h[fid]) h[fid] = [];
    h[fid].push(msg); if (h[fid].length > 80) h[fid] = h[fid].slice(-80);
    save();
}

function updatePendingBadge() {
    const b = document.getElementById('isim-pending-badge');
    if (!b) return;
    if (pendingMsgs.length > 0) { b.textContent = pendingMsgs.length; b.classList.add('on'); }
    else b.classList.remove('on');
}

// Send 1 = queue message (user side only, bot doesn't reply yet)
window.__isimSend1 = function() {
    if (!activeFriend) { toast('Select a contact first'); return; }
    const inp = document.getElementById('isim-inp');
    const text = inp.value.trim(); if (!text) return;
    inp.value = ''; inp.style.height = 'auto';
    const msg = { from:'user', content:text, time:now() };
    appendBubble(msg); saveMsg(msg);
    pendingMsgs.push(msg);
    updatePendingBadge();
};

// Send 2 = confirm all pending → bot replies
window.__isimSend2 = async function() {
    if (!activeFriend) { toast('Select a contact first'); return; }
    // ส่งข้อความที่พิมพ์ค้างอยู่ก่อน
    const inp = document.getElementById('isim-inp');
    const leftover = inp.value.trim();
    if (leftover) {
        inp.value = ''; inp.style.height = 'auto';
        const msg = { from:'user', content:leftover, time:now() };
        appendBubble(msg); saveMsg(msg);
        pendingMsgs.push(msg);
    }
    pendingMsgs = [];
    updatePendingBadge();
    await botReply();
};

window.__isimNudge = window.__isimSend2; // alias

// ---- Bot Reply (ST generateQuietPrompt) ----
async function botReply(extraContext='') {
    if (!activeFriend || isTyping) return;
    isTyping = true;

    const msgs = document.getElementById('isim-msgs');
    const tr = document.createElement('div');
    tr.className = 'isim-row in'; tr.id = 'isim-typing-row';
    tr.innerHTML = `<img class="isim-av" src="${esc(activeFriend.avatar||'')}" alt="" onerror="this.style.visibility='hidden'"><div class="isim-dots"><span></span><span></span><span></span></div>`;
    if (msgs) { msgs.appendChild(tr); msgs.scrollTop = msgs.scrollHeight; }

    try {
        const f = activeFriend; const s = cfg();
        const pname = playerName();
        const hist = (s.history[f.id]||[]).slice(-12)
            .map(m => `${m.from==='user'?pname:f.name}: ${m.content}`).join('\n');

        const prompt = `[iPhone SMS — ${f.name} replying to ${pname}]
Character: ${f.name}. ${f.persona||''}
${s.notes[f.id] ? 'Context: '+s.notes[f.id] : ''}
${s.botnotes[f.id] ? 'Instruction: '+s.botnotes[f.id] : ''}
${extraContext}

Chat:
${hist}
${f.name}:`;

        const ctx = SillyTavern.getContext();
        let reply = '';
        if (typeof ctx.generateQuietPrompt === 'function') {
            reply = await ctx.generateQuietPrompt(prompt, false, false);
        } else if (typeof window.generateQuietPrompt === 'function') {
            reply = await window.generateQuietPrompt(prompt, false, false);
        } else throw new Error('No generateQuietPrompt');

        reply = String(reply||'').trim().replace(new RegExp('^'+f.name+':\\s*'),'');
        if (!reply) reply = '...';

        tr.remove(); isTyping = false;
        const botMsg = { from:'bot', content:reply, time:now() };
        appendBubble(botMsg); saveMsg(botMsg);
        renderMsgList();
        if (callActive) showCallFloat(reply);

        // update bot's IG note occasionally
        if (Math.random() < 0.3) {
            const words = reply.split(' ').slice(0,5).join(' ');
            cfg().chatnotes[f.id] = words;
            save();
            renderMsgList();
        }
    } catch(e) {
        tr.remove(); isTyping = false;
        console.error('[iPhone-Sim]', e);
        toast('Bot error: ' + (e.message||'failed'));
    }
}

window.__isimRetry = function() {
    const fid = activeFriend?.id; if (!fid) return;
    const h = cfg().history;
    while (h[fid]?.length && h[fid][h[fid].length-1].from==='bot') h[fid].pop();
    save(); loadHistory();
    const last = [...(h[fid]||[])].reverse().find(m=>m.from==='user');
    botReply(last ? 'User said: '+last.content : '');
};

window.__isimCancelBot = function() {
    if (isTyping) { isTyping=false; document.getElementById('isim-typing-row')?.remove(); toast('Cancelled'); return; }
    const fid = activeFriend?.id; if (!fid) return;
    const h = cfg().history;
    if (h[fid]?.length && h[fid][h[fid].length-1].from==='bot') {
        h[fid].pop(); save();
        document.getElementById('isim-msgs')?.lastElementChild?.remove();
        toast('Removed last message');
    }
};

window.__isimToggleNote = function() { document.getElementById('isim-notepanel')?.classList.toggle('on'); };
window.__isimSaveNote = function() {
    const fid = activeFriend?.id; if (!fid) return;
    const text = document.getElementById('isim-note-ta')?.value.trim()||'';
    const old = cfg().notes[fid];
    cfg().notes[fid] = text; save();
    document.getElementById('isim-notepanel')?.classList.remove('on');
    toast('Note saved');
    if (text && old!==text) setTimeout(()=>botReply('[User updated note: "'+text+'"]'),500);
};

// ---- Sticker / Plus ----
window.__isimToggleStray = function() {
    const t = document.getElementById('isim-stray');
    if (!t) return;
    const on = t.classList.toggle('on');
    if (on) { renderStickerTray(); document.getElementById('isim-ptray')?.classList.remove('on'); }
};
window.__isimTogglePlus = function() {
    const p = document.getElementById('isim-ptray');
    if (!p) return;
    p.classList.toggle('on');
    document.getElementById('isim-stray')?.classList.remove('on');
};

function renderStickerTray() {
    const t = document.getElementById('isim-stray'); if (!t) return;
    const stk = cfg().stickers||[];
    t.innerHTML = stk.map((s,i)=>
        `<img class="isim-stk" src="${esc(s)}" onclick="window.__isimSendSticker(${i})" onerror="this.style.display='none'">`
    ).join('') + `<button class="isim-stk-add" onclick="document.getElementById('isim-stk-inp').click()">+</button>`;
}

window.__isimSendSticker = function(idx) {
    if (!activeFriend) return;
    const s = (cfg().stickers||[])[idx]; if (!s) return;
    document.getElementById('isim-stray')?.classList.remove('on');
    const msg = { from:'user', type:'sticker', content:s, time:now() };
    appendBubble(msg); saveMsg(msg);
    pendingMsgs.push(msg); updatePendingBadge();
};

window.__isimAddSticker = function(inp) {
    const f = inp.files[0]; if (!f) return;
    new FileReader().onload = e => {
        cfg().stickers.push(e.target.result); save(); renderStickerTray(); toast('Sticker added!');
    };
    new FileReader().readAsDataURL(f); inp.value='';
    // Fix: use single reader
    const r = new FileReader();
    r.onload = e => { cfg().stickers.push(e.target.result); save(); renderStickerTray(); toast('Sticker added!'); };
    r.readAsDataURL(f); inp.value='';
};

window.__isimSendPhoto = function(inp) {
    const f = inp.files[0]; if (!f||!activeFriend) return;
    const r = new FileReader();
    r.onload = e => {
        const msg = { from:'user', type:'photo', content:e.target.result, time:now() };
        appendBubble(msg); saveMsg(msg);
        pendingMsgs.push(msg); updatePendingBadge();
        document.getElementById('isim-ptray')?.classList.remove('on');
    };
    r.readAsDataURL(f); inp.value='';
};

window.__isimSendLocation = function() {
    document.getElementById('isim-ptray')?.classList.remove('on');
    if (!activeFriend) return;
    const send = loc => {
        const msg = { from:'user', type:'location', content:loc, time:now() };
        appendBubble(msg); saveMsg(msg); pendingMsgs.push(msg); updatePendingBadge();
    };
    navigator.geolocation
        ? navigator.geolocation.getCurrentPosition(p=>send(`${p.coords.latitude.toFixed(4)},${p.coords.longitude.toFixed(4)}`),()=>send('Bangkok, Thailand'))
        : send('Bangkok, Thailand');
};

window.__isimOpenRedEnv = function() { document.getElementById('isim-ptray')?.classList.remove('on'); document.getElementById('isim-redenv')?.classList.add('on'); };
window.__isimCloseRedEnv = function() { document.getElementById('isim-redenv')?.classList.remove('on'); };
window.__isimSendRedEnv = function() {
    const amt = document.getElementById('isim-re-amt')?.value;
    const note = document.getElementById('isim-re-note')?.value||'';
    if (!amt||Number(amt)<=0) { toast('Please enter amount'); return; }
    if (!activeFriend) return;
    window.__isimCloseRedEnv();
    document.getElementById('isim-re-amt').value=''; document.getElementById('isim-re-note').value='';
    const msg = { from:'user', type:'redenv', content:{amount:amt,note}, time:now() };
    appendBubble(msg); saveMsg(msg); pendingMsgs.push(msg); updatePendingBadge();
};

// ---- Wallpaper ----
function applyWallpaper() {
    const msgs = document.getElementById('isim-msgs'); if (!msgs) return;
    const fid = activeFriend?.id;
    const wp = fid ? (cfg().wallpapers[fid]||'') : '';
    msgs.style.backgroundImage = wp ? `url(${wp})` : ''; msgs.style.backgroundSize = wp?'cover':'';
}
window.__isimPickBg = () => document.getElementById('isim-chat-bg-inp')?.click();
window.__isimSetChatBg = function(inp) {
    const f = inp.files[0]; if (!f) return;
    const fid = activeFriend?.id; if (!fid) { toast('Open a chat first'); return; }
    const r = new FileReader();
    r.onload = e => { cfg().wallpapers[fid]=e.target.result; save(); applyWallpaper(); toast('Wallpaper set!'); };
    r.readAsDataURL(f); inp.value='';
};
window.__isimSetBg = window.__isimSetChatBg; // settings alias
window.__isimRemoveBg = function() {
    const fid = activeFriend?.id; if (!fid) return;
    cfg().wallpapers[fid]=''; save(); applyWallpaper(); toast('Removed');
};

// ---- Settings data ----
window.__isimResetChat = function() {
    const fid = activeFriend?.id;
    if (!confirm(fid ? 'Reset this chat?' : 'Reset all chats?')) return;
    if (fid) { cfg().history[fid]=[]; save(); loadHistory(); toast('Chat reset'); }
    else { cfg().history={}; save(); toast('All chats reset'); }
};
window.__isimClearFriends = function() {
    if (!confirm('Remove all contacts?')) return;
    cfg().friends=[]; activeFriend=null; save(); renderMsgList(); toast('Contacts removed');
};
window.__isimResetAll = function() {
    if (!confirm('Reset everything?')) return;
    localStorage.removeItem(LS); _cfg=null; activeFriend=null; toast('Done — please refresh');
};

// ---- Contacts (load from ST) ----
function loadContacts() {
    const list = document.getElementById('isim-contacts-list'); if (!list) return;
    list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--txt3);font-size:13px">Loading...</div>';
    let bots = [];
    try {
        const ctx = SillyTavern.getContext();
        if (ctx?.characters?.length) {
            bots = ctx.characters.filter(c=>!c.isUser).map(c=>({
                id: c.avatar||c.name, name:c.name,
                avatar: c.avatar?`/characters/${c.avatar}`:'',
                persona: c.description||c.personality||'',
            }));
        }
    } catch {}
    if (!bots.length) bots = [{id:'demo1',name:'Alex',avatar:'',persona:'A friendly person.'},{id:'demo2',name:'Sam',avatar:'',persona:'Cool and chill.'}];
    list._bots = bots;
    renderContactsList(bots);
}

function renderContactsList(bots) {
    const list = document.getElementById('isim-contacts-list'); if (!list) return;
    const added = new Set((cfg().friends||[]).map(f=>f.id));
    list.innerHTML = bots.map(b => `
      <div class="isim-fr-row">
        <img class="isim-fr-av" src="${esc(b.avatar)}" alt="" onerror="this.style.visibility='hidden'">
        <div class="isim-fr-info">
          <div class="isim-fr-name">${esc(b.name)}</div>
          <div class="isim-fr-bio">${esc((b.persona||'').substring(0,50))}</div>
        </div>
        ${added.has(b.id)
            ? `<span class="isim-fr-added">✓ Added</span>`
            : `<button class="isim-fr-add" onclick="window.__isimAddContact('${esc(b.id)}')">Add</button>`}
      </div>`).join('');
}

window.__isimFilterContacts = function(q) {
    const list = document.getElementById('isim-contacts-list'); if (!list||!list._bots) return;
    renderContactsList(list._bots.filter(b=>b.name.toLowerCase().includes(q.toLowerCase())));
};

window.__isimAddContact = function(id) {
    const list = document.getElementById('isim-contacts-list');
    const bot = list?._bots?.find(b=>b.id===id); if (!bot) return;
    if (!cfg().friends.find(f=>f.id===id)) {
        cfg().friends.push(bot); save(); toast(`${bot.name} added`);
        renderContactsList(list._bots);
        renderMsgList();
    }
};

// ---- Profile ----
function loadProfile() {
    const pname = document.getElementById('isim-profile-name');
    const pav = document.getElementById('isim-profile-av');
    const ta = document.getElementById('isim-my-note-ta');
    const name = playerName();
    if (pname) pname.textContent = name;
    if (ta) ta.value = cfg().myNote||'';
    try {
        const ctx = SillyTavern.getContext();
        if (ctx?.user_avatar && pav) pav.src = `/User Avatars/${ctx.user_avatar}`;
    } catch {}
}

window.__isimSaveMyNote = function() {
    cfg().myNote = document.getElementById('isim-my-note-ta')?.value.trim()||'';
    save(); toast('Note saved!');
};

// ---- Call ----
window.__isimStartCall = function() {
    if (!activeFriend) { toast('Select a contact first'); return; }
    const f = activeFriend;
    document.getElementById('isim-cbg').style.backgroundImage = `url(${f.avatar||''})`;
    document.getElementById('isim-cav').src = f.avatar||'';
    document.getElementById('isim-cname').textContent = f.name;
    document.getElementById('isim-cstat').textContent = 'Calling...';
    document.getElementById('isim-cdur').textContent = '0:00';
    document.getElementById('isim-cfloat').innerHTML = '';
    document.getElementById('isim-call-wait').textContent = '';
    document.getElementById('isim-call').classList.add('on');
    callActive=true; callTimer=0;
    const startTime = now();
    sysMsg(`📞 Calling ${f.name}... ${startTime}`);
    setTimeout(()=>{
        if (!callActive) return;
        document.getElementById('isim-cstat').textContent = 'Connected';
        sysMsg(`✅ Connected to ${f.name}`);
        callInterval = setInterval(()=>{
            callTimer++;
            const m=Math.floor(callTimer/60),s=callTimer%60;
            document.getElementById('isim-cdur').textContent = `${m}:${String(s).padStart(2,'0')}`;
        },1000);
        showCallFloat('Hello, I picked up.');
    },1500);
};

window.__isimEndCall = function() {
    callActive=false; clearInterval(callInterval);
    document.getElementById('isim-call').classList.remove('on');
    const m=Math.floor(callTimer/60),s=callTimer%60;
    sysMsg(`📵 Call ended — ${m}:${String(s).padStart(2,'0')} — ${now()}`);
    toast('Call ended');
};

window.__isimMute = function() {
    callMuted=!callMuted;
    document.getElementById('isim-mute-bg')?.classList.toggle('on',callMuted);
    toast(callMuted?'Muted':'Unmuted');
};

window.__isimCallSend = async function() {
    const inp = document.getElementById('isim-cinp');
    const text = inp.value.trim(); if (!text||!activeFriend) return;
    inp.value='';
    showCallFloat(text, true);
    const wait = document.getElementById('isim-call-wait');
    if (wait) wait.textContent = '...';
    try {
        const ctx = SillyTavern.getContext();
        const prompt = `[Phone call]\nYou are ${activeFriend.name}. ${activeFriend.persona||''}\nReply in 1-2 short sentences, no emojis, casual phone tone.\n${activeFriend.name}:`;
        let reply = '';
        if (typeof ctx.generateQuietPrompt==='function') reply = await ctx.generateQuietPrompt(prompt+'\n'+playerName()+': '+text+'\n'+activeFriend.name+':', false, false);
        reply = String(reply||'').trim().replace(new RegExp('^'+activeFriend.name+':\\s*'),'');
        if (wait) wait.textContent = '';
        if (callActive) showCallFloat(reply||'...');
    } catch(e) { if (wait) wait.textContent=''; }
};

function showCallFloat(text, isUser=false) {
    const c = document.getElementById('isim-cfloat'); if (!c) return;
    c.innerHTML = '';
    const words = text.split(' ');
    // ความเร็วปรับตามความยาว
    const wpm = Math.max(100, 300 - words.length * 8);
    let delay = 0;
    words.forEach(w => {
        const s = document.createElement('span');
        s.className = 'ifw';
        s.style.animationDelay = delay + 'ms';
        if (isUser) s.style.opacity = '0.45';
        s.textContent = w + ' ';
        c.appendChild(s);
        delay += wpm;
    });
    setTimeout(()=>{ if(callActive) c.innerHTML=''; }, delay + 2500);
}

// ---- Twitter ----
function getTweets() {
    if (!cfg().tweets?.length) {
        cfg().tweets = [
            {id:1,from:'bot',author:'Alex',handle:'@alex',text:'สวัสดีทุกคน วันนี้อากาศดีมาก',likes:8,reposts:2,views:120,liked:false,reposted:false,time:'9:00'},
        ];
        cfg().tweetId=2; save();
    }
    return cfg().tweets;
}

function renderTwFeed() {
    const list = document.getElementById('isim-tw-list'); if (!list) return;
    const tweets = getTweets();
    list.innerHTML = [...tweets].reverse().map(tw => buildTweetHTML(tw)).join('');
    const pname = playerName();
    document.getElementById('isim-tw-pname').textContent = pname;
    document.getElementById('isim-tw-phandle').textContent = '@'+pname.toLowerCase().replace(/\s+/g,'_');
}

function buildTweetHTML(tw) {
    return `<div class="isim-tweet" data-tid="${tw.id}">
      <div class="isim-tweet-av" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:18px">${tw.from==='user'?'👤':'🤖'}</div>
      <div class="isim-tweet-body">
        <div class="isim-tweet-top">
          <span class="isim-tweet-name">${esc(tw.author)}</span>
          <span class="isim-tweet-handle">${esc(tw.handle)}</span>
          <span class="isim-tweet-time">${esc(tw.time)}</span>
        </div>
        <div class="isim-tweet-text">${esc(tw.text)}</div>
        <div class="isim-tweet-acts">
          <button class="isim-tact ${tw.liked?'liked':''}" onclick="window.__isimTwLike(${tw.id},this)">♥ ${tw.likes}</button>
          <button class="isim-tact ${tw.reposted?'rted':''}" onclick="window.__isimTwRt(${tw.id},this)">⟳ ${tw.reposts}</button>
          <span>👁 ${tw.views}</span>
        </div>
      </div>
    </div>`;
}

window.__isimTwTab = function(tab, el) {
    document.querySelectorAll('.isim-tw-tab').forEach(t=>t.classList.remove('on'));
    document.querySelectorAll('.isim-tw-pg').forEach(p=>p.classList.remove('on'));
    el?.classList.add('on');
    document.getElementById('isim-tw-'+tab)?.classList.add('on');
    if (tab==='trends') renderTwTrends();
    if (tab==='profile') renderTwProfile();
};

document.addEventListener('input', e => {
    if (e.target?.id==='isim-tw-input') {
        document.getElementById('isim-tw-post').disabled = !e.target.value.trim();
    }
});

window.__isimTwPost = async function() {
    const inp = document.getElementById('isim-tw-input');
    const text = inp.value.trim(); if (!text) return;
    const pname = playerName();
    const tw = { id:cfg().tweetId++, from:'user', author:pname, handle:'@'+pname.toLowerCase().replace(/\s+/g,'_'), text, likes:0, reposts:0, views:1, liked:false, reposted:false, time:now() };
    cfg().tweets.push(tw); save();
    inp.value=''; document.getElementById('isim-tw-post').disabled=true;
    renderTwFeed(); toast('Posted!');
    setTimeout(()=>botTweet(tw),3000);
};

async function botTweet(tw) {
    const friends = cfg().friends; if (!friends.length) return;
    const bot = friends[Math.floor(Math.random()*friends.length)];
    try {
        const ctx = SillyTavern.getContext();
        const prompt = `You are ${bot.name}. Reply to this tweet in Thai, 1 short sentence, no emojis:\nTweet: "${tw.text}"\n${bot.name}:`;
        let reply = '';
        if (typeof ctx.generateQuietPrompt==='function') reply = await ctx.generateQuietPrompt(prompt,false,false);
        reply = String(reply||'').trim().replace(new RegExp('^'+bot.name+':\\s*'),'');
        if (!reply) return;
        const rt = { id:cfg().tweetId++, from:'bot', author:bot.name, handle:'@'+bot.name.toLowerCase().replace(/\s+/g,'_'), text:reply, likes:0, reposts:0, views:5, liked:false, reposted:false, time:now() };
        cfg().tweets.push(rt); save(); renderTwFeed();
    } catch {}
}

window.__isimTwLike = function(id, el) {
    const tw = cfg().tweets.find(t=>t.id===id); if (!tw) return;
    tw.liked=!tw.liked; tw.likes+=tw.liked?1:-1; save();
    el.className='isim-tact'+(tw.liked?' liked':'');
    el.textContent='♥ '+tw.likes;
};
window.__isimTwRt = function(id, el) {
    const tw = cfg().tweets.find(t=>t.id===id); if (!tw) return;
    tw.reposted=!tw.reposted; tw.reposts+=tw.reposted?1:-1; save();
    el.className='isim-tact'+(tw.reposted?' rted':'');
    el.textContent='⟳ '+tw.reposts;
    if (tw.reposted) toast('Reposted');
};

function renderTwTrends() {
    const trends = ['#SillyTavern','#AI','#ภาษาไทย','#มือถือ','#แชทบอท','#โปรแกรม'];
    document.getElementById('isim-tw-trends-list').innerHTML = trends.map((t,i)=>
        `<div style="padding:12px 16px;border-bottom:.5px solid var(--sep)"><div style="font-size:11px;color:var(--txt3)">Trending #${i+1}</div><div style="font-size:15px;font-weight:700;color:var(--txt)">${t}</div></div>`
    ).join('');
}

function renderTwProfile() {
    const my = (cfg().tweets||[]).filter(t=>t.from==='user');
    document.getElementById('isim-tw-mytweets').innerHTML = my.length
        ? [...my].reverse().map(buildTweetHTML).join('')
        : '<div style="padding:20px;text-align:center;color:var(--txt3);font-size:13px">No posts yet</div>';
}

// ---- Input auto-resize ----
function bindInputs() {
    const inp = document.getElementById('isim-inp');
    if (inp) {
        inp.addEventListener('input', function() { this.style.height='auto'; this.style.height=Math.min(this.scrollHeight,80)+'px'; });
        inp.addEventListener('keydown', e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();window.__isimSend1();} });
    }
    const cinp = document.getElementById('isim-cinp');
    if (cinp) cinp.addEventListener('keydown', e=>{ if(e.key==='Enter') window.__isimCallSend(); });
}

// ---- ST Extensions Panel ----
function loadSettings() {
    $('.isim-st-panel').remove();
    $('#extensions_settings').append(`
    <div class="isim-st-panel">
      <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
          <b>📱 iPhone Simulator</b>
          <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
          <div class="styled_description_block">Open via ✨ wand menu → iPhone Simulator</div>
          <hr><small style="color:#888">v2.0.0</small>
        </div>
      </div>
    </div>`);
}

// ---- Wand menu injection ----
function injectWandBtn() {
    if (document.getElementById('isim-wand-btn')) return;
    const menu = document.getElementById('extensionsMenu'); if (!menu) return;
    const li = document.createElement('li');
    li.id = 'isim-wand-btn';
    li.style.cssText = 'cursor:pointer;padding:7px 16px;display:flex;align-items:center;gap:8px;font-size:14px;';
    li.innerHTML = '<span style="font-size:15px">📱</span><span>iPhone Simulator</span>';
    li.addEventListener('click', () => { menu.classList.remove('show'); openPhone(); });
    menu.insertBefore(li, menu.firstChild);
}

// ============================================================
// BOOTSTRAP
// ============================================================
jQuery(async () => {
    injectCSS();
    injectHTML();
    loadSettings();
    setTimeout(() => {
        bindInputs();
        document.getElementById('isim-home')?.classList.remove('off');
        startClock();
        const f = cfg().friends;
        if (f.length) activeFriend = f[0];
        injectWandBtn();
        // watch for wand menu opening
        document.addEventListener('click', e => {
            if (e.target?.closest?.('.fa-magic,.fa-wand-magic-sparkles,#extensionsMenuButton,[data-i18n="Extensions Menu"]')) {
                setTimeout(injectWandBtn, 80);
            }
        });
        // MutationObserver fallback
        if (!document.getElementById('isim-wand-btn')) {
            const obs = new MutationObserver(() => { injectWandBtn(); if(document.getElementById('isim-wand-btn')) obs.disconnect(); });
            obs.observe(document.body, {childList:true, subtree:true});
            setTimeout(()=>obs.disconnect(), 15000);
        }
    }, 300);
    console.log('[iPhone-Sim] v2.0.0 ready');
});
