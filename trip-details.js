// Trip Details functionality
let currentTrip = null;

document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    loadTripDetails();
    setupTripDetailsEventListeners();
});

function setupTripDetailsEventListeners() {
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('add-expense-btn').addEventListener('click', showAddExpenseModal);
    document.getElementById('save-expense-btn').addEventListener('click', saveExpense);
    document.getElementById('add-activity-btn').addEventListener('click', showAddActivityModal);
    document.getElementById('save-activity-btn').addEventListener('click', saveActivity);
    document.getElementById('calculate-route-btn').addEventListener('click', calculateRoute);
}

function checkAuthState() {
    auth.onAuthStateChanged(user => {
        if (!user) {
            navigateTo('auth.html');
        } else {
            loadUserData();
        }
    });
}

function loadUserData() {
    const user = auth.currentUser;
    document.getElementById('user-name').textContent = user.displayName || user.email;
    document.getElementById('user-avatar').src = user.photoURL || 'https://via.placeholder.com/40';
}

function loadTripDetails() {
    currentTrip = getCurrentTrip();
    
    if (!currentTrip) {
        navigateTo('dashboard.html');
        return;
    }
    
    // Update trip details in UI
    document.getElementById('trip-details-name').textContent = currentTrip.name;
    document.getElementById('trip-details-code').textContent = currentTrip.code;
    
    // Load trip data
    loadTripOverview(currentTrip);
    loadTripExpenses(currentTrip);
    loadTripItinerary(currentTrip);
    loadTripRoute(currentTrip);
}

function loadTripOverview(trip) {
    // Implementation similar to previous version
}

function loadTripExpenses(trip) {
    // Implementation similar to previous version
}

function loadTripItinerary(trip) {
    // Implementation similar to previous version
}

function loadTripRoute(trip) {
    // Implementation similar to previous version
}

// All other trip details functions would be organized here
