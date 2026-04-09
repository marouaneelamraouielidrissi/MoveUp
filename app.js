// === MoveUp - Main Application (PWA Mobile) ===

const App = {
    // State
    state: 'idle', // idle, working, paused, onBreak
    phase: 'work', // work, shortBreak, longBreak
    currentSession: 1,
    timeRemaining: 0,
    totalTime: 0,
    timerInterval: null,
    sedentaryInterval: null,
    lastMoveTime: Date.now(),
    wakeLock: null,
    deferredInstallPrompt: null,

    // Settings (defaults)
    settings: {
        workDuration: 45,
        shortBreak: 5,
        longBreak: 15,
        sessionsBeforeLong: 4,
        notificationsEnabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
        autoStart: false,
        sedentaryAlert: 60,
        sedentaryEnabled: true,
        wakeLockEnabled: false
    },

    // DOM Elements
    els: {},

    async init() {
        this.cacheElements();
        this.loadSettings();
        this.bindEvents();
        this.registerServiceWorker();
        this.handleInstallPrompt();
        await NotificationManager.init();
        this.updateTimerDisplay();
        this.renderActivities('all');
        this.updateStats();
        this.startSedentaryTracker();
        this.updateMotivation();

        // Sync notification settings
        NotificationManager.soundEnabled = this.settings.soundEnabled;
        NotificationManager.notifEnabled = this.settings.notificationsEnabled;
    },

    // === PWA ===
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('sw.js');
            } catch (e) {
                console.log('SW registration skipped:', e);
            }
        }
    },

    handleInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredInstallPrompt = e;
            document.getElementById('install-btn').classList.remove('hidden');
        });

        window.addEventListener('appinstalled', () => {
            document.getElementById('install-btn').classList.add('hidden');
            this.deferredInstallPrompt = null;
        });
    },

    async promptInstall() {
        if (!this.deferredInstallPrompt) return;
        this.deferredInstallPrompt.prompt();
        const result = await this.deferredInstallPrompt.userChoice;
        if (result.outcome === 'accepted') {
            document.getElementById('install-btn').classList.add('hidden');
        }
        this.deferredInstallPrompt = null;
    },

    // === Wake Lock ===
    async requestWakeLock() {
        if (!this.settings.wakeLockEnabled) return;
        if (!('wakeLock' in navigator)) return;
        try {
            this.wakeLock = await navigator.wakeLock.request('screen');
            this.wakeLock.addEventListener('release', () => {
                this.wakeLock = null;
            });
        } catch (e) {
            console.log('Wake Lock not available:', e);
        }
    },

    releaseWakeLock() {
        if (this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
        }
    },

    // === Vibration ===
    vibrate(pattern) {
        if (!this.settings.vibrationEnabled) return;
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    },

    cacheElements() {
        this.els = {
            timerTime: document.getElementById('timer-time'),
            timerPhase: document.getElementById('timer-phase'),
            timerSession: document.getElementById('timer-session'),
            timerProgress: document.querySelector('.timer-ring-progress'),
            btnStart: document.getElementById('btn-start'),
            btnPause: document.getElementById('btn-pause'),
            btnResume: document.getElementById('btn-resume'),
            btnSkip: document.getElementById('btn-skip'),
            btnReset: document.getElementById('btn-reset'),
            motivationText: document.getElementById('motivation-text'),
            motivationCard: document.getElementById('motivation-card'),
            activitiesGrid: document.getElementById('activities-grid'),
            breakOverlay: document.getElementById('break-overlay'),
            breakTitle: document.getElementById('break-title'),
            breakSuggestion: document.getElementById('break-suggestion'),
            breakEmoji: document.getElementById('break-emoji'),
            breakTimerDisplay: document.getElementById('break-timer-display'),
            btnEndBreak: document.getElementById('btn-end-break'),
            sedentaryOverlay: document.getElementById('sedentary-overlay'),
            sedentaryTimeMsg: document.getElementById('sedentary-time-msg'),
            sedentaryTip: document.getElementById('sedentary-tip'),
            btnStartMoving: document.getElementById('btn-start-moving'),
            btnSnooze: document.getElementById('btn-snooze'),
            weeklyChart: document.getElementById('weekly-chart'),
            historyList: document.getElementById('history-list')
        };
    },

    bindEvents() {
        // Bottom tab bar navigation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.vibrate(10);
                this.switchView(tab.dataset.view);
            });
        });

        // Install button
        document.getElementById('install-btn').addEventListener('click', () => {
            this.promptInstall();
        });

        // Timer controls
        this.els.btnStart.addEventListener('click', () => { this.vibrate(20); this.startTimer(); });
        this.els.btnPause.addEventListener('click', () => { this.vibrate(10); this.pauseTimer(); });
        this.els.btnResume.addEventListener('click', () => { this.vibrate(20); this.resumeTimer(); });
        this.els.btnSkip.addEventListener('click', () => { this.vibrate(10); this.skipPhase(); });
        this.els.btnReset.addEventListener('click', () => { this.vibrate(10); this.resetTimer(); });

        // Break overlay
        this.els.btnEndBreak.addEventListener('click', () => { this.vibrate(30); this.endBreak(); });

        // Sedentary overlay
        this.els.btnStartMoving.addEventListener('click', () => { this.vibrate(30); this.startMovingFromAlert(); });
        this.els.btnSnooze.addEventListener('click', () => { this.vibrate(10); this.snoozeSedentary(); });

        // Activity filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.vibrate(10);
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderActivities(btn.dataset.filter);
            });
        });

        // Settings sliders
        this.bindSetting('work-duration', 'workDuration', v => `${v} min`);
        this.bindSetting('short-break', 'shortBreak', v => `${v} min`);
        this.bindSetting('long-break', 'longBreak', v => `${v} min`);
        this.bindSetting('sessions-before-long', 'sessionsBeforeLong', v => v);
        this.bindSetting('sedentary-alert', 'sedentaryAlert', v => `${v} min`);

        // Settings toggles
        this.bindToggle('notif-toggle', 'notificationsEnabled', v => {
            NotificationManager.notifEnabled = v;
            if (v) NotificationManager.requestPermission();
        });
        this.bindToggle('sound-toggle', 'soundEnabled', v => {
            NotificationManager.soundEnabled = v;
        });
        this.bindToggle('vibration-toggle', 'vibrationEnabled');
        this.bindToggle('auto-start', 'autoStart');
        this.bindToggle('sedentary-toggle', 'sedentaryEnabled');
        this.bindToggle('wakelock-toggle', 'wakeLockEnabled', v => {
            if (v && this.state === 'working') this.requestWakeLock();
            else this.releaseWakeLock();
        });

        // Reset stats button
        document.getElementById('btn-reset-stats').addEventListener('click', () => {
            if (confirm('Réinitialiser toutes les statistiques ?')) {
                StatsManager.resetAll();
                this.updateStats();
            }
        });

        // Title update when tab hidden/visible
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.state === 'working') {
                this.updateTitle();
            } else {
                document.title = 'MoveUp - Rappel de Pauses Actives';
                // Re-acquire wake lock when returning to app
                if (!document.hidden && this.state === 'working') {
                    this.requestWakeLock();
                }
            }
        });
    },

    bindSetting(elementId, settingKey, formatter) {
        const input = document.getElementById(elementId);
        const display = document.getElementById(elementId + '-val');
        input.value = this.settings[settingKey];
        display.textContent = formatter(this.settings[settingKey]);

        input.addEventListener('input', () => {
            const val = parseInt(input.value);
            this.settings[settingKey] = val;
            display.textContent = formatter(val);
            this.saveSettings();

            if (this.state === 'idle') {
                this.updateTimerDisplay();
            }
        });
    },

    bindToggle(elementId, settingKey, callback) {
        const input = document.getElementById(elementId);
        input.checked = this.settings[settingKey];

        input.addEventListener('change', () => {
            this.settings[settingKey] = input.checked;
            this.saveSettings();
            if (callback) callback(input.checked);
        });
    },

    loadSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem('moveup_settings'));
            if (saved) Object.assign(this.settings, saved);
        } catch {}
    },

    saveSettings() {
        localStorage.setItem('moveup_settings', JSON.stringify(this.settings));
    },

    // === Navigation ===
    switchView(viewName) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewName + '-view').classList.add('active');

        // Update tabs
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.tab[data-view="${viewName}"]`).classList.add('active');

        if (viewName === 'stats') this.updateStats();
        if (viewName === 'activities') this.renderActivities(
            document.querySelector('.filter-btn.active')?.dataset.filter || 'all'
        );
    },

    // === Timer Logic ===
    startTimer() {
        this.phase = 'work';
        this.currentSession = 1;
        this.totalTime = this.settings.workDuration * 60;
        this.timeRemaining = this.totalTime;
        this.state = 'working';
        this.lastMoveTime = Date.now();

        this.requestWakeLock();
        this.updateTimerUI();
        this.tick();
        this.timerInterval = setInterval(() => this.tick(), 1000);
        this.updateMotivation();
    },

    pauseTimer() {
        this.state = 'paused';
        clearInterval(this.timerInterval);
        this.releaseWakeLock();
        this.updateTimerUI();
    },

    resumeTimer() {
        this.state = 'working';
        this.requestWakeLock();
        this.timerInterval = setInterval(() => this.tick(), 1000);
        this.updateTimerUI();
    },

    skipPhase() {
        clearInterval(this.timerInterval);
        this.phaseComplete();
    },

    resetTimer() {
        clearInterval(this.timerInterval);
        this.state = 'idle';
        this.phase = 'work';
        this.currentSession = 1;
        this.releaseWakeLock();
        this.updateTimerDisplay();
        this.updateTimerUI();
        this.updateMotivation();
    },

    tick() {
        if (this.timeRemaining <= 0) {
            clearInterval(this.timerInterval);
            this.phaseComplete();
            return;
        }

        this.timeRemaining--;
        this.updateTimerDisplay();
        this.updateTitle();
    },

    phaseComplete() {
        if (this.phase === 'work') {
            StatsManager.recordSession(this.settings.workDuration);
            this.vibrate([200, 100, 200, 100, 400]); // Strong vibration pattern
            this.showBreak();
        } else {
            const breakMins = this.phase === 'longBreak'
                ? this.settings.longBreak
                : this.settings.shortBreak;
            StatsManager.recordBreak(breakMins, 'Pause active');

            this.hideBreakOverlay();
            this.vibrate([100, 50, 100]);

            if (this.phase === 'longBreak') {
                this.currentSession = 1;
            } else {
                this.currentSession++;
            }

            this.phase = 'work';
            this.totalTime = this.settings.workDuration * 60;
            this.timeRemaining = this.totalTime;
            this.lastMoveTime = Date.now();

            NotificationManager.notifyWorkStart(this.currentSession);

            if (this.settings.autoStart) {
                this.state = 'working';
                this.requestWakeLock();
                this.timerInterval = setInterval(() => this.tick(), 1000);
            } else {
                this.state = 'idle';
                this.releaseWakeLock();
            }

            this.updateTimerDisplay();
            this.updateTimerUI();
            this.updateMotivation();
            this.updateStats();
        }
    },

    showBreak() {
        const isLong = this.currentSession >= this.settings.sessionsBeforeLong;
        this.phase = isLong ? 'longBreak' : 'shortBreak';
        const breakMins = isLong ? this.settings.longBreak : this.settings.shortBreak;

        this.totalTime = breakMins * 60;
        this.timeRemaining = this.totalTime;
        this.state = 'working';

        const suggestion = getRandomBreakSuggestion();
        this.els.breakEmoji.textContent = suggestion.emoji;
        this.els.breakTitle.textContent = isLong
            ? '🎉 Pause longue méritée !'
            : 'C\'est l\'heure de bouger !';
        this.els.breakSuggestion.textContent = suggestion.text;

        NotificationManager.notifyBreakStart(suggestion.text);

        this.els.breakOverlay.classList.remove('hidden');
        this.updateBreakTimer();
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateBreakTimer();
            this.updateTimerDisplay();

            if (this.timeRemaining <= 0) {
                clearInterval(this.timerInterval);
                this.phaseComplete();
            }
        }, 1000);
    },

    updateBreakTimer() {
        const m = Math.floor(this.timeRemaining / 60);
        const s = this.timeRemaining % 60;
        this.els.breakTimerDisplay.textContent =
            `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    endBreak() {
        clearInterval(this.timerInterval);
        const actualMins = Math.round((this.totalTime - this.timeRemaining) / 60) || 1;
        StatsManager.recordBreak(actualMins, 'Pause active');

        this.hideBreakOverlay();
        this.lastMoveTime = Date.now();

        if (this.phase === 'longBreak') {
            this.currentSession = 1;
        } else {
            this.currentSession++;
        }

        this.phase = 'work';
        this.totalTime = this.settings.workDuration * 60;
        this.timeRemaining = this.totalTime;

        this.state = 'working';
        this.requestWakeLock();
        this.timerInterval = setInterval(() => this.tick(), 1000);

        this.updateTimerDisplay();
        this.updateTimerUI();
        this.updateMotivation();
        this.updateStats();
    },

    hideBreakOverlay() {
        this.els.breakOverlay.classList.add('hidden');
    },

    // === Sedentary Tracker ===
    startSedentaryTracker() {
        this.sedentaryInterval = setInterval(() => {
            if (!this.settings.sedentaryEnabled) return;
            if (this.state === 'onBreak') return;

            const minutesSinceMove = (Date.now() - this.lastMoveTime) / 60000;
            if (minutesSinceMove >= this.settings.sedentaryAlert) {
                this.showSedentaryAlert(Math.round(minutesSinceMove));
            }
        }, 60000);
    },

    showSedentaryAlert(minutes) {
        this.vibrate([300, 200, 300, 200, 500]); // Urgent vibration
        NotificationManager.notifySedentary(minutes);
        this.els.sedentaryTimeMsg.textContent =
            `Cela fait plus de ${minutes} minutes sans bouger.`;

        const tips = [
            "Lève-toi et fais quelques pas, même 2 minutes font la différence.",
            "Étire-toi debout : bras en l'air, touche tes pieds.",
            "Va prendre un verre d'eau, ton corps en a besoin.",
            "Regarde par la fenêtre au loin pour reposer tes yeux.",
            "Fais 10 squats sur place, ça relance la circulation !"
        ];
        this.els.sedentaryTip.textContent = tips[Math.floor(Math.random() * tips.length)];
        this.els.sedentaryOverlay.classList.remove('hidden');
    },

    startMovingFromAlert() {
        this.els.sedentaryOverlay.classList.add('hidden');
        this.lastMoveTime = Date.now();
        StatsManager.recordBreak(2, 'Pause sédentarité');
        this.updateStats();
    },

    snoozeSedentary() {
        this.els.sedentaryOverlay.classList.add('hidden');
        this.lastMoveTime = Date.now() - (this.settings.sedentaryAlert - 10) * 60000;
    },

    // === UI Updates ===
    updateTimerDisplay() {
        const time = this.state === 'idle' && this.phase === 'work'
            ? this.settings.workDuration * 60
            : this.timeRemaining;

        const m = Math.floor(time / 60);
        const s = time % 60;
        this.els.timerTime.textContent =
            `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

        // Update ring progress
        const total = this.totalTime || this.settings.workDuration * 60;
        const progress = time / total;
        const circumference = 2 * Math.PI * 120;
        const offset = circumference * (1 - progress);
        this.els.timerProgress.style.strokeDasharray = circumference;
        this.els.timerProgress.style.strokeDashoffset = offset;

        // Update phase label and colors
        const isBreak = this.phase !== 'work';
        this.els.timerPhase.textContent = isBreak
            ? (this.phase === 'longBreak' ? 'Pause longue' : 'Pause courte')
            : 'Travail';
        this.els.timerPhase.classList.toggle('break-mode', isBreak);
        this.els.timerProgress.classList.toggle('break-mode', isBreak);

        this.els.timerSession.textContent =
            `Session ${this.currentSession}/${this.settings.sessionsBeforeLong}`;
    },

    updateTimerUI() {
        const { btnStart, btnPause, btnResume, btnSkip, btnReset } = this.els;

        btnStart.classList.toggle('hidden', this.state !== 'idle');
        btnPause.classList.toggle('hidden', this.state !== 'working');
        btnResume.classList.toggle('hidden', this.state !== 'paused');
        btnSkip.classList.toggle('hidden', this.state === 'idle');
        btnReset.classList.toggle('hidden', this.state === 'idle');
    },

    updateTitle() {
        if (this.state === 'working' && document.hidden) {
            const m = Math.floor(this.timeRemaining / 60);
            const s = this.timeRemaining % 60;
            const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            const phase = this.phase === 'work' ? '💻' : '🚶';
            document.title = `${phase} ${timeStr} - MoveUp`;
        }
    },

    updateMotivation() {
        this.els.motivationText.textContent = getRandomQuote();
    },

    // === Activities ===
    renderActivities(filter) {
        const activities = getActivityByCategory(filter);
        this.els.activitiesGrid.innerHTML = activities.map(a => `
            <div class="activity-card" data-id="${a.id}">
                <span class="activity-emoji">${a.emoji}</span>
                <div class="activity-name">${a.name}</div>
                <div class="activity-duration">${a.duration} min · ~${a.calories} cal</div>
                <span class="activity-tag tag-${a.category}">
                    ${a.category === 'marche' ? '🚶 Marche' :
                      a.category === 'etirement' ? '🧘 Étirement' :
                      a.category === 'exercice' ? '💪 Exercice' :
                      '🌬️ Respiration'}
                </span>
            </div>
        `).join('');

        this.els.activitiesGrid.querySelectorAll('.activity-card').forEach(card => {
            card.addEventListener('click', () => {
                this.vibrate(15);
                const activity = ACTIVITIES.find(a => a.id === parseInt(card.dataset.id));
                if (activity) this.startQuickBreak(activity);
            });
        });
    },

    startQuickBreak(activity) {
        this.els.breakEmoji.textContent = activity.emoji;
        this.els.breakTitle.textContent = activity.name;
        this.els.breakSuggestion.textContent = activity.description;

        this.totalTime = activity.duration * 60;
        this.timeRemaining = this.totalTime;
        this.updateBreakTimer();

        this.els.breakOverlay.classList.remove('hidden');

        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateBreakTimer();

            if (this.timeRemaining <= 0) {
                clearInterval(this.timerInterval);
                this.vibrate([100, 50, 100, 50, 200]);
                StatsManager.recordBreak(activity.duration, activity.name);
                this.hideBreakOverlay();
                this.lastMoveTime = Date.now();
                this.updateStats();
                NotificationManager.playSound('work');
            }
        }, 1000);
    },

    // === Stats ===
    updateStats() {
        const data = StatsManager.getToday();

        document.getElementById('stat-sessions').textContent = data.today.sessions;
        document.getElementById('stat-breaks').textContent = data.today.breaks;
        document.getElementById('stat-work-time').textContent =
            StatsManager.formatMinutes(data.today.workMinutes);
        document.getElementById('stat-move-time').textContent =
            StatsManager.formatMinutes(data.today.moveMinutes);
        document.getElementById('streak-count').textContent = data.streak;

        // Weekly chart
        const weekly = StatsManager.getWeeklyData();
        const maxSessions = Math.max(...weekly.map(d => d.sessions), 1);

        this.els.weeklyChart.innerHTML = weekly.map(day => {
            const height = (day.sessions / maxSessions) * 80 + 10;
            return `
                <div class="chart-bar-wrapper">
                    <span class="chart-value">${day.sessions || ''}</span>
                    <div class="chart-bar ${day.isToday ? 'today' : ''}"
                         style="height: ${day.sessions > 0 ? height : 4}px"></div>
                    <span class="chart-label">${day.label}</span>
                </div>
            `;
        }).join('');

        // History
        const history = data.today.history.slice().reverse().slice(0, 10);
        this.els.historyList.innerHTML = history.length > 0
            ? history.map(item => `
                <div class="history-item">
                    <span class="history-icon">${item.type === 'work' ? '💻' : '🚶'}</span>
                    <div class="history-info">
                        <div class="title">${item.type === 'work'
                            ? `Session de travail (${item.duration} min)`
                            : item.activity || 'Pause active'}</div>
                        <div class="time">${item.time}</div>
                    </div>
                </div>
            `).join('')
            : '<p style="color: var(--text-dim); text-align: center; padding: 20px;">Aucune activité aujourd\'hui. Lance ta première session !</p>';
    }
};

// === Initialize ===
document.addEventListener('DOMContentLoaded', () => App.init());
