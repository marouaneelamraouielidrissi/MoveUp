// === Notification System ===
const NotificationManager = {
    permission: 'default',
    soundEnabled: true,
    notifEnabled: true,
    audioContext: null,

    async init() {
        if ('Notification' in window) {
            this.permission = Notification.permission;
            if (this.permission === 'default') {
                const result = await Notification.requestPermission();
                this.permission = result;
            }
        }
    },

    async requestPermission() {
        if ('Notification' in window && this.permission !== 'granted') {
            const result = await Notification.requestPermission();
            this.permission = result;
            return result === 'granted';
        }
        return this.permission === 'granted';
    },

    playSound(type) {
        if (!this.soundEnabled) return;

        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            const ctx = this.audioContext;
            const now = ctx.currentTime;

            if (type === 'break') {
                // Pleasant chime for break time
                [523.25, 659.25, 783.99].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.15, now + i * 0.2);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.8);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + i * 0.2);
                    osc.stop(now + i * 0.2 + 0.8);
                });
            } else if (type === 'work') {
                // Soft double beep for work start
                [440, 440].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.1, now + i * 0.3);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.3 + 0.3);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + i * 0.3);
                    osc.stop(now + i * 0.3 + 0.3);
                });
            } else if (type === 'alert') {
                // Urgent alert for sedentary warning
                [800, 600, 800, 600].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.12, now + i * 0.15);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.15);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + i * 0.15);
                    osc.stop(now + i * 0.15 + 0.15);
                });
            }
        } catch (e) {
            console.log('Audio not available:', e);
        }
    },

    send(title, body, type = 'break') {
        this.playSound(type);

        if (!this.notifEnabled || this.permission !== 'granted') return;

        try {
            // Use service worker notifications on mobile (persist when app is in background)
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification(title, {
                        body: body,
                        tag: 'moveup-' + type,
                        renotify: true,
                        requireInteraction: type === 'alert',
                        vibrate: type === 'alert' ? [300, 200, 300] : [200, 100, 200],
                        silent: false
                    });
                });
            } else {
                const notif = new Notification(title, {
                    body: body,
                    tag: 'moveup-' + type,
                    requireInteraction: type === 'alert',
                    silent: true
                });

                notif.onclick = () => {
                    window.focus();
                    notif.close();
                };

                setTimeout(() => notif.close(), 10000);
            }
        } catch (e) {
            console.log('Notification error:', e);
        }
    },

    notifyBreakStart(suggestion) {
        this.send(
            '🚶 Temps de bouger !',
            suggestion || 'Lève-toi et fais une petite pause active.',
            'break'
        );
    },

    notifyWorkStart(session) {
        this.send(
            '💻 C\'est reparti !',
            `Session ${session} - Concentre-toi, la prochaine pause arrive bientôt.`,
            'work'
        );
    },

    notifySedentary(minutes) {
        this.send(
            '⚠️ Alerte sédentarité !',
            `Tu es assis(e) depuis ${minutes} minutes. Lève-toi et bouge !`,
            'alert'
        );
    }
};
