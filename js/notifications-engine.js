/**
 * TravelMate Realtime Journey & Train Timings Notification Engine (js/notifications-engine.js)
 * Manages Web Push Notifications, In-App Notification Center, Train/Flight Boarding Reminders,
 * Station Arrival Stay Windows, and Return Journey Buffer Alerts.
 */

class TravelMateNotificationEngine {
    constructor() {
        this.storageKey = 'travelmate_notifications_history';
        this.notifications = this.loadHistory();
        this.checkIntervalMs = 60 * 1000; // Check every 1 minute
        this.init();
    }

    init() {
        this.setupBellUi();
        this.startPeriodicChecker();
    }

    loadHistory() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) return JSON.parse(stored);
        } catch (e) {
            console.warn('Failed to parse notification history:', e);
        }
        return [];
    }

    saveHistory() {
        try {
            // Keep latest 50 notifications
            if (this.notifications.length > 50) {
                this.notifications = this.notifications.slice(0, 50);
            }
            localStorage.setItem(this.storageKey, JSON.stringify(this.notifications));
            this.updateBellBadge();
        } catch (e) {
            console.error('Failed to save notification history:', e);
        }
    }

    async requestPermission() {
        if (!('Notification' in window)) {
            if (typeof showToast === 'function') showToast('Web Notifications not supported by your browser.', 'warning');
            return false;
        }

        if (Notification.permission === 'granted') {
            if (typeof showToast === 'function') showToast('Notifications are already enabled!', 'info');
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                if (typeof showToast === 'function') showToast('Notifications enabled! You will get train & journey alerts.', 'success');
                this.addNotification({
                    title: '🔔 Journey Notifications Enabled',
                    body: 'You will receive real-time alerts for train departures, station arrivals, and exploring times.',
                    type: 'system',
                    timestamp: new Date().toISOString()
                });
                return true;
            }
        }

        if (typeof showToast === 'function') showToast('Notifications permission was blocked in browser settings.', 'warning');
        return false;
    }

    addNotification(notifData) {
        const notif = {
            id: notifData.id || 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            title: notifData.title || 'TravelMate Alert',
            body: notifData.body || '',
            type: notifData.type || 'info', // 'train', 'trip', 'arrival', 'system'
            tripId: notifData.tripId || null,
            timestamp: notifData.timestamp || new Date().toISOString(),
            read: false
        };

        // Avoid duplicate alerts within 12 hours
        const isDup = this.notifications.some(n => n.title === notif.title && n.tripId === notif.tripId && (Date.now() - new Date(n.timestamp).getTime()) < 12 * 60 * 60 * 1000);
        if (isDup) return;

        this.notifications.unshift(notif);
        this.saveHistory();

        // Dispatch Native Browser Notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                const nativeNotif = new Notification(notif.title, {
                    body: notif.body,
                    icon: 'icon.png',
                    badge: 'icon.png',
                    tag: notif.id
                });
                nativeNotif.onclick = () => {
                    window.focus();
                    if (notif.tripId) {
                        window.location.href = `trip-details.html?id=${notif.tripId}`;
                    }
                };
            } catch (e) {
                console.warn('Native notification failed:', e);
            }
        }

        this.renderNotificationCenter();
    }

    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.saveHistory();
        this.renderNotificationCenter();
    }

    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    startPeriodicChecker() {
        this.checkJourneyMilestones();
        setInterval(() => this.checkJourneyMilestones(), this.checkIntervalMs);
    }

    checkJourneyMilestones() {
        const trips = typeof userTrips !== 'undefined' && userTrips.length > 0 ? userTrips : (window.userTrips || []);
        if (!trips || trips.length === 0) return;

        const now = new Date();

        trips.forEach(trip => {
            if (!trip) return;

            const startDate = trip.startDate ? new Date(trip.startDate) : null;
            const endDate = trip.endDate ? new Date(trip.endDate) : null;

            // 1. Upcoming Trip Alert (24 Hours & 2 Hours prior)
            if (startDate) {
                const msToStart = startDate.getTime() - now.getTime();
                const hrsToStart = msToStart / (1000 * 60 * 60);

                if (hrsToStart > 23 && hrsToStart <= 24) {
                    this.addNotification({
                        title: `🎒 Tomorrow: Trip to ${trip.destination}`,
                        body: `Your journey "${trip.name}" starts in 24 hours! Pack your IDs & tickets.`,
                        type: 'trip',
                        tripId: trip.id
                    });
                } else if (hrsToStart > 1.5 && hrsToStart <= 2.2) {
                    this.addNotification({
                        title: `🚀 Starting Soon: ${trip.name}`,
                        body: `Your trip to ${trip.destination} starts in 2 hours! Check boarding station.`,
                        type: 'trip',
                        tripId: trip.id
                    });
                }
            }

            // 2. Booked Train / Flight Departure Milestone Alerts
            const tickets = trip.tickets || [];
            tickets.forEach(ticket => {
                if (!ticket.departureTime) return;
                const depTime = new Date(ticket.departureTime);
                const msToDep = depTime.getTime() - now.getTime();
                const minsToDep = msToDep / (1000 * 60);

                if (minsToDep > 110 && minsToDep <= 125) {
                    this.addNotification({
                        title: `🚂 2 Hours to Departure: ${ticket.serviceNo || ticket.operator || 'Train'}`,
                        body: `Boarding ${ticket.departurePlace} at ${ticket.departureTime.split('T')[1] || ticket.departureTime}. Keep PNR ready!`,
                        type: 'train',
                        tripId: trip.id
                    });
                } else if (minsToDep > 25 && minsToDep <= 35) {
                    this.addNotification({
                        title: `⚡ Final Call: ${ticket.serviceNo || 'Train'} Departing in 30 Mins`,
                        body: `Boarding platform at ${ticket.departurePlace}. Arrive at station now!`,
                        type: 'train',
                        tripId: trip.id
                    });
                }
            });
        });
    }

    setupBellUi() {
        this.updateBellBadge();
        const bellBtn = document.getElementById('notif-bell-btn');
        if (bellBtn) {
            bellBtn.addEventListener('click', () => {
                if (Notification.permission === 'default') {
                    this.requestPermission();
                }
                this.toggleNotifDrawer();
            });
        }
    }

    updateBellBadge() {
        const count = this.getUnreadCount();
        const badge = document.getElementById('notif-unread-badge');
        if (badge) {
            if (count > 0) {
                badge.classList.remove('d-none');
                badge.innerText = count > 9 ? '9+' : count;
            } else {
                badge.classList.add('d-none');
            }
        }
    }

    toggleNotifDrawer() {
        const drawer = document.getElementById('notif-center-drawer');
        if (!drawer) return;
        const isOpen = drawer.classList.toggle('active');
        if (isOpen) {
            this.renderNotificationCenter();
        }
    }

    renderNotificationCenter() {
        const listEl = document.getElementById('notif-center-list');
        if (!listEl) return;

        if (this.notifications.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="far fa-bell-slash fa-2x mb-2 text-secondary"></i>
                    <p class="mb-0 small">No notifications yet.</p>
                    <small class="text-muted">Train & trip reminders will appear here!</small>
                </div>
            `;
            return;
        }

        listEl.innerHTML = this.notifications.map(n => `
            <div class="p-3 border-bottom position-relative ${n.read ? 'bg-white' : 'bg-warning-subtle'}">
                <div class="d-flex align-items-start justify-content-between mb-1">
                    <span class="fw-bold text-dark small me-2">${n.title}</span>
                    <small class="text-muted" style="font-size:0.7rem;">${new Date(n.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</small>
                </div>
                <div class="text-secondary small mb-1" style="font-size:0.78rem;">${n.body}</div>
                ${n.tripId ? `<a href="trip-details.html?id=${n.tripId}" class="badge bg-primary text-white text-decoration-none px-2 py-1 small"><i class="fas fa-arrow-right me-1"></i>View Trip</a>` : ''}
            </div>
        `).join('');

        this.updateBellBadge();
    }
}

// Global instance
window.notificationsEngine = new TravelMateNotificationEngine();
