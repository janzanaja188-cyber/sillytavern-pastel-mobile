// ============================================================
// iPhone Simulator Extension for SillyTavern
// Author: iPhone-Sim
// Style: Community (Cozy Cat / CattaHub pattern)
// ============================================================

const extensionName = 'iphone-simulator';

// ---- localStorage Settings (community style — ไม่ต้อง import อะไร) ----
const LS_KEY = 'iphone_sim_v1';
const DEFAULT_SETTINGS = {
    theme: 'dark',
    accentColor: '#0a84ff',
    chatBg: '',
    stickers: ['😂','❤️','👍','🔥','😭','✨','💀','😊'],
    friends: [],
    chatHistory: {},
    notes: {},
    botNotes: {},
    transfers: [],
    tweetFeed: [],
    notifications: [],
    tweetIdCounter: 1,
    userHandle: '@user',
    userName: 'Me',
};

let _s = null;
function getSettings() {
    if (_s) return _s;
    try { _s = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(localStorage.getItem(LS_KEY) || '{}')); }
    catch(e) { _s = Object.assign({}, DEFAULT_SETTINGS); }
    return _s;
}
function persistSettings() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(_s || getSettings())); } catch(e) {}
}

// ---- State ----
let state = {
    currentApp: null,
    activeFriend: null,
    isTyping: false,
    callActive: false,
    callTimer: 0,
    callTimerInterval: null,
    callMuted: false,
    currentTweetId: null,
    openSheet: null,
    theme: 'dark',
    accentColor: '#0a84ff',
};

// ============================================================
// loadSettings — inject panel เข้า #extensions_settings
// เหมือน Cozy Cat pattern (ทำให้ Extension โชว์ในลิสต์)
// ============================================================
function loadSettings() {
    $('.iphone-sim-settings').remove();

    const settingsHtml = `
    <div class="iphone-sim-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>📱 iPhone Simulator</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="styled_description_block">
                    Extension by iPhone-Sim<br>
                    <small>กดปุ่ม 📱 ที่มุมขวาล่างเพื่อเปิดมือถือ</small>
                </div>
                <hr>
                <label>Theme
                    <select id="isim-theme-select">
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                    </select>
                </label>
                <hr>
                <small>v1.1.0</small>
            </div>
        </div>
    </div>`;

    $('#extensions_settings').append(settingsHtml);

    // Sync current theme
    const s = getSettings();
    $('#isim-theme-select').val(s.theme || 'dark');
    $('#isim-theme-select').on('change', function() {
        const s = getSettings();
        s.theme = $(this).val();
        state.theme = s.theme;
        persistSettings();
        applyTheme(s.theme);
    });
}

// ============================================================
// BOOTSTRAP — jQuery async เหมือน Cozy Cat / CattaHub
// ============================================================
jQuery(async () => {
    loadSettings();          // inject panel เข้า ST extensions list ก่อน
    injectPhoneUI();         // inject FAB + phone overlay
    loadFromSettings();
    bindGlobalEvents();
    bindChatEvents();
    bindStickerAndMediaEvents();
    bindCallEvents();
    bindFriendsEvents();
    bindTwitterEvents();
    startClock();
    console.log(`[${extensionName}] Loaded ✓`);
});

// ============================================================
// INJECT UI — FAB + Overlay (ใช้ appendChild + inline style)
// ============================================================
function injectPhoneUI() {
    // ---- FAB ปุ่มลอย ----
    const fab = document.createElement('div');
    fab.id = 'isim-fab';
    fab.title = 'iPhone Simulator';
    fab.innerHTML = `<svg viewBox="0 0 24 24" style="width:26px;height:26px;fill:#fff"><path d="M17 2H7C5.34 2 4 3.34 4 5v14c0 1.66 1.34 3 3 3h10c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3zm-5 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm5-4H7V5h10v11.5z"/></svg>`;
    fab.style.cssText = `
        position:fixed;bottom:80px;right:20px;
        width:54px;height:54px;border-radius:50%;
        background:linear-gradient(145deg,#1c1c1e,#3a3a3c);
        cursor:pointer;z-index:2147483647;
        box-shadow:0 4px 20px rgba(0,0,0,.6);
        display:flex;align-items:center;justify-content:center;
        transition:transform .2s;user-select:none;
    `;
    fab.addEventListener('click', togglePhone);
    document.body.appendChild(fab);

    // ---- Overlay ----
    const overlay = document.createElement('div');
    overlay.id = 'isim-overlay';
    overlay.style.cssText = `
        position:fixed;inset:0;
        background:rgba(0,0,0,.65);backdrop-filter:blur(6px);
        z-index:2147483646;
        display:flex;align-items:center;justify-content:center;
        opacity:0;pointer-events:none;
        transition:opacity .3s;
    `;
    overlay.innerHTML = buildPhoneHTML();
    document.body.appendChild(overlay);

    // Close on backdrop click
    overlay.addEventListener('click', function(e) {
        if (e.target === this) togglePhone();
    });
}

function togglePhone() {
    const o = document.getElementById('isim-overlay');
    if (!o) return;
    const open = o.style.opacity === '1';
    o.style.opacity = open ? '0' : '1';
    o.style.pointerEvents = open ? 'none' : 'all';
}

// ============================================================
// PHONE HTML
// ============================================================
function buildPhoneHTML() {
    return `
<div id="isim-frame" class="theme-dark">

  <div id="isim-dynamic-island"><span id="isim-di-text"></span></div>

  <div id="isim-statusbar">
    <span id="isim-clock">9:41</span>
    <div class="isim-sb-icons">
      <svg viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 00-6 0zm-4-4l2 2a7.074 7.074 0 0110 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
      <svg viewBox="0 0 24 24"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
    </div>
  </div>

  <div id="isim-screen">

    <!-- HOME -->
    <div id="isim-home">
      <div class="isim-home-top">
        <div id="isim-home-day">Sunday, May 10</div>
        <div id="isim-home-time">9:41</div>
      </div>
      <div class="isim-app-grid">
        <div class="isim-app" data-app="messages">
          <div class="isim-app-icon msg-icon">
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
          </div>
          <span>Messages</span>
        </div>
        <div class="isim-app" data-app="friends">
          <div class="isim-app-icon friends-icon">
            <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          </div>
          <span>Contacts</span>
        </div>
        <div class="isim-app" data-app="twitter">
          <div class="isim-app-icon tw-icon">
            <svg viewBox="0 0 24 24"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 01-1.93.07 4.28 4.28 0 004 2.98 8.521 8.521 0 01-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/></svg>
          </div>
          <span>Tweeter</span>
        </div>
        <div class="isim-app" data-app="settings">
          <div class="isim-app-icon set-icon">
            <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          </div>
          <span>Settings</span>
        </div>
      </div>
      <div class="isim-home-indicator"></div>
    </div>

    <!-- MESSAGES APP -->
    <div class="isim-app-screen" id="isim-app-messages">
      <div class="isim-nav">
        <button class="isim-back" data-go-home>
          <svg viewBox="0 0 10 18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 1L1 9l8 8"/></svg>
        </button>
        <span class="isim-nav-title" id="isim-chat-title">Chat</span>
        <button class="isim-nav-btn" id="isim-call-btn">
          <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
        </button>
      </div>

      <div class="isim-chat-header" id="isim-chat-header">
        <img id="isim-chat-avatar" src="" alt="">
        <div>
          <div id="isim-chat-name"></div>
          <div id="isim-chat-status">Active now</div>
        </div>
        <div class="isim-chat-actions">
          <button class="isim-hdr-btn" id="isim-note-btn">📝 Note</button>
          <button class="isim-hdr-btn" id="isim-botnote-btn">🤖 Bot Note</button>
          <button class="isim-hdr-btn" id="isim-cancel-btn">✕ Cancel</button>
          <button class="isim-hdr-btn" id="isim-retry-btn">↺ Retry</button>
          <button class="isim-hdr-btn" id="isim-bg-btn">🖼 BG</button>
        </div>
      </div>

      <div class="isim-note-panel" id="isim-note-panel">
        <div class="isim-note-label">My Note (bot reacts when changed)</div>
        <textarea id="isim-note-ta" placeholder="Write a note..."></textarea>
        <div class="isim-note-actions">
          <button id="isim-note-cancel">Cancel</button>
          <button id="isim-note-save" class="primary">Save</button>
        </div>
      </div>

      <div class="isim-note-panel" id="isim-botnote-panel" style="background:#e8f4fd">
        <div class="isim-note-label" style="color:#1e40af">Note to Bot (bot reads this as context)</div>
        <textarea id="isim-botnote-ta" placeholder="Write instructions for the bot..." style="background:#dbeafe;color:#1e3a5f"></textarea>
        <div class="isim-note-actions">
          <button id="isim-botnote-cancel">Cancel</button>
          <button id="isim-botnote-save" class="primary" style="background:#1d4ed8">Save</button>
        </div>
      </div>

      <div id="isim-chat-switcher"></div>
      <div id="isim-messages"></div>

      <div class="isim-sticker-panel" id="isim-sticker-panel">
        <div id="isim-sticker-inner"></div>
      </div>

      <div class="isim-input-bar">
        <div class="isim-input-extras">
          <button class="isim-extra-btn" id="isim-btn-sticker">😊</button>
          <button class="isim-extra-btn" id="isim-btn-image">🖼</button>
          <button class="isim-extra-btn" id="isim-btn-audio">🎤</button>
          <button class="isim-extra-btn" id="isim-btn-location">📍</button>
          <button class="isim-extra-btn" id="isim-btn-transfer">💸</button>
        </div>
        <div class="isim-input-row">
          <textarea id="isim-chat-input" placeholder="Message" rows="1"></textarea>
          <button class="isim-nudge" id="isim-nudge-btn" title="Nudge">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/></svg>
          </button>
          <button class="isim-send" id="isim-send-btn">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- CONTACTS APP -->
    <div class="isim-app-screen" id="isim-app-friends">
      <div class="isim-nav">
        <button class="isim-back" data-go-home>
          <svg viewBox="0 0 10 18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 1L1 9l8 8"/></svg>
        </button>
        <span class="isim-nav-title">Contacts</span>
        <button class="isim-nav-btn" id="isim-friends-refresh">↺</button>
      </div>
      <div class="isim-search-wrap">
        <input id="isim-friends-search" placeholder="Search...">
      </div>
      <div id="isim-friends-list"></div>
    </div>

    <!-- TWITTER APP -->
    <div class="isim-app-screen" id="isim-app-twitter">
      <div class="isim-nav">
        <button class="isim-back" data-go-home>
          <svg viewBox="0 0 10 18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 1L1 9l8 8"/></svg>
        </button>
        <span class="isim-nav-title">Tweeter</span>
        <button class="isim-nav-btn" id="isim-tw-notif-btn">🔔 <span id="isim-tw-notif-count" style="display:none;background:red;color:#fff;border-radius:8px;padding:0 5px;font-size:11px"></span></button>
      </div>
      <div class="isim-tw-tabs">
        <button class="isim-tw-tab active" data-tab="feed">Home</button>
        <button class="isim-tw-tab" data-tab="trends">Trends</button>
        <button class="isim-tw-tab" data-tab="profile">Profile</button>
        <button class="isim-tw-tab" data-tab="notifs">Notifs</button>
      </div>
      <div id="isim-tw-feed-page" class="isim-tw-page active">
        <div class="isim-tw-compose">
          <img id="isim-compose-avatar" src="" alt="" style="width:38px;height:38px;border-radius:50%;object-fit:cover;background:var(--isim-bg3)">
          <textarea id="isim-compose-input" placeholder="What's happening?" rows="2"></textarea>
          <button id="isim-compose-send" disabled>Post</button>
        </div>
        <div id="isim-tweet-feed"></div>
      </div>
      <div id="isim-tw-trends-page" class="isim-tw-page">
        <div id="isim-trends-list"></div>
      </div>
      <div id="isim-tw-profile-page" class="isim-tw-page">
        <div class="isim-profile-header">
          <img id="isim-profile-avatar" src="" alt="" style="width:60px;height:60px;border-radius:50%;object-fit:cover;background:var(--isim-bg3)">
          <div>
            <div id="isim-profile-name" style="font-weight:700;font-size:16px;color:var(--isim-text)">Me</div>
            <div id="isim-profile-handle" style="color:var(--isim-text3);font-size:13px">@user</div>
          </div>
        </div>
        <div class="isim-profile-stats">
          <div><span id="isim-profile-tweets">0</span><small>Posts</small></div>
          <div><span id="isim-profile-likes">0</span><small>Likes</small></div>
        </div>
        <div id="isim-profile-feed"></div>
      </div>
      <div id="isim-tw-notifs-page" class="isim-tw-page">
        <div id="isim-notifs-list"></div>
      </div>

      <!-- Thread screen (inside twitter) -->
      <div id="isim-thread-screen">
        <div class="isim-nav">
          <button class="isim-back" id="isim-thread-back">
            <svg viewBox="0 0 10 18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 1L1 9l8 8"/></svg>
          </button>
          <span class="isim-nav-title">Thread</span>
        </div>
        <div id="isim-thread-content"></div>
        <div class="isim-thread-reply-bar">
          <img id="isim-thread-compose-avatar" src="" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;background:var(--isim-bg3)">
          <input id="isim-thread-reply-input" placeholder="Reply...">
          <button id="isim-thread-reply-send">Reply</button>
        </div>
      </div>
    </div>

    <!-- SETTINGS APP -->
    <div class="isim-app-screen" id="isim-app-settings">
      <div class="isim-nav">
        <button class="isim-back" data-go-home>
          <svg viewBox="0 0 10 18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 1L1 9l8 8"/></svg>
        </button>
        <span class="isim-nav-title">Settings</span>
      </div>
      <div class="isim-settings-body">
        <div class="isim-settings-section">
          <div class="isim-settings-title">Appearance</div>
          <div class="isim-settings-group">
            <div class="isim-settings-row">
              <span>Dark Mode</span>
              <label class="isim-toggle"><input type="checkbox" id="isim-toggle-dark"><span></span></label>
            </div>
          </div>
          <div class="isim-settings-group" style="padding:12px">
            <div style="font-size:12px;color:var(--isim-text3);margin-bottom:8px;font-family:-apple-system,sans-serif">Accent Color</div>
            <div id="isim-accent-colors" style="display:flex;gap:8px;flex-wrap:wrap">
              <div class="isim-color-swatch" data-color="#0a84ff" style="background:#0a84ff"></div>
              <div class="isim-color-swatch" data-color="#30d158" style="background:#30d158"></div>
              <div class="isim-color-swatch" data-color="#ff375f" style="background:#ff375f"></div>
              <div class="isim-color-swatch" data-color="#ff9f0a" style="background:#ff9f0a"></div>
              <div class="isim-color-swatch" data-color="#bf5af2" style="background:#bf5af2"></div>
              <div class="isim-color-swatch" data-color="#ff6961" style="background:#ff6961"></div>
            </div>
          </div>
        </div>
        <div class="isim-settings-section">
          <div class="isim-settings-title">Chat</div>
          <div class="isim-settings-group">
            <div class="isim-settings-row" id="isim-set-bg-row" style="cursor:pointer">
              <span>Chat Wallpaper</span>
              <svg viewBox="0 0 8 14" style="width:8px;height:14px;fill:none;stroke:var(--isim-text3);stroke-width:2"><path d="M1 1l6 6-6 6"/></svg>
            </div>
          </div>
        </div>
        <div class="isim-settings-section">
          <div class="isim-settings-title">About</div>
          <div class="isim-settings-group">
            <div class="isim-settings-row"><span>Version</span><span style="color:var(--isim-text3)">1.1.0</span></div>
          </div>
        </div>
        <div style="height:40px"></div>
      </div>
    </div>

    <!-- CALL SCREEN -->
    <div id="isim-call-screen">
      <div id="isim-call-bg"></div>
      <div id="isim-call-float"></div>
      <div class="isim-call-content">
        <img id="isim-call-avatar" src="" alt="">
        <div id="isim-call-name"></div>
        <div id="isim-call-status">Calling...</div>
        <div id="isim-call-timer">0:00</div>
      </div>
      <div class="isim-call-chat">
        <input id="isim-call-input" placeholder="Type during call...">
        <button id="isim-call-send">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/></svg>
        </button>
      </div>
      <div class="isim-call-controls">
        <button class="isim-call-btn" id="isim-mute-btn">
          <div class="isim-call-circle mute" id="isim-mute-circle">
            <svg viewBox="0 0 24 24"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>
          </div>
          <span>Mute</span>
        </button>
        <button class="isim-call-btn" id="isim-end-btn">
          <div class="isim-call-circle end">
            <svg viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.12-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
          </div>
          <span>End</span>
        </button>
        <button class="isim-call-btn" id="isim-speaker-btn">
          <div class="isim-call-circle">
            <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
          </div>
          <span>Speaker</span>
        </button>
      </div>
    </div>

    <!-- Toast -->
    <div id="isim-toast"></div>

    <!-- Transfer sheet -->
    <div class="isim-sheet-backdrop" id="isim-sheet-backdrop"></div>
    <div class="isim-sheet" id="isim-transfer-sheet">
      <div class="isim-sheet-handle"></div>
      <div class="isim-sheet-title">Transfer Money</div>
      <input id="isim-transfer-amount" type="number" placeholder="Amount (THB)" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--isim-separator);background:var(--isim-bg2);color:var(--isim-text);font-size:15px;box-sizing:border-box;margin-bottom:8px">
      <input id="isim-transfer-note" type="text" placeholder="Note (optional)" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--isim-separator);background:var(--isim-bg2);color:var(--isim-text);font-size:15px;box-sizing:border-box;margin-bottom:12px">
      <button id="isim-transfer-confirm" style="width:100%;padding:12px;background:var(--isim-accent);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer">Transfer</button>
    </div>

    <!-- Hidden file inputs -->
    <input type="file" id="isim-image-input" accept="image/*" style="display:none">
    <input type="file" id="isim-audio-input" accept="audio/*" style="display:none">
    <input type="file" id="isim-bg-input" accept="image/*" style="display:none">
    <input type="file" id="isim-sticker-input" accept="image/*" style="display:none">

    <div class="isim-home-indicator"></div>
  </div><!-- /isim-screen -->
</div><!-- /isim-frame -->
    `;
}

// ============================================================
// LOAD / APPLY SETTINGS
// ============================================================
function loadFromSettings() {
    const s = getSettings();
    state.theme = s.theme || 'dark';
    state.accentColor = s.accentColor || '#0a84ff';
    applyTheme(state.theme);
    applyAccent(state.accentColor);
    $('#isim-toggle-dark').prop('checked', state.theme === 'dark');
    $('#isim-accent-colors .isim-color-swatch').each(function() {
        $(this).toggleClass('selected', $(this).data('color') === state.accentColor);
    });
}

function applyTheme(theme) {
    const frame = document.getElementById('isim-frame');
    if (frame) {
        frame.className = 'theme-' + theme;
    }
}

function applyAccent(color) {
    const frame = document.getElementById('isim-frame');
    if (frame) frame.style.setProperty('--isim-accent', color);
}

// ============================================================
// CLOCK
// ============================================================
function startClock() {
    function tick() {
        const now = new Date();
        const t = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
        $('#isim-clock, #isim-home-time').text(t);
        const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        $('#isim-home-day').text(`${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`);
    }
    tick();
    setInterval(tick, 10000);
}

// ============================================================
// NAVIGATION
// ============================================================
function openApp(id) {
    $('#isim-home').addClass('hidden');
    $('.isim-app-screen').removeClass('active');
    $(`#isim-app-${id}`).addClass('active');
    state.currentApp = id;
    if (id === 'messages') renderFriendInChat();
    if (id === 'friends') loadFriendsList();
    if (id === 'twitter') renderTweetFeed();
}

function goHome() {
    $('.isim-app-screen').removeClass('active');
    $('#isim-thread-screen').removeClass('active');
    $('#isim-home').removeClass('hidden');
    state.currentApp = null;
    endCall();
}

// ============================================================
// GLOBAL EVENTS
// ============================================================
function bindGlobalEvents() {
    $(document).on('click', '.isim-app', function() {
        openApp($(this).data('app'));
    });
    $(document).on('click', '[data-go-home]', goHome);

    $('#isim-thread-back').on('click', () => $('#isim-thread-screen').removeClass('active'));

    $('#isim-toggle-dark').on('change', function() {
        state.theme = $(this).is(':checked') ? 'dark' : 'light';
        applyTheme(state.theme);
        getSettings().theme = state.theme;
        persistSettings();
    });

    $(document).on('click', '.isim-color-swatch', function() {
        $('.isim-color-swatch').removeClass('selected');
        $(this).addClass('selected');
        state.accentColor = $(this).data('color');
        applyAccent(state.accentColor);
        getSettings().accentColor = state.accentColor;
        persistSettings();
    });

    $('#isim-sheet-backdrop').on('click', closeSheet);
    $('#isim-set-bg-row').on('click', () => $('#isim-bg-input').trigger('click'));
    $('#isim-bg-input').on('change', function() {
        const f = this.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = e => {
            getSettings().chatBg = e.target.result;
            persistSettings();
            updateChatBg();
            showToast('Wallpaper set');
        };
        r.readAsDataURL(f);
        this.value = '';
    });
}

// ============================================================
// CHAT APP
// ============================================================
function renderFriendInChat() {
    const s = getSettings();
    if (!state.activeFriend && s.friends && s.friends.length) {
        state.activeFriend = s.friends[0];
    }
    if (!state.activeFriend) {
        $('#isim-chat-name').text('No contact');
        $('#isim-chat-status').text('Add contacts first');
        $('#isim-messages').html('');
        return;
    }
    $('#isim-chat-avatar').attr('src', state.activeFriend.avatar || '');
    $('#isim-chat-name').text(state.activeFriend.name);
    $('#isim-chat-title').text(state.activeFriend.name);
    $('#isim-chat-status').text('Active now');
    loadChatHistory(state.activeFriend.id);
    updateChatBg();
    renderContactSwitcher();
}

function updateChatBg() {
    const s = getSettings();
    if (s.chatBg) {
        $('#isim-messages').css({ backgroundImage: `url(${s.chatBg})`, backgroundSize: 'cover' });
    }
}

function loadChatHistory(fid) {
    const s = getSettings();
    const msgs = s.chatHistory[fid] || [];
    $('#isim-messages').html('');
    if (!msgs.length) addSysMsg(`Start chatting with ${state.activeFriend.name}`);
    msgs.forEach(m => appendMsg(m, false));
    const el = document.getElementById('isim-messages');
    if (el) el.scrollTop = el.scrollHeight;
    if (s.notes[fid]) $('#isim-note-ta').val(s.notes[fid]);
}

function addSysMsg(t) {
    $('#isim-messages').append(`<div class="isim-sys-msg">${t}</div>`);
}

function appendMsg(msg, animate = true) {
    const list = $('#isim-messages');
    const time = msg.time || formatTime(new Date());
    let bubble = '';
    if (msg.type === 'text') bubble = `<div class="isim-bubble">${escHtml(msg.content)}</div>`;
    else if (msg.type === 'sticker') bubble = `<div class="isim-bubble isim-sticker"><span style="font-size:44px">${msg.content}</span></div>`;
    else if (msg.type === 'sticker-img') bubble = `<div class="isim-bubble isim-sticker"><img src="${msg.content}" style="max-width:80px"></div>`;
    else if (msg.type === 'image') bubble = `<div class="isim-bubble"><img src="${msg.content}" style="max-width:160px;border-radius:10px"></div>`;
    else if (msg.type === 'audio') bubble = `<div class="isim-bubble"><audio controls src="${msg.content}" style="max-width:180px"></audio></div>`;
    else if (msg.type === 'location') bubble = `<div class="isim-bubble isim-location-card">📍 ${escHtml(msg.content)}</div>`;
    else if (msg.type === 'transfer') bubble = `<div class="isim-bubble isim-transfer-card"><div>💸 Bank Transfer</div><div style="font-size:20px;font-weight:700">${escHtml(msg.content.amount)} THB</div><div style="font-size:12px;opacity:.7">${escHtml(msg.content.note||'')}</div></div>`;
    else if (msg.type === 'note') bubble = `<div class="isim-bubble isim-note-card"><div style="font-size:11px;opacity:.7">${msg.author==='user'?'My Note':'Bot Note'}</div>${escHtml(msg.content)}</div>`;

    const dir = msg.from === 'user' ? 'out' : 'in';
    const av = msg.from === 'bot' ? `<img class="isim-msg-av" src="${escHtml(state.activeFriend?.avatar||'')}" alt="">` : '';
    list.append(`<div class="isim-msg-row ${dir}">${av}<div class="isim-msg-wrap">${bubble}<span class="isim-msg-time">${time}</span></div></div>`);
    const el = document.getElementById('isim-messages');
    if (el) el.scrollTop = el.scrollHeight;
}

function saveMsg(msg) {
    const s = getSettings();
    const fid = state.activeFriend?.id;
    if (!fid) return;
    if (!s.chatHistory[fid]) s.chatHistory[fid] = [];
    s.chatHistory[fid].push(msg);
    persistSettings();
}

function renderContactSwitcher() {
    const s = getSettings();
    const friends = s.friends || [];
    const sw = $('#isim-chat-switcher');
    if (friends.length <= 1) { sw.hide(); return; }
    sw.show().html('');
    friends.forEach(f => {
        const active = state.activeFriend?.id === f.id;
        const pill = $(`<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;margin:4px;border-radius:20px;cursor:pointer;font-size:12px;font-family:-apple-system,sans-serif;background:${active?'var(--isim-accent)':'var(--isim-bg3)'};color:${active?'#fff':'var(--isim-text)'}">${escHtml(f.name)}</span>`);
        pill.on('click', () => {
            state.activeFriend = f;
            loadChatHistory(f.id);
            renderContactSwitcher();
        });
        sw.append(pill);
    });
}

function bindChatEvents() {
    $('#isim-send-btn').on('click', sendUserMessage);
    $('#isim-chat-input').on('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendUserMessage(); }
    });
    $('#isim-chat-input').on('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });
    $('#isim-nudge-btn').on('click', () => {
        if (!state.activeFriend) { showToast('Select a contact first'); return; }
        botReply('');
    });
    $('#isim-retry-btn').on('click', retryLast);
    $('#isim-cancel-btn').on('click', cancelBot);
    $('#isim-call-btn').on('click', startCall);

    $('#isim-note-btn').on('click', () => { $('#isim-botnote-panel').removeClass('open'); $('#isim-note-panel').toggleClass('open'); });
    $('#isim-note-cancel').on('click', () => $('#isim-note-panel').removeClass('open'));
    $('#isim-note-save').on('click', saveNote);

    $('#isim-botnote-btn').on('click', () => {
        $('#isim-note-panel').removeClass('open');
        const s = getSettings();
        const fid = state.activeFriend?.id;
        if (fid) $('#isim-botnote-ta').val(s.botNotes[fid] || '');
        $('#isim-botnote-panel').toggleClass('open');
    });
    $('#isim-botnote-cancel').on('click', () => $('#isim-botnote-panel').removeClass('open'));
    $('#isim-botnote-save').on('click', () => {
        const s = getSettings();
        const fid = state.activeFriend?.id;
        if (!fid) return;
        s.botNotes[fid] = $('#isim-botnote-ta').val().trim();
        persistSettings();
        $('#isim-botnote-panel').removeClass('open');
        showToast('Bot note saved');
    });

    $('#isim-bg-btn').on('click', () => $('#isim-bg-input').trigger('click'));
    $('#isim-btn-sticker').on('click', () => {
        renderStickerPanel();
        $('#isim-sticker-panel').toggleClass('open');
    });
    $('#isim-btn-image').on('click', () => $('#isim-image-input').trigger('click'));
    $('#isim-btn-audio').on('click', () => $('#isim-audio-input').trigger('click'));
    $('#isim-btn-location').on('click', shareLocation);
    $('#isim-btn-transfer').on('click', () => openSheet('transfer'));
    $('#isim-transfer-confirm').on('click', confirmTransfer);
}

async function sendUserMessage() {
    if (!state.activeFriend) { showToast('Select a contact first'); return; }
    const inp = $('#isim-chat-input');
    const text = inp.val().trim();
    if (!text) return;
    inp.val('').css('height', 'auto');
    const msg = { from: 'user', type: 'text', content: text, time: formatTime(new Date()) };
    appendMsg(msg);
    saveMsg(msg);
    botReply(text);
}

async function botReply(userText) {
    if (!state.activeFriend || state.isTyping) return;
    state.isTyping = true;

    const typingId = 'isim-typing-' + Date.now();
    $('#isim-messages').append(`
      <div class="isim-msg-row in" id="${typingId}">
        <img class="isim-msg-av" src="${escHtml(state.activeFriend.avatar||'')}" alt="">
        <div class="isim-typing-dots"><span></span><span></span><span></span></div>
      </div>`);
    const el = document.getElementById('isim-messages');
    if (el) el.scrollTop = el.scrollHeight;

    try {
        const s = getSettings();
        const f = state.activeFriend;
        let playerName = 'ผู้ใช้';
        try {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
                const ctx = SillyTavern.getContext();
                if (ctx && ctx.name1) playerName = ctx.name1;
            }
        } catch(e) {}

        const history = (s.chatHistory[f.id] || []).slice(-12).map(m => ({
            role: m.from === 'user' ? 'user' : 'assistant',
            content: m.type === 'text' ? m.content : `[${m.type}]`
        }));
        if (userText) history.push({ role: 'user', content: userText });
        else history.push({ role: 'user', content: '(ส่งสัญญาณ)' });

        const sys = `คุณคือ ${f.name}. ${f.persona||''}
คุณกำลังส่ง SMS คุยกับ ${playerName}
${s.notes[f.id] ? `โน้ตจากผู้ใช้: ${s.notes[f.id]}` : ''}
${s.botNotes[f.id] ? `คำสั่งพิเศษ: ${s.botNotes[f.id]}` : ''}
ตอบเป็นภาษาไทยเท่านั้น สั้นกระชับเหมือน SMS จริง ไม่เกิน 3 ประโยค ห้ามใช้อีโมจิ ห้ามบอกว่าตัวเองเป็น AI`;

        const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, system: sys, messages: history })
        });
        const data = await r.json();
        const reply = data.content?.map(c => c.text||'').join('') || '...';

        $(`#${typingId}`).remove();
        state.isTyping = false;
        const botMsg = { from: 'bot', type: 'text', content: reply, time: formatTime(new Date()) };
        appendMsg(botMsg);
        saveMsg(botMsg);
        if (state.callActive) showCallFloatText(reply);

    } catch(e) {
        $(`#${typingId}`).remove();
        state.isTyping = false;
        appendMsg({ from: 'bot', type: 'text', content: 'ขอโทษ เกิดข้อผิดพลาด', time: formatTime(new Date()) });
    }
}

function retryLast() {
    const s = getSettings();
    const fid = state.activeFriend?.id;
    if (!fid) return;
    const hist = s.chatHistory[fid] || [];
    while (hist.length && hist[hist.length-1].from === 'bot') hist.pop();
    persistSettings();
    $('#isim-messages').html('');
    hist.forEach(m => appendMsg(m, false));
    const last = [...hist].reverse().find(m => m.from === 'user');
    botReply(last?.content || '');
}

function cancelBot() {
    if (state.isTyping) {
        state.isTyping = false;
        $('.isim-typing-dots').parent().remove();
        showToast('Cancelled');
    } else {
        const s = getSettings();
        const fid = state.activeFriend?.id;
        if (!fid) return;
        const hist = s.chatHistory[fid] || [];
        if (hist.length && hist[hist.length-1].from === 'bot') {
            hist.pop();
            persistSettings();
            $('#isim-messages .isim-msg-row.in').last().remove();
            showToast('Last bot message removed');
        }
    }
}

function saveNote() {
    const s = getSettings();
    const fid = state.activeFriend?.id;
    if (!fid) return;
    const text = $('#isim-note-ta').val().trim();
    const old = s.notes[fid];
    s.notes[fid] = text;
    persistSettings();
    $('#isim-note-panel').removeClass('open');
    const msg = { from: 'user', type: 'note', content: text, author: 'user', time: formatTime(new Date()) };
    appendMsg(msg); saveMsg(msg);
    showToast('Note saved');
    if (old !== text && text) setTimeout(() => botReply(`[ผู้ใช้อัปเดตโน้ต: "${text}"]`), 800);
}

function renderStickerPanel() {
    const s = getSettings();
    const inner = $('#isim-sticker-inner');
    inner.html('');
    (s.stickers || []).forEach(st => {
        if (st.startsWith('data:') || st.startsWith('http')) {
            inner.append(`<div class="isim-sticker-item" data-img="${st}"><img src="${st}" style="width:44px;height:44px;object-fit:contain"></div>`);
        } else {
            inner.append(`<div class="isim-sticker-item" data-emoji="${st}">${st}</div>`);
        }
    });
    inner.append(`<div class="isim-sticker-add" id="isim-sticker-add-btn">+</div>`);
    $('#isim-sticker-add-btn').on('click', () => $('#isim-sticker-input').trigger('click'));
}

function bindStickerAndMediaEvents() {
    $(document).on('click', '.isim-sticker-item', function() {
        if (!state.activeFriend) return;
        const img = $(this).data('img');
        const emoji = $(this).data('emoji');
        const msg = img
            ? { from:'user', type:'sticker-img', content:img, time: formatTime(new Date()) }
            : { from:'user', type:'sticker', content:emoji, time: formatTime(new Date()) };
        appendMsg(msg); saveMsg(msg);
        botReply(img ? '[ผู้ใช้ส่งสติ๊กเกอร์]' : `[ผู้ใช้ส่งสติ๊กเกอร์ ${emoji}]`);
        $('#isim-sticker-panel').removeClass('open');
    });

    $('#isim-sticker-input').on('change', function() {
        const f = this.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = e => {
            const s = getSettings();
            s.stickers.push(e.target.result);
            persistSettings(); renderStickerPanel(); showToast('Sticker added');
        };
        r.readAsDataURL(f); this.value = '';
    });

    $('#isim-image-input').on('change', function() {
        const f = this.files[0]; if (!f || !state.activeFriend) return;
        const r = new FileReader();
        r.onload = e => {
            const msg = { from:'user', type:'image', content:e.target.result, time: formatTime(new Date()) };
            appendMsg(msg); saveMsg(msg); botReply('[ผู้ใช้ส่งรูปภาพ]');
        };
        r.readAsDataURL(f); this.value = '';
    });

    $('#isim-audio-input').on('change', function() {
        const f = this.files[0]; if (!f || !state.activeFriend) return;
        const r = new FileReader();
        r.onload = e => {
            const msg = { from:'user', type:'audio', content:e.target.result, time: formatTime(new Date()) };
            appendMsg(msg); saveMsg(msg); botReply('[ผู้ใช้ส่งคลิปเสียง]');
        };
        r.readAsDataURL(f); this.value = '';
    });
}

function shareLocation() {
    if (!state.activeFriend) return;
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => sendLocationMsg(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`),
            () => sendLocationMsg('Bangkok, Thailand')
        );
    } else sendLocationMsg('Bangkok, Thailand');
}

function sendLocationMsg(loc) {
    const msg = { from:'user', type:'location', content:loc, time: formatTime(new Date()) };
    appendMsg(msg); saveMsg(msg); botReply(`[ผู้ใช้แชร์โลเคชั่น: ${loc}]`);
}

function confirmTransfer() {
    const amt = $('#isim-transfer-amount').val();
    const note = $('#isim-transfer-note').val();
    if (!amt || Number(amt) <= 0) { showToast('Enter amount'); return; }
    const msg = { from:'user', type:'transfer', content:{ amount:amt, note }, time: formatTime(new Date()) };
    appendMsg(msg); saveMsg(msg);
    closeSheet();
    $('#isim-transfer-amount, #isim-transfer-note').val('');
    showToast('Transfer sent');
    botReply(`[ผู้ใช้โอนเงิน ${amt} บาท]`);
}

// ============================================================
// CALL
// ============================================================
function bindCallEvents() {
    $('#isim-end-btn').on('click', endCall);
    $('#isim-mute-btn').on('click', () => {
        state.callMuted = !state.callMuted;
        $('#isim-mute-circle').toggleClass('active', state.callMuted);
        showToast(state.callMuted ? 'Muted' : 'Unmuted');
    });
    $('#isim-call-send').on('click', sendCallMsg);
    $('#isim-call-input').on('keydown', e => { if (e.key==='Enter') sendCallMsg(); });
}

function startCall() {
    if (!state.activeFriend) { showToast('Select a contact first'); return; }
    const f = state.activeFriend;
    $('#isim-call-bg').css('background-image', `url(${f.avatar||''})`);
    $('#isim-call-avatar').attr('src', f.avatar||'');
    $('#isim-call-name').text(f.name);
    $('#isim-call-status').text('Calling...');
    $('#isim-call-timer').text('0:00');
    $('#isim-call-float').html('');
    $('#isim-call-screen').addClass('active');
    state.callActive = true;
    state.callTimer = 0;
    setTimeout(() => {
        if (!state.callActive) return;
        $('#isim-call-status').text('Connected');
        state.callTimerInterval = setInterval(() => {
            state.callTimer++;
            const m = Math.floor(state.callTimer/60);
            const s = state.callTimer%60;
            $('#isim-call-timer').text(`${m}:${String(s).padStart(2,'0')}`);
        }, 1000);
        showCallFloatText('สวัสดี รับสายได้เลย');
    }, 1500);
}

function endCall() {
    if (!state.callActive) return;
    state.callActive = false;
    clearInterval(state.callTimerInterval);
    $('#isim-call-screen').removeClass('active');
    showToast('Call ended');
}

async function sendCallMsg() {
    const inp = $('#isim-call-input');
    const text = inp.val().trim();
    if (!text) return;
    inp.val('');
    showCallFloatText(text, true);
    try {
        const f = state.activeFriend;
        const r = await fetch('https://api.anthropic.com/v1/messages', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
                model:'claude-sonnet-4-20250514', max_tokens:1000,
                system:`คุณคือ ${f.name}. ${f.persona||''} กำลังคุยโทรศัพท์ ตอบสั้นๆ ภาษาไทย ไม่เกิน 2 ประโยค`,
                messages:[{role:'user',content:text}]
            })
        });
        const d = await r.json();
        const reply = d.content?.map(c=>c.text||'').join('')||'...';
        if (state.callActive) showCallFloatText(reply);
    } catch(e) {}
}

function showCallFloatText(text, isUser=false) {
    const c = $('#isim-call-float');
    c.html('');
    let delay = 0;
    text.split(' ').forEach(word => {
        c.append(`<span class="isim-float-word" style="animation-delay:${delay}ms;${isUser?'opacity:.5;font-size:15px':''}">${escHtml(word)} </span>`);
        delay += Math.max(80, word.length * 60);
    });
    setTimeout(() => { if (state.callActive) c.html(''); }, delay + 2000);
}

// ============================================================
// FRIENDS / CONTACTS
// ============================================================
function bindFriendsEvents() {
    $('#isim-friends-refresh').on('click', loadFriendsList);
    $(document).on('input', '#isim-friends-search', function() {
        const q = $(this).val().toLowerCase();
        $('.isim-friend-item').each(function() {
            $(this).toggle($(this).find('.isim-friend-name').text().toLowerCase().includes(q));
        });
    });
    $(document).on('click', '.isim-friend-add', function() {
        const fid = $(this).data('fid');
        const bots = $('#isim-friends-list').data('bots') || [];
        const bot = bots.find(b => b.id === fid);
        if (!bot) return;
        const s = getSettings();
        if (!s.friends.find(f => f.id === fid)) {
            s.friends.push(bot);
            persistSettings();
            state.activeFriend = bot;
            showToast(`${bot.name} added`);
            loadFriendsList();
        }
    });
    $(document).on('click', '.isim-friend-item', function() {
        const fid = $(this).data('fid');
        const s = getSettings();
        const f = s.friends.find(f => f.id === fid);
        if (f) { state.activeFriend = f; openApp('messages'); }
    });
}

function loadFriendsList() {
    const $list = $('#isim-friends-list');
    $list.html('<div style="padding:20px;text-align:center;color:var(--isim-text3);font-size:13px">Loading...</div>');

    let bots = [];
    try {
        if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
            const ctx = SillyTavern.getContext();
            if (ctx?.characters?.length) {
                bots = ctx.characters.filter(c=>!c.isUser).map(c => ({
                    id: c.avatar || c.name,
                    name: c.name,
                    avatar: c.avatar ? `/characters/${c.avatar}` : '',
                    persona: c.description || c.personality || '',
                }));
            }
        }
    } catch(e) {}

    if (!bots.length) {
        bots = [
            { id:'demo-1', name:'Aria', avatar:'', persona:'A friendly assistant.' },
            { id:'demo-2', name:'Kai', avatar:'', persona:'Cool and laid back.' },
        ];
    }

    $list.html('');
    const s = getSettings();
    const added = new Set((s.friends||[]).map(f=>f.id));

    bots.forEach(bot => {
        const isAdded = added.has(bot.id);
        $list.append(`
          <div class="isim-friend-item" data-fid="${escHtml(bot.id)}" style="cursor:${isAdded?'pointer':'default'}">
            <img class="isim-friend-av" src="${escHtml(bot.avatar)}" alt="" onerror="this.style.visibility='hidden'">
            <div class="isim-friend-info">
              <div class="isim-friend-name">${escHtml(bot.name)}</div>
              <div class="isim-friend-desc">${escHtml(bot.persona?.substring(0,60)||'')}</div>
            </div>
            ${isAdded
              ? `<span class="isim-friend-badge">Added ✓</span>`
              : `<button class="isim-friend-add" data-fid="${escHtml(bot.id)}">Add</button>`}
          </div>`);
    });
    $list.data('bots', bots);
}

// ============================================================
// TWITTER / TWEETER
// ============================================================
function bindTwitterEvents() {
    $(document).on('click', '.isim-tw-tab', function() {
        const tab = $(this).data('tab');
        $('.isim-tw-tab').removeClass('active');
        $(this).addClass('active');
        $('.isim-tw-page').removeClass('active');
        $(`#isim-tw-${tab}-page`).addClass('active');
        if (tab==='trends') renderTrends();
        if (tab==='profile') renderProfile();
        if (tab==='notifs') { renderNotifs(); $('#isim-tw-notif-count').hide(); }
    });
    $('#isim-compose-input').on('input', function() {
        $('#isim-compose-send').prop('disabled', !$(this).val().trim());
    });
    $('#isim-compose-send').on('click', composeTweet);
    $('#isim-tw-notif-btn').on('click', () => {
        $('.isim-tw-tab').removeClass('active');
        $('.isim-tw-tab[data-tab="notifs"]').addClass('active');
        $('.isim-tw-page').removeClass('active');
        $('#isim-tw-notifs-page').addClass('active');
        renderNotifs();
        $('#isim-tw-notif-count').hide();
    });
    $(document).on('click', '.isim-tweet-like', function(e) {
        e.stopPropagation();
        const tid = $(this).closest('[data-tid]').data('tid');
        toggleLike(tid, this);
    });
    $(document).on('click', '.isim-tweet-repost', function(e) {
        e.stopPropagation();
        const tid = $(this).closest('[data-tid]').data('tid');
        toggleRepost(tid, this);
    });
    $(document).on('click', '.isim-tweet-item', function() {
        const tid = $(this).data('tid');
        if (tid) { state.currentTweetId = tid; renderThread(tid); $('#isim-thread-screen').addClass('active'); }
    });
    $('#isim-thread-reply-send').on('click', sendThreadReply);
}

function getFeed() {
    const s = getSettings();
    if (!s.tweetFeed || !s.tweetFeed.length) {
        s.tweetFeed = [
            { id:100, from:'bot', author:'Aria', handle:'@aria_ai', text:'สวัสดีวันใหม่ทุกคน วันนี้อากาศดีมาก', likes:12, reposts:3, views:450, comments:[], liked:false, reposted:false, time:'9:00 AM' },
            { id:101, from:'bot', author:'Kai', handle:'@kai_cool', text:'เพิ่งดูหนังมา ดีมากเลย แนะนำสุดๆ', likes:8, reposts:1, views:200, comments:[], liked:false, reposted:false, time:'8:30 AM' },
        ];
        s.tweetIdCounter = 102;
        persistSettings();
    }
    return s.tweetFeed;
}

function buildTweetHTML(tw) {
    const s = getSettings();
    let av = '';
    if (tw.from !== 'user') {
        const f = (s.friends||[]).find(f=>f.name===tw.author);
        av = f?.avatar||'';
    } else {
        try {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
                const ctx = SillyTavern.getContext();
                if (ctx?.user_avatar) av = `/User Avatars/${ctx.user_avatar}`;
            }
        } catch(e) {}
    }
    return `<div class="isim-tweet-item" data-tid="${tw.id}">
      <img class="isim-tweet-av" src="${escHtml(av)}" alt="" onerror="this.style.visibility='hidden'">
      <div class="isim-tweet-body">
        <div class="isim-tweet-header">
          <span class="isim-tweet-name">${escHtml(tw.author)}</span>
          <span class="isim-tweet-handle">${escHtml(tw.handle)}</span>
          <span class="isim-tweet-time">${escHtml(tw.time||'')}</span>
        </div>
        <div class="isim-tweet-text">${escHtml(tw.text)}</div>
        <div class="isim-tweet-actions">
          <button class="isim-tweet-like ${tw.liked?'liked':''}">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span>${tw.likes}</span>
          </button>
          <button class="isim-tweet-repost ${tw.reposted?'reposted':''}">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
            <span>${tw.reposts}</span>
          </button>
          <span style="color:var(--isim-text3);font-size:12px">👁 ${tw.views}</span>
          <span style="color:var(--isim-text3);font-size:12px">💬 ${(tw.comments||[]).length}</span>
        </div>
      </div>
    </div>`;
}

function renderTweetFeed() {
    const feed = getFeed();
    const $feed = $('#isim-tweet-feed');
    $feed.html('');
    // user avatar
    try {
        if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
            const ctx = SillyTavern.getContext();
            if (ctx?.user_avatar) {
                $('#isim-compose-avatar, #isim-profile-avatar, #isim-thread-compose-avatar').attr('src', `/User Avatars/${ctx.user_avatar}`);
            }
            const s = getSettings();
            if (ctx?.name) { s.userName = ctx.name; s.userHandle = '@' + ctx.name.toLowerCase().replace(/\s+/g,'_'); }
        }
    } catch(e) {}
    [...feed].reverse().forEach(tw => $feed.append(buildTweetHTML(tw)));
}

async function composeTweet() {
    const text = $('#isim-compose-input').val().trim();
    if (!text) return;
    const s = getSettings();
    const tw = {
        id: s.tweetIdCounter++,
        from: 'user',
        author: s.userName || 'Me',
        handle: s.userHandle || '@user',
        text, likes:0, reposts:0, views:0, comments:[], liked:false, reposted:false,
        time: formatTime(new Date())
    };
    s.tweetFeed.push(tw);
    persistSettings();
    $('#isim-compose-input').val('');
    $('#isim-compose-send').prop('disabled', true);
    renderTweetFeed();
    showToast('Posted!');
    setTimeout(() => botReactToTweet(tw), 3000);
}

async function botReactToTweet(tw) {
    const s = getSettings();
    const bots = (s.friends||[]);
    if (!bots.length) return;
    const bot = bots[Math.floor(Math.random()*bots.length)];
    try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
                model:'claude-sonnet-4-20250514', max_tokens:1000,
                system:`คุณคือ ${bot.name}. ${bot.persona||''} คอมเมนต์ในทวีต ตอบภาษาไทย สั้น 1 ประโยค`,
                messages:[{role:'user',content:`ทวีต: "${tw.text}"`}]
            })
        });
        const d = await r.json();
        const reply = d.content?.map(c=>c.text||'').join('')||'...';
        tw.comments = tw.comments||[];
        tw.comments.push({ author:bot.name, handle:`@${bot.name.toLowerCase()}`, text:reply, time: formatTime(new Date()) });
        tw.views += Math.floor(Math.random()*50)+10;
        persistSettings();
        addNotif({ type:'reply', text:`${bot.name} replied to your post`, time: formatTime(new Date()) });
        renderTweetFeed();
    } catch(e) {}
}

function toggleLike(tid, btn) {
    const s = getSettings();
    const tw = s.tweetFeed.find(t=>t.id===tid);
    if (!tw) return;
    tw.liked = !tw.liked;
    tw.likes += tw.liked?1:-1;
    persistSettings();
    $(btn).toggleClass('liked', tw.liked).find('span').text(tw.likes);
}

function toggleRepost(tid, btn) {
    const s = getSettings();
    const tw = s.tweetFeed.find(t=>t.id===tid);
    if (!tw) return;
    tw.reposted = !tw.reposted;
    tw.reposts += tw.reposted?1:-1;
    persistSettings();
    $(btn).toggleClass('reposted', tw.reposted).find('span').text(tw.reposts);
    if (tw.reposted) showToast('Reposted');
}

function renderThread(tweetId) {
    const s = getSettings();
    const tw = s.tweetFeed.find(t=>t.id===tweetId);
    if (!tw) return;
    const $c = $('#isim-thread-content');
    $c.html(`
      <div style="padding:14px;border-bottom:0.5px solid var(--isim-separator)">
        <div style="display:flex;gap:10px;align-items:flex-start">
          <div style="width:40px;height:40px;border-radius:50%;background:var(--isim-bg3)"></div>
          <div>
            <div style="font-weight:700;font-size:15px;color:var(--isim-text);font-family:-apple-system,sans-serif">${escHtml(tw.author)}</div>
            <div style="font-size:13px;color:var(--isim-text3)">${escHtml(tw.handle)}</div>
          </div>
        </div>
        <div style="font-size:17px;margin-top:10px;color:var(--isim-text);font-family:-apple-system,sans-serif">${escHtml(tw.text)}</div>
        <div style="margin-top:10px;display:flex;gap:16px;font-size:13px;color:var(--isim-text3)">
          <span>${tw.reposts} Reposts</span><span>${tw.likes} Likes</span><span>${tw.views} Views</span>
        </div>
      </div>
      ${(tw.comments||[]).map(c=>`
        <div style="padding:12px 14px;border-bottom:0.5px solid var(--isim-separator);display:flex;gap:10px">
          <div style="width:34px;height:34px;border-radius:50%;background:var(--isim-bg3);flex-shrink:0"></div>
          <div>
            <span style="font-weight:600;font-size:13px;color:var(--isim-text);font-family:-apple-system,sans-serif">${escHtml(c.author)}</span>
            <span style="font-size:12px;color:var(--isim-text3);margin-left:4px">${escHtml(c.handle)}</span>
            <div style="font-size:14px;color:var(--isim-text);font-family:-apple-system,sans-serif;margin-top:2px">${escHtml(c.text)}</div>
          </div>
        </div>`).join('')}
    `);
}

async function sendThreadReply() {
    const text = $('#isim-thread-reply-input').val().trim();
    if (!text || !state.currentTweetId) return;
    const s = getSettings();
    const tw = s.tweetFeed.find(t=>t.id===state.currentTweetId);
    if (!tw) return;
    tw.comments = tw.comments||[];
    tw.comments.push({ author:s.userName||'Me', handle:s.userHandle||'@user', text, time: formatTime(new Date()) });
    persistSettings();
    $('#isim-thread-reply-input').val('');
    renderThread(state.currentTweetId);
    showToast('Reply sent');
    setTimeout(() => botReactToTweet(tw), 2000);
}

function renderTrends() {
    const trends = ['#ภาษาไทย','#SillyTavern','#AI','#โปรแกรม','#ชีวิตดี','#เทคโนโลยี','#มือถือ','#แชทบอท'];
    $('#isim-trends-list').html(trends.map((t,i)=>`
      <div style="padding:12px 16px;border-bottom:0.5px solid var(--isim-separator)">
        <div style="font-size:11px;color:var(--isim-text3)">Trending #${i+1}</div>
        <div style="font-size:15px;font-weight:700;color:var(--isim-text)">${t}</div>
      </div>`).join(''));
}

function renderProfile() {
    const s = getSettings();
    const myTweets = (s.tweetFeed||[]).filter(t=>t.from==='user');
    $('#isim-profile-name').text(s.userName||'Me');
    $('#isim-profile-handle').text(s.userHandle||'@user');
    $('#isim-profile-tweets').text(myTweets.length);
    $('#isim-profile-likes').text(myTweets.reduce((a,t)=>a+(t.likes||0),0));
    const $feed = $('#isim-profile-feed');
    $feed.html('');
    [...myTweets].reverse().forEach(tw=>$feed.append(buildTweetHTML(tw)));
}

function renderNotifs() {
    const s = getSettings();
    const $list = $('#isim-notifs-list');
    const notifs = s.notifications||[];
    if (!notifs.length) {
        $list.html('<div style="padding:30px;text-align:center;color:var(--isim-text3);font-size:13px">No notifications yet</div>');
        return;
    }
    $list.html(notifs.map(n=>`
      <div style="padding:12px 16px;border-bottom:0.5px solid var(--isim-separator);display:flex;gap:10px;align-items:center">
        <span style="font-size:20px">${n.type==='like'?'❤️':n.type==='repost'?'🔁':'💬'}</span>
        <div>
          <div style="font-size:13px;color:var(--isim-text)">${escHtml(n.text)}</div>
          <div style="font-size:11px;color:var(--isim-text3)">${escHtml(n.time||'')}</div>
        </div>
      </div>`).join(''));
}

function addNotif(n) {
    const s = getSettings();
    s.notifications = s.notifications||[];
    s.notifications.unshift(n);
    if (s.notifications.length > 50) s.notifications.pop();
    persistSettings();
    const count = $('#isim-tw-notif-count');
    const cur = parseInt(count.text())||0;
    count.text(cur+1).show();
}

// ============================================================
// SHEETS
// ============================================================
function openSheet(name) {
    state.openSheet = name;
    $(`#isim-${name}-sheet`).addClass('open');
    $('#isim-sheet-backdrop').addClass('open');
}
function closeSheet() {
    if (state.openSheet) $(`#isim-${state.openSheet}-sheet`).removeClass('open');
    $('#isim-sheet-backdrop').removeClass('open');
    state.openSheet = null;
}

// ============================================================
// TOAST + UTILS
// ============================================================
function showToast(msg) {
    $('#isim-toast').text(msg).addClass('show');
    setTimeout(() => $('#isim-toast').removeClass('show'), 2000);
}
function formatTime(d) {
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function escHtml(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
