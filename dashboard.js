// Dashboard functionality
let currentUser = null;
let userTrips = [];

document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    setupDashboardEventListeners();
    initializeApp();
});

function setupDashboardEventListeners() {
    // Trip management
    document.getElementById('create-trip-btn').addEventListener('click', showCreateTripModal);
    document.getElementById('create-first-trip-btn').addEventListener('click', showCreateTripModal);
    document.getElementById('join-trip-btn').addEventListener('click', showJoinTripModal);
    document.getElementById('save-trip-btn').addEventListener('click', saveTrip);
    document.getElementById('join-trip-code-btn').addEventListener('click', joinTripWithCode);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('copy-code-btn').addEventListener('click', copyTripCode);
    
    // Distance calculation
    document.getElementById('calculate-distance').addEventListener('change', function() {
        if (this.checked) {
            calculateDistance();
        } else {
            document.getElementById('distance-results').classList.add('d-none');
        }
    });
}

function initializeApp() {
    // Set minimum dates to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('start-date').min = today;
    document.getElementById('end-date').min = today;
}

function checkAuthState() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserData();
            loadUserTrips();
        } else {
            navigateTo('auth.html');
        }
    });
}

function loadUserData() {
    document.getElementById('user-name').textContent = currentUser.displayName || currentUser.email;
    document.getElementById('user-avatar').src = currentUser.photoURL || 'https://via.placeholder.com/40';
}

async function loadUserTrips() {
    try {
        const tripsSnapshot = await db.collection('trips')
            .where('members', 'array-contains', currentUser.uid)
            .get();
        
        userTrips = [];
        tripsSnapshot.forEach(doc => {
            userTrips.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayTrips();
    } catch (error) {
        console.error('Error loading trips:', error);
    }
}

function displayTrips() {
    const tripsContainer = document.getElementById('trips-container');
    const emptyTrips = document.getElementById('empty-trips');
    
    if (userTrips.length === 0) {
        tripsContainer.innerHTML = '';
        emptyTrips.classList.remove('d-none');
        return;
    }
    
    emptyTrips.classList.add('d-none');
    
    tripsContainer.innerHTML = '';
    userTrips.forEach(trip => {
        const tripCard = createTripCard(trip);
        tripsContainer.appendChild(tripCard);
    });
}

function createTripCard(trip) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4';
    
    const startDate = new Date(trip.startDate).toLocaleDateString();
    const endDate = new Date(trip.endDate).toLocaleDateString();
    
    const totalSpent = trip.expenses ? trip.expenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
    const progressPercent = Math.min((totalSpent / trip.budget) * 100, 100);
    
    col.innerHTML = `
        <div class="card trip-card" data-trip-id="${trip.id}">
            <div class="trip-card-header">
                <h5 class="card-title mb-1">${trip.name}</h5>
                <p class="card-text mb-0">${startDate} - ${endDate}</p>
            </div>
            <div class="card-body">
                <p class="card-text">
                    <i class="fas fa-map-marker-alt me-2"></i>${trip.startLocation} → ${trip.destination}
                </p>
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span>Budget: <span class="rupee-symbol">₹</span>${trip.budget.toFixed(2)}</span>
                    <span>Spent: <span class="rupee-symbol">₹</span>${totalSpent.toFixed(2)}</span>
                </div>
                <div class="progress mb-3">
                    <div class="progress-bar" role="progressbar" style="width: ${progressPercent}%"></div>
                </div>
                <div class="d-flex justify-content-between">
                    <button class="btn btn-outline-primary btn-sm view-trip-btn">
                        <i class="fas fa-eye me-1"></i>View Details
                    </button>
                    <span class="trip-code">${trip.code}</span>
                </div>
            </div>
        </div>
    `;
    
    col.querySelector('.view-trip-btn').addEventListener('click', () => {
        setCurrentTrip(trip);
        navigateTo('trip-details.html');
    });
    
    return col;
}

// All other dashboard functions (saveTrip, joinTripWithCode, calculateDistance, etc.)
// would be similar to the previous implementation but organized in this file
