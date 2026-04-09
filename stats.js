// === Statistics Manager ===
const StatsManager = {
    STORAGE_KEY: 'moveup_stats',

    getDefaultDay() {
        return {
            date: new Date().toISOString().split('T')[0],
            sessions: 0,
            breaks: 0,
            workMinutes: 0,
            moveMinutes: 0,
            history: []
        };
    },

    load() {
        try {
            const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY));
            if (!data) return this.createFreshData();
            return data;
        } catch {
            return this.createFreshData();
        }
    },

    createFreshData() {
        return {
            today: this.getDefaultDay(),
            weekly: [],
            streak: 0,
            lastActiveDate: null,
            totalSessions: 0,
            totalBreaks: 0
        };
    },

    save(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    },

    getToday() {
        const data = this.load();
        const today = new Date().toISOString().split('T')[0];

        if (data.today.date !== today) {
            // New day - archive yesterday and start fresh
            this.archiveDay(data);
            data.today = this.getDefaultDay();
            this.updateStreak(data);
            this.save(data);
        }

        return data;
    },

    archiveDay(data) {
        if (data.today.sessions > 0) {
            data.weekly.push({
                date: data.today.date,
                sessions: data.today.sessions,
                breaks: data.today.breaks,
                workMinutes: data.today.workMinutes,
                moveMinutes: data.today.moveMinutes
            });
            // Keep only last 30 days
            if (data.weekly.length > 30) {
                data.weekly = data.weekly.slice(-30);
            }
        }
    },

    updateStreak(data) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (data.lastActiveDate === yesterdayStr) {
            data.streak += 1;
        } else if (data.lastActiveDate !== today.toISOString().split('T')[0]) {
            data.streak = 0;
        }
    },

    recordSession(workMinutes) {
        const data = this.getToday();
        data.today.sessions += 1;
        data.today.workMinutes += workMinutes;
        data.totalSessions += 1;
        data.lastActiveDate = new Date().toISOString().split('T')[0];

        data.today.history.push({
            type: 'work',
            duration: workMinutes,
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        });

        this.save(data);
        return data;
    },

    recordBreak(breakMinutes, activity) {
        const data = this.getToday();
        data.today.breaks += 1;
        data.today.moveMinutes += breakMinutes;
        data.totalBreaks += 1;

        data.today.history.push({
            type: 'break',
            duration: breakMinutes,
            activity: activity || 'Pause active',
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        });

        if (data.streak === 0) {
            data.streak = 1;
        }

        this.save(data);
        return data;
    },

    getWeeklyData() {
        const data = this.load();
        const days = [];
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = dayNames[date.getDay()];

            if (dateStr === data.today.date) {
                days.push({
                    label: dayName,
                    sessions: data.today.sessions,
                    isToday: true
                });
            } else {
                const archived = data.weekly.find(d => d.date === dateStr);
                days.push({
                    label: dayName,
                    sessions: archived ? archived.sessions : 0,
                    isToday: false
                });
            }
        }

        return days;
    },

    resetAll() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    formatMinutes(minutes) {
        if (minutes < 60) return `${Math.round(minutes)}m`;
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return `${h}h ${m}m`;
    }
};
