// iPhone Simulator v3.0 — SillyTavern Extension
// Revised: X-style UI, story image reading, sticker reading, message edit/delete,
// per-chat customization, call fix, location name input, bot uses stickers/notes/redenv,
// story 24h expiry, notifications on bot reply/story reply, {{user}} avatar, no emoji in code

const extensionName = 'iphone-simulator';
const LS = 'isim_v3';
const DEF = {
    theme: 'dark',
    accent: '#0a84ff',
    friends: [],
    history: {},
    notes: {},
    botnotes: {},
    stickers: [],      // [{src, meaning}]
    wallpapers: {},
    pinnedChats: [],
    tweets: [],
    stories: [],       // [{id, isMe, uid, image, imageMeaning, text, timestamp}]
    bank: {
        accountNumber: '123-4-56789-0',
        balance: 12500.00,
        transactions: [
            { type: 'receive', amount: 500, from: 'Alex', note: 'Red Envelope', date: Date.now() - 3600000 },
            { type: 'receive', amount: 200, from: 'Sam', note: 'Red Envelope', date: Date.now() - 86400000 },
            { type: 'send', amount: 150, to: 'Mom', note: 'Food money', date: Date.now() - 172800000 },
        ]
    },
    cart: [],
    shop: { orders: [] }
};

let _cfg = null;
function cfg() {
    if (_cfg) return _cfg;
    try {
        _cfg = JSON.parse(JSON.stringify(DEF));
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
        } else { target[k] = src[k]; }
    }
    return target;
}
function save() { try { localStorage.setItem(LS, JSON.stringify(_cfg || cfg())); } catch {} }

// ---- State ----
let phoneOpen = false;
let activeFriend = null;
let isTyping = false;
let callActive = false;
let callTimer = 0;
let callInterval = null;
let callMuted = false;
let currentScreen = 'home';
let pendingMessages = [];
let botAbortController = null;
let editModeActive = false;

// ---- CSS ----
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
    transition:transform .2s !important;padding:0 !important;color:#fff !important;font-size:22px !important;
}
#isim-fab:hover{transform:scale(1.1) !important;}

/* Gen bar */
#isim-gen-bar { flex-shrink:0; }
#isim-gen-bar button { transition:opacity .15s; }
#isim-gen-bar button:disabled { opacity:0.5; pointer-events:none; }
#isim-botsendbtn { letter-spacing:.3px; }

/* Chat settings panel */
#isim-chat-settings { border-bottom:1px solid var(--sep); }

/* Notes bar instagram style */
#isim-notes-bar::-webkit-scrollbar { display:none; }
#isim-notes-bar { scroll-behavior:smooth; }

/* Call history modals */
#isim-call-history, #isim-call-transcript { background:var(--bg) !important; }

/* Overlay */
#isim-phone{
    position:fixed !important;top:0 !important;left:0 !important;right:0 !important;bottom:0 !important;
    z-index:2147483646 !important;display:none !important;
    align-items:center !important;justify-content:center !important;
    background:rgba(0,0,0,.85) !important;backdrop-filter:blur(16px) !important;
}
#isim-phone.open{display:flex !important;}

/* iPhone Frame — X/Twitter dark aesthetic */
#isim-frame{
    width:390px;height:844px;max-height:95vh;
    border-radius:44px;border:10px solid #1a1a1a;
    box-shadow:0 0 0 2px #2f2f2f,0 40px 120px rgba(0,0,0,.98),inset 0 0 0 1px rgba(255,255,255,.06);
    overflow:hidden;display:flex;flex-direction:column;position:relative;
    font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif;
}
#isim-frame.dark{
    --bg:#000;--bg2:#111;--bg3:#1a1a1a;--bg4:#2a2a2a;
    --txt:#e7e9ea;--txt2:#71767b;--txt3:#3d4044;
    --sep:#2f3336;--bub-out:#1d9bf0;--bub-in:#1a1a1a;--inp:#1a1a1a;
    --accent:#1d9bf0;--green:#00ba7c;--red:#f4212e;--orange:#ff9f0a;
    --like:#f91880;--rt:#00ba7c;
}
#isim-frame.light{
    --bg:#f2f2f7;--bg2:#fff;--bg3:#e5e5ea;--bg4:#d1d1d6;
    --txt:#0f1419;--txt2:#536471;--txt3:#aab8c2;
    --sep:#eff3f4;--bub-out:#1d9bf0;--bub-in:#eff3f4;--inp:#fff;
    --accent:#1d9bf0;--green:#00ba7c;--red:#f4212e;--orange:#ff9500;
    --like:#f91880;--rt:#00ba7c;
}

/* Dynamic Island */
#isim-island{
    position:absolute;top:12px;left:50%;transform:translateX(-50%);
    width:126px;height:37px;background:#000;border-radius:20px;z-index:10;
    transition:width .3s cubic-bezier(.34,1.56,.64,1),height .3s cubic-bezier(.34,1.56,.64,1);
}

/* Status Bar */
#isim-sb{
    background:var(--bg);height:54px;display:flex;
    align-items:flex-end;justify-content:space-between;
    padding:0 30px 8px;flex-shrink:0;
}
#isim-sb-time{font-size:15px;font-weight:700;color:var(--txt);}
#isim-sb-icons{font-size:12px;color:var(--txt);display:flex;gap:6px;align-items:center;}

/* Home bar pill (iOS-style bottom gesture area) */
.isim-home-bar{
    position:absolute;bottom:6px;left:50%;transform:translateX(-50%);
    width:134px;height:5px;background:rgba(255,255,255,.3);border-radius:3px;z-index:200;
}

/* Screen Container */
#isim-screen{flex:1;overflow:hidden;position:relative;background:var(--bg);}

/* Home Screen */
#isim-home{
    position:absolute;inset:0;
    background:linear-gradient(160deg,#000 0%,#0a0a0f 40%,#060d1a 70%,#000 100%);
    display:flex;flex-direction:column;overflow:hidden;
}
#isim-home-wallpaper{
    position:absolute;inset:0;background-size:cover;background-position:center;
    opacity:0.35;z-index:0;
}
.isim-home-content{position:relative;z-index:1;display:flex;flex-direction:column;flex:1;}
#isim-home-time-big{
    font-size:76px;font-weight:200;color:#fff;text-align:center;
    padding-top:14px;letter-spacing:-4px;
}
#isim-home-date{font-size:16px;color:rgba(255,255,255,.6);text-align:center;margin-top:-10px;font-weight:400;}

/* Notification Cards (iOS-style at top) */
#isim-notif-tray{
    position:absolute;top:54px;left:0;right:0;z-index:500;padding:0 12px;pointer-events:none;
}
.isim-notif-card{
    margin-bottom:8px;background:rgba(18,18,18,.92);backdrop-filter:blur(30px);
    border-radius:16px;padding:12px 14px;border:0.5px solid rgba(255,255,255,.1);
    animation:slideDown .35s cubic-bezier(.34,1.56,.64,1);pointer-events:all;
    box-shadow:0 4px 20px rgba(0,0,0,.5);
}
@keyframes slideDown{from{opacity:0;transform:translateY(-15px)}to{opacity:1;transform:none}}
.isim-notif-app{font-size:11px;color:rgba(255,255,255,.45);margin-bottom:3px;display:flex;align-items:center;gap:6px;}
.isim-notif-msg{font-size:14px;color:#e7e9ea;line-height:1.35;}

/* App Grid */
.isim-app-grid{
    display:grid;grid-template-columns:repeat(4,1fr);gap:14px;
    padding:14px 20px;
}
.isim-dock{
    display:grid;grid-template-columns:repeat(4,1fr);gap:12px;
    padding:12px 20px 10px;
    background:rgba(30,30,35,.7);backdrop-filter:blur(30px);
    border-radius:28px;margin:8px 16px 8px;
}
.isim-app-btn{
    display:flex;flex-direction:column;align-items:center;gap:5px;
    cursor:pointer;background:none;border:none;
    transition:transform .15s;
}
.isim-app-btn:active{transform:scale(.88);}
.isim-icon{
    width:60px;height:60px;border-radius:15px;
    display:flex;align-items:center;justify-content:center;font-size:26px;
    box-shadow:0 4px 14px rgba(0,0,0,.5);position:relative;
}
.isim-app-label{font-size:11px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.8);text-align:center;}
.isim-icon-badge{
    position:absolute;top:-4px;right:-4px;
    background:#f4212e;color:#fff;font-size:9px;font-weight:700;
    border-radius:8px;min-width:16px;height:16px;
    display:flex;align-items:center;justify-content:center;padding:0 3px;
    border:1.5px solid #000;
}

/* App icon colors — X/dark palette */
.ic-msg{background:linear-gradient(145deg,#1d9bf0,#0a5a8a);}
.ic-bank{background:linear-gradient(145deg,#ff9f0a,#c46a00);}
.ic-shop{background:linear-gradient(145deg,#f4212e,#a0000f);}
.ic-x{background:#000;border:1px solid #2f3336;}
.ic-set{background:linear-gradient(145deg,#3a3a3c,#1c1c1e);}

.isim-bar{height:5px;width:134px;background:rgba(255,255,255,.2);border-radius:3px;margin:6px auto 4px;}

/* Generic Screen */
.isim-screen{position:absolute;inset:0;display:none;flex-direction:column;background:var(--bg);}
.isim-screen.show{display:flex;}

/* Nav Bar */
.isim-nav{
    height:44px;background:var(--bg2);backdrop-filter:blur(20px);
    border-bottom:0.5px solid var(--sep);
    display:flex;align-items:center;padding:0 14px;flex-shrink:0;
    position:relative;
}
.isim-nav-back{
    background:none;border:none;color:var(--accent);
    font-size:20px;cursor:pointer;padding:4px 8px 4px 0;
    display:flex;align-items:center;gap:2px;min-width:44px;font-weight:300;
}
.isim-nav-title{
    position:absolute;left:50%;transform:translateX(-50%);
    font-size:17px;font-weight:700;color:var(--txt);white-space:nowrap;
}
.isim-nav-action{background:none;border:none;color:var(--accent);font-size:16px;cursor:pointer;padding:4px;margin-left:auto;}

/* Stories bar */
#isim-stories-bar{
    display:flex;gap:12px;padding:12px 16px;
    background:var(--bg);border-bottom:0.5px solid var(--sep);
    overflow-x:auto;flex-shrink:0;
}
#isim-stories-bar::-webkit-scrollbar{display:none;}
.isim-story-item{
    display:flex;flex-direction:column;align-items:center;gap:5px;flex-shrink:0;cursor:pointer;
}
.isim-story-ring{
    width:56px;height:56px;border-radius:50%;
    background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);
    padding:3px;box-sizing:border-box;
}
.isim-story-ring.seen{background:var(--sep);}
.isim-story-ring.add{
    background:var(--bg2);border:1.5px dashed var(--txt2);
    display:flex;align-items:center;justify-content:center;font-size:24px;
}
.isim-story-av{
    width:100%;height:100%;border-radius:50%;background:var(--bg3);
    object-fit:cover;border:2.5px solid var(--bg);
}
.isim-story-name{font-size:10px;color:var(--txt2);max-width:60px;text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}

/* Notes bar */
#isim-notes-bar{
    display:flex;gap:10px;padding:8px 16px;
    background:var(--bg);border-bottom:0.5px solid var(--sep);
    overflow-x:auto;flex-shrink:0;align-items:center;
}
#isim-notes-bar::-webkit-scrollbar{display:none;}
.isim-note-bubble{
    display:flex;align-items:center;gap:7px;flex-shrink:0;cursor:pointer;
}
.isim-note-av{width:38px;height:38px;border-radius:50%;background:var(--bg3);object-fit:cover;flex-shrink:0;}
.isim-note-speech{
    background:var(--bg2);border:0.5px solid var(--sep);
    border-radius:14px 14px 14px 4px;padding:6px 10px;
    font-size:11px;color:var(--txt);max-width:110px;
    overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
}

/* Chat list rows */
.isim-chat-row{
    display:flex;align-items:center;gap:12px;
    padding:12px 16px;border-bottom:0.5px solid var(--sep);
    cursor:pointer;position:relative;transition:background .1s;
}
.isim-chat-row:active{background:rgba(255,255,255,.04);}
.isim-chat-av-wrap{position:relative;flex-shrink:0;}
.isim-chat-list-av{width:50px;height:50px;border-radius:50%;background:var(--bg3);object-fit:cover;}
.isim-chat-online{
    width:13px;height:13px;background:var(--green);border-radius:50%;
    position:absolute;bottom:1px;right:1px;border:2px solid var(--bg);
}
.isim-chat-meta{flex:1;min-width:0;}
.isim-chat-top{display:flex;justify-content:space-between;align-items:center;}
.isim-chat-nm{font-size:15px;font-weight:600;color:var(--txt);}
.isim-chat-time{font-size:12px;color:var(--txt2);}
.isim-chat-preview{font-size:13px;color:var(--txt2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}

/* Chat Screen */
#isim-chat-header{
    padding:8px 14px;background:var(--bg2);backdrop-filter:blur(20px);
    border-bottom:0.5px solid var(--sep);
    display:flex;align-items:center;gap:8px;flex-shrink:0;
}
.isim-chat-av{width:36px;height:36px;border-radius:50%;background:var(--bg3);object-fit:cover;flex-shrink:0;}
.isim-chat-info{flex:1;}
.isim-chat-name{font-size:16px;font-weight:700;color:var(--txt);}
.isim-chat-status{font-size:12px;color:var(--green);}
.isim-chat-tools{display:flex;gap:5px;}
.isim-tool-btn{
    background:var(--bg3);border:none;border-radius:10px;
    padding:5px 10px;font-size:11px;color:var(--txt2);cursor:pointer;
}
.isim-tool-btn:active{opacity:.7;}

/* Bot note bubble */
#isim-bot-note-bubble{
    background:rgba(255,255,255,.08);border:0.5px solid rgba(255,255,255,.15);
    border-radius:12px;padding:5px 10px;font-size:11px;color:var(--txt2);
    max-width:140px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
    display:none;backdrop-filter:blur(8px);
}

/* Messages */
#isim-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:4px;}
.isim-sys{text-align:center;font-size:11px;color:var(--txt3);padding:8px 0;}
.isim-row{display:flex;align-items:flex-end;gap:6px;max-width:82%;}
.isim-row.out{align-self:flex-end;flex-direction:row-reverse;}
.isim-row.in{align-self:flex-start;}
.isim-av{width:26px;height:26px;border-radius:50%;background:var(--bg3);flex-shrink:0;object-fit:cover;}
.isim-wrap{display:flex;flex-direction:column;gap:2px;}
.isim-bub{
    padding:9px 13px;border-radius:20px;
    font-size:15px;line-height:1.45;word-break:break-word;
    position:relative;cursor:pointer;
}
.isim-row.in .isim-bub{background:var(--bub-in);color:var(--txt);border-bottom-left-radius:4px;}
.isim-row.out .isim-bub{background:var(--bub-out);color:#fff;border-bottom-right-radius:4px;}
.isim-time{font-size:10px;color:var(--txt3);padding:0 3px;}
.isim-seen{font-size:10px;color:var(--txt3);text-align:right;padding:0 3px;}

/* Message edit mode */
.isim-row.edit-mode .isim-bub{outline:1.5px solid var(--accent);}
.isim-del-btn{
    background:#f4212e;border:none;border-radius:50%;width:20px;height:20px;
    color:#fff;font-size:12px;cursor:pointer;align-self:center;flex-shrink:0;
    display:none;align-items:center;justify-content:center;
}
.edit-active .isim-del-btn{display:flex;}

/* Typing dots */
.isim-typing{display:flex;gap:5px;padding:10px 14px;background:var(--bub-in);border-radius:20px;border-bottom-left-radius:4px;width:fit-content;}
.isim-typing span{width:7px;height:7px;border-radius:50%;background:var(--txt2);animation:ibounce .9s infinite;}
.isim-typing span:nth-child(2){animation-delay:.15s;}
.isim-typing span:nth-child(3){animation-delay:.3s;}
@keyframes ibounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-7px)}}

/* Input bar */
#isim-inputbar{
    background:var(--bg);border-top:0.5px solid var(--sep);
    padding:8px 10px 12px;display:flex;gap:7px;align-items:flex-end;flex-shrink:0;
}
#isim-input{
    flex:1;background:var(--inp);border:0.5px solid var(--sep);
    border-radius:20px;padding:9px 14px;font-size:15px;color:var(--txt);
    resize:none;line-height:1.4;max-height:90px;overflow-y:auto;
}
#isim-input::placeholder{color:var(--txt3);}
#isim-plusbtn,#isim-stickerbtn,#isim-sendbtn,#isim-botsendbtn,#isim-cancelbtn{
    background:var(--bg3);border:none;border-radius:50%;width:36px;height:36px;
    display:flex;align-items:center;justify-content:center;font-size:17px;cursor:pointer;flex-shrink:0;color:var(--txt2);
}
#isim-sendbtn{background:var(--accent);color:#fff;}
#isim-cancelbtn{background:#f4212e;color:#fff;display:none;}
#isim-botsendbtn{background:var(--bg3);}

/* Plus sheet */
#isim-plussheet{
    background:var(--bg2);border-top:0.5px solid var(--sep);
    display:none;flex-wrap:wrap;padding:14px;gap:12px;flex-shrink:0;
}
#isim-plussheet.show{display:flex;}
.isim-plus-item{
    display:flex;flex-direction:column;align-items:center;gap:5px;
    background:var(--bg3);border:none;border-radius:14px;
    padding:12px 14px;cursor:pointer;font-size:12px;color:var(--txt);
    min-width:70px;
}
.isim-plus-item span:first-child{font-size:22px;}

/* Red envelope sheet */
#isim-redenv-sheet{
    position:absolute;inset:0;background:var(--bg);z-index:30;
    display:none;flex-direction:column;padding:24px;
    align-items:center;justify-content:center;
}
#isim-redenv-sheet.show{display:flex;}

/* Sticker tray */
#isim-sticker-tray{
    background:var(--bg2);border-top:0.5px solid var(--sep);
    display:none;flex-wrap:wrap;padding:12px;gap:8px;max-height:160px;overflow-y:auto;flex-shrink:0;
}
#isim-sticker-tray.show{display:flex;}
.isim-sticker-thumb{width:72px;height:72px;border-radius:10px;object-fit:cover;cursor:pointer;}
.isim-sticker-wrap{position:relative;display:inline-block;}
.isim-sticker-del{
    position:absolute;top:-5px;right:-5px;
    background:#f4212e;border:none;border-radius:50%;
    width:18px;height:18px;color:#fff;font-size:11px;cursor:pointer;
    display:flex;align-items:center;justify-content:center;z-index:2;
}

/* Note panel */
#isim-notepanel{
    background:var(--bg2);border-top:0.5px solid var(--sep);
    display:none;padding:14px;flex-shrink:0;
}
#isim-notepanel.show{display:block;}
#isim-noteta{
    width:100%;box-sizing:border-box;height:70px;background:var(--inp);
    border:0.5px solid var(--sep);border-radius:10px;padding:8px 10px;
    color:var(--txt);font-size:14px;resize:none;
}
.isim-note-btns{display:flex;gap:8px;margin-top:8px;}
.isim-note-btns button{flex:1;padding:9px;border-radius:10px;border:none;cursor:pointer;font-size:14px;color:var(--txt);background:var(--bg3);}
.isim-note-btns button.prim{background:var(--accent);color:#fff;}

/* Wallpaper picker */
#isim-wp-picker{display:none;padding:10px 14px;background:var(--bg2);border-bottom:0.5px solid var(--sep);flex-shrink:0;}
.isim-wp-option{width:48px;height:48px;border-radius:10px;cursor:pointer;display:inline-block;flex-shrink:0;}

/* Bank */
.isim-bank-hero{
    background:linear-gradient(135deg,#1d9bf0,#0a5a8a);
    padding:28px 24px;margin:14px;border-radius:20px;
    box-shadow:0 8px 30px rgba(29,155,240,.3);
}
.isim-bank-acc{font-size:13px;color:rgba(255,255,255,.7);margin-bottom:6px;}
.isim-bank-bal{font-size:42px;font-weight:700;color:#fff;letter-spacing:-1px;}
.isim-bank-actions{display:flex;gap:10px;margin-top:18px;}
.isim-bank-btn{
    flex:1;background:rgba(255,255,255,.2);border:none;border-radius:12px;
    padding:10px 6px;color:#fff;font-size:12px;cursor:pointer;
    display:flex;flex-direction:column;align-items:center;gap:4px;
}
.isim-bank-btn span:first-child{font-size:20px;}
.isim-tx-list{flex:1;overflow-y:auto;}
.isim-tx-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:0.5px solid var(--sep);}
.isim-tx-icon{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
.isim-tx-receive{background:rgba(0,186,124,.15);color:var(--green);}
.isim-tx-send{background:rgba(244,33,46,.12);color:var(--red);}
.isim-tx-info{flex:1;}
.isim-tx-from{font-size:14px;font-weight:600;color:var(--txt);}
.isim-tx-note{font-size:12px;color:var(--txt2);}
.isim-tx-date{font-size:11px;color:var(--txt3);}
.isim-tx-amt{font-size:15px;font-weight:700;}
.isim-tx-amt.green{color:var(--green);}
.isim-tx-amt.red{color:var(--red);}

/* Shop */
.isim-shop-banner{
    background:linear-gradient(135deg,#f4212e,#a0000f);
    padding:16px 16px 10px;display:flex;align-items:center;gap:10px;flex-shrink:0;
}
.isim-shop-search{flex:1;background:rgba(255,255,255,.15);border:none;border-radius:20px;padding:8px 14px;color:#fff;font-size:14px;}
.isim-shop-search::placeholder{color:rgba(255,255,255,.5);}
.isim-shop-cart-btn{background:none;border:none;color:#fff;font-size:22px;cursor:pointer;position:relative;}
.isim-cart-badge{
    position:absolute;top:-4px;right:-4px;background:#fff;color:#f4212e;
    font-size:9px;font-weight:700;border-radius:8px;min-width:16px;height:16px;
    display:flex;align-items:center;justify-content:center;padding:0 3px;
}
.isim-shop-cats{display:flex;gap:8px;padding:10px 14px;overflow-x:auto;flex-shrink:0;}
.isim-shop-cats::-webkit-scrollbar{display:none;}
.isim-cat-chip{
    background:var(--bg3);border:0.5px solid var(--sep);border-radius:20px;
    padding:6px 14px;font-size:13px;color:var(--txt2);cursor:pointer;white-space:nowrap;flex-shrink:0;
}
.isim-cat-chip.on{background:var(--txt);color:var(--bg);}
.isim-shop-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:12px;overflow-y:auto;flex:1;}
.isim-product-card{background:var(--bg2);border-radius:16px;overflow:hidden;cursor:pointer;border:0.5px solid var(--sep);}
.isim-product-img{height:100px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:40px;}
.isim-product-info{padding:10px;}
.isim-product-name{font-size:13px;font-weight:600;color:var(--txt);}
.isim-product-price{font-size:16px;font-weight:700;color:var(--red);margin-top:3px;}
.isim-product-old{font-size:12px;color:var(--txt3);text-decoration:line-through;}
.isim-add-cart{
    margin-top:8px;width:100%;background:var(--accent);border:none;border-radius:10px;
    padding:8px;color:#fff;font-size:13px;font-weight:600;cursor:pointer;
}
#isim-cart-sheet{
    position:absolute;inset:0;background:var(--bg);z-index:20;
    display:none;flex-direction:column;
}
#isim-cart-sheet.show{display:flex;}
.isim-cart-item{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:0.5px solid var(--sep);}
.isim-cart-em{font-size:28px;width:44px;text-align:center;}
.isim-cart-info{flex:1;}
.isim-cart-nm{font-size:14px;font-weight:600;color:var(--txt);}
.isim-cart-pr{font-size:12px;color:var(--txt2);}
.isim-cart-qty{display:flex;align-items:center;gap:8px;}
.isim-qty-btn{
    width:28px;height:28px;border-radius:50%;border:0.5px solid var(--sep);
    background:var(--bg3);color:var(--txt);font-size:16px;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
}

/* X / Twitter screen — full X aesthetic */
#isim-scr-twitter{background:#000;}
.isim-x-header{
    background:rgba(0,0,0,.85);backdrop-filter:blur(20px);border-bottom:0.5px solid #2f3336;
    padding:0 16px;height:53px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
}
.isim-x-tabs{
    display:flex;border-bottom:0.5px solid #2f3336;flex-shrink:0;
    background:rgba(0,0,0,.85);backdrop-filter:blur(10px);
}
.isim-x-tab{
    flex:1;text-align:center;padding:14px 0;font-weight:600;color:#71767b;
    position:relative;cursor:pointer;font-size:15px;transition:.2s;
}
.isim-x-tab.on{color:#e7e9ea;}
.isim-x-tab.on::after{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:56px;height:4px;background:#1d9bf0;border-radius:2px;}
.isim-tweet-feed{flex:1;overflow-y:auto;}
.isim-tweet-feed::-webkit-scrollbar{width:0;}
.isim-tweet{padding:12px 16px;border-bottom:0.5px solid #2f3336;cursor:pointer;}
.isim-tweet:hover{background:rgba(255,255,255,.03);}
.isim-tweet-top{display:flex;gap:10px;}
.isim-tweet-av{width:40px;height:40px;border-radius:50%;background:#2f3336;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;}
.isim-tweet-av img{width:100%;height:100%;object-fit:cover;}
.isim-tweet-meta{flex:1;}
.isim-tweet-name{font-size:15px;font-weight:700;color:#e7e9ea;}
.isim-tweet-handle{font-size:13px;color:#71767b;}
.isim-tweet-body{font-size:15px;color:#e7e9ea;margin-top:6px;line-height:1.4;white-space:pre-wrap;}
.isim-tweet-img{width:100%;border-radius:16px;margin-top:10px;max-height:200px;object-fit:cover;display:block;border:0.5px solid #2f3336;}
.isim-tweet-actions{display:flex;gap:0;margin-top:10px;}
.isim-tweet-act{
    flex:1;display:flex;align-items:center;gap:6px;font-size:13px;color:#71767b;
    background:none;border:none;cursor:pointer;padding:4px 0;transition:.2s;
}
.isim-tweet-act:hover{color:#1d9bf0;}
.isim-tweet-act.liked{color:#f91880;}
.isim-tweet-act.retweeted{color:#00ba7c;}
/* Tweet detail view */
#isim-tweet-detail{position:absolute;inset:0;background:#000;z-index:50;display:none;flex-direction:column;}
#isim-tweet-detail.show{display:flex;}
.isim-tweet-detail-body{flex:1;overflow-y:auto;padding:14px 16px;}
.isim-tweet-detail-text{font-size:22px;color:#e7e9ea;line-height:1.4;margin:10px 0;}
.isim-tweet-detail-stats{display:flex;gap:16px;padding:12px 0;border-top:0.5px solid #2f3336;border-bottom:0.5px solid #2f3336;margin:10px 0;}
.isim-tweet-detail-stat{font-size:14px;color:#e7e9ea;}
.isim-tweet-detail-stat span{color:#71767b;}
.isim-reply-input-bar{
    padding:12px 16px;border-top:0.5px solid #2f3336;display:flex;gap:10px;align-items:center;
    background:rgba(0,0,0,.9);backdrop-filter:blur(10px);
}
.isim-reply-inp{
    flex:1;background:#1a1a1a;border:0.5px solid #2f3336;border-radius:20px;
    padding:8px 14px;color:#e7e9ea;font-size:15px;
}
.isim-reply-send-btn{
    background:#1d9bf0;border:none;border-radius:20px;
    padding:8px 16px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;
}
/* Tweet composer */
#isim-tweet-composer{
    display:none;position:absolute;inset:0;background:#000;z-index:40;flex-direction:column;
}
#isim-tweet-composer.show{display:flex;}
.isim-compose-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:0.5px solid #2f3336;}
#isim-tweet-area{flex:1;padding:14px 16px;font-size:17px;color:#e7e9ea;background:transparent;border:none;resize:none;line-height:1.5;}
#isim-tweet-area::placeholder{color:#71767b;}
.isim-compose-bottom{padding:10px 16px;border-top:0.5px solid #2f3336;display:flex;align-items:center;justify-content:space-between;}
.isim-tweet-post-btn{
    background:#e7e9ea;color:#000;border:none;border-radius:20px;
    padding:8px 22px;font-size:15px;font-weight:700;cursor:pointer;
}
.isim-reply{
    margin:6px 0 0;padding:10px 12px;background:#1a1a1a;border-radius:14px;
    font-size:13px;color:#e7e9ea;border:0.5px solid #2f3336;
}
.isim-reply-user{font-size:12px;font-weight:700;color:#1d9bf0;margin-bottom:3px;}

/* Story Viewer */
#isim-story-viewer{
    display:none;position:absolute;inset:0;background:#000;z-index:60;flex-direction:column;
}
#isim-story-viewer.show{display:flex;}
#isim-story-img{flex:1;background-size:cover;background-position:center;background-color:#111;}
.isim-story-progress{display:flex;gap:4px;padding:12px 12px 6px;position:absolute;top:0;left:0;right:0;z-index:2;}
.isim-story-prog-seg{flex:1;height:3px;background:rgba(255,255,255,.3);border-radius:2px;overflow:hidden;}
.isim-story-prog-fill{height:100%;background:#fff;width:0;transition:width linear;}
.isim-story-close{position:absolute;top:46px;right:14px;z-index:3;background:rgba(0,0,0,.5);border:none;color:#fff;border-radius:50%;width:34px;height:34px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.isim-story-user{position:absolute;top:46px;left:14px;z-index:3;display:flex;align-items:center;gap:8px;}
.isim-story-user-av{width:34px;height:34px;border-radius:50%;border:2px solid #fff;object-fit:cover;background:var(--bg3);}
.isim-story-user-nm{color:#fff;font-size:14px;font-weight:700;text-shadow:0 1px 4px rgba(0,0,0,.7);}
.isim-story-text-overlay{
    position:absolute;bottom:90px;left:14px;right:14px;z-index:3;
    background:rgba(0,0,0,.55);backdrop-filter:blur(6px);
    border-radius:14px;padding:10px 14px;color:#fff;font-size:15px;display:none;
}
.isim-story-text-overlay.show{display:block;}
.isim-story-reply-bar{
    position:absolute;bottom:24px;left:14px;right:14px;z-index:3;
    display:flex;gap:8px;align-items:center;
}
#isim-story-reply-inp{
    flex:1;background:rgba(255,255,255,.15);border:0.5px solid rgba(255,255,255,.35);
    border-radius:24px;padding:10px 16px;color:#fff;font-size:14px;
}
#isim-story-reply-inp::placeholder{color:rgba(255,255,255,.5);}
.isim-story-reading{position:absolute;bottom:80px;left:14px;right:14px;z-index:3;background:rgba(0,0,0,.7);border-radius:12px;padding:10px;color:#fff;font-size:12px;display:none;}
.isim-story-reading.show{display:block;}

/* Call Screen */
#isim-call{
    position:absolute;inset:0;background:#000;z-index:90;
    display:none;flex-direction:column;align-items:center;justify-content:space-between;
    padding-bottom:40px;
}
#isim-call.show{display:flex;}
#isim-call-bg{
    position:absolute;inset:0;background-size:cover;background-position:center;
    filter:blur(30px) brightness(.3);z-index:0;
}
.isim-call-mid{
    position:relative;z-index:1;display:flex;flex-direction:column;
    align-items:center;gap:10px;margin-top:80px;
}
#isim-call-av{
    width:100px;height:100px;border-radius:50%;object-fit:cover;
    border:3px solid rgba(255,255,255,.3);background:var(--bg3);
}
#isim-call-float{
    position:relative;z-index:1;padding:14px 20px;max-width:90%;
    display:flex;flex-wrap:wrap;gap:3px;justify-content:center;
    margin:0 auto;min-height:40px;
    /* centered vertically in screen */
    margin-top:auto;margin-bottom:auto;
}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.ifl{
    color:#fff;font-size:22px;font-weight:400;
    animation:fadeUp .4s ease forwards;opacity:0;
}
.isim-call-typebar{
    position:relative;z-index:1;display:flex;gap:8px;
    align-items:center;padding:0 20px;width:100%;box-sizing:border-box;
}
.isim-call-ctls{position:relative;z-index:1;display:flex;gap:24px;align-items:center;padding:0 20px;}
.icircle{background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;color:#fff;font-size:12px;}
.icircle-bg{width:62px;height:62px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:24px;}
.icircle-bg.red{background:rgba(244,33,46,.8);}
.icircle-bg.on{background:rgba(255,255,255,.5);}
.isim-call-confirm-btn{
    background:var(--accent);border:none;border-radius:20px;padding:9px 18px;
    color:#fff;font-size:14px;font-weight:600;cursor:pointer;
}

/* Settings */
.isim-set-section{padding:16px 16px 6px;}
.isim-set-header{font-size:13px;color:var(--txt3);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;}
.isim-set-group{background:var(--bg2);border-radius:14px;overflow:hidden;border:0.5px solid var(--sep);}
.isim-set-row{display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-bottom:0.5px solid var(--sep);}
.isim-set-row:last-child{border-bottom:none;}
.isim-swatch{width:28px;height:28px;border-radius:50%;cursor:pointer;border:2.5px solid transparent;}
.isim-swatch.on{border-color:var(--txt);}
.isim-toggle{position:relative;width:44px;height:26px;}
.isim-toggle input{opacity:0;width:0;height:0;}
.isim-toggle span{position:absolute;inset:0;background:var(--bg4);border-radius:13px;cursor:pointer;transition:.3s;}
.isim-toggle span::before{content:'';position:absolute;width:20px;height:20px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.3s;}
.isim-toggle input:checked + span{background:var(--accent);}
.isim-toggle input:checked + span::before{transform:translateX(18px);}

/* Friends screen */
.isim-friend-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:0.5px solid var(--sep);}
.isim-friend-info{flex:1;}
.isim-friend-name{font-size:15px;font-weight:600;color:var(--txt);}
.isim-friend-bio{font-size:12px;color:var(--txt2);margin-top:2px;}
.isim-friend-add{background:var(--accent);color:#fff;border:none;border-radius:20px;padding:6px 16px;font-size:13px;font-weight:600;cursor:pointer;}

/* Toast */
#isim-toast{
    position:absolute;bottom:90px;left:50%;transform:translateX(-50%);
    background:rgba(30,30,30,.95);color:#fff;padding:8px 18px;border-radius:20px;
    font-size:13px;white-space:nowrap;opacity:0;transition:opacity .25s;pointer-events:none;
    z-index:500;
}
#isim-toast.show{opacity:1;}

/* Loading overlay */
.isim-loading-overlay{
    position:absolute;inset:0;background:rgba(0,0,0,.6);z-index:200;
    display:none;flex-direction:column;align-items:center;justify-content:center;gap:10px;
}
.isim-loading-overlay.show{display:flex;}
.isim-loading-spinner{
    width:36px;height:36px;border:3px solid rgba(255,255,255,.2);
    border-top-color:#1d9bf0;border-radius:50%;animation:spin .7s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}
.isim-loading-text{color:#fff;font-size:13px;color:rgba(255,255,255,.6);}

/* Scrollbar */
#isim-frame ::-webkit-scrollbar{width:2px;}
#isim-frame ::-webkit-scrollbar-thumb{background:var(--sep);border-radius:2px;}

/* Voice message */
.isim-bub .isim-voice-bars{display:flex;align-items:center;gap:2px;}

/* Responsive */
@media(max-width:480px){
    #isim-frame{width:100vw !important;height:100vh !important;border-radius:0 !important;border:none !important;max-height:100vh !important;}
    #isim-phone{align-items:stretch !important;justify-content:stretch !important;padding:0 !important;}
    #isim-island{display:none !important;}
}

@keyframes bounceIn{
    0%{opacity:0;transform:scale(.5);}
    60%{transform:scale(1.05);}
    100%{opacity:1;transform:scale(1);}
}
@keyframes callPulse{
    0%,100%{opacity:1;transform:scale(1);}
    50%{opacity:.4;transform:scale(1.3);}
}
.isim-bounce{animation:bounceIn .3s cubic-bezier(.34,1.56,.64,1) forwards;}
.isim-st-panel{margin-bottom:5px;}
`;
    document.head.appendChild(s);
}

// ---- Helpers ----
function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function now() {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function fmtDate(ts) {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
    return `${d.getDate()}/${d.getMonth()+1}`;
}
function cleanThink(text) {
    return String(text||'').replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/<think>[\s\S]*/gi,'').trim();
}
function toast(msg) {
    const el = document.getElementById('isim-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2200);
}
function getUserName() {
    let n = 'User';
    try { const ctx = SillyTavern.getContext(); if (ctx?.name1) n = ctx.name1; } catch {}
    return n;
}
function getUserAvatar() {
    let av = '';
    try {
        const ctx = SillyTavern.getContext();
        if (ctx?.persona?.avatar) av = `/User Avatars/${ctx.persona.avatar}`;
        else if (ctx?.user_avatar) av = ctx.user_avatar;
    } catch {}
    return av;
}

// ---- Notify top banner (iOS style) ----
function showNotif(appName, msg, avatarSrc) {
    const tray = document.getElementById('isim-notif-tray');
    if (!tray) return;
    const card = document.createElement('div');
    card.className = 'isim-notif-card';
    const avHtml = avatarSrc
        ? `<img src="${esc(avatarSrc)}" style="width:16px;height:16px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">`
        : '';
    card.innerHTML = `<div class="isim-notif-app">${avHtml} ${esc(appName)}</div><div class="isim-notif-msg">${esc(msg)}</div>`;
    tray.appendChild(card);
    setTimeout(() => card.style.opacity = '0', 4200);
    setTimeout(() => card.remove(), 4700);
}

// ---- AI image description via Anthropic API ----
async function describeImage(base64Data) {
    try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                messages: [{
                    role: 'user',
                    content: [{
                        type: 'image',
                        source: { type: 'base64', media_type: 'image/jpeg', data: base64Data.split(',')[1] || base64Data }
                    }, {
                        type: 'text',
                        text: 'Describe this image in 1-2 sentences. Focus on mood, characters, and actions. Be concise. This description will be used to understand stickers/stories for roleplay.'
                    }]
                }]
            })
        });
        const data = await resp.json();
        return data.content?.[0]?.text || 'Image';
    } catch { return 'Image'; }
}

// ---- Inject HTML ----
function injectHTML() {
    if (document.getElementById('isim-phone')) return;

    const fab = document.createElement('div');
    fab.id = 'isim-fab';
    fab.innerHTML = '<span style="font-size:22px">📱</span>';
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
    return `
<div id="isim-frame" class="dark">
  <div id="isim-island"></div>

  <div id="isim-sb">
    <span id="isim-sb-time">9:41</span>
    <span id="isim-sb-icons" style="display:flex;align-items:center;gap:6px;">
      <span style="font-size:10px">▲</span>
      <span style="font-size:11px">WiFi</span>
      <span>🔋</span>
      <button onclick="window.__isimClose()" style="background:rgba(255,255,255,.12);border:none;border-radius:50%;width:22px;height:22px;color:#fff;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;margin-left:4px;line-height:1;">✕</button>
    </span>
  </div>

  <!-- Top notification tray (shows on all screens) -->
  <div id="isim-notif-tray"></div>

  <div id="isim-screen">

    <!-- HOME -->
    <div id="isim-home">
      <div id="isim-home-wallpaper"></div>
      <div class="isim-home-content">
        <div id="isim-home-time-big">9:41</div>
        <div id="isim-home-date">Tuesday, May 13</div>
        <div style="flex:1;min-height:10px;"></div>
        <div class="isim-app-grid">
          <button class="isim-app-btn" onclick="window.__isimNav('messages')">
            <div class="isim-icon ic-msg"><span>💬</span><span class="isim-icon-badge" id="isim-msg-badge" style="display:none">1</span></div>
            <span class="isim-app-label">Messages</span>
          </button>
          <button class="isim-app-btn" onclick="window.__isimNav('twitter')">
            <div class="isim-icon ic-x"><span style="font-size:22px;font-weight:900;font-family:serif;color:#e7e9ea">X</span></div>
            <span class="isim-app-label">X</span>
          </button>
          <button class="isim-app-btn" onclick="window.__isimNav('bank')">
            <div class="isim-icon ic-bank"><span>🏦</span></div>
            <span class="isim-app-label">Bank</span>
          </button>
          <button class="isim-app-btn" onclick="window.__isimNav('shop')">
            <div class="isim-icon ic-shop"><span>🛍</span></div>
            <span class="isim-app-label">Shop</span>
          </button>
          <button class="isim-app-btn" onclick="window.__isimNav('settings')">
            <div class="isim-icon ic-set"><span>⚙</span></div>
            <span class="isim-app-label">Settings</span>
          </button>
        </div>
        <div class="isim-dock">
          <button class="isim-app-btn" onclick="window.__isimNav('messages')">
            <div class="isim-icon ic-msg" style="width:52px;height:52px;"><span>💬</span></div>
            <span class="isim-app-label">Messages</span>
          </button>
          <button class="isim-app-btn" onclick="window.__isimNav('bank')">
            <div class="isim-icon ic-bank" style="width:52px;height:52px;"><span>🏦</span></div>
            <span class="isim-app-label">Bank</span>
          </button>
          <button class="isim-app-btn" onclick="window.__isimNav('shop')">
            <div class="isim-icon ic-shop" style="width:52px;height:52px;"><span>🛍</span></div>
            <span class="isim-app-label">Shop</span>
          </button>
          <button class="isim-app-btn" onclick="window.__isimNav('twitter')">
            <div class="isim-icon ic-x" style="width:52px;height:52px;"><span style="font-size:20px;font-weight:900;color:#e7e9ea">X</span></div>
            <span class="isim-app-label">X</span>
          </button>
        </div>
        <div class="isim-bar"></div>
      </div>
    </div>

    <!-- MESSAGES LIST -->
    <div class="isim-screen" id="isim-scr-messages">
      <div class="isim-nav">
        <button class="isim-nav-back" onclick="window.__isimNav('home')">‹</button>
        <span class="isim-nav-title">Messages</span>
        <button class="isim-nav-action" onclick="window.__isimNav('friends')">+</button>
      </div>
      <div id="isim-stories-bar">
        <div class="isim-story-item" onclick="window.__isimAddMyStory()">
          <div class="isim-story-ring add">+</div>
          <span class="isim-story-name">My Story</span>
        </div>
      </div>
      <div id="isim-notes-bar" style="display:flex;gap:10px;overflow-x:auto;padding:2px 12px 6px;flex-shrink:0;scrollbar-width:none;-webkit-overflow-scrolling:touch;"></div>
      <div style="padding:6px 12px;flex-shrink:0;">
        <input id="isim-msg-search" placeholder="Search" style="width:100%;box-sizing:border-box;padding:9px 14px;border-radius:12px;border:none;background:var(--bg3);color:var(--txt);font-size:15px;" oninput="window.__isimFilterMessages(this.value)">
      </div>
      <div id="isim-chat-list" style="flex:1;overflow-y:auto;"></div>
      <div class="isim-home-bar"></div>
    </div>

    <!-- FRIENDS / ADD CONTACT -->
    <div class="isim-screen" id="isim-scr-friends">
      <div class="isim-nav">
        <button class="isim-nav-back" onclick="window.__isimNav('messages')">‹ Messages</button>
        <span class="isim-nav-title">Add Contact</span>
        <button class="isim-nav-action" onclick="window.__isimLoadFriends()">↺</button>
      </div>
      <input id="isim-fsearch" placeholder="Search characters..." style="margin:8px 12px;padding:9px 14px;border-radius:12px;border:none;background:var(--bg3);color:var(--txt);font-size:15px;box-sizing:border-box;width:calc(100% - 24px);flex-shrink:0;" oninput="window.__isimFilterFriends(this.value)">
      <div id="isim-flist" style="flex:1;overflow-y:auto;"></div>
      <div class="isim-home-bar"></div>
    </div>

    <!-- CHAT -->
    <div class="isim-screen" id="isim-scr-chat">
      <div class="isim-nav" style="height:auto;min-height:44px;padding:6px 12px;">
        <button class="isim-nav-back" onclick="window.__isimNav('messages')">‹</button>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
          <span id="isim-chat-title" style="font-size:16px;font-weight:700;color:var(--txt);">Chat</span>
          <span id="isim-chat-title-status" style="font-size:11px;color:var(--green);">Active now</span>
        </div>
        <button class="isim-nav-action" onclick="window.__isimStartCall()" style="margin-right:4px;">📞</button>
        <button class="isim-nav-action" onclick="window.__isimToggleChatSettings()" title="Chat Settings">☰</button>
      </div>
      <!-- CHAT SETTINGS PANEL -->
      <div id="isim-chat-settings" style="display:none;position:absolute;top:54px;right:0;left:0;z-index:100;background:var(--bg2);border-bottom:1px solid var(--sep);padding:12px 16px;flex-direction:column;gap:10px;">
        <div style="font-size:13px;font-weight:700;color:var(--txt);margin-bottom:4px;">⚙ Chat Settings</div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <div style="flex:1;min-width:100px;">
            <div style="font-size:11px;color:var(--txt2);margin-bottom:4px;">Background</div>
            <div style="display:flex;gap:6px;overflow-x:auto;">
              <div style="width:28px;height:28px;border-radius:6px;background:transparent;border:1px solid var(--sep);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;" onclick="window.__isimSetChatWp('')">✕</div>
              <div style="width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,#1a1a2e,#0f3460);cursor:pointer;flex-shrink:0;" onclick="window.__isimSetChatWp('gradient1')"></div>
              <div style="width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,#0d2137,#1a4c7a);cursor:pointer;flex-shrink:0;" onclick="window.__isimSetChatWp('gradient2')"></div>
              <div style="width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,#2d0036,#6b0f8c);cursor:pointer;flex-shrink:0;" onclick="window.__isimSetChatWp('gradient3')"></div>
              <div style="width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,#0a1a00,#1a3a00);cursor:pointer;flex-shrink:0;" onclick="window.__isimSetChatWp('gradient4')"></div>
              <button style="background:var(--bg3);border:none;border-radius:6px;padding:2px 8px;color:var(--txt2);font-size:11px;cursor:pointer;flex-shrink:0;" onclick="document.getElementById('isim-wp-file2').click()">Upload</button>
              <input type="file" id="isim-wp-file2" accept="image/*" style="display:none" onchange="window.__isimUploadWp(this)">
            </div>
          </div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <div style="flex:1;min-width:120px;">
            <div style="font-size:11px;color:var(--txt2);margin-bottom:4px;">Bubble Color (outgoing)</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <div style="width:24px;height:24px;border-radius:50%;background:#0a84ff;cursor:pointer;border:2px solid transparent;" onclick="window.__isimSetBubbleColor('#0a84ff')"></div>
              <div style="width:24px;height:24px;border-radius:50%;background:#1d9bf0;cursor:pointer;" onclick="window.__isimSetBubbleColor('#1d9bf0')"></div>
              <div style="width:24px;height:24px;border-radius:50%;background:#ff375f;cursor:pointer;" onclick="window.__isimSetBubbleColor('#ff375f')"></div>
              <div style="width:24px;height:24px;border-radius:50%;background:#30d158;cursor:pointer;" onclick="window.__isimSetBubbleColor('#30d158')"></div>
              <div style="width:24px;height:24px;border-radius:50%;background:#bf5af2;cursor:pointer;" onclick="window.__isimSetBubbleColor('#bf5af2')"></div>
              <div style="width:24px;height:24px;border-radius:50%;background:#ff9f0a;cursor:pointer;" onclick="window.__isimSetBubbleColor('#ff9f0a')"></div>
            </div>
          </div>
          <div style="flex:1;min-width:120px;">
            <div style="font-size:11px;color:var(--txt2);margin-bottom:4px;">Character Name</div>
            <div style="display:flex;gap:6px;">
              <input id="isim-char-name-input" placeholder="Custom name" style="flex:1;padding:6px 10px;border-radius:8px;border:0.5px solid var(--sep);background:var(--inp);color:var(--txt);font-size:13px;">
              <button onclick="window.__isimSaveCharName()" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;">Save</button>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <div style="font-size:11px;color:var(--txt2);">Show last</div>
          <input id="isim-history-limit" type="number" min="10" max="500" style="width:60px;padding:5px 8px;border-radius:8px;border:0.5px solid var(--sep);background:var(--inp);color:var(--txt);font-size:13px;" value="50">
          <div style="font-size:11px;color:var(--txt2);">messages</div>
          <button onclick="window.__isimSaveHistoryLimit()" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer;">Apply</button>
          <button onclick="window.__isimToggleChatSettings()" style="background:var(--bg3);color:var(--txt);border:none;border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer;margin-left:auto;">Close</button>
        </div>
        <div style="display:flex;gap:8px;padding:10px 0 4px;border-top:0.5px solid var(--sep);margin-top:4px;">
          <button onclick="window.__isimToggleEditMode();window.__isimToggleChatSettings();" style="flex:1;background:var(--bg3);color:var(--txt2);border:none;border-radius:10px;padding:9px 8px;font-size:13px;cursor:pointer;">✏ Edit Msgs</button>
          <button onclick="window.__isimRetry();window.__isimToggleChatSettings();" style="flex:1;background:var(--bg3);color:var(--txt2);border:none;border-radius:10px;padding:9px 8px;font-size:13px;cursor:pointer;">↻ Retry</button>
          <button onclick="window.__isimToggleChatSettings();window.__isimNav('call-history');" style="flex:1;background:var(--bg3);color:var(--txt2);border:none;border-radius:10px;padding:9px 8px;font-size:13px;cursor:pointer;">📋 Calls</button>
        </div>
      </div>
      <div id="isim-chat-header">
        <img class="isim-chat-av" id="isim-chat-av" src="" alt="">
        <div id="isim-bot-note-bubble"></div>
      </div>
      <div id="isim-notepanel">
        <div style="font-size:11px;color:var(--txt3);margin-bottom:4px;">My note (bot sees this)</div>
        <textarea id="isim-noteta" placeholder="Write a note..."></textarea>
        <div class="isim-note-btns">
          <button onclick="window.__isimToggleNote()">Cancel</button>
          <button class="prim" onclick="window.__isimSaveNote()">Save</button>
        </div>
      </div>
      <!-- wp-picker moved to chat settings panel -->
      <div id="isim-msgs"></div>
      <div id="isim-plussheet">
        <button class="isim-plus-item" onclick="window.__isimSendLocationPrompt()"><span>📍</span><span>Location</span></button>
        <button class="isim-plus-item" onclick="window.__isimOpenRedEnvelope()"><span>🧧</span><span>Red Env</span></button>
        <button class="isim-plus-item" onclick="document.getElementById('isim-sticker-input').click()"><span>+</span><span>Add Sticker</span></button>
        <button class="isim-plus-item" onclick="document.getElementById('isim-img-input').click()"><span>📷</span><span>Photo</span></button>
        <button class="isim-plus-item" onclick="window.__isimToggleNote()"><span>📝</span><span>My Note</span></button>
        <button class="isim-plus-item" onclick="window.__isimSetBotNotePrompt()"><span>🤖</span><span>Bot Note</span></button>
      </div>
      <div id="isim-redenv-sheet">
        <div style="font-size:50px;text-align:center;margin-bottom:10px">🧧</div>
        <div style="font-size:18px;font-weight:700;color:var(--txt);text-align:center;margin-bottom:18px">Red Envelope</div>
        <div style="margin-bottom:10px;">
          <div style="font-size:12px;color:var(--txt2);margin-bottom:5px;">Send to</div>
          <select id="isim-redenv-to" style="width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:0.5px solid var(--sep);background:var(--inp);color:var(--txt);font-size:15px;">
            <option value="">Current chat</option>
          </select>
        </div>
        <input id="isim-redenv-amount" type="number" placeholder="Amount (THB)" style="width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:0.5px solid var(--sep);background:var(--inp);color:var(--txt);font-size:15px;margin-bottom:8px">
        <input id="isim-redenv-note" placeholder="Message (optional)" style="width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:0.5px solid var(--sep);background:var(--inp);color:var(--txt);font-size:15px;margin-bottom:16px">
        <button onclick="window.__isimSendRedEnvelope()" style="width:100%;padding:13px;border-radius:13px;border:none;background:#c0000a;color:#fff;font-size:16px;font-weight:700;cursor:pointer">Send Red Envelope</button>
        <button onclick="window.__isimCloseRedEnvelope()" style="width:100%;padding:11px;border-radius:13px;border:none;background:var(--bg3);color:var(--txt);font-size:14px;cursor:pointer;margin-top:8px">Cancel</button>
      </div>
      <div id="isim-sticker-tray"></div>
      <input type="file" id="isim-sticker-input" accept="image/*" style="display:none" onchange="window.__isimAddSticker(this)">
      <input type="file" id="isim-img-input" accept="image/*" style="display:none" onchange="window.__isimSendPhoto(this)">
      <!-- Loading overlay for AI image reading -->
      <div class="isim-loading-overlay" id="isim-img-loading">
        <div class="isim-loading-spinner"></div>
        <div class="isim-loading-text">Reading image...</div>
      </div>
      <div id="isim-inputbar">
        <button id="isim-plusbtn" onclick="window.__isimTogglePlus()">+</button>
        <button id="isim-stickerbtn" onclick="window.__isimToggleStickerTray()">🖼</button>
        <textarea id="isim-input" placeholder="iMessage" rows="1"></textarea>
        <button id="isim-voicebtn" onclick="window.__isimVoiceRecord()" title="Voice message" style="width:32px;height:32px;border-radius:50%;border:none;background:var(--bg3);color:var(--txt);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;">🎙</button>
        <button id="isim-sendbtn" onclick="window.__isimSend()">Send</button>
      </div>
      <div id="isim-gen-bar" style="display:flex;align-items:center;gap:8px;padding:6px 12px 10px;background:var(--bg);border-top:0.5px solid var(--sep);">
        <button id="isim-cancelbtn" onclick="window.__isimCancelBot()" title="Cancel" style="display:none;flex:1;background:var(--bg3);color:var(--txt2);border:none;border-radius:22px;padding:10px 16px;font-size:14px;font-weight:500;cursor:pointer;letter-spacing:.2px;">✕ Cancel</button>
        <button id="isim-botsendbtn" onclick="window.__isimNudge()" title="Generate bot reply" style="flex:1;background:linear-gradient(135deg,var(--accent),#0060c0);color:#fff;border:none;border-radius:22px;padding:10px 16px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;letter-spacing:.3px;box-shadow:0 2px 12px rgba(29,155,240,.35);">
          <span style="font-size:13px;">✦</span> Generate Reply
        </button>
      </div>
      <div class="isim-home-bar"></div>
    </div>

    <!-- BANK -->
    <div class="isim-screen" id="isim-scr-bank">
      <div class="isim-nav">
        <button class="isim-nav-back" onclick="window.__isimNav('home')">‹</button>
        <span class="isim-nav-title">KBank</span>
        <button class="isim-nav-action" onclick="window.__isimRefreshBank()">↺</button>
      </div>
      <div style="flex:1;overflow-y:auto;">
        <div class="isim-bank-hero">
          <div class="isim-bank-acc">Savings · <span id="isim-bank-accnum"></span></div>
          <div class="isim-bank-bal">฿<span id="isim-bank-bal">0.00</span></div>
          <div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:4px;">Current balance</div>
          <div class="isim-bank-actions">
            <button class="isim-bank-btn" onclick="window.__isimBankTransfer()"><span>💸</span><span>Transfer</span></button>
            <button class="isim-bank-btn" onclick="window.__isimBankScan()"><span>QR</span><span>Scan</span></button>
            <button class="isim-bank-btn" onclick="window.__isimBankTop()"><span>+</span><span>Top Up</span></button>
          </div>
        </div>
        <div style="padding:12px 16px 6px;font-size:14px;font-weight:700;color:var(--txt);">Recent Transactions</div>
        <div class="isim-tx-list" id="isim-tx-list"></div>
      </div>
      <div class="isim-home-bar"></div>
    </div>

    <!-- SHOP -->
    <div class="isim-screen" id="isim-scr-shop">
      <div class="isim-shop-banner">
        <button onclick="window.__isimNav('home')" style="background:rgba(255,255,255,.2);border:none;border-radius:50%;width:34px;height:34px;color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:8px;">‹</button>
        <input class="isim-shop-search" placeholder="Search products..." oninput="window.__isimFilterShop(this.value)">
        <button class="isim-shop-cart-btn" onclick="window.__isimOpenCart()">
          Cart <span class="isim-cart-badge" id="isim-cart-count" style="display:none">0</span>
        </button>
      </div>
      <div class="isim-shop-cats">
        <button class="isim-cat-chip on" onclick="window.__isimFilterCat('all',this)">All</button>
        <button class="isim-cat-chip" onclick="window.__isimFilterCat('electronics',this)">Electronics</button>
        <button class="isim-cat-chip" onclick="window.__isimFilterCat('fashion',this)">Fashion</button>
        <button class="isim-cat-chip" onclick="window.__isimFilterCat('accessories',this)">Accessories</button>
        <button class="isim-cat-chip" onclick="window.__isimFilterCat('beauty',this)">Beauty</button>
      </div>
      <div class="isim-shop-grid" id="isim-shop-grid"></div>
      <div id="isim-cart-sheet">
        <div style="padding:14px 16px;font-size:17px;font-weight:700;color:var(--txt);border-bottom:0.5px solid var(--sep);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
          <span>Cart</span>
          <button style="background:none;border:none;color:var(--txt2);font-size:20px;cursor:pointer;" onclick="document.getElementById('isim-cart-sheet').classList.remove('show')">x</button>
        </div>
        <div id="isim-cart-items" style="flex:1;overflow-y:auto;"></div>
        <div style="padding:14px 16px;border-top:0.5px solid var(--sep);flex-shrink:0;">
          <div style="display:flex;justify-content:space-between;margin-bottom:14px;">
            <span style="color:var(--txt2);">Total</span>
            <span style="font-size:20px;font-weight:700;color:var(--txt);" id="isim-cart-total">฿0</span>
          </div>
          <button onclick="window.__isimCheckout()" style="width:100%;padding:14px;border-radius:14px;border:none;background:var(--red);color:#fff;font-size:16px;font-weight:700;cursor:pointer;">Order Now</button>
        </div>
      </div>
      <div class="isim-home-bar"></div>
    </div>

    <!-- TWITTER / X — full X aesthetic -->
    <div class="isim-screen" id="isim-scr-twitter" style="background:#000;">
      <div class="isim-x-header">
        <button style="background:none;border:none;cursor:pointer;width:36px;height:36px;border-radius:50%;overflow:hidden;border:1px solid #2f3336;" id="isim-x-user-av-btn" onclick="window.__isimNav('home')">
          <img id="isim-x-user-av" src="" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='U'">
        </button>
        <span style="font-size:22px;font-weight:900;color:#e7e9ea;font-family:serif;letter-spacing:-1px;">X</span>
        <button style="background:none;border:none;cursor:pointer;font-size:18px;color:#1d9bf0;" onclick="window.__isimOpenCompose()">+</button>
      </div>
      <div class="isim-x-tabs">
        <div class="isim-x-tab on" onclick="window.__isimXTab('for-you',this)">For You</div>
        <div class="isim-x-tab" onclick="window.__isimXTab('following',this)">Following</div>
        <div class="isim-x-tab" onclick="window.__isimXTab('trending',this)">Trending</div>
        <div class="isim-x-tab" onclick="window.__isimXNotifTab()" id="isim-x-tab-notif" style="position:relative;">
          Notifs<span id="isim-x-notif-badge" style="display:none;position:absolute;top:6px;right:2px;background:#1d9bf0;color:#fff;border-radius:50%;min-width:16px;height:16px;font-size:10px;display:none;align-items:center;justify-content:center;border:2px solid #000;padding:0 2px;"></span>
        </div>
      </div>
      <div class="isim-tweet-feed" id="isim-tweet-feed"></div>
      <!-- Tweet detail view -->
      <div id="isim-tweet-detail">
        <div class="isim-x-header" style="justify-content:flex-start;gap:14px;">
          <button style="background:none;border:none;color:#1d9bf0;font-size:20px;cursor:pointer;" onclick="document.getElementById('isim-tweet-detail').classList.remove('show')">‹</button>
          <span style="font-size:17px;font-weight:700;color:#e7e9ea;">Post</span>
        </div>
        <div class="isim-tweet-detail-body" id="isim-tweet-detail-body"></div>
        <div class="isim-reply-input-bar">
          <img id="isim-reply-user-av" src="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;background:#2f3336;" onerror="this.style.background='#2f3336'">
          <input class="isim-reply-inp" id="isim-reply-inp" placeholder="Post your reply">
          <button class="isim-reply-send-btn" onclick="window.__isimSubmitDetailReply()">Reply</button>
        </div>
      </div>
      <!-- Compose tweet -->
      <div id="isim-tweet-composer">
        <div class="isim-compose-head">
          <button style="background:none;border:none;color:#1d9bf0;font-size:15px;cursor:pointer;" onclick="window.__isimCloseCompose()">Cancel</button>
          <button class="isim-tweet-post-btn" onclick="window.__isimPostTweet()">Post</button>
        </div>
        <div style="display:flex;padding:14px 16px;gap:12px;">
          <img id="isim-compose-av" src="" style="width:42px;height:42px;border-radius:50%;flex-shrink:0;object-fit:cover;background:#2f3336;" onerror="this.style.background='#2f3336'">
          <textarea id="isim-tweet-area" placeholder="What's happening?" rows="5"></textarea>
        </div>
        <div class="isim-compose-bottom">
          <button style="background:none;border:none;cursor:pointer;font-size:20px;color:#1d9bf0;" onclick="document.getElementById('isim-tweet-img-input').click()">Image</button>
          <input type="file" id="isim-tweet-img-input" accept="image/*" style="display:none" onchange="window.__isimAttachTweetImg(this)">
          <span id="isim-tweet-img-preview" style="font-size:12px;color:#1d9bf0;"></span>
        </div>
      </div>
      <!-- X Notifications page (hidden by default) -->
      <div id="isim-x-notifs-page" style="display:none;flex:1;overflow-y:auto;flex-direction:column;">
        <div id="isim-x-notifs-list"></div>
      </div>

      <div class="isim-home-bar" style="background:rgba(255,255,255,.2);"></div>
    </div>

    <!-- SETTINGS -->
    <div class="isim-screen" id="isim-scr-settings">
      <div class="isim-nav">
        <button class="isim-nav-back" onclick="window.__isimNav('home')">‹</button>
        <span class="isim-nav-title">Settings</span>
      </div>
      <div style="flex:1;overflow-y:auto;">
        <div class="isim-set-section">
          <div class="isim-set-header">Appearance</div>
          <div class="isim-set-group">
            <div class="isim-set-row">
              <span style="color:var(--txt);">Dark Mode</span>
              <label class="isim-toggle"><input type="checkbox" id="isim-dark-toggle" onchange="window.__isimToggleDark(this.checked)"><span></span></label>
            </div>
          </div>
        </div>
        <div class="isim-set-section">
          <div class="isim-set-header">Accent Color</div>
          <div class="isim-set-group">
            <div class="isim-set-row" style="flex-wrap:wrap;gap:10px;">
              ${['#1d9bf0','#00ba7c','#f4212e','#ff9f0a','#bf5af2','#ff6b35','#05c7f2'].map(c =>
                `<div class="isim-swatch" data-c="${c}" style="background:${c}" onclick="window.__isimAccent('${c}',this)"></div>`
              ).join('')}
            </div>
          </div>
        </div>
        <div class="isim-set-section">
          <div class="isim-set-header">Sticker Manager</div>
          <div class="isim-set-group">
            <div class="isim-set-row" style="cursor:pointer" onclick="window.__isimManageStickers()">
              <span style="color:var(--txt);">Manage Stickers</span><span style="color:var(--txt3);">›</span>
            </div>
          </div>
        </div>
        <div class="isim-set-section">
          <div class="isim-set-header">Data</div>
          <div class="isim-set-group">
            <div class="isim-set-row" style="cursor:pointer" onclick="window.__isimClearChat()">
              <span style="color:var(--red);">Clear Current Chat</span><span style="color:var(--txt3);">›</span>
            </div>
            <div class="isim-set-row" style="cursor:pointer" onclick="window.__isimResetAll()">
              <span style="color:var(--red);">Reset All Data</span><span style="color:var(--txt3);">›</span>
            </div>
          </div>
        </div>
      </div>
      <div class="isim-home-bar"></div>
    </div>

    <!-- Sticker manager screen -->
    <div class="isim-screen" id="isim-scr-stickers">
      <div class="isim-nav">
        <button class="isim-nav-back" onclick="window.__isimNav('settings')">‹</button>
        <span class="isim-nav-title">Stickers</span>
        <button class="isim-nav-action" onclick="document.getElementById('isim-sticker-input-mgr').click()">+</button>
      </div>
      <input type="file" id="isim-sticker-input-mgr" accept="image/*" style="display:none" onchange="window.__isimAddStickerMgr(this)">
      <div id="isim-sticker-mgr-grid" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-wrap:wrap;gap:10px;"></div>
      <div class="isim-home-bar"></div>
    </div>

    <!-- STORY VIEWER -->
    <div id="isim-story-viewer">
      <div class="isim-story-progress" id="isim-story-progress"></div>
      <div class="isim-story-user">
        <img class="isim-story-user-av" id="isim-story-user-av" src="" alt="">
        <span class="isim-story-user-nm" id="isim-story-user-nm">Name</span>
      </div>
      <button class="isim-story-close" onclick="window.__isimCloseStory()">x</button>
      <div id="isim-story-img"></div>
      <div class="isim-story-text-overlay" id="isim-story-text-overlay"></div>
      <div class="isim-story-reading" id="isim-story-reading">Reading image...</div>
      <div class="isim-story-reply-bar">
        <input id="isim-story-reply-inp" placeholder="Reply to story...">
        <button style="background:#1d9bf0;border:none;color:#fff;border-radius:50%;width:38px;height:38px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;" onclick="window.__isimReplyStory()">^</button>
      </div>
    </div>

    <!-- CALL SCREEN -->
    <div id="isim-call">
      <div id="isim-call-bg"></div>
      <div class="isim-call-mid">
        <img id="isim-call-av" src="" alt="">
        <div id="isim-call-name" style="font-size:28px;font-weight:700;color:#fff;"></div>
        <div id="isim-call-stat" style="font-size:15px;color:rgba(255,255,255,.6);margin-top:4px;">Calling...</div>
        <div id="isim-call-dur" style="font-size:22px;color:rgba(255,255,255,.8);font-variant-numeric:tabular-nums;margin-top:6px;">0:00</div>
        <div id="isim-call-started-at" style="font-size:12px;color:rgba(255,255,255,.4);margin-top:2px;"></div>
        <!-- Green bot typing indicator -->
        <div id="isim-call-typing-indicator" style="display:none;margin-top:10px;padding:8px 18px;background:rgba(48,209,88,.2);border:1.5px solid rgba(48,209,88,.6);border-radius:20px;backdrop-filter:blur(8px);transition:opacity .3s;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:8px;height:8px;border-radius:50%;background:#30d158;animation:callPulse 1s ease-in-out infinite;"></div>
            <span style="font-size:13px;color:#30d158;font-weight:600;" id="isim-call-bot-name-typing">Bot is speaking...</span>
          </div>
        </div>
      </div>
      <div id="isim-call-float"></div>
      <div class="isim-call-typebar">
        <input id="isim-call-inp" placeholder="Type during call..." style="flex:1;background:rgba(255,255,255,.12);border:none;border-radius:22px;padding:11px 16px;color:#fff;font-size:15px;">
        <button id="isim-call-confirm" class="isim-call-confirm-btn" onclick="window.__isimCallSend()" style="display:none;">Send</button>
      </div>
      <div class="isim-call-ctls">
        <button class="icircle" onclick="window.__isimMute()">
          <div class="icircle-bg" id="isim-mute-circle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 1c-1.66 0-3 1.34-3 3v8c0 1.66 1.34 3 3 3s3-1.34 3-3V4c0-1.66-1.34-3-3-3zm-1 19.93V23h2v-2.07C16.39 20.46 19 17.53 19 14h-2c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.46 6 6.93z"/></svg>
          </div><span style="font-size:11px;color:rgba(255,255,255,.7);">Mute</span>
        </button>
        <button class="icircle" onclick="window.__isimEndCall()">
          <div class="icircle-bg red">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.12-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" transform="rotate(135 12 12)"/></svg>
          </div><span style="font-size:11px;color:rgba(255,255,255,.7);">End</span>
        </button>
        <button class="icircle">
          <div class="icircle-bg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
          </div><span style="font-size:11px;color:rgba(255,255,255,.7);">Speaker</span>
        </button>
      </div>
    </div>

    <!-- CALL HISTORY MODAL -->
    <div id="isim-call-history" style="display:none;position:absolute;inset:0;z-index:500;background:var(--bg);flex-direction:column;">
      <div class="isim-nav">
        <button class="isim-nav-back" onclick="document.getElementById('isim-call-history').style.display='none'">‹ Back</button>
        <span class="isim-nav-title">Call Log</span>
      </div>
      <div id="isim-call-history-list" style="flex:1;overflow-y:auto;padding:8px 0;"></div>
    </div>

    <!-- CALL TRANSCRIPT MODAL -->
    <div id="isim-call-transcript" style="display:none;position:absolute;inset:0;z-index:501;background:var(--bg);flex-direction:column;">
      <div class="isim-nav">
        <button class="isim-nav-back" onclick="document.getElementById('isim-call-transcript').style.display='none';document.getElementById('isim-call-history').style.display='flex'">‹ Back</button>
        <span class="isim-nav-title" id="isim-transcript-title">Call Transcript</span>
      </div>
      <div id="isim-transcript-body" style="flex:1;overflow-y:auto;padding:14px 16px;font-size:14px;color:var(--txt);line-height:1.7;white-space:pre-wrap;"></div>
    </div>

    <!-- STORY ADD INPUT (hidden) -->
    <input type="file" id="isim-story-input" accept="image/*" style="display:none" onchange="window.__isimUploadStory(this)">

    <!-- TOAST -->
    <div id="isim-toast"></div>

  </div>
</div>
    `;
}

// ===== OPEN / CLOSE =====
function openPhone() {
    const el = document.getElementById('isim-phone');
    if (!el) return;
    el.classList.add('open');
    phoneOpen = true;
    applyTheme(); applyAccent();
    startClock(); syncSettings();
    updateXUserAvatar();
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
    if (screen === 'call-history') { window.__isimShowCallHistory(); return; }
    document.querySelectorAll('#isim-screen .isim-screen').forEach(s => s.classList.remove('show'));
    document.getElementById('isim-home').style.display = 'none';
    document.getElementById('isim-story-viewer')?.classList.remove('show');
    document.getElementById('isim-call')?.classList.remove('show');
    document.getElementById('isim-tweet-detail')?.classList.remove('show');
    document.getElementById('isim-call-history')?.style && (document.getElementById('isim-call-history').style.display = 'none');
    document.getElementById('isim-call-transcript')?.style && (document.getElementById('isim-call-transcript').style.display = 'none');

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
        if (screen === 'stickers') renderStickerManager();
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
    const acc = cfg().accent || '#1d9bf0';
    frame.style.setProperty('--accent', acc);
    frame.style.setProperty('--bub-out', acc);
}
function syncSettings() {
    applyTheme(); applyAccent();
    const toggle = document.getElementById('isim-dark-toggle');
    if (toggle) toggle.checked = (cfg().theme || 'dark') === 'dark';
    document.querySelectorAll('.isim-swatch').forEach(sw => {
        sw.classList.toggle('on', sw.dataset.c === (cfg().accent || '#1d9bf0'));
    });
}
function updateXUserAvatar() {
    const av = getUserAvatar();
    const el = document.getElementById('isim-x-user-av');
    if (el) el.src = av;
    const el2 = document.getElementById('isim-compose-av');
    if (el2) el2.src = av;
    const el3 = document.getElementById('isim-reply-user-av');
    if (el3) el3.src = av;
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
    const stories = (cfg().stories || []).filter(s => Date.now() - s.timestamp < 24*3600000);
    const friends = cfg().friends || [];

    let html = `<div class="isim-story-item" onclick="window.__isimAddMyStory()">
        <div class="isim-story-ring add">+</div>
        <span class="isim-story-name">My Story</span>
    </div>`;

    // My stories
    const myStories = stories.filter(s => s.isMe);
    if (myStories.length) {
        html = `<div class="isim-story-item" onclick="window.__isimViewMyStory()">
            <div class="isim-story-ring" style="padding:3px;">
                <img class="isim-story-av" src="${esc(myStories[myStories.length-1].image)}" onerror="this.style.background='var(--bg3)'">
            </div>
            <span class="isim-story-name">My Story</span>
        </div>
        <div class="isim-story-item" onclick="window.__isimAddMyStory()">
            <div class="isim-story-ring add">+</div>
            <span class="isim-story-name">Add</span>
        </div>`;
    }

    // Bot stories
    friends.forEach(f => {
        const fStories = stories.filter(s => s.uid === f.id && !s.isMe);
        if (fStories.length) {
            html += `<div class="isim-story-item" onclick="window.__isimViewFriendStory('${esc(f.id)}')">
                <div class="isim-story-ring" style="padding:3px;background:linear-gradient(45deg,#1d9bf0,#bf5af2);">
                    <img class="isim-story-av" src="${esc(f.avatar||'')}" onerror="this.style.background='var(--bg3)'">
                </div>
                <span class="isim-story-name">${esc(f.name.substring(0,8))}</span>
            </div>`;
        }
    });

    bar.innerHTML = html;
}

function renderNotesBar() {
    const bar = document.getElementById('isim-notes-bar');
    if (!bar) return;
    const now24 = Date.now() - 24*3600000;
    const friends = cfg().friends || [];
    const active = friends.filter(f => cfg().botnotes[f.id] && cfg().botnotes[f.id].timestamp > now24);
    if (!active.length) { bar.innerHTML = ''; bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    // Instagram-style scrollable notes row
    let html = '';
    active.forEach(f => {
        const note = cfg().botnotes[f.id];
        // Check if expired (>24h)
        const idx = friends.indexOf(f);
        if (idx >= 24) return; // max 24 visible
        html += `<div onclick="window.__isimViewBotNote('${esc(f.id)}')" style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;cursor:pointer;width:68px;">
            <div style="position:relative;width:60px;height:60px;">
                <div style="width:60px;height:60px;border-radius:50%;border:2px solid var(--accent);overflow:hidden;background:var(--bg3);display:flex;align-items:center;justify-content:center;">
                    <img src="${esc(f.avatar||'')}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
                </div>
                <div style="position:absolute;bottom:-2px;right:-2px;background:var(--bg2);border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--accent);overflow:hidden;">
                    <span style="font-size:10px;color:var(--txt2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px;max-width:18px;">N</span>
                </div>
            </div>
            <div style="font-size:10px;color:var(--txt2);text-align:center;width:68px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(f.name.substring(0,8))}</div>
            <div style="font-size:9px;color:var(--txt3);text-align:center;width:68px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-style:italic;">"${esc((note.text||'').substring(0,15))}"</div>
        </div>`;
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
    const sorted = [...friends].sort((a,b) => {
        const ap = pinned.includes(a.id), bp = pinned.includes(b.id);
        if (ap && !bp) return -1; if (!ap && bp) return 1; return 0;
    });
    list.innerHTML = sorted.map(f => {
        const hist = cfg().history[f.id] || [];
        const last = hist[hist.length-1];
        const preview = last ? (
            last.type === 'sticker' ? 'Sticker' :
            last.type === 'photo' ? 'Photo' :
            last.type === 'redenv' ? 'Red Envelope' :
            last.type === 'location' ? `Location: ${last.content}` :
            (last.content || '').substring(0,40)
        ) : 'Start chatting';
        const lastTime = last ? fmtDate(last.ts||Date.now()) : '';
        const isPinned = pinned.includes(f.id);
        const now24 = Date.now() - 24*3600000;
        const hasNote = cfg().botnotes[f.id] && cfg().botnotes[f.id].timestamp > now24;
        return `<div class="isim-chat-row" onclick="window.__isimOpenChat('${esc(f.id)}')" oncontextmenu="event.preventDefault();window.__isimChatLongPress('${esc(f.id)}')">
            <div class="isim-chat-av-wrap">
                <img class="isim-chat-list-av" src="${esc(f.avatar||'')}" onerror="this.style.background='var(--bg3)'">
                <div class="isim-chat-online"></div>
                ${hasNote ? `<div style="position:absolute;top:-4px;left:-4px;width:18px;height:18px;background:var(--orange);border-radius:50%;font-size:10px;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--bg);">N</div>` : ''}
            </div>
            <div class="isim-chat-meta">
                <div class="isim-chat-top">
                    <span class="isim-chat-nm">${esc(f.name)}${isPinned ? ' [P]' : ''}</span>
                    <span class="isim-chat-time">${esc(lastTime)}</span>
                </div>
                <div class="isim-chat-preview">${esc(preview)}</div>
            </div>
        </div>`;
    }).join('');
}

window.__isimFilterMessages = function(q) {
    const friends = (cfg().friends||[]).filter(f => f.name.toLowerCase().includes(q.toLowerCase()));
    const list = document.getElementById('isim-chat-list');
    if (!list) return;
    if (!q) { renderChatList(); return; }
    if (!friends.length) { list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--txt3);">No results</div>'; return; }
    const prev = cfg().friends;
    cfg().friends = friends; renderChatList(); cfg().friends = prev;
};

window.__isimOpenChat = function(id) {
    const f = cfg().friends.find(f => f.id === id);
    if (!f) return;
    activeFriend = f;
    pendingMessages = [];
    editModeActive = false;
    window.__isimNav('chat');
};
window.__isimChatLongPress = function(id) {
    const pinned = cfg().pinnedChats || [];
    const isPinned = pinned.includes(id);
    const f = cfg().friends.find(f => f.id === id);
    if (!f) return;
    const action = confirm(`${f.name}\n\n${isPinned ? 'Unpin' : 'Pin'} chat?`);
    if (action) {
        if (isPinned) cfg().pinnedChats = pinned.filter(p => p !== id);
        else { if (!cfg().pinnedChats) cfg().pinnedChats = []; cfg().pinnedChats.push(id); }
        save(); renderChatList();
        toast(isPinned ? 'Unpinned' : 'Pinned');
    }
};

// ===== CHAT =====
function renderChat() {
    const f = activeFriend;
    if (!f) { window.__isimNav('messages'); return; }
    const title = document.getElementById('isim-chat-title');
    const av = document.getElementById('isim-chat-av');
    if (title) title.textContent = f.name;
    if (av) { av.src = f.avatar||''; av.onerror = () => { av.style.background='var(--bg3)'; }; }
    updateBotNoteBubble();
    loadHistory(f.id);
    applyWallpaper();
    const ta = document.getElementById('isim-noteta');
    if (ta) ta.value = cfg().notes[f.id] || '';
    // Update red envelope recipient select
    const sel = document.getElementById('isim-redenv-to');
    if (sel) {
        sel.innerHTML = '<option value="">Current chat</option>';
        (cfg().friends||[]).forEach(fr => {
            const opt = document.createElement('option');
            opt.value = fr.id; opt.textContent = fr.name;
            sel.appendChild(opt);
        });
    }
}

function updateBotNoteBubble() {
    const bubble = document.getElementById('isim-bot-note-bubble');
    if (!bubble || !activeFriend) return;
    const note = cfg().botnotes[activeFriend.id];
    const now24 = Date.now() - 24*3600000;
    if (note && note.timestamp > now24 && note.text) {
        bubble.textContent = note.text.substring(0,30);
        bubble.style.display = 'block';
    } else bubble.style.display = 'none';
}

function loadHistory(fid) {
    const msgs = document.getElementById('isim-msgs');
    if (!msgs) return;
    msgs.innerHTML = '';
    const allHist = cfg().history[fid] || [];
    const limit = cfg().historyLimit || 50;
    const hist = allHist.slice(-limit);
    const offset = allHist.length - hist.length;
    if (!allHist.length) { msgs.innerHTML = '<div class="isim-sys">Start chatting</div>'; return; }
    if (offset > 0) {
        const notice = document.createElement('div');
        notice.className = 'isim-sys';
        notice.textContent = `↑ ${offset} older messages hidden`;
        msgs.appendChild(notice);
    }
    hist.forEach((m, i) => appendBubble(m, false, offset + i));
    msgs.scrollTop = msgs.scrollHeight;
}

function appendBubble(msg, scroll=true, idx) {
    const msgs = document.getElementById('isim-msgs');
    if (!msgs || !msg) return;
    // System call note
    if (msg.type === 'callnote') {
        const el = document.createElement('div');
        el.className = 'isim-sys';
        el.textContent = msg.content;
        msgs.appendChild(el);
        if (scroll) msgs.scrollTop = msgs.scrollHeight;
        return;
    }
    if (!activeFriend) return;
    const dir = msg.from === 'user' ? 'out' : 'in';
    const userAv = getUserAvatar();
    const av = dir === 'in'
        ? `<img class="isim-av" src="${esc(activeFriend.avatar||'')}" alt="" onerror="this.style.background='var(--bg3)'">`
        : `<img class="isim-av" src="${esc(userAv)}" alt="" onerror="this.style.background='var(--bg3)'" style="display:${editModeActive?'block':'none'};">`;
    let inner = '';
    if (msg.type === 'sticker') {
        inner = `<img src="${esc(msg.content)}" style="max-width:100px;max-height:100px;border-radius:10px;display:block">`;
    } else if (msg.type === 'photo') {
        inner = `<img src="${esc(msg.content)}" style="max-width:170px;border-radius:14px;display:block">`;
    } else if (msg.type === 'location') {
        // Rich location card
        inner = `<div style="min-width:160px;">
            <div style="background:rgba(255,255,255,.08);border-radius:10px;overflow:hidden;margin-bottom:4px;height:60px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a3a4a,#0d2137);">
                <span style="font-size:28px;">🗺️</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;">
                <span style="font-size:16px;">📍</span>
                <span>${esc(msg.content)}</span>
            </div>
            <div style="font-size:11px;opacity:.5;margin-top:2px;">Shared Location</div>
        </div>`;
    } else if (msg.type === 'redenv') {
        const c = msg.content;
        const isOut = dir === 'out';
        inner = `<div style="text-align:center;min-width:140px;padding:4px 2px;">
            <div style="background:linear-gradient(135deg,#c0000a,#e02020,#ff4040);border-radius:12px;padding:16px 12px;margin-bottom:4px;box-shadow:0 4px 15px rgba(192,0,10,.4);">
                <div style="font-size:36px;margin-bottom:6px;">🧧</div>
                <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">฿${esc(c.amount)}</div>
                ${c.note ? `<div style="font-size:12px;color:rgba(255,255,255,.75);margin-top:4px;">"${esc(c.note)}"</div>` : ''}
            </div>
            <div style="font-size:11px;opacity:.5;">${isOut ? 'Red Envelope Sent' : 'Red Envelope Received'}</div>
        </div>`;
    } else if (msg.type === 'voice') {
        const dur = msg.duration || '?';
        const bars = Array.from({length:12},(_,i) => {
            const h = 4 + Math.floor(Math.sin(i*0.7+1)*8) + Math.floor(Math.random()*8);
            return `<div style="width:3px;height:${h}px;background:currentColor;border-radius:2px;opacity:${0.4+Math.random()*0.6};"></div>`;
        }).join('');
        inner = `<div style="display:flex;align-items:center;gap:8px;min-width:160px;padding:2px 0;">
            <button onclick="window.__isimPlayVoice(this)" style="width:32px;height:32px;border-radius:50%;border:none;background:rgba(255,255,255,.15);color:inherit;cursor:pointer;font-size:14px;flex-shrink:0;">▶</button>
            <div style="display:flex;align-items:center;gap:1.5px;flex:1;">${bars}</div>
            <span style="font-size:11px;opacity:.6;flex-shrink:0;">${dur}s</span>
        </div>`;
    } else {
        inner = esc(msg.content);
    }
    const el = document.createElement('div');
    el.className = `isim-row ${dir} isim-bounce ${editModeActive ? 'edit-active' : ''}`;
    el.dataset.idx = idx !== undefined ? idx : '';

    const delBtn = idx !== undefined
        ? `<button class="isim-del-btn" onclick="window.__isimDeleteMsg(${idx})" title="Delete">x</button>`
        : '';

    el.innerHTML = `${dir==='in' ? av : ''}<div class="isim-wrap"><div class="isim-bub">${inner}</div><span class="isim-time">${esc(msg.time||'')}</span></div>${dir==='out' ? delBtn : ''}${dir==='out' ? av : ''}`;

    if (dir === 'in' && idx !== undefined) {
        // Put del button before avatar for incoming messages in edit mode
        el.innerHTML = `${av}<div class="isim-wrap"><div class="isim-bub">${inner}</div><span class="isim-time">${esc(msg.time||'')}</span></div>${delBtn}`;
    }

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
    if (h[fid].length > 100) h[fid] = h[fid].slice(-100);
    save();
}

// Edit mode
window.__isimToggleEditMode = function() {
    editModeActive = !editModeActive;
    const fid = activeFriend?.id;
    if (fid) loadHistory(fid);
    toast(editModeActive ? 'Edit mode on — tap x to delete' : 'Edit mode off');
};
window.__isimDeleteMsg = function(idx) {
    const fid = activeFriend?.id;
    if (!fid) return;
    const h = cfg().history[fid];
    if (!h || idx === undefined || idx < 0 || idx >= h.length) return;
    h.splice(idx, 1);
    save();
    loadHistory(fid);
    toast('Message deleted');
};

window.__isimSend = function() {
    if (!activeFriend) { toast('Select a contact first'); return; }
    const inp = document.getElementById('isim-input');
    const text = inp.value.trim();
    if (!text) return;
    inp.value = ''; inp.style.height = 'auto';
    const hist = cfg().history[activeFriend.id] || [];
    const idx = hist.length;
    const msg = { from: 'user', content: text, time: now() };
    saveMsg(msg);
    appendBubble(msg, true, idx);
    pendingMessages.push(msg);
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
    save(); loadHistory(fid); botReply();
};
window.__isimCancelBot = function() {
    if (isTyping) {
        isTyping = false;
        if (botAbortController) { botAbortController.abort(); botAbortController = null; }
        document.getElementById('isim-typing-row')?.remove();
        document.getElementById('isim-cancelbtn').style.display = 'none';
        document.getElementById('isim-botsendbtn').style.display = 'flex';
        document.getElementById('isim-sendbtn').disabled = false;
        toast('Cancelled');
    }
};

// ===== BOT REPLY =====
async function botReply() {
    if (!activeFriend || isTyping) return;
    isTyping = true;

    const sendBtn = document.getElementById('isim-sendbtn');
    const cancelBtn = document.getElementById('isim-cancelbtn');
    const botBtn = document.getElementById('isim-botsendbtn');
    if (sendBtn) sendBtn.disabled = true;
    if (cancelBtn) cancelBtn.style.display = 'flex';
    if (botBtn) botBtn.style.display = 'none';

    const msgs = document.getElementById('isim-msgs');
    const typingRow = document.createElement('div');
    typingRow.className = 'isim-row in';
    typingRow.id = 'isim-typing-row';
    typingRow.innerHTML = `<img class="isim-av" src="${esc(activeFriend.avatar||'')}" alt="" onerror="this.style.background='var(--bg3)'"><div class="isim-typing"><span></span><span></span><span></span></div>`;
    if (msgs) { msgs.appendChild(typingRow); msgs.scrollTop = msgs.scrollHeight; }

    try {
        const f = activeFriend;
        const s = cfg();

        // ── Get ST context ──
        let ctx;
        try { ctx = SillyTavern.getContext(); } catch { ctx = null; }

        const playerName = getUserName();

        // ── Build chat history (last 14 messages) ──
        const hist = (s.history[f.id]||[]).slice(-14);
        const histText = hist.map(m => {
            const who = m.from === 'user' ? playerName : (f.customName || f.name);
            if (m.type === 'sticker') return `${who}: [สติกเกอร์]`;
            if (m.type === 'photo') return `${who}: [รูปภาพ]`;
            if (m.type === 'location') return `${who}: [Location: ${m.content}]`;
            if (m.type === 'redenv') return `${who}: [ส่งซองแดง ฿${m.content?.amount}]`;
            if (m.type === 'voice') return `${who}: [Voice message]`;
            return `${who}: ${m.content||''}`;
        }).join('\n');

        // ── Context bits ──
        const displayName = f.customName || f.name;
        const botNote = s.botnotes[f.id];
        const validBotNote = botNote && (Date.now()-botNote.timestamp < 86400000) ? botNote.text : '';
        const userNote = s.notes[f.id] || '';
        const stickerList = (s.stickers||[]).slice(0,5).map((stk,i)=>`[STICKER:${i}]=${stk.meaning||'sticker'}`).join(', ');

        // ── Prompt (v2-style: simple and proven to work) ──
        const prompt = `[iPhone iMessage Simulation]
You are ${displayName}. ${f.persona || ''}
You are texting ${playerName} on iPhone. Respond naturally like real SMS.
${userNote ? `Info about ${playerName}: "${userNote}"` : ''}
${validBotNote ? `Your current status: "${validBotNote}"` : ''}

Chat history:
${histText}

RULES:
- Reply as ${displayName} only. 1-3 short messages max.
- Separate each message with [MSG] on a new line.
- No asterisks, no action text, no roleplay narration.
- No <think> tags. No name prefix before your reply.
- Match language: Thai if they write Thai, English if English.
- Optional special lines (use naturally, one per line):
  [STICKER:N] for saved sticker${stickerList ? ' ('+stickerList+')' : ''}
  [STICKER_EMOJI:🎉] for emoji sticker
  [LOCATION:ชื่อสถานที่] to share location
  [REDENV:100:ข้อความ] to send red envelope
  [VOICE:5] for voice message (N seconds)
  [NOTE:ข้อความ] to post your status note

Reply now as ${displayName}:`;

        let rawReply = '';
        if (ctx && typeof ctx.generateQuietPrompt === 'function') {
            rawReply = await ctx.generateQuietPrompt(prompt, false, false);
        } else if (typeof window.generateQuietPrompt === 'function') {
            rawReply = await window.generateQuietPrompt(prompt, false, false);
        } else {
            throw new Error('generateQuietPrompt not available — please set up your AI model in SillyTavern');
        }

        // ── Clean reply ──
        rawReply = cleanThink(String(rawReply||''));
        // Strip name prefix (e.g. "สุ่ย: hello" → "hello")
        rawReply = rawReply.replace(new RegExp('^' + displayName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\s*:\\s*', 'gim'), '');
        rawReply = rawReply.replace(new RegExp('^' + f.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\s*:\\s*', 'gim'), '');
        // Strip outer quotes
        rawReply = rawReply.replace(/^[\u201c\u201d"']|[\u201c\u201d"']$/g,'').trim();

        typingRow.remove();
        isTyping = false;
        if (sendBtn) sendBtn.disabled = false;
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (botBtn) botBtn.style.display = 'flex';

        if (!rawReply) { toast('⚠ Bot returned empty reply'); return; }

        // ── Handle [NOTE:] first ──
        for (const nm of [...rawReply.matchAll(/\[NOTE:([^\]]+)\]/g)]) {
            const noteText = nm[1].trim();
            cfg().botnotes[f.id] = { text: noteText, timestamp: Date.now() };
            save(); updateBotNoteBubble(); renderNotesBar();
            toast(`${displayName} posted a note`);
        }
        rawReply = rawReply.replace(/\[NOTE:[^\]]+\]/g,'').trim();

        // ── Parse output into parts ──
        // Split on [MSG] or newlines — both work
        const rawLines = rawReply.split(/\[MSG\]|\n/).map(l=>l.trim()).filter(l=>l);
        let parts = [];

        for (const line of rawLines) {
            if (/^\[STICKER:(\d+)\]$/i.test(line)) {
                const idx = parseInt(line.match(/\d+/)[0]);
                const stk = (s.stickers||[])[idx];
                parts.push(stk ? { type:'sticker_img', src:stk.src } : { type:'sticker_emoji', content:'✨' });
            } else if (/^\[STICKER_EMOJI:(.+)\]$/i.test(line)) {
                parts.push({ type:'sticker_emoji', content: line.match(/^\[STICKER_EMOJI:(.+)\]$/i)[1] });
            } else if (/^\[LOCATION:(.+)\]$/i.test(line)) {
                parts.push({ type:'location', content: line.match(/^\[LOCATION:(.+)\]$/i)[1].trim() });
            } else if (/^\[REDENV:([^:\]]+):?([^\]]*)\]$/i.test(line)) {
                const m2 = line.match(/^\[REDENV:([^:\]]+):?([^\]]*)\]$/i);
                parts.push({ type:'redenv', amount: m2[1].trim(), note: (m2[2]||'').trim() });
            } else if (/^\[VOICE:(\d+)\]$/i.test(line)) {
                parts.push({ type:'voice', duration: parseInt(line.match(/\d+/)[0])||3 });
            } else {
                // Plain text — strip any leftover tag-like junk and name prefix
                let content = line
                    .replace(/^\[MSG\]\s*/i,'')
                    .replace(new RegExp('^' + displayName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\s*:\\s*','i'),'')
                    .replace(/^[\u201c\u201d"']|[\u201c\u201d"']$/g,'')
                    .trim();
                if (content && !/^\[[A-Z_]+:/i.test(content)) {
                    parts.push({ type:'text', content });
                }
            }
        }

        // Fallback: if still empty, use whole rawReply as single message
        if (!parts.length) {
            const cleaned = rawReply.replace(/\[[A-Z_]+:[^\]]*\]/gi,'').trim();
            if (cleaned) parts.push({ type:'text', content: cleaned });
            else parts.push({ type:'text', content: '...' });
        }

        // ── Send each part with typing delay ──
        for (let i = 0; i < parts.length; i++) {
            if (i > 0) {
                const t2 = document.createElement('div');
                t2.className = 'isim-row in'; t2.id = 'isim-typing-row';
                t2.innerHTML = `<img class="isim-av" src="${esc(f.avatar||'')}" alt="" onerror="this.style.background='var(--bg3)'"><div class="isim-typing"><span></span><span></span><span></span></div>`;
                if (msgs) { msgs.appendChild(t2); msgs.scrollTop = msgs.scrollHeight; }
                await new Promise(r => setTimeout(r, 600 + Math.random()*800));
                t2.remove();
            }
            const part = parts[i];
            const newIdx = (cfg().history[f.id]||[]).length;
            let botMsg;

            if (part.type === 'sticker_img') {
                botMsg = { from:'bot', type:'sticker', content:part.src, time:now() };
                saveMsg(botMsg); appendBubble(botMsg, true, newIdx);
                showNotif(displayName, 'Sent a sticker', f.avatar);
            } else if (part.type === 'sticker_emoji') {
                const el2 = document.createElement('div');
                el2.className = 'isim-row in isim-bounce';
                el2.innerHTML = `<img class="isim-av" src="${esc(f.avatar||'')}" alt="" onerror="this.style.background='var(--bg3)'"><div class="isim-wrap"><div class="isim-bub" style="font-size:44px;background:transparent;padding:4px;">${esc(part.content)}</div><span class="isim-time">${now()}</span></div>`;
                if (msgs) { msgs.appendChild(el2); msgs.scrollTop = msgs.scrollHeight; }
                botMsg = { from:'bot', type:'sticker_emoji', content:part.content, time:now() };
                saveMsg(botMsg);
                showNotif(displayName, part.content, f.avatar);
            } else if (part.type === 'location') {
                botMsg = { from:'bot', type:'location', content:part.content, time:now() };
                saveMsg(botMsg); appendBubble(botMsg, true, newIdx);
                showNotif(displayName, 'Shared location: '+part.content, f.avatar);
            } else if (part.type === 'redenv') {
                botMsg = { from:'bot', type:'redenv', content:{ amount:part.amount, note:part.note }, time:now() };
                saveMsg(botMsg); appendBubble(botMsg, true, newIdx);
                const amt = parseFloat(part.amount)||0;
                if (amt > 0) {
                    cfg().bank.balance += amt;
                    cfg().bank.transactions.unshift({ type:'receive', amount:amt, from:displayName, note:part.note||'Red Envelope', date:Date.now() });
                    save(); renderBank();
                }
                showNotif(displayName, `Sent Red Envelope ฿${part.amount}`, f.avatar);
            } else if (part.type === 'voice') {
                botMsg = { from:'bot', type:'voice', content:'', duration:part.duration, time:now() };
                saveMsg(botMsg); appendBubble(botMsg, true, newIdx);
                showNotif(displayName, `Voice message (${part.duration}s)`, f.avatar);
            } else {
                botMsg = { from:'bot', content:part.content, time:now() };
                saveMsg(botMsg); appendBubble(botMsg, true, newIdx);
                showNotif(displayName, part.content, f.avatar);
            }
            if (callActive) showCallFloat(part.content || '['+part.type+']');
        }
        pendingMessages = [];

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

// ===== VOICE MESSAGE =====
let mediaRecorder = null;
let voiceChunks = [];
let voiceRecording = false;

window.__isimVoiceRecord = function() {
    const btn = document.getElementById('isim-voicebtn');
    if (voiceRecording) {
        // Stop recording
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        voiceRecording = false;
        if (btn) { btn.textContent = '🎙'; btn.style.background = 'var(--bg3)'; btn.style.animation = ''; }
        return;
    }
    // Start recording
    if (!navigator.mediaDevices?.getUserMedia) {
        // Fallback: fake voice message
        window.__isimSendFakeVoice();
        return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        voiceChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = e => voiceChunks.push(e.data);
        mediaRecorder.onstop = () => {
            stream.getTracks().forEach(t => t.stop());
            const blob = new Blob(voiceChunks, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            const duration = Math.floor(Math.random()*8)+2;
            window.__isimSendVoiceMsg(url, duration, true);
        };
        mediaRecorder.start();
        voiceRecording = true;
        if (btn) {
            btn.textContent = '⏹';
            btn.style.background = 'var(--red)';
            btn.style.animation = 'callPulse 1s ease-in-out infinite';
        }
        toast('Recording... tap again to send');
    }).catch(() => window.__isimSendFakeVoice());
};

window.__isimSendFakeVoice = function() {
    if (!activeFriend) return;
    const duration = Math.floor(Math.random()*8)+2;
    window.__isimSendVoiceMsg(null, duration, false);
};

window.__isimSendVoiceMsg = function(url, duration, real) {
    if (!activeFriend) return;
    const hist = cfg().history[activeFriend.id]||[];
    const idx = hist.length;
    const msg = { from: 'user', type: 'voice', content: url||'', duration, time: now() };
    saveMsg(msg);
    appendBubble(msg, true, idx);
    pendingMessages.push(msg);
    toast(`Voice message sent (${duration}s)`);
};

window.__isimPlayVoice = function(btn) {
    // Simple visual feedback - can't play blob urls after navigation
    btn.textContent = '⏸';
    setTimeout(() => { btn.textContent = '▶'; }, 2000);
    toast('Playing voice message...');
};
window.__isimToggleNote = function() {
    document.getElementById('isim-notepanel')?.classList.toggle('show');
};
window.__isimSaveNote = function() {
    const fid = activeFriend?.id;
    if (!fid) return;
    const text = document.getElementById('isim-noteta')?.value.trim()||'';
    cfg().notes[fid] = text; save();
    document.getElementById('isim-notepanel')?.classList.remove('show');
    toast('Note saved');
};
window.__isimSetBotNotePrompt = function() {
    if (!activeFriend || isTyping) return;
    botReplyBotNote();
};
async function botReplyBotNote() {
    if (!activeFriend || isTyping) return;
    const f = activeFriend; const s = cfg();
    const playerName = getUserName();
    isTyping = true;
    const msgs = document.getElementById('isim-msgs');
    const typingRow = document.createElement('div');
    typingRow.className = 'isim-row in'; typingRow.id = 'isim-typing-row';
    typingRow.innerHTML = `<img class="isim-av" src="${esc(f.avatar||'')}" alt=""><div class="isim-typing"><span></span><span></span><span></span></div>`;
    if (msgs) { msgs.appendChild(typingRow); msgs.scrollTop = msgs.scrollHeight; }
    try {
        const hist = (s.history[f.id]||[]).slice(-5).map(m => (m.from==='user'?playerName:f.name)+': '+(m.content||'')).join('\n');
        const prompt = `You are ${f.name}. ${f.persona||''}
Write a short profile note/status (max 20 words) that ${f.name} would post right now based on context.
Context: ${hist}
Write ONLY the note text. No quotes. No tags. Just the note. Example: "Having a great day at the beach!"`;
        const ctx = SillyTavern.getContext();
        let reply = '';
        if (typeof ctx.generateQuietPrompt === 'function') {
            reply = await ctx.generateQuietPrompt(prompt, false, false);
        } else if (typeof window.generateQuietPrompt === 'function') {
            reply = await window.generateQuietPrompt(prompt, false, false);
        }
        reply = cleanThink(String(reply||'').trim());
        reply = reply.replace(/^[MSG]\s*/i,'').replace(/\[[A-Z_]+:[^\]]*\]/g,'').replace(/^["'"""«»]|["'"""«»]$/g,'').trim();
        const _bnNameRx = new RegExp('^' + (activeFriend?.name||'bot').replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\s*:\\s*', 'i');
        reply = reply.replace(_bnNameRx,'').split('\n')[0].trim();
        // Remove any [TAG:...] artifacts
        reply = reply.replace(/\[[A-Z_]+:[^\]]*\]/g,'').replace(/\[MSG\]/g,'').trim();
        if (reply) {
            cfg().botnotes[f.id] = { text: reply, timestamp: Date.now() };
            save(); updateBotNoteBubble(); renderNotesBar();
            showNotif(f.name, 'Updated their note: ' + reply, f.avatar);
            toast(`${f.name} posted a note`);
        }
    } catch {}
    typingRow.remove(); isTyping = false;
}
window.__isimViewBotNote = function(id) {
    const f = cfg().friends.find(f => f.id === id);
    const note = cfg().botnotes[id];
    if (!f || !note) return;
    alert(`Note from ${f.name}:\n\n"${note.text}"\n\n(Posted ${fmtDate(note.timestamp)})`);
};

// ===== WALLPAPER =====
window.__isimToggleWpPicker = function() {
    // Legacy - redirect to chat settings
    window.__isimToggleChatSettings();
};
window.__isimToggleChatSettings = function() {
    const panel = document.getElementById('isim-chat-settings');
    if (!panel) return;
    const isVisible = panel.style.display === 'flex';
    panel.style.display = isVisible ? 'none' : 'flex';
    document.getElementById('isim-plussheet')?.classList.remove('show');
    if (!isVisible && activeFriend) {
        // Populate current values
        const nameInput = document.getElementById('isim-char-name-input');
        if (nameInput) nameInput.value = activeFriend.customName || activeFriend.name || '';
        const limitInput = document.getElementById('isim-history-limit');
        if (limitInput) limitInput.value = cfg().historyLimit || 50;
    }
};
window.__isimSetBubbleColor = function(color) {
    cfg().accent = color; save(); applyAccent();
    // Update bubble color for current chat
    applyWallpaper();
    toast('Bubble color updated');
};
window.__isimSaveCharName = function() {
    if (!activeFriend) return;
    const input = document.getElementById('isim-char-name-input');
    const name = input?.value.trim();
    if (!name) return;
    activeFriend.customName = name;
    // Update in friends list
    const f = cfg().friends.find(f => f.id === activeFriend.id);
    if (f) { f.customName = name; save(); }
    // Update chat title
    const titleEl = document.getElementById('isim-chat-title');
    if (titleEl) titleEl.textContent = name;
    toast(`Name set to "${name}"`);
};
window.__isimSaveHistoryLimit = function() {
    const input = document.getElementById('isim-history-limit');
    const limit = parseInt(input?.value) || 50;
    cfg().historyLimit = Math.max(10, Math.min(500, limit));
    save();
    // Reload current chat with new limit
    if (activeFriend) loadHistory(activeFriend.id);
    toast(`Showing last ${cfg().historyLimit} messages`);
};
window.__isimSetChatWp = function(key) {
    const fid = activeFriend?.id; if (!fid) return;
    const grads = {
        gradient1:'linear-gradient(160deg,#0d0d1a,#0a1628,#0d2040)',
        gradient2:'linear-gradient(160deg,#0d2137,#1a4c7a,#0d3460)',
        gradient3:'linear-gradient(160deg,#2d0036,#4a0a6b,#1a0028)',
        gradient4:'linear-gradient(160deg,#0a1a00,#1a3500,#0a2000)',
    };
    if (!cfg().wallpapers) cfg().wallpapers = {};
    cfg().wallpapers[fid] = key ? grads[key]||'' : '';
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
    const wp = (cfg().wallpapers||{})[activeFriend.id]||'';
    if (!wp) { msgs.style.background=''; return; }
    if (wp.startsWith('linear-gradient')||wp.startsWith('radial-gradient')) msgs.style.background = wp;
    else { msgs.style.background = wp; msgs.style.backgroundSize='cover'; }
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
        t.innerHTML = '<div style="padding:14px;text-align:center;color:var(--txt3);font-size:13px">No stickers — press + then Add Sticker</div>';
        return;
    }
    t.innerHTML = stickers.map((s,i) =>
        `<div class="isim-sticker-wrap"><img src="${esc(s.src||s)}" class="isim-sticker-thumb" onclick="window.__isimSendSticker(${i})" onerror="this.style.display='none'" title="${esc(s.meaning||'')}"></div>`
    ).join('');
}
window.__isimSendSticker = function(idx) {
    if (!activeFriend) return;
    const stickers = cfg().stickers||[];
    const s = stickers[idx]; if (!s) return;
    document.getElementById('isim-sticker-tray').classList.remove('show');
    const hist = cfg().history[activeFriend.id]||[];
    const newIdx = hist.length;
    const msg = { from: 'user', type: 'sticker', content: s.src||s, time: now() };
    saveMsg(msg);
    appendBubble(msg, true, newIdx);
    pendingMessages.push(msg);
};
window.__isimAddSticker = async function(input) {
    const f = input.files[0]; if (!f) return;
    const loading = document.getElementById('isim-img-loading');
    if (loading) loading.classList.add('show');
    const r = new FileReader();
    r.onload = async e => {
        const base64 = e.target.result;
        toast('Reading sticker...');
        const meaning = await describeImage(base64);
        if (!cfg().stickers) cfg().stickers = [];
        cfg().stickers.push({ src: base64, meaning });
        save();
        if (loading) loading.classList.remove('show');
        toast('Sticker added: ' + meaning.substring(0,30));
        renderStickerTray();
    };
    r.readAsDataURL(f); input.value = '';
};

// ===== STICKER MANAGER =====
window.__isimManageStickers = function() {
    window.__isimNav('stickers');
};
function renderStickerManager() {
    const grid = document.getElementById('isim-sticker-mgr-grid');
    if (!grid) return;
    const stickers = cfg().stickers||[];
    if (!stickers.length) {
        grid.innerHTML = '<div style="color:var(--txt3);font-size:13px;padding:10px;">No stickers yet. Press + to add.</div>';
        return;
    }
    grid.innerHTML = stickers.map((s,i) => `
        <div class="isim-sticker-wrap">
            <img src="${esc(s.src||s)}" style="width:80px;height:80px;border-radius:12px;object-fit:cover;" onerror="this.style.display='none'" title="${esc(s.meaning||'')}">
            <button class="isim-sticker-del" onclick="window.__isimDelSticker(${i})">x</button>
            <div style="font-size:10px;color:var(--txt2);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px;">${esc((s.meaning||'').substring(0,20))}</div>
        </div>`).join('');
}
window.__isimDelSticker = function(idx) {
    const s = cfg().stickers||[];
    s.splice(idx,1);
    save(); renderStickerManager(); renderStickerTray();
    toast('Sticker removed');
};
window.__isimAddStickerMgr = async function(input) {
    const f = input.files[0]; if (!f) return;
    const loading = document.getElementById('isim-img-loading');
    if (loading) loading.classList.add('show');
    const r = new FileReader();
    r.onload = async e => {
        const base64 = e.target.result;
        const meaning = await describeImage(base64);
        if (!cfg().stickers) cfg().stickers = [];
        cfg().stickers.push({ src: base64, meaning });
        save();
        if (loading) loading.classList.remove('show');
        toast('Sticker added: ' + meaning.substring(0,30));
        renderStickerManager();
    };
    r.readAsDataURL(f); input.value = '';
};

window.__isimSendPhoto = function(input) {
    const f = input.files[0]; if (!f||!activeFriend) return;
    const r = new FileReader();
    r.onload = e => {
        const hist = cfg().history[activeFriend.id]||[];
        const newIdx = hist.length;
        const msg = { from:'user', type:'photo', content: e.target.result, time: now() };
        saveMsg(msg); appendBubble(msg, true, newIdx); pendingMessages.push(msg);
        document.getElementById('isim-plussheet').classList.remove('show');
    };
    r.readAsDataURL(f); input.value='';
};

// ===== LOCATION with name prompt =====
window.__isimSendLocationPrompt = function() {
    document.getElementById('isim-plussheet')?.classList.remove('show');
    if (!activeFriend) return;
    const locName = prompt('Enter location name:');
    if (!locName) return;
    const hist = cfg().history[activeFriend.id]||[];
    const newIdx = hist.length;
    const msg = { from:'user', type:'location', content: locName.trim(), time: now() };
    saveMsg(msg); appendBubble(msg, true, newIdx); pendingMessages.push(msg);
    toast('Location shared');
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
    const toSel = document.getElementById('isim-redenv-to')?.value;
    if (!amt || Number(amt) <= 0) { toast('Enter amount'); return; }

    let targetFriend = activeFriend;
    if (toSel) {
        const tf = cfg().friends.find(f => f.id === toSel);
        if (tf) targetFriend = tf;
    }
    if (!targetFriend) return;

    document.getElementById('isim-redenv-sheet')?.classList.remove('show');
    document.getElementById('isim-redenv-amount').value = '';
    document.getElementById('isim-redenv-note').value = '';

    // Save to current active chat or target
    const prevFriend = activeFriend;
    activeFriend = targetFriend;
    const hist = cfg().history[targetFriend.id]||[];
    const newIdx = hist.length;
    const msg = { from:'user', type:'redenv', content: { amount: amt, note }, time: now() };
    saveMsg(msg); appendBubble(msg, true, newIdx); pendingMessages.push(msg);
    activeFriend = prevFriend;

    cfg().bank.transactions.unshift({ type:'send', amount: Number(amt), to: targetFriend.name, note: note||'Red Envelope', date: Date.now() });
    cfg().bank.balance -= Number(amt);
    save();
    toast(`Sent Red Envelope ฿${amt} to ${targetFriend.name}`);
};

// ===== CALL =====
// Call state tracking
let callStartTime = null;
let callLog = []; // {name, startTime, duration, transcript}
let currentCallTranscript = [];

window.__isimStartCall = function() {
    if (!activeFriend) { toast('Select a contact first'); return; }
    const f = activeFriend;
    document.getElementById('isim-call-bg').style.backgroundImage = `url(${f.avatar||''})`;
    document.getElementById('isim-call-av').src = f.avatar||'';
    document.getElementById('isim-call-name').textContent = f.customName || f.name;
    document.getElementById('isim-call-stat').textContent = 'Calling...';
    document.getElementById('isim-call-dur').textContent = '0:00';
    document.getElementById('isim-call-float').innerHTML = '';
    document.getElementById('isim-call').classList.add('show');
    const startedEl = document.getElementById('isim-call-started-at');
    callStartTime = new Date();
    currentCallTranscript = [];
    if (startedEl) startedEl.textContent = 'Called at ' + callStartTime.toLocaleTimeString('th-TH', {hour:'2-digit',minute:'2-digit'});
    // Update bot name in typing indicator
    const botNmEl = document.getElementById('isim-call-bot-name-typing');
    if (botNmEl) botNmEl.textContent = `${f.customName||f.name} is speaking...`;
    callActive = true; callTimer = 0;

    // Call input — show confirm button on input
    const inp = document.getElementById('isim-call-inp');
    const confirmBtn = document.getElementById('isim-call-confirm');
    if (inp) inp.oninput = () => {
        if (confirmBtn) confirmBtn.style.display = inp.value.trim() ? 'block' : 'none';
    };

    setTimeout(() => {
        if (!callActive) return;
        const displayName = activeFriend?.customName || activeFriend?.name || 'Bot';
        document.getElementById('isim-call-stat').textContent = `${displayName} รับสายแล้ว`;
        callInterval = setInterval(() => {
            callTimer++;
            const m = Math.floor(callTimer/60), s = callTimer%60;
            document.getElementById('isim-call-dur').textContent = `${m}:${String(s).padStart(2,'0')}`;
        }, 1000);
        const greeting = `สวัสดี! ${displayName} รับสายแล้ว`;
        showCallFloat(greeting);
        currentCallTranscript.push({ who: displayName, text: greeting });
    }, 1500);
};

window.__isimNavCallHistory = function() {
    window.__isimShowCallHistory();
};
window.__isimEndCall = function() {
    if (!callActive) return;
    callActive = false; clearInterval(callInterval);
    const f = activeFriend;
    const displayName = f?.customName || f?.name || 'Unknown';
    const durationSec = callTimer;
    const m = Math.floor(durationSec/60), s = durationSec%60;
    const durText = `${m}:${String(s).padStart(2,'0')}`;
    // Save to call log
    if (!cfg().callLog) cfg().callLog = [];
    cfg().callLog.unshift({
        name: displayName,
        avatar: f?.avatar||'',
        startTime: callStartTime ? callStartTime.toISOString() : new Date().toISOString(),
        duration: durationSec,
        durText,
        transcript: [...currentCallTranscript]
    });
    if (cfg().callLog.length > 50) cfg().callLog = cfg().callLog.slice(0,50);
    save();
    document.getElementById('isim-call').classList.remove('show');
    toast(`สายสิ้นสุด · ${durText}`);
    // Add a system message in chat
    if (f && activeFriend?.id === f.id) {
        const hist = cfg().history[f.id] || [];
        const callNote = { from:'system', content:`📞 โทรถึง ${displayName} · ${durText} · ${callStartTime ? callStartTime.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'}) : ''}`, time: now(), type:'callnote' };
        hist.push(callNote);
        cfg().history[f.id] = hist;
        save();
        loadHistory(f.id);
    }
    currentCallTranscript = [];
};

window.__isimShowCallHistory = function() {
    const modal = document.getElementById('isim-call-history');
    if (!modal) return;
    const list = document.getElementById('isim-call-history-list');
    const logs = cfg().callLog || [];
    if (!logs.length) {
        list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--txt3);font-size:14px;">ยังไม่มีประวัติการโทร</div>';
    } else {
        list.innerHTML = logs.map((log, idx) => {
            const dt = new Date(log.startTime);
            const dateStr = dt.toLocaleDateString('th-TH') + ' ' + dt.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
            return `<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:0.5px solid var(--sep);cursor:pointer;" onclick="window.__isimShowTranscript(${idx})">
                <div style="width:44px;height:44px;border-radius:50%;background:var(--bg3);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                    ${log.avatar ? `<img src="${esc(log.avatar)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.background='var(--bg3)'">` : '📞'}
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:15px;font-weight:600;color:var(--txt);">${esc(log.name)}</div>
                    <div style="font-size:12px;color:var(--txt2);">${esc(dateStr)}</div>
                </div>
                <div style="font-size:13px;color:var(--txt3);">⏱ ${esc(log.durText)}</div>
            </div>`;
        }).join('');
    }
    modal.style.display = 'flex';
};

window.__isimShowTranscript = function(idx) {
    const log = (cfg().callLog||[])[idx];
    if (!log) return;
    const modal = document.getElementById('isim-call-transcript');
    const body = document.getElementById('isim-transcript-body');
    const title = document.getElementById('isim-transcript-title');
    if (!modal || !body) return;
    const dt = new Date(log.startTime);
    if (title) title.textContent = `${log.name} · ${log.durText}`;
    const lines = (log.transcript||[]).map(t => `${t.who}: ${t.text}`).join('\n\n');
    body.textContent = lines || '(ไม่มีข้อความในสาย)';
    document.getElementById('isim-call-history').style.display = 'none';
    modal.style.display = 'flex';
};
window.__isimMute = function() {
    callMuted = !callMuted;
    document.getElementById('isim-mute-circle')?.classList.toggle('on', callMuted);
    toast(callMuted ? 'Muted' : 'Unmuted');
};
window.__isimCallSend = async function() {
    const inp = document.getElementById('isim-call-inp');
    const confirmBtn = document.getElementById('isim-call-confirm');
    const text = inp.value.trim();
    if (!text || !activeFriend) return;
    inp.value = '';
    if (confirmBtn) confirmBtn.style.display = 'none';
    showCallFloat(text, true);
    currentCallTranscript.push({ who: getUserName(), text });

    // Show green "bot is thinking" indicator
    const callTypingEl = document.getElementById('isim-call-typing-indicator');
    if (callTypingEl) {
        callTypingEl.style.display = 'block';
        callTypingEl.style.opacity = '1';
    }

    try {
        const ctx = SillyTavern.getContext();
        const hist = (cfg().history[activeFriend.id]||[]).slice(-6).map(m =>
            (m.from==='user'?getUserName():activeFriend.name) + ': ' + (m.content||'')
        ).join('\n');
        const callHistory = (cfg().history[activeFriend.id]||[]).slice(-6).map(m =>
            (m.from==='user'?getUserName():activeFriend.name) + ': ' + (m.content||'')
        ).join('\n');
        const prompt = `[Phone Call — Live Audio]
You are ${activeFriend.name}. ${activeFriend.persona||''}
You are currently on a phone call with ${getUserName()}.
${callHistory ? 'Recent messages:\n' + callHistory : ''}

${getUserName()} says: "${text}"

Respond as ${activeFriend.name} speaking on the phone. Give a natural, spoken reply in 1-2 sentences.
- Same language as the input (Thai = Thai, English = English)
- No asterisks, no action text, no quotes, no tags
- Just the spoken words`;
        let reply = '';
        if (typeof ctx.generateQuietPrompt === 'function') {
            reply = await ctx.generateQuietPrompt(prompt, false, false);
        } else if (typeof window.generateQuietPrompt === 'function') {
            reply = await window.generateQuietPrompt(prompt, false, false);
        }
        reply = cleanThink(String(reply||'').trim());
        reply = reply.replace(new RegExp('^' + activeFriend.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\s*:\\s*','i'),'');
        reply = reply.replace(/^\[MSG\]\s*/i,'').replace(/\[[A-Z_]+:[^\]]*\]/g,'').replace(/["""«»]/g,'').trim();
        reply = reply.split('\n')[0].trim();
        if (!reply) reply = '...';
        if (callTypingEl) callTypingEl.style.display = 'none';
        if (callActive) {
            showCallFloat(reply);
            currentCallTranscript.push({ who: activeFriend?.customName||activeFriend?.name||'Bot', text: reply });
        }
    } catch(e) {
        if (callTypingEl) callTypingEl.style.display = 'none';
        if (callActive) showCallFloat('...');
    }
};

function showCallFloat(text, isUser=false) {
    const c = document.getElementById('isim-call-float');
    if (!c) return;
    c.innerHTML = '';
    let delay = 0;
    String(text).split(' ').forEach(word => {
        const span = document.createElement('span');
        span.className = 'ifl';
        span.style.animationDelay = delay + 'ms';
        if (isUser) { span.style.opacity = '0.5'; span.style.color = '#aad4ff'; }
        span.textContent = word + ' ';
        c.appendChild(span);
        delay += Math.max(80, word.length * 55);
    });
    setTimeout(() => { if (callActive) c.innerHTML = ''; }, delay + 3500);
}

// ===== STORIES =====
window.__isimAddMyStory = function() {
    document.getElementById('isim-story-input')?.click();
};
window.__isimUploadStory = async function(input) {
    const f = input.files[0]; if (!f) return;
    const loading = document.getElementById('isim-img-loading');
    if (loading) loading.classList.add('show');
    toast('Reading story image...');
    const r = new FileReader();
    r.onload = async e => {
        const base64 = e.target.result;
        const meaning = await describeImage(base64);
        const story = { id: Date.now(), isMe: true, uid: 'me', image: base64, imageMeaning: meaning, text: meaning, timestamp: Date.now() };
        if (!cfg().stories) cfg().stories = [];
        cfg().stories = cfg().stories.filter(s => Date.now() - s.timestamp < 24*3600000);
        cfg().stories.push(story);
        save(); renderStoriesBar();
        if (loading) loading.classList.remove('show');
        toast('Story posted (24h): ' + meaning.substring(0,30));
        window.__isimViewMyStory();
    };
    r.readAsDataURL(f); input.value='';
};
window.__isimViewMyStory = function() {
    const stories = (cfg().stories||[]).filter(s => s.isMe && Date.now()-s.timestamp < 24*3600000);
    if (!stories.length) { toast('No stories yet'); return; }
    const userAv = getUserAvatar();
    openStoryViewer(stories[stories.length-1], getUserName(), userAv);
};
window.__isimViewFriendStory = function(uid) {
    const f = cfg().friends.find(f => f.id === uid);
    const stories = (cfg().stories||[]).filter(s => s.uid === uid && !s.isMe && Date.now()-s.timestamp < 24*3600000);
    if (!stories.length || !f) { toast('No stories'); return; }
    openStoryViewer(stories[stories.length-1], f.name, f.avatar);
};

function openStoryViewer(story, name, avatar='') {
    const viewer = document.getElementById('isim-story-viewer');
    const img = document.getElementById('isim-story-img');
    const nm = document.getElementById('isim-story-user-nm');
    const av = document.getElementById('isim-story-user-av');
    const overlay = document.getElementById('isim-story-text-overlay');
    const readingEl = document.getElementById('isim-story-reading');
    if (!viewer||!img) return;
    img.style.backgroundImage = story.image ? `url(${story.image})` : '';
    img.style.background = story.image ? '' : 'linear-gradient(135deg,#1a1a2e,#0f3460)';
    nm.textContent = name;
    av.src = avatar||'';
    if (story.imageMeaning) { overlay.textContent = story.imageMeaning; overlay.classList.add('show'); }
    else overlay.classList.remove('show');
    if (readingEl) readingEl.classList.remove('show');
    viewer.classList.add('show');

    const prog = document.getElementById('isim-story-progress');
    prog.innerHTML = '<div class="isim-story-prog-seg"><div class="isim-story-prog-fill" id="isim-story-prog-fill"></div></div>';
    setTimeout(() => {
        const fill = document.getElementById('isim-story-prog-fill');
        if (fill) { fill.style.transition='width 6s linear'; fill.style.width='100%'; }
    }, 100);
    setTimeout(() => window.__isimCloseStory(), 6200);
}

window.__isimCloseStory = function() {
    document.getElementById('isim-story-viewer')?.classList.remove('show');
};
window.__isimReplyStory = async function() {
    const text = document.getElementById('isim-story-reply-inp')?.value.trim();
    if (!text) return;
    document.getElementById('isim-story-reply-inp').value = '';
    window.__isimCloseStory();
    if (!activeFriend) return;

    // Send reply message
    const hist = cfg().history[activeFriend.id]||[];
    const newIdx = hist.length;
    const msg = { from: 'user', content: `[Story reply: "${text}"]`, time: now() };
    saveMsg(msg); appendBubble(msg, true, newIdx); pendingMessages.push(msg);
    window.__isimNav('chat');
    toast('Story reply sent');
    // Auto-trigger bot reply
    setTimeout(() => botReply(), 800);
};

// Bot posts story (called from prompt if bot sends [STORY:description])
async function botPostStory(uid, description) {
    if (!cfg().stories) cfg().stories = [];
    cfg().stories = cfg().stories.filter(s => Date.now()-s.timestamp < 24*3600000);
    const story = { id: Date.now(), isMe: false, uid, image: '', imageMeaning: description, text: description, timestamp: Date.now() };
    cfg().stories.push(story);
    save(); renderStoriesBar();
    const f = cfg().friends.find(f => f.id === uid);
    if (f) showNotif(f.name, 'Posted a story: ' + description.substring(0,50), f.avatar);
}

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
                    id: c.avatar||c.name,
                    name: c.name,
                    avatar: c.avatar ? `/characters/${c.avatar}` : '',
                    persona: c.description||c.personality||'',
                }));
            }
        }
    } catch {}
    if (!bots.length) {
        bots = [
            { id:'demo1', name:'Aria', avatar:'', persona:'A friendly and warm person who loves to chat.' },
            { id:'demo2', name:'Leo', avatar:'', persona:'Cool, laid-back, loves music and art.' },
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
            <div style="width:50px;height:50px;border-radius:50%;background:var(--bg3);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:22px;">
                ${b.avatar ? `<img src="${esc(b.avatar)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">` : b.name[0]}
            </div>
            <div class="isim-friend-info">
                <div class="isim-friend-name">${esc(b.name)}</div>
                <div class="isim-friend-bio">${esc((b.persona||'').substring(0,50))}</div>
            </div>
            ${added.has(b.id)
                ? `<span style="font-size:13px;color:var(--green);font-weight:600;">Added</span>`
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
        toast(`${bot.name} added`);
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
        list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--txt3);">No transactions</div>';
        return;
    }
    list.innerHTML = bank.transactions.slice(0,20).map(tx => `
        <div class="isim-tx-row">
            <div class="isim-tx-icon ${tx.type==='receive'?'isim-tx-receive':'isim-tx-send'}">${tx.type==='receive'?'v':'^'}</div>
            <div class="isim-tx-info">
                <div class="isim-tx-from">${esc(tx.type==='receive'?(tx.from||'Unknown'):(tx.to||'Unknown'))}</div>
                <div class="isim-tx-note">${esc(tx.note||'')}</div>
                <div class="isim-tx-date">${fmtDate(tx.date)}</div>
            </div>
            <div class="isim-tx-amt ${tx.type==='receive'?'green':'red'}">
                ${tx.type==='receive'?'+':'-'}฿${Number(tx.amount).toLocaleString()}
            </div>
        </div>`).join('');
}
window.__isimRefreshBank = function() { renderBank(); toast('Updated'); };
window.__isimBankTransfer = function() {
    const to = prompt('Transfer to:'); if (!to) return;
    const amount = Number(prompt('Amount (THB):'));
    if (!amount||amount<=0) { toast('Cancelled'); return; }
    if (amount>cfg().bank.balance) { toast('Insufficient balance'); return; }
    cfg().bank.balance -= amount;
    cfg().bank.transactions.unshift({ type:'send', amount, to, note:'Transfer', date:Date.now() });
    save(); renderBank(); toast(`Sent ฿${amount} to ${to}`);
};
window.__isimBankScan = function() { toast('QR Scanner coming soon'); };
window.__isimBankTop = function() {
    const amount = Number(prompt('Top up amount:'));
    if (!amount||amount<=0) { toast('Cancelled'); return; }
    cfg().bank.balance += amount;
    cfg().bank.transactions.unshift({ type:'receive', amount, from:'Top Up', note:'Top up', date:Date.now() });
    save(); renderBank(); toast(`Topped up ฿${amount}`);
};

// ===== SHOP =====
const shopProducts = [
    { name:'AirPods Pro', price:7990, old:9990, emoji:'🎧', cat:'electronics' },
    { name:'iPhone Case', price:290, old:490, emoji:'📱', cat:'accessories' },
    { name:'Leather Bag', price:1290, old:1890, emoji:'👜', cat:'fashion' },
    { name:'Sneakers', price:3490, old:4990, emoji:'👟', cat:'fashion' },
    { name:'Gaming Headset', price:1890, old:2490, emoji:'🎮', cat:'electronics' },
    { name:'Smart Watch', price:4990, old:6990, emoji:'⌚', cat:'electronics' },
    { name:'Lipstick', price:390, old:590, emoji:'💄', cat:'beauty' },
    { name:'Sunglasses', price:890, old:1290, emoji:'🕶', cat:'accessories' },
    { name:'Polaroid Camera', price:2490, old:3200, emoji:'📷', cat:'electronics' },
    { name:'Summer Dress', price:990, old:1490, emoji:'👗', cat:'fashion' },
];
let currentCat = 'all';
let shopSearch = '';
function renderShop() { renderShopGrid(); renderCartBadge(); }
function renderShopGrid() {
    const grid = document.getElementById('isim-shop-grid');
    if (!grid) return;
    const filtered = shopProducts.filter(p => {
        const matchCat = currentCat==='all'||p.cat===currentCat;
        const matchSearch = !shopSearch||p.name.toLowerCase().includes(shopSearch.toLowerCase());
        return matchCat && matchSearch;
    });
    grid.innerHTML = filtered.map(p => `
        <div class="isim-product-card">
            <div class="isim-product-img">${p.emoji}</div>
            <div class="isim-product-info">
                <div class="isim-product-name">${esc(p.name)}</div>
                <div class="isim-product-price">฿${p.price.toLocaleString()}</div>
                <div class="isim-product-old">฿${p.old.toLocaleString()}</div>
                <button class="isim-add-cart" onclick="window.__isimAddToCart('${esc(p.name)}',${p.price},'${p.emoji}')">Add to Cart</button>
            </div>
        </div>`).join('');
}
window.__isimFilterCat = function(cat,el) {
    currentCat = cat;
    document.querySelectorAll('.isim-cat-chip').forEach(c => c.classList.remove('on'));
    if (el) el.classList.add('on');
    renderShopGrid();
};
window.__isimFilterShop = function(q) { shopSearch=q; renderShopGrid(); };
window.__isimAddToCart = function(name,price,emoji) {
    if (!cfg().cart) cfg().cart = [];
    const existing = cfg().cart.find(i => i.name===name);
    if (existing) existing.qty++;
    else cfg().cart.push({ name, price, emoji, qty:1 });
    save(); renderCartBadge(); toast(`Added ${name}`);
};
function renderCartBadge() {
    const badge = document.getElementById('isim-cart-count');
    if (!badge) return;
    const total = (cfg().cart||[]).reduce((s,i)=>s+i.qty,0);
    badge.textContent = total;
    badge.style.display = total>0 ? 'flex' : 'none';
}
window.__isimOpenCart = function() { renderCartItems(); document.getElementById('isim-cart-sheet')?.classList.add('show'); };
function renderCartItems() {
    const list = document.getElementById('isim-cart-items');
    const totalEl = document.getElementById('isim-cart-total');
    if (!list) return;
    const cart = cfg().cart||[];
    if (!cart.length) {
        list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--txt3);">Cart empty</div>';
        if (totalEl) totalEl.textContent = '฿0';
        return;
    }
    let total = 0;
    list.innerHTML = cart.map((item,i) => {
        total += item.price*item.qty;
        return `<div class="isim-cart-item">
            <div class="isim-cart-em">${item.emoji}</div>
            <div class="isim-cart-info">
                <div class="isim-cart-nm">${esc(item.name)}</div>
                <div class="isim-cart-pr">฿${item.price.toLocaleString()} x ${item.qty}</div>
            </div>
            <div class="isim-cart-qty">
                <button class="isim-qty-btn" onclick="window.__isimQty(${i},-1)">-</button>
                <span style="font-size:15px;color:var(--txt);min-width:22px;text-align:center;">${item.qty}</span>
                <button class="isim-qty-btn" onclick="window.__isimQty(${i},1)">+</button>
            </div>
        </div>`;
    }).join('');
    if (totalEl) totalEl.textContent = `฿${total.toLocaleString()}`;
}
window.__isimQty = function(idx,delta) {
    const cart = cfg().cart||[];
    if (!cart[idx]) return;
    cart[idx].qty += delta;
    if (cart[idx].qty<=0) cart.splice(idx,1);
    save(); renderCartItems(); renderCartBadge();
};
window.__isimCheckout = function() {
    const cart = cfg().cart||[];
    if (!cart.length) { toast('Cart empty'); return; }
    const total = cart.reduce((s,i)=>s+i.price*i.qty,0);
    if (total>cfg().bank.balance) { toast('Insufficient balance'); return; }
    cfg().bank.balance -= total;
    cfg().bank.transactions.unshift({ type:'send', amount:total, to:'Shop', note:`Order: ${cart.length} items`, date:Date.now() });
    if (!cfg().shop.orders) cfg().shop.orders=[];
    cfg().shop.orders.push({ items:[...cart], total, date:Date.now(), status:'Processing' });
    cfg().cart=[];
    save(); renderCartBadge();
    document.getElementById('isim-cart-sheet')?.classList.remove('show');
    toast(`Order placed! ฿${total.toLocaleString()}`);
    showNotif('Shop', `Order placed ฿${total.toLocaleString()} — Processing`);
};

// ===== TWITTER / X =====
const defaultTweets = [
    { id:1, user:'TechNews TH', handle:'@technews_th', avatar:'', body:'iPhone 17 coming with 200MP camera and new battery. Starting at 40,000 THB! 🔥', likes:234, retweets:89, replies:45, time:'2h', liked:false, retweeted:false, replies_list:[] },
    { id:2, user:'BKK Foodie', handle:'@bkkfoodie', avatar:'', body:'New ramen shop opened near Thonglor! Japanese clear broth, incredibly good. Will definitely return.', likes:567, retweets:123, replies:78, time:'4h', liked:false, retweeted:false, replies_list:[] },
    { id:3, user:'Music Vibes', handle:'@musicvibes', avatar:'', body:'This song makes me feel so good. Want everyone to hear it. #NewMusic #Chill', likes:892, retweets:234, replies:56, time:'8h', liked:false, retweeted:false, replies_list:[] },
    { id:4, user:'WealthTips', handle:'@wealthtips_th', avatar:'', body:'Tip: Save 20% of income every month and invest in funds. In 10 years you will be surprised.', likes:3421, retweets:1567, replies:234, time:'10h', liked:false, retweeted:false, replies_list:[] },
];
let tweets = [];
let tweetImgAttach = null;
let currentOpenTweetId = null;

function renderTwitter() {
    if (!cfg().tweets||!cfg().tweets.length) { cfg().tweets = JSON.parse(JSON.stringify(defaultTweets)); save(); }
    tweets = cfg().tweets;
    updateXUserAvatar();
    renderTweetFeed();
}

function renderTweetFeed() {
    const feed = document.getElementById('isim-tweet-feed');
    if (!feed) return;
    const colors = ['#1d9bf0','#ff375f','#00ba7c','#ff9f0a','#bf5af2'];
    feed.innerHTML = tweets.map(t => {
        const color = colors[t.user.charCodeAt(0)%colors.length];
        const avHtml = t.avatar
            ? `<img src="${esc(t.avatar)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">`
            : `<span style="font-size:18px;font-weight:700;color:#fff;">${t.user[0]}</span>`;
        return `
        <div class="isim-tweet" onclick="window.__isimOpenTweet(${t.id})">
            <div class="isim-tweet-top">
                <div class="isim-tweet-av" style="background:${color};">${avHtml}</div>
                <div class="isim-tweet-meta">
                    <div style="display:flex;align-items:center;gap:5px;">
                        <span class="isim-tweet-name">${esc(t.user)}</span>
                        ${!t.isMe?'<span style="color:#1d9bf0;font-size:12px;">v</span>':''}
                    </div>
                    <span class="isim-tweet-handle">${esc(t.handle)} · ${esc(t.time)}</span>
                </div>
            </div>
            <div class="isim-tweet-body">${esc(t.body)}</div>
            ${t.image?`<img class="isim-tweet-img" src="${esc(t.image)}" alt="">` : ''}
            ${(t.replies_list||[]).slice(0,2).map(r => `<div class="isim-reply"><div class="isim-reply-user">${esc(r.user)}</div>${esc(r.body)}</div>`).join('')}
            <div class="isim-tweet-actions" onclick="event.stopPropagation()">
                <button class="isim-tweet-act" onclick="window.__isimOpenTweet(${t.id})">c ${t.replies}</button>
                <button class="isim-tweet-act ${t.retweeted?'retweeted':''}" onclick="event.stopPropagation();window.__isimRetweet(${t.id})">r ${t.retweets}</button>
                <button class="isim-tweet-act ${t.liked?'liked':''}" onclick="event.stopPropagation();window.__isimLikeTweet(${t.id})">L ${t.likes}</button>
                <button class="isim-tweet-act" onclick="event.stopPropagation();window.__isimShareTweet(${t.id})">Share</button>
            </div>
        </div>`;
    }).join('');
}

window.__isimOpenTweet = function(id) {
    const t = tweets.find(t => t.id === id);
    if (!t) return;
    currentOpenTweetId = id;
    const detail = document.getElementById('isim-tweet-detail');
    const body = document.getElementById('isim-tweet-detail-body');
    const colors = ['#1d9bf0','#ff375f','#00ba7c','#ff9f0a','#bf5af2'];
    const color = colors[t.user.charCodeAt(0)%colors.length];
    if (!detail||!body) return;
    body.innerHTML = `
        <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px;">
            <div class="isim-tweet-av" style="width:48px;height:48px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;flex-shrink:0;">${t.user[0]}</div>
            <div>
                <div style="font-size:16px;font-weight:700;color:#e7e9ea;">${esc(t.user)}</div>
                <div style="font-size:14px;color:#71767b;">${esc(t.handle)}</div>
            </div>
        </div>
        <div class="isim-tweet-detail-text">${esc(t.body)}</div>
        ${t.image ? `<img class="isim-tweet-img" src="${esc(t.image)}" alt="" style="margin:10px 0;">` : ''}
        <div style="font-size:13px;color:#71767b;margin:8px 0;">${esc(t.time)}</div>
        <div class="isim-tweet-detail-stats">
            <div class="isim-tweet-detail-stat">${t.replies} <span>Replies</span></div>
            <div class="isim-tweet-detail-stat">${t.retweets} <span>Reposts</span></div>
            <div class="isim-tweet-detail-stat">${t.likes} <span>Likes</span></div>
        </div>
        <div id="isim-tweet-replies-list">
            ${(t.replies_list||[]).map(r => `<div class="isim-reply"><div class="isim-reply-user">${esc(r.user)}</div>${esc(r.body)}</div>`).join('')}
        </div>`;
    detail.classList.add('show');
    // Set user avatar in reply bar
    const replyAv = document.getElementById('isim-reply-user-av');
    if (replyAv) replyAv.src = getUserAvatar();
    // Update like/retweet buttons in detail
    const likeBtnD = document.getElementById('isim-detail-like-btn');
    const rtBtnD = document.getElementById('isim-detail-rt-btn');
    if (likeBtnD) { likeBtnD.textContent = (t.liked ? '❤️' : '♡') + ' ' + t.likes; likeBtnD.style.color = t.liked ? 'var(--like)' : '#71767b'; }
    if (rtBtnD) { rtBtnD.textContent = '🔁 ' + t.retweets; rtBtnD.style.color = t.retweeted ? 'var(--rt)' : '#71767b'; }
};

window.__isimSubmitDetailReply = async function() {
    const inp = document.getElementById('isim-reply-inp');
    const text = inp.value.trim();
    if (!text || !currentOpenTweetId) return;
    inp.value = '';
    const t = tweets.find(t => t.id === currentOpenTweetId);
    if (!t) return;
    if (!t.replies_list) t.replies_list = [];
    t.replies_list.push({ user: getUserName(), body: text });
    t.replies++;
    cfg().tweets = tweets; save();
    window.__isimOpenTweet(currentOpenTweetId); // Re-render detail

    renderTweetFeed();
    // Bot auto-reply with ST AI
    setTimeout(async () => {
        try {
            const ctx = SillyTavern.getContext();
            // pick a bot from friends or use tweet author
            const friends = cfg().friends || [];
            const botFriend = friends[Math.floor(Math.random()*friends.length)];
            const botName = botFriend ? botFriend.name : t.user;
            const botPersona = botFriend ? (botFriend.persona||'') : 'A social media user';
            const replyPrompt = `You are ${botName} on X (Twitter). ${botPersona}
Your tweet: "${t.body}"
Someone replied: "${text}"
Write your reply in 1 short sentence. Match language. No quotes, no asterisks, just the reply text.`;
            let botReplyText = '';
            if (typeof ctx.generateQuietPrompt === 'function') {
                botReplyText = await ctx.generateQuietPrompt(replyPrompt, false, false);
            } else if (typeof window.generateQuietPrompt === 'function') {
                botReplyText = await window.generateQuietPrompt(replyPrompt, false, false);
            }
            botReplyText = cleanThink(String(botReplyText||'').trim());
            botReplyText = botReplyText.replace(new RegExp('^'+botName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*:\\s*','i'),'');
            botReplyText = botReplyText.replace(/^\[MSG\]\s*/i,'').replace(/\[[A-Z_]+:[^\]]*\]/g,'').replace(/[\u201c\u201d\u201e\u00ab\u00bb"']/g,'').trim();
            botReplyText = botReplyText.split('\n')[0].trim();
            if (!botReplyText) botReplyText = '...';
            t.replies_list.push({ user: botName, handle: botFriend?`@${botName.toLowerCase().replace(/\s+/g,'_')}`:'@user', body: botReplyText });
            t.replies++;
            cfg().tweets = tweets; save();
            window.__isimOpenTweet(currentOpenTweetId);
            renderTweetFeed();
            // Notification
            showNotif(botName, `Replied: ${botReplyText.substring(0,40)}`, botFriend?.avatar||'');
            addXNotif('reply', botName, botFriend?.avatar||'', `replied to your comment: "${botReplyText.substring(0,40)}"`);
        } catch(e) {
            // fallback
            // Generation failed — skip adding reply
            t.replies++;
            cfg().tweets = tweets; save();
            window.__isimOpenTweet(currentOpenTweetId);
            renderTweetFeed();
        }
    }, 1800 + Math.random()*2000);
};

window.__isimXTab = function(tab,el) {
    document.querySelectorAll('.isim-x-tab').forEach(t => t.classList.remove('on'));
    if (el) el.classList.add('on');
    // Hide notifs, show feed
    const notifsPage = document.getElementById('isim-x-notifs-page');
    const feed = document.getElementById('isim-tweet-feed');
    const detail = document.getElementById('isim-tweet-detail');
    if (notifsPage) notifsPage.style.display = 'none';
    if (feed) feed.style.display = 'block';
    if (detail) detail.classList.remove('show');
    renderTweetFeed();
};
window.__isimLikeTweet = function(id) {
    const t = tweets.find(t => t.id===id); if (!t) return;
    t.liked = !t.liked; t.likes += t.liked?1:-1;
    cfg().tweets = tweets; save(); renderTweetFeed();
};
window.__isimRetweet = function(id) {
    const t = tweets.find(t => t.id===id); if (!t) return;
    t.retweeted = !t.retweeted; t.retweets += t.retweeted?1:-1;
    cfg().tweets = tweets; save(); renderTweetFeed();
    if (t.retweeted) toast('Reposted');
};
window.__isimShareTweet = function(id) { toast('Link copied'); };
window.__isimOpenCompose = function() {
    document.getElementById('isim-tweet-composer')?.classList.add('show');
    tweetImgAttach = null;
    const prev = document.getElementById('isim-tweet-img-preview');
    const area = document.getElementById('isim-tweet-area');
    if (prev) prev.textContent = '';
    if (area) area.value = '';
    updateXUserAvatar();
};
window.__isimCloseCompose = function() {
    document.getElementById('isim-tweet-composer')?.classList.remove('show');
};
window.__isimAttachTweetImg = function(input) {
    const f = input.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => {
        tweetImgAttach = e.target.result;
        const prev = document.getElementById('isim-tweet-img-preview');
        if (prev) prev.textContent = 'Image attached';
    };
    r.readAsDataURL(f); input.value='';
};
window.__isimPostTweet = function() {
    const text = document.getElementById('isim-tweet-area')?.value.trim();
    if (!text) { toast('Write something first'); return; }
    const newTweet = {
        id: Date.now(), user: getUserName(), handle: '@you',
        avatar: getUserAvatar(),
        body: text, likes:0, retweets:0, replies:0,
        time:'now', liked:false, retweeted:false, isMe:true,
        image: tweetImgAttach||null, replies_list:[],
    };
    tweets.unshift(newTweet);
    cfg().tweets = tweets; save();
    window.__isimCloseCompose();
    renderTweetFeed();
    toast('Posted!');
    setTimeout(async () => {
        const t2 = tweets.find(t => t.id===newTweet.id);
        if (!t2) return;
        t2.likes += Math.floor(Math.random()*15)+2;
        t2.retweets += Math.floor(Math.random()*4);
        // AI bot reaction
        const friends = cfg().friends||[];
        const botFriend = friends.length ? friends[Math.floor(Math.random()*friends.length)] : null;
        const botName = botFriend ? botFriend.name : 'Follower';
        const botHandle = botFriend ? `@${botFriend.name.toLowerCase().replace(/\s+/g,'_')}` : '@follower';
        let botComment = '';
        try {
            const ctx = SillyTavern.getContext();
            const p2 = `You are ${botName}. ${botFriend?.persona||'A social media user.'}
React to this tweet in 1 short sentence. Natural, casual. Match language.
Tweet: "${text}"
Just write the reaction, no quotes, no name prefix.`;
            if (typeof ctx.generateQuietPrompt === 'function') {
                botComment = await ctx.generateQuietPrompt(p2, false, false);
            } else if (typeof window.generateQuietPrompt === 'function') {
                botComment = await window.generateQuietPrompt(p2, false, false);
            }
            botComment = cleanThink(String(botComment||'').trim());
            botComment = botComment.replace(new RegExp('^'+botName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*:\\s*','i'),'');
            botComment = botComment.replace(/^\[MSG\]\s*/i,'').replace(/\[[A-Z_]+:[^\]]*\]/g,'').replace(/[\u201c\u201d\u201e\u00ab\u00bb"']/g,'').trim();
            botComment = botComment.split('\n')[0].trim();
        } catch {}
        if (!botComment) botComment = '...';
        t2.replies_list.push({ user: botName, handle: botHandle, body: botComment });
        t2.replies++;
        cfg().tweets = tweets; save(); renderTweetFeed();
        // Notification
        addXNotif('reply', botName, botFriend?.avatar||'', `replied to your post: "${botComment.substring(0,40)}"`);
        showNotif(botName, botComment.substring(0,60), botFriend?.avatar||'');
    }, 3000);
};

// ===== TWITTER NOTIFICATIONS =====
function addXNotif(type, user, avatar, text) {
    if (!cfg().xNotifs) cfg().xNotifs = [];
    cfg().xNotifs.unshift({ type, user, avatar, text, time: now(), read: false });
    if (cfg().xNotifs.length > 50) cfg().xNotifs = cfg().xNotifs.slice(0,50);
    save();
    // Show badge
    const badge = document.getElementById('isim-x-notif-badge');
    if (badge) {
        const unread = (cfg().xNotifs||[]).filter(n=>!n.read).length;
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'flex' : 'none';
    }
}

function renderXNotifs() {
    const list = document.getElementById('isim-x-notifs-list');
    if (!list) return;
    const notifs = cfg().xNotifs||[];
    // Mark all as read
    notifs.forEach(n => n.read = true);
    save();
    const badge = document.getElementById('isim-x-notif-badge');
    if (badge) badge.style.display = 'none';

    if (!notifs.length) {
        list.innerHTML = '<div style="text-align:center;padding:40px;color:#71767b;font-size:15px;">No notifications yet</div>';
        return;
    }
    const icons = { like:'❤️', reply:'💬', repost:'🔁', follow:'👤' };
    list.innerHTML = notifs.map(n => `
        <div style="display:flex;gap:12px;padding:14px 16px;border-bottom:1px solid #2f3336;cursor:pointer;">
            <div style="width:34px;height:34px;border-radius:50%;background:#1a1a1a;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${icons[n.type]||'🔔'}</div>
            <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    <div style="width:28px;height:28px;border-radius:50%;background:#333;overflow:hidden;flex-shrink:0;">${n.avatar?`<img src="${esc(n.avatar)}" style="width:100%;height:100%;object-fit:cover;">`:n.user[0]}</div>
                    <span style="font-weight:700;color:#e7e9ea;font-size:14px;">${esc(n.user)}</span>
                </div>
                <div style="font-size:14px;color:#e7e9ea;">${esc(n.text)}</div>
                <div style="font-size:12px;color:#71767b;margin-top:2px;">${esc(n.time)}</div>
            </div>
        </div>`).join('');
}

window.__isimXNotifTab = function() {
    document.querySelectorAll('.isim-x-tab').forEach(t => t.classList.remove('on'));
    document.getElementById('isim-x-tab-notif')?.classList.add('on');
    // Hide tweet feed and detail, show notifs
    const feed = document.getElementById('isim-tweet-feed');
    const detail = document.getElementById('isim-tweet-detail');
    const composer = document.getElementById('isim-tweet-composer');
    const notifsPage = document.getElementById('isim-x-notifs-page');
    if (feed) feed.style.display = 'none';
    if (detail) detail.classList.remove('show');
    if (composer) composer.classList.remove('show');
    if (notifsPage) { notifsPage.style.display = 'flex'; notifsPage.style.flexDirection = 'column'; }
    renderXNotifs();
};

// ===== SETTINGS =====
window.__isimClearChat = function() {
    const fid = activeFriend?.id;
    if (!fid) { toast('Open a chat first'); return; }
    if (!confirm(`Clear ${activeFriend.name}'s chat?`)) return;
    cfg().history[fid]=[]; save(); loadHistory(fid); toast('Chat cleared');
};
window.__isimResetAll = function() {
    if (!confirm('Reset everything? All data will be lost.')) return;
    localStorage.removeItem(LS); _cfg=null; activeFriend=null; pendingMessages=[];
    toast('Reset done — please refresh');
};

// ===== INPUT BINDING =====
function bindInput() {
    const inp = document.getElementById('isim-input');
    if (!inp) return;
    inp.addEventListener('input', function() {
        this.style.height='auto';
        this.style.height = Math.min(this.scrollHeight,90)+'px';
    });
    inp.addEventListener('keydown', function(e) {
        if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); window.__isimSend(); }
    });
    const callInp = document.getElementById('isim-call-inp');
    if (callInp) callInp.addEventListener('keydown', e => { if (e.key==='Enter') window.__isimCallSend(); });
}

// ===== SETTINGS PANEL (ST) =====
function loadSettings() {
    $('.isim-st-panel').remove();
    const html = `
    <div class="isim-st-panel">
      <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
          <b>iPhone Simulator v3</b>
          <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
          <div class="styled_description_block">
            Press the phone button to open simulator.<br>
            <small>✦ Generate Reply fixed · Edit/Retry in ☰</small><br>
            <small>X-style UI, Stories, Notes, Bot reads images</small>
          </div>
          <hr><small style="color:#888">v3.1.2 — prompt fix + light theme</small>
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
    if (first) menu.insertBefore(li,first);
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
            obs.observe(document.body, { childList:true, subtree:true });
            setTimeout(() => obs.disconnect(), 10000);
        }
        document.addEventListener('click', e => {
            const wandBtn = e.target.closest('.fa-magic,.fa-wand-magic-sparkles,[data-i18n="Extensions Menu"],.extensions-menu-button');
            if (wandBtn) setTimeout(injectWandButton,50);
        });
    }, 300);

    console.log('[iPhone-Sim] v3.1.2 loaded');
});
