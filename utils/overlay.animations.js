(() => {
    // Overlay Kit v1 — Data-tagged animations & effects (no external deps)
    const { query, array, Bus, clamp } = window.overlayKit;
    const scrambleLoops = new WeakMap();

    // Per-char scrambler (used by titles/labels)
    const POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_<>/\\|#%$*";
    async function scrambleTo(node, text, dur=420){
    const prev = node.textContent || "";
    const len = Math.max(prev.length, text.length);
    const ticks = Math.max(10, Math.round(dur/42));
    const q = Array.from({length:len}, (_,i)=>{
        const from = prev[i] || "", to = text[i] || "";
        const start = Math.floor(Math.random()*Math.min(10, ticks*0.2));
        const end = start + Math.floor(ticks*0.6) + Math.floor(Math.random()*10);
        return {from, to, start, end, ch:""};
    });

    let t = 0;
    return new Promise(res=>{
        function tick(){
        let out="", done=0;
        for(const s of q){
            if (t>=s.end){ out+=s.to; done++; }
            else if (t>=s.start){ s.ch = POOL[(Math.random()*POOL.length)|0]; out+=s.ch; }
            else out += s.from;
        }
        node.textContent = out;
        if (done===q.length) return res();
        t++; requestAnimationFrame(tick);
        }
        tick();
    });
    }

    // Effect registry
    const FX = {
        "fade-in": (el, opts={})=>{
            el.style.opacity = '0';
            el.style.transition = `opacity ${opts.dur||300}ms ${opts.ease||'ease-out'}`;
            requestAnimationFrame(()=> el.style.opacity='1');
        },
        "slide-up": (el, opts={})=>{
            el.style.opacity='0'; el.style.transform='translateY(10px)';
            const d = opts.dur||300;
            el.style.transition = `opacity ${d}ms, transform ${d}ms`;
            requestAnimationFrame(()=>{ el.style.opacity='1'; el.style.transform='none'; });
        },
        "pulse": (el, opts={})=>{
            const count = opts.count || 2, dur = opts.dur || 600;
            let i=0;
            function step(){
            el.style.transition = `text-shadow ${dur}ms`;
            el.classList.add('u-glow');
            setTimeout(()=>{
                el.classList.remove('u-glow');
                if (++i < count) setTimeout(step, 80);
            }, dur);
            }
            step();
        },
        "scramble": async (el, opts={})=>{
            const loop = opts.loop !== false;
            const delay = opts.delay ?? 10;
            const queue = ()=> {
                overlayFX.scrambleTo(el, to, opts.dur || 10000).finally(()=> {
                    if (loop && document.body.contains(el)) {
                        const id = setTimeout(queue, delay);
                        scrambleLoops.set(el, id);
                    }
                });
            };

            clearTimeout(scrambleLoops.get(el));
            scrambleLoops.delete(el);

            const to = opts.text ?? el.getAttribute('data-text') ?? el.textContent ?? "";
            queue();
        },
        "bar:to": (el, opts={})=>{
            const fill = el.querySelector('.fill') || el;
            const pct = clamp(Number(opts.pct ?? el.getAttribute('data-pct') ?? 0), 0, 100);
            fill.style.width = pct + '%';
        },

    };

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
            uGrid: { value: new THREE.Vector2(54, 7) },
            uSoft: { value: 0.12 },
            uJitter: { value: 0.015 }
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

    // Parse JSON from data-fx-opts
    function parseOpts(s){ try{ return s ? JSON.parse(s) : {}; }catch{ return {}; } }

    // Apply effects from data-fx (space or comma separated)
    function applyFx(el){
    const list = (el.getAttribute('data-fx')||'').split(/[,\s]+/).filter(Boolean);
    const opts = parseOpts(el.getAttribute('data-fx-opts'));
    for(const name of list){
        const fn = FX[name];
        if (typeof fn === 'function') { try{ fn(el, opts); }catch(e){ console.warn('[FX]', name, e); } }
    }
    }

    // Auto-run on load and for dynamically added nodes
    function init(){
    array('[data-fx]').forEach(applyFx);
    const mo = new MutationObserver(muts=>{
        for(const m of muts){
        m.addedNodes && m.addedNodes.forEach(n=>{
            if (!(n instanceof Element)) return;
            if (n.hasAttribute('data-fx')) applyFx(n);
            n.querySelectorAll && n.querySelectorAll('[data-fx]').forEach(applyFx);
        });
        }
    });
    mo.observe(document.documentElement, { childList:true, subtree:true });
    }
    window.addEventListener('DOMContentLoaded', init);

    // Expose helpers
    window.overlayFX = { 
        applyFx, 
        scrambleTo,
        DistortionMask,
        MosaicFallback,
        createMask(cardEl) {
            const mask = new DistortionMask(cardEl);
            return mask.enabled ? { mask, fallback: null } : { mask: null, fallback: new MosaicFallback(cardEl)};
        } 
    };
})();