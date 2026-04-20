// === Notification System (Mobile-optimized) ===
const NotificationManager = {
    permission: 'default',
    soundEnabled: true,
    notifEnabled: true,
    audioUnlocked: false,
    sounds: {},

    async init() {
        if ('Notification' in window) {
            this.permission = Notification.permission;
            if (this.permission === 'default') {
                const result = await Notification.requestPermission();
                this.permission = result;
            }
        }

        // Pre-generate all sounds as WAV blobs
        this.sounds.break = this.createAudioElement(this.generateChime());
        this.sounds.work = this.createAudioElement(this.generateBeep());
        this.sounds.alert = this.createAudioElement(this.generateAlarm());

        // Unlock audio on first user touch (required by mobile browsers)
        const unlock = () => {
            if (this.audioUnlocked) return;
            // Play silent sound on each Audio element to unlock it
            Object.values(this.sounds).forEach(audio => {
                audio.volume = 0;
                audio.play().then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = 1;
                }).catch(() => {});
            });
            this.audioUnlocked = true;
            // Also unlock vibration with a tiny pulse
            if ('vibrate' in navigator) {
                navigator.vibrate(1);
            }
        };

        ['touchstart', 'touchend', 'click', 'pointerdown'].forEach(evt => {
            document.addEventListener(evt, unlock, { once: false, passive: true });
        });
    },

    async requestPermission() {
        if ('Notification' in window && this.permission !== 'granted') {
            const result = await Notification.requestPermission();
            this.permission = result;
            return result === 'granted';
        }
        return this.permission === 'granted';
    },

    // === WAV Generator ===
    // Generates a WAV file as a Blob URL (works on lock screen unlike AudioContext)
    generateWav(samples, sampleRate) {
        const numSamples = samples.length;
        const buffer = new ArrayBuffer(44 + numSamples * 2);
        const view = new DataView(buffer);

        // WAV header
        const writeStr = (offset, str) => {
            for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        };
        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + numSamples * 2, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, 1, true); // mono
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeStr(36, 'data');
        view.setUint32(40, numSamples * 2, true);

        for (let i = 0; i < numSamples; i++) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(44 + i * 2, s * 0x7FFF, true);
        }

        return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
    },

    generateTone(freq, duration, volume, sampleRate) {
        const samples = [];
        const numSamples = Math.floor(sampleRate * duration);
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            const envelope = Math.min(1, (duration - t) * 8) * Math.min(1, t * 50);
            samples.push(Math.sin(2 * Math.PI * freq * t) * volume * envelope);
        }
        return samples;
    },

    generateChime() {
        // Pleasant ascending chime (C5 - E5 - G5)
        const rate = 22050;
        let samples = [];
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, i) => {
            const silence = new Array(Math.floor(rate * 0.18 * i)).fill(0);
            const tone = this.generateTone(freq, 0.6, 0.4, rate);
            if (i === 0) {
                samples = tone;
            } else {
                // Mix with existing
                while (samples.length < silence.length + tone.length) samples.push(0);
                for (let j = 0; j < tone.length; j++) {
                    samples[silence.length + j] = (samples[silence.length + j] || 0) + tone[j];
                }
            }
        });
        // Normalize
        const max = Math.max(...samples.map(Math.abs));
        if (max > 1) samples = samples.map(s => s / max);
        return this.generateWav(samples, rate);
    },

    generateBeep() {
        // Double beep at 440Hz
        const rate = 22050;
        const beep1 = this.generateTone(440, 0.25, 0.35, rate);
        const gap = new Array(Math.floor(rate * 0.15)).fill(0);
        const beep2 = this.generateTone(440, 0.25, 0.35, rate);
        return this.generateWav([...beep1, ...gap, ...beep2], rate);
    },

    generateAlarm() {
        // Urgent alternating alarm 800Hz/600Hz
        const rate = 22050;
        let samples = [];
        for (let i = 0; i < 4; i++) {
            const freq = i % 2 === 0 ? 800 : 600;
            samples.push(...this.generateTone(freq, 0.2, 0.45, rate));
            if (i < 3) samples.push(...new Array(Math.floor(rate * 0.05)).fill(0));
        }
        return this.generateWav(samples, rate);
    },

    createAudioElement(src) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        // Force playback through speaker even in silent mode (iOS hint)
        audio.setAttribute('playsinline', '');
        audio.volume = 1;
        return audio;
    },

    // === Play Sound ===
    playSound(type) {
        if (!this.soundEnabled) return;

        const audio = this.sounds[type];
        if (!audio) return;

        try {
            audio.currentTime = 0;
            audio.volume = 1;
            const playPromise = audio.play();
            if (playPromise) {
                playPromise.catch(() => {
                    // If blocked, try recreating and playing
                    console.log('Audio play blocked for:', type);
                });
            }
        } catch (e) {
            console.log('Audio error:', e);
        }
    },

    // === Vibrate ===
    vibrate(pattern) {
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {}
        }
    },

    // === Send Notification ===
    send(title, body, type = 'break') {
        // Play sound first (works even when locked if audio was unlocked)
        this.playSound(type);

        // Vibrate based on type
        if (type === 'alert') {
            this.vibrate([400, 200, 400, 200, 600]);
        } else if (type === 'break') {
            this.vibrate([300, 100, 300, 100, 500]);
        } else {
            this.vibrate([200, 100, 200]);
        }

        if (!this.notifEnabled || this.permission !== 'granted') return;

        try {
            // Service worker notifications (persist in background + lock screen)
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification(title, {
                        body: body,
                        tag: 'moveup-' + type,
                        renotify: true,
                        requireInteraction: type === 'alert',
                        vibrate: type === 'alert'
                            ? [400, 200, 400, 200, 600]
                            : [300, 100, 300],
                        silent: false,
                        actions: type === 'break' ? [
                            { action: 'open', title: 'Ouvrir MoveUp' }
                        ] : []
                    });
                });
            } else {
                const notif = new Notification(title, {
                    body: body,
                    tag: 'moveup-' + type,
                    requireInteraction: type === 'alert',
                    silent: false
                });

                notif.onclick = () => {
                    window.focus();
                    notif.close();
                };

                setTimeout(() => notif.close(), 15000);
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
    },

    notifyMoveReminder(count, suggestion) {
        this.send(
            `🔔 Rappel ${count}/2 — Tu n'as pas encore bougé !`,
            suggestion || 'Allez, 2 minutes suffisent pour se dégourdir les jambes !',
            'alert'
        );
    }
};
