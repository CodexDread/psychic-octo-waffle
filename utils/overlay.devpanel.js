/*!
 * Overlay Dev Panel v1
 * Drop-in UI to monitor OverlayKit.Bus events in real time.
 * Requires OverlayKit (overlay.utils.js) OR pass a custom { bus }.
 */
(function(){
  const W = window;
  const DOC = document;

  // Public API container
  const API_NAME = 'OverlayDevPanel';
  if (W[API_NAME]) return; // singleton

  const DEFAULTS = {
    bus: (W.OverlayKit && W.OverlayKit.Bus) || null,
    max: 200,                  // max rows kept
    follow: true,              // autoscroll log
    paused: false,             // start paused
    startCollapsed: false,     // collapsed UI body
    hotkey: 'ctrl+alt+d',      // toggle visibility
    queryParam: 'debug',       // show if ?debug in URL
    queryTruthy: ['1','true'], // values considered "true"
    trackSB: true              // flip status on sb:connected
  };

  // --- Utilities ---
  function nowStr(){
    const d = new Date();
    return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3,'0');
  }
  function safeJson(v){
    try{
      return JSON.stringify(v, (k,val)=>{
        if (typeof val === 'string' && val.length > 240) return val.slice(0,240)+'…';
        return val;
      });
    }catch{
      return String(v);
    }
  }
  function parseHotkey(s){ return String(s).toLowerCase().replace(/\s+/g,''); }
  function matchHotkey(e, combo){
    combo = parseHotkey(combo);
    const key = e.key.toLowerCase();
    const needCtrl = combo.includes('ctrl+');
    const needAlt  = combo.includes('alt+');
    const needShift= combo.includes('shift+');
    const last = combo.split('+').pop();
    return (!!e.ctrlKey===needCtrl) && (!!e.altKey===needAlt) && (!!e.shiftKey===needShift) && (key===last);
  }
  function qsHasTrue(name, truthy){
    try{
      const q = new URLSearchParams(location.search);
      if (!q.has(name)) return false;
      const v = q.get(name);
      return (v==='' || truthy.includes(String(v).toLowerCase()));
    }catch{ return false; }
  }

  // --- Panel class ---
  class DevPanel {
    constructor(opts={}){
      this.opts = Object.assign({}, DEFAULTS, opts);
      this.bus  = this.opts.bus;
      this.el   = null;
      this.css  = null;
      this.state = {
        paused: !!this.opts.paused,
        follow: !!this.opts.follow,
        filterText: '',
        filterRe: null,
        mounted: false,
        visible: null
      };
      this._emit0 = null; // original emit
      this._onKey = this._onKey.bind(this);
      this._dragMM = null;
      this._onSB = this._onSB.bind(this);
    }

    mount(){
      if (this.state.mounted) return this;
      if (!this.bus){
        console.warn('[DevPanel] No bus provided; pass { bus } or load overlay.util.js first.');
        return this;
      }

      // DOM
      this.el = DOC.createElement('div');
      this.el.id = 'ok-devpanel';
      this.el.innerHTML = `
        <div class="hdr" title="Drag me">
          <span class="title">OverlayKit Dev</span>
          <span class="status" id="okdp-status">offline</span>
          <span class="spacer"></span>
          <button class="btn" id="okdp-pause" title="Pause/Resume">⏸</button>
          <button class="btn" id="okdp-clear" title="Clear log">🧹</button>
          <button class="btn" id="okdp-ping"  title="Emit dev:ping">⚡</button>
          <button class="btn" id="okdp-collapse" title="Collapse/Expand">▾</button>
        </div>
        <div class="tools">
          <label>Filter: <input id="okdp-filter" placeholder="alerts:* or text or /regex/"></label>
          <label class="chk"><input type="checkbox" id="okdp-follow" ${this.state.follow?'checked':''}> follow</label>
          <span class="count" id="okdp-count">0</span>
        </div>
        <div class="log" id="okdp-log"></div>
      `;
      DOC.body.appendChild(this.el);

      // CSS
      this.css = DOC.createElement('style');
      this.css.textContent = `
      #ok-devpanel{
        position:fixed; right:12px; bottom:12px; width:420px; height:280px;
        background:color-mix(in srgb, var(--bg,#050705), transparent 0%);
        color:var(--fg,#7CFF7C); font-family:var(--font, monospace);
        border:1px dashed var(--border,#2d3a2d); border-radius:10px;
        box-shadow:0 0 12px rgba(0,0,0,.6); z-index:2147483647; display:flex; flex-direction:column;
      }
      #ok-devpanel .hdr{
        display:flex; align-items:center; gap:8px; cursor:move; padding:6px 8px;
        border-bottom:1px dashed var(--border,#2d3a2d); user-select:none; background:rgba(0,0,0,.25);
      }
      #ok-devpanel .title{ font-weight:bold; letter-spacing:.02em; }
      #ok-devpanel .status{ font-size:12px; padding:1px 6px; border:1px dashed var(--border,#2d3a2d); border-radius:6px; opacity:.9;}
      #ok-devpanel .status.ok{ color:var(--accent,#FFBF4D); border-color:var(--accent,#FFBF4D); }
      #ok-devpanel .spacer{ flex:1; }
      #ok-devpanel .btn{
        background:transparent; color:inherit; border:1px dashed var(--border,#2d3a2d);
        border-radius:6px; padding:2px 6px; cursor:pointer; font-family:inherit;
      }
      #ok-devpanel .btn:hover{ filter:brightness(1.2); }
      #ok-devpanel .tools{
        display:flex; align-items:center; gap:8px; padding:6px 8px; border-bottom:1px dashed var(--border,#2d3a2d);
      }
      #ok-devpanel .tools input{
        background:rgba(0,0,0,.35); color:inherit; border:1px dashed var(--border,#2d3a2d);
        border-radius:6px; padding:2px 6px; width:220px;
      }
      #ok-devpanel .tools .chk{ display:flex; align-items:center; gap:6px; font-size:12px; opacity:.9;}
      #ok-devpanel .tools .count{ margin-left:auto; font-size:12px; opacity:.75;}
      #ok-devpanel .log{
        flex:1; overflow:auto; padding:6px 8px; font-size:12px; line-height:1.25; background:rgba(0,0,0,.15);
      }
      #ok-devpanel .row{
        border-bottom:1px dashed color-mix(in srgb, var(--border,#2d3a2d), transparent 35%);
        padding:4px 0;
      }
      #ok-devpanel .row .t{ color:var(--accent,#FFBF4D); opacity:.9; margin-right:6px; }
      #ok-devpanel .row .k{ color:var(--fg,#7CFF7C); font-weight:bold; margin-right:6px; }
      #ok-devpanel .row .d{ color:var(--fg,#7CFF7C); opacity:.85; white-space:pre-wrap; word-break:break-word; }
      #ok-devpanel.collapsed{ height:auto; }
      #ok-devpanel.collapsed .tools, #ok-devpanel.collapsed .log{ display:none; }
      `;
      DOC.head.appendChild(this.css);

      // refs
      this.$ = (q)=> this.el.querySelector(q);
      this.logEl = this.$('#okdp-log');
      this.cntEl = this.$('#okdp-count');
      this.statusEl = this.$('#okdp-status');
      this.btnPause = this.$('#okdp-pause');
      this.btnClear = this.$('#okdp-clear');
      this.btnPing  = this.$('#okdp-ping');
      this.btnColl  = this.$('#okdp-collapse');
      this.inFilter = this.$('#okdp-filter');
      this.ckFollow = this.$('#okdp-follow');

      // events
      this.btnPause.addEventListener('click', ()=> this.setPaused(!this.state.paused));
      this.btnClear.addEventListener('click', ()=> this.clear());
      this.btnPing.addEventListener('click', ()=> this.bus.emit('dev:ping', { ts: Date.now() }));
      this.btnColl.addEventListener('click', ()=> this.toggleCollapsed());
      this.ckFollow.addEventListener('change', ()=> this.setFollow(this.ckFollow.checked));
      this.inFilter.addEventListener('input', ()=> this.setFilter(this.inFilter.value));

      // drag
      this._initDrag();

      // patch emit to intercept
      this._emit0 = this.bus.emit.bind(this.bus);
      this.bus.emit = (type, detail)=>{
        if (!this.state.paused) this._addRow(type, detail);
        return this._emit0(type, detail);
      };

      // SB connection badge
      if (this.opts.trackSB){
        this.bus.addEventListener('sb:connected', this._onSB);
      }

      // hotkey
      DOC.addEventListener('keydown', this._onKey);

      // apply initial UI state
      if (this.opts.startCollapsed) this.el.classList.add('collapsed');
      if (qsHasTrue(this.opts.queryParam, this.opts.queryTruthy)) this.show();
      else this.hide(); // hidden by default unless debug param present

      this.state.mounted = true;
      return this;
    }

    unmount(){
      if (!this.state.mounted) return this;
      // restore emit
      if (this._emit0) { this.bus.emit = this._emit0; this._emit0 = null; }
      // listeners
      DOC.removeEventListener('keydown', this._onKey);
      if (this.opts.trackSB) this.bus.removeEventListener('sb:connected', this._onSB);
      // DOM
      this.el && this.el.remove();
      this.css && this.css.remove();
      this.el = this.css = null;
      this.state.mounted = false;
      return this;
    }

    // --- UI/logic helpers ---
    _onKey(e){
      if (matchHotkey(e, this.opts.hotkey)){
        e.preventDefault();
        (this.state.visible ? this.hide() : this.show());
      }
    }
    _onSB(e){
      const ok = !!(e.detail && e.detail.ok);
      this.statusEl.textContent = ok ? 'online' : 'offline';
      this.statusEl.classList.toggle('ok', ok);
    }
    _initDrag(){
      const header = this.el.querySelector('.hdr');
      let sx=0, sy=0, ox=0, oy=0, dragging=false;
      const mm = (ev)=>{
        if (!dragging) return;
        const nx = ox + (ev.clientX - sx);
        const ny = oy + (ev.clientY - sy);
        this.el.style.right = 'auto'; this.el.style.bottom='auto';
        this.el.style.left  = Math.max(4, Math.min(W.innerWidth  - this.el.offsetWidth  - 4, nx)) + 'px';
        this.el.style.top   = Math.max(4, Math.min(W.innerHeight - this.el.offsetHeight - 4, ny)) + 'px';
      };
      const mu = ()=>{ dragging=false; DOC.removeEventListener('mousemove', mm); };
      const md = (ev)=>{
        dragging=true;
        sx=ev.clientX; sy=ev.clientY;
        const r = this.el.getBoundingClientRect();
        ox=r.left; oy=r.top;
        DOC.addEventListener('mousemove', mm);
        DOC.addEventListener('mouseup', mu, { once:true });
      };
      header.addEventListener('mousedown', md);
      this._dragMM = mm;
    }
    _passesFilter(type, detail){
      const t = this.state.filterText;
      if (!t) return true;
      const block = type + ' ' + safeJson(detail);
      const re = this.state.filterRe;
      if (re) return re.test(type) || re.test(block);
      if (t.includes('*')){
        const rx = new RegExp('^' + t.split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*') + '$', 'i');
        return rx.test(type);
      }
      return block.toLowerCase().includes(t.toLowerCase());
    }
    _addRow(type, detail){
      if (!this._passesFilter(type, detail)) return;
      const row = DOC.createElement('div');
      row.className = 'row';
      row.innerHTML = `<span class="t">${nowStr()}</span><span class="k">${type}</span><span class="d">${safeJson(detail)}</span>`;
      this.logEl.appendChild(row);
      while (this.logEl.children.length > this.opts.max) this.logEl.removeChild(this.logEl.firstChild);
      this.cntEl.textContent = String(this.logEl.children.length);
      if (this.state.follow) this.logEl.scrollTop = this.logEl.scrollHeight;
    }

    // --- Public controls ---
    show(){ if (this.el){ this.el.style.display='flex'; this.state.visible = true; } return this; }
    hide(){ if (this.el){ this.el.style.display='none'; this.state.visible = false; } return this; }
    toggle(){ return this.state.visible ? this.hide() : this.show(); }
    clear(){ if (this.logEl){ this.logEl.innerHTML=''; this.cntEl.textContent='0'; } return this; }
    setPaused(v){
      this.state.paused = !!v;
      if (this.btnPause) this.btnPause.textContent = this.state.paused ? '▶' : '⏸';
      return this;
    }
    setFollow(v){ this.state.follow = !!v; return this; }
    setFilter(v){
      const s = String(v||'').trim();
      this.state.filterText = s;
      this.state.filterRe = null;
      if (s.startsWith('/') && s.endsWith('/') && s.length>2){
        try{ this.state.filterRe = new RegExp(s.slice(1,-1), 'i'); }catch{}
      }
      this.clear(); // new events will render with new filter
      if (this.inFilter && this.inFilter.value!==s) this.inFilter.value=s;
      return this;
    }
    isMounted(){ return !!this.state.mounted; }
  }

  // Expose API
  const API = {
    _inst: null,
    mount(opts){ this._inst = this._inst || new DevPanel(opts); return this._inst.mount(); },
    unmount(){ if (this._inst) this._inst.unmount(); this._inst=null; },
    instance(){ return this._inst; }
  };

  // Auto-mount if OverlayKit exists and query flag present
  W[API_NAME] = API;
  if ((W.overlayKit && W.overlayKit.Bus) && qsHasTrue(DEFAULTS.queryParam, DEFAULTS.queryTruthy)){
    API.mount(); // starts hidden unless ?debug truthy -> show()
  }
})();
