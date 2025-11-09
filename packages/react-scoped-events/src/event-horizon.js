export function createEventHorizon(log = false) {
    const listeners = new Map();
    const queue = [];
    let processing = false;
    let paused = false;
    function on(type, handler) {
        let set = listeners.get(type);
        if (!set) {
            set = new Set();
            listeners.set(type, set);
        }
        set.add(handler);
        if (log)
            console.debug('[EH] on', type, 'count=', set.size);
        return () => {
            const s = listeners.get(type);
            if (!s)
                return;
            s.delete(handler);
            if (!s.size)
                listeners.delete(type);
            if (log)
                console.debug('[EH] off', type);
        };
    }
    function schedule() {
        if (processing || paused || queue.length === 0)
            return;
        processing = true;
        queueMicrotask(async () => {
            try {
                while (!paused && queue.length) {
                    const { type, payload } = queue.shift();
                    const set = listeners.get(type);
                    if (log)
                        console.debug('[EH] emit->', type, payload, 'handlers=', set?.size ?? 0);
                    if (!set)
                        continue;
                    for (const fn of Array.from(set)) {
                        try {
                            await fn(payload);
                        }
                        catch (e) {
                            console.error('[EH] handler error', e);
                        }
                    }
                }
            }
            finally {
                processing = false;
                if (!paused && queue.length)
                    schedule();
            }
        });
    }
    function emit(type, payload) { queue.push({ type, payload }); schedule(); }
    function pause() { paused = true; }
    function resume() { paused = false; schedule(); }
    return { on, emit, pause, resume, _listeners: listeners, _queue: queue };
}
