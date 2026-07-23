/**
 * TravelMate AI Memory System (js/ai-memory.js)
 * Manages long-term user preferences, travel history, walking tolerance,
 * dietary requirements, budget tiers, and frequently visited destinations.
 */

const DEFAULT_USER_PREFERENCES = {
    preferredLanguage: 'en-IN', // 'en-IN', 'hi', 'te', 'ta', 'bn'
    budgetRange: 'medium', // 'low', 'medium', 'premium'
    foodPreference: 'local_thali', // 'pure_veg', 'jain', 'local_thali', 'non_veg'
    walkingTolerance: 'medium', // 'low' (< 2km), 'medium' (2-5km), 'high' (> 5km)
    preferredTransport: 'train', // 'train', 'flight', 'bus', 'car'
    templeInterest: 'high', // 'low', 'medium', 'high'
    photographyInterest: 'high', // 'low', 'medium', 'high'
    adventureInterest: 'medium', // 'low', 'medium', 'high'
    medicalRequirements: '', // e.g. 'wheelchair', 'diabetic_meals', 'senior_assistance'
    seniorCitizenAssistance: false,
    childrenTraveling: false,
    favoriteAirlines: [],
    favoriteTrains: [],
    frequentlyVisitedPlaces: [],
    travelHistory: []
};

class TravelMateMemorySystem {
    constructor() {
        this.storageKey = 'travelmate_ai_user_preferences';
        this.preferences = this.loadPreferences();
    }

    loadPreferences() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return { ...DEFAULT_USER_PREFERENCES, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.warn('Failed to parse AI memory preferences from localStorage:', e);
        }
        return { ...DEFAULT_USER_PREFERENCES };
    }

    savePreferences(updatedPrefs) {
        this.preferences = { ...this.preferences, ...updatedPrefs };
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.preferences));
            this.syncPreferencesToFirestore();
        } catch (e) {
            console.error('Failed to save AI memory preferences:', e);
        }
        return this.preferences;
    }

    async syncPreferencesToFirestore() {
        try {
            if (typeof auth !== 'undefined' && auth.currentUser && typeof db !== 'undefined') {
                const uid = auth.currentUser.uid;
                await db.collection('users').doc(uid).set({
                    aiMemoryProfile: this.preferences,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        } catch (e) {
            console.warn('Firestore sync for AI memory skipped/deferred:', e.message);
        }
    }

    async syncFromFirestore() {
        try {
            if (typeof auth !== 'undefined' && auth.currentUser && typeof db !== 'undefined') {
                const uid = auth.currentUser.uid;
                const doc = await db.collection('users').doc(uid).get();
                if (doc.exists && doc.data().aiMemoryProfile) {
                    this.preferences = { ...DEFAULT_USER_PREFERENCES, ...doc.data().aiMemoryProfile };
                    localStorage.setItem(this.storageKey, JSON.stringify(this.preferences));
                }
            }
        } catch (e) {
            console.warn('Failed to fetch AI memory profile from Firestore:', e.message);
        }
        return this.preferences;
    }

    recordTripInHistory(tripData) {
        if (!tripData) return;
        const tripSummary = {
            id: tripData.id || Date.now().toString(),
            destination: tripData.destination || 'Unknown Destination',
            startDate: tripData.startDate || '',
            endDate: tripData.endDate || '',
            mode: tripData.mode || 'train',
            recordedAt: new Date().toISOString()
        };

        const history = this.preferences.travelHistory || [];
        const existingIdx = history.findIndex(t => t.id === tripSummary.id);
        if (existingIdx >= 0) {
            history[existingIdx] = tripSummary;
        } else {
            history.unshift(tripSummary);
        }

        // Maintain top 25 historical trips
        this.preferences.travelHistory = history.slice(0, 25);

        // Update frequently visited places count
        const freqMap = {};
        this.preferences.travelHistory.forEach(t => {
            const dest = (t.destination || '').trim();
            if (dest) freqMap[dest] = (freqMap[dest] || 0) + 1;
        });

        this.preferences.frequentlyVisitedPlaces = Object.keys(freqMap)
            .sort((a, b) => freqMap[b] - freqMap[a])
            .slice(0, 10);

        this.savePreferences(this.preferences);
    }

    getMemoryPromptContext() {
        const p = this.preferences;
        return {
            language: p.preferredLanguage,
            budgetTier: p.budgetRange,
            dietary: p.foodPreference,
            walkingTolerance: p.walkingTolerance,
            templeInterest: p.templeInterest,
            photographyInterest: p.photographyInterest,
            seniorAssistance: p.seniorCitizenAssistance,
            childrenTraveling: p.childrenTraveling,
            frequentlyVisited: p.frequentlyVisitedPlaces.join(', '),
            medical: p.medicalRequirements
        };
    }
}

// Instantiate global instance
window.aiMemory = new TravelMateMemorySystem();
