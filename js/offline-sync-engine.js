/**
 * TravelMate Offline Sync Engine (js/offline-sync-engine.js)
 * Manages network connection status, local storage queuing,
 * and automatic synchronization with Firebase Firestore when internet is available.
 */

class OfflineSyncEngine {
    constructor() {
        this.isOnline = navigator.onLine;
        this.syncing = false;
        this.syncListeners = [];
        this.init();
    }

    init() {
        window.addEventListener('online', () => this.handleNetworkChange(true));
        window.addEventListener('offline', () => this.handleNetworkChange(false));
        
        // Initial setup on page load
        document.addEventListener('DOMContentLoaded', () => {
            this.renderNetworkStatusBadge();
            if (this.isOnline) {
                // Delay initial sync slightly to allow auth state to resolve
                setTimeout(() => this.syncAllData(), 2500);
            }
        });

        // Listen for Firebase Auth state change to sync user data
        if (typeof auth !== 'undefined') {
            auth.onAuthStateChanged((user) => {
                if (user && this.isOnline) {
                    this.syncAllData();
                }
            });
        }
    }

    handleNetworkChange(online) {
        this.isOnline = online;
        console.log(`🌐 Network status changed: ${online ? 'ONLINE' : 'OFFLINE'}`);
        this.updateNetworkUI(online);

        if (online) {
            this.syncAllData();
        }
    }

    renderNetworkStatusBadge() {
        if (document.getElementById('offline-sync-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'offline-sync-banner';
        banner.className = 'offline-sync-banner d-none';
        banner.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 9999;
            padding: 8px 16px;
            border-radius: 50px;
            font-size: 0.85rem;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            gap: 8px;
            backdrop-filter: blur(8px);
        `;
        document.body.appendChild(banner);

        if (!this.isOnline) {
            this.updateNetworkUI(false);
        }
    }

    updateNetworkUI(online) {
        const banner = document.getElementById('offline-sync-banner');
        if (!banner) return;

        if (!online) {
            banner.className = 'offline-sync-banner bg-warning text-dark border border-warning';
            banner.innerHTML = `<i class="fas fa-wifi-slash"></i> Offline Mode — Changes saved locally & will sync when online`;
            banner.style.display = 'flex';
        } else {
            banner.className = 'offline-sync-banner bg-success text-white border border-success';
            banner.innerHTML = `<i class="fas fa-check-circle"></i> Back Online — Synced with Firebase`;
            banner.style.display = 'flex';

            // Auto-hide online banner after 3.5 seconds
            setTimeout(() => {
                if (this.isOnline && banner) {
                    banner.style.display = 'none';
                }
            }, 3500);
        }
    }

    async syncAllData() {
        if (!this.isOnline || this.syncing) return;
        if (typeof auth === 'undefined' || !auth.currentUser || typeof db === 'undefined') return;

        this.syncing = true;
        const user = auth.currentUser;
        console.log('🔄 OfflineSyncEngine: Syncing local offline stores with Firebase Firestore...');

        try {
            const userRef = db.collection('users').doc(user.uid);

            // 1. Sync Car Calculation Templates from localStorage
            const localTemplates = JSON.parse(localStorage.getItem('carCalculationTemplates') || '[]');
            if (localTemplates.length > 0) {
                await userRef.set({
                    carCalculationTemplates: localTemplates,
                    lastOfflineSyncAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            // 2. Sync Fuel Fill Ups from localStorage
            const localFuel = JSON.parse(localStorage.getItem('fuelFillUps') || '[]');
            if (localFuel.length > 0) {
                await userRef.set({
                    fuelFillUps: localFuel,
                    lastOfflineSyncAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            // 3. Sync AI Memory Preferences
            const aiPrefs = JSON.parse(localStorage.getItem('travelmate_ai_user_preferences') || '{}');
            if (Object.keys(aiPrefs).length > 0) {
                await userRef.set({
                    aiUserPreferences: aiPrefs,
                    lastOfflineSyncAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            // 4. Sync Settlement Reminders & Transactions
            const settlementReminders = JSON.parse(localStorage.getItem('settlementReminders') || '[]');
            const settledTransactions = JSON.parse(localStorage.getItem('settledTransactions') || '{}');
            if (settlementReminders.length > 0 || Object.keys(settledTransactions).length > 0) {
                await userRef.set({
                    settlementReminders: settlementReminders,
                    settledTransactions: settledTransactions,
                    lastOfflineSyncAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            console.log('🟢 OfflineSyncEngine: All local offline data successfully synced to Firebase!');
            this.notifySyncComplete();
        } catch (error) {
            console.warn('⚠️ OfflineSyncEngine sync notice:', error);
        } finally {
            this.syncing = false;
        }
    }

    onSyncComplete(callback) {
        if (typeof callback === 'function') {
            this.syncListeners.push(callback);
        }
    }

    notifySyncComplete() {
        this.syncListeners.forEach(cb => {
            try { cb(); } catch (e) { console.error(e); }
        });
    }
}

// Initialize global OfflineSyncEngine instance
window.offlineSyncEngine = new OfflineSyncEngine();
