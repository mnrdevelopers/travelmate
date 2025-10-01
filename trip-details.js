// Trip Details functionality
let currentTrip = null;
let expenseChart = null;

document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    loadTripDetails();
    setupTripDetailsEventListeners();
    fixScrollIssues();
});

function fixScrollIssues() {
    // Fix scroll issues by ensuring proper height and overflow
    document.body.style.height = '100vh';
    document.body.style.overflow = 'auto';
    
    const appElement = document.getElementById('app');
    if (appElement) {
        appElement.style.minHeight = '100vh';
        appElement.style.overflow = 'auto';
    }
    
    const tripDetailsScreen = document.getElementById('trip-details-screen');
    if (tripDetailsScreen) {
        tripDetailsScreen.style.minHeight = 'calc(100vh - 76px)';
        tripDetailsScreen.style.overflow = 'visible';
    }
}

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
    document.getElementById('user-name').textContent = user.displayName || 'Traveler';
    document.getElementById('user-avatar').src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Traveler')}&background=4361ee&color=fff`;
}

async function loadTripDetails() {
    currentTrip = getCurrentTrip();
    
    if (!currentTrip) {
        navigateTo('dashboard.html');
        return;
    }
    
    try {
        // Refresh trip data from Firestore to get latest updates
        const tripDoc = await db.collection('trips').doc(currentTrip.id).get();
        if (tripDoc.exists) {
            currentTrip = {
                id: tripDoc.id,
                ...tripDoc.data()
            };
            setCurrentTrip(currentTrip);
        }
        
        // Update trip details in UI
        document.getElementById('trip-details-name').textContent = currentTrip.name;
        document.getElementById('trip-details-code').textContent = currentTrip.code;
        
        // Load trip data
        await loadTripOverview(currentTrip);
        loadTripExpenses(currentTrip);
        loadTripItinerary(currentTrip);
        loadTripRoute(currentTrip);
        
    } catch (error) {
        console.error('Error loading trip details:', error);
        showToast('Error loading trip details', 'danger');
    }
}

async function loadTripOverview(trip) {
    // Update overview information
    document.getElementById('overview-start-location').textContent = trip.startLocation;
    document.getElementById('overview-destination').textContent = trip.destination;
    
    const startDate = new Date(trip.startDate).toLocaleDateString();
    const endDate = new Date(trip.endDate).toLocaleDateString();
    document.getElementById('overview-dates').textContent = `${startDate} - ${endDate}`;
    
    document.getElementById('overview-budget').innerHTML = `<span class="rupee-symbol">₹</span>${trip.budget.toFixed(2)}`;
    
    // Calculate total spent and remaining
    const totalSpent = trip.expenses ? trip.expenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
    const remaining = trip.budget - totalSpent;
    
    document.getElementById('overview-remaining').innerHTML = `<span class="rupee-symbol">₹</span>${remaining.toFixed(2)}`;
    
    // Update progress bar
    const progressPercent = Math.min((totalSpent / trip.budget) * 100, 100);
    const progressBar = document.getElementById('budget-progress-bar');
    progressBar.style.width = `${progressPercent}%`;
    progressBar.textContent = `${progressPercent.toFixed(1)}%`;
    
    // Update budget status and progress bar color
    const budgetStatus = document.getElementById('budget-status');
    if (remaining < 0) {
        budgetStatus.innerHTML = `<span class="budget-warning"><i class="fas fa-exclamation-triangle me-1"></i>Over budget by <span class="rupee-symbol">₹</span>${Math.abs(remaining).toFixed(2)}</span>`;
        progressBar.className = 'progress-bar bg-danger';
    } else if (remaining < trip.budget * 0.2) {
        budgetStatus.innerHTML = `<span class="budget-warning"><i class="fas fa-exclamation-circle me-1"></i>Low budget - Only <span class="rupee-symbol">₹</span>${remaining.toFixed(2)} remaining</span>`;
        progressBar.className = 'progress-bar bg-warning';
    } else {
        budgetStatus.innerHTML = `<span class="budget-safe"><i class="fas fa-check-circle me-1"></i>Budget is on track</span>`;
        progressBar.className = 'progress-bar bg-success';
    }
    
    // Update distance if available
    if (trip.route) {
        document.getElementById('overview-distance').textContent = `${trip.route.distance} (${trip.route.duration})`;
    } else {
        document.getElementById('overview-distance').textContent = 'Not calculated';
    }
    
    // Load members with proper user data
    await loadTripMembers(trip);
}

async function loadTripMembers(trip) {
    const membersList = document.getElementById('members-list');
    membersList.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div><p class="mt-2 text-muted">Loading members...</p></div>';
    
    try {
        // Get user details for each member
        const memberPromises = trip.members.map(async (memberId) => {
            try {
                const userDoc = await db.collection('users').doc(memberId).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    return {
                        id: memberId,
                        name: userData.name || userData.email || 'Traveler',
                        email: userData.email,
                        photoURL: userData.photoURL,
                        isCurrentUser: memberId === auth.currentUser.uid,
                        isCreator: memberId === trip.createdBy
                    };
                } else {
                    // If user document doesn't exist, use basic info
                    return {
                        id: memberId,
                        name: 'Traveler',
                        email: null,
                        photoURL: null,
                        isCurrentUser: memberId === auth.currentUser.uid,
                        isCreator: memberId === trip.createdBy
                    };
                }
            } catch (error) {
                console.error('Error fetching user:', memberId, error);
                return {
                    id: memberId,
                    name: 'Traveler',
                    email: null,
                    photoURL: null,
                    isCurrentUser: memberId === auth.currentUser.uid,
                    isCreator: memberId === trip.createdBy
                };
            }
        });
        
        const members = await Promise.all(memberPromises);
        
        // Sort members: creator first, then current user, then others
        members.sort((a, b) => {
            if (a.isCreator && !b.isCreator) return -1;
            if (!a.isCreator && b.isCreator) return 1;
            if (a.isCurrentUser && !b.isCurrentUser) return -1;
            if (!a.isCurrentUser && b.isCurrentUser) return 1;
            return a.name.localeCompare(b.name);
        });
        
        membersList.innerHTML = '';
        
        members.forEach((member) => {
            const memberDiv = document.createElement('div');
            memberDiv.className = 'd-flex align-items-center mb-3 p-3 border rounded bg-light';
            
            const avatarSrc = member.photoURL || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=4361ee&color=fff&size=128`;
            
            // Create badges
            const badges = [];
            if (member.isCreator) {
                badges.push('<span class="badge bg-primary me-1"><i class="fas fa-crown me-1"></i>Creator</span>');
            }
            if (member.isCurrentUser) {
                badges.push('<span class="badge bg-success me-1"><i class="fas fa-user me-1"></i>You</span>');
            }
            
            memberDiv.innerHTML = `
                <img src="${avatarSrc}" class="user-avatar me-3 flex-shrink-0" alt="${member.name}" 
                     style="width: 50px; height: 50px; object-fit: cover; border: 2px solid ${member.isCreator ? '#4361ee' : member.isCurrentUser ? '#28a745' : '#dee2e6'};">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center mb-1">
                        <strong class="mb-0 me-2">${member.name}</strong>
                        ${badges.join('')}
                    </div>
                    ${member.email ? `<small class="text-muted">${member.email}</small>` : ''}
                </div>
            `;
            
            membersList.appendChild(memberDiv);
        });
        
    } catch (error) {
        console.error('Error loading members:', error);
        membersList.innerHTML = '<div class="alert alert-warning">Error loading members</div>';
    }
}

function loadTripExpenses(trip) {
    const expensesList = document.getElementById('expenses-list');
    const emptyExpenses = document.getElementById('empty-expenses');
    
    if (!trip.expenses || trip.expenses.length === 0) {
        expensesList.innerHTML = '';
        emptyExpenses.classList.remove('d-none');
        updateBudgetSummary(trip);
        return;
    }
    
    emptyExpenses.classList.add('d-none');
    
    // Sort expenses by date (newest first)
    const sortedExpenses = [...trip.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    expensesList.innerHTML = '';
    sortedExpenses.forEach((expense) => {
        const expenseItem = document.createElement('div');
        expenseItem.className = 'expense-item';
        
        const categoryClass = `category-${expense.category}`;
        const categoryName = expense.category.charAt(0).toUpperCase() + expense.category.slice(1);
        const expenseDate = new Date(expense.date).toLocaleDateString();
        
        expenseItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${expense.description}</h6>
                    <div class="d-flex align-items-center mt-1">
                        <span class="category-badge ${categoryClass}">${categoryName}</span>
                        <small class="text-muted ms-2">${expenseDate}</small>
                    </div>
                </div>
                <div class="text-end ms-3">
                    <div class="fw-bold fs-5"><span class="rupee-symbol">₹</span>${expense.amount.toFixed(2)}</div>
                    <small class="text-muted">Added by ${expense.addedBy === auth.currentUser.uid ? 'You' : 'Member'}</small>
                </div>
            </div>
        `;
        
        expensesList.appendChild(expenseItem);
    });
    
    updateBudgetSummary(trip);
    renderExpenseChart(trip);
}

function updateBudgetSummary(trip) {
    const totalSpent = trip.expenses ? trip.expenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
    const remaining = trip.budget - totalSpent;
    const progressPercent = Math.min((totalSpent / trip.budget) * 100, 100);
    
    document.getElementById('summary-total-budget').innerHTML = `<span class="rupee-symbol">₹</span>${trip.budget.toFixed(2)}`;
    document.getElementById('summary-total-spent').innerHTML = `<span class="rupee-symbol">₹</span>${totalSpent.toFixed(2)}`;
    document.getElementById('summary-remaining').innerHTML = `<span class="rupee-symbol">₹</span>${remaining.toFixed(2)}`;
    
    const progressBar = document.getElementById('summary-progress-bar');
    progressBar.style.width = `${progressPercent}%`;
    progressBar.textContent = `${progressPercent.toFixed(1)}%`;
    
    // Color code based on budget status
    if (remaining < 0) {
        progressBar.className = 'progress-bar bg-danger';
    } else if (remaining < trip.budget * 0.2) {
        progressBar.className = 'progress-bar bg-warning';
    } else {
        progressBar.className = 'progress-bar bg-success';
    }
}

function renderExpenseChart(trip) {
    if (!trip.expenses || trip.expenses.length === 0) {
        return;
    }
    
    const ctx = document.getElementById('expense-chart').getContext('2d');
    
    // Destroy previous chart if it exists
    if (expenseChart) {
        expenseChart.destroy();
    }
    
    // Group expenses by category
    const categories = {
        fuel: 0,
        hotel: 0,
        food: 0,
        activities: 0,
        other: 0
    };
    
    trip.expenses.forEach(expense => {
        categories[expense.category] += expense.amount;
    });
    
    // Filter out categories with no expenses
    const labels = [];
    const data = [];
    const backgroundColors = [
        '#ffd166', // fuel
        '#06d6a0', // hotel
        '#ef476f', // food
        '#118ab2', // activities
        '#073b4c'  // other
    ];
    
    Object.keys(categories).forEach((category, index) => {
        if (categories[category] > 0) {
            labels.push(category.charAt(0).toUpperCase() + category.slice(1));
            data.push(categories[category]);
        }
    });
    
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function loadTripItinerary(trip) {
    const itineraryDays = document.getElementById('itinerary-days');
    const emptyItinerary = document.getElementById('empty-itinerary');
    
    if (!trip.itinerary || trip.itinerary.length === 0) {
        itineraryDays.innerHTML = '';
        emptyItinerary.classList.remove('d-none');
        return;
    }
    
    emptyItinerary.classList.add('d-none');
    
    // Group activities by day
    const activitiesByDay = {};
    trip.itinerary.forEach(activity => {
        if (!activitiesByDay[activity.day]) {
            activitiesByDay[activity.day] = [];
        }
        activitiesByDay[activity.day].push(activity);
    });
    
    // Sort activities by time within each day
    Object.keys(activitiesByDay).forEach(day => {
        activitiesByDay[day].sort((a, b) => a.time.localeCompare(b.time));
    });
    
    itineraryDays.innerHTML = '';
    Object.keys(activitiesByDay).sort().forEach(day => {
        const dayCard = document.createElement('div');
        dayCard.className = 'card itinerary-card mb-4';
        
        dayCard.innerHTML = `
            <div class="card-header bg-success text-white">
                <h5 class="mb-0"><i class="fas fa-calendar-day me-2"></i>Day ${day}</h5>
            </div>
            <div class="card-body">
                ${activitiesByDay[day].map(activity => `
                    <div class="d-flex align-items-start mb-3 p-3 border rounded">
                        <div class="me-3 text-center">
                            <div class="bg-primary text-white rounded p-2" style="width: 70px;">
                                <div class="fw-bold">${activity.time}</div>
                            </div>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="mb-1 text-primary">${activity.place}</h6>
                            ${activity.notes ? `<p class="mb-0 text-muted">${activity.notes}</p>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        itineraryDays.appendChild(dayCard);
    });
}

function loadTripRoute(trip) {
    const routeDetails = document.getElementById('route-details');
    const emptyRoute = document.getElementById('empty-route');
    
    if (trip.route) {
        emptyRoute.classList.add('d-none');
        routeDetails.innerHTML = `
            <div class="distance-info">
                <h5><i class="fas fa-route me-2"></i>Route Information</h5>
                <div class="row mt-3">
                    <div class="col-md-6">
                        <p><strong>From:</strong> ${trip.startLocation}</p>
                        <p><strong>To:</strong> ${trip.destination}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Distance:</strong> ${trip.route.distance}</p>
                        <p><strong>Travel Time:</strong> ${trip.route.duration}</p>
                    </div>
                </div>
                ${trip.route.calculatedAt ? `
                    <div class="mt-2">
                        <small class="text-muted">
                            <i class="fas fa-clock me-1"></i>
                            Calculated on ${new Date(trip.route.calculatedAt.toDate()).toLocaleDateString()}
                        </small>
                    </div>
                ` : ''}
            </div>
        `;
    } else {
        routeDetails.innerHTML = '';
        emptyRoute.classList.remove('d-none');
    }
}

function showAddExpenseModal() {
    // Set today's date as default
    document.getElementById('expense-date').valueAsDate = new Date();
    document.getElementById('add-expense-form').reset();
    
    const modal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
    modal.show();
}

async function saveExpense() {
    const description = document.getElementById('expense-description').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;
    const date = document.getElementById('expense-date').value;
    
    if (!description || !amount || !category || !date) {
        showToast('Please fill in all fields', 'warning');
        return;
    }
    
    if (amount <= 0) {
        showToast('Amount must be greater than 0', 'warning');
        return;
    }
    
    const expense = {
        description: description.trim(),
        amount,
        category,
        date,
        addedBy: auth.currentUser.uid,
        addedAt: new Date().toISOString()
    };
    
    try {
        // Show loading state
        document.getElementById('save-expense-btn').disabled = true;
        document.getElementById('save-expense-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Adding...';
        
        // Get the current trip data first
        const tripDoc = await db.collection('trips').doc(currentTrip.id).get();
        const tripData = tripDoc.data();
        
        // Update the expenses array
        const updatedExpenses = [...(tripData.expenses || []), expense];
        
        // Update the trip document with the new expenses array
        await db.collection('trips').doc(currentTrip.id).update({
            expenses: updatedExpenses,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local state
        currentTrip.expenses = updatedExpenses;
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addExpenseModal'));
        modal.hide();
        
        // Reload trip details
        loadTripDetails();
        
        // Show success message
        showToast('Expense added successfully!', 'success');
        
    } catch (error) {
        console.error('Error adding expense:', error);
        showToast('Error adding expense. Please try again.', 'danger');
    } finally {
        // Reset button state
        document.getElementById('save-expense-btn').disabled = false;
        document.getElementById('save-expense-btn').innerHTML = 'Add Expense';
    }
}

function showAddActivityModal() {
    // Populate days dropdown
    const daySelect = document.getElementById('activity-day');
    daySelect.innerHTML = '';
    
    if (currentTrip) {
        const startDate = new Date(currentTrip.startDate);
        const endDate = new Date(currentTrip.endDate);
        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        for (let i = 1; i <= days; i++) {
            const option = document.createElement('option');
            option.value = i;
            const dayDate = new Date(startDate.getTime() + (i-1) * 24 * 60 * 60 * 1000);
            option.textContent = `Day ${i} (${formatDate(dayDate.toISOString().split('T')[0])})`;
            daySelect.appendChild(option);
        }
    }
    
    document.getElementById('add-activity-form').reset();
    
    const modal = new bootstrap.Modal(document.getElementById('addActivityModal'));
    modal.show();
}

async function saveActivity() {
    const day = parseInt(document.getElementById('activity-day').value);
    const time = document.getElementById('activity-time').value;
    const place = document.getElementById('activity-place').value;
    const notes = document.getElementById('activity-notes').value;
    
    if (!day || !time || !place) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    const activity = {
        day,
        time,
        place: place.trim(),
        notes: (notes || '').trim(),
        addedBy: auth.currentUser.uid,
        addedAt: new Date().toISOString()
    };
    
    try {
        // Show loading state
        document.getElementById('save-activity-btn').disabled = true;
        document.getElementById('save-activity-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Adding...';
        
        // Get the current trip data first
        const tripDoc = await db.collection('trips').doc(currentTrip.id).get();
        const tripData = tripDoc.data();
        
        // Update the itinerary array
        const updatedItinerary = [...(tripData.itinerary || []), activity];
        
        // Update the trip document with the new itinerary array
        await db.collection('trips').doc(currentTrip.id).update({
            itinerary: updatedItinerary,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local state
        currentTrip.itinerary = updatedItinerary;
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addActivityModal'));
        modal.hide();
        
        // Reload trip details
        loadTripDetails();
        
        // Show success message
        showToast('Activity added successfully!', 'success');
        
    } catch (error) {
        console.error('Error adding activity:', error);
        showToast('Error adding activity. Please try again.', 'danger');
    } finally {
        // Reset button state
        document.getElementById('save-activity-btn').disabled = false;
        document.getElementById('save-activity-btn').innerHTML = 'Add Activity';
    }
}

async function calculateRoute() {
    if (!currentTrip) return;
    
    try {
        // Show loading state
        document.getElementById('route-details').innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border spinner-border-lg me-2" role="status"></div>
                <div class="mt-2">Calculating route...</div>
            </div>
        `;
        document.getElementById('empty-route').classList.add('d-none');
        
        document.getElementById('calculate-route-btn').disabled = true;
        document.getElementById('calculate-route-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Calculating...';
        
        // Simulate route calculation (replace with actual OpenRouteService API call)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Calculate approximate distance and duration
        const distance = calculateApproximateDistance(currentTrip.startLocation, currentTrip.destination);
        const duration = calculateApproximateDuration(distance);
        
        const routeData = {
            distance: `${distance.toFixed(1)} km`,
            duration: duration,
            calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Update the trip with route information
        await db.collection('trips').doc(currentTrip.id).update({
            route: routeData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local state
        currentTrip.route = routeData;
        
        // Reload route information
        loadTripRoute(currentTrip);
        
        // Show success message
        showToast('Route calculated successfully!', 'success');
        
    } catch (error) {
        console.error('Error calculating route:', error);
        document.getElementById('route-details').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error calculating route. Please try again.
            </div>
        `;
        showToast('Error calculating route', 'danger');
    } finally {
        document.getElementById('calculate-route-btn').disabled = false;
        document.getElementById('calculate-route-btn').innerHTML = '<i class="fas fa-route me-1"></i>Calculate Route';
    }
}

function calculateApproximateDistance(start, destination) {
    // Simple simulation - in real app, this would be API call to OpenRouteService
    const baseDistance = 350; // km
    const randomVariation = Math.random() * 200 - 100; // ±100 km
    return Math.max(50, baseDistance + randomVariation); // Minimum 50km
}

function calculateApproximateDuration(distance) {
    // Assume average speed of 80 km/h for calculation
    const hours = distance / 80;
    const totalMinutes = Math.round(hours * 60);
    
    const hoursPart = Math.floor(totalMinutes / 60);
    const minutesPart = totalMinutes % 60;
    
    if (hoursPart > 0) {
        return `${hoursPart} hour${hoursPart > 1 ? 's' : ''} ${minutesPart} minute${minutesPart > 1 ? 's' : ''}`;
    } else {
        return `${minutesPart} minutes`;
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
        clearCurrentTrip();
        navigateTo('auth.html');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error during logout', 'danger');
    }
}

// Utility function to show toast messages
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-bg-${type} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${getToastIcon(type)} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    
    // Remove toast from DOM after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

function getToastIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'danger': return 'exclamation-triangle';
        case 'warning': return 'exclamation-circle';
        default: return 'info-circle';
    }
}
