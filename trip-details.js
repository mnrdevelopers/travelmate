// Trip Details JavaScript
let currentUser = null;
let currentTrip = null;
let tripExpenses = [];
let tripItinerary = [];
let expenseChart = null;
let paymentChart = null;

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

    // Event Listeners - only attach if elements exist
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Check if elements exist before adding event listeners
    const navProfile = document.getElementById('nav-profile');
    if (navProfile) {
        navProfile.addEventListener('click', showProfileModal);
    }
    
    const addExpenseBtn = document.getElementById('add-expense-btn');
    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', showAddExpenseModal);
    }
    
    const saveExpenseBtn = document.getElementById('save-expense-btn');
    if (saveExpenseBtn) {
        saveExpenseBtn.addEventListener('click', saveExpense);
    }
    
    const addActivityBtn = document.getElementById('add-activity-btn');
    if (addActivityBtn) {
        addActivityBtn.addEventListener('click', showAddActivityModal);
    }
    
    const saveActivityBtn = document.getElementById('save-activity-btn');
    if (saveActivityBtn) {
        saveActivityBtn.addEventListener('click', saveActivity);
    }
    
    const updateTripBtn = document.getElementById('update-trip-btn-trip-details');
    if (updateTripBtn) {
        updateTripBtn.addEventListener('click', updateTrip);
    }
    
    const expenseCategory = document.getElementById('expense-category');
    if (expenseCategory) {
        expenseCategory.addEventListener('change', handleCategoryChange);
    }
    
    const saveCategoryBtn = document.getElementById('save-category-btn');
    if (saveCategoryBtn) {
        saveCategoryBtn.addEventListener('click', saveCustomCategory);
    }
});

// Utility Functions
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.log(`Toast (${type}): ${message}`);
        return;
    }
    
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type === 'error' ? 'danger' : type} border-0`;
    toast.id = toastId;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-triangle' : 
                 type === 'warning' ? 'fa-exclamation-circle' : 'fa-info-circle';
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fas ${icon} me-2"></i>${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        if (toast.parentNode) {
            toast.remove();
        }
    });
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatTime(timeString) {
    if (!timeString) return '-';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function navigateTo(page) {
    window.location.href = page;
}

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
            loadTripMembers();
        })
        .catch((error) => {
            console.error('Error loading trip: ', error);
            showToast('Error loading trip', 'error');
        });
}

function displayTripDetails() {
    if (!currentTrip) return;
    
    // Basic trip info
    document.getElementById('trip-details-name').textContent = currentTrip.name || 'Unnamed Trip';
    document.getElementById('trip-details-code').textContent = currentTrip.code || 'N/A';
    
    // Overview tab
    document.getElementById('overview-start-location').textContent = currentTrip.startLocation || 'Not specified';
    document.getElementById('overview-destination').textContent = currentTrip.endLocation || 'Not specified';
    document.getElementById('overview-dates').textContent = `${formatDate(currentTrip.startDate)} - ${formatDate(currentTrip.endDate)}`;
    
    // Calculate trip stats
    const totalKms = calculateTotalKms(currentTrip);
    const fuelCost = calculateFuelCost(currentTrip, totalKms);
    const rentalCost = calculateRentalCost(currentTrip);
    
    document.getElementById('overview-distance').textContent = `${totalKms.toFixed(1)} km`;
    document.getElementById('overview-budget').innerHTML = `<span class="rupee-symbol">₹</span>${(currentTrip.budget || 0).toFixed(2)}`;
    
    // Calculate total spent (will be updated when expenses are loaded)
    const totalSpent = fuelCost + rentalCost; // Will add expenses later
    const remainingBudget = Math.max(0, (currentTrip.budget || 0) - totalSpent);
    
    document.getElementById('overview-remaining').innerHTML = `<span class="rupee-symbol">₹</span>${remainingBudget.toFixed(2)}`;
    
    const budgetProgress = currentTrip.budget ? Math.min(100, (totalSpent / currentTrip.budget) * 100) : 0;
    const progressBar = document.getElementById('budget-progress-bar');
    if (progressBar) {
        progressBar.style.width = `${budgetProgress}%`;
        progressBar.textContent = `${budgetProgress.toFixed(1)}%`;
        
        if (budgetProgress > 90) {
            progressBar.className = 'progress-bar bg-danger';
            document.getElementById('budget-status').innerHTML = '<span class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Warning: Budget almost exhausted</span>';
        } else if (budgetProgress > 70) {
            progressBar.className = 'progress-bar bg-warning';
            document.getElementById('budget-status').innerHTML = '<span class="text-warning"><i class="fas fa-exclamation-circle me-1"></i>Budget getting tight</span>';
        } else {
            progressBar.className = 'progress-bar bg-success';
            document.getElementById('budget-status').innerHTML = '<span class="text-success"><i class="fas fa-check-circle me-1"></i>Budget on track</span>';
        }
    }
    
    // Display trip actions based on user role
    const tripActions = document.getElementById('trip-actions-section');
    if (tripActions) {
        if (currentTrip.createdBy === currentUser.uid) {
            tripActions.innerHTML = `
                <h6>Trip Management</h6>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-warning btn-sm" id="edit-trip-btn">
                        <i class="fas fa-edit me-1"></i>Edit Trip
                    </button>
                    <button class="btn btn-outline-danger btn-sm" id="delete-trip-btn">
                        <i class="fas fa-trash me-1"></i>Delete Trip
                    </button>
                </div>
                <small class="text-muted">As the trip creator, you can edit or delete this trip.</small>
            `;
            
            document.getElementById('edit-trip-btn').addEventListener('click', editTrip);
            document.getElementById('delete-trip-btn').addEventListener('click', deleteTrip);
        } else {
            tripActions.innerHTML = `
                <h6>Trip Actions</h6>
                <button class="btn btn-outline-danger btn-sm" id="leave-trip-btn">
                    <i class="fas fa-sign-out-alt me-1"></i>Leave Trip
                </button>
                <small class="text-muted d-block mt-1">You can leave this trip at any time.</small>
            `;
            
            document.getElementById('leave-trip-btn').addEventListener('click', leaveTrip);
        }
    }
    
    // Display route details
    displayRouteDetails();
}

function loadTripMembers() {
    const membersList = document.getElementById('members-list');
    if (!membersList || !currentTrip.members) return;
    
    membersList.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div><p class="mt-2 text-muted">Loading members...</p></div>';
    
    const memberPromises = currentTrip.members.map(memberId => {
        return firebase.firestore().collection('users').doc(memberId).get()
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    return {
                        id: memberId,
                        name: userData.name || userData.displayName || 'Traveler',
                        email: userData.email,
                        isCurrentUser: memberId === currentUser.uid,
                        isCreator: memberId === currentTrip.createdBy
                    };
                } else {
                    return {
                        id: memberId,
                        name: 'Traveler',
                        isCurrentUser: memberId === currentUser.uid,
                        isCreator: memberId === currentTrip.createdBy
                    };
                }
            })
            .catch(() => {
                return {
                    id: memberId,
                    name: 'Traveler',
                    isCurrentUser: memberId === currentUser.uid,
                    isCreator: memberId === currentTrip.createdBy
                };
            });
    });
    
    Promise.all(memberPromises).then(members => {
        membersList.innerHTML = '';
        
        members.forEach(member => {
            const memberDiv = document.createElement('div');
            memberDiv.className = 'd-flex align-items-center mb-3 p-3 border rounded bg-light';
            
            const avatarSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=4361ee&color=fff&size=128`;
            
            const badges = [];
            if (member.isCreator) {
                badges.push('<span class="badge bg-primary me-1"><i class="fas fa-crown me-1"></i>Trip Creator</span>');
            }
            if (member.isCurrentUser) {
                badges.push('<span class="badge bg-success me-1"><i class="fas fa-user me-1"></i>You</span>');
            }
            
            memberDiv.innerHTML = `
                <img src="${avatarSrc}" class="user-avatar me-3 flex-shrink-0" alt="${member.name}" 
                     style="width: 50px; height: 50px; object-fit: cover; border: 2px solid ${member.isCreator ? '#4361ee' : member.isCurrentUser ? '#28a745' : '#dee2e6'};">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center mb-1">
                        <strong class="mb-0 me-2" style="font-size: 1.1rem;">${member.name}</strong>
                        ${badges.join('')}
                    </div>
                    ${member.email ? `<small class="text-muted d-block">${member.email}</small>` : ''}
                    <small class="text-muted">Trip Member</small>
                </div>
            `;
            
            membersList.appendChild(memberDiv);
        });
    });
}

function displayRouteDetails() {
    const routeDetails = document.getElementById('route-details');
    const emptyRoute = document.getElementById('empty-route');
    
    if (!routeDetails || !emptyRoute) return;
    
    if (!currentTrip.stops || currentTrip.stops.length === 0) {
        routeDetails.style.display = 'none';
        emptyRoute.style.display = 'block';
        return;
    }
    
    routeDetails.style.display = 'block';
    emptyRoute.style.display = 'none';
    
    let html = `
        <div class="route-summary mb-4">
            <h5><i class="fas fa-route me-2"></i>Route Summary</h5>
            <div class="row">
                <div class="col-md-4">
                    <strong>Total Distance:</strong> ${calculateTotalKms(currentTrip).toFixed(1)} km
                </div>
                <div class="col-md-4">
                    <strong>Fuel Type:</strong> ${currentTrip.fuelType || 'Not specified'}
                </div>
                <div class="col-md-4">
                    <strong>Car Type:</strong> ${currentTrip.carType || 'Not specified'}
                </div>
            </div>
        </div>
        <div class="route-breakdown">
            <h5><i class="fas fa-map-marker-alt me-2"></i>Stop-by-Stop Breakdown</h5>
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
            <td>${currentTrip.startLocation || 'Not specified'}</td>
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
            fuelUsed = distance / (currentTrip.mileage || 1);
            
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
    const finalFuelUsed = finalDistance / (currentTrip.mileage || 1);
    
    html += `
        <tr>
            <td>End</td>
            <td>${currentTrip.endLocation || 'Not specified'}</td>
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
    
    // Temporary workaround - remove ordering while indexes build
    db.collection('expenses')
        .where('tripId', '==', currentTrip.id)
        .get()
        .then((querySnapshot) => {
            tripExpenses = [];
            const expensesList = document.getElementById('expenses-list');
            const emptyExpenses = document.getElementById('empty-expenses');
            
            if (!expensesList || !emptyExpenses) return;
            
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
            });
            
            // Sort expenses by date locally (newest first)
            tripExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Create expense items after sorting
            tripExpenses.forEach(expense => {
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
    
    const categoryClass = `category-${expense.category}`;
    const categoryName = expense.category.charAt(0).toUpperCase() + expense.category.slice(1);
    
    div.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h6 class="card-title mb-1">${expense.description}</h6>
                    <div class="d-flex align-items-center mt-1 flex-wrap">
                        <span class="category-badge ${categoryClass}">${categoryName}</span>
                        <span class="badge bg-light text-dark ms-2">
                            <i class="fas fa-${getPaymentModeIcon(expense.paymentMode)} me-1"></i>${expense.paymentMode}
                        </span>
                        <small class="text-muted ms-2">${formatDate(expense.date)}</small>
                    </div>
                </div>
                <div class="text-end ms-3">
                    <div class="fw-bold fs-5"><span class="rupee-symbol">₹</span>${expense.amount.toFixed(2)}</div>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline-primary edit-expense-btn me-1" data-expense-id="${expense.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-expense-btn" data-expense-id="${expense.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners
    div.querySelector('.edit-expense-btn').addEventListener('click', function() {
        editExpense(expense.id);
    });
    
    div.querySelector('.delete-expense-btn').addEventListener('click', function() {
        deleteExpense(expense.id);
    });
    
    return div;
}

function getPaymentModeIcon(paymentMode) {
    switch(paymentMode) {
        case 'cash': return 'money-bill-wave';
        case 'upi': return 'mobile-alt';
        case 'card': return 'credit-card';
        default: return 'wallet';
    }
}

function updateBudgetSummary() {
    const totalBudget = currentTrip.budget || 0;
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
    const progress = totalBudget ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;
    
    const totalBudgetEl = document.getElementById('summary-total-budget');
    const totalSpentEl = document.getElementById('summary-total-spent');
    const remainingEl = document.getElementById('summary-remaining');
    const progressBar = document.getElementById('summary-progress-bar');
    
    if (totalBudgetEl) totalBudgetEl.innerHTML = `<span class="rupee-symbol">₹</span>${totalBudget.toFixed(2)}`;
    if (totalSpentEl) totalSpentEl.innerHTML = `<span class="rupee-symbol">₹</span>${totalSpent.toFixed(2)}`;
    if (remainingEl) remainingEl.innerHTML = `<span class="rupee-symbol">₹</span>${remaining.toFixed(2)}`;
    
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.textContent = `${progress.toFixed(1)}%`;
        
        if (progress > 90) {
            progressBar.className = 'progress-bar bg-danger';
        } else if (progress > 70) {
            progressBar.className = 'progress-bar bg-warning';
        } else {
            progressBar.className = 'progress-bar bg-success';
        }
    }
}

function renderExpenseCharts() {
    // Expense by category chart
    const expenseCtx = document.getElementById('expense-chart');
    if (!expenseCtx) return;
    
    // Destroy previous charts if they exist
    if (expenseChart) {
        expenseChart.destroy();
    }
    
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
    
    if (categoryLabels.length === 0) return;
    
    expenseChart = new Chart(expenseCtx, {
        type: 'doughnut',
        data: {
            labels: categoryLabels,
            datasets: [{
                data: categoryData,
                backgroundColor: [
                    '#ffd166', '#06d6a0', '#ef476f', '#118ab2', '#073b4c'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Payment mode chart
    const paymentCtx = document.getElementById('payment-chart');
    if (!paymentCtx) return;
    
    if (paymentChart) {
        paymentChart.destroy();
    }
    
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
    
    if (paymentLabels.length === 0) return;
    
    paymentChart = new Chart(paymentCtx, {
        type: 'pie',
        data: {
            labels: paymentLabels,
            datasets: [{
                data: paymentData,
                backgroundColor: [
                    '#28a745', '#7248b9', '#17a2b8', '#6c757d'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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
    
    if (!description || !amount || !category || !paymentMode || !date) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (amount <= 0) {
        showToast('Amount must be greater than 0', 'error');
        return;
    }
    
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
            const modal = bootstrap.Modal.getInstance(document.getElementById('addExpenseModal'));
            modal.hide();
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
    
    // Temporary workaround - remove ordering while indexes build
    db.collection('itinerary')
        .where('tripId', '==', currentTrip.id)
        .get()
        .then((querySnapshot) => {
            tripItinerary = [];
            const itineraryDays = document.getElementById('itinerary-days');
            const emptyItinerary = document.getElementById('empty-itinerary');
            
            if (!itineraryDays || !emptyItinerary) return;
            
            itineraryDays.innerHTML = '';
            
            if (querySnapshot.empty) {
                emptyItinerary.style.display = 'block';
                return;
            }
            
            emptyItinerary.style.display = 'none';
            
            querySnapshot.forEach((doc) => {
                const activity = { id: doc.id, ...doc.data() };
                tripItinerary.push(activity);
            });
            
            // Sort activities locally
            tripItinerary.sort((a, b) => {
                if (a.day !== b.day) return a.day - b.day;
                return a.time.localeCompare(b.time);
            });
            
            // Group activities by day
            const activitiesByDay = {};
            tripItinerary.forEach(activity => {
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
    col.className = 'col-12 mb-4';
    
    // Calculate date for this day
    const startDate = new Date(currentTrip.startDate);
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + (day - 1));
    
    col.innerHTML = `
        <div class="card itinerary-card">
            <div class="card-header bg-success text-white">
                <h5 class="mb-0"><i class="fas fa-calendar-day me-2"></i>Day ${day} - ${formatDate(dayDate.toISOString().split('T')[0])}</h5>
            </div>
            <div class="card-body">
                ${activities.map(activity => `
                    <div class="d-flex align-items-start mb-3 p-3 border rounded">
                        <div class="me-3 text-center">
                            <div class="bg-primary text-white rounded p-2" style="width: 70px;">
                                <div class="fw-bold">${formatTime(activity.time)}</div>
                            </div>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="mb-1 text-primary">${activity.place}</h6>
                            ${activity.notes ? `<p class="mb-0 text-muted">${activity.notes}</p>` : ''}
                            <div class="mt-2">
                                <button class="btn btn-sm btn-outline-primary edit-activity-btn me-1" data-activity-id="${activity.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-activity-btn" data-activity-id="${activity.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Add event listeners for activity actions
    col.querySelectorAll('.edit-activity-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const activityId = this.getAttribute('data-activity-id');
            editActivity(activityId);
        });
    });
    
    col.querySelectorAll('.delete-activity-btn').forEach(btn => {
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
    if (!daySelect) return;
    
    daySelect.innerHTML = '';
    
    const startDate = new Date(currentTrip.startDate);
    const endDate = new Date(currentTrip.endDate);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    for (let i = 1; i <= totalDays; i++) {
        const option = document.createElement('option');
        option.value = i;
        const dayDate = new Date(startDate.getTime() + (i-1) * 24 * 60 * 60 * 1000);
        option.textContent = `Day ${i} (${formatDate(dayDate.toISOString().split('T')[0])})`;
        daySelect.appendChild(option);
    }
    
    modal.show();
}

function saveActivity() {
    const day = parseInt(document.getElementById('activity-day').value);
    const time = document.getElementById('activity-time').value;
    const place = document.getElementById('activity-place').value;
    const notes = document.getElementById('activity-notes').value;
    
    if (!day || !time || !place) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
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
            const modal = bootstrap.Modal.getInstance(document.getElementById('addActivityModal'));
            modal.hide();
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
    
    if (!tripName || !startLocation || !destination || !startDate || !endDate || !budget) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
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
        const modal = bootstrap.Modal.getInstance(document.getElementById('editTripModal'));
        modal.hide();
        loadTripDetails(tripId); // Reload trip details
    })
    .catch((error) => {
        console.error('Error updating trip: ', error);
        showToast('Error updating trip. Please try again.', 'error');
    });
}

function deleteTrip() {
    if (!confirm('Are you sure you want to delete this trip? This action cannot be undone and will delete all trip data including expenses and itinerary.')) return;
    
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
    const modal = bootstrap.Modal.getInstance(document.getElementById('customCategoryModal'));
    modal.hide();
    document.getElementById('custom-category-form').reset();
    
    showToast('Custom category added!', 'success');
}

// Calculation functions
function calculateTotalKms(trip) {
    if (!trip) return 0;
    
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
    if (!trip || !trip.fuelPrice || !trip.mileage) return 0;
    const fuelConsumed = totalKms / trip.mileage;
    return fuelConsumed * trip.fuelPrice;
}

function calculateRentalCost(trip) {
    if (!trip || trip.carType !== 'rental' || !trip.rentalPerDay || !trip.rentalDays) return 0;
    return trip.rentalPerDay * trip.rentalDays;
}

// Profile functions
function showProfileModal() {
    // Create profile modal dynamically since it doesn't exist in trip-details.html
    let profileModal = document.getElementById('profileModal');
    if (!profileModal) {
        const modalHtml = `
            <div class="modal fade" id="profileModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">My Profile</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="profile-form">
                                <div class="text-center mb-4">
                                    <img id="profile-avatar" class="user-avatar mb-3" style="width: 100px; height: 100px;" src="${currentUser.photoURL || 'https://via.placeholder.com/100'}" alt="Profile">
                                </div>
                                <div class="mb-3">
                                    <label for="profile-name" class="form-label">Display Name</label>
                                    <input type="text" class="form-control" id="profile-name" value="${currentUser.displayName || ''}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="form-control" value="${currentUser.email || ''}" disabled>
                                    <small class="text-muted">Email cannot be changed</small>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">User ID</label>
                                    <input type="text" class="form-control" value="${currentUser.uid}" disabled>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" id="save-profile-btn">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Add event listener to the save button
        document.getElementById('save-profile-btn').addEventListener('click', saveProfile);
    }
    
    const modal = new bootstrap.Modal(document.getElementById('profileModal'));
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
        const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
        modal.hide();
    })
    .catch((error) => {
        console.error('Error updating profile: ', error);
        showToast('Error updating profile. Please try again.', 'error');
    });
}

function logout() {
    firebase.auth().signOut()
        .then(() => {
            window.location.href = 'index.html';
        })
        .catch((error) => {
            console.error('Error signing out: ', error);
            showToast('Error signing out', 'error');
        });
}
