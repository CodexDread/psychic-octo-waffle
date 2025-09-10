function oneOf(...opts) { return opts[Math.floor(Math.random() * opts.length)]; }
// ========================= CONFIG (edit here) =========================
const CONFIG = {
  DEBUG: false,

  // Stack/display
  MAX_STACK: 3,                      // max visible cards at once; others queue
  STACK_POSITION: 'top-left',       // 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  SHOW_SCANLINES: true,

  // Streamer.bot
  SB_HOST: '127.0.0.1',
  SB_PORT: 8080,
  AUTO_CONNECT: true,                // false = never connect (test only)

  // Lifetime & bars
  ALERT_LIFETIME_MS: 7000,           // non-ad alerts auto-hide after this
  SHOW_TIMER_BAR: true,              // show a shrinking bar on non-ad alerts
  BAR_POS: 'Top',                    // 'Top' | 'Bottom' | 'Left' | 'Right'
  BAR_THICKNESS: 10,                 // px

  // Titles & text templates
  TXT: {
    FOLLOW: (u) => oneOf(
      `Uplink handshake complete: ${u}`,
      `Node joined mesh: ${u}  // NH:SYNC`,
      `Access key registered → ${u}`
    ),

    PRIME: (u) => oneOf(
      `Prime route established: ${u}`,
      `Renova.priority grant: ${u}`,
      `Crown key validated (Prime): ${u}`
    ),

    TIER: (u, t) => oneOf(
      `Service level ${t} online: ${u}`,
      `Ionforge retainer ${t} secured: ${u}`,
      `Contract ${t} executed → ${u}`
    ),

    RESUB: (u, m) => oneOf(
      `Continuity ${m} cycles: ${u}`,
      `Contract rollover (${m}m): ${u}`,
      `SLA renewal ${m}m — ${u}`
    ),

    GIFT: (u, c) => oneOf(
      `Bulk keys dispatched ×${c} by ${u}`,
      `Orichal airdrop ×${c} — issuer: ${u}`,
      `Grant bundle ×${c} in ${u}’s name`
    ),

    CHEER: (u, b) => oneOf(
      `Signal boost +${b}μ: ${u}`,
      `Ion credits +${b} issued to channel`,
      `Tipstream +${b} — from ${u}`
    ),

    RAID: (u, v) => oneOf(
      `Allied convoy +${v} — ${u}`,
      `Incursion detected +${v}: ${u}`,
      `Backtrace linked: ${u} leading +${v}`
    ),

    ADRUN: () => oneOf(
      `Commercial uplink engaged  // DataDyne`,
      `Sponsor relay: line open`,
      `Ad channel: sync & broadcast`
    ),

    ADMID: () => oneOf(
      `Midroll payload incoming`,
      `Sponsor relay (mid-stream)`,
      `DataDyne interlude: standby`
    ),
  },

  // chk scramble (per-card, while visible)
  LORE_FOOTER: 'chk=N U L L H O W L',
  SCRAMBLE_LOOP_MS: 1900,

  // Three.js pixel distortion (per-card mask)
  GRID_COLS: 54,
  GRID_ROWS: 7,
  NOISE_JITTER: 0.015,
  EDGE_SOFTNESS: 0.12,
  APPEAR_MS: 650,
  DISAPPEAR_MS: 520,

  // Ad durations (fallback if event lacks length)
  TEST_ADRUN_SEC: 90,
  TEST_ADMID_SEC: 10,

  // Test controls
  SHOW_TEST_UI: true
};
// =====================================================================

/* DOM refs */
const el = {
  stack: document.getElementById('stack'),
  status: document.getElementById('status'),
  testUI: document.getElementById('testUI'),
  scan: document.querySelector('.scan')
};
el.testUI.style.display = CONFIG.SHOW_TEST_UI ? 'flex' : 'none';
el.scan.style.display = CONFIG.SHOW_SCANLINES ? 'block' : 'none';
el.stack.className = ({
  'top-right': 'stack-top-right', 'top-left': 'stack-top-left',
  'bottom-right': 'stack-bottom-right', 'bottom-left': 'stack-bottom-left'
})[CONFIG.STACK_POSITION] || 'stack-top-right';

const log = (...a) => CONFIG.DEBUG && console.log('[ALERTS]', ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const secToMMSS = s => { s = Math.max(0, Math.floor(+s || 0)); const m = Math.floor(s / 60).toString().padStart(1, '0'); const r = (s % 60).toString().padStart(2, '0'); return `${m}:${r}`; };

/* ======================= Distortion mask per card ======================= */
class DistortionMask {
  constructor(cardEl) {
    this.host = document.createElement('div');
    this.host.className = 'glfx';
    cardEl.appendChild(this.host);

    this.enabled = true;
    try {
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' });
      const ctx = this.renderer.getContext();
      if (!ctx) throw new Error('No WebGL');
    } catch (e) {
      this.enabled = false;
      this.host.style.display = 'none';
      return;
    }
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.host.appendChild(this.renderer.domElement);

    const geo = new THREE.PlaneGeometry(2, 2);
    this.uniforms = {
      uTime: { value: 0 },
      uLevel: { value: 1 }, // 1 cover, 0 reveal
      uGrid: { value: new THREE.Vector2(CONFIG.GRID_COLS, CONFIG.GRID_ROWS) },
      uSoft: { value: CONFIG.EDGE_SOFTNESS },
      uJitter: { value: CONFIG.NOISE_JITTER }
    };
    const vert = `precision highp float; varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.0);} `;
    const frag = `
      precision highp float; varying vec2 vUv;
      uniform float uTime, uLevel, uSoft, uJitter; uniform vec2 uGrid;
      float hash21(vec2 p){ p=fract(p*vec2(123.34,345.45)); p+=dot(p,p+34.345); return fract(p.x*p.y); }
      void main(){
        vec2 gridUV=vUv*uGrid; vec2 id=floor(gridUV); vec2 uv=fract(gridUV);
        float rnd=hash21(id);
        vec2 jit=(vec2(hash21(id+7.1),hash21(id+3.7))-0.5)*uJitter*(1.0+0.75*sin(uTime*3.0+rnd*6.2831));
        vec2 cu=clamp(uv+jit,0.0,1.0);
        float keep=step(rnd,uLevel);
        vec2 edge=smoothstep(0.0,uSoft,cu)*smoothstep(0.0,uSoft,1.0-cu);
        float alpha=keep*edge.x*edge.y*(0.9+0.1*sin(uTime*20.0+rnd*12.0));
        gl_FragColor=vec4(0.0,0.0,0.0,alpha);
      }`;
    this.mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: vert, fragmentShader: frag, transparent: true });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.scene.add(this.mesh);

    this._time = 0; this._anim = null; this._running = true;
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(cardEl); this._ro = ro;
    this.resize(); this._loop();
  }
  resize() {
    if (!this.enabled) return;
    const w = this.host.clientWidth || this.host.parentElement.clientWidth || 1;
    const h = this.host.clientHeight || this.host.parentElement.clientHeight || 1;
    this.renderer.setSize(w, h, false);
  }
  _loop() {
    if (!this.enabled || !this._running) return;
    this._time += 0.016;
    this.uniforms.uTime.value = this._time;
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this._loop());
  }
  appear(ms) {
    if (!this.enabled) return Promise.reject('NO_WEBGL');
    if (this._anim) this._anim.pause();
    this.uniforms.uLevel.value = 1.0;
    this.host.style.display = 'block';
    this._anim = anime({ targets: this.uniforms.uLevel, value: 0, duration: ms, easing: 'easeOutCubic' });
    return this._anim.finished || Promise.resolve();
  }
  disappear(ms) {
    if (!this.enabled) return Promise.reject('NO_WEBGL');
    if (this._anim) this._anim.pause();
    this.uniforms.uLevel.value = 0.0;
    this.host.style.display = 'block';
    this._anim = anime({ targets: this.uniforms.uLevel, value: 1, duration: ms, easing: 'easeInCubic' });
    return this._anim.finished || Promise.resolve();
  }
  hide() { this.host.style.display = 'none'; }
  destroy() { this._running = false; this._ro && this._ro.disconnect(); this.renderer && this.renderer.dispose(); this.host.remove(); }
}

/* Fallback mosaic if no WebGL */
class MosaicFallback {
  constructor(cardEl) {
    this.host = document.createElement('div'); this.host.className = 'maskFallback'; cardEl.appendChild(this.host);
    this.cells = []; this.cols = 38; this.rows = 18; this._build();
  }
  _build() {
    this.host.innerHTML = ''; this.cells.length = 0;
    const cw = 100 / this.cols, ch = 100 / this.rows;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const d = document.createElement('div'); d.className = 'cell';
        d.style.left = `${c * cw}%`; d.style.top = `${r * ch}%`; d.style.width = `${cw + 0.2}%`; d.style.height = `${ch + 0.3}%`;
        d.style.opacity = 1; this.host.appendChild(d); this.cells.push(d);
      }
    }
  }
  appear(ms) {
    anime.set(this.cells, { opacity: 1 }); this.host.style.display = 'block';
    const a = anime({ targets: this.cells, opacity: [{ value: 0, duration: ms, easing: 'easeOutQuad' }], delay: anime.stagger(8, { grid: [this.rows, this.cols], from: 'center' }) });
    return a.finished || Promise.resolve();
  }
  disappear(ms) {
    anime.set(this.cells, { opacity: 0 }); this.host.style.display = 'block';
    const a = anime({ targets: this.cells, opacity: [{ value: 1, duration: ms, easing: 'easeInQuad' }], delay: anime.stagger(6, { grid: [this.rows, this.cols], from: 'center' }) });
    return a.finished || Promise.resolve();
  }
  hide() { this.host.style.display = 'none'; }
  destroy() { this.host.remove(); }
}

/* ======================= Card ======================= */
class AlertCard {
  constructor(kind, payload) {
    this.kind = kind;
    this.payload = payload || {};
    this.el = document.createElement('div');
    this.el.className = 'card';
    this.el.innerHTML = `
      <div class="chip">[ ${kind} ]</div>
      <div class="row"><div class="title"></div></div>
      <div class="row"><div class="meta"></div></div>
      <div class="row"><div class="note"></div></div>
      <div class="bar"></div>
      <div class="chk">${CONFIG.LORE_FOOTER}</div>
    `;
    this.title = this.el.querySelector('.title');
    this.meta = this.el.querySelector('.meta');
    this.note = this.el.querySelector('.note');
    this.bar = this.el.querySelector('.bar');
    this.chk = this.el.querySelector('.chk');

    // mask
    this.mask = new DistortionMask(this.el);
    if (!this.mask.enabled) this.fallback = new MosaicFallback(this.el);

    // present content
    this._fill();
  }

  _fill() {
    const d = this.payload, K = this.kind;
    if (K === 'AdRun' || K === 'AdMidRoll') {
      this.title.textContent = K === 'AdRun' ? CONFIG.TXT.ADRUN() : CONFIG.TXT.ADMID();
      const len = clamp(Math.round(d.length || 0) || (K === 'AdRun' ? CONFIG.TEST_ADRUN_SEC : CONFIG.TEST_ADMID_SEC), 5, 7200);
      this.meta.textContent = (K === 'AdMidRoll' && CONFIG.SHOW_MIDROLL_COUNTDOWN) ? `midroll ends in ${secToMMSS(len)}` : `duration ${secToMMSS(len)}`;
      this.note.textContent = d.message ? `“${String(d.message)}”` : 'commercial uplink engaged';
      this._durationMs = len * 1000;
      this._isAd = true;
    } else {
      this._isAd = false;
      let title = '';
      if (K === 'Follow') title = CONFIG.TXT.FOLLOW(d.user || 'someone');
      if (K === 'Prime') title = CONFIG.TXT.PRIME(d.user || 'someone');
      if (K === 'Tier') title = CONFIG.TXT.TIER(d.user || 'someone', d.tier || 'T1');
      if (K === 'ReSub') title = CONFIG.TXT.RESUB(d.user || 'someone', d.months || 1);
      if (K === 'Gift') title = CONFIG.TXT.GIFT(d.user || 'someone', d.count || 1);
      if (K === 'Cheer') title = CONFIG.TXT.CHEER(d.user || 'someone', d.bits || 0);
      if (K === 'Raid') title = CONFIG.TXT.RAID(d.user || 'someone', d.viewers || 0);
      this.title.textContent = title;

      if (K === 'Cheer' && d.message) this.note.textContent = `“${String(d.message)}”`;
      else if ((K === 'Tier' || K === 'ReSub' || K === 'Prime') && d.message) this.note.textContent = `“${String(d.message)}”`;
      else this.note.textContent = d.note || '';
      this.meta.textContent = d.meta || '';
      this._durationMs = CONFIG.ALERT_LIFETIME_MS;
    }

    // lay out bar
    const pos = CONFIG.BAR_POS;
    const b = this.bar; b.style.left = b.style.right = b.style.top = b.style.bottom = ''; b.style.width = b.style.height = '';
    if (pos === 'Top') { b.style.top = '0'; b.style.left = '0'; b.style.right = '0'; b.style.height = CONFIG.BAR_THICKNESS + 'px'; }
    else if (pos === 'Bottom') { b.style.bottom = '0'; b.style.left = '0'; b.style.right = '0'; b.style.height = CONFIG.BAR_THICKNESS + 'px'; }
    else if (pos === 'Left') { b.style.left = '0'; b.style.top = '0'; b.style.bottom = '0'; b.style.width = CONFIG.BAR_THICKNESS + 'px'; }
    else { b.style.right = '0'; b.style.top = '0'; b.style.bottom = '0'; b.style.width = CONFIG.BAR_THICKNESS + 'px'; }
    if (!this._isAd && !CONFIG.SHOW_TIMER_BAR) b.style.display = 'none';
  }

  startScramble() {
    const base = CONFIG.LORE_FOOTER, POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_<>/\\|#%$*";
    this._scr = anime({
      duration: CONFIG.SCRAMBLE_LOOP_MS, easing: 'linear', direction: 'alternate', loop: true,
      update: (a) => { const p = a.progress / 100; let out = ''; for (let i = 0; i < base.length; i++) { out += (Math.random() < p) ? base[i] : POOL[(Math.random() * POOL.length) | 0]; } this.chk.textContent = out; }
    });
  }
  stopScramble() {
    if (this._scr) this._scr.pause();
    const base = CONFIG.LORE_FOOTER;
    return anime({
      targets: { p: 0 }, p: 1, duration: 260, easing: 'easeOutQuad',
      update: (a) => { const p = a.animations[0].currentValue; let out = ''; for (let i = 0; i < base.length; i++) { out += (Math.random() < p) ? base[i] : "*"; } this.chk.textContent = out; },
      complete: () => this.chk.textContent = base
    }).finished || Promise.resolve();
  }

  async appear() {
    // set visible under mask
    anime.set(this.el, { opacity: 1, translateY: 0 });
    try {
      await this.mask.appear(CONFIG.APPEAR_MS);
      this.mask.hide();
    } catch (e) {
      // fallback
      if (!this.fallback) this.fallback = new MosaicFallback(this.el);
      await this.fallback.appear(CONFIG.APPEAR_MS);
      this.fallback.hide();
    }
  }

  async disappear() {
    try {
      await (this.mask ? this.mask.disappear(CONFIG.DISAPPEAR_MS) : Promise.reject('NO_WEBGL'));
      this.mask && this.mask.hide();
    } catch (e) {
      if (!this.fallback) this.fallback = new MosaicFallback(this.el);
      await this.fallback.disappear(CONFIG.DISAPPEAR_MS);
      this.fallback.hide();
    }
    anime.set(this.el, { opacity: 0, translateY: 8 });
  }

  async run() {
    // appear
    await this.appear();
    // scramble begin
    this.startScramble();

    // bar animation
    if (this._isAd) {
      if (CONFIG.BAR_POS === 'Top' || CONFIG.BAR_POS === 'Bottom') {
        anime.set(this.bar, { width: '100%' });
        await (anime({
          targets: this.bar, width: ['100%', '0%'], duration: this._durationMs, easing: 'linear',
          update: (a) => { if (this.kind === 'AdMidRoll') { const remain = Math.ceil(this._durationMs / 1000 - (a.progress / 100) * (this._durationMs / 1000)); this.meta.textContent = `midroll ends in ${secToMMSS(remain)}`; } }
        }).finished || Promise.resolve());
      } else {
        anime.set(this.bar, { height: '100%' });
        await (anime({ targets: this.bar, height: ['100%', '0%'], duration: this._durationMs, easing: 'linear' }).finished || Promise.resolve());
      }
    } else if (CONFIG.SHOW_TIMER_BAR) {
      if (CONFIG.BAR_POS === 'Top' || CONFIG.BAR_POS === 'Bottom') {
        anime.set(this.bar, { width: '100%' });
        await (anime({ targets: this.bar, width: ['100%', '0%'], duration: this._durationMs, easing: 'linear' }).finished || Promise.resolve());
      } else {
        anime.set(this.bar, { height: '100%' });
        await (anime({ targets: this.bar, height: ['100%', '0%'], duration: this._durationMs, easing: 'linear' }).finished || Promise.resolve());
      }
    } else {
      await sleep(this._durationMs);
    }

    // settle chk then disappear
    await this.stopScramble();
    await this.disappear();
  }

  destroy() {
    this._scr && this._scr.pause();
    this.mask && this.mask.destroy();
    this.fallback && this.fallback.destroy();
    this.el.remove();
  }
}

/* ======================= Manager (stack + queue) ======================= */
const active = []; const pending = [];
function pushCard(card) {
  if (active.length < CONFIG.MAX_STACK) {
    showCard(card);
  } else {
    pending.push(card);
  }
}
async function showCard(card) {
  el.stack.appendChild(card.el);
  active.push(card);
  try {
    await card.run();
  } finally {
    // remove from active
    const i = active.indexOf(card); if (i >= 0) active.splice(i, 1);
    card.destroy();
    // pull next if any
    if (pending.length) {
      const next = pending.shift();
      showCard(next);
    }
  }
}

/* ======================= Streamer.bot events ======================= */

//Connect to Streamer.bot Instance
const client = new StreamerbotClient({
  logLevel: 'debug',
  onConnect: (data) => {
    console.log('Streamer.bot Instance', data);
  }
});



/* ======================= Offline test controls ======================= */
if (CONFIG.SHOW_TEST_UI) {
  document.querySelectorAll('.testbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.getAttribute('data-kind');
      if (k === 'Follow') pushCard(new AlertCard('Follow', { user: 'tyber83', note: 'uplink joined' }));
      if (k === 'Prime') pushCard(new AlertCard('Prime', { user: 'nullhowl', message: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent urna nunc, pretium et enim at, viverra dictum tortor. Nulla mollis quis erat eu dapibus. Etiam et volutpat nulla, non dapibus quam. Nulla malesuada dignissim blandit. Sed metus velit, pulvinar vitae cursus ut, suscipit ac lacus. Pellentesque congue ante quam, at venenatis risus scelerisque id. Ut at euismod arcu. Aenean vitae euismod tellus, ac tristique quam. Nunc sit amet ultrices arcu. Nulla arcu dolor, volutpat eu nunc sapien.' }));
      if (k === 'Tier1') pushCard(new AlertCard('Tier', { user: 'datadyne', tier: 'T1', message: 'renewal' }));
      if (k === 'Gift5') pushCard(new AlertCard('Gift', { user: 'orichal', count: 5 }));
      if (k === 'Cheer') pushCard(new AlertCard('Cheer', { user: 'renova', bits: 1337, message: 'forge the wall' }));
      if (k === 'Raid') pushCard(new AlertCard('Raid', { user: 'ionforge', viewers: 42 }));
      if (k === 'AdRun') pushCard(new AlertCard('AdRun', { length: CONFIG.TEST_ADRUN_SEC }));
      if (k === 'AdMidRoll') pushCard(new AlertCard('AdMidRoll', { length: CONFIG.TEST_ADMID_SEC }));
    });
  });
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'f') pushCard(new AlertCard('Follow', { user: 'someone' }));
    if (k === 'p') pushCard(new AlertCard('Prime', { user: 'someone' }));
    if (k === 't') pushCard(new AlertCard('Tier', { user: 'someone', tier: 'T2' }));
    if (k === 'g') pushCard(new AlertCard('Gift', { user: 'someone', count: 3 }));
    if (k === 'c') pushCard(new AlertCard('Cheer', { user: 'someone', bits: 500, message: 'ggs' }));
    if (k === 'r') pushCard(new AlertCard('Raid', { user: 'raider', viewers: 27 }));
    if (k === 'a') pushCard(new AlertCard('AdRun', { length: CONFIG.TEST_ADRUN_SEC }));
    if (k === 'm') pushCard(new AlertCard('AdMidRoll', { length: CONFIG.TEST_ADMID_SEC }));
  });
}
