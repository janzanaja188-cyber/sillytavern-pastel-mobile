// iPhone Simulator v2.0 — SillyTavern Extension
// Features: Messages+Contacts merged, Twitter/X app, Bank app (red envelope),
//           Shop app, Story/Status, Bot Notes floating, 24h Notes bar, Pin chat,
//           Multi-message bot reply, No <think> tags, Fake location

const extensionName = 'iphone-simulator';
const LS = 'isim_v2';
const DEF = {
    theme: 'dark',
    accent: '#0a84ff',
    friends: [],
    history: {},
    notes: {},        // user's notes per friend
    botnotes: {},     // bot notes
    stickers: [],
    wallpapers: {},   // per-friend wallpaper
    pinnedChats: [],
    tweets: [],
    stories: [],
    bank: {
        accountNumber: '123-4-56789-0',
        balance: 12500.00,
        transactions: [
            { type: 'receive', amount: 500, from: 'Alex', note: 'อั่งเปา', date: Date.now() - 3600000 },
            { type: 'receive', amount: 200, from: 'Sam', note: 'ส่งอั่งเปา', date: Date.now() - 86400000 },
            { type: 'send', amount: 150, to: 'Mom', note: 'ค่าข้าว', date: Date.now() - 172800000 },
        ]
    },
    cart: [],
    shop: {
        orders: []
    }
};

let _cfg = null;
function cfg() {
    if (_cfg) return _cfg;
    try { _cfg = JSON.parse(JSON.stringify(DEF));
          const saved = JSON.parse(localStorage.getItem(LS) || '{}');
          _cfg = deepMerge(_cfg, saved);
    } catch { _cfg = JSON.parse(JSON.stringify(DEF)); }
    return _cfg;
}
function deepMerge(target, src) {
    for (const k in src) {
        if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) {
            if (!target[k] || typeof target[k] !== 'object') target[k] = {};
            deepMerge(target[k], src[k]);
        } else {
            target[k] = src[k];
        }
    }
    return target;
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
let currentScreen = 'home';
let pendingMessages = []; // messages queued before bot reply
let botAbortController = null;

// ---- CSS ----
function injectCSS() {
    if (document.getElementById('isim-css')) return;
    const s = document.createElement('style');
    s.id = 'isim-css';
    s.textContent = `
/* ===== FAB ===== */
#isim-fab{
    position:fixed !important;bottom:80px !important;right:16px !important;
    width:52px !important;height:52px !important;border-radius:50% !important;
    background:linear-gradient(145deg,#1c1c1e,#3a3a3c) !important;
    border:none !important;cursor:pointer !important;z-index:2147483647 !important;
    box-shadow:0 4px 20px rgba(0,0,0,.7) !important;
    display:flex !important;align-items:center !important;justify-content:center !important;
    transition:transform .2s !important;padding:0 !important;color:#fff !important;font-size:22px !important;
}
#isim-fab:hover{transform:scale(1.1) !important;}

/* ===== Overlay ===== */
#isim-phone{
    position:fixed !important;top:0 !important;left:0 !important;right:0 !important;bottom:0 !important;
    z-index:2147483646 !important;display:none !important;
    align-items:center !important;justify-content:center !important;
    background:rgba(0,0,0,.8) !important;backdrop-filter:blur(12px) !important;
}
#isim-phone.open{display:flex !important;}

/* ===== iPhone Frame ===== */
#isim-frame{
    width:375px;height:812px;max-height:95vh;
    border-radius:50px;border:8px solid #1c1c1e;
    box-shadow:0 0 0 2px #3a3a3c,0 40px 100px rgba(0,0,0,.95),inset 0 0 0 1px rgba(255,255,255,.08);
    overflow:hidden;display:flex;flex-direction:column;position:relative;
    font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif;
}
#isim-frame.dark{
    --bg:#000;--bg2:#1c1c1e;--bg3:#2c2c2e;--bg4:#3a3a3c;
    --txt:#fff;--txt2:rgba(235,235,245,.6);--txt3:rgba(235,235,245,.3);
    --sep:#38383a;--bub-out:#0a84ff;--bub-in:#1c1c1e;--inp:#1c1c1e;
    --accent:#0a84ff;--green:#30d158;--red:#ff453a;--orange:#ff9f0a;
}
#isim-frame.light{
    --bg:#f2f2f7;--bg2:#fff;--bg3:#e5e5ea;--bg4:#d1d1d6;
    --txt:#000;--txt2:rgba(60,60,67,.6);--txt3:rgba(60,60,67,.3);
    --sep:#c6c6c8;--bub-out:#0a84ff;--bub-in:#e5e5ea;--inp:#fff;
    --accent:#0a84ff;--green:#34c759;--red:#ff3b30;--orange:#ff9500;
}

/* ===== Dynamic Island ===== */
#isim-island{
    position:absolute;top:10px;left:50%;transform:translateX(-50%);
    width:120px;height:34px;background:#000;border-radius:20px;z-index:10;
    transition:width .3s cubic-bezier(.34,1.56,.64,1),height .3s cubic-bezier(.34,1.56,.64,1);
}
#isim-island.expanded{width:200px;height:50px;}

/* ===== Status Bar ===== */
#isim-sb{
    background:var(--bg);height:52px;display:flex;
    align-items:flex-end;justify-content:space-between;
    padding:0 28px 8px;flex-shrink:0;
}
#isim-sb-time{font-size:15px;font-weight:600;color:var(--txt);}
#isim-sb-icons{font-size:12px;color:var(--txt);display:flex;gap:5px;align-items:center;}

/* ===== Close Button ===== */
#isim-closebtn{
    position:absolute;top:14px;right:14px;z-index:20;
    width:30px;height:30px;border-radius:50%;border:none;
    background:rgba(255,255,255,.15);color:#fff;font-size:14px;
    cursor:pointer;display:flex;align-items:center;justify-content:center;
}
#isim-closebtn:hover{background:rgba(255,59,48,.85);}

/* ===== Screen Container ===== */
#isim-screen{flex:1;overflow:hidden;position:relative;background:var(--bg);}

/* ===== Home Screen ===== */
#isim-home{
    position:absolute;inset:0;
    background:linear-gradient(160deg,#0d0d1a 0%,#0a1628 40%,#0d2040 70%,#1a0a28 100%);
    display:flex;flex-direction:column;overflow:hidden;
}
#isim-home-wallpaper{
    position:absolute;inset:0;background-size:cover;background-position:center;
    opacity:0.4;z-index:0;
}
.isim-home-content{position:relative;z-index:1;display:flex;flex-direction:column;flex:1;}
#isim-home-time-big{
    font-size:72px;font-weight:200;color:#fff;text-align:center;
    padding-top:16px;letter-spacing:-3px;
    text-shadow:0 2px 30px rgba(0,100,255,.3);
}
#isim-home-date{font-size:15px;color:rgba(255,255,255,.65);text-align:center;margin-top:-8px;}

/* Notification Cards */
.isim-notif-card{
    margin:8px 16px;background:rgba(28,28,30,.85);backdrop-filter:blur(20px);
    border-radius:14px;padding:12px 14px;border:0.5px solid rgba(255,255,255,.08);
    animation:slideDown .35s cubic-bezier(.34,1.56,.64,1);
}
@keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}
.isim-notif-app{font-size:11px;color:rgba(255,255,255,.5);margin-bottom:3px;display:flex;align-items:center;gap:5px;}
.isim-notif-msg{font-size:14px;color:#fff;line-height:1.35;}

/* App Grid */
.isim-app-grid{
    display:grid;grid-template-columns:repeat(4,1fr);gap:10px;
    padding:12px 18px;
}
.isim-dock{
    display:grid;grid-template-columns:repeat(4,1fr);gap:10px;
    padding:10px 18px 8px;
    background:rgba(40,40,50,.6);backdrop-filter:blur(20px);
    border-radius:26px;margin:8px 14px 6px;
}
.isim-app-btn{
    display:flex;flex-direction:column;align-items:center;gap:4px;
    cursor:pointer;background:none;border:none;
    transition:transform .15s;
}
.isim-app-btn:active{transform:scale(.88);}
.isim-icon{
    width:58px;height:58px;border-radius:14px;
    display:flex;align-items:center;justify-content:center;font-size:24px;
    box-shadow:0 4px 12px rgba(0,0,0,.4);
    position:relative;
}
.isim-app-label{font-size:11px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.7);text-align:center;}
.isim-icon-badge{
    position:absolute;top:-4px;right:-4px;
    background:#ff3b30;color:#fff;font-size:9px;font-weight:700;
    border-radius:8px;min-width:16px;height:16px;
    display:flex;align-items:center;justify-content:center;padding:0 3px;
    border:1.5px solid #000;
}

/* App icon colors */
.ic-msg{background:linear-gradient(145deg,#34c759,#25a244);}
.ic-bank{background:linear-gradient(145deg,#ff9f0a,#c67400);}
.ic-shop{background:linear-gradient(145deg,#ff375f,#c4134a);}
.ic-x{background:linear-gradient(145deg,#1c1c1e,#000);}
.ic-set{background:linear-gradient(145deg,#636366,#3a3a3c);}
.ic-call{background:linear-gradient(145deg,#30d158,#1a8a37);}
.ic-cam{background:linear-gradient(145deg,#636366,#2c2c2e);}
.ic-story{background:linear-gradient(145deg,#bf5af2,#7b2fb0);}

.isim-bar{height:5px;width:130px;background:rgba(255,255,255,.25);border-radius:3px;margin:6px auto 4px;}

/* ===== Generic Screen ===== */
.isim-screen{position:absolute;inset:0;display:none;flex-direction:column;background:var(--bg);}
.isim-screen.show{display:flex;}

/* ===== Nav Bar ===== */
.isim-nav{
    height:44px;background:var(--bg2);
    border-bottom:0.5px solid var(--sep);
    display:flex;align-items:center;padding:0 12px;flex-shrink:0;
    position:relative;
}
.isim-nav-back{
    background:none;border:none;color:var(--accent);
    font-size:15px;cursor:pointer;padding:4px 8px 4px 0;
    display:flex;align-items:center;gap:2px;min-width:50px;
}
.isim-nav-title{
    position:absolute;left:50%;transform:translateX(-50%);
    font-size:17px;font-weight:600;color:var(--txt);white-space:nowrap;
}
.isim-nav-action{background:none;border:none;color:var(--accent);font-size:15px;cursor:pointer;padding:4px;margin-left:auto;}

/* ===== Messages Screen ===== */
/* Stories bar */
#isim-stories-bar{
    display:flex;gap:10px;padding:10px 14px;
    background:var(--bg2);border-bottom:0.5px solid var(--sep);
    overflow-x:auto;flex-shrink:0;
}
#isim-stories-bar::-webkit-scrollbar{display:none;}
.isim-story-item{
    display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;cursor:pointer;
}
.isim-story-ring{
    width:52px;height:52px;border-radius:50%;
    background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);
    padding:2.5px;box-sizing:border-box;
}
.isim-story-ring.seen{background:var(--bg4);}
.isim-story-ring.add{
    background:var(--bg3);border:2px dashed var(--txt3);
    display:flex;align-items:center;justify-content:center;font-size:22px;
}
.isim-story-av{
    width:100%;height:100%;border-radius:50%;background:var(--bg3);
    object-fit:cover;border:2px solid var(--bg2);
}
.isim-story-name{font-size:10px;color:var(--txt2);max-width:56px;text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}

/* Notes bar */
#isim-notes-bar{
    display:flex;gap:8px;padding:6px 14px;
    background:var(--bg);border-bottom:0.5px solid var(--sep);
    overflow-x:auto;flex-shrink:0;align-items:center;
}
#isim-notes-bar::-webkit-scrollbar{display:none;}
.isim-note-bubble{
    display:flex;align-items:center;gap:6px;flex-shrink:0;cursor:pointer;
    position:relative;
}
.isim-note-av-wrap{position:relative;}
.isim-note-av{width:36px;height:36px;border-radius:50%;background:var(--bg3);object-fit:cover;}
.isim-note-speech{
    background:var(--bg2);border:0.5px solid var(--sep);
    border-radius:12px 12px 12px 4px;padding:5px 9px;
    font-size:11px;color:var(--txt);max-width:100px;
    overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
    box-shadow:0 2px 8px rgba(0,0,0,.2);
}

/* Chat list rows */
.isim-chat-row{
    display:flex;align-items:center;gap:10px;
    padding:10px 14px;border-bottom:0.5px solid var(--sep);
    cursor:pointer;position:relative;
    transition:background .1s;
}
.isim-chat-row:active{background:var(--bg3);}
.isim-chat-av-wrap{position:relative;flex-shrink:0;}
.isim-chat-list-av{width:48px;height:48px;border-radius:50%;background:var(--bg3);object-fit:cover;}
.isim-chat-online{
    width:12px;height:12px;background:var(--green);border-radius:50%;
    position:absolute;bottom:1px;right:1px;border:2px solid var(--bg2);
}
.isim-chat-meta{flex:1;min-width:0;}
.isim-chat-top{display:flex;justify-content:space-between;align-items:center;}
.isim-chat-nm{font-size:15px;font-weight:500;color:var(--txt);}
.isim-chat-time{font-size:12px;color:var(--txt3);}
.isim-chat-preview{font-size:13px;color:var(--txt2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;}
.isim-chat-pin{font-size:12px;margin-left:4px;}
.isim-unread-dot{
    width:18px;height:18px;background:var(--accent);color:#fff;
    border-radius:50%;font-size:10px;font-weight:600;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;
}

/* Swipe action (delete/pin) */
.isim-chat-row-wrap{position:relative;overflow:hidden;}
.isim-chat-actions{
    position:absolute;right:0;top:0;bottom:0;
    display:flex;transform:translateX(100%);transition:transform .2s;
}
.isim-action-btn{
    display:flex;align-items:center;justify-content:center;
    width:70px;font-size:12px;color:#fff;cursor:pointer;border:none;
}

/* ===== Chat Screen ===== */
#isim-chat-header{
    padding:8px 14px;background:var(--bg2);
    border-bottom:0.5px solid var(--sep);
    display:flex;align-items:center;gap:10px;flex-shrink:0;
}
.isim-chat-av{width:32px;height:32px;border-radius:50%;background:var(--bg3);object-fit:cover;flex-shrink:0;}
.isim-chat-info{flex:1;}
.isim-chat-name{font-size:15px;font-weight:600;color:var(--txt);}
.isim-chat-status{font-size:11px;color:var(--green);}
.isim-chat-tools{display:flex;gap:4px;}
.isim-tool-btn{
    background:var(--bg3);border:none;border-radius:10px;
    padding:4px 9px;font-size:11px;color:var(--txt2);cursor:pointer;
}
.isim-tool-btn:active{opacity:.7;}

/* Bot note bubble in header */
#isim-bot-note-bubble{
    background:rgba(255,255,255,.1);border:0.5px solid rgba(255,255,255,.2);
    border-radius:12px;padding:5px 10px;font-size:11px;color:var(--txt2);
    max-width:140px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
    display:none;backdrop-filter:blur(8px);
}

/* Messages */
#isim-msgs{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:3px;}
.isim-sys{text-align:center;font-size:11px;color:var(--txt3);padding:6px 0;}
.isim-row{display:flex;align-items:flex-end;gap:6px;max-width:85%;}
.isim-row.out{align-self:flex-end;flex-direction:row-reverse;}
.isim-row.in{align-self:flex-start;}
.isim-av{width:24px;height:24px;border-radius:50%;background:var(--bg3);flex-shrink:0;object-fit:cover;}
.isim-wrap{display:flex;flex-direction:column;gap:2px;}
.isim-bub{
    padding:8px 12px;border-radius:18px;
    font-size:14px;line-height:1.45;word-break:break-word;
}
.isim-row.in .isim-bub{background:var(--bub-in);color:var(--txt);border-bottom-left-radius:4px;}
.isim-row.out .isim-bub{background:var(--bub-out);color:#fff;border-bottom-right-radius:4px;}
.isim-time{font-size:10px;color:var(--txt3);padding:0 2px;}
.isim-seen{font-size:10px;color:var(--txt3);text-align:right;padding:0 2px;}

/* Typing dots */
.isim-typing{display:flex;gap:4px;padding:10px 14px;background:var(--bub-in);border-radius:18px;border-bottom-left-radius:4px;width:fit-content;}
.isim-typing span{width:7px;height:7px;border-radius:50%;background:var(--txt3);animation:ibounce .9s infinite;}
.isim-typing span:nth-child(2){animation-delay:.15s;}
.isim-typing span:nth-child(3){animation-delay:.3s;}
@keyframes ibounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}

/* Input bar */
#isim-inputbar{
    background:var(--bg2);border-top:0.5px solid var(--sep);
    padding:8px 10px;display:flex;gap:7px;align-items:flex-end;flex-shrink:0;
}
#isim-input{
    flex:1;background:var(--inp);border:0.5px solid var(--sep);
    border-radius:18px;padding:8px 14px;font-size:14px;color:var(--txt);
    resize:none;line-height:1.4;max-height:90px;overflow-y:auto;
}
#isim-input::placeholder{color:var(--txt3);}
#isim-sendbtn{
    width:32px;height:32px;border-radius:50%;border:none;
    background:var(--accent);color:#fff;cursor:pointer;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;font-size:14px;
}
#isim-sendbtn:disabled{opacity:.35;}
#isim-botsendbtn{
    width:32px;height:32px;border-radius:50%;border:none;
    background:var(--green);color:#fff;cursor:pointer;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;font-size:14px;
    title:"Let bot reply";
}
#isim-cancelbtn{
    width:32px;height:32px;border-radius:50%;border:none;
    background:var(--red);color:#fff;cursor:pointer;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;font-size:16px;
    display:none;
}
#isim-plusbtn,#isim-stickerbtn{
    width:30px;height:30px;border-radius:50%;border:none;
    background:var(--bg3);color:var(--txt);font-size:16px;cursor:pointer;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;
}

/* Note panel */
#isim-notepanel{
    background:var(--bg2);border-bottom:0.5px solid var(--sep);
    padding:10px 14px;display:none;flex-shrink:0;
}
#isim-notepanel.show{display:block;}
#isim-noteta{
    width:100%;min-height:52px;background:var(--inp);
    border:0.5px solid var(--sep);border-radius:8px;
    padding:8px;font-size:13px;color:var(--txt);
    resize:none;box-sizing:border-box;
}
.isim-note-btns{display:flex;justify-content:flex-end;gap:6px;margin-top:6px;}
.isim-note-btns button{padding:5px 14px;border-radius:8px;border:none;cursor:pointer;font-size:13px;background:var(--bg3);color:var(--txt);}
.isim-note-btns .prim{background:var(--accent);color:#fff;}

/* Plus sheet */
#isim-plussheet{display:none;flex-wrap:wrap;gap:10px;padding:12px;background:var(--bg2);border-top:0.5px solid var(--sep);flex-shrink:0;justify-content:center;}
#isim-plussheet.show{display:flex;}
.isim-plus-item{display:flex;flex-direction:column;align-items:center;gap:4px;background:var(--bg3);border:none;border-radius:14px;padding:12px 14px;cursor:pointer;font-size:20px;min-width:60px;}
.isim-plus-item span{font-size:11px;color:var(--txt2);}

/* Red envelope sheet */
#isim-redenv-sheet{
    display:none;position:absolute;bottom:0;left:0;right:0;
    background:var(--bg2);border-radius:20px 20px 0 0;
    padding:20px 16px;z-index:50;box-shadow:0 -4px 30px rgba(0,0,0,.4);
}
#isim-redenv-sheet.show{display:block;}

/* Sticker tray */
#isim-sticker-tray{
    display:none;flex-direction:row;flex-wrap:wrap;gap:8px;
    padding:10px;background:var(--bg2);border-top:0.5px solid var(--sep);
    max-height:130px;overflow-y:auto;flex-shrink:0;
}
#isim-sticker-tray.show{display:flex;}
.isim-sticker-thumb{width:54px;height:54px;object-fit:contain;border-radius:8px;cursor:pointer;background:var(--bg3);}

/* Chat wallpaper bg picker */
.isim-wp-option{
    width:50px;height:50px;border-radius:10px;cursor:pointer;
    border:2.5px solid transparent;flex-shrink:0;
}
.isim-wp-option.on{border-color:var(--accent);}

/* ===== Settings ===== */
.isim-set-section{margin-top:20px;}
.isim-set-header{font-size:12px;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;padding:0 16px 5px;}
.isim-set-group{background:var(--bg2);border-top:0.5px solid var(--sep);border-bottom:0.5px solid var(--sep);}
.isim-set-row{
    display:flex;align-items:center;justify-content:space-between;
    padding:12px 16px;font-size:15px;color:var(--txt);
    border-bottom:0.5px solid var(--sep);
}
.isim-set-row:last-child{border-bottom:none;}
.isim-toggle{position:relative;width:48px;height:28px;display:inline-block;}
.isim-toggle input{opacity:0;width:0;height:0;}
.isim-toggle span{position:absolute;inset:0;background:var(--bg4);border-radius:14px;cursor:pointer;transition:background .2s;}
.isim-toggle span::before{content:'';position:absolute;width:22px;height:22px;left:3px;top:3px;background:#fff;border-radius:50%;transition:transform .2s;box-shadow:0 1px 4px rgba(0,0,0,.3);}
.isim-toggle input:checked+span{background:var(--green);}
.isim-toggle input:checked+span::before{transform:translateX(20px);}
.isim-swatch{width:28px;height:28px;border-radius:50%;cursor:pointer;border:2.5px solid transparent;transition:transform .15s;}
.isim-swatch.on{border-color:var(--txt);transform:scale(1.15);}

/* ===== Call Screen ===== */
#isim-call{
    position:absolute;inset:0;background:#000;
    display:none;flex-direction:column;z-index:30;
}
#isim-call.show{display:flex;}
#isim-call-bg{position:absolute;inset:0;background-size:cover;background-position:center;filter:blur(22px) brightness(.4);}
#isim-call-float{position:absolute;top:110px;left:10px;right:10px;text-align:center;z-index:2;pointer-events:none;min-height:50px;}
.ifl{display:inline-block;font-size:19px;font-weight:600;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.9);opacity:0;animation:ifl-in .35s forwards;}
@keyframes ifl-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.isim-call-mid{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;}
#isim-call-av{width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.2);}
#isim-call-name{font-size:28px;font-weight:600;color:#fff;}
#isim-call-stat{font-size:15px;color:rgba(255,255,255,.6);}
#isim-call-dur{font-size:20px;color:rgba(255,255,255,.8);font-variant-numeric:tabular-nums;}
.isim-call-typebar{position:relative;z-index:2;display:flex;gap:8px;padding:8px 16px;}
#isim-call-inp{flex:1;background:rgba(255,255,255,.12);border:none;border-radius:20px;padding:10px 16px;color:#fff;font-size:14px;}
#isim-call-inp::placeholder{color:rgba(255,255,255,.35);}
#isim-call-sendbtn{width:38px;height:38px;border-radius:50%;border:none;background:var(--accent);color:#fff;cursor:pointer;font-size:16px;}
#isim-call-typing{display:none;color:rgba(255,255,255,.5);font-size:13px;text-align:center;padding:4px;z-index:2;position:relative;}
#isim-call-typing.show{display:block;}
.isim-call-ctls{position:relative;z-index:2;display:flex;justify-content:center;gap:28px;padding:12px 0 24px;}
.icircle{display:flex;flex-direction:column;align-items:center;gap:5px;background:none;border:none;cursor:pointer;}
.icircle-bg{width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:22px;}
.icircle-bg.red{background:#ff3b30;}
.icircle-bg.on{background:rgba(255,255,255,.55);}
.icircle span{font-size:11px;color:rgba(255,255,255,.6);}

/* ===== Toast ===== */
#isim-toast{
    position:absolute;bottom:70px;left:50%;
    transform:translateX(-50%) translateY(16px);
    background:rgba(40,40,40,.96);color:#fff;
    padding:7px 18px;border-radius:20px;font-size:13px;
    opacity:0;transition:opacity .2s,transform .2s;z-index:99;white-space:nowrap;pointer-events:none;
}
#isim-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}

/* ===== Bank App ===== */
#isim-scr-bank .isim-bank-hero{
    background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);
    padding:24px 20px 30px;
}
.isim-bank-acc{font-size:12px;color:rgba(255,255,255,.5);margin-bottom:4px;}
.isim-bank-bal{font-size:42px;font-weight:300;color:#fff;letter-spacing:-1px;}
.isim-bank-bal span{font-size:20px;font-weight:400;}
.isim-bank-actions{display:flex;gap:10px;margin-top:18px;}
.isim-bank-btn{
    flex:1;background:rgba(255,255,255,.12);border:0.5px solid rgba(255,255,255,.15);
    color:#fff;border-radius:12px;padding:10px 8px;font-size:13px;cursor:pointer;
    display:flex;flex-direction:column;align-items:center;gap:4px;
}
.isim-bank-btn:active{opacity:.7;}
.isim-tx-list{flex:1;overflow-y:auto;}
.isim-tx-row{
    display:flex;align-items:center;gap:12px;padding:12px 16px;
    border-bottom:0.5px solid var(--sep);
}
.isim-tx-icon{
    width:40px;height:40px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;
}
.isim-tx-receive{background:rgba(48,209,88,.15);}
.isim-tx-send{background:rgba(255,69,58,.15);}
.isim-tx-info{flex:1;}
.isim-tx-from{font-size:14px;color:var(--txt);font-weight:500;}
.isim-tx-note{font-size:12px;color:var(--txt3);}
.isim-tx-date{font-size:11px;color:var(--txt3);}
.isim-tx-amt{font-size:16px;font-weight:600;}
.isim-tx-amt.green{color:var(--green);}
.isim-tx-amt.red{color:var(--red);}

/* ===== Shop App ===== */
.isim-shop-banner{
    background:linear-gradient(135deg,#ff375f,#c4134a);
    padding:16px;display:flex;align-items:center;justify-content:space-between;
    flex-shrink:0;
}
.isim-shop-search{
    flex:1;background:rgba(255,255,255,.2);border:none;border-radius:12px;
    padding:8px 14px;color:#fff;font-size:14px;
}
.isim-shop-search::placeholder{color:rgba(255,255,255,.6);}
.isim-shop-cart-btn{
    width:36px;height:36px;background:rgba(255,255,255,.2);border:none;
    border-radius:50%;color:#fff;font-size:18px;cursor:pointer;
    display:flex;align-items:center;justify-content:center;margin-left:8px;position:relative;
}
.isim-cart-badge{
    position:absolute;top:-3px;right:-3px;background:#fff;color:#e02020;
    border-radius:50%;width:16px;height:16px;font-size:9px;font-weight:700;
    display:flex;align-items:center;justify-content:center;
}
.isim-shop-cats{display:flex;gap:8px;padding:10px 14px;overflow-x:auto;flex-shrink:0;}
.isim-shop-cats::-webkit-scrollbar{display:none;}
.isim-cat-chip{
    background:var(--bg3);border:none;border-radius:20px;padding:6px 14px;
    font-size:13px;color:var(--txt2);cursor:pointer;white-space:nowrap;flex-shrink:0;
}
.isim-cat-chip.on{background:var(--accent);color:#fff;}
.isim-shop-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px 12px;overflow-y:auto;flex:1;}
.isim-product-card{
    background:var(--bg2);border-radius:14px;overflow:hidden;cursor:pointer;
    border:0.5px solid var(--sep);
}
.isim-product-img{
    height:110px;background:var(--bg3);
    display:flex;align-items:center;justify-content:center;font-size:40px;
}
.isim-product-info{padding:8px 10px;}
.isim-product-name{font-size:13px;color:var(--txt);font-weight:500;line-height:1.3;}
.isim-product-price{font-size:15px;color:var(--red);font-weight:600;margin-top:4px;}
.isim-product-old{font-size:11px;color:var(--txt3);text-decoration:line-through;}
.isim-add-cart{
    background:var(--accent);color:#fff;border:none;border-radius:8px;
    padding:5px 0;font-size:12px;cursor:pointer;width:100%;margin-top:6px;
}

/* Cart sheet */
#isim-cart-sheet{
    display:none;position:absolute;bottom:0;left:0;right:0;top:20%;
    background:var(--bg2);border-radius:20px 20px 0 0;z-index:50;
    box-shadow:0 -4px 30px rgba(0,0,0,.4);flex-direction:column;
}
#isim-cart-sheet.show{display:flex;}
.isim-cart-item{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:0.5px solid var(--sep);}
.isim-cart-em{font-size:30px;width:48px;text-align:center;}
.isim-cart-info{flex:1;}
.isim-cart-nm{font-size:14px;color:var(--txt);font-weight:500;}
.isim-cart-pr{font-size:13px;color:var(--txt3);}
.isim-cart-qty{display:flex;align-items:center;gap:8px;}
.isim-qty-btn{width:26px;height:26px;border-radius:50%;border:none;background:var(--bg3);color:var(--txt);font-size:16px;cursor:pointer;}

/* ===== Twitter/X App ===== */
#isim-scr-twitter .isim-x-header{
    background:var(--bg2);border-bottom:0.5px solid var(--sep);
    padding:10px 14px;display:flex;align-items:center;gap:10px;flex-shrink:0;
}
.isim-x-logo{font-size:22px;font-weight:900;color:var(--txt);font-family:serif;}
.isim-x-tabs{display:flex;border-bottom:0.5px solid var(--sep);flex-shrink:0;}
.isim-x-tab{
    flex:1;text-align:center;padding:10px;font-size:14px;font-weight:500;
    color:var(--txt2);cursor:pointer;border-bottom:2.5px solid transparent;
}
.isim-x-tab.on{color:var(--txt);border-bottom-color:var(--txt);}
.isim-tweet-feed{flex:1;overflow-y:auto;}
.isim-tweet{padding:12px 14px;border-bottom:0.5px solid var(--sep);}
.isim-tweet-top{display:flex;gap:10px;}
.isim-tweet-av{width:40px;height:40px;border-radius:50%;background:var(--bg3);object-fit:cover;flex-shrink:0;}
.isim-tweet-meta{flex:1;}
.isim-tweet-name{font-size:14px;font-weight:600;color:var(--txt);}
.isim-tweet-handle{font-size:12px;color:var(--txt3);}
.isim-tweet-body{font-size:14px;color:var(--txt);margin-top:4px;line-height:1.4;}
.isim-tweet-img{
    width:100%;border-radius:12px;margin-top:8px;max-height:160px;
    object-fit:cover;display:block;background:var(--bg3);
}
.isim-tweet-actions{display:flex;gap:0;margin-top:8px;}
.isim-tweet-act{
    flex:1;display:flex;align-items:center;gap:5px;font-size:13px;color:var(--txt3);
    background:none;border:none;cursor:pointer;padding:4px 0;
}
.isim-tweet-act:hover{color:var(--accent);}
.isim-tweet-act.liked{color:#ff375f;}
.isim-tweet-act.retweeted{color:var(--green);}

/* Tweet composer */
#isim-tweet-composer{
    display:none;position:absolute;inset:0;background:var(--bg);z-index:40;flex-direction:column;
}
#isim-tweet-composer.show{display:flex;}
.isim-compose-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:0.5px solid var(--sep);}
#isim-tweet-area{flex:1;padding:14px 16px;font-size:16px;color:var(--txt);background:transparent;border:none;resize:none;line-height:1.5;}
#isim-tweet-area::placeholder{color:var(--txt3);}
.isim-compose-bottom{padding:10px 16px;border-top:0.5px solid var(--sep);display:flex;align-items:center;justify-content:space-between;}
.isim-tweet-post-btn{
    background:var(--txt);color:var(--bg);border:none;border-radius:20px;
    padding:8px 20px;font-size:14px;font-weight:600;cursor:pointer;
}

/* Replies */
.isim-reply{
    margin:0 14px 8px;padding:10px 12px;background:var(--bg3);border-radius:12px;
    font-size:13px;color:var(--txt2);
}
.isim-reply-user{font-size:12px;font-weight:600;color:var(--accent);margin-bottom:3px;}

/* ===== Story Viewer ===== */
#isim-story-viewer{
    display:none;position:absolute;inset:0;background:#000;z-index:60;flex-direction:column;
}
#isim-story-viewer.show{display:flex;}
#isim-story-img{
    flex:1;background-size:cover;background-position:center;background-color:#111;
}
.isim-story-progress{display:flex;gap:4px;padding:12px 12px 6px;position:absolute;top:0;left:0;right:0;z-index:2;}
.isim-story-prog-seg{flex:1;height:3px;background:rgba(255,255,255,.35);border-radius:2px;overflow:hidden;}
.isim-story-prog-fill{height:100%;background:#fff;width:0;transition:width linear;}
.isim-story-close{position:absolute;top:44px;right:14px;z-index:3;background:rgba(0,0,0,.4);border:none;color:#fff;border-radius:50%;width:32px;height:32px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.isim-story-user{position:absolute;top:44px;left:14px;z-index:3;display:flex;align-items:center;gap:8px;}
.isim-story-user-av{width:32px;height:32px;border-radius:50%;border:2px solid #fff;object-fit:cover;background:var(--bg3);}
.isim-story-user-nm{color:#fff;font-size:14px;font-weight:600;text-shadow:0 1px 4px rgba(0,0,0,.7);}
.isim-story-text-overlay{
    position:absolute;bottom:80px;left:14px;right:14px;z-index:3;
    background:rgba(0,0,0,.5);backdrop-filter:blur(4px);
    border-radius:12px;padding:10px 14px;color:#fff;font-size:14px;
    display:none;
}
.isim-story-text-overlay.show{display:block;}
.isim-story-reply-bar{
    position:absolute;bottom:20px;left:14px;right:14px;z-index:3;
    display:flex;gap:8px;align-items:center;
}
#isim-story-reply-inp{
    flex:1;background:rgba(255,255,255,.15);border:0.5px solid rgba(255,255,255,.3);
    border-radius:24px;padding:10px 16px;color:#fff;font-size:14px;
}
#isim-story-reply-inp::placeholder{color:rgba(255,255,255,.5);}

/* ===== Scrollbar ===== */
#isim-frame ::-webkit-scrollbar{width:3px;}
#isim-frame ::-webkit-scrollbar-thumb{background:var(--sep);border-radius:2px;}

/* ===== Responsive ===== */
@media(max-width:480px){
    #isim-frame{width:100vw !important;height:100vh !important;border-radius:0 !important;border:none !important;max-height:100vh !important;}
    #isim-phone{align-items:stretch !important;justify-content:stretch !important;padding:0 !important;}
    #isim-island{display:none !important;}
}

/* ===== Animations ===== */
@keyframes bounceIn{
    0%{opacity:0;transform:scale(.5);}
    60%{transform:scale(1.05);}
    100%{opacity:1;transform:scale(1);}
}
.isim-bounce{animation:bounceIn .3s cubic-bezier(.34,1.56,.64,1) forwards;}

/* Settings panel */
.isim-st-panel{margin-bottom:5px;}
`;
    document.head.appendChild(s);
}

// ---- Helpers ----
function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function now() {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function fmtDate(ts) {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
    return `${d.getDate()}/${d.getMonth()+1}`;
}
function cleanThink(text) {
    // Remove <think>...</think> tags and content
    return String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*/gi, '').trim();
}
function toast(msg) {
    const el = document.getElementById('isim-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2000);
}

// ---- Inject HTML ----
function injectHTML() {
    if (document.getElementById('isim-phone')) return;

    const fab = document.createElement('div');
    fab.id = 'isim-fab';
    fab.innerHTML = '📱';
    fab.title = 'iPhone Simulator';
    fab.style.cssText = 'cursor:pointer;font-size:22px;padding:4px 6px;border-radius:8px;background:transparent;border:none;display:inline-flex;align-items:center;justify-content:center;';
    fab.addEventListener('click', openPhone);

    const targets = ['#extensionsMenu','#send_but_container','#leftSendForm','#rightSendForm','#form_sheld','#options_button'];
    let injected = false;
    for (const sel of targets) {
        const el = document.querySelector(sel);
        if (el) { el.prepend(fab); injected = true; break; }
    }
    if (!injected) {
        fab.style.cssText += 'position:fixed !important;bottom:80px !important;right:16px !important;z-index:2147483647 !important;background:linear-gradient(145deg,#1c1c1e,#3a3a3c) !important;border-radius:50% !important;width:52px !important;height:52px !important;font-size:22px !important;box-shadow:0 4px 20px rgba(0,0,0,.7) !important;';
        document.body.appendChild(fab);
    }

    const phone = document.createElement('div');
    phone.id = 'isim-phone';
    phone.innerHTML = buildPhoneHTML();
    document.body.appendChild(phone);
    phone.addEventListener('click', e => { if (e.target === phone) closePhone(); });
}

function buildPhoneHTML() {
    const products = [
        { name: 'AirPods Pro', price: 7990, old: 9990, emoji: '🎧', cat: 'electronics' },
        { name: 'เคสไอโฟน', price: 290, old: 490, emoji: '📱', cat: 'accessories' },
        { name: 'กระเป๋าหนัง', price: 1290, old: 1890, emoji: '👜', cat: 'fashion' },
        { name: 'สนีกเกอร์', price: 3490, old: 4990, emoji: '👟', cat: 'fashion' },
        { name: 'หูฟัง Gaming', price: 1890, old: 2490, emoji: '🎮', cat: 'electronics' },
        { name: 'นาฬิกา Smart', price: 4990, old: 6990, emoji: '⌚', cat: 'electronics' },
        { name: 'ลิปสติก', price: 390, old: 590, emoji: '💄', cat: 'beauty' },
        { name: 'แว่นกันแดด', price: 890, old: 1290, emoji: '🕶', cat: 'accessories' },
    ];
    const shopGrid = products.map(p => `
        <div class="isim-product-card" onclick="window.__isimViewProduct('${esc(p.name)}',${p.price},'${p.emoji}')">
            <div class="isim-product-img">${p.emoji}</div>
            <div class="isim-product-info">
                <div class="isim-product-name">${esc(p.name)}</div>
                <div class="isim-product-price">฿${p.price.toLocaleString()}</div>
                <div class="isim-product-old">฿${p.old.toLocaleString()}</div>
                <button class="isim-add-cart" onclick="event.stopPropagation();window.__isimAddToCart('${esc(p.name)}',${p.price},'${p.emoji}')">+ ใส่ตะกร้า</button>
            </div>
        </div>`).join('');

    return `
<div id="isim-frame" class="dark">
  <div id="isim-island"></div>
  <button id="isim-closebtn" onclick="window.__isimClose()">✕</button>

  <div id="isim-sb">
    <span id="isim-sb-time">9:41</span>
    <span id="isim-sb-icons">
      <span style="font-size:11px">▲</span>
      <span>WiFi</span>
      <span>🔋</span>
    </span>
  </div>

  <div id="isim-screen">

    <!-- ===== HOME ===== -->
    <div id="isim-home">
      <div id="isim-home-wallpaper"></div>
      <div class="isim-home-content">
        <div id="isim-home-time-big">9:41</div>
        <div id="isim-home-date">Tuesday, May 12</div>
        <div id="isim-home-notifs" style="margin-top:10px;max-height:140px;overflow:hidden;"></div>
        <div style="flex:1;min-height:10px;"></div>
        <!-- App Grid -->
        <div class="isim-app-grid">
          <button class="isim-app-btn" onclick="window.__isimNav('messages')">
            <div class="isim-icon ic-msg"><span>💬</span><span class="isim-icon-badge" id="isim-msg-badge" style="display:none">0</span></div>
            <span class="isim-app-label">Messages</span>
          </button>
          <button class="isim-app-btn" onclick="window.__isimNav('twitter')">
            <div class="isim-icon ic-x"><span style="font-size:20px;font-weight:900;font-family:serif;color:#fff">𝕏</span></div>
            <span class="isim-app-label">X</span>
          </button>
          <button class="isim-app-btn" onclick="window.__isimNav('bank')">
            <div class="isim-icon ic-bank">🏦</div>
            <span class="isim-app-label">ธนาคาร</span>
          </button>
          <button class="isim-app-btn" onclick="window.__isimNav('shop')">
            <div class="isim-icon ic-shop">🛍</div>
            <span class="isim-app-label">Shop</span>
          </button>
          <button class="isim-app-btn" onclick="window.__isimNav('settings')">
            <div class="isim-icon ic-set">⚙</div>
            <span class="isim-app-label">Settings</span>
          </button>
        </div>
        <!-- Dock -->
        <div class="isim-dock">
          <button class="isim-app-btn" onclick="window.__isimNav('messages')">
            <div class="isim-icon ic-msg" style="width:50px;height:50px;">💬</div>
            <span class="isim-app-label">Messages</span>
          </button>
          <button class="isim-app-btn" onclick="window.__isimNav('bank')">
            <div class="isim-icon ic-bank" style="width:50px;height:50px;">🏦</div>
            <span class="isim-app-label">ธนาคาร</span>
          </button>
          <button class="isim-app-btn" onclick="window.__isimNav('shop')">
            <div class="isim-icon ic-shop" style="width:50px;height:50px;">🛍</div>
            <span class="isim-app-label">Shop</span>
          </button>
          <button class="isim-app-btn" onclick="window.__isimNav('twitter')">
            <div class="isim-icon ic-x" style="width:50px;height:50px;"><span style="font-size:18px;font-weight:900;font-family:serif;color:#fff">𝕏</span></div>
            <span class="isim-app-label">X</span>
          </button>
        </div>
        <div class="isim-bar"></div>
      </div>
    </div>

    <!-- ===== MESSAGES LIST ===== -->
    <div class="isim-screen" id="isim-scr-messages">
      <div class="isim-nav">
        <button class="isim-nav-back" onclick="window.__isimNav('home')">‹ Back</button>
        <span class="isim-nav-title">Messages</span>
        <button class="isim-nav-action" onclick="window.__isimNav('friends')" title="Add contact">✚</button>
      </div>
      <!-- Stories / Status bar -->
      <div id="isim-stories-bar">
        <div class="isim-story-item" onclick="window.__isimAddMyStory()">
          <div class="isim-story-ring add" style="width:52px;height:52px;">+</div>
          <span class="isim-story-name">My Story</span>
        </div>
        <!-- Bot stories rendered dynamically -->
      </div>
      <!-- Notes bar -->
      <div id="isim-notes-bar">
        <span style="font-size:11px;color:var(--txt3);flex-shrink:0;">Notes</span>
        <!-- Rendered dynamically -->
      </div>
      <!-- Search -->
      <div style="padding:6px 12px;flex-shrink:0;">
        <input id="isim-msg-search" placeholder="🔍 Search" style="width:100%;box-sizing:border-box;padding:8px 12px;border-radius:10px;border:none;background:var(--bg3);color:var(--txt);font-size:14px;" oninput="window.__isimFilterMessages(this.value)">
      </div>
      <!-- Chat list -->
      <div id="isim-chat-list" style="flex:1;overflow-y:auto;"></div>
    </div>

    <!-- ===== FRIENDS / ADD CONTACT ===== -->
    <div class="isim-screen" id="isim-scr-friends">
      <div class="isim-nav">
        <button class="isim-nav-back" onclick="window.__isimNav('messages')">‹ Messages</button>
        <span class="isim-nav-title">Add Contact</span>
        <button class="isim-nav-action" onclick="window.__isimLoadFriends()">↺</button>
      </div>
      <input id="isim-fsearch" placeholder="Search characters..." style="margin:8px 12px;padding:8px 12px;border-radius:10px;border:none;background:var(--bg3);color:var(--txt);font-size:14px;box-sizing:border-box;width:calc(100% - 24px);flex-shrink:0;" oninput="window.__isimFilterFriends(this.value)">
      <div id="isim-flist" style="flex:1;overflow-y:auto;"></div>
    </div>

    <!-- ===== CHAT ===== -->
    <div class="isim-screen" id="isim-scr-chat">
      <div class="isim-nav" style="height:auto;min-height:44px;padding:6px 12px;">
        <button class="isim-nav-back" onclick="window.__isimNav('messages')">‹ Back</button>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
          <span id="isim-chat-title" style="font-size:15px;font-weight:600;color:var(--txt);">Chat</span>
          <span id="isim-chat-title-status" style="font-size:11px;color:var(--green);">Active now</span>
        </div>
        <button class="isim-nav-action" onclick="window.__isimStartCall()" title="Call">📞</button>
      </div>
      <!-- Bot note bubble in header -->
      <div id="isim-chat-header" style="padding:6px 14px;background:var(--bg2);border-bottom:0.5px solid var(--sep);display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <img class="isim-chat-av" id="isim-chat-av" src="" alt="">
        <div id="isim-bot-note-bubble"></div>
        <div class="isim-chat-tools">
          <button class="isim-tool-btn" onclick="window.__isimToggleNote()">Note</button>
          <button class="isim-tool-btn" onclick="window.__isimSetBotNotePrompt()">Bot Note</button>
          <button class="isim-tool-btn" onclick="window.__isimRetry()">↻</button>
        </div>
      </div>
      <div id="isim-notepanel">
        <div style="font-size:11px;color:var(--txt3);margin-bottom:4px;">My note (bot sees this)</div>
        <textarea id="isim-noteta" placeholder="Write a note..."></textarea>
        <div class="isim-note-btns">
          <button onclick="window.__isimToggleNote()">Cancel</button>
          <button class="prim" onclick="window.__isimSaveNote()">Save</button>
        </div>
      </div>
      <!-- Wallpaper picker (hidden) -->
      <div id="isim-wp-picker" style="display:none;padding:8px 14px;background:var(--bg2);border-bottom:0.5px solid var(--sep);gap:8px;overflow-x:auto;flex-shrink:0;">
        <div style="font-size:11px;color:var(--txt3);margin-bottom:4px;">Chat Wallpaper</div>
        <div style="display:flex;gap:8px;">
          <div class="isim-wp-option" style="background:transparent;border:1px solid var(--sep);" onclick="window.__isimSetChatWp('')">✕</div>
          <div class="isim-wp-option" style="background:linear-gradient(135deg,#1a1a2e,#0f3460);" onclick="window.__isimSetChatWp('gradient1')"></div>
          <div class="isim-wp-option" style="background:linear-gradient(135deg,#0d2137,#1a4c7a);" onclick="window.__isimSetChatWp('gradient2')"></div>
          <div class="isim-wp-option" style="background:linear-gradient(135deg,#2d0036,#6b0f8c);" onclick="window.__isimSetChatWp('gradient3')"></div>
          <div class="isim-wp-option" style="background:linear-gradient(135deg,#1a0a00,#4a1500);" onclick="window.__isimSetChatWp('gradient4')"></div>
          <button style="background:var(--bg3);border:none;border-radius:10px;padding:4px 10px;color:var(--txt2);font-size:12px;cursor:pointer;flex-shrink:0;" onclick="document.getElementById('isim-wp-file').click()">📷 Custom</button>
          <input type="file" id="isim-wp-file" accept="image/*" style="display:none" onchange="window.__isimUploadWp(this)">
        </div>
      </div>
      <div id="isim-msgs"></div>
      <div id="isim-plussheet">
        <button class="isim-plus-item" onclick="window.__isimSendLocation()">📍<span>Location</span></button>
        <button class="isim-plus-item" onclick="window.__isimOpenRedEnvelope()">🧧<span>Red Envelope</span></button>
        <button class="isim-plus-item" onclick="document.getElementById('isim-sticker-input').click()">🖼<span>Sticker</span></button>
        <button class="isim-plus-item" onclick="document.getElementById('isim-img-input').click()">📷<span>Photo</span></button>
        <button class="isim-plus-item" onclick="window.__isimToggleWpPicker()">🎨<span>Wallpaper</span></button>
      </div>
      <div id="isim-redenv-sheet">
        <div style="font-size:30px;text-align:center;margin-bottom:8px">🧧</div>
        <div style="font-size:16px;font-weight:600;color:var(--txt);text-align:center;margin-bottom:14px">Red Envelope</div>
        <input id="isim-redenv-amount" type="number" placeholder="Amount (THB)" style="width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:0.5px solid var(--sep);background:var(--inp);color:var(--txt);font-size:15px;margin-bottom:8px">
        <input id="isim-redenv-note" placeholder="Message (optional)" style="width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:0.5px solid var(--sep);background:var(--inp);color:var(--txt);font-size:15px;margin-bottom:14px">
        <button onclick="window.__isimSendRedEnvelope()" style="width:100%;padding:12px;border-radius:12px;border:none;background:#e02020;color:#fff;font-size:15px;font-weight:600;cursor:pointer">ส่งอั่งเปา 🧧</button>
        <button onclick="window.__isimCloseRedEnvelope()" style="width:100%;padding:10px;border-radius:12px;border:none;background:var(--bg3);color:var(--txt);font-size:14px;cursor:pointer;margin-top:8px">Cancel</button>
      </div>
      <div id="isim-sticker-tray"></div>
      <input type="file" id="isim-sticker-input" accept="image/*" style="display:none" onchange="window.__isimAddSticker(this)">
      <input type="file" id="isim-img-input" accept="image/*" style="display:none" onchange="window.__isimSendPhoto(this)">
      <div id="isim-inputbar">
        <button id="isim-plusbtn" onclick="window.__isimTogglePlus()">＋</button>
        <button id="isim-stickerbtn" onclick="window.__isimToggleStickerTray()">🖼</button>
        <textarea id="isim-input" placeholder="iMessage" rows="1"></textarea>
        <button id="isim-botsendbtn" onclick="window.__isimNudge()" title="Let bot reply">🤖</button>
        <button id="isim-cancelbtn" onclick="window.__isimCancelBot()" title="Cancel bot">✕</button>
        <button id="isim-sendbtn" onclick="window.__isimSend()">⬆</button>
      </div>
    </div>

    <!-- ===== BANK ===== -->
    <div class="isim-screen" id="isim-scr-bank">
      <div class="isim-nav">
        <button class="isim-nav-back" onclick="window.__isimNav('home')">‹ Back</button>
        <span class="isim-nav-title">KBank Sim</span>
        <button class="isim-nav-action" onclick="window.__isimRefreshBank()">↺</button>
      </div>
      <div class="isim-bank-hero">
        <div class="isim-bank-acc">บัญชีออมทรัพย์ · <span id="isim-bank-accnum"></span></div>
        <div class="isim-bank-bal"><span>฿</span><span id="isim-bank-bal">0.00</span></div>
        <div style="font-size:12px;color:rgba(255,255,255,.4);margin-top:4px;">ยอดเงินล่าสุด</div>
        <div class="isim-bank-actions">
          <button class="isim-bank-btn" onclick="window.__isimBankTransfer()">💸<span>โอนเงิน</span></button>
          <button class="isim-bank-btn" onclick="window.__isimBankScan()">📷<span>QR</span></button>
          <button class="isim-bank-btn" onclick="window.__isimBankTop()">💳<span>เติมเงิน</span></button>
        </div>
      </div>
      <div style="padding:12px 16px 6px;font-size:13px;font-weight:600;color:var(--txt);flex-shrink:0;">รายการล่าสุด</div>
      <div class="isim-tx-list" id="isim-tx-list"></div>
    </div>

    <!-- ===== SHOP ===== -->
    <div class="isim-screen" id="isim-scr-shop">
      <div class="isim-shop-banner">
        <input class="isim-shop-search" placeholder="🔍 ค้นหาสินค้า..." oninput="window.__isimFilterShop(this.value)">
        <button class="isim-shop-cart-btn" onclick="window.__isimOpenCart()">🛒
          <span class="isim-cart-badge" id="isim-cart-count" style="display:none">0</span>
        </button>
      </div>
      <div class="isim-shop-cats">
        <button class="isim-cat-chip on" onclick="window.__isimFilterCat('all',this)">ทั้งหมด</button>
        <button class="isim-cat-chip" onclick="window.__isimFilterCat('electronics',this)">อิเล็กทรอนิกส์</button>
        <button class="isim-cat-chip" onclick="window.__isimFilterCat('fashion',this)">แฟชั่น</button>
        <button class="isim-cat-chip" onclick="window.__isimFilterCat('accessories',this)">อุปกรณ์เสริม</button>
        <button class="isim-cat-chip" onclick="window.__isimFilterCat('beauty',this)">ความงาม</button>
      </div>
      <div class="isim-shop-grid" id="isim-shop-grid">${shopGrid}</div>
      <div id="isim-cart-sheet">
        <div style="padding:12px 16px;font-size:16px;font-weight:600;color:var(--txt);border-bottom:0.5px solid var(--sep);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
          <span>ตะกร้า</span>
          <button style="background:none;border:none;color:var(--txt3);font-size:20px;cursor:pointer;" onclick="document.getElementById('isim-cart-sheet').classList.remove('show')">✕</button>
        </div>
        <div id="isim-cart-items" style="flex:1;overflow-y:auto;"></div>
        <div style="padding:14px 16px;border-top:0.5px solid var(--sep);flex-shrink:0;">
          <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
            <span style="color:var(--txt2);">รวม</span>
            <span style="font-size:18px;font-weight:600;color:var(--txt);" id="isim-cart-total">฿0</span>
          </div>
          <button onclick="window.__isimCheckout()" style="width:100%;padding:14px;border-radius:14px;border:none;background:var(--red);color:#fff;font-size:16px;font-weight:600;cursor:pointer;">สั่งซื้อ 🛒</button>
        </div>
      </div>
    </div>

    <!-- ===== TWITTER / X ===== -->
    <div class="isim-screen" id="isim-scr-twitter">
      <div style="background:var(--bg2);border-bottom:0.5px solid var(--sep);padding:10px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <button style="background:none;border:none;cursor:pointer;font-size:22px;" onclick="window.__isimNav('home')">‹</button>
        <span style="font-size:20px;font-weight:900;color:var(--txt);font-family:serif;">𝕏</span>
        <button style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--accent);" onclick="window.__isimOpenCompose()">✏</button>
      </div>
      <div class="isim-x-tabs">
        <div class="isim-x-tab on" onclick="window.__isimXTab('for-you',this)">For You</div>
        <div class="isim-x-tab" onclick="window.__isimXTab('following',this)">Following</div>
        <div class="isim-x-tab" onclick="window.__isimXTab('trending',this)">Trending</div>
      </div>
      <div class="isim-tweet-feed" id="isim-tweet-feed"></div>
      <!-- Compose tweet -->
      <div id="isim-tweet-composer">
        <div class="isim-compose-head">
          <button style="background:none;border:none;color:var(--accent);font-size:15px;cursor:pointer;" onclick="window.__isimCloseCompose()">Cancel</button>
          <button class="isim-tweet-post-btn" onclick="window.__isimPostTweet()">Post</button>
        </div>
        <div style="display:flex;padding:14px 16px;gap:10px;">
          <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#6b3fa0);flex-shrink:0;"></div>
          <textarea id="isim-tweet-area" placeholder="What's happening?" rows="4" style="flex:1;font-size:16px;color:var(--txt);background:transparent;border:none;resize:none;line-height:1.5;"></textarea>
        </div>
        <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-top:0.5px solid var(--sep);">
          <button style="background:none;border:none;cursor:pointer;font-size:18px;" onclick="document.getElementById('isim-tweet-img-input').click()">🖼</button>
          <input type="file" id="isim-tweet-img-input" accept="image/*" style="display:none" onchange="window.__isimAttachTweetImg(this)">
          <span id="isim-tweet-img-preview" style="font-size:12px;color:var(--accent);"></span>
        </div>
      </div>
    </div>

    <!-- ===== SETTINGS ===== -->
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
            <div class="isim-set-row" style="flex-wrap:wrap;gap:10px;">
              ${['#0a84ff','#30d158','#ff375f','#ff9f0a','#bf5af2','#ff6b35','#05c7f2'].map(c =>
                `<div class="isim-swatch" data-c="${c}" style="background:${c}" onclick="window.__isimAccent('${c}',this)"></div>`
              ).join('')}
            </div>
          </div>
        </div>
        <div class="isim-set-section">
          <div class="isim-set-header">Data</div>
          <div class="isim-set-group">
            <div class="isim-set-row" style="cursor:pointer" onclick="window.__isimClearChat()">
              <span style="color:#ff375f">Clear Current Chat</span><span style="color:var(--txt3)">›</span>
            </div>
            <div class="isim-set-row" style="cursor:pointer" onclick="window.__isimResetAll()">
              <span style="color:#ff375f">Reset Everything</span><span style="color:var(--txt3)">›</span>
            </div>
          </div>
        </div>
        <div class="isim-set-section">
          <div class="isim-set-header">About</div>
          <div class="isim-set-group">
            <div class="isim-set-row"><span>Version</span><span style="color:var(--txt3)">2.0.0</span></div>
            <div class="isim-set-row"><span>Author</span><span style="color:var(--txt3)">iPhone-Sim</span></div>
          </div>
        </div>
        <div style="height:30px;"></div>
      </div>
    </div>

    <!-- ===== STORY VIEWER ===== -->
    <div id="isim-story-viewer">
      <div class="isim-story-progress" id="isim-story-progress"></div>
      <div class="isim-story-user">
        <img class="isim-story-user-av" id="isim-story-user-av" src="" alt="">
        <span class="isim-story-user-nm" id="isim-story-user-nm">Name</span>
      </div>
      <button class="isim-story-close" onclick="window.__isimCloseStory()">✕</button>
      <div id="isim-story-img"></div>
      <div class="isim-story-text-overlay" id="isim-story-text-overlay"></div>
      <div class="isim-story-reply-bar">
        <input id="isim-story-reply-inp" placeholder="Reply to story...">
        <button style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;" onclick="window.__isimReplyStory()">⬆</button>
      </div>
    </div>

    <!-- CALL SCREEN -->
    <div id="isim-call">
      <div id="isim-call-bg"></div>
      <div id="isim-call-float"></div>
      <div class="isim-call-mid">
        <img id="isim-call-av" src="" alt="" onerror="this.style.display='none'">
        <div id="isim-call-name" style="font-size:28px;font-weight:600;color:#fff;"></div>
        <div id="isim-call-stat" style="font-size:15px;color:rgba(255,255,255,.6);">Calling...</div>
        <div id="isim-call-dur" style="font-size:20px;color:rgba(255,255,255,.8);font-variant-numeric:tabular-nums;">0:00</div>
        <div id="isim-call-typing" style="font-size:13px;color:rgba(255,255,255,.5);margin-top:4px;display:none;">...</div>
      </div>
      <div class="isim-call-typebar">
        <input id="isim-call-inp" placeholder="Type during call..." style="flex:1;background:rgba(255,255,255,.12);border:none;border-radius:20px;padding:10px 16px;color:#fff;font-size:14px;">
        <button id="isim-call-sendbtn" onclick="window.__isimCallSend()" style="width:38px;height:38px;border-radius:50%;border:none;background:var(--accent);color:#fff;cursor:pointer;font-size:16px;">⬆</button>
      </div>
      <div class="isim-call-ctls">
        <button class="icircle" onclick="window.__isimMute()">
          <div class="icircle-bg" id="isim-mute-circle">🎤</div><span>Mute</span>
        </button>
        <button class="icircle" onclick="window.__isimEndCall()">
          <div class="icircle-bg red">📵</div><span>End</span>
        </button>
        <button class="icircle">
          <div class="icircle-bg">🔊</div><span>Speaker</span>
        </button>
      </div>
    </div>

    <!-- TOAST -->
    <div id="isim-toast"></div>

  </div><!-- /isim-screen -->
</div><!-- /isim-frame -->
    `;
}

// ===== OPEN / CLOSE =====
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

// ===== NAVIGATION =====
window.__isimNav = function(screen) {
    document.querySelectorAll('#isim-screen .isim-screen').forEach(s => s.classList.remove('show'));
    document.getElementById('isim-home').style.display = 'none';
    document.getElementById('isim-story-viewer').classList.remove('show');

    if (screen === 'home') {
        document.getElementById('isim-home').style.display = 'flex';
        currentScreen = 'home';
    } else {
        const el = document.getElementById('isim-scr-' + screen);
        if (el) { el.classList.add('show'); currentScreen = screen; }
        if (screen === 'messages') renderMessageList();
        if (screen === 'chat') renderChat();
        if (screen === 'friends') window.__isimLoadFriends();
        if (screen === 'settings') syncSettings();
        if (screen === 'bank') renderBank();
        if (screen === 'shop') renderShop();
        if (screen === 'twitter') renderTwitter();
    }
};

// ===== CLOCK =====
let clockTick = null;
function startClock() {
    if (clockTick) return;
    function tick() {
        const d = new Date();
        const t = `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
        const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const el1 = document.getElementById('isim-sb-time');
        const el2 = document.getElementById('isim-home-time-big');
        const el3 = document.getElementById('isim-home-date');
        if (el1) el1.textContent = t;
        if (el2) el2.textContent = t;
        if (el3) el3.textContent = `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
    }
    tick();
    clockTick = setInterval(tick, 15000);
}

// ===== THEME =====
function applyTheme() {
    const frame = document.getElementById('isim-frame');
    if (!frame) return;
    const theme = cfg().theme || 'dark';
    frame.className = theme;
}
function applyAccent() {
    const frame = document.getElementById('isim-frame');
    if (!frame) return;
    const acc = cfg().accent || '#0a84ff';
    frame.style.setProperty('--accent', acc);
    frame.style.setProperty('--bub-out', acc);
}
function syncSettings() {
    applyTheme(); applyAccent();
    const toggle = document.getElementById('isim-dark-toggle');
    if (toggle) toggle.checked = (cfg().theme || 'dark') === 'dark';
    document.querySelectorAll('.isim-swatch').forEach(sw => {
        sw.classList.toggle('on', sw.dataset.c === cfg().accent);
    });
}
window.__isimToggleDark = function(checked) { cfg().theme = checked ? 'dark' : 'light'; save(); applyTheme(); };
window.__isimAccent = function(color, el) {
    cfg().accent = color; save(); applyAccent();
    document.querySelectorAll('.isim-swatch').forEach(s => s.classList.remove('on'));
    if (el) el.classList.add('on');
};

// ===== MESSAGES LIST =====
function renderMessageList() {
    renderStoriesBar();
    renderNotesBar();
    renderChatList();
}

function renderStoriesBar() {
    const bar = document.getElementById('isim-stories-bar');
    if (!bar) return;
    const stories = cfg().stories || [];
    const friends = cfg().friends || [];

    let html = `<div class="isim-story-item" onclick="window.__isimAddMyStory()">
        <div class="isim-story-ring add" style="width:52px;height:52px;">+</div>
        <span class="isim-story-name">My Story</span>
    </div>`;

    // My stories
    const myStories = stories.filter(s => s.isMe);
    if (myStories.length) {
        html = `<div class="isim-story-item" onclick="window.__isimViewMyStory()">
            <div class="isim-story-ring" style="width:52px;height:52px;padding:2.5px;box-sizing:border-box;">
                <img class="isim-story-av" src="${esc(myStories[myStories.length-1].image)}" onerror="this.style.background='var(--bg3)'">
            </div>
            <span class="isim-story-name">My Story</span>
        </div>` + html.slice(html.indexOf('</div>\n    </div>') + 17);
        // Replace add button position
        html = html.replace(/<div class="isim-story-item".*?<\/div>\n    <\/div>/s, '');
        html = `<div class="isim-story-item" onclick="window.__isimViewMyStory()">
            <div class="isim-story-ring" style="width:52px;height:52px;padding:2.5px;box-sizing:border-box;">
                <img class="isim-story-av" src="${esc(myStories[myStories.length-1].image)}" onerror="this.style.background='var(--bg3)'">
            </div>
            <span class="isim-story-name">My Story</span>
        </div>
        <div class="isim-story-item" onclick="window.__isimAddMyStory()">
            <div class="isim-story-ring add" style="width:52px;height:52px;">+</div>
            <span class="isim-story-name">Add</span>
        </div>`;
    }

    // Bot stories (notes that haven't expired)
    const now24 = Date.now() - 24 * 3600000;
    friends.forEach(f => {
        const note = cfg().botnotes[f.id];
        if (note && note.timestamp > now24) {
            html += `<div class="isim-story-item" onclick="window.__isimViewBotNote('${esc(f.id)}')">
                <div class="isim-story-ring" style="width:52px;height:52px;padding:2.5px;box-sizing:border-box;background:linear-gradient(45deg,var(--accent),#bf5af2);">
                    <img class="isim-story-av" src="${esc(f.avatar||'')}" onerror="this.style.background='var(--bg3)'">
                </div>
                <span class="isim-story-name">${esc(f.name.substring(0,8))}</span>
            </div>`;
        }
    });

    bar.innerHTML = html;

    // Add story input (hidden)
    if (!document.getElementById('isim-story-input')) {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.id = 'isim-story-input'; inp.accept = 'image/*'; inp.style.display = 'none';
        inp.onchange = function() { window.__isimUploadStory(this); };
        document.getElementById('isim-frame').appendChild(inp);
    }
}

function renderNotesBar() {
    const bar = document.getElementById('isim-notes-bar');
    if (!bar) return;
    const now24 = Date.now() - 24 * 3600000;
    const friends = cfg().friends || [];
    let html = '<span style="font-size:11px;color:var(--txt3);flex-shrink:0;">Notes</span>';
    friends.forEach(f => {
        const note = cfg().botnotes[f.id];
        if (note && note.timestamp > now24) {
            html += `<div class="isim-note-bubble" onclick="window.__isimViewBotNote('${esc(f.id)}')">
                <div class="isim-note-av-wrap">
                    <img class="isim-note-av" src="${esc(f.avatar||'')}" onerror="this.style.background='var(--bg3)'">
                </div>
                <div class="isim-note-speech">${esc((note.text||'').substring(0,40))}</div>
            </div>`;
        }
    });
    bar.innerHTML = html;
}

function renderChatList() {
    const list = document.getElementById('isim-chat-list');
    if (!list) return;
    const friends = cfg().friends || [];
    const pinned = cfg().pinnedChats || [];
    if (!friends.length) {
        list.innerHTML = '<div style="text-align:center;padding:30px;color:var(--txt3);font-size:14px;">No contacts yet<br><br><button onclick="window.__isimNav(\'friends\')" style="background:var(--accent);color:#fff;border:none;border-radius:14px;padding:10px 24px;font-size:14px;cursor:pointer;">Add Contact</button></div>';
        return;
    }

    // Sort: pinned first
    const sorted = [...friends].sort((a, b) => {
        const ap = pinned.includes(a.id), bp = pinned.includes(b.id);
        if (ap && !bp) return -1;
        if (!ap && bp) return 1;
        return 0;
    });

    list.innerHTML = sorted.map(f => {
        const hist = cfg().history[f.id] || [];
        const last = hist[hist.length - 1];
        const preview = last ? (last.type === 'sticker' ? '🖼 Sticker' : last.type === 'photo' ? '📷 Photo' : last.type === 'redenv' ? '🧧 Red Envelope' : (last.content || '').substring(0, 40)) : 'Start chatting';
        const lastTime = last ? fmtDate(last.ts || Date.now()) : '';
        const isPinned = pinned.includes(f.id);
        const isOnline = true;
        const now24 = Date.now() - 24*3600000;
        const hasNote = cfg().botnotes[f.id] && cfg().botnotes[f.id].timestamp > now24;

        return `<div class="isim-chat-row" onclick="window.__isimOpenChat('${esc(f.id)}')" oncontextmenu="event.preventDefault();window.__isimChatLongPress('${esc(f.id)}')">
            <div class="isim-chat-av-wrap">
                <img class="isim-chat-list-av" src="${esc(f.avatar||'')}" onerror="this.style.background='var(--bg3)'">
                <div class="isim-chat-online" ${isOnline ? '' : 'style="display:none"'}></div>
                ${hasNote ? `<div style="position:absolute;top:-4px;left:-4px;width:18px;height:18px;background:linear-gradient(135deg,#ff9f0a,#e65c00);border-radius:50%;font-size:10px;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--bg2);">📝</div>` : ''}
            </div>
            <div class="isim-chat-meta">
                <div class="isim-chat-top">
                    <span class="isim-chat-nm">${esc(f.name)}${isPinned ? ' 📌' : ''}</span>
                    <span class="isim-chat-time">${esc(lastTime)}</span>
                </div>
                <div class="isim-chat-preview">${esc(preview)}</div>
            </div>
        </div>`;
    }).join('');
}

window.__isimFilterMessages = function(q) {
    const friends = (cfg().friends || []).filter(f => f.name.toLowerCase().includes(q.toLowerCase()));
    const list = document.getElementById('isim-chat-list');
    if (!list) return;
    if (!q) { renderChatList(); return; }
    if (!friends.length) { list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--txt3);">No results</div>'; return; }
    // Re-render with filtered
    const prevFriends = cfg().friends;
    cfg().friends = friends;
    renderChatList();
    cfg().friends = prevFriends;
};

window.__isimOpenChat = function(id) {
    const f = cfg().friends.find(f => f.id === id);
    if (!f) return;
    activeFriend = f;
    // Reset pending messages for this new chat
    pendingMessages = [];
    window.__isimNav('chat');
};

window.__isimChatLongPress = function(id) {
    const pinned = cfg().pinnedChats || [];
    const isPinned = pinned.includes(id);
    const f = cfg().friends.find(f => f.id === id);
    if (!f) return;
    const action = confirm(`${f.name}\n\n${isPinned ? 'Unpin' : 'Pin'} chat?`);
    if (action) {
        if (isPinned) {
            cfg().pinnedChats = pinned.filter(p => p !== id);
        } else {
            if (!cfg().pinnedChats) cfg().pinnedChats = [];
            cfg().pinnedChats.push(id);
        }
        save();
        renderChatList();
        toast(isPinned ? 'Unpinned' : 'Pinned 📌');
    }
};

// ===== CHAT =====
function renderChat() {
    const f = activeFriend;
    if (!f) {
        window.__isimNav('messages'); return;
    }
    const title = document.getElementById('isim-chat-title');
    const av = document.getElementById('isim-chat-av');
    if (title) title.textContent = f.name;
    if (av) { av.src = f.avatar || ''; av.onerror = () => { av.style.background='var(--bg3)'; }; }

    // Show bot note bubble
    updateBotNoteBubble();
    loadHistory(f.id);
    applyWallpaper();

    const ta = document.getElementById('isim-noteta');
    if (ta) ta.value = cfg().notes[f.id] || '';
}

function updateBotNoteBubble() {
    const bubble = document.getElementById('isim-bot-note-bubble');
    if (!bubble || !activeFriend) return;
    const note = cfg().botnotes[activeFriend.id];
    const now24 = Date.now() - 24*3600000;
    if (note && note.timestamp > now24 && note.text) {
        bubble.textContent = '📝 ' + note.text.substring(0, 30);
        bubble.style.display = 'block';
    } else {
        bubble.style.display = 'none';
    }
}

function loadHistory(fid) {
    const msgs = document.getElementById('isim-msgs');
    if (!msgs) return;
    msgs.innerHTML = '';
    const hist = cfg().history[fid] || [];
    if (!hist.length) {
        msgs.innerHTML = '<div class="isim-sys">Start chatting ✨</div>';
    } else {
        hist.forEach(m => appendBubble(m, false));
    }
    msgs.scrollTop = msgs.scrollHeight;
}

function appendBubble(msg, scroll = true) {
    const msgs = document.getElementById('isim-msgs');
    if (!msgs || !activeFriend) return;
    const dir = msg.from === 'user' ? 'out' : 'in';
    const av = dir === 'in' ? `<img class="isim-av" src="${esc(activeFriend.avatar||'')}" alt="" onerror="this.style.background='var(--bg3)'">` : '';
    let inner = '';
    if (msg.type === 'sticker') {
        inner = `<img src="${esc(msg.content)}" style="max-width:100px;max-height:100px;border-radius:8px;display:block">`;
    } else if (msg.type === 'photo') {
        inner = `<img src="${esc(msg.content)}" style="max-width:160px;border-radius:12px;display:block">`;
    } else if (msg.type === 'location') {
        inner = `<div style="font-size:13px">📍 ${esc(msg.content)}</div>`;
    } else if (msg.type === 'redenv') {
        const c = msg.content;
        inner = `<div style="text-align:center;padding:4px 0">🧧<br><b style="font-size:18px">฿${esc(c.amount)}</b>${c.note ? '<br><span style="font-size:11px;opacity:.7">'+esc(c.note)+'</span>' : ''}</div>`;
    } else {
        inner = esc(msg.content);
    }
    const el = document.createElement('div');
    el.className = `isim-row ${dir} isim-bounce`;
    el.innerHTML = `${av}<div class="isim-wrap"><div class="isim-bub">${inner}</div><span class="isim-time">${esc(msg.time||'')}</span></div>`;
    msgs.appendChild(el);
    if (scroll) msgs.scrollTop = msgs.scrollHeight;
}

function saveMsg(msg) {
    const fid = activeFriend?.id;
    if (!fid) return;
    const h = cfg().history;
    if (!h[fid]) h[fid] = [];
    msg.ts = Date.now();
    h[fid].push(msg);
    if (h[fid].length > 80) h[fid] = h[fid].slice(-80);
    save();
}

window.__isimSend = function() {
    if (!activeFriend) { toast('Select a contact first'); return; }
    const inp = document.getElementById('isim-input');
    const text = inp.value.trim();
    if (!text) return;
    inp.value = ''; inp.style.height = 'auto';
    const msg = { from: 'user', content: text, time: now() };
    appendBubble(msg); saveMsg(msg);
    pendingMessages.push(msg);
    // Don't auto-reply — user presses bot button
};

window.__isimNudge = async function() {
    if (!activeFriend) { toast('Select a contact first'); return; }
    if (isTyping) { toast('Bot is typing...'); return; }
    await botReply();
};

window.__isimRetry = function() {
    const fid = activeFriend?.id;
    if (!fid) return;
    const h = cfg().history;
    if (!h[fid]) return;
    while (h[fid].length && h[fid][h[fid].length-1].from === 'bot') h[fid].pop();
    save(); loadHistory(fid);
    botReply();
};

window.__isimCancelBot = function() {
    if (isTyping) {
        isTyping = false;
        if (botAbortController) { botAbortController.abort(); botAbortController = null; }
        document.getElementById('isim-typing-row')?.remove();
        document.getElementById('isim-cancelbtn').style.display = 'none';
        document.getElementById('isim-botsendbtn').style.display = 'flex';
        const sendBtn = document.getElementById('isim-sendbtn');
        if (sendBtn) sendBtn.disabled = false;
        toast('Cancelled');
    }
};

// ===== BOT REPLY =====
async function botReply() {
    if (!activeFriend || isTyping) return;
    isTyping = true;
    botAbortController = new AbortController();

    const sendBtn = document.getElementById('isim-sendbtn');
    const cancelBtn = document.getElementById('isim-cancelbtn');
    const botBtn = document.getElementById('isim-botsendbtn');
    if (sendBtn) sendBtn.disabled = true;
    if (cancelBtn) cancelBtn.style.display = 'flex';
    if (botBtn) botBtn.style.display = 'none';

    // Show typing dots
    const msgs = document.getElementById('isim-msgs');
    const typingRow = document.createElement('div');
    typingRow.className = 'isim-row in';
    typingRow.id = 'isim-typing-row';
    typingRow.innerHTML = `<img class="isim-av" src="${esc(activeFriend.avatar||'')}" alt="" onerror="this.style.background='var(--bg3)'"><div class="isim-typing"><span></span><span></span><span></span></div>`;
    if (msgs) { msgs.appendChild(typingRow); msgs.scrollTop = msgs.scrollHeight; }

    try {
        const f = activeFriend;
        const s = cfg();

        let playerName = 'User';
        try {
            const ctx = SillyTavern.getContext();
            if (ctx?.name1) playerName = ctx.name1;
        } catch {}

        const hist = (s.history[f.id] || []).slice(-12);
        const histText = hist.map(m =>
            (m.from === 'user' ? playerName : f.name) + ': ' + (m.content || '')
        ).join('\n');

        const botNote = s.botnotes[f.id];
        const now24 = Date.now() - 24*3600000;
        const validBotNote = botNote && botNote.timestamp > now24 ? botNote.text : '';
        const userNote = s.notes[f.id] || '';

        const prompt = `[iPhone SMS / iMessage Simulation]
You are ${f.name}. ${f.persona || ''}
You are texting ${playerName} through iPhone Messages.
${userNote ? `Context from ${playerName}: "${userNote}"` : ''}
${validBotNote ? `Your current note/status: "${validBotNote}"` : ''}

IMPORTANT RULES:
- Reply naturally like real SMS texting
- You can send 1-4 short messages (simulate multiple texts)
- Separate each message with a newline that starts with [MSG]
- You can send a sticker by writing [STICKER:emoji] on its own line
- No asterisks, no actions, no *hugs* style text
- No <think> tags — reply directly
- Stay in character, never say you are AI
- Thai or English based on what ${playerName} uses

Chat history:
${histText}

Now reply as ${f.name}:`;

        const ctx = SillyTavern.getContext();
        let rawReply = '';

        if (typeof ctx.generateQuietPrompt === 'function') {
            rawReply = await ctx.generateQuietPrompt(prompt, false, false);
        } else if (typeof window.generateQuietPrompt === 'function') {
            rawReply = await window.generateQuietPrompt(prompt, false, false);
        } else {
            throw new Error('generateQuietPrompt not available');
        }

        // Remove <think> tags
        rawReply = cleanThink(rawReply);
        // Remove prefix
        if (rawReply.startsWith(f.name + ':')) rawReply = rawReply.slice(f.name.length + 1).trim();
        if (!rawReply) rawReply = '...';

        typingRow.remove();
        isTyping = false;
        if (sendBtn) sendBtn.disabled = false;
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (botBtn) botBtn.style.display = 'flex';

        // Parse multiple messages
        const lines = rawReply.split('\n').filter(l => l.trim());
        let parts = [];
        for (const line of lines) {
            if (line.startsWith('[MSG]')) {
                parts.push({ type: 'text', content: line.slice(5).trim() });
            } else if (line.match(/^\[STICKER:(.+)\]$/)) {
                const emoji = line.match(/^\[STICKER:(.+)\]$/)[1];
                parts.push({ type: 'sticker_emoji', content: emoji });
            } else {
                // plain text — check if there's a [MSG] split
                const msgParts = line.split('[MSG]').map(p => p.trim()).filter(Boolean);
                for (const p of msgParts) {
                    parts.push({ type: 'text', content: p });
                }
            }
        }
        if (!parts.length) parts = [{ type: 'text', content: rawReply }];

        // Send each part with delay
        for (let i = 0; i < parts.length; i++) {
            if (!isTyping && i > 0) {
                // Show typing again between messages
                if (parts.length > 1 && i < parts.length) {
                    const t2 = document.createElement('div');
                    t2.className = 'isim-row in';
                    t2.id = 'isim-typing-row';
                    t2.innerHTML = `<img class="isim-av" src="${esc(f.avatar||'')}" alt="" onerror="this.style.background='var(--bg3)'"><div class="isim-typing"><span></span><span></span><span></span></div>`;
                    if (msgs) { msgs.appendChild(t2); msgs.scrollTop = msgs.scrollHeight; }
                    await new Promise(r => setTimeout(r, 600 + Math.random() * 1000));
                    t2.remove();
                }
            }
            const part = parts[i];
            let botMsg;
            if (part.type === 'sticker_emoji') {
                // Render emoji as large sticker
                botMsg = { from: 'bot', type: 'sticker_emoji', content: part.content, time: now() };
                const dir = 'in';
                const av2 = `<img class="isim-av" src="${esc(f.avatar||'')}" alt="" onerror="this.style.background='var(--bg3)'">`;
                const el = document.createElement('div');
                el.className = `isim-row ${dir} isim-bounce`;
                el.innerHTML = `${av2}<div class="isim-wrap"><div class="isim-bub" style="font-size:40px;background:transparent;padding:4px;">${esc(part.content)}</div><span class="isim-time">${now()}</span></div>`;
                if (msgs) { msgs.appendChild(el); msgs.scrollTop = msgs.scrollHeight; }
            } else {
                botMsg = { from: 'bot', content: part.content, time: now() };
                appendBubble(botMsg);
            }
            saveMsg(botMsg);
            if (callActive) showCallFloat(part.content);
        }

        pendingMessages = [];

        // Check if bot wants to update its note
        if (rawReply.includes('[NOTE:')) {
            const noteMatch = rawReply.match(/\[NOTE:([^\]]+)\]/);
            if (noteMatch) {
                const noteText = noteMatch[1].trim();
                cfg().botnotes[f.id] = { text: noteText, timestamp: Date.now() };
                save();
                updateBotNoteBubble();
                renderNotesBar();
                toast(`${f.name} updated their note`);
            }
        }

    } catch (e) {
        console.error('[iPhone-Sim] botReply error:', e);
        typingRow.remove();
        isTyping = false;
        if (sendBtn) sendBtn.disabled = false;
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (botBtn) botBtn.style.display = 'flex';
        toast('Error: ' + (e.message || 'generation failed'));
    }
}

// ===== NOTE MANAGEMENT =====
window.__isimToggleNote = function() {
    const p = document.getElementById('isim-notepanel');
    if (p) p.classList.toggle('show');
};
window.__isimSaveNote = function() {
    const fid = activeFriend?.id;
    if (!fid) return;
    const text = document.getElementById('isim-noteta')?.value.trim() || '';
    cfg().notes[fid] = text;
    save();
    document.getElementById('isim-notepanel')?.classList.remove('show');
    toast('Note saved');
};
window.__isimSetBotNotePrompt = function() {
    const fid = activeFriend?.id;
    if (!fid || !activeFriend) return;
    const curr = (cfg().botnotes[fid]?.text) || '';
    // Trigger bot to write a note via nudge with special context
    botReplyBotNote();
};

async function botReplyBotNote() {
    if (!activeFriend || isTyping) return;
    const f = activeFriend;
    const s = cfg();
    let playerName = 'User';
    try { const ctx = SillyTavern.getContext(); if (ctx?.name1) playerName = ctx.name1; } catch {}

    isTyping = true;
    const msgs = document.getElementById('isim-msgs');
    const typingRow = document.createElement('div');
    typingRow.className = 'isim-row in'; typingRow.id = 'isim-typing-row';
    typingRow.innerHTML = `<img class="isim-av" src="${esc(f.avatar||'')}" alt=""><div class="isim-typing"><span></span><span></span><span></span></div>`;
    if (msgs) { msgs.appendChild(typingRow); msgs.scrollTop = msgs.scrollHeight; }

    try {
        const hist = (s.history[f.id]||[]).slice(-5).map(m => (m.from==='user'?playerName:f.name)+': '+(m.content||'')).join('\n');
        const prompt = `You are ${f.name}. ${f.persona||''}
Based on recent context, write a short note/status (max 20 words) that ${f.name} would post on their profile note. 
This note floats next to your avatar in Messages.
Recent context: ${hist}
Write ONLY the note text, nothing else. No quotes. No [NOTE:] tag. Just the note itself.`;

        const ctx = SillyTavern.getContext();
        let reply = '';
        if (typeof ctx.generateQuietPrompt === 'function') {
            reply = await ctx.generateQuietPrompt(prompt, false, false);
        }
        reply = cleanThink(reply).trim().replace(/^["']|["']$/g,'');
        if (reply) {
            cfg().botnotes[f.id] = { text: reply, timestamp: Date.now() };
            save();
            updateBotNoteBubble();
            renderNotesBar();
            toast(`${f.name} posted a note!`);
        }
    } catch {}
    typingRow.remove();
    isTyping = false;
}

window.__isimViewBotNote = function(id) {
    const f = cfg().friends.find(f => f.id === id);
    const note = cfg().botnotes[id];
    if (!f || !note) return;
    alert(`📝 Note from ${f.name}:\n\n"${note.text}"\n\n(Posted ${fmtDate(note.timestamp)})`);
};

// ===== WALLPAPER =====
window.__isimToggleWpPicker = function() {
    const p = document.getElementById('isim-wp-picker');
    if (p) { p.style.display = p.style.display === 'none' ? 'block' : 'none'; }
    document.getElementById('isim-plussheet')?.classList.remove('show');
};
window.__isimSetChatWp = function(key) {
    const fid = activeFriend?.id;
    if (!fid) return;
    const grads = {
        gradient1: 'linear-gradient(160deg,#0d0d1a,#0a1628,#0d2040)',
        gradient2: 'linear-gradient(160deg,#0d2137,#1a4c7a,#0d3460)',
        gradient3: 'linear-gradient(160deg,#2d0036,#4a0a6b,#1a0028)',
        gradient4: 'linear-gradient(160deg,#1a0a00,#3a1500,#4a2000)',
    };
    if (!cfg().wallpapers) cfg().wallpapers = {};
    cfg().wallpapers[fid] = key ? grads[key] || '' : '';
    save(); applyWallpaper();
    document.getElementById('isim-wp-picker').style.display = 'none';
    toast('Wallpaper set');
};
window.__isimUploadWp = function(input) {
    const f = input.files[0]; if (!f || !activeFriend) return;
    const r = new FileReader();
    r.onload = e => {
        const fid = activeFriend.id;
        if (!cfg().wallpapers) cfg().wallpapers = {};
        cfg().wallpapers[fid] = `url(${e.target.result})`;
        save(); applyWallpaper();
        document.getElementById('isim-wp-picker').style.display = 'none';
        toast('Wallpaper set');
    };
    r.readAsDataURL(f); input.value = '';
};
function applyWallpaper() {
    const msgs = document.getElementById('isim-msgs');
    if (!msgs || !activeFriend) return;
    const wp = (cfg().wallpapers || {})[activeFriend.id] || '';
    if (!wp) { msgs.style.background = ''; msgs.style.backgroundImage = ''; return; }
    if (wp.startsWith('linear-gradient') || wp.startsWith('radial-gradient')) {
        msgs.style.background = wp;
    } else {
        msgs.style.background = wp;
        msgs.style.backgroundSize = 'cover';
    }
}

// ===== PLUS MENU =====
window.__isimTogglePlus = function() {
    const s = document.getElementById('isim-plussheet');
    if (!s) return;
    const open = s.classList.toggle('show');
    if (open) document.getElementById('isim-sticker-tray').classList.remove('show');
};
window.__isimToggleStickerTray = function() {
    const t = document.getElementById('isim-sticker-tray');
    if (!t) return;
    const open = t.classList.toggle('show');
    if (open) { renderStickerTray(); document.getElementById('isim-plussheet').classList.remove('show'); }
};
function renderStickerTray() {
    const t = document.getElementById('isim-sticker-tray');
    if (!t) return;
    const stickers = cfg().stickers || [];
    if (!stickers.length) {
        t.innerHTML = '<div style="padding:14px;text-align:center;color:var(--txt3);font-size:13px">No stickers — tap + then Sticker to add</div>';
        return;
    }
    t.innerHTML = stickers.map((s, i) =>
        `<img src="${esc(s)}" class="isim-sticker-thumb" onclick="window.__isimSendSticker(${i})" onerror="this.style.display='none'">`
    ).join('');
}
window.__isimSendSticker = function(idx) {
    if (!activeFriend) return;
    const s = (cfg().stickers||[])[idx]; if (!s) return;
    document.getElementById('isim-sticker-tray').classList.remove('show');
    const msg = { from: 'user', type: 'sticker', content: s, time: now() };
    appendBubble(msg); saveMsg(msg); pendingMessages.push(msg);
};
window.__isimAddSticker = function(input) {
    const f = input.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => {
        if (!cfg().stickers) cfg().stickers = [];
        cfg().stickers.push(e.target.result); save(); toast('Sticker added!'); renderStickerTray();
    };
    r.readAsDataURL(f); input.value = '';
};
window.__isimSendPhoto = function(input) {
    const f = input.files[0]; if (!f || !activeFriend) return;
    const r = new FileReader();
    r.onload = e => {
        const msg = { from: 'user', type: 'photo', content: e.target.result, time: now() };
        appendBubble(msg); saveMsg(msg); pendingMessages.push(msg);
        document.getElementById('isim-plussheet').classList.remove('show');
    };
    r.readAsDataURL(f); input.value = '';
};

// ===== LOCATION (FAKE) =====
window.__isimSendLocation = function() {
    document.getElementById('isim-plussheet')?.classList.remove('show');
    if (!activeFriend) return;
    const fakeLocations = ['Bangkok, Thailand', 'Siam Paragon, Bangkok', 'Chatuchak, Bangkok', 'Sukhumvit, Bangkok', 'Chiang Mai, Thailand'];
    const loc = fakeLocations[Math.floor(Math.random() * fakeLocations.length)];
    const msg = { from: 'user', type: 'location', content: loc, time: now() };
    appendBubble(msg); saveMsg(msg); pendingMessages.push(msg);
    toast('Location shared (fake)');
};

// ===== RED ENVELOPE =====
window.__isimOpenRedEnvelope = function() {
    document.getElementById('isim-plussheet')?.classList.remove('show');
    document.getElementById('isim-redenv-sheet')?.classList.add('show');
};
window.__isimCloseRedEnvelope = function() {
    document.getElementById('isim-redenv-sheet')?.classList.remove('show');
};
window.__isimSendRedEnvelope = function() {
    const amt = document.getElementById('isim-redenv-amount')?.value;
    const note = document.getElementById('isim-redenv-note')?.value;
    if (!amt || Number(amt) <= 0) { toast('กรุณาใส่จำนวนเงิน'); return; }
    if (!activeFriend) return;
    document.getElementById('isim-redenv-sheet')?.classList.remove('show');
    document.getElementById('isim-redenv-amount').value = '';
    document.getElementById('isim-redenv-note').value = '';
    const msg = { from: 'user', type: 'redenv', content: { amount: amt, note }, time: now() };
    appendBubble(msg); saveMsg(msg); pendingMessages.push(msg);
    // Also record in bank
    cfg().bank.transactions.unshift({
        type: 'send', amount: Number(amt),
        to: activeFriend.name, note: note || 'อั่งเปา', date: Date.now()
    });
    cfg().bank.balance -= Number(amt);
    save();
    toast(`ส่งอั่งเปา ฿${amt} แล้ว 🧧`);
};

// Red envelope received from bot
window.__isimReceiveRedEnvelope = function(amount, senderName) {
    cfg().bank.transactions.unshift({
        type: 'receive', amount: Number(amount),
        from: senderName, note: 'อั่งเปา 🧧', date: Date.now()
    });
    cfg().bank.balance += Number(amount);
    save();
    // Show notification
    showHomeNotif(`🧧 ${senderName} ส่งอั่งเปา ฿${amount} มาให้!`);
    renderBank();
};

function showHomeNotif(text) {
    const container = document.getElementById('isim-home-notifs');
    if (!container) return;
    const card = document.createElement('div');
    card.className = 'isim-notif-card';
    card.innerHTML = `<div class="isim-notif-app">📱 Messages</div><div class="isim-notif-msg">${esc(text)}</div>`;
    container.appendChild(card);
    setTimeout(() => card.remove(), 5000);
}

// ===== STORIES =====
window.__isimAddMyStory = function() {
    document.getElementById('isim-story-input')?.click();
};
window.__isimUploadStory = function(input) {
    const f = input.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => {
        const story = { id: Date.now(), isMe: true, image: e.target.result, timestamp: Date.now() };
        if (!cfg().stories) cfg().stories = [];
        // Remove expired
        cfg().stories = cfg().stories.filter(s => Date.now() - s.timestamp < 24*3600000);
        cfg().stories.push(story);
        save(); renderStoriesBar();
        toast('Story posted!');
        window.__isimViewMyStory();
    };
    r.readAsDataURL(f); input.value = '';
};
window.__isimViewMyStory = function() {
    const stories = (cfg().stories||[]).filter(s => s.isMe && Date.now() - s.timestamp < 24*3600000);
    if (!stories.length) { toast('No stories yet'); return; }
    openStoryViewer(stories[stories.length-1], 'You');
};

let playerName2 = 'User';
function openStoryViewer(story, name, avatar='') {
    const viewer = document.getElementById('isim-story-viewer');
    const img = document.getElementById('isim-story-img');
    const nm = document.getElementById('isim-story-user-nm');
    const av = document.getElementById('isim-story-user-av');
    const overlay = document.getElementById('isim-story-text-overlay');
    if (!viewer || !img) return;
    img.style.backgroundImage = story.image ? `url(${story.image})` : '';
    img.style.background = story.image ? '' : 'linear-gradient(135deg,#1a1a2e,#0f3460)';
    nm.textContent = name;
    av.src = avatar || '';
    if (story.text) { overlay.textContent = story.text; overlay.classList.add('show'); }
    else overlay.classList.remove('show');
    viewer.classList.add('show');

    // Progress bar
    const prog = document.getElementById('isim-story-progress');
    prog.innerHTML = '<div class="isim-story-prog-seg"><div class="isim-story-prog-fill" id="isim-story-prog-fill"></div></div>';
    setTimeout(() => {
        const fill = document.getElementById('isim-story-prog-fill');
        if (fill) { fill.style.transition = 'width 5s linear'; fill.style.width = '100%'; }
    }, 100);
    setTimeout(() => window.__isimCloseStory(), 5100);
}

window.__isimCloseStory = function() {
    document.getElementById('isim-story-viewer')?.classList.remove('show');
};
window.__isimReplyStory = function() {
    const text = document.getElementById('isim-story-reply-inp')?.value.trim();
    if (!text) return;
    document.getElementById('isim-story-reply-inp').value = '';
    window.__isimCloseStory();
    if (activeFriend) {
        const msg = { from: 'user', content: `[Replied to story: "${text}"]`, time: now() };
        window.__isimNav('chat');
        appendBubble(msg); saveMsg(msg); pendingMessages.push(msg);
    }
    toast('Reply sent');
};

// ===== FRIENDS =====
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
            { id: 'demo1', name: 'Aria', avatar: '', persona: 'A friendly and warm person who loves to chat.' },
            { id: 'demo2', name: 'Leo', avatar: '', persona: 'Cool, laid-back, loves music and art.' },
        ];
    }
    list._bots = bots;
    renderFriendList(bots);
};

function renderFriendList(bots) {
    const list = document.getElementById('isim-flist');
    if (!list) return;
    const added = new Set((cfg().friends||[]).map(f => f.id));
    list.innerHTML = bots.map(b => `
        <div class="isim-friend-row" onclick="window.__isimPickFriend('${esc(b.id)}')">
            <div style="width:48px;height:48px;border-radius:50%;background:var(--bg3);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;">
                ${b.avatar ? `<img src="${esc(b.avatar)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">` : b.name[0]}
            </div>
            <div class="isim-friend-info">
                <div class="isim-friend-name">${esc(b.name)}</div>
                <div class="isim-friend-bio">${esc((b.persona||'').substring(0,50))}</div>
            </div>
            ${added.has(b.id)
                ? `<span style="font-size:12px;color:var(--green)">✓ Added</span>`
                : `<button class="isim-friend-add" onclick="event.stopPropagation();window.__isimAddFriend('${esc(b.id)}')">Add</button>`
            }
        </div>`).join('');
}

window.__isimFilterFriends = function(q) {
    const list = document.getElementById('isim-flist');
    if (!list?._bots) return;
    renderFriendList(list._bots.filter(b => b.name.toLowerCase().includes(q.toLowerCase())));
};
window.__isimAddFriend = function(id) {
    const list = document.getElementById('isim-flist');
    const bot = list?._bots?.find(b => b.id === id);
    if (!bot) return;
    if (!cfg().friends.find(f => f.id === id)) {
        cfg().friends.push(bot); save();
        toast(`${bot.name} added! 👋`);
        renderFriendList(list._bots);
        renderMessageList();
    }
};
window.__isimPickFriend = function(id) {
    const f = cfg().friends.find(f => f.id === id);
    if (f) { activeFriend = f; pendingMessages = []; window.__isimNav('chat'); return; }
    const list = document.getElementById('isim-flist');
    const bot = list?._bots?.find(b => b.id === id);
    if (bot) { cfg().friends.push(bot); save(); activeFriend = bot; pendingMessages = []; window.__isimNav('chat'); }
};

// ===== CALL =====
window.__isimStartCall = function() {
    if (!activeFriend) { toast('Select a contact first'); return; }
    const f = activeFriend;
    document.getElementById('isim-call-bg').style.backgroundImage = `url(${f.avatar||''})`;
    document.getElementById('isim-call-av').src = f.avatar||'';
    document.getElementById('isim-call-name').textContent = f.name;
    document.getElementById('isim-call-stat').textContent = 'Calling...';
    document.getElementById('isim-call-dur').textContent = '0:00';
    document.getElementById('isim-call-float').innerHTML = '';
    document.getElementById('isim-call').classList.add('show');
    callActive = true; callTimer = 0;

    setTimeout(() => {
        if (!callActive) return;
        document.getElementById('isim-call-stat').textContent = 'Connected';
        callInterval = setInterval(() => {
            callTimer++;
            const m = Math.floor(callTimer/60), s = callTimer%60;
            document.getElementById('isim-call-dur').textContent = `${m}:${String(s).padStart(2,'0')}`;
        }, 1000);
        showCallFloat('สวัสดี! รับสายแล้วนะ 👋');
    }, 1500);
};
window.__isimEndCall = function() {
    callActive = false; clearInterval(callInterval);
    document.getElementById('isim-call').classList.remove('show');
    toast('Call ended');
};
window.__isimMute = function() {
    callMuted = !callMuted;
    document.getElementById('isim-mute-circle')?.classList.toggle('on', callMuted);
    toast(callMuted ? 'Muted' : 'Unmuted');
};
window.__isimCallSend = async function() {
    const inp = document.getElementById('isim-call-inp');
    const text = inp.value.trim();
    if (!text || !activeFriend) return;
    inp.value = '';
    showCallFloat(text, true);

    const typing = document.getElementById('isim-call-typing');
    if (typing) typing.style.display = 'block';

    try {
        const ctx = SillyTavern.getContext();
        const prompt = `You are ${activeFriend.name}. ${activeFriend.persona||''} You are on a phone call. Reply in 1-2 short sentences. No emojis. No <think> tags.
${activeFriend.name} said: "${text}"
${activeFriend.name}:`;
        let reply = '';
        if (typeof ctx.generateQuietPrompt === 'function') {
            reply = await ctx.generateQuietPrompt(prompt, false, false);
        }
        reply = cleanThink(reply).trim();
        if (reply.startsWith(activeFriend.name+':')) reply = reply.slice(activeFriend.name.length+1).trim();
        if (typing) typing.style.display = 'none';
        if (callActive) showCallFloat(reply || '...');
    } catch {
        if (typing) typing.style.display = 'none';
    }
};

function showCallFloat(text, isUser=false) {
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
    setTimeout(() => { if (callActive) c.innerHTML = ''; }, delay + 3000);
}

// ===== BANK =====
function renderBank() {
    const bank = cfg().bank;
    const el = document.getElementById('isim-bank-accnum');
    const bal = document.getElementById('isim-bank-bal');
    if (el) el.textContent = bank.accountNumber;
    if (bal) bal.textContent = bank.balance.toLocaleString('th-TH', { minimumFractionDigits: 2 });

    const list = document.getElementById('isim-tx-list');
    if (!list) return;
    if (!bank.transactions.length) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--txt3);">ไม่มีรายการ</div>';
        return;
    }
    list.innerHTML = bank.transactions.slice(0, 20).map(tx => `
        <div class="isim-tx-row">
            <div class="isim-tx-icon ${tx.type === 'receive' ? 'isim-tx-receive' : 'isim-tx-send'}">
                ${tx.type === 'receive' ? '⬇' : '⬆'}
            </div>
            <div class="isim-tx-info">
                <div class="isim-tx-from">${esc(tx.type === 'receive' ? (tx.from||'Unknown') : (tx.to||'Unknown'))}</div>
                <div class="isim-tx-note">${esc(tx.note||'')}</div>
                <div class="isim-tx-date">${fmtDate(tx.date)}</div>
            </div>
            <div class="isim-tx-amt ${tx.type === 'receive' ? 'green' : 'red'}">
                ${tx.type === 'receive' ? '+' : '-'}฿${Number(tx.amount).toLocaleString()}
            </div>
        </div>`).join('');
}
window.__isimRefreshBank = function() { renderBank(); toast('Updated'); };
window.__isimBankTransfer = function() {
    const to = prompt('โอนหาใคร?'); if (!to) return;
    const amount = Number(prompt('จำนวนเงิน (บาท)?'));
    if (!amount || amount <= 0) { toast('ยกเลิก'); return; }
    if (amount > cfg().bank.balance) { toast('ยอดเงินไม่พอ'); return; }
    cfg().bank.balance -= amount;
    cfg().bank.transactions.unshift({ type:'send', amount, to, note:'โอนเงิน', date:Date.now() });
    save(); renderBank(); toast(`โอน ฿${amount} ให้ ${to} สำเร็จ`);
};
window.__isimBankScan = function() { toast('QR Code scanner — feature coming soon'); };
window.__isimBankTop = function() {
    const amount = Number(prompt('เติมเงินเท่าไหร่?'));
    if (!amount || amount <= 0) { toast('ยกเลิก'); return; }
    cfg().bank.balance += amount;
    cfg().bank.transactions.unshift({ type:'receive', amount, from:'เติมเงิน', note:'Top up', date:Date.now() });
    save(); renderBank(); toast(`เติมเงิน ฿${amount} สำเร็จ`);
};

// ===== SHOP =====
const shopProducts = [
    { name: 'AirPods Pro', price: 7990, old: 9990, emoji: '🎧', cat: 'electronics' },
    { name: 'เคสไอโฟน', price: 290, old: 490, emoji: '📱', cat: 'accessories' },
    { name: 'กระเป๋าหนัง', price: 1290, old: 1890, emoji: '👜', cat: 'fashion' },
    { name: 'สนีกเกอร์', price: 3490, old: 4990, emoji: '👟', cat: 'fashion' },
    { name: 'หูฟัง Gaming', price: 1890, old: 2490, emoji: '🎮', cat: 'electronics' },
    { name: 'นาฬิกา Smart', price: 4990, old: 6990, emoji: '⌚', cat: 'electronics' },
    { name: 'ลิปสติก', price: 390, old: 590, emoji: '💄', cat: 'beauty' },
    { name: 'แว่นกันแดด', price: 890, old: 1290, emoji: '🕶', cat: 'accessories' },
    { name: 'กล้อง Polaroid', price: 2490, old: 3200, emoji: '📷', cat: 'electronics' },
    { name: 'ชุดเดรส', price: 990, old: 1490, emoji: '👗', cat: 'fashion' },
];

let currentCat = 'all';
let shopSearch = '';

function renderShop() {
    renderShopGrid();
    renderCartBadge();
}

function renderShopGrid() {
    const grid = document.getElementById('isim-shop-grid');
    if (!grid) return;
    const filtered = shopProducts.filter(p => {
        const matchCat = currentCat === 'all' || p.cat === currentCat;
        const matchSearch = !shopSearch || p.name.toLowerCase().includes(shopSearch.toLowerCase());
        return matchCat && matchSearch;
    });
    grid.innerHTML = filtered.map(p => `
        <div class="isim-product-card">
            <div class="isim-product-img">${p.emoji}</div>
            <div class="isim-product-info">
                <div class="isim-product-name">${esc(p.name)}</div>
                <div class="isim-product-price">฿${p.price.toLocaleString()}</div>
                <div class="isim-product-old">฿${p.old.toLocaleString()}</div>
                <button class="isim-add-cart" onclick="window.__isimAddToCart('${esc(p.name)}',${p.price},'${p.emoji}')">+ ใส่ตะกร้า</button>
            </div>
        </div>`).join('');
}

window.__isimFilterCat = function(cat, el) {
    currentCat = cat;
    document.querySelectorAll('.isim-cat-chip').forEach(c => c.classList.remove('on'));
    if (el) el.classList.add('on');
    renderShopGrid();
};
window.__isimFilterShop = function(q) { shopSearch = q; renderShopGrid(); };
window.__isimAddToCart = function(name, price, emoji) {
    if (!cfg().cart) cfg().cart = [];
    const existing = cfg().cart.find(i => i.name === name);
    if (existing) { existing.qty++; } else { cfg().cart.push({ name, price, emoji, qty: 1 }); }
    save(); renderCartBadge(); toast(`เพิ่ม ${name} ลงตะกร้า 🛒`);
};
function renderCartBadge() {
    const badge = document.getElementById('isim-cart-count');
    if (!badge) return;
    const total = (cfg().cart||[]).reduce((s, i) => s + i.qty, 0);
    badge.textContent = total;
    badge.style.display = total > 0 ? 'flex' : 'none';
}
window.__isimOpenCart = function() {
    renderCartItems();
    document.getElementById('isim-cart-sheet')?.classList.add('show');
};
function renderCartItems() {
    const list = document.getElementById('isim-cart-items');
    const totalEl = document.getElementById('isim-cart-total');
    if (!list) return;
    const cart = cfg().cart || [];
    if (!cart.length) {
        list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--txt3);">ตะกร้าว่าง</div>';
        if (totalEl) totalEl.textContent = '฿0';
        return;
    }
    let total = 0;
    list.innerHTML = cart.map((item, i) => {
        total += item.price * item.qty;
        return `<div class="isim-cart-item">
            <div class="isim-cart-em">${item.emoji}</div>
            <div class="isim-cart-info">
                <div class="isim-cart-nm">${esc(item.name)}</div>
                <div class="isim-cart-pr">฿${item.price.toLocaleString()} x ${item.qty}</div>
            </div>
            <div class="isim-cart-qty">
                <button class="isim-qty-btn" onclick="window.__isimQty(${i},-1)">−</button>
                <span style="font-size:14px;color:var(--txt);min-width:20px;text-align:center;">${item.qty}</span>
                <button class="isim-qty-btn" onclick="window.__isimQty(${i},1)">+</button>
            </div>
        </div>`;
    }).join('');
    if (totalEl) totalEl.textContent = `฿${total.toLocaleString()}`;
}
window.__isimQty = function(idx, delta) {
    const cart = cfg().cart || [];
    if (!cart[idx]) return;
    cart[idx].qty += delta;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
    save(); renderCartItems(); renderCartBadge();
};
window.__isimCheckout = function() {
    const cart = cfg().cart || [];
    if (!cart.length) { toast('ตะกร้าว่าง'); return; }
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    if (total > cfg().bank.balance) { toast('ยอดเงินไม่พอ'); return; }
    cfg().bank.balance -= total;
    cfg().bank.transactions.unshift({ type:'send', amount:total, to:'Shop', note:`ซื้อสินค้า ${cart.length} รายการ`, date:Date.now() });
    if (!cfg().shop.orders) cfg().shop.orders = [];
    cfg().shop.orders.push({ items:[...cart], total, date:Date.now(), status:'Processing' });
    cfg().cart = [];
    save(); renderCartBadge();
    document.getElementById('isim-cart-sheet')?.classList.remove('show');
    toast(`✅ สั่งซื้อสำเร็จ! ฿${total.toLocaleString()}`);
    showHomeNotif(`🛍 สั่งซื้อสำเร็จ ฿${total.toLocaleString()} — กำลังจัดส่ง`);
};

// ===== TWITTER / X =====
const defaultTweets = [
    { id: 1, user: 'TechNews_TH', handle: '@technews_th', body: 'iPhone 17 จะมาพร้อมกล้อง 200MP แบตอัพเกรดใหม่ ราคาเริ่มต้นที่ 40,000 บาท! 🔥📱', likes: 234, retweets: 89, replies: 45, time: '2h', liked: false, retweeted: false },
    { id: 2, user: 'BKK Foodie', handle: '@bkkfoodie', body: 'ร้านใหม่เปิดแถวทองหล่อ 🍜 ราเมนซุปใสแบบญี่ปุ่น อร่อยมากก กลับไปกินอีกแน่นอน!', likes: 567, retweets: 123, replies: 78, time: '4h', liked: false, retweeted: false },
    { id: 3, user: 'BLACKPINK', handle: '@BLACKPINK', body: 'BORN PINK WORLD TOUR THAILAND 🌸🖤 See you Bangkok! Ready? 💕', likes: 45230, retweets: 12400, replies: 8900, time: '6h', liked: false, retweeted: false },
    { id: 4, user: 'MusicVibes', handle: '@musicvibes', body: 'เพลงนี้ฟังแล้วรู้สึกดีมากกก อยากให้ทุกคนได้ฟัง 🎵✨ #NewMusic #Chill', likes: 892, retweets: 234, replies: 56, time: '8h', liked: false, retweeted: false },
    { id: 5, user: 'WealthTips', handle: '@wealthtips_th', body: 'เคล็ดลับ: เก็บเงิน 20% ของรายได้ทุกเดือน แล้วลงทุนในกองทุน ภายใน 10 ปี คุณจะตกใจกับผลลัพธ์ 📈', likes: 3421, retweets: 1567, replies: 234, time: '10h', liked: false, retweeted: false },
];

let tweets = [];
let tweetImgAttach = null;

function renderTwitter() {
    // Merge with saved tweets
    if (!cfg().tweets || !cfg().tweets.length) {
        cfg().tweets = JSON.parse(JSON.stringify(defaultTweets));
        save();
    }
    tweets = cfg().tweets;
    renderTweetFeed();
}

function renderTweetFeed() {
    const feed = document.getElementById('isim-tweet-feed');
    if (!feed) return;
    feed.innerHTML = tweets.map(t => `
        <div class="isim-tweet" id="tweet-${t.id}">
            <div class="isim-tweet-top">
                <div class="isim-tweet-av" style="background:linear-gradient(135deg,#${Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')},#333);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:16px;">${t.user[0]}</div>
                <div class="isim-tweet-meta">
                    <div style="display:flex;align-items:center;gap:4px;">
                        <span class="isim-tweet-name">${esc(t.user)}</span>
                        ${t.isMe ? '' : '<span style="color:var(--accent);font-size:12px;">✓</span>'}
                    </div>
                    <span class="isim-tweet-handle">${esc(t.handle)} · ${esc(t.time)}</span>
                </div>
            </div>
            <div class="isim-tweet-body">${esc(t.body)}</div>
            ${t.image ? `<img class="isim-tweet-img" src="${esc(t.image)}" alt="">` : ''}
            ${(t.replies_list||[]).map(r => `<div class="isim-reply"><div class="isim-reply-user">${esc(r.user)}</div>${esc(r.body)}</div>`).join('')}
            <div class="isim-tweet-actions">
                <button class="isim-tweet-act" onclick="window.__isimTweetReply(${t.id})">💬 <span>${t.replies}</span></button>
                <button class="isim-tweet-act ${t.retweeted?'retweeted':''}" onclick="window.__isimRetweet(${t.id})">🔁 <span>${t.retweets}</span></button>
                <button class="isim-tweet-act ${t.liked?'liked':''}" onclick="window.__isimLikeTweet(${t.id})">❤ <span>${t.likes}</span></button>
                <button class="isim-tweet-act" onclick="window.__isimShareTweet(${t.id})">📤</button>
            </div>
        </div>`).join('');
}

window.__isimXTab = function(tab, el) {
    document.querySelectorAll('.isim-x-tab').forEach(t => t.classList.remove('on'));
    if (el) el.classList.add('on');
    // Could filter differently per tab
    renderTweetFeed();
};
window.__isimLikeTweet = function(id) {
    const t = tweets.find(t => t.id === id);
    if (!t) return;
    t.liked = !t.liked;
    t.likes += t.liked ? 1 : -1;
    cfg().tweets = tweets; save();
    renderTweetFeed();
};
window.__isimRetweet = function(id) {
    const t = tweets.find(t => t.id === id);
    if (!t) return;
    t.retweeted = !t.retweeted;
    t.retweets += t.retweeted ? 1 : -1;
    cfg().tweets = tweets; save();
    renderTweetFeed();
    if (t.retweeted) toast('Retweeted!');
};
window.__isimTweetReply = async function(id) {
    const t = tweets.find(t => t.id === id);
    if (!t) return;
    const text = prompt(`Reply to ${t.user}:`);
    if (!text) return;
    if (!t.replies_list) t.replies_list = [];
    t.replies_list.push({ user: 'You', body: text });
    t.replies++;
    cfg().tweets = tweets; save();

    // Simulate bot reply to reply
    setTimeout(() => {
        if (!t.replies_list) t.replies_list = [];
        const botReplies = [
            'ขอบคุณที่แชร์นะ! 😊', 'เห็นด้วยเลย!', 'โอ้โห จริงด้วย! 🙌',
            'ขอบคุณมากก!', 'อยากรู้เพิ่มเติมอีก!', '555 ฮามากก 😂',
        ];
        t.replies_list.push({ user: t.user, body: botReplies[Math.floor(Math.random()*botReplies.length)] });
        t.replies++;
        cfg().tweets = tweets; save();
        renderTweetFeed();
    }, 1500 + Math.random()*2000);

    renderTweetFeed();
};
window.__isimShareTweet = function(id) { toast('Link copied! 🔗'); };
window.__isimOpenCompose = function() {
    document.getElementById('isim-tweet-composer')?.classList.add('show');
    tweetImgAttach = null;
    document.getElementById('isim-tweet-img-preview').textContent = '';
    document.getElementById('isim-tweet-area').value = '';
};
window.__isimCloseCompose = function() {
    document.getElementById('isim-tweet-composer')?.classList.remove('show');
};
window.__isimAttachTweetImg = function(input) {
    const f = input.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => {
        tweetImgAttach = e.target.result;
        document.getElementById('isim-tweet-img-preview').textContent = '📷 Image attached';
    };
    r.readAsDataURL(f); input.value = '';
};
window.__isimPostTweet = function() {
    const text = document.getElementById('isim-tweet-area')?.value.trim();
    if (!text) { toast('Write something first'); return; }
    const newTweet = {
        id: Date.now(),
        user: 'You',
        handle: '@you',
        body: text,
        likes: 0, retweets: 0, replies: 0,
        time: 'now',
        liked: false, retweeted: false,
        isMe: true,
        image: tweetImgAttach || null,
        replies_list: [],
    };
    tweets.unshift(newTweet);
    cfg().tweets = tweets; save();
    window.__isimCloseCompose();
    renderTweetFeed();
    toast('Posted! 🚀');

    // Simulate engagement after delay
    setTimeout(() => {
        const t = tweets.find(t => t.id === newTweet.id);
        if (!t) return;
        t.likes += Math.floor(Math.random()*10)+1;
        t.retweets += Math.floor(Math.random()*3);
        if (!t.replies_list) t.replies_list = [];
        const autoReplies = ['Nice post! 👍', 'เห็นด้วยเลย!', '555 โคตรจริง', 'Save แล้ว!', 'Relatable มากก 🥹'];
        t.replies_list.push({ user: 'follower_' + Math.floor(Math.random()*100), body: autoReplies[Math.floor(Math.random()*autoReplies.length)] });
        t.replies++;
        cfg().tweets = tweets; save();
        renderTweetFeed();
    }, 3000);
};

// ===== SETTINGS =====
window.__isimClearChat = function() {
    const fid = activeFriend?.id;
    if (!fid) { toast('Open a chat first'); return; }
    if (!confirm(`ลบแชทของ ${activeFriend.name}?`)) return;
    cfg().history[fid] = []; save(); loadHistory(fid); toast('Chat cleared');
};
window.__isimResetAll = function() {
    if (!confirm('รีเซ็ตทุกอย่าง? ข้อมูลจะหายหมด')) return;
    localStorage.removeItem(LS); _cfg = null; activeFriend = null; pendingMessages = [];
    toast('Reset done — please refresh');
};

// ===== INPUT / BINDING =====
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

// ===== SETTINGS PANEL (ST) =====
function loadSettings() {
    $('.isim-st-panel').remove();
    const html = `
    <div class="isim-st-panel">
      <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
          <b>iPhone Simulator v2</b>
          <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
          <div class="styled_description_block">
            กดปุ่ม 📱 เพื่อเปิดมือถือ<br>
            <small>• Messages + Contacts merged</small><br>
            <small>• Bank, Shop, X/Twitter</small><br>
            <small>• Stories, Notes 24h, Bot Notes</small>
          </div>
          <hr><small style="color:#888">v2.0.0</small>
        </div>
      </div>
    </div>`;
    $('#extensions_settings').append(html);
}

function injectWandButton() {
    if (document.getElementById('isim-wand-btn')) return;
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return;
    const li = document.createElement('li');
    li.id = 'isim-wand-btn';
    li.style.cssText = 'cursor:pointer;padding:8px 16px;display:flex;align-items:center;gap:8px;font-size:14px;';
    li.innerHTML = '<span>📱</span><span>iPhone Simulator</span>';
    li.addEventListener('click', () => {
        document.getElementById('extensionsMenu')?.classList.remove('show');
        document.querySelector('.extensions-menu-button')?.click();
        openPhone();
    });
    const first = menu.querySelector('li');
    if (first) menu.insertBefore(li, first);
    else menu.appendChild(li);
}

// ===== BOOTSTRAP =====
jQuery(async () => {
    injectCSS();
    injectHTML();
    loadSettings();

    setTimeout(() => {
        bindInput();
        document.getElementById('isim-home').style.display = 'flex';
        startClock();

        injectWandButton();
        if (!document.getElementById('isim-wand-btn')) {
            const obs = new MutationObserver(() => {
                if (document.getElementById('extensionsMenu')) {
                    injectWandButton();
                    if (document.getElementById('isim-wand-btn')) obs.disconnect();
                }
            });
            obs.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => obs.disconnect(), 10000);
        }
        document.addEventListener('click', e => {
            const wandBtn = e.target.closest('.fa-magic,.fa-wand-magic-sparkles,[data-i18n="Extensions Menu"],.extensions-menu-button');
            if (wandBtn) setTimeout(injectWandButton, 50);
        });
    }, 300);

    console.log('[iPhone-Sim] v2.0.0 loaded');
});
