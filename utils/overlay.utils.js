(() => {
    // Global Configs
    window.overlayConfig = window.overlayConfig || {
        // Hold over from old websocket connection
        SB: { 
            HOST: '127.0.0.1', 
            PORT: 8080, 
            AUTO_CONNECT:true
        },
        ALERTS: { 
            MAX_STACK: 3, 
            ALERT_LIFETIME_MS: 7000, 
            SHOW_TIMER_BAR: true, 
            BAR_POS: 'Top', 
            BAR_THICKNESS: 10 
        }
    };

    // DOM Helpers >> Research more
    const query = (sel, el=document)=> el.querySelector(sel); // Select this specific element
    const array = (sel, el=document)=> Array.from(el.querySelectorAll(sel)); // Select all elements of this type

    // Math / Format Helpers
    const clamp = (n, a, b)=> Math.max(a, Math.min(b,n)); // keep between 2 values (b,n)
    const mmss = (sec)=>{ // convert seconds into minutes:seconds
        sec = Math.max(0, Math.floor(sec||0));
        const m = String(Math.floor(sec/60)).padStart(2, '0');
        const s = String(sec%60).padStart(2, '0');
        return `${m}:${s}`;
    };

    // Performant Event Bus
    class Emitter extends EventTarget{
        on(type, fn){ this.addEventListener(type, fn); return this; }
        off(type, fn){ this.removeEventListener(type, fn); return this }
        emit(type, detail){ this.dispatchEvent(new CustomEvent(type, { detail })); }
    }

    // Expose Event Bus
    window.overlayBus = window.overlayBus || new Emitter();
    window.overlayKit = {
        query, array, clamp, mmss,
        Bus: window.overlayBus
    };
})();