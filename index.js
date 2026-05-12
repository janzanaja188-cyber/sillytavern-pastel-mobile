// iPhone Simulator Extension for SillyTavern
// Pattern: IIFE (เหมือน phone-mode ที่ใช้งานได้จริง)
// ไม่มี import, inject CSS ใน JS, ปุ่มลอย -> เด้งเข้ามือถือเลย

const extensionName = 'iphone-simulator';

// ---- Settings (localStorage) ----
const LS = 'isim_v1';
const DEF = {
    theme: 'dark',
    accent: '#0a84ff',
    friends: [],
    history: {},
    notes: {},
    botnotes: {},
};
let _cfg = null;
function cfg() {
    if (_cfg) return _cfg;
    try { _cfg = Object.assign({}, DEF, JSON.parse(localStorage.getItem(LS) || '{}')); }
    catch { _cfg = Object.assign({}, DEF); }
    return _cfg;
}
function save() {
    try { localStorage.setItem(LS, JSON.stringify(_cfg || cfg())); } catch {}
}

// ---- State ----
let phoneOpen = false;
let activeFriend = null;
let isTyping = false;
let callActive = false;
let callTimer = 0;
let callInterval = null;
let callMuted = false;
let currentScreen = 'home'; // home | chat | friends | settings

// ---- Inject CSS ----
function injectCSS() {
    if (document.getElementById('isim-css')) return;
    const s = document.createElement('style');
    s.id = 'isim-css';
    s.textContent = `
/* FAB */
#isim-fab{
    position:fixed !important;bottom:80px !important;right:16px !important;
    width:52px !important;height:52px !important;border-radius:50% !important;
    background:linear-gradient(145deg,#1c1c1e,#3a3a3c) !important;
    border:none !important;cursor:pointer !important;z-index:2147483647 !important;
    box-shadow:0 4px 20px rgba(0,0,0,.7) !important;
    display:flex !important;align-items:center !important;justify-content:center !important;
    transition:transform .2s !important;padding:0 !important;margin:0 !important;
    color:#fff !important;font-size:22px !important;
}
#isim-fab:hover{transform:scale(1.1) !important;}

/* Phone screen — เต็มจอ fixed เหมือน phone-mode */
#isim-phone{
    position:fixed !important;
    top:0 !important;left:0 !important;right:0 !important;bottom:0 !important;
    z-index:2147483646 !important;
    display:none !important;
    align-items:center !important;
    justify-content:center !important;
    background:rgba(0,0,0,.75) !important;
    backdrop-filter:blur(8px) !important;
}
#isim-phone.open{display:flex !important;}

/* iPhone frame */
#isim-frame{
    width:375px;
    height:812px;
    max-height:95vh;
    border-radius:50px;
    border:8px solid #1c1c1e;
    box-shadow:0 0 0 2px #3a3a3c,0 30px 80px rgba(0,0,0,.9);
    overflow:hidden;
    display:flex;
    flex-direction:column;
    position:relative;
    font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;
}
#isim-frame.dark{
    --bg:#000;--bg2:#1c1c1e;--bg3:#2c2c2e;
    --txt:#fff;--txt2:rgba(235,235,245,.6);--txt3:rgba(235,235,245,.3);
    --sep:#38383a;--bub-out:#0a84ff;--bub-in:#1c1c1e;--inp:#1c1c1e;
    --accent:#0a84ff;
}
#isim-frame.light{
    --bg:#f2f2f7;--bg2:#fff;--bg3:#e5e5ea;
    --txt:#000;--txt2:rgba(60,60,67,.6);--txt3:rgba(60,60,67,.3);
    --sep:#c6c6c8;--bub-out:#0a84ff;--bub-in:#e5e5ea;--inp:#fff;
    --accent:#0a84ff;
}

/* Dynamic Island */
#isim-island{
    position:absolute;top:12px;left:50%;transform:translateX(-50%);
    width:120px;height:34px;background:#000;border-radius:20px;z-index:10;
}

/* Status bar */
#isim-sb{
    background:var(--bg);height:52px;display:flex;
    align-items:flex-end;justify-content:space-between;
    padding:0 28px 8px;flex-shrink:0;
}
#isim-sb-time{font-size:15px;font-weight:600;color:var(--txt);}
#isim-sb-icons{font-size:13px;color:var(--txt);display:flex;gap:4px;}

/* Close button (ปุ่มปิดมือถือ) */
#isim-closebtn{
    position:absolute;top:14px;right:14px;z-index:20;
    width:32px;height:32px;border-radius:50%;border:none;
    background:rgba(255,255,255,.15);color:#fff;font-size:16px;
    cursor:pointer;display:flex;align-items:center;justify-content:center;
    line-height:1;padding:0;
}
#isim-closebtn:hover{background:rgba(255,59,48,.8);}

/* Screen container */
#isim-screen{flex:1;overflow:hidden;position:relative;background:var(--bg);}

/* Home screen */
#isim-home{
    position:absolute;inset:0;
    background:linear-gradient(180deg,#1a1a2e,#16213e,#0f3460);
    display:flex;flex-direction:column;
}
#isim-home-time-big{font-size:68px;font-weight:200;color:#fff;text-align:center;padding-top:20px;letter-spacing:-2px;}
#isim-home-date{font-size:15px;color:rgba(255,255,255,.7);text-align:center;margin-top:-6px;}
.isim-dock{
    display:grid;grid-template-columns:repeat(4,1fr);gap:14px;
    padding:20px 20px;margin-top:auto;
}
.isim-app-btn{
    display:flex;flex-direction:column;align-items:center;gap:5px;
    cursor:pointer;background:none;border:none;
}
.isim-app-btn:active .isim-icon{transform:scale(.88);}
.isim-icon{
    width:60px;height:60px;border-radius:16px;
    display:flex;align-items:center;justify-content:center;font-size:26px;
}
.isim-app-label{font-size:11px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.5);}
.ic-msg{background:linear-gradient(145deg,#34c759,#30d158);}
.ic-ppl{background:linear-gradient(145deg,#ff9f0a,#e65c00);}
.ic-set{background:linear-gradient(145deg,#636366,#48484a);}
.ic-call{background:linear-gradient(145deg,#30d158,#248a3d);}
.isim-bar{height:5px;width:130px;background:rgba(255,255,255,.3);border-radius:3px;margin:10px auto;}

/* Generic screen */
.isim-screen{position:absolute;inset:0;display:none;flex-direction:column;background:var(--bg);}
.isim-screen.show{display:flex;}

/* Nav bar */
.isim-nav{
    height:44px;background:var(--bg2);
    border-bottom:0.5px solid var(--sep);
    display:flex;align-items:center;padding:0 12px;flex-shrink:0;
}
.isim-nav-back{
    background:none;border:none;color:var(--accent);
    font-size:15px;cursor:pointer;padding:4px 8px 4px 0;
    display:flex;align-items:center;gap:3px;
}
.isim-nav-title{flex:1;text-align:center;font-size:17px;font-weight:600;color:var(--txt);}
.isim-nav-action{background:none;border:none;color:var(--accent);font-size:14px;cursor:pointer;padding:4px;}

/* Chat screen */
#isim-chat-header{
    padding:10px 14px;background:var(--bg2);
    border-bottom:0.5px solid var(--sep);
    display:flex;align-items:center;gap:10px;flex-shrink:0;
}
.isim-chat-av{width:36px;height:36px;border-radius:50%;background:var(--bg3);object-fit:cover;flex-shrink:0;}
.isim-chat-info{flex:1;}
.isim-chat-name{font-size:15px;font-weight:600;color:var(--txt);}
.isim-chat-status{font-size:11px;color:var(--accent);}
.isim-chat-tools{display:flex;gap:4px;}
.isim-tool-btn{
    background:var(--bg3);border:none;border-radius:10px;
    padding:4px 8px;font-size:11px;color:var(--txt2);cursor:pointer;
}

/* Messages list */
#isim-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:3px;}
.isim-sys{text-align:center;font-size:11px;color:var(--txt3);padding:6px 0;}
.isim-row{display:flex;align-items:flex-end;gap:6px;max-width:82%;}
.isim-row.out{align-self:flex-end;flex-direction:row-reverse;}
.isim-row.in{align-self:flex-start;}
.isim-av{width:26px;height:26px;border-radius:50%;background:var(--bg3);flex-shrink:0;object-fit:cover;}
.isim-wrap{display:flex;flex-direction:column;gap:2px;}
.isim-bub{
    padding:8px 12px;border-radius:18px;
    font-size:14px;line-height:1.45;word-break:break-word;
    font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;
}
.isim-row.in .isim-bub{background:var(--bub-in);color:var(--txt);border-bottom-left-radius:4px;}
.isim-row.out .isim-bub{background:var(--bub-out);color:#fff;border-bottom-right-radius:4px;}
.isim-time{font-size:10px;color:var(--txt3);padding:0 2px;}
.isim-typing{display:flex;gap:4px;padding:10px 14px;background:var(--bub-in);border-radius:18px;border-bottom-left-radius:4px;}
.isim-typing span{width:7px;height:7px;border-radius:50%;background:var(--txt3);animation:ibounce .9s infinite;}
.isim-typing span:nth-child(2){animation-delay:.15s;}
.isim-typing span:nth-child(3){animation-delay:.3s;}
@keyframes ibounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}

/* Input bar */
#isim-inputbar{
    background:var(--bg2);border-top:0.5px solid var(--sep);
    padding:8px 12px;display:flex;gap:8px;align-items:flex-end;flex-shrink:0;
}
#isim-input{
    flex:1;background:var(--inp);border:0.5px solid var(--sep);
    border-radius:18px;padding:8px 14px;font-size:14px;color:var(--txt);
    resize:none;line-height:1.4;max-height:90px;overflow-y:auto;
    font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;
}
#isim-input::placeholder{color:var(--txt3);}
#isim-sendbtn{
    width:34px;height:34px;border-radius:50%;border:none;
    background:var(--accent);color:#fff;cursor:pointer;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;font-size:16px;
}
#isim-sendbtn:disabled{opacity:.35;cursor:default;}
#isim-nudgebtn{
    width:34px;height:34px;border-radius:50%;border:none;
    background:var(--bg3);color:var(--txt2);cursor:pointer;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;font-size:16px;
}

/* Friends list */
.isim-friend-row{
    display:flex;align-items:center;gap:10px;
    padding:10px 14px;border-bottom:0.5px solid var(--sep);
    cursor:pointer;
}
.isim-friend-av{width:44px;height:44px;border-radius:50%;background:var(--bg3);object-fit:cover;flex-shrink:0;}
.isim-friend-info{flex:1;min-width:0;}
.isim-friend-name{font-size:15px;font-weight:500;color:var(--txt);}
.isim-friend-bio{font-size:12px;color:var(--txt3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.isim-friend-add{
    background:var(--accent);color:#fff;border:none;
    border-radius:14px;padding:5px 14px;font-size:13px;cursor:pointer;
}

/* Settings */
.isim-set-section{margin-top:22px;}
.isim-set-header{font-size:12px;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;padding:0 16px 6px;}
.isim-set-group{background:var(--bg2);border-top:0.5px solid var(--sep);border-bottom:0.5px solid var(--sep);}
.isim-set-row{
    display:flex;align-items:center;justify-content:space-between;
    padding:12px 16px;font-size:15px;color:var(--txt);
    border-bottom:0.5px solid var(--sep);
}
.isim-set-row:last-child{border-bottom:none;}
.isim-toggle{position:relative;width:48px;height:28px;display:inline-block;}
.isim-toggle input{opacity:0;width:0;height:0;}
.isim-toggle span{position:absolute;inset:0;background:var(--bg3);border-radius:14px;cursor:pointer;transition:background .2s;}
.isim-toggle span::before{content:'';position:absolute;width:22px;height:22px;left:3px;top:3px;background:#fff;border-radius:50%;transition:transform .2s;}
.isim-toggle input:checked+span{background:var(--accent);}
.isim-toggle input:checked+span::before{transform:translateX(20px);}
.isim-swatch{width:28px;height:28px;border-radius:50%;cursor:pointer;border:2px solid transparent;}
.isim-swatch.on{border-color:var(--txt);}

/* Call screen */
#isim-call{
    position:absolute;inset:0;background:#000;
    display:none;flex-direction:column;z-index:30;
}
#isim-call.show{display:flex;}
#isim-call-bg{position:absolute;inset:0;background-size:cover;background-position:center;filter:blur(22px) brightness(.45);}
#isim-call-float{
    position:absolute;top:110px;left:10px;right:10px;
    text-align:center;z-index:2;pointer-events:none;
}
.ifl{display:inline-block;font-size:19px;font-weight:600;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.9);opacity:0;animation:ifl-in .35s forwards;}
@keyframes ifl-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.isim-call-mid{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;}
#isim-call-av{width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.25);}
#isim-call-name{font-size:26px;font-weight:600;color:#fff;}
#isim-call-stat{font-size:15px;color:rgba(255,255,255,.65);}
#isim-call-dur{font-size:18px;color:rgba(255,255,255,.75);font-variant-numeric:tabular-nums;}
.isim-call-typebar{position:relative;z-index:2;display:flex;gap:8px;padding:10px 16px;}
#isim-call-inp{
    flex:1;background:rgba(255,255,255,.12);border:none;
    border-radius:20px;padding:10px 16px;color:#fff;font-size:14px;
}
#isim-call-inp::placeholder{color:rgba(255,255,255,.4);}
#isim-call-sendbtn{
    width:38px;height:38px;border-radius:50%;border:none;
    background:var(--accent,#0a84ff);color:#fff;cursor:pointer;font-size:16px;
}
.isim-call-ctls{position:relative;z-index:2;display:flex;justify-content:center;gap:28px;padding:14px 0 28px;}
.icircle{
    display:flex;flex-direction:column;align-items:center;gap:5px;
    background:none;border:none;cursor:pointer;
}
.icircle-bg{width:62px;height:62px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:24px;}
.icircle-bg.red{background:#ff3b30;}
.icircle-bg.on{background:rgba(255,255,255,.55);}
.icircle span{font-size:11px;color:rgba(255,255,255,.65);}

/* Toast */
#isim-toast{
    position:absolute;bottom:70px;left:50%;
    transform:translateX(-50%) translateY(16px);
    background:rgba(40,40,40,.95);color:#fff;
    padding:7px 16px;border-radius:18px;font-size:13px;
    opacity:0;transition:opacity .2s,transform .2s;
    z-index:99;white-space:nowrap;pointer-events:none;
}
#isim-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}

/* Note panel */
#isim-notepanel{
    background:var(--bg2);border-bottom:0.5px solid var(--sep);
    padding:10px 14px;display:none;flex-shrink:0;
}
#isim-notepanel.show{display:block;}
#isim-noteta{
    width:100%;min-height:56px;background:var(--inp);
    border:0.5px solid var(--sep);border-radius:8px;
    padding:8px;font-size:13px;color:var(--txt);
    resize:none;box-sizing:border-box;
}
.isim-note-btns{display:flex;justify-content:flex-end;gap:6px;margin-top:6px;}
.isim-note-btns button{
    padding:5px 14px;border-radius:8px;border:none;
    cursor:pointer;font-size:13px;background:var(--bg3);color:var(--txt);
}
.isim-note-btns .prim{background:var(--accent);color:#fff;}

/* Scrollbar */
#isim-frame ::-webkit-scrollbar{width:3px;}
#isim-frame ::-webkit-scrollbar-thumb{background:var(--sep);border-radius:2px;}

/* Responsive mobile */
@media(max-width:480px){
    #isim-frame{width:100vw !important;height:100vh !important;border-radius:0 !important;border:none !important;max-height:100vh !important;}
    #isim-phone{align-items:stretch !important;justify-content:stretch !important;padding:0 !important;}
    #isim-island{display:none !important;}
    #isim-sb{height:44px !important;}
}
    `;
    document.head.appendChild(s);
}

// ---- Inject HTML ----
function injectHTML() {
    if (document.getElementById('isim-phone')) return;

    // ---- FAB: inject เข้า ST toolbar เหมือน Multiplayer ----
    const fab = document.createElement('div');
    fab.id = 'isim-fab';
    fab.innerHTML = '📱';
    fab.title = 'iPhone Simulator';
    fab.style.cssText = 'cursor:pointer;font-size:22px;padding:4px 6px;border-radius:8px;background:transparent;border:none;display:inline-flex;align-items:center;justify-content:center;';
    fab.addEventListener('click', openPhone);

    // ลอง inject เข้า ST toolbar ตาม priority เหมือน Multiplayer
    const targets = [
        '#extensionsMenu',
        '#send_but_container',
        '#leftSendForm',
        '#rightSendForm',
        '#form_sheld',
        '#options_button',
        '.extraMesButtons',
        '#data_bank_wand_container',
    ];
    let injected = false;
    for (const sel of targets) {
        const el = document.querySelector(sel);
        if (el) {
            el.prepend(fab);
            injected = true;
            console.log('[iPhone-Sim] FAB injected into', sel);
            break;
        }
    }
    if (!injected) {
        // fallback fixed ถ้าหา toolbar ไม่เจอ
        fab.style.cssText += 'position:fixed !important;bottom:80px !important;right:16px !important;z-index:2147483647 !important;background:linear-gradient(145deg,#1c1c1e,#3a3a3c) !important;border-radius:50% !important;width:52px !important;height:52px !important;font-size:22px !important;box-shadow:0 4px 20px rgba(0,0,0,.7) !important;';
        document.body.appendChild(fab);
        console.log('[iPhone-Sim] FAB injected into body (fixed fallback)');
    }

    // Phone container
    const phone = document.createElement('div');
    phone.id = 'isim-phone';
    phone.innerHTML = buildPhoneHTML();
    document.body.appendChild(phone);

    // Close on backdrop
    phone.addEventListener('click', e => { if (e.target === phone) closePhone(); });
}

function buildPhoneHTML() {
    return `
<div id="isim-frame" class="dark">
  <div id="isim-island"></div>
  <button id="isim-closebtn" onclick="window.__isimClose()">✕</button>

  <!-- Status bar -->
  <div id="isim-sb">
    <span id="isim-sb-time">9:41</span>
    <span id="isim-sb-icons">▲ WiFi ▪</span>
  </div>

  <!-- Screen -->
  <div id="isim-screen">

    <!-- HOME -->
    <div id="isim-home">
      <div id="isim-home-time-big" id="isim-big-clock">9:41</div>
      <div id="isim-home-date">Tuesday, May 12</div>
      <div style="flex:1"></div>
      <div class="isim-dock">
        <button class="isim-app-btn" onclick="window.__isimNav('chat')">
          <div class="isim-icon ic-msg">💬</div>
          <span class="isim-app-label">Messages</span>
        </button>
        <button class="isim-app-btn" onclick="window.__isimNav('friends')">
          <div class="isim-icon ic-ppl">👤</div>
          <span class="isim-app-label">Contacts</span>
        </button>
        <button class="isim-app-btn" onclick="window.__isimNav('settings')">
          <div class="isim-icon ic-set">⚙</div>
          <span class="isim-app-label">Settings</span>
        </button>
      </div>
      <div class="isim-bar"></div>
    </div>

    <!-- CHAT -->
    <div class="isim-screen" id="isim-scr-chat">
      <div class="isim-nav">
        <button class="isim-nav-back" onclick="window.__isimNav('home')">
          ‹ Back
        </button>
        <span class="isim-nav-title" id="isim-chat-title">Messages</span>
        <button class="isim-nav-action" id="isim-call-open-btn" onclick="window.__isimStartCall()" title="Call">📞</button>
      </div>
      <div id="isim-chat-header">
        <img class="isim-chat-av" id="isim-chat-av" src="" alt="">
        <div class="isim-chat-info">
          <div class="isim-chat-name" id="isim-chat-name">No contact</div>
          <div class="isim-chat-status" id="isim-chat-status">Active now</div>
        </div>
        <div class="isim-chat-tools">
          <button class="isim-tool-btn" onclick="window.__isimToggleNote()">Note</button>
          <button class="isim-tool-btn" onclick="window.__isimRetry()">Retry</button>
          <button class="isim-tool-btn" onclick="window.__isimCancelBot()">Cancel</button>
        </div>
      </div>
      <div id="isim-notepanel">
        <div style="font-size:11px;color:var(--txt3);margin-bottom:4px;">My note (bot reacts when changed)</div>
        <textarea id="isim-noteta" placeholder="Write a note..."></textarea>
        <div class="isim-note-btns">
          <button onclick="window.__isimToggleNote()">Cancel</button>
          <button class="prim" onclick="window.__isimSaveNote()">Save</button>
        </div>
      </div>
      <div id="isim-msgs"></div>
      <div id="isim-inputbar">
        <button id="isim-nudgebtn" onclick="window.__isimNudge()" title="Nudge">⤴</button>
        <textarea id="isim-input" placeholder="iMessage" rows="1"></textarea>
        <button id="isim-sendbtn" onclick="window.__isimSend()">⬆</button>
      </div>
    </div>

    <!-- FRIENDS / CONTACTS -->
    <div class="isim-screen" id="isim-scr-friends">
      <div class="isim-nav">
        <button class="isim-nav-back" onclick="window.__isimNav('home')">‹ Back</button>
        <span class="isim-nav-title">Contacts</span>
        <button class="isim-nav-action" onclick="window.__isimLoadFriends()">↺</button>
      </div>
      <input id="isim-fsearch" placeholder="Search..." style="margin:8px 12px;padding:8px 12px;border-radius:10px;border:none;background:var(--bg3);color:var(--txt);font-size:14px;box-sizing:border-box;width:calc(100%-24px);flex-shrink:0;" oninput="window.__isimFilterFriends(this.value)">
      <div id="isim-flist" style="flex:1;overflow-y:auto;"></div>
    </div>

    <!-- SETTINGS -->
    <div class="isim-screen" id="isim-scr-settings">
      <div class="isim-nav">
        <button class="isim-nav-back" onclick="window.__isimNav('home')">‹ Back</button>
        <span class="isim-nav-title">Settings</span>
      </div>
      <div style="flex:1;overflow-y:auto;">
        <div class="isim-set-section">
          <div class="isim-set-header">Appearance</div>
          <div class="isim-set-group">
            <div class="isim-set-row">
              <span>Dark Mode</span>
              <label class="isim-toggle"><input type="checkbox" id="isim-dark-toggle" onchange="window.__isimToggleDark(this.checked)"><span></span></label>
            </div>
          </div>
        </div>
        <div class="isim-set-section">
          <div class="isim-set-header">Accent Color</div>
          <div class="isim-set-group">
            <div class="isim-set-row" style="flex-wrap:wrap;gap:8px;">
              <div class="isim-swatch" data-c="#0a84ff" style="background:#0a84ff" onclick="window.__isimAccent('#0a84ff',this)"></div>
              <div class="isim-swatch" data-c="#30d158" style="background:#30d158" onclick="window.__isimAccent('#30d158',this)"></div>
              <div class="isim-swatch" data-c="#ff375f" style="background:#ff375f" onclick="window.__isimAccent('#ff375f',this)"></div>
              <div class="isim-swatch" data-c="#ff9f0a" style="background:#ff9f0a" onclick="window.__isimAccent('#ff9f0a',this)"></div>
              <div class="isim-swatch" data-c="#bf5af2" style="background:#bf5af2" onclick="window.__isimAccent('#bf5af2',this)"></div>
            </div>
          </div>
        </div>
        <div class="isim-set-section">
          <div class="isim-set-header">About</div>
          <div class="isim-set-group">
            <div class="isim-set-row"><span>Version</span><span style="color:var(--txt3)">1.2.0</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- CALL SCREEN -->
    <div id="isim-call">
      <div id="isim-call-bg"></div>
      <div id="isim-call-float"></div>
      <div class="isim-call-mid">
        <img id="isim-call-av" src="" alt="">
        <div id="isim-call-name"></div>
        <div id="isim-call-stat">Calling...</div>
        <div id="isim-call-dur">0:00</div>
      </div>
      <div class="isim-call-typebar">
        <input id="isim-call-inp" placeholder="Type during call...">
        <button id="isim-call-sendbtn" onclick="window.__isimCallSend()">⬆</button>
      </div>
      <div class="isim-call-ctls">
        <button class="icircle" onclick="window.__isimMute()">
          <div class="icircle-bg" id="isim-mute-circle">🎤</div>
          <span>Mute</span>
        </button>
        <button class="icircle" onclick="window.__isimEndCall()">
          <div class="icircle-bg red">📵</div>
          <span>End</span>
        </button>
        <button class="icircle">
          <div class="icircle-bg">🔊</div>
          <span>Speaker</span>
        </button>
      </div>
    </div>

    <!-- TOAST -->
    <div id="isim-toast"></div>

  </div><!-- /isim-screen -->
</div><!-- /isim-frame -->
    `;
}

// ---- Open / Close ----
function openPhone() {
    const el = document.getElementById('isim-phone');
    if (!el) return;
    el.classList.add('open');
    phoneOpen = true;
    applyTheme();
    applyAccent();
    startClock();
    syncSettings();
}

function closePhone() {
    const el = document.getElementById('isim-phone');
    if (!el) return;
    el.classList.remove('open');
    phoneOpen = false;
}

window.__isimClose = closePhone;

// ---- Navigation ----
window.__isimNav = function(screen) {
    // hide all screens
    document.querySelectorAll('#isim-screen .isim-screen').forEach(s => s.classList.remove('show'));
    document.getElementById('isim-home').style.display = 'none';

    if (screen === 'home') {
        document.getElementById('isim-home').style.display = 'flex';
        currentScreen = 'home';
    } else {
        const el = document.getElementById('isim-scr-' + screen);
        if (el) { el.classList.add('show'); currentScreen = screen; }
        if (screen === 'chat') renderChat();
        if (screen === 'friends') window.__isimLoadFriends();
        if (screen === 'settings') syncSettings();
    }
};

// ---- Clock ----
let clockTick = null;
function startClock() {
    if (clockTick) return;
    function tick() {
        const now = new Date();
        const t = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
        const el1 = document.getElementById('isim-sb-time');
        const el2 = document.getElementById('isim-home-time-big');
        if (el1) el1.textContent = t;
        if (el2) el2.textContent = t;
        const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const d = document.getElementById('isim-home-date');
        if (d) d.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
    }
    tick();
    clockTick = setInterval(tick, 15000);
}

// ---- Theme ----
function applyTheme() {
    const frame = document.getElementById('isim-frame');
    if (!frame) return;
    const theme = cfg().theme || 'dark';
    frame.className = theme;
    const toggle = document.getElementById('isim-dark-toggle');
    if (toggle) toggle.checked = theme === 'dark';
}
function applyAccent() {
    const frame = document.getElementById('isim-frame');
    if (!frame) return;
    frame.style.setProperty('--accent', cfg().accent || '#0a84ff');
    frame.style.setProperty('--bub-out', cfg().accent || '#0a84ff');
}
function syncSettings() {
    applyTheme(); applyAccent();
    document.querySelectorAll('.isim-swatch').forEach(sw => {
        sw.classList.toggle('on', sw.dataset.c === cfg().accent);
    });
}

window.__isimToggleDark = function(checked) {
    cfg().theme = checked ? 'dark' : 'light';
    save(); applyTheme();
};
window.__isimAccent = function(color, el) {
    cfg().accent = color; save(); applyAccent();
    document.querySelectorAll('.isim-swatch').forEach(s => s.classList.remove('on'));
    if (el) el.classList.add('on');
};

// ---- Toast ----
function toast(msg) {
    const el = document.getElementById('isim-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2000);
}

// ---- Helpers ----
function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function now() {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ---- Chat ----
function renderChat() {
    const f = activeFriend;
    const av = document.getElementById('isim-chat-av');
    const name = document.getElementById('isim-chat-name');
    const title = document.getElementById('isim-chat-title');
    const status = document.getElementById('isim-chat-status');
    if (!f) {
        if (name) name.textContent = 'No contact';
        if (status) status.textContent = 'Add a contact first';
        return;
    }
    if (av) { av.src = f.avatar || ''; av.onerror = () => { av.style.visibility='hidden'; }; }
    if (name) name.textContent = f.name;
    if (title) title.textContent = f.name;
    if (status) status.textContent = 'Active now';
    loadHistory(f.id);
    const note = cfg().notes[f.id] || '';
    const ta = document.getElementById('isim-noteta');
    if (ta) ta.value = note;
}

function loadHistory(fid) {
    const msgs = document.getElementById('isim-msgs');
    if (!msgs) return;
    msgs.innerHTML = '';
    const hist = cfg().history[fid] || [];
    if (!hist.length) {
        msgs.innerHTML = `<div class="isim-sys">Start chatting</div>`;
    } else {
        hist.forEach(m => appendBubble(m, false));
    }
    msgs.scrollTop = msgs.scrollHeight;
}

function appendBubble(msg, scroll = true) {
    const msgs = document.getElementById('isim-msgs');
    if (!msgs) return;
    const dir = msg.from === 'user' ? 'out' : 'in';
    const av = dir === 'in' ? `<img class="isim-av" src="${esc(activeFriend?.avatar||'')}" alt="" onerror="this.style.visibility='hidden'">` : '';
    msgs.insertAdjacentHTML('beforeend', `
      <div class="isim-row ${dir}">
        ${av}
        <div class="isim-wrap">
          <div class="isim-bub">${esc(msg.content)}</div>
          <span class="isim-time">${esc(msg.time||'')}</span>
        </div>
      </div>`);
    if (scroll) msgs.scrollTop = msgs.scrollHeight;
}

function saveMsg(msg) {
    const fid = activeFriend?.id;
    if (!fid) return;
    const h = cfg().history;
    if (!h[fid]) h[fid] = [];
    h[fid].push(msg);
    if (h[fid].length > 60) h[fid] = h[fid].slice(-60);
    save();
}

window.__isimSend = async function() {
    if (!activeFriend) { toast('Select a contact first'); return; }
    const inp = document.getElementById('isim-input');
    const text = inp.value.trim();
    if (!text) return;
    inp.value = ''; inp.style.height = 'auto';
    const msg = { from: 'user', content: text, time: now() };
    appendBubble(msg); saveMsg(msg);
    await botReply(text);
};

window.__isimNudge = async function() {
    if (!activeFriend) { toast('Select a contact first'); return; }
    await botReply('');
};

window.__isimRetry = function() {
    const fid = activeFriend?.id;
    if (!fid) return;
    const h = cfg().history;
    if (!h[fid]) return;
    while (h[fid].length && h[fid][h[fid].length-1].from === 'bot') h[fid].pop();
    save();
    loadHistory(fid);
    const last = [...(h[fid]||[])].reverse().find(m => m.from === 'user');
    botReply(last?.content || '');
};

window.__isimCancelBot = function() {
    if (isTyping) {
        isTyping = false;
        document.getElementById('isim-typing-row')?.remove();
        toast('Cancelled');
    } else {
        const fid = activeFriend?.id;
        if (!fid) return;
        const h = cfg().history;
        if (h[fid]?.length && h[fid][h[fid].length-1].from === 'bot') {
            h[fid].pop(); save();
            const msgs = document.getElementById('isim-msgs');
            if (msgs) msgs.lastElementChild?.remove();
            toast('Last message removed');
        }
    }
};

window.__isimToggleNote = function() {
    const p = document.getElementById('isim-notepanel');
    if (!p) return;
    p.classList.toggle('show');
};

window.__isimSaveNote = function() {
    const fid = activeFriend?.id;
    if (!fid) return;
    const text = document.getElementById('isim-noteta')?.value.trim() || '';
    const old = cfg().notes[fid];
    cfg().notes[fid] = text;
    save();
    document.getElementById('isim-notepanel')?.classList.remove('show');
    toast('Note saved');
    if (text && old !== text) {
        setTimeout(() => botReply(`[User updated their note: "${text}"]`), 500);
    }
};

// ---- Bot Reply ----
async function botReply(userText) {
    if (!activeFriend || isTyping) return;
    isTyping = true;
    document.getElementById('isim-sendbtn').disabled = true;

    const msgs = document.getElementById('isim-msgs');
    const typingRow = document.createElement('div');
    typingRow.className = 'isim-row in';
    typingRow.id = 'isim-typing-row';
    typingRow.innerHTML = `
      <img class="isim-av" src="${esc(activeFriend.avatar||'')}" alt="" onerror="this.style.visibility='hidden'">
      <div class="isim-typing"><span></span><span></span><span></span></div>`;
    if (msgs) { msgs.appendChild(typingRow); msgs.scrollTop = msgs.scrollHeight; }

    try {
        const f = activeFriend;
        const s = cfg();
        let playerName = 'User';
        try {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
                const ctx = SillyTavern.getContext();
                if (ctx?.name1) playerName = ctx.name1;
            }
        } catch {}

        const hist = (s.history[f.id] || []).slice(-10).map(m => ({
            role: m.from === 'user' ? 'user' : 'assistant',
            content: m.content
        }));
        if (userText) hist.push({ role: 'user', content: userText });
        else hist.push({ role: 'user', content: '(nudge)' });

        const system = `You are ${f.name}. ${f.persona || ''}
You are texting ${playerName} on iPhone. ${s.notes[f.id] ? `User's note: ${s.notes[f.id]}` : ''}
${s.botnotes[f.id] ? `Special instruction: ${s.botnotes[f.id]}` : ''}
Reply naturally, keep it short like a real text message (1-3 sentences max). No emojis. Don't reveal you are AI.`;

        const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 300,
                system,
                messages: hist
            })
        });
        const data = await resp.json();
        const reply = data.content?.map(c => c.text || '').join('') || '...';

        typingRow.remove();
        isTyping = false;
        document.getElementById('isim-sendbtn').disabled = false;

        const botMsg = { from: 'bot', content: reply, time: now() };
        appendBubble(botMsg); saveMsg(botMsg);
        if (callActive) showCallFloat(reply);

    } catch (e) {
        typingRow.remove();
        isTyping = false;
        document.getElementById('isim-sendbtn').disabled = false;
        const errMsg = { from: 'bot', content: 'Sorry, something went wrong.', time: now() };
        appendBubble(errMsg);
    }
}

// ---- Friends ----
window.__isimLoadFriends = function() {
    const list = document.getElementById('isim-flist');
    if (!list) return;
    list.innerHTML = '<div style="padding:16px;text-align:center;font-size:13px;color:var(--txt3)">Loading...</div>';

    let bots = [];
    try {
        if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
            const ctx = SillyTavern.getContext();
            if (ctx?.characters?.length) {
                bots = ctx.characters.filter(c => !c.isUser).map(c => ({
                    id: c.avatar || c.name,
                    name: c.name,
                    avatar: c.avatar ? `/characters/${c.avatar}` : '',
                    persona: c.description || c.personality || '',
                }));
            }
        }
    } catch {}

    if (!bots.length) {
        bots = [
            { id: 'demo1', name: 'Alex', avatar: '', persona: 'A friendly person.' },
            { id: 'demo2', name: 'Sam', avatar: '', persona: 'Cool and laid back.' },
        ];
    }

    list._bots = bots;
    renderFriendList(bots);
};

function renderFriendList(bots) {
    const list = document.getElementById('isim-flist');
    if (!list) return;
    const added = new Set((cfg().friends || []).map(f => f.id));
    list.innerHTML = bots.map(b => `
      <div class="isim-friend-row" onclick="window.__isimPickFriend('${esc(b.id)}')">
        <img class="isim-friend-av" src="${esc(b.avatar)}" alt="" onerror="this.style.visibility='hidden'">
        <div class="isim-friend-info">
          <div class="isim-friend-name">${esc(b.name)}</div>
          <div class="isim-friend-bio">${esc((b.persona||'').substring(0,50))}</div>
        </div>
        ${added.has(b.id)
            ? `<span style="font-size:12px;color:var(--accent)">Added</span>`
            : `<button class="isim-friend-add" onclick="event.stopPropagation();window.__isimAddFriend('${esc(b.id)}')">Add</button>`}
      </div>`).join('');
}

window.__isimFilterFriends = function(q) {
    const list = document.getElementById('isim-flist');
    if (!list || !list._bots) return;
    const filtered = list._bots.filter(b => b.name.toLowerCase().includes(q.toLowerCase()));
    renderFriendList(filtered);
};

window.__isimAddFriend = function(id) {
    const list = document.getElementById('isim-flist');
    const bot = list?._bots?.find(b => b.id === id);
    if (!bot) return;
    if (!cfg().friends.find(f => f.id === id)) {
        cfg().friends.push(bot);
        save();
        toast(`${bot.name} added`);
        window.__isimLoadFriends();
    }
};

window.__isimPickFriend = function(id) {
    const f = cfg().friends.find(f => f.id === id);
    if (f) { activeFriend = f; window.__isimNav('chat'); }
    else {
        const list = document.getElementById('isim-flist');
        const bot = list?._bots?.find(b => b.id === id);
        if (bot) {
            cfg().friends.push(bot); save();
            activeFriend = bot; window.__isimNav('chat');
        }
    }
};

// ---- Call ----
window.__isimStartCall = function() {
    if (!activeFriend) { toast('Select a contact first'); return; }
    const f = activeFriend;
    const bg = document.getElementById('isim-call-bg');
    const av = document.getElementById('isim-call-av');
    const name = document.getElementById('isim-call-name');
    const stat = document.getElementById('isim-call-stat');
    const dur = document.getElementById('isim-call-dur');
    if (bg) bg.style.backgroundImage = `url(${f.avatar || ''})`;
    if (av) { av.src = f.avatar || ''; }
    if (name) name.textContent = f.name;
    if (stat) stat.textContent = 'Calling...';
    if (dur) dur.textContent = '0:00';
    document.getElementById('isim-call-float').innerHTML = '';
    document.getElementById('isim-call').classList.add('show');
    callActive = true; callTimer = 0;
    setTimeout(() => {
        if (!callActive) return;
        if (stat) stat.textContent = 'Connected';
        callInterval = setInterval(() => {
            callTimer++;
            const m = Math.floor(callTimer/60), s = callTimer%60;
            if (dur) dur.textContent = `${m}:${String(s).padStart(2,'0')}`;
        }, 1000);
        showCallFloat('Hello, I picked up.');
    }, 1500);
};

window.__isimEndCall = function() {
    callActive = false;
    clearInterval(callInterval);
    document.getElementById('isim-call').classList.remove('show');
    toast('Call ended');
};

window.__isimMute = function() {
    callMuted = !callMuted;
    const c = document.getElementById('isim-mute-circle');
    if (c) c.classList.toggle('on', callMuted);
    toast(callMuted ? 'Muted' : 'Unmuted');
};

window.__isimCallSend = async function() {
    const inp = document.getElementById('isim-call-inp');
    const text = inp.value.trim();
    if (!text || !activeFriend) return;
    inp.value = '';
    showCallFloat(text, true);
    try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 150,
                system: `You are ${activeFriend.name}. ${activeFriend.persona||''} You are on a phone call. Reply in 1-2 short sentences, no emojis.`,
                messages: [{ role: 'user', content: text }]
            })
        });
        const d = await resp.json();
        const reply = d.content?.map(c => c.text||'').join('') || '...';
        if (callActive) showCallFloat(reply);
    } catch {}
};

function showCallFloat(text, isUser = false) {
    const c = document.getElementById('isim-call-float');
    if (!c) return;
    c.innerHTML = '';
    let delay = 0;
    text.split(' ').forEach(word => {
        const span = document.createElement('span');
        span.className = 'ifl';
        span.style.animationDelay = delay + 'ms';
        if (isUser) span.style.opacity = '0.5';
        span.textContent = word + ' ';
        c.appendChild(span);
        delay += Math.max(80, word.length * 55);
    });
    setTimeout(() => { if (callActive) c.innerHTML = ''; }, delay + 2500);
}

// ---- Input auto-resize ----
function bindInput() {
    const inp = document.getElementById('isim-input');
    if (!inp) return;
    inp.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 90) + 'px';
    });
    inp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.__isimSend(); }
    });
    const callInp = document.getElementById('isim-call-inp');
    if (callInp) callInp.addEventListener('keydown', e => { if (e.key === 'Enter') window.__isimCallSend(); });
}

// ---- loadSettings (เข้า ST extensions panel) ----
function loadSettings() {
    $('.isim-st-panel').remove();
    const html = `
    <div class="isim-st-panel">
      <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
          <b>iPhone Simulator</b>
          <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
          <div class="styled_description_block">
            กดปุ่ม iPhone Simulator ใน wand menu (✨) เพื่อเปิดมือถือ
          </div>
          <hr>
          <small style="color:#888">v1.2.0</small>
        </div>
      </div>
    </div>`;
    $('#extensions_settings').append(html);
}

// ---- inject ปุ่มเข้า wand menu (#extensionsMenu) ----
// เหมือน ST Multiplayer และ 手机 ที่เห็นในรูป
function injectWandButton() {
    // ถ้ามีแล้วไม่ต้อง inject ซ้ำ
    if (document.getElementById('isim-wand-btn')) return;

    const menu = document.getElementById('extensionsMenu');
    if (!menu) return;

    const li = document.createElement('li');
    li.id = 'isim-wand-btn';
    li.style.cssText = 'cursor:pointer;padding:8px 16px;display:flex;align-items:center;gap:8px;font-size:14px;';
    li.innerHTML = '<span style="font-size:16px">📱</span><span>iPhone Simulator</span>';
    li.addEventListener('click', () => {
        // ปิด wand menu แล้วเปิดมือถือ
        document.getElementById('extensionsMenu')?.classList.remove('show');
        document.querySelector('.extensions-menu-button')?.click();
        openPhone();
    });

    // หา divider แรกหรือ prepend เลย
    const first = menu.querySelector('li');
    if (first) menu.insertBefore(li, first);
    else menu.appendChild(li);

    console.log('[iPhone-Sim] wand button injected');
}

// ============================================================
// BOOTSTRAP (jQuery async — เหมือน Cozy Cat)
// ============================================================
jQuery(async () => {
    injectCSS();
    injectHTML();
    loadSettings();

    setTimeout(() => {
        bindInput();
        const homeEl = document.getElementById('isim-home');
        if (homeEl) homeEl.style.display = 'flex';
        startClock();
        const friends = cfg().friends;
        if (friends.length) activeFriend = friends[0];

        // inject ปุ่มเข้า wand menu ทันที
        injectWandButton();

        // MutationObserver รอ wand menu ถ้ายังไม่พร้อม
        if (!document.getElementById('isim-wand-btn')) {
            const obs = new MutationObserver(() => {
                if (document.getElementById('extensionsMenu')) {
                    injectWandButton();
                    if (document.getElementById('isim-wand-btn')) obs.disconnect();
                }
            });
            obs.observe(document.body, { childList: true, subtree: true });
            // หยุด observe หลัง 10 วินาที
            setTimeout(() => obs.disconnect(), 10000);
        }

        // inject ซ้ำทุกครั้งที่ wand menu เปิด (เผื่อ ST re-render menu)
        document.addEventListener('click', (e) => {
            const wandBtn = e.target.closest('.fa-magic, .fa-wand-magic-sparkles, [data-i18n="Extensions Menu"], .extensions-menu-button');
            if (wandBtn) setTimeout(injectWandButton, 50);
        });

    }, 300);

    console.log('[iPhone-Sim] v1.2.0 loaded');
});
