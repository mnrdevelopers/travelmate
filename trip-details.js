// Trip Details JavaScript
let currentUser = null;
let currentTrip = null;
let tripExpenses = [];
let tripItinerary = [];

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase Auth
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            currentUser = user;
            document.getElementById('user-name').textContent = user.displayName || 'User';
            document.getElementById('user-avatar').src = user.photoURL || 'https://via.placeholder.com/40';
            
            // Get trip ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            const tripId = urlParams.get('id');
            
            if (tripId) {
                loadTripDetails(tripId);
            } else {
                showToast('No trip specified', 'error');
                window.location.href = 'dashboard.html';
            }
        } else {
            window.location.href = 'index.html';
        }
    });

    // Event Listeners
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('nav-profile').addEventListener('click', showProfileModal);
    document.getElementById('save-profile-btn').addEventListener('click', saveProfile);
    document.getElementById('leave-all-trips-btn').addEventListener('click', leaveAllTrips);
    document.getElementById('avatar-upload').addEventListener('change', handleAvatarUpload);
    
    // Trip actions
    document.getElementById('add-expense-btn').addEventListener('click', showAddExpenseModal);
    document.getElementById('save-expense-btn').addEventListener('click', saveExpense);
    document.getElementById('add-activity-btn').addEventListener('click', showAddActivityModal);
    document.getElementById('save-activity-btn').addEventListener('click', saveActivity);
    
    // Edit trip
    document.getElementById('update-trip-btn-trip-details').addEventListener('click', updateTrip);
    
    // Custom category
    document.getElementById('expense-category').addEventListener('change', handleCategoryChange);
    document.getElementById('save-category-btn').addEventListener('click', saveCustomCategory);
});

function loadTripDetails(tripId) {
    const db = firebase.firestore();
    
    db.collection('trips').doc(tripId).get()
        .then((doc) => {
            if (!doc.exists) {
                showToast('Trip not found', 'error');
                window.location.href = 'dashboard.html';
                return;
            }
            
            currentTrip = { id: doc.id, ...doc.data() };
            displayTripDetails();
            loadTripExpenses();
            loadTripItinerary();
        })
        .catch((error) => {
            console.error('Error loading trip: ', error);
            showToast('Error loading trip', 'error');
        });
}

function displayTripDetails() {
    // Basic trip info
    document.getElementById('trip-details-name').textContent = currentTrip.name;
    document.getElementById('trip-details-code').textContent = currentTrip.code;
    
    // Overview tab
    document.getElementById('overview-start-location').textContent = currentTrip.startLocation;
    document.getElementById('overview-destination').textContent = currentTrip.endLocation;
    document.getElementById('overview-dates').textContent = `${formatDate(currentTrip.startDate)} - ${formatDate(currentTrip.endDate)}`;
    
    // Calculate trip stats
    const totalKms = calculateTotalKms(currentTrip);
    const fuelCost = calculateFuelCost(currentTrip, totalKms);
    const rentalCost = calculateRentalCost(currentTrip);
    
    document.getElementById('overview-distance').textContent = `${totalKms.toFixed(1)} km`;
    document.getElementById('overview-budget').innerHTML = `<span class="rupee-symbol">₹</span>${currentTrip.budget.toFixed(2)}`;
    
    // Calculate total spent (will be updated when expenses are loaded)
    const totalSpent = fuelCost + rentalCost; // Will add expenses later
    const remainingBudget = Math.max(0, currentTrip.budget - totalSpent);
    
    document.getElementById('overview-remaining').innerHTML = `<span class="rupee-symbol">₹</span>${remainingBudget.toFixed(2)}`;
    
    const budgetProgress = Math.min(100, (totalSpent / currentTrip.budget) * 100);
    const progressBar = document.getElementById('budget-progress-bar');
    progressBar.style.width = `${budgetProgress}%`;
    
    if (budgetProgress > 90) {
        progressBar.className = 'progress-bar bg-danger';
        document.getElementById('budget-status').innerHTML = '<span class="text-danger">Warning: Budget almost exhausted</span>';
    } else if (budgetProgress > 70) {
        progressBar.className = 'progress-bar bg-warning';
        document.getElementById('budget-status').innerHTML = '<span class="text-warning">Budget getting tight</span>';
    } else {
        progressBar.className = 'progress-bar bg-success';
        document.getElementById('budget-status').innerHTML = '<span class="text-success">Budget on track</span>';
    }
    
    // Display trip actions based on user role
    const tripActions = document.getElementById('trip-actions-section');
    if (currentTrip.createdBy === currentUser.uid) {
        tripActions.innerHTML = `
            <button class="btn btn-outline-primary me-2" id="edit-trip-btn">
                <i class="fas fa-edit me-1"></i>Edit Trip
            </button>
            <button class="btn btn-outline-danger" id="delete-trip-btn">
                <i class="fas fa-trash me-1"></i>Delete Trip
            </button>
        `;
        
        document.getElementById('edit-trip-btn').addEventListener('click', editTrip);
        document.getElementById('delete-trip-btn').addEventListener('click', deleteTrip);
    } else {
        tripActions.innerHTML = `
            <button class="btn btn-outline-danger" id="leave-trip-btn">
                <i class="fas fa-sign-out-alt me-1"></i>Leave Trip
            </button>
        `;
        
        document.getElementById('leave-trip-btn').addEventListener('click', leaveTrip);
    }
    
    // Display route details
    displayRouteDetails();
}

function displayRouteDetails() {
    const routeDetails = document.getElementById('route-details');
    const emptyRoute = document.getElementById('empty-route');
    
    if (!currentTrip.stops || currentTrip.stops.length === 0) {
        routeDetails.style.display = 'none';
        emptyRoute.style.display = 'block';
        return;
    }
    
    routeDetails.style.display = 'block';
    emptyRoute.style.display = 'none';
    
    let html = `
        <div class="route-summary mb-4">
            <h5>Route Summary</h5>
            <div class="row">
                <div class="col-md-4">
                    <strong>Total Distance:</strong> ${calculateTotalKms(currentTrip).toFixed(1)} km
                </div>
                <div class="col-md-4">
                    <strong>Fuel Type:</strong> ${currentTrip.fuelType}
                </div>
                <div class="col-md-4">
                    <strong>Car Type:</strong> ${currentTrip.carType}
                </div>
            </div>
        </div>
        <div class="route-breakdown">
            <h5>Stop-by-Stop Breakdown</h5>
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Stop</th>
                            <th>Location</th>
                            <th>Meter Reading</th>
                            <th>Distance from Previous</th>
                            <th>Estimated Fuel</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    let lastMeterReading = currentTrip.startMeterReading;
    let cumulativeDistance = 0;
    
    // Start point
    html += `
        <tr>
            <td>Start</td>
            <td>${currentTrip.startLocation}</td>
            <td>${lastMeterReading || '-'}</td>
            <td>-</td>
            <td>-</td>
        </tr>
    `;
    
    // Stops
    if (currentTrip.stops && currentTrip.stops.length > 0) {
        currentTrip.stops.forEach((stop, index) => {
            let distance = 0;
            let fuelUsed = 0;
            
            if (stop.meterReading && lastMeterReading !== null) {
                distance = stop.meterReading - lastMeterReading;
                lastMeterReading = stop.meterReading;
            } else if (stop.manualKms) {
                distance = stop.manualKms;
            }
            
            cumulativeDistance += distance;
            fuelUsed = distance / currentTrip.mileage;
            
            html += `
                <tr>
                    <td>Stop ${index + 1}</td>
                    <td>${stop.name}</td>
                    <td>${stop.meterReading || '-'}</td>
                    <td>${distance.toFixed(1)} km</td>
                    <td>${fuelUsed.toFixed(2)} ${getFuelUnit(currentTrip.fuelType)}</td>
                </tr>
            `;
        });
    }
    
    // End point
    let finalDistance = 0;
    if (currentTrip.endMeterReading && lastMeterReading !== null) {
        finalDistance = currentTrip.endMeterReading - lastMeterReading;
    }
    
    cumulativeDistance += finalDistance;
    const finalFuelUsed = finalDistance / currentTrip.mileage;
    
    html += `
        <tr>
            <td>End</td>
            <td>${currentTrip.endLocation}</td>
            <td>${currentTrip.endMeterReading || '-'}</td>
            <td>${finalDistance.toFixed(1)} km</td>
            <td>${finalFuelUsed.toFixed(2)} ${getFuelUnit(currentTrip.fuelType)}</td>
        </tr>
    `;
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    routeDetails.innerHTML = html;
}

function getFuelUnit(fuelType) {
    switch(fuelType) {
        case 'electric': return 'kWh';
        default: return 'L';
    }
}

function loadTripExpenses() {
    const db = firebase.firestore();
    
    db.collection('expenses')
        .where('tripId', '==', currentTrip.id)
        .orderBy('date', 'desc')
        .get()
        .then((querySnapshot) => {
            tripExpenses = [];
            const expensesList = document.getElementById('expenses-list');
            const emptyExpenses = document.getElementById('empty-expenses');
            
            expensesList.innerHTML = '';
            
            if (querySnapshot.empty) {
                emptyExpenses.style.display = 'block';
                updateBudgetSummary();
                return;
            }
            
            emptyExpenses.style.display = 'none';
            
            querySnapshot.forEach((doc) => {
                const expense = { id: doc.id, ...doc.data() };
                tripExpenses.push(expense);
                
                const expenseItem = createExpenseItem(expense);
                expensesList.appendChild(expenseItem);
            });
            
            updateBudgetSummary();
            renderExpenseCharts();
        })
        .catch((error) => {
            console.error('Error loading expenses: ', error);
            showToast('Error loading expenses', 'error');
        });
}

function createExpenseItem(expense) {
    const div = document.createElement('div');
    div.className = 'card mb-3 expense-item';
    
    div.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="card-title mb-1">${expense.description}</h6>
                    <p class="card-text text-muted mb-1">
                        <span class="badge bg-secondary">${expense.category}</span>
                        <span class="badge bg-light text-dark ms-1">${expense.paymentMode}</span>
                    </p>
                    <small class="text-muted">${formatDate(expense.date)}</small>
                </div>
                <div class="text-end">
                    <div class="expense-amount mb-1"><span class="rupee-symbol">₹</span>${expense.amount.toFixed(2)}</div>
                    <div class="expense-actions">
                        <button class="btn btn-sm btn-outline-secondary edit-expense" data-expense-id="${expense.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-expense" data-expense-id="${expense.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners
    div.querySelector('.edit-expense').addEventListener('click', function() {
        editExpense(expense.id);
    });
    
    div.querySelector('.delete-expense').addEventListener('click', function() {
        deleteExpense(expense.id);
    });
    
    return div;
}

function updateBudgetSummary() {
    const totalBudget = currentTrip.budget;
    let totalSpent = 0;
    
    // Add fuel and rental costs
    const totalKms = calculateTotalKms(currentTrip);
    const fuelCost = calculateFuelCost(currentTrip, totalKms);
    const rentalCost = calculateRentalCost(currentTrip);
    
    totalSpent += fuelCost + rentalCost;
    
    // Add expenses
    tripExpenses.forEach(expense => {
        totalSpent += expense.amount;
    });
    
    const remaining = Math.max(0, totalBudget - totalSpent);
    const progress = Math.min(100, (totalSpent / totalBudget) * 100);
    
    document.getElementById('summary-total-budget').innerHTML = `<span class="rupee-symbol">₹</span>${totalBudget.toFixed(2)}`;
    document.getElementById('summary-total-spent').innerHTML = `<span class="rupee-symbol">₹</span>${totalSpent.toFixed(2)}`;
    document.getElementById('summary-remaining').innerHTML = `<span class="rupee-symbol">₹</span>${remaining.toFixed(2)}`;
    
    const progressBar = document.getElementById('summary-progress-bar');
    progressBar.style.width = `${progress}%`;
    
    if (progress > 90) {
        progressBar.className = 'progress-bar bg-danger';
    } else if (progress > 70) {
        progressBar.className = 'progress-bar bg-warning';
    } else {
        progressBar.className = 'progress-bar bg-success';
    }
}

function renderExpenseCharts() {
    // Expense by category chart
    const expenseCtx = document.getElementById('expense-chart').getContext('2d');
    
    // Group expenses by category
    const categories = {};
    tripExpenses.forEach(expense => {
        if (!categories[expense.category]) {
            categories[expense.category] = 0;
        }
        categories[expense.category] += expense.amount;
    });
    
    const categoryLabels = Object.keys(categories);
    const categoryData = Object.values(categories);
    
    // Generate colors for each category
    const backgroundColors = categoryLabels.map((_, i) => {
        const hue = (i * 137.5) % 360; // Golden angle approximation for distinct colors
        return `hsl(${hue}, 70%, 65%)`;
    });
    
    new Chart(expenseCtx, {
        type: 'doughnut',
        data: {
            labels: categoryLabels,
            datasets: [{
                data: categoryData,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Payment mode chart
    const paymentCtx = document.getElementById('payment-chart').getContext('2d');
    
    // Group expenses by payment mode
    const paymentModes = {};
    tripExpenses.forEach(expense => {
        if (!paymentModes[expense.paymentMode]) {
            paymentModes[expense.paymentMode] = 0;
        }
        paymentModes[expense.paymentMode] += expense.amount;
    });
    
    const paymentLabels = Object.keys(paymentModes);
    const paymentData = Object.values(paymentModes);
    
    new Chart(paymentCtx, {
        type: 'pie',
        data: {
            labels: paymentLabels,
            datasets: [{
                data: paymentData,
                backgroundColor: [
                    '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function showAddExpenseModal() {
    const modal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
    
    // Set default date to today
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    
    modal.show();
}

function saveExpense() {
    const description = document.getElementById('expense-description').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;
    const paymentMode = document.getElementById('expense-payment-mode').value;
    const date = document.getElementById('expense-date').value;
    
    const expense = {
        tripId: currentTrip.id,
        description: description,
        amount: amount,
        category: category,
        paymentMode: paymentMode,
        date: date,
        addedBy: currentUser.uid,
        addedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const db = firebase.firestore();
    db.collection('expenses').add(expense)
        .then(() => {
            showToast('Expense added successfully!', 'success');
            document.getElementById('addExpenseModal').querySelector('.btn-close').click();
            document.getElementById('add-expense-form').reset();
            loadTripExpenses();
        })
        .catch((error) => {
            console.error('Error adding expense: ', error);
            showToast('Error adding expense. Please try again.', 'error');
        });
}

function editExpense(expenseId) {
    const expense = tripExpenses.find(e => e.id === expenseId);
    if (!expense) return;
    
    // For simplicity, we'll just delete and re-add
    // In a real app, you'd have a proper edit modal
    if (confirm('Edit expense: ' + expense.description)) {
        const newDescription = prompt('Enter new description:', expense.description);
        if (newDescription) {
            const newAmount = parseFloat(prompt('Enter new amount:', expense.amount));
            if (!isNaN(newAmount)) {
                const db = firebase.firestore();
                db.collection('expenses').doc(expenseId).update({
                    description: newDescription,
                    amount: newAmount
                })
                .then(() => {
                    showToast('Expense updated successfully!', 'success');
                    loadTripExpenses();
                })
                .catch((error) => {
                    console.error('Error updating expense: ', error);
                    showToast('Error updating expense. Please try again.', 'error');
                });
            }
        }
    }
}

function deleteExpense(expenseId) {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    const db = firebase.firestore();
    db.collection('expenses').doc(expenseId).delete()
        .then(() => {
            showToast('Expense deleted successfully!', 'success');
            loadTripExpenses();
        })
        .catch((error) => {
            console.error('Error deleting expense: ', error);
            showToast('Error deleting expense. Please try again.', 'error');
        });
}

function loadTripItinerary() {
    const db = firebase.firestore();
    
    db.collection('itinerary')
        .where('tripId', '==', currentTrip.id)
        .orderBy('day')
        .orderBy('time')
        .get()
        .then((querySnapshot) => {
            tripItinerary = [];
            const itineraryDays = document.getElementById('itinerary-days');
            const emptyItinerary = document.getElementById('empty-itinerary');
            
            itineraryDays.innerHTML = '';
            
            if (querySnapshot.empty) {
                emptyItinerary.style.display = 'block';
                return;
            }
            
            emptyItinerary.style.display = 'none';
            
            // Group activities by day
            const activitiesByDay = {};
            
            querySnapshot.forEach((doc) => {
                const activity = { id: doc.id, ...doc.data() };
                tripItinerary.push(activity);
                
                if (!activitiesByDay[activity.day]) {
                    activitiesByDay[activity.day] = [];
                }
                activitiesByDay[activity.day].push(activity);
            });
            
            // Display activities by day
            Object.keys(activitiesByDay).sort().forEach(day => {
                const dayCard = createDayCard(parseInt(day), activitiesByDay[day]);
                itineraryDays.appendChild(dayCard);
            });
        })
        .catch((error) => {
            console.error('Error loading itinerary: ', error);
            showToast('Error loading itinerary', 'error');
        });
}

function createDayCard(day, activities) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';
    
    // Calculate date for this day
    const startDate = new Date(currentTrip.startDate);
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + (day - 1));
    
    col.innerHTML = `
        <div class="card h-100">
            <div class="card-header">
                <h5 class="mb-0">Day ${day} - ${formatDate(dayDate.toISOString().split('T')[0])}</h5>
            </div>
            <div class="card-body">
                <div class="itinerary-activities">
                    ${activities.map(activity => `
                        <div class="activity-item mb-3 p-2 border rounded">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="mb-1">${activity.place}</h6>
                                    <p class="mb-1 text-muted small">${formatTime(activity.time)}</p>
                                    ${activity.notes ? `<p class="mb-0 small">${activity.notes}</p>` : ''}
                                </div>
                                <div class="activity-actions">
                                    <button class="btn btn-sm btn-outline-secondary edit-activity" data-activity-id="${activity.id}">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger delete-activity" data-activity-id="${activity.id}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners for activity actions
    col.querySelectorAll('.edit-activity').forEach(btn => {
        btn.addEventListener('click', function() {
            const activityId = this.getAttribute('data-activity-id');
            editActivity(activityId);
        });
    });
    
    col.querySelectorAll('.delete-activity').forEach(btn => {
        btn.addEventListener('click', function() {
            const activityId = this.getAttribute('data-activity-id');
            deleteActivity(activityId);
        });
    });
    
    return col;
}

function showAddActivityModal() {
    const modal = new bootstrap.Modal(document.getElementById('addActivityModal'));
    
    // Populate days dropdown
    const daySelect = document.getElementById('activity-day');
    daySelect.innerHTML = '';
    
    const startDate = new Date(currentTrip.startDate);
    const endDate = new Date(currentTrip.endDate);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    for (let i = 1; i <= totalDays; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Day ${i}`;
        daySelect.appendChild(option);
    }
    
    modal.show();
}

function saveActivity() {
    const day = parseInt(document.getElementById('activity-day').value);
    const time = document.getElementById('activity-time').value;
    const place = document.getElementById('activity-place').value;
    const notes = document.getElementById('activity-notes').value;
    
    const activity = {
        tripId: currentTrip.id,
        day: day,
        time: time,
        place: place,
        notes: notes,
        addedBy: currentUser.uid,
        addedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const db = firebase.firestore();
    db.collection('itinerary').add(activity)
        .then(() => {
            showToast('Activity added successfully!', 'success');
            document.getElementById('addActivityModal').querySelector('.btn-close').click();
            document.getElementById('add-activity-form').reset();
            loadTripItinerary();
        })
        .catch((error) => {
            console.error('Error adding activity: ', error);
            showToast('Error adding activity. Please try again.', 'error');
        });
}

function editActivity(activityId) {
    const activity = tripItinerary.find(a => a.id === activityId);
    if (!activity) return;
    
    // For simplicity, we'll just delete and re-add
    // In a real app, you'd have a proper edit modal
    if (confirm('Edit activity: ' + activity.place)) {
        const newPlace = prompt('Enter new place:', activity.place);
        if (newPlace) {
            const newTime = prompt('Enter new time (HH:MM):', activity.time);
            if (newTime) {
                const newNotes = prompt('Enter new notes:', activity.notes || '');
                
                const db = firebase.firestore();
                db.collection('itinerary').doc(activityId).update({
                    place: newPlace,
                    time: newTime,
                    notes: newNotes
                })
                .then(() => {
                    showToast('Activity updated successfully!', 'success');
                    loadTripItinerary();
                })
                .catch((error) => {
                    console.error('Error updating activity: ', error);
                    showToast('Error updating activity. Please try again.', 'error');
                });
            }
        }
    }
}

function deleteActivity(activityId) {
    if (!confirm('Are you sure you want to delete this activity?')) return;
    
    const db = firebase.firestore();
    db.collection('itinerary').doc(activityId).delete()
        .then(() => {
            showToast('Activity deleted successfully!', 'success');
            loadTripItinerary();
        })
        .catch((error) => {
            console.error('Error deleting activity: ', error);
            showToast('Error deleting activity. Please try again.', 'error');
        });
}

function editTrip() {
    document.getElementById('edit-trip-id').value = currentTrip.id;
    document.getElementById('edit-trip-name').value = currentTrip.name;
    document.getElementById('edit-start-location').value = currentTrip.startLocation;
    document.getElementById('edit-trip-destination').value = currentTrip.endLocation;
    document.getElementById('edit-start-date').value = currentTrip.startDate;
    document.getElementById('edit-end-date').value = currentTrip.endDate;
    document.getElementById('edit-trip-budget').value = currentTrip.budget;
    
    const modal = new bootstrap.Modal(document.getElementById('editTripModal'));
    modal.show();
}

function updateTrip() {
    const tripId = document.getElementById('edit-trip-id').value;
    const tripName = document.getElementById('edit-trip-name').value;
    const startLocation = document.getElementById('edit-start-location').value;
    const destination = document.getElementById('edit-trip-destination').value;
    const startDate = document.getElementById('edit-start-date').value;
    const endDate = document.getElementById('edit-end-date').value;
    const budget = document.getElementById('edit-trip-budget').value;
    
    const db = firebase.firestore();
    db.collection('trips').doc(tripId).update({
        name: tripName,
        startLocation: startLocation,
        endLocation: destination,
        startDate: startDate,
        endDate: endDate,
        budget: parseFloat(budget)
    })
    .then(() => {
        showToast('Trip updated successfully!', 'success');
        document.getElementById('editTripModal').querySelector('.btn-close').click();
        loadTripDetails(tripId); // Reload trip details
    })
    .catch((error) => {
        console.error('Error updating trip: ', error);
        showToast('Error updating trip. Please try again.', 'error');
    });
}

function deleteTrip() {
    if (!confirm('Are you sure you want to delete this trip? This action cannot be undone.')) return;
    
    const db = firebase.firestore();
    db.collection('trips').doc(currentTrip.id).delete()
        .then(() => {
            showToast('Trip deleted successfully!', 'success');
            window.location.href = 'dashboard.html';
        })
        .catch((error) => {
            console.error('Error deleting trip: ', error);
            showToast('Error deleting trip. Please try again.', 'error');
        });
}

function leaveTrip() {
    if (!confirm('Are you sure you want to leave this trip?')) return;
    
    const db = firebase.firestore();
    db.collection('trips').doc(currentTrip.id).update({
        members: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
    })
    .then(() => {
        showToast('You have left the trip', 'success');
        window.location.href = 'dashboard.html';
    })
    .catch((error) => {
        console.error('Error leaving trip: ', error);
        showToast('Error leaving trip. Please try again.', 'error');
    });
}

function handleCategoryChange() {
    const categorySelect = document.getElementById('expense-category');
    if (categorySelect.value === 'other') {
        // Show custom category modal
        const modal = new bootstrap.Modal(document.getElementById('customCategoryModal'));
        modal.show();
    }
}

function saveCustomCategory() {
    const categoryName = document.getElementById('category-name').value;
    
    if (!categoryName) {
        showToast('Please enter a category name', 'error');
        return;
    }
    
    // Add the custom category to the select
    const categorySelect = document.getElementById('expense-category');
    
    // Remove the "other" option temporarily
    const otherOption = categorySelect.querySelector('option[value="other"]');
    categorySelect.removeChild(otherOption);
    
    // Add the new category
    const newOption = document.createElement('option');
    newOption.value = categoryName.toLowerCase();
    newOption.textContent = categoryName;
    categorySelect.appendChild(newOption);
    
    // Add the "other" option back
    categorySelect.appendChild(otherOption);
    
    // Select the new category
    categorySelect.value = categoryName.toLowerCase();
    
    // Close the modal
    document.getElementById('customCategoryModal').querySelector('.btn-close').click();
    document.getElementById('custom-category-form').reset();
    
    showToast('Custom category added!', 'success');
}

// Helper functions from dashboard.js
function calculateTotalKms(trip) {
    // If we have meter readings, use them
    if (trip.endMeterReading && trip.startMeterReading) {
        return trip.endMeterReading - trip.startMeterReading;
    }
    
    // Otherwise, try to calculate from stops with meter readings
    let totalKms = 0;
    let lastMeterReading = trip.startMeterReading;
    
    if (trip.stops && trip.stops.length > 0) {
        for (let stop of trip.stops) {
            if (stop.meterReading && lastMeterReading !== null) {
                totalKms += stop.meterReading - lastMeterReading;
                lastMeterReading = stop.meterReading;
            } else if (stop.manualKms) {
                totalKms += stop.manualKms;
            }
        }
        
        // Add distance from last stop to end
        if (trip.endMeterReading && lastMeterReading !== null) {
            totalKms += trip.endMeterReading - lastMeterReading;
        }
    }
    
    return totalKms > 0 ? totalKms : 0;
}

function calculateFuelCost(trip, totalKms) {
    if (!trip.fuelPrice || !trip.mileage) return 0;
    const fuelConsumed = totalKms / trip.mileage;
    return fuelConsumed * trip.fuelPrice;
}

function calculateRentalCost(trip) {
    if (trip.carType !== 'rental' || !trip.rentalPerDay || !trip.rentalDays) return 0;
    return trip.rentalPerDay * trip.rentalDays;
}

// Profile functions (same as in dashboard.js)
function showProfileModal() {
    const modal = new bootstrap.Modal(document.getElementById('profileModal'));
    
    // Populate profile data
    document.getElementById('profile-name').value = currentUser.displayName || '';
    document.getElementById('profile-email').value = currentUser.email || '';
    document.getElementById('profile-userid').value = currentUser.uid;
    document.getElementById('profile-avatar').src = currentUser.photoURL || 'https://via.placeholder.com/100';
    
    modal.show();
}

function saveProfile() {
    const displayName = document.getElementById('profile-name').value;
    
    currentUser.updateProfile({
        displayName: displayName
    })
    .then(() => {
        showToast('Profile updated successfully!', 'success');
        document.getElementById('user-name').textContent = displayName;
        document.getElementById('profileModal').querySelector('.btn-close').click();
    })
    .catch((error) => {
        console.error('Error updating profile: ', error);
        showToast('Error updating profile. Please try again.', 'error');
    });
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // In a real app, you would upload this to Firebase Storage
    // For now, we'll just show a preview
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('profile-avatar').src = e.target.result;
        document.getElementById('user-avatar').src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function leaveAllTrips() {
    if (!confirm('Are you sure you want to leave all trips? This action cannot be undone.')) return;
    
    const db = firebase.firestore();
    const batch = db.batch();
    
    // We don't have all user trips loaded here, so we'll redirect to dashboard
    showToast('Redirecting to dashboard to leave all trips', 'info');
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1000);
}

function logout() {
    firebase.auth().signOut()
        .then(() => {
            window.location.href = 'index.html';
        })
        .catch((error) => {
            console.error('Error signing out: ', error);
        });
}
