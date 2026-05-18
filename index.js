// iPhone Simulator v4.0 — SillyTavern Extension
// iOS Minimal · CoT fix · {{user}} avatar · Instagram · X · Call+Chat · Wallpaper
const LS='isim_v4';
const DEF={theme:'dark',accent:'#0a84ff',friends:[],history:{},historyEnabled:{},notes:{},botnotes:{},stickers:[],wallpapers:{},homeWallpaper:'',pinnedChats:[],tweets:[],stories:[],xNotifs:[],callLog:[],bank:{accountNumber:'123-4-56789-0',balance:12500,transactions:[{type:'receive',amount:500,from:'Alex',note:'Transfer',date:Date.now()-3600000},{type:'send',amount:150,to:'Mom',note:'Food money',date:Date.now()-172800000}]},historyLimit:50};
let _cfg=null;
function cfg(){if(_cfg)return _cfg;try{_cfg=JSON.parse(JSON.stringify(DEF));const s=JSON.parse(localStorage.getItem(LS)||'{}');_cfg=deepMerge(_cfg,s);}catch{_cfg=JSON.parse(JSON.stringify(DEF));}return _cfg;}
function deepMerge(t,s){for(const k in s){if(s[k]&&typeof s[k]==='object'&&!Array.isArray(s[k])){if(!t[k]||typeof t[k]!=='object')t[k]={};deepMerge(t[k],s[k]);}else t[k]=s[k];}return t;}
function save(){try{localStorage.setItem(LS,JSON.stringify(_cfg||cfg()));}catch{}}
let phoneOpen=false,activeFriend=null,isTyping=false,callActive=false,callTimer=0,callInterval=null,callMuted=false;
let currentScreen='home',pendingMessages=[],editModeActive=false,callStartTime=null,currentCallTranscript=[];
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function now(){const d=new Date();return`${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;}
function fmtDate(ts){const d=new Date(ts),t=new Date();if(d.toDateString()===t.toDateString())return`${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;return`${d.getDate()}/${d.getMonth()+1}`;}
function cleanThink(t){return String(t||'').replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/<think>[\s\S]*/gi,'').trim();}
function toast(msg){const el=document.getElementById('isim-toast');if(!el)return;el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200);}
function getUserName(){try{const c=SillyTavern.getContext();if(c?.name1)return c.name1;}catch{}return'User';}
function getUserAvatar(){try{const c=SillyTavern.getContext();if(c?.persona?.avatar)return`/User Avatars/${c.persona.avatar}`;if(c?.user_avatar)return c.user_avatar;}catch{}return'';}
function showNotif(app,msg,av){const tray=document.getElementById('isim-notif-tray');if(!tray)return;const card=document.createElement('div');card.className='isim-notif-card';card.innerHTML=`<div class="isim-notif-app">${av?`<img src="${esc(av)}" style="width:16px;height:16px;border-radius:50%;object-fit:cover">`:''}${esc(app)}</div><div class="isim-notif-msg">${esc(msg)}</div>`;tray.appendChild(card);setTimeout(()=>{card.style.opacity='0';card.style.transform='translateY(-8px)';},4000);setTimeout(()=>card.remove(),4500);}
async function describeImage(b64){try{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:300,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:'image/jpeg',data:b64.split(',')[1]||b64}},{type:'text',text:'Describe this image in 1-2 sentences. Concise.'}]}]})});const d=await r.json();return d.content?.[0]?.text||'Image';}catch{return'Image';}}
function injectCSS(){if(document.getElementById('isim-css'))return;const s=document.createElement('style');s.id='isim-css';s.textContent=`
#isim-fab{cursor:pointer;font-size:20px;padding:4px 6px;border-radius:8px;background:transparent;border:none;display:inline-flex;align-items:center;justify-content:center;color:#fff;}
#isim-phone{position:fixed!important;inset:0;z-index:2147483646!important;display:none!important;align-items:center;justify-content:center;background:rgba(0,0,0,.88);backdrop-filter:blur(20px);}
#isim-phone.open{display:flex!important;}
#isim-frame{width:393px;height:852px;max-height:96vh;border-radius:50px;box-shadow:0 0 0 1px rgba(255,255,255,.08),0 0 0 11px #1a1a1a,0 0 0 13px #111,0 60px 120px rgba(0,0,0,.95);overflow:hidden;display:flex;flex-direction:column;position:relative;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;-webkit-font-smoothing:antialiased;}
#isim-frame.dark{--bg:#000;--bg2:#111;--bg3:#1c1c1e;--bg4:#2c2c2e;--txt:#fff;--txt2:#ebebf5;--txt3:#ebebf599;--txt4:#636366;--sep:#38383a;--bub-out:#0a84ff;--bub-in:#1c1c1e;--accent:#0a84ff;--green:#30d158;--red:#ff453a;--like:#ff375f;--card:#1c1c1e;}
#isim-frame.light{--bg:#f2f2f7;--bg2:#fff;--bg3:#e5e5ea;--bg4:#d1d1d6;--txt:#000;--txt2:#3c3c43;--txt3:#3c3c4399;--txt4:#aeaeb2;--sep:#c6c6c8;--bub-out:#0a84ff;--bub-in:#e5e5ea;--accent:#007aff;--green:#34c759;--red:#ff3b30;--like:#ff375f;--card:#fff;}
#isim-island{position:absolute;top:14px;left:50%;transform:translateX(-50%);width:120px;height:34px;background:#000;border-radius:20px;z-index:200;}
#isim-sb{background:var(--bg);height:56px;display:flex;align-items:flex-end;justify-content:space-between;padding:0 28px 10px;flex-shrink:0;z-index:100;}
#isim-sb-time{font-size:15px;font-weight:700;color:var(--txt);}
#isim-sb-icons{display:flex;align-items:center;gap:7px;color:var(--txt);}
.isim-home-bar{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:134px;height:5px;background:rgba(255,255,255,.25);border-radius:3px;z-index:200;pointer-events:none;}
#isim-notif-tray{position:absolute;top:60px;left:0;right:0;z-index:5000;padding:0 14px;pointer-events:none;}
.isim-notif-card{margin-bottom:8px;background:rgba(28,28,30,.94);backdrop-filter:blur(40px);border-radius:18px;padding:13px 16px;border:.5px solid rgba(255,255,255,.1);animation:notifSlide .4s cubic-bezier(.34,1.56,.64,1);transition:opacity .4s,transform .4s;}
@keyframes notifSlide{from{opacity:0;transform:translateY(-14px) scale(.96)}to{opacity:1;transform:none}}
.isim-notif-app{font-size:11px;color:rgba(255,255,255,.45);margin-bottom:4px;display:flex;align-items:center;gap:6px;}
.isim-notif-msg{font-size:14px;color:#fff;line-height:1.35;}
#isim-screen{flex:1;overflow:hidden;position:relative;background:var(--bg);}
.isim-screen{position:absolute;inset:0;display:none;flex-direction:column;background:var(--bg);}
.isim-screen.show{display:flex;}
#isim-home{position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;}
#isim-home-wallpaper{position:absolute;inset:0;background-size:cover;background-position:center;z-index:0;}
#isim-home-wallpaper::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.15) 50%,rgba(0,0,0,.55));}
.isim-home-content{position:relative;z-index:1;display:flex;flex-direction:column;flex:1;min-height:0;}
#isim-home-time-big{font-size:84px;font-weight:200;color:#fff;text-align:center;padding-top:8px;letter-spacing:-5px;line-height:1;}
#isim-home-date{font-size:17px;color:rgba(255,255,255,.7);text-align:center;margin-top:-4px;}
.isim-app-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;padding:16px 24px;margin-top:auto;}
.isim-dock{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:14px 20px 16px;background:rgba(255,255,255,.15);backdrop-filter:blur(40px);border-radius:32px;margin:6px 16px 10px;border:.5px solid rgba(255,255,255,.2);}
.isim-app-btn{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;background:none;border:none;padding:0;transition:transform .15s;}
.isim-app-btn:active{transform:scale(.88);}
.isim-icon{width:62px;height:62px;border-radius:15px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.4);position:relative;overflow:hidden;}
.isim-app-label{font-size:11px;color:rgba(255,255,255,.92);text-shadow:0 1px 6px rgba(0,0,0,.7);text-align:center;}
.ic-msg{background:linear-gradient(160deg,#34c759,#30b050);}
.ic-x{background:#000;border:.5px solid rgba(255,255,255,.1);}
.ic-bank{background:linear-gradient(160deg,#ff9f0a,#e08000);}
.ic-set{background:linear-gradient(160deg,#636366,#3a3a3c);}
.ic-insta{background:linear-gradient(135deg,#405de6,#5851db,#833ab4,#c13584,#e1306c,#fd1d1d);}
.isim-nav{height:48px;background:var(--bg);border-bottom:.5px solid var(--sep);display:flex;align-items:center;padding:0 16px;flex-shrink:0;position:relative;}
.isim-nav-glass{background:rgba(0,0,0,.85);backdrop-filter:blur(28px);}
.isim-nav-back{background:none;border:none;color:var(--accent);font-size:16px;cursor:pointer;display:flex;align-items:center;gap:3px;min-width:44px;padding:8px 0;}
.isim-nav-title{position:absolute;left:50%;transform:translateX(-50%);font-size:17px;font-weight:700;color:var(--txt);white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis;}
.isim-nav-action{background:none;border:none;color:var(--accent);font-size:17px;cursor:pointer;padding:4px;margin-left:auto;}
#isim-stories-bar{display:flex;padding:14px 16px 12px;background:var(--bg);border-bottom:.5px solid var(--sep);overflow-x:auto;flex-shrink:0;}
#isim-stories-bar::-webkit-scrollbar,#isim-notes-bar::-webkit-scrollbar,#isim-msgs::-webkit-scrollbar,.isim-tweet-feed::-webkit-scrollbar{display:none;}
.isim-story-item{display:flex;flex-direction:column;align-items:center;gap:5px;flex-shrink:0;cursor:pointer;padding:0 8px;}
.isim-story-ring{width:60px;height:60px;border-radius:50%;padding:3px;box-sizing:border-box;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);}
.isim-story-ring.mine{border:2px dashed var(--accent);background:none;display:flex;align-items:center;justify-content:center;}
.isim-story-av{width:100%;height:100%;border-radius:50%;background:var(--bg3);object-fit:cover;border:3px solid var(--bg);}
.isim-story-name{font-size:11px;color:var(--txt3);max-width:64px;text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
.isim-story-add-badge{position:absolute;bottom:0;right:0;width:20px;height:20px;border-radius:50%;background:var(--accent);color:#fff;font-size:14px;display:flex;align-items:center;justify-content:center;border:2px solid var(--bg);font-weight:600;}
#isim-notes-bar{display:flex;gap:12px;padding:10px 16px;background:var(--bg);border-bottom:.5px solid var(--sep);overflow-x:auto;flex-shrink:0;align-items:flex-start;}
.isim-note-item{display:flex;flex-direction:column;align-items:center;gap:5px;flex-shrink:0;cursor:pointer;max-width:72px;}
.isim-note-av-wrap{position:relative;}
.isim-note-av{width:44px;height:44px;border-radius:50%;object-fit:cover;background:var(--bg3);border:2px solid var(--sep);}
.isim-note-speech{position:absolute;bottom:46px;left:50%;transform:translateX(-50%);background:var(--bg2);border:.5px solid var(--sep);border-radius:10px 10px 10px 3px;padding:5px 8px;font-size:11px;color:var(--txt);white-space:nowrap;max-width:100px;overflow:hidden;text-overflow:ellipsis;pointer-events:none;}
.isim-note-label{font-size:11px;color:var(--txt3);text-align:center;max-width:72px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
.isim-search-wrap{padding:8px 16px;background:var(--bg);flex-shrink:0;}
.isim-search{width:100%;box-sizing:border-box;padding:9px 14px 9px 36px;border-radius:12px;border:none;background:var(--bg3);color:var(--txt);font-size:15px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23636366' viewBox='0 0 24 24'%3E%3Cpath d='M15.5 14h-.79l-.28-.27A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:10px center;background-size:18px;}
.isim-search:focus{outline:none;background-color:var(--bg4);}
.isim-search::placeholder{color:var(--txt4);}
.isim-chat-row{display:flex;align-items:center;gap:14px;padding:12px 16px;cursor:pointer;position:relative;background:var(--bg);}
.isim-chat-row:active{background:var(--bg3);}
.isim-chat-row::after{content:'';position:absolute;left:82px;right:0;bottom:0;height:.5px;background:var(--sep);}
.isim-chat-av-wrap{position:relative;flex-shrink:0;}
.isim-chat-av{width:54px;height:54px;border-radius:27px;background:var(--bg4);object-fit:cover;}
.isim-chat-meta{flex:1;min-width:0;}
.isim-chat-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;}
.isim-chat-nm{font-size:16px;font-weight:600;color:var(--txt);}
.isim-chat-time{font-size:13px;color:var(--txt3);}
.isim-chat-preview{font-size:14px;color:var(--txt3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
#isim-chat-header{padding:0 14px 10px;background:rgba(0,0,0,.85);backdrop-filter:blur(32px);border-bottom:.5px solid var(--sep);display:flex;align-items:flex-end;gap:10px;flex-shrink:0;padding-top:56px;}
.isim-back-btn{background:none;border:none;color:var(--accent);font-size:15px;cursor:pointer;display:flex;align-items:center;gap:2px;padding:6px 0;white-space:nowrap;flex-shrink:0;}
.isim-hdr-center{flex:1;display:flex;flex-direction:column;align-items:center;cursor:pointer;}
.isim-chat-hdr-av{width:36px;height:36px;border-radius:18px;background:var(--bg3);object-fit:cover;margin-bottom:2px;}
.isim-chat-hdr-name{font-size:13px;font-weight:600;color:var(--txt);}
.isim-chat-hdr-status{font-size:11px;color:var(--green);}
.isim-chat-tools{display:flex;flex-shrink:0;}
.isim-tool-btn{background:none;border:none;border-radius:10px;padding:6px 10px;font-size:22px;color:var(--txt3);cursor:pointer;}
.isim-tool-btn:active{background:var(--bg3);}
#isim-chat-settings{background:var(--bg);border-bottom:.5px solid var(--sep);display:none;padding:12px 16px;flex-shrink:0;flex-direction:column;}
.isim-hist-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:.5px solid var(--sep);}
.isim-hist-toggle-row:last-child{border-bottom:none;padding-bottom:0;}
.isim-toggle-label{font-size:15px;color:var(--txt);}
.isim-toggle{position:relative;width:50px;height:30px;flex-shrink:0;}
.isim-toggle input{opacity:0;width:0;height:0;}
.isim-toggle span{position:absolute;inset:0;background:var(--bg4);border-radius:15px;cursor:pointer;transition:.3s cubic-bezier(.34,1.56,.64,1);}
.isim-toggle span::before{content:'';position:absolute;width:26px;height:26px;left:2px;top:2px;background:#fff;border-radius:13px;transition:.3s cubic-bezier(.34,1.56,.64,1);box-shadow:0 2px 6px rgba(0,0,0,.3);}
.isim-toggle input:checked+span{background:var(--accent);}
.isim-toggle input:checked+span::before{transform:translateX(20px);}
#isim-msgs{flex:1;overflow-y:auto;padding:8px 12px 12px;display:flex;flex-direction:column;gap:2px;background:var(--bg);}
.isim-sys{text-align:center;font-size:12px;color:var(--txt4);padding:5px 14px;background:var(--bg3);border-radius:10px;margin:5px auto;max-width:260px;}
.isim-row{display:flex;align-items:flex-end;gap:6px;max-width:82%;position:relative;}
.isim-row.out{align-self:flex-end;flex-direction:row-reverse;}
.isim-row.in{align-self:flex-start;}
.isim-row.in+.isim-row.in,.isim-row.out+.isim-row.out{margin-top:1px;}
.isim-row.in+.isim-row.out,.isim-row.out+.isim-row.in{margin-top:10px;}
.isim-av{width:30px;height:30px;border-radius:15px;background:var(--bg3);flex-shrink:0;object-fit:cover;align-self:flex-end;}
.isim-row.in+.isim-row.in .isim-av{visibility:hidden;}
.isim-wrap{display:flex;flex-direction:column;gap:2px;}
.isim-bub{padding:10px 14px;font-size:16px;line-height:1.4;word-break:break-word;border-radius:20px;color:var(--txt);cursor:pointer;transition:opacity .1s;}
.isim-bub:active{opacity:.8;}
.isim-row.in .isim-bub{background:var(--bub-in);border-bottom-left-radius:6px;}
.isim-row.in+.isim-row.in .isim-bub{border-radius:20px;}
.isim-row.out .isim-bub{background:var(--bub-out);color:#fff;border-bottom-right-radius:6px;}
.isim-row.out+.isim-row.out .isim-bub{border-radius:20px;}
.isim-time{font-size:11px;color:var(--txt4);padding:0 2px;align-self:flex-end;white-space:nowrap;}
.isim-typing{display:flex;gap:5px;padding:12px 16px;background:var(--bub-in);border-radius:20px;border-bottom-left-radius:6px;width:fit-content;align-items:center;}
.isim-typing span{width:8px;height:8px;border-radius:50%;background:var(--txt4);animation:ibounce .9s infinite ease-in-out;}
.isim-typing span:nth-child(2){animation-delay:.15s;}
.isim-typing span:nth-child(3){animation-delay:.3s;}
@keyframes ibounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-7px)}}
.isim-voice-bub{display:flex;align-items:center;gap:10px;min-width:170px;padding:2px 0;}
.isim-loc-bub{border-radius:18px;overflow:hidden;min-width:200px;cursor:pointer;background:var(--bg3);border:.5px solid var(--sep);}
.isim-loc-map{height:90px;background:linear-gradient(135deg,#1a3a2a,#0d2218);display:flex;align-items:center;justify-content:center;font-size:30px;position:relative;}
.isim-loc-map::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 18px,rgba(48,209,88,.08) 18px,rgba(48,209,88,.08) 19px),repeating-linear-gradient(90deg,transparent,transparent 18px,rgba(48,209,88,.08) 18px,rgba(48,209,88,.08) 19px);}
.isim-redenv-bub{background:linear-gradient(135deg,#e53935,#b71c1c);border-radius:18px;padding:16px 20px;display:flex;flex-direction:column;align-items:center;gap:8px;min-width:170px;}
.isim-del-btn{background:#ff453a;border:none;border-radius:50%;width:22px;height:22px;color:#fff;font-size:13px;cursor:pointer;align-self:flex-start;flex-shrink:0;margin-top:6px;display:none;align-items:center;justify-content:center;}
.edit-active .isim-del-btn{display:flex;}
#isim-inputbar{background:rgba(0,0,0,.9);backdrop-filter:blur(20px);border-top:.5px solid var(--sep);padding:10px 12px 22px;display:flex;flex-direction:column;flex-shrink:0;}
.isim-inputbar-row{display:flex;gap:8px;align-items:flex-end;}
#isim-input{flex:1;background:var(--bg3);border:.5px solid rgba(255,255,255,.06);border-radius:22px;padding:10px 16px;font-size:16px;color:var(--txt);resize:none;line-height:1.4;max-height:100px;overflow-y:auto;font-family:inherit;}
#isim-input:focus{border-color:rgba(255,255,255,.15);outline:none;}
#isim-input::placeholder{color:var(--txt4);}
.isim-inp-btn{background:var(--bg3);border:none;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;flex-shrink:0;color:var(--txt2);transition:background .12s,transform .1s;}
.isim-inp-btn:active{transform:scale(.9);}
#isim-sendbtn{background:var(--accent);color:#fff;}
#isim-cancelbtn{background:#ff453a;color:#fff;display:none;}
#isim-gen-bar{border-top:.5px solid var(--sep);padding:8px 12px 20px;background:var(--bg);flex-shrink:0;display:flex;gap:8px;}
#isim-gen-bar button{border-radius:14px;border:none;padding:12px;font-size:15px;font-weight:600;cursor:pointer;}
#isim-plussheet{background:var(--bg2);border-top:.5px solid var(--sep);display:none;padding:14px;flex-shrink:0;}
#isim-plussheet.show{display:block;}
.isim-plus-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
.isim-plus-item{display:flex;flex-direction:column;align-items:center;gap:6px;background:var(--bg3);border:none;border-radius:16px;padding:14px 6px 12px;cursor:pointer;font-size:12px;color:var(--txt3);transition:transform .1s;}
.isim-plus-item:active{transform:scale(.95);}
.isim-plus-icon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:2px;}
#isim-sticker-tray{background:var(--bg2);border-top:.5px solid var(--sep);display:none;flex-shrink:0;flex-direction:column;max-height:200px;}
#isim-sticker-tray.show{display:flex;}
.isim-sticker-grid{display:flex;gap:10px;padding:12px;overflow-x:auto;flex-wrap:wrap;justify-content:center;}
.isim-sticker-slot{width:72px;height:72px;border-radius:14px;overflow:hidden;background:var(--bg3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .1s;flex-shrink:0;}
.isim-sticker-slot:active{transform:scale(.92);}
.isim-sticker-slot img{width:100%;height:100%;object-fit:contain;padding:4px;}
#isim-redenv-sheet{position:absolute;inset:0;background:var(--bg);z-index:30;display:none;flex-direction:column;align-items:center;justify-content:center;padding:24px;}
#isim-redenv-sheet.show{display:flex;}
.isim-re-card{background:linear-gradient(160deg,#d32f2f,#8b0000);border-radius:28px;padding:32px;width:100%;max-width:290px;display:flex;flex-direction:column;align-items:center;gap:16px;}
.isim-re-input{width:100%;background:rgba(255,255,255,.12);border:.5px solid rgba(255,255,255,.2);border-radius:14px;padding:12px 16px;color:#fff;font-size:17px;text-align:center;}
.isim-re-input::placeholder{color:rgba(255,255,255,.4);}
.isim-re-send{width:100%;background:#ffd700;color:#8b0000;border:none;border-radius:16px;padding:14px;font-size:16px;font-weight:700;cursor:pointer;}
#isim-notepanel{position:absolute;inset:0;background:var(--bg);z-index:25;display:none;flex-direction:column;padding-top:56px;}
#isim-notepanel.show{display:flex;}
#isim-noteta{flex:1;background:transparent;border:none;padding:16px;color:var(--txt);font-size:16px;line-height:1.6;resize:none;font-family:inherit;}
#isim-call{position:absolute;inset:0;z-index:90;display:none;flex-direction:column;overflow:hidden;}
#isim-call.show{display:flex;}
#isim-call-bg{position:absolute;inset:0;background:linear-gradient(160deg,#0a0a1a,#0d1428);background-size:cover;background-position:center;filter:blur(30px);transform:scale(1.15);opacity:.7;}
#isim-call-bg::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.5),rgba(0,0,0,.1) 50%,rgba(0,0,0,.8));}
.isim-call-top{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;padding-top:70px;gap:12px;}
#isim-call-av{width:90px;height:90px;border-radius:45px;object-fit:cover;border:2px solid rgba(255,255,255,.25);background:var(--bg3);}
#isim-call-name{font-size:30px;font-weight:700;color:#fff;}
#isim-call-stat{font-size:15px;color:rgba(255,255,255,.6);}
#isim-call-dur{font-size:20px;color:rgba(255,255,255,.8);font-variant-numeric:tabular-nums;font-weight:300;}
#isim-call-typing-indicator{display:none;margin:0 24px;padding:10px 16px;background:rgba(48,209,88,.15);border:1px solid rgba(48,209,88,.4);border-radius:20px;position:relative;z-index:1;}
#isim-call-chat-split{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;margin:0 16px;border-radius:20px 20px 0 0;overflow:hidden;background:rgba(0,0,0,.6);backdrop-filter:blur(20px);border:.5px solid rgba(255,255,255,.1);min-height:0;}
#isim-call-float{flex:1;overflow-y:auto;padding:8px 14px;display:flex;flex-direction:column;gap:4px;}
.isim-call-inp{flex:1;background:rgba(255,255,255,.1);border:.5px solid rgba(255,255,255,.15);border-radius:24px;padding:12px 18px;color:#fff;font-size:16px;}
.isim-call-inp::placeholder{color:rgba(255,255,255,.4);}
.isim-call-send-btn{background:var(--accent);border:none;border-radius:50%;width:42px;height:42px;color:#fff;cursor:pointer;display:none;align-items:center;justify-content:center;flex-shrink:0;}
.isim-call-send-btn.show{display:flex;}
.isim-call-gen-btn{background:rgba(255,255,255,.12);border:.5px solid rgba(255,255,255,.2);border-radius:24px;padding:10px 20px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;width:calc(100% - 40px);margin:0 20px 10px;}
.isim-call-ctls{position:relative;z-index:1;display:flex;gap:24px;align-items:center;padding:0 20px 44px;justify-content:center;}
.icircle{background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;color:rgba(255,255,255,.8);font-size:12px;}
.icircle-bg{width:64px;height:64px;border-radius:32px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:26px;}
.icircle-bg.red{background:rgba(255,69,58,.85);}
.icircle-bg.on{background:rgba(255,255,255,.5);}
#isim-story-viewer{position:absolute;inset:0;background:#000;z-index:3000;display:none;flex-direction:column;}
#isim-story-viewer.show{display:flex;}
#isim-story-progress{display:flex;gap:4px;padding:60px 16px 8px;flex-shrink:0;position:relative;z-index:1;}
.isim-story-prog-seg{flex:1;height:3px;background:rgba(255,255,255,.3);border-radius:2px;overflow:hidden;}
.isim-story-prog-fill{height:100%;background:#fff;border-radius:2px;width:0;}
.isim-story-user{position:absolute;top:70px;left:16px;display:flex;align-items:center;gap:10px;z-index:2;}
.isim-story-user-av{width:36px;height:36px;border-radius:18px;object-fit:cover;border:2px solid #fff;}
.isim-story-user-nm{font-size:15px;font-weight:600;color:#fff;}
.isim-story-close{position:absolute;top:64px;right:16px;background:rgba(0,0,0,.4);border:none;border-radius:50%;width:32px;height:32px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2;}
#isim-story-img{position:absolute;inset:0;background-size:cover;background-position:center;z-index:0;}
#isim-story-img::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 60%,rgba(0,0,0,.5));}
.isim-story-text-overlay{position:absolute;bottom:80px;left:16px;right:16px;z-index:2;background:rgba(0,0,0,.4);backdrop-filter:blur(8px);border-radius:14px;padding:12px 14px;font-size:14px;color:#fff;display:none;}
.isim-story-text-overlay.show{display:block;}
.isim-story-reply-bar{position:absolute;bottom:0;left:0;right:0;z-index:2;display:flex;gap:10px;padding:12px 16px 28px;background:linear-gradient(transparent,rgba(0,0,0,.4));}
.isim-story-reply-bar input{flex:1;background:rgba(255,255,255,.15);border:.5px solid rgba(255,255,255,.3);border-radius:24px;padding:11px 16px;color:#fff;font-size:15px;}
.isim-story-reply-bar input::placeholder{color:rgba(255,255,255,.5);}
.isim-story-send{background:var(--accent);border:none;border-radius:50%;width:40px;height:40px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.isim-x-header{height:52px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:.5px solid var(--sep);flex-shrink:0;background:rgba(0,0,0,.85);backdrop-filter:blur(20px);}
.isim-x-tabs{display:flex;border-bottom:.5px solid var(--sep);flex-shrink:0;background:rgba(0,0,0,.85);backdrop-filter:blur(20px);}
.isim-x-tab{flex:1;text-align:center;padding:14px 0;font-size:15px;font-weight:500;color:#71767b;position:relative;cursor:pointer;}
.isim-x-tab.on{color:#e7e9ea;font-weight:700;}
.isim-x-tab.on::after{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:44px;height:3px;background:#1d9bf0;border-radius:2px;}
.isim-tweet-feed{flex:1;overflow-y:auto;background:#000;}
.isim-tweet{padding:14px 16px;border-bottom:.5px solid #2f3336;display:flex;gap:12px;cursor:pointer;}
.isim-tweet:active{background:rgba(255,255,255,.03);}
.tw-av{width:42px;height:42px;border-radius:21px;object-fit:cover;background:#333;flex-shrink:0;}
.tw-body{flex:1;min-width:0;}
.tw-meta{display:flex;align-items:center;gap:5px;margin-bottom:3px;flex-wrap:wrap;}
.tw-name{font-weight:700;color:#e7e9ea;font-size:15px;}
.tw-handle,.tw-time{color:#71767b;font-size:14px;}
.tw-text{font-size:15px;color:#e7e9ea;line-height:1.45;white-space:pre-wrap;word-break:break-word;}
.tw-img{width:100%;border-radius:14px;border:.5px solid #2f3336;margin-top:10px;object-fit:cover;max-height:280px;}
.tw-actions{display:flex;justify-content:space-between;margin-top:12px;max-width:300px;}
.tw-act{display:flex;align-items:center;gap:6px;color:#71767b;font-size:14px;cursor:pointer;}
.tw-act.liked{color:#f91880;}
.tw-act.rted{color:#00ba7c;}
.tw-act svg{width:18px;height:18px;fill:currentColor;}
#isim-tweet-composer{position:absolute;inset:0;background:#000;z-index:50;display:none;flex-direction:column;}
#isim-tweet-composer.show{display:flex;}
.isim-compose-head{padding:52px 16px 14px;border-bottom:.5px solid #2f3336;display:flex;justify-content:space-between;align-items:center;}
#isim-tweet-area{flex:1;background:transparent;border:none;padding:16px;color:#e7e9ea;font-size:18px;resize:none;font-family:inherit;line-height:1.4;}
.isim-tweet-post-btn{background:#1d9bf0;color:#fff;border:none;border-radius:20px;padding:8px 20px;font-size:15px;font-weight:700;cursor:pointer;}
#isim-tweet-detail{position:absolute;inset:0;background:#000;z-index:40;display:none;flex-direction:column;}
#isim-tweet-detail.show{display:flex;}
.isim-tweet-detail-body{flex:1;overflow-y:auto;}
.isim-reply-input-bar{padding:12px 16px 28px;border-top:.5px solid #2f3336;display:flex;gap:10px;align-items:center;background:#000;flex-shrink:0;}
.isim-reply-inp{flex:1;background:#1a1a1a;border:none;border-radius:22px;padding:10px 16px;color:#e7e9ea;font-size:15px;}
.isim-reply-send-btn{background:#1d9bf0;color:#fff;border:none;border-radius:20px;padding:8px 16px;font-size:14px;font-weight:700;cursor:pointer;flex-shrink:0;}
#isim-x-notifs-page{display:none;background:#000;}
#isim-x-notifs-page.show{display:flex;flex-direction:column;flex:1;overflow-y:auto;}
.isim-set-section{padding:22px 16px 8px;}
.isim-set-header{font-size:13px;color:var(--txt4);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;}
.isim-set-group{background:var(--card);border-radius:16px;overflow:hidden;}
.isim-set-row{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:.5px solid var(--sep);}
.isim-set-row:last-child{border-bottom:none;}
.isim-set-row-label{font-size:16px;color:var(--txt);}
.isim-swatch{width:28px;height:28px;border-radius:14px;cursor:pointer;border:2.5px solid transparent;transition:transform .1s;}
.isim-swatch.on{border-color:var(--txt);transform:scale(1.1);}
.isim-set-chevron{color:var(--txt4);font-size:18px;}
.isim-friend-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:.5px solid var(--sep);}
.isim-friend-av{width:48px;height:48px;border-radius:24px;background:var(--bg3);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;}
.isim-friend-info{flex:1;min-width:0;}
.isim-friend-name{font-size:15px;font-weight:600;color:var(--txt);}
.isim-friend-bio{font-size:13px;color:var(--txt3);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
.isim-friend-add{background:var(--accent);color:#fff;border:none;border-radius:20px;padding:7px 18px;font-size:14px;font-weight:600;cursor:pointer;}
.isim-bank-card{background:linear-gradient(135deg,#1c2a4a,#2a4a6a);border-radius:22px;margin:16px;padding:22px;box-shadow:0 8px 32px rgba(10,132,255,.25);border:.5px solid rgba(255,255,255,.1);}
.isim-tx-row{display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:.5px solid var(--sep);}
.isim-tx-icon{width:40px;height:40px;border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.isim-tx-receive{background:rgba(48,209,88,.15);color:var(--green);}
.isim-tx-send{background:rgba(255,69,58,.12);color:var(--red);}
.isim-tx-info{flex:1;min-width:0;}
.isim-tx-from{font-size:15px;font-weight:500;color:var(--txt);}
.isim-tx-note{font-size:13px;color:var(--txt3);}
.isim-tx-amt{font-size:16px;font-weight:700;flex-shrink:0;}
.isim-tx-amt.green{color:var(--green);}
.isim-tx-amt.red{color:var(--red);}
#isim-call-history,#isim-call-transcript{display:none;position:absolute;inset:0;z-index:500;background:var(--bg);flex-direction:column;}
#isim-toast{position:absolute;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(28,28,30,.96);color:#fff;padding:9px 20px;border-radius:20px;font-size:14px;white-space:nowrap;opacity:0;transition:opacity .25s;pointer-events:none;z-index:9000;backdrop-filter:blur(20px);}
#isim-toast.show{opacity:1;}
.isim-loading-overlay{position:absolute;inset:0;background:rgba(0,0,0,.5);z-index:200;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;backdrop-filter:blur(8px);}
.isim-loading-overlay.show{display:flex;}
.isim-spinner{width:32px;height:32px;border:2.5px solid rgba(255,255,255,.2);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes bubbleIn{0%{opacity:0;transform:scale(.85)}60%{transform:scale(1.03)}100%{opacity:1;transform:scale(1)}}
.isim-bounce{animation:bubbleIn .25s cubic-bezier(.34,1.56,.64,1) forwards;}
@keyframes callPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.3)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media(max-width:480px){#isim-frame{width:100vw!important;height:100vh!important;border-radius:0!important;box-shadow:none!important;max-height:100vh!important;}#isim-phone{align-items:stretch!important;justify-content:stretch!important;padding:0!important;}#isim-island{display:none!important;}}
.isim-st-panel{margin-bottom:5px;}
`;document.head.appendChild(s);}
// ── HTML Template ────────────────────────────────────────────────────────────
const SVG_BACK=`<svg viewBox="0 0 11 18" width="9" height="15" style="margin-right:2px"><path d="M9.5 1L1 9l8.5 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SVG_SEND=`<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
const SVG_PLUS=`<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>`;

function buildPhoneHTML(){
  const swatches=['#0a84ff','#30d158','#ff453a','#ff9f0a','#bf5af2','#ff6b35','#05c7f2','#ff375f']
    .map(c=>`<div class="isim-swatch" data-c="${c}" style="background:${c}" onclick="window.__isimAccent('${c}',this)"></div>`).join('');
  return`<div id="isim-frame" class="dark">
<div id="isim-island"></div>
<div id="isim-sb">
  <span id="isim-sb-time">9:41</span>
  <span id="isim-sb-icons">
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
    <button onclick="window.__isimClose()" style="background:rgba(255,255,255,.1);border:none;border-radius:50%;width:22px;height:22px;color:rgba(255,255,255,.7);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;margin-left:2px;">✕</button>
  </span>
</div>
<div id="isim-notif-tray"></div>
<div id="isim-screen">

<!-- HOME -->
<div id="isim-home" style="display:none">
  <div id="isim-home-wallpaper"></div>
  <div class="isim-home-content">
    <div id="isim-home-time-big">9:41</div>
    <div id="isim-home-date">Saturday, May 17</div>
    <div style="flex:1;min-height:20px"></div>
    <div class="isim-app-grid">
      <button class="isim-app-btn" onclick="window.__isimNav('messages')"><div class="isim-icon ic-msg"><svg style="width:32px;height:32px;fill:#fff" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></div><span class="isim-app-label">Messages</span></button>
      <button class="isim-app-btn" onclick="window.__isimNav('twitter')"><div class="isim-icon ic-x"><span style="font-size:26px;font-weight:900;color:#fff;font-family:serif">X</span></div><span class="isim-app-label">X</span></button>
      <button class="isim-app-btn" onclick="window.__isimNav('instagram')"><div class="isim-icon ic-insta"><svg style="width:30px;height:30px;fill:#fff" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg></div><span class="isim-app-label">Instagram</span></button>
      <button class="isim-app-btn" onclick="window.__isimNav('bank')"><div class="isim-icon ic-bank"><svg style="width:28px;height:28px;fill:#fff" viewBox="0 0 24 24"><path d="M11.5 2L2 7v2h20V7L11.5 2zm7.5 7H5v9h2v-7h1v7h2v-7h1v7h2v-7h1v7h2v-7h1v7h2V9zm2 11H2v2h20v-2z"/></svg></div><span class="isim-app-label">Bank</span></button>
      <button class="isim-app-btn" onclick="window.__isimNav('settings')"><div class="isim-icon ic-set"><svg style="width:28px;height:28px;fill:#fff" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg></div><span class="isim-app-label">Settings</span></button>
    </div>
    <div class="isim-dock">
      <button class="isim-app-btn" onclick="window.__isimNav('messages')"><div class="isim-icon ic-msg" style="width:54px;height:54px;border-radius:14px"><svg style="width:28px;height:28px;fill:#fff" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></div></button>
      <button class="isim-app-btn" onclick="window.__isimNav('instagram')"><div class="isim-icon ic-insta" style="width:54px;height:54px;border-radius:14px"><svg style="width:26px;height:26px;fill:#fff" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg></div></button>
      <button class="isim-app-btn" onclick="window.__isimNav('twitter')"><div class="isim-icon ic-x" style="width:54px;height:54px;border-radius:14px"><span style="font-size:22px;font-weight:900;color:#fff;font-family:serif">X</span></div></button>
      <button class="isim-app-btn" onclick="window.__isimNav('settings')"><div class="isim-icon ic-set" style="width:54px;height:54px;border-radius:14px"><svg style="width:24px;height:24px;fill:#fff" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg></div></button>
    </div>
    <div class="isim-home-bar"></div>
  </div>
</div>

<!-- MESSAGES -->
<div class="isim-screen" id="isim-scr-messages">
  <div class="isim-nav isim-nav-glass" style="height:52px">
    <button class="isim-nav-back" onclick="window.__isimNav('home')">${SVG_BACK}</button>
    <span class="isim-nav-title">Messages</span>
    <button class="isim-nav-action" onclick="window.__isimNav('friends')">${SVG_PLUS}</button>
  </div>
  <div style="flex:1;overflow-y:auto;background:var(--bg)">
    <div id="isim-stories-bar"></div>
    <div id="isim-notes-bar"></div>
    <div class="isim-search-wrap"><input id="isim-msg-search" class="isim-search" placeholder="Search" oninput="window.__isimFilterMessages(this.value)"></div>
    <div id="isim-chat-list"></div>
  </div>
  <div class="isim-home-bar"></div>
</div>

<!-- ADD CONTACT -->
<div class="isim-screen" id="isim-scr-friends">
  <div class="isim-nav">
    <button class="isim-nav-back" onclick="window.__isimNav('messages')">${SVG_BACK} Messages</button>
    <span class="isim-nav-title">Add Contact</span>
    <button class="isim-nav-action" onclick="window.__isimLoadFriends()"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg></button>
  </div>
  <div class="isim-search-wrap"><input id="isim-fsearch" class="isim-search" placeholder="Search characters" oninput="window.__isimFilterFriends(this.value)"></div>
  <div id="isim-flist" style="flex:1;overflow-y:auto"></div>
  <div class="isim-home-bar"></div>
</div>

<!-- CHAT -->
<div class="isim-screen" id="isim-scr-chat">
  <div id="isim-chat-header">
    <button class="isim-back-btn" onclick="window.__isimNav('messages')">${SVG_BACK} Back</button>
    <div class="isim-hdr-center" onclick="window.__isimToggleChatSettings()">
      <img id="isim-chat-hdr-av" class="isim-chat-hdr-av" src="" alt="" onerror="this.style.background='var(--bg3)'">
      <div class="isim-chat-hdr-name" id="isim-chat-title">Contact</div>
      <div class="isim-chat-hdr-status">Active now</div>
    </div>
    <div class="isim-chat-tools">
      <button class="isim-tool-btn" onclick="window.__isimNavCallHistory()" title="Call Log"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"/></svg></button>
      <button class="isim-tool-btn" onclick="window.__isimStartCall()" title="Call"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg></button>
      <button class="isim-tool-btn" onclick="window.__isimToggleMenu()"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg></button>
    </div>
  </div>
  <div id="isim-chat-settings">
    <div class="isim-hist-toggle-row">
      <span class="isim-toggle-label">Read chat history</span>
      <label class="isim-toggle"><input type="checkbox" id="isim-hist-toggle" onchange="window.__isimToggleHistory(this.checked)" checked><span></span></label>
    </div>
    <div class="isim-hist-toggle-row">
      <span class="isim-toggle-label" style="font-size:13px;color:var(--txt3)">Messages limit</span>
      <div style="display:flex;align-items:center;gap:8px">
        <input id="isim-history-limit" type="number" value="50" min="5" max="500" style="width:60px;background:var(--bg3);border:none;border-radius:8px;padding:6px 10px;color:var(--txt);font-size:14px;text-align:center">
        <button onclick="window.__isimSaveHistoryLimit()" style="background:var(--accent);color:#fff;border:none;border-radius:10px;padding:6px 12px;font-size:13px;font-weight:600;cursor:pointer">Save</button>
      </div>
    </div>
    <div class="isim-hist-toggle-row">
      <span class="isim-toggle-label" style="font-size:13px;color:var(--txt3)">Display name</span>
      <div style="display:flex;align-items:center;gap:8px">
        <input id="isim-char-name-input" type="text" placeholder="Name" style="background:var(--bg3);border:none;border-radius:10px;padding:7px 12px;color:var(--txt);font-size:14px;width:110px">
        <button onclick="window.__isimSaveCharName()" style="background:var(--accent);color:#fff;border:none;border-radius:10px;padding:6px 12px;font-size:13px;font-weight:600;cursor:pointer">Save</button>
      </div>
    </div>
    <div class="isim-hist-toggle-row" style="flex-direction:column;align-items:flex-start;gap:8px">
      <span class="isim-toggle-label" style="font-size:13px;color:var(--txt3)">Chat background</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <div style="width:40px;height:40px;border-radius:10px;background:var(--bg);border:1.5px solid var(--sep);cursor:pointer" onclick="window.__isimSetChatWp('')"></div>
        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(160deg,#0d0d1a,#0a1628);cursor:pointer" onclick="window.__isimSetChatWp('g1')"></div>
        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(160deg,#0d2137,#1a4c7a);cursor:pointer" onclick="window.__isimSetChatWp('g2')"></div>
        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(160deg,#2d0036,#4a0a6b);cursor:pointer" onclick="window.__isimSetChatWp('g3')"></div>
        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(160deg,#0a1a00,#1a3500);cursor:pointer" onclick="window.__isimSetChatWp('g4')"></div>
        <label style="width:40px;height:40px;border-radius:10px;background:var(--bg3);display:flex;align-items:center;justify-content:center;cursor:pointer;border:1.5px dashed var(--sep)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--txt4)"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
          <input type="file" accept="image/*" style="display:none" onchange="window.__isimUploadWp(this)">
        </label>
      </div>
    </div>
  </div>
  <div id="isim-msgs"></div>
  <div id="isim-plussheet">
    <div class="isim-plus-grid">
      <button class="isim-plus-item" onclick="document.getElementById('isim-photo-input').click()"><div class="isim-plus-icon" style="background:linear-gradient(135deg,#8e44ad,#3498db)"><svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></div>Photo<input type="file" id="isim-photo-input" accept="image/*" style="display:none" onchange="window.__isimSendPhoto(this)"></button>
      <button class="isim-plus-item" onclick="window.__isimToggleStickerTray()"><div class="isim-plus-icon" style="background:linear-gradient(135deg,#f39c12,#e74c3c)"><svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm0-4h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-2c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z"/></svg></div>Sticker</button>
      <button class="isim-plus-item" onclick="window.__isimSendLocationPrompt()"><div class="isim-plus-icon" style="background:linear-gradient(135deg,#27ae60,#2ecc71)"><svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>Location</button>
      <button class="isim-plus-item" onclick="window.__isimOpenRedEnvelope()"><div class="isim-plus-icon" style="background:linear-gradient(135deg,#c0392b,#e74c3c)">🧧</div>Gift</button>
      <button class="isim-plus-item" onclick="window.__isimVoiceRecord()"><div class="isim-plus-icon" style="background:linear-gradient(135deg,#2980b9,#3498db)"><svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg></div>Voice</button>
      <button class="isim-plus-item" onclick="window.__isimToggleNote()"><div class="isim-plus-icon" style="background:linear-gradient(135deg,#34495e,#2c3e50)"><svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></div>Note</button>
      <button class="isim-plus-item" onclick="window.__isimToggleEditMode()"><div class="isim-plus-icon" style="background:linear-gradient(135deg,#636366,#2c2c2e)"><svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></div>Edit</button>
      <button class="isim-plus-item" onclick="window.__isimSetBotNotePrompt()"><div class="isim-plus-icon" style="background:linear-gradient(135deg,#0a84ff,#0060d0)"><svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>Bot Note</button>
    </div>
  </div>
  <div id="isim-sticker-tray">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:.5px solid var(--sep)"><span style="font-size:14px;font-weight:600;color:var(--txt)">Stickers</span><label style="background:var(--accent);color:#fff;border:none;border-radius:10px;padding:5px 12px;font-size:13px;font-weight:600;cursor:pointer">Add<input type="file" id="isim-sticker-input" accept="image/*" style="display:none" onchange="window.__isimAddSticker(this)"></label></div>
    <div class="isim-sticker-grid" id="isim-sticker-grid"></div>
  </div>
  <div id="isim-inputbar">
    <div class="isim-inputbar-row">
      <button class="isim-inp-btn" onclick="window.__isimTogglePlus()">${SVG_PLUS}</button>
      <textarea id="isim-input" placeholder="iMessage" rows="1"></textarea>
      <button class="isim-inp-btn" id="isim-cancelbtn" onclick="window.__isimCancelBot()"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
      <button class="isim-inp-btn" id="isim-sendbtn" onclick="window.__isimSend()">${SVG_SEND}</button>
    </div>
  </div>
  <div id="isim-gen-bar">
    <button onclick="window.__isimNudge()" style="flex:1;background:var(--accent);color:#fff">Generate Reply</button>
    <button onclick="window.__isimInsertNewline()" style="background:var(--bg3);color:var(--txt3);padding:12px 16px" title="New line"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 7v4H5.83l3.58-3.59L8 6l-6 6 6 6 1.41-1.41L5.83 13H21V7z"/></svg></button>
  </div>
  <div id="isim-redenv-sheet">
    <div class="isim-re-card">
      <div style="font-size:48px">🧧</div>
      <div style="font-size:18px;font-weight:700;color:#ffd700">Send Gift</div>
      <input class="isim-re-input" id="isim-redenv-amount" type="number" placeholder="Amount (THB)">
      <input class="isim-re-input" id="isim-redenv-note" type="text" placeholder="Message (optional)" style="font-size:15px">
      <select id="isim-redenv-to" style="width:100%;background:rgba(255,255,255,.1);border:.5px solid rgba(255,255,255,.2);border-radius:12px;padding:10px 14px;color:#fff;font-size:14px"><option value="">Current chat</option></select>
      <button class="isim-re-send" onclick="window.__isimSendRedEnvelope()">Send</button>
      <button onclick="window.__isimCloseRedEnvelope()" style="background:transparent;border:none;color:rgba(255,255,255,.6);cursor:pointer;font-size:14px;padding:4px">Cancel</button>
    </div>
  </div>
  <div id="isim-notepanel">
    <div class="isim-nav" style="position:absolute;top:0;width:100%;box-sizing:border-box;background:var(--bg)">
      <button class="isim-nav-back" onclick="window.__isimToggleNote()">${SVG_BACK} Back</button>
      <span class="isim-nav-title">My Note</span>
      <button class="isim-nav-action" onclick="window.__isimSaveNote()">Done</button>
    </div>
    <textarea id="isim-noteta" placeholder="Write a note about this character..."></textarea>
  </div>
  <div id="isim-chat-menu" style="display:none;position:absolute;top:56px;right:12px;background:var(--bg2);border:.5px solid var(--sep);border-radius:16px;z-index:100;overflow:hidden;min-width:200px;box-shadow:0 8px 32px rgba(0,0,0,.4)">
    <div style="padding:12px 16px;font-size:15px;color:var(--txt);cursor:pointer;border-bottom:.5px solid var(--sep)" onclick="window.__isimToggleEditMode();window.__isimToggleMenu()">Edit Messages</div>
    <div style="padding:12px 16px;font-size:15px;color:var(--txt);cursor:pointer;border-bottom:.5px solid var(--sep)" onclick="window.__isimNavCallHistory();window.__isimToggleMenu()">Call Log</div>
    <div style="padding:12px 16px;font-size:15px;color:var(--red);cursor:pointer" onclick="window.__isimClearChat();window.__isimToggleMenu()">Clear Chat</div>
  </div>
  <div class="isim-home-bar"></div>
  <div id="isim-img-loading" class="isim-loading-overlay"><div class="isim-spinner"></div><span style="font-size:13px;color:rgba(255,255,255,.6)">Processing...</span></div>
</div>

<!-- STICKER MANAGER -->
<div class="isim-screen" id="isim-scr-stickers">
  <div class="isim-nav"><button class="isim-nav-back" onclick="window.__isimNav('settings')">${SVG_BACK} Settings</button><span class="isim-nav-title">Stickers</span><button class="isim-nav-action" onclick="document.getElementById('isim-sticker-input-mgr').click()">Add</button></div>
  <input type="file" id="isim-sticker-input-mgr" accept="image/*" style="display:none" onchange="window.__isimAddStickerMgr(this)">
  <div id="isim-sticker-mgr-grid" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-wrap:wrap;gap:12px"></div>
  <div class="isim-home-bar"></div>
</div>

<!-- CALL -->
<div id="isim-call">
  <div id="isim-call-bg"></div>
  <div class="isim-call-top">
    <img id="isim-call-av" src="" alt="">
    <div id="isim-call-name"></div>
    <div id="isim-call-stat">Calling...</div>
    <div id="isim-call-dur">0:00</div>
    <div id="isim-call-started-at" style="font-size:12px;color:rgba(255,255,255,.4);position:relative;z-index:1"></div>
    <div id="isim-call-typing-indicator"><div style="display:flex;align-items:center;gap:8px"><div style="width:8px;height:8px;border-radius:50%;background:#30d158;animation:callPulse 1s ease-in-out infinite"></div><span style="font-size:13px;color:#30d158;font-weight:600" id="isim-call-bot-name-typing">Speaking...</span></div></div>
  </div>
  <div id="isim-call-chat-split">
    <div style="font-size:12px;color:rgba(255,255,255,.4);padding:8px 14px;border-bottom:.5px solid rgba(255,255,255,.08);flex-shrink:0">Conversation</div>
    <div id="isim-call-float"></div>
    <div style="border-top:.5px solid rgba(255,255,255,.08);padding:8px 12px;display:flex;gap:8px;align-items:center;flex-shrink:0;background:rgba(0,0,0,.3)">
      <input id="isim-call-inp" class="isim-call-inp" placeholder="Say something..." oninput="document.getElementById('isim-call-send-btn').classList.toggle('show',this.value.trim().length>0)" onkeydown="if(event.key==='Enter')window.__isimCallSend()">
      <button id="isim-call-send-btn" class="isim-call-send-btn" onclick="window.__isimCallSend()">${SVG_SEND}</button>
    </div>
    <button class="isim-call-gen-btn" onclick="window.__isimCallGen()">Generate Bot Reply</button>
  </div>
  <div class="isim-call-ctls">
    <button class="icircle" onclick="window.__isimMute()"><div class="icircle-bg" id="isim-mute-circle"><svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg></div><span style="font-size:11px;color:rgba(255,255,255,.7)">Mute</span></button>
    <button class="icircle" onclick="window.__isimEndCall()"><div class="icircle-bg red"><svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" transform="rotate(135 12 12)"/></svg></div><span style="font-size:11px;color:rgba(255,255,255,.7)">End</span></button>
    <button class="icircle"><div class="icircle-bg"><svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg></div><span style="font-size:11px;color:rgba(255,255,255,.7)">Speaker</span></button>
  </div>
</div>

<!-- CALL HISTORY -->
<div id="isim-call-history">
  <div class="isim-nav"><button class="isim-nav-back" onclick="document.getElementById('isim-call-history').style.display='none'">${SVG_BACK} Back</button><span class="isim-nav-title">Call Log</span></div>
  <div id="isim-call-history-list" style="flex:1;overflow-y:auto"></div>
</div>

<!-- CALL TRANSCRIPT -->
<div id="isim-call-transcript">
  <div class="isim-nav"><button class="isim-nav-back" onclick="document.getElementById('isim-call-transcript').style.display='none';document.getElementById('isim-call-history').style.display='flex'">${SVG_BACK} Call Log</button><span class="isim-nav-title" id="isim-transcript-title">Transcript</span></div>
  <div id="isim-transcript-body" style="flex:1;overflow-y:auto;padding:16px;font-size:15px;color:var(--txt);line-height:1.7;white-space:pre-wrap"></div>
</div>

<!-- X / TWITTER -->
<div class="isim-screen" id="isim-scr-twitter" style="background:#000">
  <div class="isim-x-header">
    <button style="background:none;border:none;cursor:pointer;width:36px;height:36px;border-radius:18px;overflow:hidden;border:.5px solid #2f3336;flex-shrink:0" onclick="window.__isimNav('home')"><img id="isim-x-user-av" src="" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.style.background='#2f3336'"></button>
    <span style="font-size:24px;font-weight:900;color:#e7e9ea;font-family:serif;letter-spacing:-1px">X</span>
    <button style="background:none;border:none;cursor:pointer;font-size:22px;color:#1d9bf0;font-weight:300" onclick="window.__isimOpenCompose()">+</button>
  </div>
  <div class="isim-x-tabs">
    <div class="isim-x-tab on" id="isim-x-tab-fy" onclick="window.__isimXTab('for-you',this)">For You</div>
    <div class="isim-x-tab" id="isim-x-tab-fl" onclick="window.__isimXTab('following',this)">Following</div>
    <div class="isim-x-tab" id="isim-x-tab-tr" onclick="window.__isimXTab('trending',this)">Trending</div>
    <div class="isim-x-tab" id="isim-x-tab-notif" onclick="window.__isimXNotifTab()" style="position:relative">Alerts<span id="isim-x-notif-badge" style="display:none;position:absolute;top:8px;right:4px;background:#1d9bf0;color:#fff;border-radius:8px;min-width:16px;height:16px;font-size:10px;font-weight:700;align-items:center;justify-content:center;padding:0 3px"></span></div>
  </div>
  <div class="isim-tweet-feed" id="isim-tweet-feed"></div>
  <div id="isim-tweet-composer">
    <div class="isim-compose-head">
      <button style="background:none;border:none;color:#1d9bf0;font-size:15px;cursor:pointer" onclick="window.__isimCloseCompose()">Cancel</button>
      <button class="isim-tweet-post-btn" onclick="window.__isimPostTweet()">Post</button>
    </div>
    <div style="display:flex;padding:14px 16px;gap:12px;flex:1">
      <img id="isim-compose-av" src="" style="width:42px;height:42px;border-radius:21px;flex-shrink:0;object-fit:cover;background:#2f3336" onerror="this.style.background='#2f3336'">
      <textarea id="isim-tweet-area" placeholder="What's happening?" style="flex:1;background:transparent;border:none;color:#e7e9ea;font-size:18px;resize:none;font-family:inherit;line-height:1.4"></textarea>
    </div>
    <div style="padding:12px 16px;border-top:.5px solid #2f3336;display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
      <label style="color:#1d9bf0;cursor:pointer;font-size:15px">Image<input type="file" id="isim-tweet-img-input" accept="image/*" style="display:none" onchange="window.__isimAttachTweetImg(this)"></label>
      <span id="isim-tweet-img-preview" style="font-size:13px;color:#1d9bf0"></span>
    </div>
  </div>
  <div id="isim-tweet-detail">
    <div class="isim-x-header" style="justify-content:flex-start;gap:14px"><button style="background:none;border:none;color:#1d9bf0;font-size:22px;cursor:pointer" onclick="document.getElementById('isim-tweet-detail').classList.remove('show')">‹</button><span style="font-size:17px;font-weight:700;color:#e7e9ea">Post</span></div>
    <div class="isim-tweet-detail-body" id="isim-tweet-detail-body"></div>
    <div class="isim-reply-input-bar"><img id="isim-reply-user-av" src="" style="width:36px;height:36px;border-radius:18px;object-fit:cover;background:#2f3336" onerror="this.style.background='#2f3336'"><input class="isim-reply-inp" id="isim-reply-inp" placeholder="Post your reply"><button class="isim-reply-send-btn" onclick="window.__isimSubmitDetailReply()">Reply</button></div>
  </div>
  <div id="isim-x-notifs-page"><div id="isim-x-notifs-list"></div></div>
  <div class="isim-home-bar" style="background:rgba(255,255,255,.2)"></div>
</div>

<!-- INSTAGRAM -->
<div class="isim-screen" id="isim-scr-instagram" style="background:var(--bg)">
  <div class="isim-nav isim-nav-glass">
    <button class="isim-nav-back" onclick="window.__isimNav('home')">${SVG_BACK}</button>
    <span class="isim-nav-title" style="font-family:serif;font-style:italic;font-size:22px;font-weight:700">Instagram</span>
    <button class="isim-nav-action" onclick="window.__isimIGAddStory()"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg></button>
  </div>
  <div style="flex:1;overflow-y:auto">
    <div id="isim-ig-stories-row" style="display:flex;padding:14px 8px 12px;border-bottom:.5px solid var(--sep);overflow-x:auto;flex-shrink:0"></div>
    <div id="isim-ig-notes-row" style="display:flex;gap:12px;padding:12px 16px;border-bottom:.5px solid var(--sep);overflow-x:auto"></div>
    <div id="isim-ig-feed"></div>
  </div>
  <input type="file" id="isim-ig-story-input" accept="image/*" style="display:none" onchange="window.__isimUploadStory(this)">
  <div class="isim-home-bar"></div>
</div>

<!-- BANK -->
<div class="isim-screen" id="isim-scr-bank">
  <div class="isim-nav"><button class="isim-nav-back" onclick="window.__isimNav('home')">${SVG_BACK}</button><span class="isim-nav-title">KBank</span><button class="isim-nav-action" onclick="window.__isimRefreshBank()"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg></button></div>
  <div style="flex:1;overflow-y:auto">
    <div class="isim-bank-card">
      <div style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px">Account</div>
      <div id="isim-bank-accnum" style="font-size:15px;color:rgba(255,255,255,.7);margin-bottom:16px"></div>
      <div style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:4px">Balance</div>
      <div style="font-size:34px;font-weight:200;color:#fff;letter-spacing:-1px"><span style="font-size:20px;opacity:.7">฿</span><span id="isim-bank-bal"></span></div>
      <div style="display:flex;gap:10px;margin-top:18px">
        <button onclick="window.__isimBankTransfer()" style="flex:1;background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:12px;padding:10px;font-size:14px;font-weight:600;cursor:pointer">Transfer</button>
        <button onclick="window.__isimBankReceive()" style="flex:1;background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:12px;padding:10px;font-size:14px;font-weight:600;cursor:pointer">Receive</button>
      </div>
    </div>
    <div style="padding:16px;font-size:14px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.4px">Transactions</div>
    <div id="isim-tx-list"></div>
  </div>
  <div class="isim-home-bar"></div>
</div>

<!-- SETTINGS -->
<div class="isim-screen" id="isim-scr-settings">
  <div class="isim-nav"><button class="isim-nav-back" onclick="window.__isimNav('home')">${SVG_BACK}</button><span class="isim-nav-title">Settings</span></div>
  <div style="flex:1;overflow-y:auto">
    <div class="isim-set-section"><div class="isim-set-header">Appearance</div><div class="isim-set-group"><div class="isim-set-row"><span class="isim-set-row-label">Dark Mode</span><label class="isim-toggle"><input type="checkbox" id="isim-dark-toggle" onchange="window.__isimToggleDark(this.checked)"><span></span></label></div></div></div>
    <div class="isim-set-section"><div class="isim-set-header">Accent Color</div><div class="isim-set-group"><div class="isim-set-row" style="flex-wrap:wrap;gap:12px">${swatches}</div></div></div>
    <div class="isim-set-section"><div class="isim-set-header">Home Wallpaper</div><div class="isim-set-group"><div class="isim-set-row" style="flex-direction:column;align-items:flex-start;gap:12px;padding:14px 16px"><div style="display:flex;gap:10px;flex-wrap:wrap"><div style="width:52px;height:90px;border-radius:12px;background:linear-gradient(160deg,#000,#060d1a);cursor:pointer;border:1.5px solid var(--sep)" onclick="window.__isimSetHomeWp('')"></div><div style="width:52px;height:90px;border-radius:12px;background:linear-gradient(160deg,#0a0a2a,#1a3a6a);cursor:pointer" onclick="window.__isimSetHomeWp('blue')"></div><div style="width:52px;height:90px;border-radius:12px;background:linear-gradient(160deg,#1a0a2a,#4a1a6a);cursor:pointer" onclick="window.__isimSetHomeWp('purple')"></div><div style="width:52px;height:90px;border-radius:12px;background:linear-gradient(160deg,#0a1a00,#1a3500);cursor:pointer" onclick="window.__isimSetHomeWp('green')"></div><label style="width:52px;height:90px;border-radius:12px;background:var(--bg3);display:flex;align-items:center;justify-content:center;cursor:pointer;border:1.5px dashed var(--sep)"><svg width="24" height="24" viewBox="0 0 24 24" fill="var(--txt3)"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg><input type="file" accept="image/*" style="display:none" onchange="window.__isimUploadHomeWp(this)"></label></div></div></div></div>
    <div class="isim-set-section"><div class="isim-set-header">Data</div><div class="isim-set-group"><div class="isim-set-row" style="cursor:pointer" onclick="window.__isimNav('stickers')"><span class="isim-set-row-label">Manage Stickers</span><span class="isim-set-chevron">›</span></div><div class="isim-set-row" style="cursor:pointer" onclick="window.__isimClearChat()"><span class="isim-set-row-label" style="color:var(--red)">Clear Current Chat</span><span class="isim-set-chevron">›</span></div><div class="isim-set-row" style="cursor:pointer" onclick="window.__isimResetAll()"><span class="isim-set-row-label" style="color:var(--red)">Reset All Data</span><span class="isim-set-chevron">›</span></div></div></div>
    <div style="padding:16px;text-align:center;font-size:12px;color:var(--txt4)">iPhone Simulator v4.0</div>
  </div>
  <div class="isim-home-bar"></div>
</div>

<!-- STORY VIEWER -->
<div id="isim-story-viewer">
  <div id="isim-story-img"></div>
  <div id="isim-story-progress"></div>
  <div class="isim-story-user"><img class="isim-story-user-av" id="isim-story-user-av" src="" alt=""><span class="isim-story-user-nm" id="isim-story-user-nm">Name</span></div>
  <button class="isim-story-close" onclick="window.__isimCloseStory()"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
  <div class="isim-story-text-overlay" id="isim-story-text-overlay"></div>
  <div class="isim-story-reply-bar"><input id="isim-story-reply-inp" placeholder="Reply to story..."><button class="isim-story-send" onclick="window.__isimReplyStory()">${SVG_SEND}</button></div>
</div>
<input type="file" id="isim-story-input" accept="image/*" style="display:none" onchange="window.__isimUploadStory(this)">
<div id="isim-toast"></div>
</div></div>`;
}
// ── Core logic ───────────────────────────────────────────────────────────────
function openPhone(){const el=document.getElementById('isim-phone');if(!el)return;el.classList.add('open');phoneOpen=true;applyTheme();applyAccent();startClock();syncSettings();updateXAvatar();renderHomeWallpaper();}
function closePhone(){const el=document.getElementById('isim-phone');if(!el)return;el.classList.remove('open');phoneOpen=false;}
window.__isimClose=closePhone;

window.__isimNav=function(s){
  if(s==='call-history'){window.__isimShowCallHistory();return;}
  document.querySelectorAll('#isim-screen .isim-screen').forEach(x=>x.classList.remove('show'));
  document.getElementById('isim-home').style.display='none';
  ['isim-story-viewer','isim-call'].forEach(id=>{const e=document.getElementById(id);if(e)e.classList.remove('show');});
  ['isim-call-history','isim-call-transcript'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none';});
  document.getElementById('isim-tweet-detail')?.classList.remove('show');
  document.getElementById('isim-tweet-composer')?.classList.remove('show');
  document.getElementById('isim-x-notifs-page')?.classList.remove('show');
  if(s==='home'){document.getElementById('isim-home').style.display='flex';currentScreen='home';}
  else{const e=document.getElementById('isim-scr-'+s);if(e){e.classList.add('show');currentScreen=s;}
    if(s==='messages')renderMessageList();
    if(s==='chat')renderChat();
    if(s==='friends')window.__isimLoadFriends();
    if(s==='settings')syncSettings();
    if(s==='bank')renderBank();
    if(s==='twitter')renderTwitter();
    if(s==='instagram')renderInstagram();
    if(s==='stickers')renderStickerManager();
  }
  const m=document.getElementById('isim-chat-menu');if(m)m.style.display='none';
};

let clockTick=null;
function startClock(){
  if(clockTick)return;
  function tick(){
    const d=new Date(),h=d.getHours(),m=String(d.getMinutes()).padStart(2,'0'),ts=`${h}:${m}`;
    const e1=document.getElementById('isim-sb-time'),e2=document.getElementById('isim-home-time-big');
    if(e1)e1.textContent=ts;if(e2)e2.textContent=ts;
    const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
    const de=document.getElementById('isim-home-date');
    if(de)de.textContent=`${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  }
  tick();clockTick=setInterval(tick,10000);
}
function applyTheme(){const f=document.getElementById('isim-frame');if(!f)return;const dk=cfg().theme!=='light';f.className=dk?'dark':'light';const t=document.getElementById('isim-dark-toggle');if(t)t.checked=dk;}
function applyAccent(){const a=cfg().accent||'#0a84ff';const f=document.getElementById('isim-frame');if(f)f.style.setProperty('--accent',a);document.querySelectorAll('.isim-swatch').forEach(s=>s.classList.toggle('on',s.dataset.c===a));}
window.__isimToggleDark=function(d){cfg().theme=d?'dark':'light';save();applyTheme();};
window.__isimAccent=function(c){cfg().accent=c;save();applyAccent();toast('Accent updated');};
function syncSettings(){const t=document.getElementById('isim-dark-toggle');if(t)t.checked=cfg().theme!=='light';applyAccent();}
function updateXAvatar(){const av=getUserAvatar();['isim-x-user-av','isim-compose-av','isim-reply-user-av'].forEach(id=>{const e=document.getElementById(id);if(e)e.src=av;});}

function renderHomeWallpaper(){
  const wp=cfg().homeWallpaper||'',el=document.getElementById('isim-home-wallpaper');if(!el)return;
  const p={blue:'linear-gradient(160deg,#0a0a2a,#1a3a6a)',purple:'linear-gradient(160deg,#1a0a2a,#4a1a6a)',green:'linear-gradient(160deg,#0a1a00,#1a3500)'};
  if(!wp){el.style.background='linear-gradient(160deg,#000,#0a0a0f 40%,#060d1a 70%,#000)';el.style.backgroundImage='';}
  else if(p[wp]){el.style.background=p[wp];el.style.backgroundImage='';}
  else{el.style.backgroundImage=`url(${wp})`;el.style.background='';}
}
window.__isimSetHomeWp=function(k){cfg().homeWallpaper=k;save();renderHomeWallpaper();toast('Wallpaper set');};
window.__isimUploadHomeWp=function(i){const f=i.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{cfg().homeWallpaper=e.target.result;save();renderHomeWallpaper();toast('Wallpaper set');};r.readAsDataURL(f);i.value='';};

// ── Stories bar ──
function renderStoriesBar(){
  const bar=document.getElementById('isim-stories-bar');if(!bar)return;
  const stories=(cfg().stories||[]).filter(s=>Date.now()-s.timestamp<86400000);
  const userAv=getUserAvatar(),my=stories.filter(s=>s.isMe);
  let h=my.length
    ?`<div class="isim-story-item" onclick="window.__isimViewMyStory()"><div class="isim-story-ring" style="width:62px;height:62px"><img src="${esc(userAv)}" class="isim-story-av" onerror="this.style.display='none'"></div><span class="isim-story-name">My Story</span></div>`
    :`<div class="isim-story-item" onclick="window.__isimAddMyStory()"><div class="isim-story-ring mine" style="width:62px;height:62px;position:relative"><img src="${esc(userAv)}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;background:var(--bg3)" onerror="this.style.display='none'"><div class="isim-story-add-badge">+</div></div><span class="isim-story-name">My Story</span></div>`;
  [...new Set(stories.filter(s=>!s.isMe).map(s=>s.uid))].forEach(uid=>{
    const f=cfg().friends.find(x=>x.id===uid);if(!f)return;
    h+=`<div class="isim-story-item" onclick="window.__isimViewFriendStory('${esc(uid)}')"><div class="isim-story-ring" style="width:62px;height:62px"><img src="${esc(f.avatar||'')}" class="isim-story-av" onerror="this.style.display='none'"></div><span class="isim-story-name">${esc(f.customName||f.name)}</span></div>`;
  });
  bar.innerHTML=h;
}
function renderNotesBar(){
  const bar=document.getElementById('isim-notes-bar');if(!bar)return;
  const now24=Date.now()-86400000,wn=(cfg().friends||[]).filter(f=>cfg().botnotes[f.id]?.timestamp>now24&&cfg().botnotes[f.id]?.text);
  if(!wn.length){bar.innerHTML='';bar.style.display='none';return;}
  bar.style.display='flex';
  bar.innerHTML=wn.map(f=>{const n=cfg().botnotes[f.id];return`<div class="isim-note-item" onclick="window.__isimViewBotNote('${esc(f.id)}')"><div class="isim-note-av-wrap"><img class="isim-note-av" src="${esc(f.avatar||'')}" onerror="this.style.display='none'"><div class="isim-note-speech">${esc(n.text.substring(0,30))}</div></div><span class="isim-note-label">${esc(f.customName||f.name)}</span></div>`;}).join('');
}

// ── Chat list ──
function renderMessageList(){renderStoriesBar();renderNotesBar();renderChatList();}
function renderChatList(filter=''){
  const list=document.getElementById('isim-chat-list');if(!list)return;
  let friends=cfg().friends||[];
  if(filter)friends=friends.filter(f=>(f.customName||f.name).toLowerCase().includes(filter.toLowerCase()));
  const pinned=cfg().pinnedChats||[];
  friends=[...friends.filter(f=>pinned.includes(f.id)),...friends.filter(f=>!pinned.includes(f.id))];
  if(!friends.length){list.innerHTML='<div style="text-align:center;padding:50px 24px;color:var(--txt4)"><div style="font-size:48px;margin-bottom:12px">💬</div><div style="font-size:15px;font-weight:500">No contacts yet</div><div style="font-size:13px;margin-top:6px">Tap + to add a character</div></div>';return;}
  list.innerHTML=friends.map(f=>{
    const hist=cfg().history[f.id]||[];
    const last=hist.filter(m=>m.type!=='callnote')[hist.length-1];
    const lt=last?(last.type==='sticker'?'Sticker':last.type==='photo'?'Photo':last.type==='voice'?'Voice message':(last.content||'').substring(0,40)):'Tap to chat';
    const lts=last?fmtDate(last.ts||0):'';
    const ip=pinned.includes(f.id);
    const hs=(cfg().stories||[]).some(s=>s.uid===f.id&&!s.isMe&&Date.now()-s.timestamp<86400000);
    return`<div class="isim-chat-row" onclick="window.__isimOpenChat('${esc(f.id)}')" oncontextmenu="event.preventDefault();window.__isimChatLP('${esc(f.id)}')"><div class="isim-chat-av-wrap"><img class="isim-chat-av" src="${esc(f.avatar||'')}" onerror="this.style.background='var(--bg4)'">${hs?`<div style="position:absolute;inset:-2px;border-radius:50%;border:2px solid var(--accent);pointer-events:none"></div>`:''}</div><div class="isim-chat-meta"><div class="isim-chat-top"><span class="isim-chat-nm">${esc(f.customName||f.name)}</span><span class="isim-chat-time">${esc(lts)}</span></div><div class="isim-chat-preview">${esc(lt)}</div></div>${ip?'<span style="font-size:13px;color:var(--txt4)">📌</span>':''}</div>`;
  }).join('');
}
window.__isimFilterMessages=q=>renderChatList(q);
window.__isimOpenChat=function(id){const f=cfg().friends.find(f=>f.id===id);if(!f)return;activeFriend=f;pendingMessages=[];window.__isimNav('chat');};
window.__isimChatLP=function(id){
  const pinned=cfg().pinnedChats||[],ip=pinned.includes(id),f=cfg().friends.find(f=>f.id===id);if(!f)return;
  if(!confirm(`${f.customName||f.name}\n\n${ip?'Unpin':'Pin'} chat?`))return;
  if(ip)cfg().pinnedChats=pinned.filter(p=>p!==id);else{if(!cfg().pinnedChats)cfg().pinnedChats=[];cfg().pinnedChats.push(id);}
  save();renderChatList();toast(ip?'Unpinned':'Pinned');
};

// ── Chat render ──
function renderChat(){
  const f=activeFriend;if(!f){window.__isimNav('messages');return;}
  const t=document.getElementById('isim-chat-title'),av=document.getElementById('isim-chat-hdr-av');
  if(t)t.textContent=f.customName||f.name;
  if(av){av.src=f.avatar||'';av.onerror=()=>av.style.background='var(--bg4)';}
  const ht=document.getElementById('isim-hist-toggle');if(ht)ht.checked=cfg().historyEnabled[f.id]!==false;
  const st=document.getElementById('isim-chat-settings');if(st)st.style.display='none';
  const ta=document.getElementById('isim-noteta');if(ta)ta.value=cfg().notes[f.id]||'';
  const ni=document.getElementById('isim-char-name-input');if(ni)ni.value=f.customName||'';
  const hl=document.getElementById('isim-history-limit');if(hl)hl.value=cfg().historyLimit||50;
  applyWallpaper();loadHistory(f.id);
  const sel=document.getElementById('isim-redenv-to');
  if(sel){sel.innerHTML='<option value="">Current chat</option>';(cfg().friends||[]).forEach(fr=>{const o=document.createElement('option');o.value=fr.id;o.textContent=fr.customName||fr.name;sel.appendChild(o);});}
}
window.__isimToggleChatSettings=function(){const p=document.getElementById('isim-chat-settings');if(!p)return;const v=p.style.display==='flex';p.style.display=v?'none':'flex';p.style.flexDirection='column';document.getElementById('isim-plussheet')?.classList.remove('show');document.getElementById('isim-sticker-tray')?.classList.remove('show');};
window.__isimToggleMenu=function(){const m=document.getElementById('isim-chat-menu');if(!m)return;m.style.display=m.style.display==='flex'?'none':'flex';m.style.flexDirection='column';};
window.__isimToggleHistory=function(e){if(!activeFriend)return;if(!cfg().historyEnabled)cfg().historyEnabled={};cfg().historyEnabled[activeFriend.id]=e;save();toast(e?'History on':'History off');};
window.__isimSaveHistoryLimit=function(){const i=document.getElementById('isim-history-limit');cfg().historyLimit=Math.max(5,Math.min(500,parseInt(i?.value)||50));save();if(activeFriend)loadHistory(activeFriend.id);toast(`Last ${cfg().historyLimit} msgs`);};
window.__isimSaveCharName=function(){if(!activeFriend)return;const i=document.getElementById('isim-char-name-input'),n=i?.value.trim();if(!n)return;activeFriend.customName=n;const f=cfg().friends.find(f=>f.id===activeFriend.id);if(f){f.customName=n;save();}const t=document.getElementById('isim-chat-title');if(t)t.textContent=n;toast(`Name: "${n}"`);};
window.__isimSetChatWp=function(k){const fid=activeFriend?.id;if(!fid)return;const g={g1:'linear-gradient(160deg,#0d0d1a,#0a1628)',g2:'linear-gradient(160deg,#0d2137,#1a4c7a)',g3:'linear-gradient(160deg,#2d0036,#4a0a6b)',g4:'linear-gradient(160deg,#0a1a00,#1a3500)'};if(!cfg().wallpapers)cfg().wallpapers={};cfg().wallpapers[fid]=k?g[k]||'':'';save();applyWallpaper();toast('Background set');};
window.__isimUploadWp=function(i){const f=i.files[0];if(!f||!activeFriend)return;const r=new FileReader();r.onload=e=>{if(!cfg().wallpapers)cfg().wallpapers={};cfg().wallpapers[activeFriend.id]=`url(${e.target.result})`;save();applyWallpaper();toast('Background set');};r.readAsDataURL(f);i.value='';};
function applyWallpaper(){const m=document.getElementById('isim-msgs');if(!m||!activeFriend)return;const wp=(cfg().wallpapers||{})[activeFriend.id]||'';if(!wp){m.style.background='';m.style.backgroundImage='';return;}if(wp.startsWith('linear-gradient'))m.style.background=wp;else{m.style.backgroundImage=wp;m.style.backgroundSize='cover';}}

// ── History ──
function loadHistory(fid){
  const msgs=document.getElementById('isim-msgs');if(!msgs)return;msgs.innerHTML='';
  const all=cfg().history[fid]||[],limit=cfg().historyLimit||50,hist=all.slice(-limit),offset=all.length-hist.length;
  if(!all.length){msgs.innerHTML='<div class="isim-sys">Start chatting</div>';return;}
  if(offset>0){const n=document.createElement('div');n.className='isim-sys';n.textContent=`${offset} older messages hidden`;msgs.appendChild(n);}
  hist.forEach((m,i)=>appendBubble(m,false,offset+i));
  msgs.scrollTop=msgs.scrollHeight;
}
function appendBubble(msg,scroll=true,idx){
  const msgs=document.getElementById('isim-msgs');if(!msgs||!msg)return;
  if(msg.type==='callnote'){const el=document.createElement('div');el.className='isim-sys';el.textContent=msg.content;msgs.appendChild(el);if(scroll)msgs.scrollTop=msgs.scrollHeight;return;}
  if(!activeFriend)return;
  const dir=msg.from==='user'?'out':'in';
  const avSrc=dir==='in'?(activeFriend.avatar||''):getUserAvatar();
  const av=`<img class="isim-av" src="${esc(avSrc)}" alt="" onerror="this.style.background='var(--bg4)'" ${dir==='out'&&!editModeActive?'style="display:none"':''}>`;
  let inner='';
  if(msg.type==='sticker')inner=`<img src="${esc(msg.content)}" style="max-width:100px;max-height:100px;border-radius:12px;display:block">`;
  else if(msg.type==='photo')inner=`<img src="${esc(msg.content)}" style="max-width:200px;border-radius:14px;display:block">`;
  else if(msg.type==='location')inner=`<div class="isim-loc-bub"><div class="isim-loc-map"><div style="position:relative;z-index:1;font-size:28px">📍</div></div><div style="padding:9px 12px;font-size:13px;font-weight:600;color:var(--txt)">${esc(msg.content)}</div><div style="padding:0 12px 10px;font-size:11px;color:var(--txt3)">Shared Location</div></div>`;
  else if(msg.type==='redenv'){const c=msg.content;inner=`<div class="isim-redenv-bub"><div style="font-size:36px">🧧</div><div style="font-size:20px;font-weight:700;color:#ffd700">฿${esc(c.amount)}</div>${c.note?`<div style="font-size:12px;color:rgba(255,255,255,.75)">"${esc(c.note)}"</div>`:''}</div>`;}
  else if(msg.type==='voice'){const bars=Array.from({length:8},(_,i)=>{const h=6+Math.floor(Math.sin(i*.7+1)*8)+4;return`<span style="width:3px;height:${h}px;background:currentColor;border-radius:2px;opacity:.6"></span>`;}).join('');inner=`<div class="isim-voice-bub"><button onclick="window.__isimPlayVoice(this)" style="width:34px;height:34px;border-radius:17px;border:none;background:rgba(255,255,255,.15);color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button><div style="display:flex;align-items:center;gap:2px;flex:1">${bars}</div><span style="font-size:11px;opacity:.6;flex-shrink:0">${msg.duration||0}s</span></div>`;}
  else inner=esc(msg.content||'');
  const del=idx!==undefined?`<button class="isim-del-btn" onclick="window.__isimDeleteMsg(${idx})"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>`:'';
  const el=document.createElement('div');
  el.className=`isim-row ${dir} isim-bounce ${editModeActive?'edit-active':''}`;
  if(idx!==undefined)el.dataset.idx=idx;
  el.innerHTML=dir==='in'?`${av}<div class="isim-wrap"><div class="isim-bub">${inner}</div><span class="isim-time">${esc(msg.time||'')}</span></div>${del}`:`${del}<div class="isim-wrap"><div class="isim-bub">${inner}</div><span class="isim-time">${esc(msg.time||'')}</span></div>${av}`;
  msgs.appendChild(el);
  if(scroll)msgs.scrollTop=msgs.scrollHeight;
}
function saveMsg(msg){const fid=activeFriend?.id;if(!fid)return;if(!cfg().history[fid])cfg().history[fid]=[];msg.ts=Date.now();cfg().history[fid].push(msg);if(cfg().history[fid].length>200)cfg().history[fid]=cfg().history[fid].slice(-200);save();}

window.__isimToggleEditMode=function(){editModeActive=!editModeActive;const fid=activeFriend?.id;if(fid)loadHistory(fid);toast(editModeActive?'Edit mode on':'Edit mode off');};
window.__isimDeleteMsg=function(idx){const fid=activeFriend?.id;if(!fid)return;const h=cfg().history[fid];if(!h||idx<0||idx>=h.length)return;h.splice(idx,1);save();loadHistory(fid);toast('Deleted');};
window.__isimInsertNewline=function(){const i=document.getElementById('isim-input');if(!i)return;const p=i.selectionStart;i.value=i.value.substring(0,p)+'\n'+i.value.substring(p);i.selectionStart=i.selectionEnd=p+1;i.style.height='auto';i.style.height=Math.min(i.scrollHeight,90)+'px';i.focus();};

// ── Send / Generate ──
window.__isimSend=function(){if(!activeFriend){toast('Select a contact');return;}const i=document.getElementById('isim-input'),t=i.value.trim();if(!t)return;i.value='';i.style.height='auto';const idx=(cfg().history[activeFriend.id]||[]).length,msg={from:'user',content:t,time:now()};saveMsg(msg);appendBubble(msg,true,idx);pendingMessages.push(msg);};
window.__isimNudge=async function(){if(!activeFriend){toast('Select a contact');return;}if(isTyping){toast('Generating...');return;}await botReply();};
window.__isimCancelBot=function(){if(!isTyping)return;isTyping=false;document.getElementById('isim-typing-row')?.remove();document.getElementById('isim-cancelbtn').style.display='none';document.getElementById('isim-sendbtn').disabled=false;toast('Cancelled');};

async function botReply(){
  if(!activeFriend||isTyping)return;
  isTyping=true;
  const cb=document.getElementById('isim-cancelbtn'),sb=document.getElementById('isim-sendbtn');
  if(cb)cb.style.display='flex';if(sb)sb.disabled=true;
  const msgs=document.getElementById('isim-msgs');
  const tr=document.createElement('div');tr.className='isim-row in';tr.id='isim-typing-row';
  tr.innerHTML=`<img class="isim-av" src="${esc(activeFriend.avatar||'')}" onerror="this.style.background='var(--bg4)'"><div class="isim-typing"><span></span><span></span><span></span></div>`;
  if(msgs){msgs.appendChild(tr);msgs.scrollTop=msgs.scrollHeight;}
  try{
    const f=activeFriend,s=cfg();
    let ctx;try{ctx=SillyTavern.getContext();}catch{ctx=null;}
    const pn=getUserName(),he=s.historyEnabled[f.id]!==false;
    let histTxt='';
    if(he){
      const h=(s.history[f.id]||[]).slice(-14);
      histTxt=h.map(m=>{const w=m.from==='user'?pn:(f.customName||f.name);if(m.type==='sticker')return`${w}: [Sticker]`;if(m.type==='photo')return`${w}: [Photo]`;if(m.type==='location')return`${w}: [Location: ${m.content}]`;if(m.type==='redenv')return`${w}: [Gift ฿${m.content?.amount}]`;if(m.type==='voice')return`${w}: [Voice]`;return`${w}: ${m.content||''}`;}).join('\n');
    }
    const dn=f.customName||f.name;
    const bn=s.botnotes[f.id],vbn=bn&&Date.now()-bn.timestamp<86400000?bn.text:'';
    const un=s.notes[f.id]||'';
    const sl=(s.stickers||[]).slice(0,5).map((st,i)=>`[STICKER:${i}]=${st.meaning||'sticker'}`).join(', ');
    const sc=(s.stories||[]).filter(st=>st.isMe&&Date.now()-st.timestamp<86400000).map(st=>st.imageMeaning?`${pn}'s story: "${st.imageMeaning}"`:null).filter(Boolean).join('. ');
    const ctx_note=[
      `[iPhone Messages — ${dn} texting ${pn}]`,
      un?`About ${pn}: "${un}"`:null,
      vbn?`${dn}'s note: "${vbn}"`:null,
      sc||null,
      he&&histTxt?`\n<history>\n${histTxt}\n</history>`:null,
      `\nINSTRUCTIONS: Reply as ${dn} in character. Short natural texts (1-3 msgs). Match language. No asterisks. No name prefix. No CoT/think tags. No [PHASE]/[STEP]/[MSG] tags. Plain reply only.`,
      sl?`Optional stickers: ${sl} — put [STICKER:N] alone on a line`:null,
      `Optional: [STICKER_EMOJI:emoji]  [LOCATION:place]  [REDENV:amount:msg]  [VOICE:secs]  [NOTE:text]  [STORY:description]`,
    ].filter(x=>x!==null).join('\n');
    try{if(ctx&&typeof ctx.setExtensionPrompt==='function')ctx.setExtensionPrompt('iphone-sim',ctx_note,1,0,false,1);}catch(_){}
    let raw='';
    if(ctx&&typeof ctx.generateQuietPrompt==='function')raw=await ctx.generateQuietPrompt('',false,false);
    else if(typeof window.generateQuietPrompt==='function')raw=await window.generateQuietPrompt('',false,false);
    else throw new Error('No generateQuietPrompt');
    try{if(ctx&&typeof ctx.setExtensionPrompt==='function')ctx.setExtensionPrompt('iphone-sim','',1,0,false,1);}catch(_){}

    // ── Aggressive CoT / junk cleanup ──
    raw=cleanThink(raw).trim();
    const nrx=new RegExp('^'+dn.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*:\\s*','gim');
    raw=raw.replace(nrx,'');
    // Remove known CoT block patterns
    raw=raw.replace(/\[(?:CoT|COT|HELIOS[^\]]*|PHASE[^\]]*|STEP[^\]]*|THINK[^\]]*|CONTEXT[^\]]*|PERSONA[^\]]*|SYSTEM[^\]]*|CHAIN[^\]]*|DATA[^\]]*|SCAN[^\]]*|STARTER[^\]]*|IDENTIFY[^\]]*|TEMPORAL[^\]]*|TONE[^\]]*|DRAFT[^\]]*|TARGET[^\]]*)\][^\n]*/gi,'');
    raw=raw.replace(/\/\/--[^\n]*--\/\//g,'').replace(/\/\/--[^\n]*/g,'');
    raw=raw.replace(/\{[A-Z][A-Z_]*\}/g,'');
    raw=raw.replace(/^[-*>]\s+/gm,'').replace(/^\d+\.\s+/gm,'');
    // Handle [NOTE:]
    for(const nm of[...raw.matchAll(/\[NOTE:([^\]]+)\]/gi)]){cfg().botnotes[f.id]={text:nm[1].trim(),timestamp:Date.now()};save();renderNotesBar();toast(`${dn} posted a note`);}
    raw=raw.replace(/\[NOTE:[^\]]+\]/gi,'').trim();
    // Handle [STORY:]
    const sm=raw.match(/\[STORY:([^\]]+)\]/i);if(sm)botPostStory(f.id,sm[1].trim());
    raw=raw.replace(/\[STORY:[^\]]+\]/gi,'').trim();

    // Parse lines into message parts
    const lines=raw.split(/\n/).map(l=>l.trim().replace(/^\[MSG\]\s*/i,'').replace(nrx,'').replace(/^["'\u201c\u201d\u2018\u2019]|["'\u201c\u201d\u2018\u2019]$/g,'').trim()).filter(l=>l);
    let parts=[];
    for(const line of lines){
      if(/^\[STICKER:(\d+)\]/i.test(line)){const si=parseInt(line.match(/\d+/)[0]);const stk=(s.stickers||[])[si];parts.push(stk?{type:'sticker_img',src:stk.src}:{type:'text',content:'*'});}
      else if(/^\[STICKER_EMOJI:(.+)\]/i.test(line))parts.push({type:'text',content:line.match(/^\[STICKER_EMOJI:(.+)\]/i)[1]});
      else if(/^\[LOCATION:(.+)\]/i.test(line))parts.push({type:'location',content:line.match(/^\[LOCATION:(.+)\]/i)[1].trim()});
      else if(/^\[REDENV:([^:\]]+):?([^\]]*)?\]/i.test(line)){const m2=line.match(/^\[REDENV:([^:\]]+):?([^\]]*)?\]/i);parts.push({type:'redenv',amount:m2[1].trim(),note:(m2[2]||'').trim()});}
      else if(/^\[VOICE:(\d+)\]/i.test(line))parts.push({type:'voice',duration:parseInt(line.match(/\d+/)[0])||3});
      else if(!/^\[[A-Z_]+[:\]]/i.test(line)){const c=line.replace(/^\[[A-Z_]+\]\s*/,'').trim();if(c)parts.push({type:'text',content:c});}
    }
    if(!parts.length&&raw){const cl=raw.replace(/\[[A-Z_]+:[^\]]*\]/gi,'').trim();if(cl)(cl.match(/[^\n.!?]+[\n.!?]?/g)||[cl]).slice(0,3).forEach(x=>{const t=x.trim();if(t)parts.push({type:'text',content:t});});}
    if(!parts.length)parts.push({type:'text',content:raw.split('\n')[0].trim()||'...'});

    for(let i=0;i<parts.length;i++){
      if(i>0){const t2=document.createElement('div');t2.className='isim-row in';t2.id='isim-typing-row';t2.innerHTML=`<img class="isim-av" src="${esc(f.avatar||'')}" onerror="this.style.background='var(--bg4)'"><div class="isim-typing"><span></span><span></span><span></span></div>`;if(msgs){msgs.appendChild(t2);msgs.scrollTop=msgs.scrollHeight;}await new Promise(r=>setTimeout(r,600+Math.random()*400));t2.remove();}
      const p=parts[i],hi=(cfg().history[f.id]||[]).length;
      let bm;
      if(p.type==='text')bm={from:'bot',content:p.content,time:now()};
      else if(p.type==='sticker_img')bm={from:'bot',type:'sticker',content:p.src,time:now()};
      else if(p.type==='location')bm={from:'bot',type:'location',content:p.content,time:now()};
      else if(p.type==='redenv')bm={from:'bot',type:'redenv',content:{amount:p.amount,note:p.note},time:now()};
      else if(p.type==='voice')bm={from:'bot',type:'voice',duration:p.duration,content:'',time:now()};
      else bm={from:'bot',content:p.content||'...',time:now()};
      saveMsg(bm);document.getElementById('isim-typing-row')?.remove();appendBubble(bm,true,hi);
    }
    showNotif(dn,parts.find(p=>p.type==='text')?.content?.substring(0,60)||'New message',f.avatar);
  }catch(e){
    document.getElementById('isim-typing-row')?.remove();
    const fid=activeFriend?.id;if(fid){const hi=(cfg().history[fid]||[]).length;const em={from:'bot',content:'(Generation failed — check SillyTavern)',time:now()};saveMsg(em);appendBubble(em,true,hi);}
  }finally{isTyping=false;if(cb)cb.style.display='none';if(sb)sb.disabled=false;}
}

// ── Bot Note ──
window.__isimSetBotNotePrompt=function(){if(!activeFriend||isTyping)return;botReplyNote();};
async function botReplyNote(){
  if(!activeFriend||isTyping)return;const f=activeFriend;isTyping=true;
  const msgs=document.getElementById('isim-msgs'),tr=document.createElement('div');tr.className='isim-row in';tr.id='isim-typing-row';
  tr.innerHTML=`<img class="isim-av" src="${esc(f.avatar||'')}" onerror="this.style.background='var(--bg4)'"><div class="isim-typing"><span></span><span></span><span></span></div>`;
  if(msgs){msgs.appendChild(tr);msgs.scrollTop=msgs.scrollHeight;}
  try{
    const pn=getUserName(),h=(cfg().history[f.id]||[]).slice(-5).map(m=>(m.from==='user'?pn:f.name)+': '+(m.content||'')).join('\n');
    const p=`You are ${f.name}. ${f.persona||''}\nWrite a short note/status (max 20 words) based on context:\n${h}\nWrite ONLY the note text. No quotes, no tags.`;
    let ctx;try{ctx=SillyTavern.getContext();}catch{ctx=null;}
    let reply='';
    if(ctx&&typeof ctx.generateQuietPrompt==='function')reply=await ctx.generateQuietPrompt(p,false,false);
    else if(typeof window.generateQuietPrompt==='function')reply=await window.generateQuietPrompt(p,false,false);
    reply=cleanThink(String(reply||'').trim()).replace(/\[[A-Z_]+:[^\]]*\]/g,'').replace(/^["'\u201c\u201d\u2018\u2019]|["'\u201c\u201d\u2018\u2019]$/g,'').trim().split('\n')[0].trim();
    if(reply){cfg().botnotes[f.id]={text:reply,timestamp:Date.now()};save();renderNotesBar();showNotif(f.customName||f.name,'Note: '+reply,f.avatar);toast(`${f.customName||f.name} posted a note`);}
  }catch{}
  tr.remove();isTyping=false;
}
window.__isimViewBotNote=function(id){const f=cfg().friends.find(f=>f.id===id),n=cfg().botnotes[id];if(!f||!n)return;alert(`Note from ${f.customName||f.name}:\n\n"${n.text}"\n\n(${fmtDate(n.timestamp)})`);};
// ── Plus / Stickers / Media ──────────────────────────────────────────────────
window.__isimTogglePlus=function(){const s=document.getElementById('isim-plussheet');if(!s)return;const o=s.classList.toggle('show');if(o){document.getElementById('isim-sticker-tray')?.classList.remove('show');document.getElementById('isim-chat-settings').style.display='none';}};
window.__isimToggleStickerTray=function(){const t=document.getElementById('isim-sticker-tray');if(!t)return;if(t.classList.toggle('show')){renderStickerTray();document.getElementById('isim-plussheet')?.classList.remove('show');}};
function renderStickerTray(){const g=document.getElementById('isim-sticker-grid');if(!g)return;const st=cfg().stickers||[];if(!st.length){g.innerHTML='<div style="padding:16px;text-align:center;color:var(--txt4);font-size:13px">No stickers — tap Add</div>';return;}g.innerHTML=st.map((s,i)=>`<div class="isim-sticker-slot" onclick="window.__isimSendSticker(${i})"><img src="${esc(s.src||s)}" title="${esc(s.meaning||'')}" onerror="this.style.display='none'"></div>`).join('');}
window.__isimSendSticker=function(idx){if(!activeFriend)return;const st=cfg().stickers||[],s=st[idx];if(!s)return;document.getElementById('isim-sticker-tray')?.classList.remove('show');const hi=(cfg().history[activeFriend.id]||[]).length,msg={from:'user',type:'sticker',content:s.src||s,time:now()};saveMsg(msg);appendBubble(msg,true,hi);pendingMessages.push(msg);};
window.__isimAddSticker=async function(input){const f=input.files[0];if(!f)return;const ld=document.getElementById('isim-img-loading');if(ld)ld.classList.add('show');const r=new FileReader();r.onload=async e=>{const m=await describeImage(e.target.result);if(!cfg().stickers)cfg().stickers=[];cfg().stickers.push({src:e.target.result,meaning:m});save();if(ld)ld.classList.remove('show');toast('Sticker added');renderStickerTray();};r.readAsDataURL(f);input.value='';};
window.__isimSendPhoto=function(input){const f=input.files[0];if(!f||!activeFriend)return;const r=new FileReader();r.onload=e=>{const hi=(cfg().history[activeFriend.id]||[]).length,msg={from:'user',type:'photo',content:e.target.result,time:now()};saveMsg(msg);appendBubble(msg,true,hi);pendingMessages.push(msg);document.getElementById('isim-plussheet')?.classList.remove('show');};r.readAsDataURL(f);input.value='';};
window.__isimSendLocationPrompt=function(){document.getElementById('isim-plussheet')?.classList.remove('show');if(!activeFriend)return;const n=prompt('Enter location name:');if(!n)return;const hi=(cfg().history[activeFriend.id]||[]).length,msg={from:'user',type:'location',content:n.trim(),time:now()};saveMsg(msg);appendBubble(msg,true,hi);pendingMessages.push(msg);toast('Location shared');};
window.__isimOpenRedEnvelope=function(){document.getElementById('isim-plussheet')?.classList.remove('show');document.getElementById('isim-redenv-sheet')?.classList.add('show');};
window.__isimCloseRedEnvelope=function(){document.getElementById('isim-redenv-sheet')?.classList.remove('show');};
window.__isimSendRedEnvelope=function(){
  const amt=document.getElementById('isim-redenv-amount')?.value,note=document.getElementById('isim-redenv-note')?.value,toSel=document.getElementById('isim-redenv-to')?.value;
  if(!amt||Number(amt)<=0){toast('Enter amount');return;}
  let tf=activeFriend;if(toSel){const x=cfg().friends.find(f=>f.id===toSel);if(x)tf=x;}if(!tf)return;
  document.getElementById('isim-redenv-sheet')?.classList.remove('show');
  document.getElementById('isim-redenv-amount').value='';document.getElementById('isim-redenv-note').value='';
  const prev=activeFriend;activeFriend=tf;const hi=(cfg().history[tf.id]||[]).length,msg={from:'user',type:'redenv',content:{amount:amt,note},time:now()};saveMsg(msg);appendBubble(msg,true,hi);pendingMessages.push(msg);activeFriend=prev;
  cfg().bank.transactions.unshift({type:'send',amount:Number(amt),to:tf.customName||tf.name,note:note||'Gift',date:Date.now()});cfg().bank.balance-=Number(amt);save();toast(`Sent Gift ฿${amt}`);
};
// Voice
let mediaRecorder=null,voiceChunks=[],voiceRecording=false;
window.__isimVoiceRecord=function(){document.getElementById('isim-plussheet')?.classList.remove('show');if(voiceRecording){if(mediaRecorder&&mediaRecorder.state!=='inactive')mediaRecorder.stop();voiceRecording=false;return;}if(!navigator.mediaDevices?.getUserMedia){_fakevoice();return;}navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{voiceChunks=[];mediaRecorder=new MediaRecorder(stream);mediaRecorder.ondataavailable=e=>voiceChunks.push(e.data);mediaRecorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const url=URL.createObjectURL(new Blob(voiceChunks,{type:'audio/webm'}));_sendvoice(url,Math.floor(Math.random()*8)+2);};mediaRecorder.start();voiceRecording=true;toast('Recording… tap Voice again to stop');}).catch(()=>_fakevoice());};
function _fakevoice(){if(!activeFriend)return;_sendvoice(null,Math.floor(Math.random()*8)+2);}
function _sendvoice(url,dur){if(!activeFriend)return;const hi=(cfg().history[activeFriend.id]||[]).length,msg={from:'user',type:'voice',content:url||'',duration:dur,time:now()};saveMsg(msg);appendBubble(msg,true,hi);pendingMessages.push(msg);toast(`Voice sent (${dur}s)`);}
window.__isimPlayVoice=function(btn){btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';setTimeout(()=>{btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';},2500);toast('Playing…');};
window.__isimToggleNote=function(){document.getElementById('isim-notepanel')?.classList.toggle('show');};
window.__isimSaveNote=function(){const fid=activeFriend?.id;if(!fid)return;cfg().notes[fid]=document.getElementById('isim-noteta')?.value.trim()||'';save();document.getElementById('isim-notepanel')?.classList.remove('show');toast('Note saved');};
// Sticker manager
function renderStickerManager(){const g=document.getElementById('isim-sticker-mgr-grid');if(!g)return;const st=cfg().stickers||[];if(!st.length){g.innerHTML='<div style="color:var(--txt4);font-size:13px;padding:16px">No stickers. Press Add.</div>';return;}g.innerHTML=st.map((s,i)=>`<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="position:relative;width:80px;height:80px;border-radius:16px;overflow:hidden;background:var(--bg3)"><img src="${esc(s.src||s)}" style="width:100%;height:100%;object-fit:contain;padding:4px;box-sizing:border-box" onerror="this.style.display='none'"><button onclick="window.__isimDelSticker(${i})" style="position:absolute;top:2px;right:2px;width:22px;height:22px;border-radius:11px;background:rgba(255,69,58,.9);border:none;color:#fff;font-size:12px;cursor:pointer">✕</button></div><div style="font-size:10px;color:var(--txt3);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center">${esc((s.meaning||'').substring(0,18))}</div></div>`).join('');}
window.__isimDelSticker=function(i){(cfg().stickers||[]).splice(i,1);save();renderStickerManager();renderStickerTray();toast('Removed');};
window.__isimAddStickerMgr=async function(input){const f=input.files[0];if(!f)return;const r=new FileReader();r.onload=async e=>{const m=await describeImage(e.target.result);if(!cfg().stickers)cfg().stickers=[];cfg().stickers.push({src:e.target.result,meaning:m});save();renderStickerManager();toast('Sticker added');};r.readAsDataURL(f);input.value='';};
// ── Call system ──────────────────────────────────────────────────────────────
window.__isimStartCall=function(){
  if(!activeFriend){toast('Select a contact');return;}
  const f=activeFriend;
  const bg=document.getElementById('isim-call-bg');if(bg&&f.avatar)bg.style.backgroundImage=`url(${f.avatar})`;
  document.getElementById('isim-call-av').src=f.avatar||'';
  document.getElementById('isim-call-name').textContent=f.customName||f.name;
  document.getElementById('isim-call-stat').textContent='Calling…';
  document.getElementById('isim-call-dur').textContent='0:00';
  document.getElementById('isim-call-float').innerHTML='';
  document.getElementById('isim-call').classList.add('show');
  callStartTime=new Date();currentCallTranscript=[];callActive=true;callTimer=0;
  const se=document.getElementById('isim-call-started-at');if(se)se.textContent='Called at '+callStartTime.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
  const bn=document.getElementById('isim-call-bot-name-typing');if(bn)bn.textContent=`${f.customName||f.name} is speaking…`;
  setTimeout(()=>{
    if(!callActive)return;
    const dn=activeFriend?.customName||activeFriend?.name||'Bot';
    document.getElementById('isim-call-stat').textContent=`${dn} answered`;
    callInterval=setInterval(()=>{callTimer++;const m=Math.floor(callTimer/60),s=callTimer%60;document.getElementById('isim-call-dur').textContent=`${m}:${String(s).padStart(2,'0')}`;},1000);
    const gr=`${dn} answered the call`;showCallFloat(gr);currentCallTranscript.push({who:dn,text:gr});
  },1500);
};
window.__isimEndCall=function(){
  if(!callActive)return;callActive=false;clearInterval(callInterval);
  const f=activeFriend,dn=f?.customName||f?.name||'Unknown',m=Math.floor(callTimer/60),s=callTimer%60,dt=`${m}:${String(s).padStart(2,'0')}`;
  if(!cfg().callLog)cfg().callLog=[];
  cfg().callLog.unshift({name:dn,avatar:f?.avatar||'',startTime:callStartTime?callStartTime.toISOString():new Date().toISOString(),duration:callTimer,durText:dt,transcript:[...currentCallTranscript]});
  if(cfg().callLog.length>50)cfg().callLog=cfg().callLog.slice(0,50);save();
  document.getElementById('isim-call').classList.remove('show');toast(`Call ended · ${dt}`);
  if(f&&activeFriend?.id===f.id){const h=cfg().history[f.id]||[];h.push({from:'system',content:`Call with ${dn} · ${dt} · ${callStartTime?callStartTime.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'}):''}`,time:now(),type:'callnote'});cfg().history[f.id]=h;save();loadHistory(f.id);}
  currentCallTranscript=[];
};
window.__isimMute=function(){callMuted=!callMuted;document.getElementById('isim-mute-circle')?.classList.toggle('on',callMuted);toast(callMuted?'Muted':'Unmuted');};
window.__isimCallSend=async function(){const i=document.getElementById('isim-call-inp'),t=i?.value.trim();if(!t||!activeFriend)return;i.value='';document.getElementById('isim-call-send-btn')?.classList.remove('show');showCallFloat(t,true);currentCallTranscript.push({who:getUserName(),text:t});await callBotReply(t);};
window.__isimCallGen=async function(){if(activeFriend)await callBotReply('');};
async function callBotReply(ut){
  const f=activeFriend;if(!f)return;
  const ti=document.getElementById('isim-call-typing-indicator');if(ti){ti.style.display='block';}
  try{
    let ctx;try{ctx=SillyTavern.getContext();}catch{ctx=null;}
    const ch=(cfg().history[f.id]||[]).slice(-6).map(m=>(m.from==='user'?getUserName():f.name)+': '+(m.content||'')).join('\n');
    const cp=[`[Phone Call — ${f.customName||f.name} talking with ${getUserName()}]`,ch?`Recent:\n${ch}`:'',ut?`${getUserName()} said: "${ut}"`:'Continue naturally.',`Reply as ${f.customName||f.name} in 1-2 natural sentences. Match language. No tags. No name prefix.`].filter(Boolean).join('\n');
    try{if(ctx&&typeof ctx.setExtensionPrompt==='function')ctx.setExtensionPrompt('isim-call',cp,1,0,false,1);}catch(_){}
    let reply='';
    if(ctx&&typeof ctx.generateQuietPrompt==='function')reply=await ctx.generateQuietPrompt('',false,false);
    else if(typeof window.generateQuietPrompt==='function')reply=await window.generateQuietPrompt('',false,false);
    try{if(ctx&&typeof ctx.setExtensionPrompt==='function')ctx.setExtensionPrompt('isim-call','',1,0,false,1);}catch(_){}
    reply=cleanThink(String(reply||'').trim()).replace(new RegExp('^'+(f.customName||f.name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*:\\s*','i'),'').replace(/\[[A-Z_]+:[^\]]*\]/g,'').replace(/^\[MSG\]\s*/i,'').replace(/^["'\u201c\u201d\u2018\u2019]|["'\u201c\u201d\u2018\u2019]$/g,'').trim().split('\n')[0].trim()||'…';
    if(ti)ti.style.display='none';
    if(callActive){showCallFloat(reply);currentCallTranscript.push({who:f.customName||f.name,text:reply});}
  }catch{if(ti)ti.style.display='none';if(callActive)showCallFloat('…');}
}
function showCallFloat(text,isUser=false){
  const c=document.getElementById('isim-call-float');if(!c)return;
  const msg=document.createElement('div');
  msg.style.cssText=`font-size:15px;line-height:1.5;padding:8px 12px;border-radius:14px;max-width:100%;word-break:break-word;animation:fadeUp .3s ease forwards;${isUser?'align-self:flex-end;background:rgba(10,132,255,.3);color:rgba(255,255,255,.9);text-align:right':'align-self:flex-start;background:rgba(255,255,255,.1);color:#fff'}`;
  msg.textContent=text;c.appendChild(msg);c.scrollTop=c.scrollHeight;
  if(callActive)setTimeout(()=>{if(msg.parentElement)msg.remove();},8000);
}
window.__isimNavCallHistory=function(){window.__isimShowCallHistory();};
window.__isimShowCallHistory=function(){
  const modal=document.getElementById('isim-call-history');if(!modal)return;
  const list=document.getElementById('isim-call-history-list'),logs=cfg().callLog||[];
  if(!logs.length){list.innerHTML='<div style="text-align:center;padding:50px;color:var(--txt4)">No call history</div>';}
  else{list.innerHTML=logs.map((l,i)=>{const dt=new Date(l.startTime),ds=dt.toLocaleDateString('th-TH')+' '+dt.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});return`<div style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-bottom:.5px solid var(--sep);cursor:pointer" onclick="window.__isimShowTranscript(${i})"><div style="width:46px;height:46px;border-radius:23px;background:var(--bg3);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center">${l.avatar?`<img src="${esc(l.avatar)}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.style.background='var(--bg3)'">`:'<svg width="22" height="22" viewBox="0 0 24 24" fill="var(--txt4)"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>'}</div><div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:600;color:var(--txt)">${esc(l.name)}</div><div style="font-size:13px;color:var(--txt3);margin-top:2px">${esc(ds)}</div></div><div style="font-size:14px;color:var(--txt4)">${esc(l.durText)}</div></div>`;}).join('');}
  modal.style.display='flex';modal.style.flexDirection='column';
};
window.__isimShowTranscript=function(i){
  const l=(cfg().callLog||[])[i];if(!l)return;
  const mo=document.getElementById('isim-call-transcript'),b=document.getElementById('isim-transcript-body'),tt=document.getElementById('isim-transcript-title');
  if(!mo||!b)return;if(tt)tt.textContent=`${l.name} · ${l.durText}`;
  b.textContent=(l.transcript||[]).map(t=>`${t.who}: ${t.text}`).join('\n\n')||'(No messages during call)';
  document.getElementById('isim-call-history').style.display='none';mo.style.display='flex';mo.style.flexDirection='column';
};

// ── Stories ──────────────────────────────────────────────────────────────────
window.__isimAddMyStory=function(){document.getElementById('isim-story-input')?.click();};
window.__isimIGAddStory=function(){document.getElementById('isim-ig-story-input')?.click();};
window.__isimUploadStory=async function(input){const f=input.files[0];if(!f)return;toast('Reading…');const r=new FileReader();r.onload=async e=>{const b64=e.target.result,meaning=await describeImage(b64),story={id:Date.now(),isMe:true,uid:'me',image:b64,imageMeaning:meaning,timestamp:Date.now()};if(!cfg().stories)cfg().stories=[];cfg().stories=cfg().stories.filter(s=>Date.now()-s.timestamp<86400000);cfg().stories.push(story);save();renderStoriesBar();renderInstagram();toast('Story posted (24h)');window.__isimViewMyStory();};r.readAsDataURL(f);input.value='';};
window.__isimViewMyStory=function(){const ss=(cfg().stories||[]).filter(s=>s.isMe&&Date.now()-s.timestamp<86400000);if(!ss.length){toast('No stories yet');return;}openStoryViewer(ss[ss.length-1],getUserName(),getUserAvatar());};
window.__isimViewFriendStory=function(uid){const f=cfg().friends.find(f=>f.id===uid),ss=(cfg().stories||[]).filter(s=>s.uid===uid&&!s.isMe&&Date.now()-s.timestamp<86400000);if(!ss.length||!f){toast('No stories');return;}openStoryViewer(ss[ss.length-1],f.customName||f.name,f.avatar);};
function openStoryViewer(story,name,avatar=''){
  const vw=document.getElementById('isim-story-viewer'),img=document.getElementById('isim-story-img'),nm=document.getElementById('isim-story-user-nm'),av=document.getElementById('isim-story-user-av'),ov=document.getElementById('isim-story-text-overlay');if(!vw||!img)return;
  img.style.backgroundImage=story.image?`url(${story.image})`:'';img.style.background=story.image?'':'linear-gradient(135deg,#1a1a2e,#0f3460)';
  nm.textContent=name;av.src=avatar||'';
  if(story.imageMeaning){ov.textContent=story.imageMeaning;ov.classList.add('show');}else ov.classList.remove('show');
  vw.classList.add('show');
  const pr=document.getElementById('isim-story-progress');pr.innerHTML='<div class="isim-story-prog-seg"><div class="isim-story-prog-fill" id="isim-story-prog-fill"></div></div>';
  setTimeout(()=>{const fill=document.getElementById('isim-story-prog-fill');if(fill){fill.style.transition='width 6s linear';fill.style.width='100%';}},100);
  setTimeout(()=>window.__isimCloseStory(),6200);
}
window.__isimCloseStory=function(){document.getElementById('isim-story-viewer')?.classList.remove('show');};
window.__isimReplyStory=async function(){const t=document.getElementById('isim-story-reply-inp')?.value.trim();if(!t)return;document.getElementById('isim-story-reply-inp').value='';window.__isimCloseStory();if(!activeFriend)return;const hi=(cfg().history[activeFriend.id]||[]).length,msg={from:'user',content:`[Story reply: "${t}"]`,time:now()};saveMsg(msg);appendBubble(msg,true,hi);pendingMessages.push(msg);window.__isimNav('chat');toast('Story reply sent');setTimeout(()=>botReply(),800);};
function botPostStory(uid,desc){if(!cfg().stories)cfg().stories=[];cfg().stories=cfg().stories.filter(s=>Date.now()-s.timestamp<86400000);cfg().stories.push({id:Date.now(),isMe:false,uid,image:'',imageMeaning:desc,timestamp:Date.now()});save();renderStoriesBar();renderInstagram();const f=cfg().friends.find(f=>f.id===uid);if(f)showNotif(f.customName||f.name,'Story: '+desc.substring(0,50),f.avatar);}

// ── Instagram ──────────────────────────────────────────────────────────────── 
function renderInstagram(){renderIGStories();renderIGNotes();renderIGFeed();}
function renderIGStories(){
  const row=document.getElementById('isim-ig-stories-row');if(!row)return;
  const ss=(cfg().stories||[]).filter(s=>Date.now()-s.timestamp<86400000),uav=getUserAvatar(),my=ss.find(s=>s.isMe);
  let h=my?`<div class="isim-story-item" onclick="window.__isimViewMyStory()"><div class="isim-story-ring" style="width:66px;height:66px"><img src="${esc(uav)}" class="isim-story-av" onerror="this.style.display='none'"></div><span class="isim-story-name">Your story</span></div>`:`<div class="isim-story-item" onclick="window.__isimIGAddStory()"><div class="isim-story-ring mine" style="width:66px;height:66px"><div style="width:60px;height:60px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:26px">+</div></div><span class="isim-story-name">Your story</span></div>`;
  [...new Set(ss.filter(s=>!s.isMe).map(s=>s.uid))].forEach(uid=>{const f=cfg().friends.find(x=>x.id===uid);if(!f)return;h+=`<div class="isim-story-item" onclick="window.__isimViewFriendStory('${esc(uid)}')"><div class="isim-story-ring" style="width:66px;height:66px"><img src="${esc(f.avatar||'')}" class="isim-story-av" onerror="this.style.display='none'"></div><span class="isim-story-name">${esc(f.customName||f.name)}</span></div>`;});
  row.innerHTML=h;
}
function renderIGNotes(){
  const row=document.getElementById('isim-ig-notes-row');if(!row)return;
  const now24=Date.now()-86400000,wn=(cfg().friends||[]).filter(f=>cfg().botnotes[f.id]?.timestamp>now24&&cfg().botnotes[f.id]?.text);
  if(!wn.length){row.innerHTML='<div style="color:var(--txt4);font-size:13px;padding:4px 0">No notes from friends</div>';return;}
  row.innerHTML=wn.map(f=>{const n=cfg().botnotes[f.id];return`<div class="isim-note-item" onclick="window.__isimViewBotNote('${esc(f.id)}')"><div class="isim-note-av-wrap"><img class="isim-note-av" src="${esc(f.avatar||'')}" onerror="this.style.display='none'"><div class="isim-note-speech">${esc(n.text.substring(0,28))}</div></div><span class="isim-note-label">${esc(f.customName||f.name)}</span></div>`;}).join('');
}
function renderIGFeed(){
  const feed=document.getElementById('isim-ig-feed');if(!feed)return;
  let posts=[];(cfg().friends||[]).forEach(f=>(cfg().history[f.id]||[]).filter(m=>m.type==='photo'&&m.from==='bot').slice(-2).forEach(m=>posts.push({f,m})));
  if(!posts.length){feed.innerHTML='<div style="text-align:center;padding:40px;color:var(--txt4);font-size:14px">No photos yet</div>';return;}
  feed.innerHTML=posts.map(({f,m})=>`<div style="border-bottom:.5px solid var(--sep)"><div style="display:flex;align-items:center;gap:10px;padding:12px 14px"><img src="${esc(f.avatar||'')}" style="width:36px;height:36px;border-radius:18px;object-fit:cover;background:var(--bg3)" onerror="this.style.display='none'"><span style="font-size:15px;font-weight:600;color:var(--txt)">${esc(f.customName||f.name)}</span></div><img src="${esc(m.content)}" style="width:100%;height:360px;object-fit:cover;display:block" onerror="this.style.display='none'"><div style="padding:12px 14px"><div style="display:flex;gap:14px;margin-bottom:10px"><svg width="24" height="24" viewBox="0 0 24 24" fill="var(--txt2)" style="cursor:pointer" onclick="this.setAttribute('fill','var(--like)')"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div><div style="font-size:14px;color:var(--txt3)">${esc(m.time||'')}</div></div></div>`).join('');
}

// ── Friends ───────────────────────────────────────────────────────────────────
window.__isimLoadFriends=function(){
  const list=document.getElementById('isim-flist');if(!list)return;list.innerHTML='<div style="padding:16px;text-align:center;color:var(--txt4)">Loading…</div>';
  let bots=[];
  try{if(typeof SillyTavern!=='undefined'&&SillyTavern.getContext){const ctx=SillyTavern.getContext();if(ctx?.characters?.length)bots=ctx.characters.filter(c=>!c.isUser).map(c=>({id:c.avatar||c.name,name:c.name,avatar:c.avatar?`/characters/${c.avatar}`:'',persona:c.description||c.personality||''}));}}catch{}
  if(!bots.length)bots=[{id:'demo1',name:'Aria',avatar:'',persona:'Friendly and warm.'},{id:'demo2',name:'Leo',avatar:'',persona:'Cool and laid-back.'}];
  list._bots=bots;renderFriendList(bots);
};
function renderFriendList(bots){
  const list=document.getElementById('isim-flist');if(!list)return;
  const added=new Set((cfg().friends||[]).map(f=>f.id));
  list.innerHTML=bots.length?bots.map(b=>`<div class="isim-friend-row" onclick="window.__isimPickFriend('${esc(b.id)}')"><div class="isim-friend-av">${b.avatar?`<img src="${esc(b.avatar)}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">`:b.name[0]}</div><div class="isim-friend-info"><div class="isim-friend-name">${esc(b.name)}</div><div class="isim-friend-bio">${esc((b.persona||'').substring(0,50))}</div></div>${added.has(b.id)?'<span style="font-size:13px;color:var(--green);font-weight:600">Added</span>':`<button class="isim-friend-add" onclick="event.stopPropagation();window.__isimAddFriend('${esc(b.id)}')">Add</button>`}</div>`).join(''):'<div style="padding:30px;text-align:center;color:var(--txt4)">No characters found</div>';
}
window.__isimFilterFriends=function(q){const l=document.getElementById('isim-flist');if(l?._bots)renderFriendList(l._bots.filter(b=>b.name.toLowerCase().includes(q.toLowerCase())));};
window.__isimAddFriend=function(id){const l=document.getElementById('isim-flist'),b=l?._bots?.find(x=>x.id===id);if(!b)return;if(!cfg().friends.find(f=>f.id===id)){cfg().friends.push(b);save();toast(`${b.name} added`);renderFriendList(l._bots);renderMessageList();}};
window.__isimPickFriend=function(id){const f=cfg().friends.find(f=>f.id===id);if(f){activeFriend=f;pendingMessages=[];window.__isimNav('chat');return;}const l=document.getElementById('isim-flist'),b=l?._bots?.find(x=>x.id===id);if(b){cfg().friends.push(b);save();activeFriend=b;pendingMessages=[];window.__isimNav('chat');}};
// ── X / Twitter ───────────────────────────────────────────────────────────────
function renderTwitter(){updateXAvatar();renderTweetFeed('for-you');}
window.__isimXTab=function(tab,el){document.querySelectorAll('.isim-x-tab').forEach(t=>t.classList.remove('on'));el?.classList.add('on');document.getElementById('isim-x-notifs-page')?.classList.remove('show');document.getElementById('isim-tweet-feed').style.display='block';renderTweetFeed(tab);};
function renderTweetFeed(tab){
  const feed=document.getElementById('isim-tweet-feed');if(!feed)return;
  let data=[...(cfg().tweets||[])].reverse();
  if(tab==='following'){const ids=new Set((cfg().friends||[]).map(f=>f.id));data=data.filter(t=>ids.has(t.uid));}
  else if(tab==='trending')data.sort((a,b)=>((b.likes||0)+(b.retweets||0))-((a.likes||0)+(a.retweets||0)));
  if(!data.length){const tip=tab==='for-you'?'Compose your first post!':tab==='following'?'Add contacts and they may post':'No trending posts yet';feed.innerHTML=`<div style="text-align:center;padding:50px 24px;color:#71767b;font-size:14px">${tip}</div>`;return;}
  feed.innerHTML=data.map(t=>tweetCard(t)).join('');
}
function tweetCard(t){
  const f=cfg().friends.find(x=>x.id===t.uid);
  const name=t.uid==='me'?getUserName():(f?.customName||f?.name||t.uid);
  const handle=t.uid==='me'?'@me':`@${(f?.name||t.uid).toLowerCase().replace(/\s+/g,'_')}`;
  const av=t.uid==='me'?getUserAvatar():(f?.avatar||'');
  const lhp=t.liked?'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z':'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z';
  return`<div class="isim-tweet" onclick="window.__isimOpenTweet('${esc(t.id)}')"><img class="tw-av" src="${esc(av)}" onerror="this.style.background='#333'"><div class="tw-body"><div class="tw-meta"><span class="tw-name">${esc(name)}</span><span class="tw-handle">${esc(handle)}</span><span class="tw-time">· ${esc(t.time||'')}</span></div><div class="tw-text">${esc(t.text||'')}</div>${t.image?`<img src="${esc(t.image)}" class="tw-img" onerror="this.style.display='none'" onclick="event.stopPropagation()">`:''}<div class="tw-actions" onclick="event.stopPropagation()"><div class="tw-act" onclick="window.__isimOpenTweet('${esc(t.id)}')"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>${t.replies||0}</div><div class="tw-act ${t.rted?'rted':''}" onclick="window.__isimToggleRt('${esc(t.id)}',this)"><svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>${t.retweets||0}</div><div class="tw-act ${t.liked?'liked':''}" onclick="window.__isimToggleLike('${esc(t.id)}',this)"><svg viewBox="0 0 24 24"><path d="${lhp}"/></svg>${t.likes||0}</div></div></div></div>`;
}
window.__isimOpenTweet=function(id){
  const t=(cfg().tweets||[]).find(x=>x.id===id);if(!t)return;
  const d=document.getElementById('isim-tweet-detail'),b=document.getElementById('isim-tweet-detail-body');if(!d||!b)return;
  const f=cfg().friends.find(x=>x.id===t.uid);
  const name=t.uid==='me'?getUserName():(f?.customName||f?.name||t.uid);
  const handle=t.uid==='me'?'@me':`@${(f?.name||t.uid).toLowerCase().replace(/\s+/g,'_')}`;
  const av=t.uid==='me'?getUserAvatar():(f?.avatar||'');
  const replies=(t.replies_list||[]).map(r=>`<div style="padding:14px 16px;border-bottom:.5px solid #2f3336;display:flex;gap:12px"><div style="width:40px;height:40px;border-radius:20px;background:#333;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:700;color:#e7e9ea">${esc(r.user[0])}</div><div><div style="font-weight:700;color:#e7e9ea;font-size:15px">${esc(r.user)}<span style="font-weight:400;color:#71767b;font-size:13px;margin-left:6px">${esc(r.handle)}</span></div><div style="font-size:15px;color:#e7e9ea;margin-top:4px">${esc(r.body)}</div></div></div>`).join('');
  b.innerHTML=`<div style="padding:14px 16px;border-bottom:.5px solid #2f3336"><div style="display:flex;gap:12px;margin-bottom:12px"><img src="${esc(av)}" style="width:48px;height:48px;border-radius:24px;object-fit:cover;background:#333" onerror="this.style.background='#333'"><div><div style="font-weight:700;color:#e7e9ea;font-size:17px">${esc(name)}</div><div style="color:#71767b;font-size:15px">${esc(handle)}</div></div></div><div style="font-size:22px;color:#e7e9ea;line-height:1.4;margin-bottom:14px;white-space:pre-wrap">${esc(t.text||'')}</div>${t.image?`<img src="${esc(t.image)}" style="width:100%;border-radius:14px;margin-bottom:14px" onerror="this.style.display='none'">`:''}<div style="color:#71767b;font-size:14px;margin-bottom:14px;padding-bottom:14px;border-bottom:.5px solid #2f3336">${esc(t.time||'')}</div></div>${replies}`;
  d.classList.add('show');
  document.getElementById('isim-reply-user-av').src=getUserAvatar();
};
window.__isimToggleLike=function(id,el){const t=(cfg().tweets||[]).find(x=>x.id===id);if(!t)return;t.liked=!t.liked;t.likes=(t.likes||0)+(t.liked?1:-1);save();el.classList.toggle('liked',t.liked);const p=el.querySelector('svg path');if(p)p.setAttribute('d',t.liked?'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z':'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z');el.lastChild.textContent=t.likes;};
window.__isimToggleRt=function(id,el){const t=(cfg().tweets||[]).find(x=>x.id===id);if(!t)return;t.rted=!t.rted;t.retweets=(t.retweets||0)+(t.rted?1:-1);save();el.classList.toggle('rted',t.rted);el.lastChild.textContent=t.retweets;};
window.__isimOpenCompose=function(){const c=document.getElementById('isim-tweet-composer');if(c){c.classList.add('show');document.getElementById('isim-compose-av').src=getUserAvatar();}};
window.__isimCloseCompose=function(){document.getElementById('isim-tweet-composer')?.classList.remove('show');window._tweetImgData=null;document.getElementById('isim-tweet-img-preview').textContent='';};
window.__isimAttachTweetImg=function(input){const f=input.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{window._tweetImgData=e.target.result;document.getElementById('isim-tweet-img-preview').textContent='Image attached';};r.readAsDataURL(f);input.value='';};
window.__isimPostTweet=async function(){
  const area=document.getElementById('isim-tweet-area'),text=area?.value.trim();if(!text)return;
  const nt={id:'t'+Date.now(),uid:'me',text,time:now(),likes:0,retweets:0,replies:0,liked:false,rted:false,replies_list:[],image:window._tweetImgData||''};
  window._tweetImgData=null;document.getElementById('isim-tweet-img-preview').textContent='';
  if(!cfg().tweets)cfg().tweets=[];cfg().tweets.push(nt);save();area.value='';window.__isimCloseCompose();renderTweetFeed('for-you');
  setTimeout(async()=>{
    const tw=cfg().tweets.find(x=>x.id===nt.id);if(!tw)return;
    tw.likes+=Math.floor(Math.random()*5);tw.retweets+=Math.floor(Math.random()*3);
    const friends=cfg().friends||[],bf=friends.length?friends[Math.floor(Math.random()*friends.length)]:null;
    const bn=bf?bf.customName||bf.name:'Follower',bh=bf?`@${(bf.name||'').toLowerCase().replace(/\s+/g,'_')}`:'@follower';
    let bc='Great post!';
    try{let ctx;try{ctx=SillyTavern.getContext();}catch{ctx=null;}const p=`You are ${bn}. React to this tweet in 1 short sentence. Natural, casual. Match language.\nTweet: "${text}"\nJust write the reaction, no quotes, no name prefix.`;let reply='';if(ctx&&typeof ctx.generateQuietPrompt==='function')reply=await ctx.generateQuietPrompt(p,false,false);else if(typeof window.generateQuietPrompt==='function')reply=await window.generateQuietPrompt(p,false,false);bc=cleanThink(String(reply||'').trim()).replace(/\[[A-Z_]+:[^\]]*\]/g,'').trim().split('\n')[0].trim()||'Great post!';}catch{}
    tw.replies_list.push({user:bn,handle:bh,body:bc});tw.replies++;
    cfg().tweets=cfg().tweets.map(x=>x.id===nt.id?tw:x);save();renderTweetFeed('for-you');
    addXNotif('reply',bn,bf?.avatar||'',`replied: "${bc.substring(0,40)}"`);showNotif(bn,bc.substring(0,60),bf?.avatar||'');
  },3000);
};
window.__isimSubmitDetailReply=function(){const i=document.getElementById('isim-reply-inp');const t=i?.value.trim();if(!t)return;i.value='';document.getElementById('isim-tweet-detail')?.classList.remove('show');toast('Reply posted');};
window.__isimXNotifTab=function(){document.querySelectorAll('.isim-x-tab').forEach(t=>t.classList.remove('on'));document.getElementById('isim-x-tab-notif')?.classList.add('on');document.getElementById('isim-tweet-feed').style.display='none';document.getElementById('isim-tweet-detail')?.classList.remove('show');document.getElementById('isim-tweet-composer')?.classList.remove('show');const np=document.getElementById('isim-x-notifs-page');if(np)np.classList.add('show');renderXNotifs();};
function addXNotif(type,user,avatar,text){if(!cfg().xNotifs)cfg().xNotifs=[];cfg().xNotifs.unshift({type,user,avatar,text,time:now(),read:false});if(cfg().xNotifs.length>50)cfg().xNotifs=cfg().xNotifs.slice(0,50);save();const b=document.getElementById('isim-x-notif-badge');if(b){const u=(cfg().xNotifs||[]).filter(n=>!n.read).length;b.textContent=u;b.style.display=u>0?'flex':'none';}}
function renderXNotifs(){const list=document.getElementById('isim-x-notifs-list');if(!list)return;(cfg().xNotifs||[]).forEach(n=>n.read=true);save();const b=document.getElementById('isim-x-notif-badge');if(b)b.style.display='none';const notifs=cfg().xNotifs||[];const icons={like:'❤️',reply:'💬',repost:'🔁',follow:'👤'};if(!notifs.length){list.innerHTML='<div style="text-align:center;padding:40px;color:#71767b;font-size:15px">No notifications yet</div>';return;}list.innerHTML=notifs.map(n=>`<div style="display:flex;gap:12px;padding:14px 16px;border-bottom:.5px solid #2f3336"><div style="width:34px;height:34px;border-radius:17px;background:#1a1a1a;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${icons[n.type]||'🔔'}</div><div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><div style="width:28px;height:28px;border-radius:14px;background:#333;overflow:hidden;flex-shrink:0">${n.avatar?`<img src="${esc(n.avatar)}" style="width:100%;height:100%;object-fit:cover">`:n.user[0]}</div><span style="font-weight:700;color:#e7e9ea;font-size:14px">${esc(n.user)}</span></div><div style="font-size:14px;color:#e7e9ea">${esc(n.text)}</div><div style="font-size:12px;color:#71767b;margin-top:2px">${esc(n.time)}</div></div></div>`).join('');}

// ── Bank ──────────────────────────────────────────────────────────────────────
function renderBank(){const bank=cfg().bank;const ea=document.getElementById('isim-bank-accnum'),eb=document.getElementById('isim-bank-bal');if(ea)ea.textContent=bank.accountNumber;if(eb)eb.textContent=bank.balance.toLocaleString('th-TH',{minimumFractionDigits:2});const list=document.getElementById('isim-tx-list');if(!list)return;if(!(bank.transactions||[]).length){list.innerHTML='<div style="text-align:center;padding:20px;color:var(--txt3)">No transactions</div>';return;}list.innerHTML=(bank.transactions||[]).slice(0,20).map(tx=>`<div class="isim-tx-row"><div class="isim-tx-icon ${tx.type==='receive'?'isim-tx-receive':'isim-tx-send'}">${tx.type==='receive'?'↓':'↑'}</div><div class="isim-tx-info"><div class="isim-tx-from">${esc(tx.type==='receive'?(tx.from||'Unknown'):(tx.to||'Unknown'))}</div><div class="isim-tx-note">${esc(tx.note||'')}</div><div style="font-size:12px;color:var(--txt4);margin-top:2px">${fmtDate(tx.date)}</div></div><div class="isim-tx-amt ${tx.type==='receive'?'green':'red'}">${tx.type==='receive'?'+':'-'}฿${Number(tx.amount).toLocaleString()}</div></div>`).join('');}
window.__isimRefreshBank=function(){renderBank();toast('Updated');};
window.__isimBankTransfer=function(){const to=prompt('Transfer to:');if(!to)return;const amt=Number(prompt('Amount (THB):'));if(!amt||amt<=0)return;if(amt>cfg().bank.balance){toast('Insufficient balance');return;}cfg().bank.balance-=amt;cfg().bank.transactions.unshift({type:'send',amount:amt,to,note:'Transfer',date:Date.now()});save();renderBank();toast(`Sent ฿${amt} to ${to}`);};
window.__isimBankReceive=function(){const from=prompt('Received from:');if(!from)return;const amt=Number(prompt('Amount:'));if(!amt||amt<=0)return;cfg().bank.balance+=amt;cfg().bank.transactions.unshift({type:'receive',amount:amt,from,note:'Transfer',date:Date.now()});save();renderBank();toast(`Received ฿${amt}`);};

// ── Data / reset ──────────────────────────────────────────────────────────────
window.__isimClearChat=function(){const fid=activeFriend?.id;if(!fid){toast('Open a chat first');return;}if(!confirm(`Clear ${activeFriend.customName||activeFriend.name}'s chat?`))return;cfg().history[fid]=[];save();loadHistory(fid);toast('Chat cleared');};
window.__isimResetAll=function(){if(!confirm('Reset ALL data? This cannot be undone.'))return;localStorage.removeItem(LS);_cfg=null;activeFriend=null;pendingMessages=[];toast('Reset done — refresh page');};

// ── Input binding ──────────────────────────────────────────────────────────────
function bindInput(){const i=document.getElementById('isim-input');if(!i)return;i.addEventListener('input',function(){this.style.height='auto';this.style.height=Math.min(this.scrollHeight,90)+'px';});i.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();window.__isimSend();}});}

// ── ST Extension boilerplate ───────────────────────────────────────────────────
function loadSettings(){
  $('.isim-st-panel').remove();
  $('#extensions_settings').append(`<div class="isim-st-panel"><div class="inline-drawer"><div class="inline-drawer-toggle inline-drawer-header"><b>iPhone Simulator v4</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div><div class="inline-drawer-content"><div class="styled_description_block">Press 📱 to open the simulator.<br><small>v4.0 — iOS Minimal · CoT fix · {{user}} avatar · Instagram · X · Call+Chat · Wallpaper</small></div></div></div></div>`);
}
function injectFAB(){
  if(document.getElementById('isim-fab'))return;
  const fab=document.createElement('button');fab.id='isim-fab';fab.innerHTML='<span style="font-size:22px">📱</span>';fab.title='iPhone Simulator';fab.addEventListener('click',openPhone);
  const targets=['#extensionsMenu','#send_but_container','#leftSendForm','#rightSendForm','#form_sheld','#options_button'];
  let ok=false;for(const sel of targets){const el=document.querySelector(sel);if(el){el.prepend(fab);ok=true;break;}}
  if(!ok){fab.style.cssText='position:fixed!important;bottom:80px!important;right:16px!important;z-index:2147483647!important;background:linear-gradient(145deg,#1c1c1e,#3a3a3c)!important;border-radius:50%!important;width:52px!important;height:52px!important;font-size:22px!important;box-shadow:0 4px 20px rgba(0,0,0,.7)!important;border:none!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;';document.body.appendChild(fab);}
}
function injectPhone(){
  if(document.getElementById('isim-phone'))return;
  const div=document.createElement('div');div.id='isim-phone';div.innerHTML=buildPhoneHTML();document.body.appendChild(div);
  div.addEventListener('click',e=>{if(e.target===div)closePhone();});
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
jQuery(async()=>{
  injectCSS();injectFAB();injectPhone();loadSettings();
  setTimeout(()=>{
    bindInput();
    document.getElementById('isim-home').style.display='flex';
    startClock();
    console.log('[iPhone-Sim] v4.0 loaded ✓');
  },300);
});
