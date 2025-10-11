(() => {
    // Overlay Kit v1 — Data-tagged animations & effects (no external deps)
    const { query, array, Bus, clamp } = window.overlayKit;

    // Per-char scrambler (used by titles/labels)
    const POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_<>/\\|#%$*";
    async function scrambleTo(node, text, dur=420){
    const prev = node.textContent || "";
    const len = Math.max(prev.length, text.length);
    const ticks = Math.max(10, Math.round(dur/16));
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
        const to = opts.text ?? el.getAttribute('data-text') ?? el.textContent ?? "";
        await scrambleTo(el, String(to), opts.dur||420);
    },
    "bar:to": (el, opts={})=>{
        const fill = el.querySelector('.fill') || el;
        const pct = clamp(Number(opts.pct ?? el.getAttribute('data-pct') ?? 0), 0, 100);
        fill.style.width = pct + '%';
    }
    };

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
    window.overlayFX = { applyFx, scrambleTo };
})();