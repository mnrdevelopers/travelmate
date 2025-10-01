// Trip Details functionality
let currentTrip = null;
let expenseChart = null;
let paymentChart = null;
let customCategories = [];

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

    // Add event listener for update trip button in trip details page
    document.getElementById('update-trip-btn-trip-details').addEventListener('click', updateTripFromDetails);
    
    // Profile navigation - check if element exists first
    const navProfile = document.getElementById('nav-profile');
    if (navProfile) {
        navProfile.addEventListener('click', showProfileModal);
    }
    
    // Enhanced CRUD event listeners
    setupEnhancedCRUDEventListeners();
}

function setupEnhancedCRUDEventListeners() {
    // Expense category handling
    const categorySelect = document.getElementById('expense-category');
    if (categorySelect) {
        categorySelect.addEventListener('change', handleCategoryChange);
    }
    
    // Custom category modal
    const saveCategoryBtn = document.getElementById('save-category-btn');
    if (saveCategoryBtn) {
        saveCategoryBtn.addEventListener('click', saveCustomCategory);
    }
    
    // Dynamic event listeners for edit/delete buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('edit-expense-btn') || e.target.closest('.edit-expense-btn')) {
            const expenseId = e.target.dataset.expenseId || e.target.closest('.edit-expense-btn').dataset.expenseId;
            editExpense(expenseId);
        }
        if (e.target.classList.contains('delete-expense-btn') || e.target.closest('.delete-expense-btn')) {
            const expenseId = e.target.dataset.expenseId || e.target.closest('.delete-expense-btn').dataset.expenseId;
            deleteExpense(expenseId);
        }
        if (e.target.classList.contains('edit-activity-btn') || e.target.closest('.edit-activity-btn')) {
            const activityId = e.target.dataset.activityId || e.target.closest('.edit-activity-btn').dataset.activityId;
            editActivity(activityId);
        }
        if (e.target.classList.contains('delete-activity-btn') || e.target.closest('.delete-activity-btn')) {
            const activityId = e.target.dataset.activityId || e.target.closest('.delete-activity-btn').dataset.activityId;
            deleteActivity(activityId);
        }
        if (e.target.classList.contains('leave-trip-btn') || e.target.closest('.leave-trip-btn')) {
            leaveCurrentTrip();
        }
    });
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
        // Refresh trip data from Firestore
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
        
        // Load all trip data
        await loadTripOverview(currentTrip);
        loadTripExpenses(currentTrip);
        loadTripItinerary(currentTrip);
        loadTripRoute(currentTrip);
        
        // Add leave trip button if user is not the creator
        if (currentTrip.createdBy !== auth.currentUser.uid) {
            addLeaveTripButton();
        }
        
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
    
    // Update distance if available - FIXED: Ensure route data is displayed
    if (trip.route && trip.route.distance) {
        document.getElementById('overview-distance').textContent = `${trip.route.distance} (${trip.route.duration})`;
    } else {
        document.getElementById('overview-distance').textContent = 'Not calculated';
    }
    
    // Load members
    await loadTripMembers(trip);

    // Add trip actions (edit/delete/leave buttons)
    addTripActions(trip);
}

async function loadTripMembers(trip) {
    const membersList = document.getElementById('members-list');
    membersList.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div><p class="mt-2 text-muted">Loading members...</p></div>';
    
    try {
        const memberPromises = trip.members.map(async (memberId) => {
            try {
                const userDoc = await db.collection('users').doc(memberId).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    return {
                        id: memberId,
                        name: userData.name || userData.displayName || userData.email || 'Traveler',
                        email: userData.email,
                        photoURL: userData.photoURL,
                        isCurrentUser: memberId === auth.currentUser.uid,
                        isCreator: memberId === trip.createdBy
                    };
                } else {
                    if (memberId === auth.currentUser.uid) {
                        const currentUser = auth.currentUser;
                        return {
                            id: memberId,
                            name: currentUser.displayName || currentUser.email || 'You',
                            email: currentUser.email,
                            photoURL: currentUser.photoURL,
                            isCurrentUser: true,
                            isCreator: memberId === trip.createdBy
                        };
                    }
                    
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
                console.error('Error fetching user data for', memberId, error);
                
                if (memberId === auth.currentUser.uid) {
                    const currentUser = auth.currentUser;
                    return {
                        id: memberId,
                        name: currentUser.displayName || currentUser.email || 'You',
                        email: currentUser.email,
                        photoURL: currentUser.photoURL,
                        isCurrentUser: true,
                        isCreator: memberId === trip.createdBy
                    };
                }
                
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
        
        // Sort members: creator first, then current user, then others alphabetically
        members.sort((a, b) => {
            if (a.isCreator && !b.isCreator) return -1;
            if (!a.isCreator && b.isCreator) return 1;
            if (a.isCurrentUser && !b.isCurrentUser) return -1;
            if (!a.isCurrentUser && b.isCurrentUser) return 1;
            return a.name.localeCompare(b.name);
        });
        
        membersList.innerHTML = '';
        
        if (members.length === 0) {
            membersList.innerHTML = '<div class="text-center text-muted py-3">No members in this trip</div>';
            return;
        }
        
        members.forEach((member) => {
            const memberDiv = document.createElement('div');
            memberDiv.className = 'd-flex align-items-center mb-3 p-3 border rounded bg-light';
            
            const avatarSrc = member.photoURL || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=4361ee&color=fff&size=128&bold=true`;
            
            // Create badges
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
        
    } catch (error) {
        console.error('Error loading members:', error);
        
        // Fallback display
        membersList.innerHTML = '';
        trip.members.forEach((memberId, index) => {
            const isCurrentUser = memberId === auth.currentUser.uid;
            const isCreator = memberId === trip.createdBy;
            
            let memberName = 'Travel Companion';
            if (isCurrentUser) memberName = 'You';
            if (isCreator && !isCurrentUser) memberName = 'Trip Creator';
            
            const memberDiv = document.createElement('div');
            memberDiv.className = 'd-flex align-items-center mb-3 p-3 border rounded bg-light';
            
            const badges = [];
            if (isCreator) badges.push('<span class="badge bg-primary me-1"><i class="fas fa-crown me-1"></i>Creator</span>');
            if (isCurrentUser) badges.push('<span class="badge bg-success me-1"><i class="fas fa-user me-1"></i>You</span>');
            
            const avatarSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(memberName)}&background=4361ee&color=fff&size=128`;
            
            memberDiv.innerHTML = `
                <img src="${avatarSrc}" class="user-avatar me-3 flex-shrink-0" alt="${memberName}" 
                     style="width: 50px; height: 50px; object-fit: cover;">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center mb-1">
                        <strong class="mb-0 me-2" style="font-size: 1.1rem;">${memberName}</strong>
                        ${badges.join('')}
                    </div>
                    <small class="text-muted">${isCreator ? 'Trip Creator' : 'Trip Member'}</small>
                </div>
            `;
            
            membersList.appendChild(memberDiv);
        });
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
    sortedExpenses.forEach((expense, index) => {
        const expenseItem = createExpenseItem(expense, index);
        expensesList.appendChild(expenseItem);
    });
    
    updateBudgetSummary(trip);
    renderExpenseChart(trip);
    renderPaymentChart(trip);
}

function createExpenseItem(expense, index) {
    const expenseItem = document.createElement('div');
    expenseItem.className = 'expense-item card mb-3';
    expenseItem.dataset.expenseId = index;
    
    const categoryClass = `category-${expense.category}`;
    const categoryName = getCategoryName(expense.category);
    const expenseDate = new Date(expense.date).toLocaleDateString();
    
    const paymentModeInfo = getPaymentModeInfo(expense.paymentMode);
    
    expenseItem.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${expense.description}</h6>
                    <div class="d-flex align-items-center mt-1 flex-wrap">
                        <span class="category-badge ${categoryClass}">${categoryName}</span>
                        <span class="badge bg-light text-dark ms-2">
                            <i class="${paymentModeInfo.icon} me-1"></i>${paymentModeInfo.text}
                        </span>
                        <small class="text-muted ms-2">${expenseDate}</small>
                    </div>
                    <div class="mt-1">
                        <small class="text-muted">
                            <i class="fas fa-user me-1"></i>
                            <span class="added-by-text">Added by: Loading...</span>
                        </small>
                    </div>
                </div>
                <div class="text-end ms-3">
                    <div class="fw-bold fs-5"><span class="rupee-symbol">₹</span>${expense.amount.toFixed(2)}</div>
                    <div class="mt-2">
                        ${expense.addedBy === auth.currentUser.uid ? `
                            <button class="btn btn-sm btn-outline-primary edit-expense-btn me-1" data-expense-id="${index}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-expense-btn" data-expense-id="${index}">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load member name asynchronously
    loadMemberNameForExpense(expenseItem, expense.addedBy);
    
    return expenseItem;
}

async function loadMemberNameForExpense(expenseItem, memberId) {
    const addedByElement = expenseItem.querySelector('.text-muted small');
    if (!addedByElement) {
        console.warn('Added by element not found in expense item');
        return;
    }
    
    if (memberId === auth.currentUser.uid) {
        addedByElement.innerHTML = '<i class="fas fa-user me-1"></i>Added by: You';
        return;
    }
    
    try {
        const memberName = await getMemberName(memberId);
        addedByElement.innerHTML = `<i class="fas fa-user me-1"></i>Added by: ${memberName}`;
    } catch (error) {
        console.error('Error loading member name for expense:', error);
        addedByElement.innerHTML = '<i class="fas fa-user me-1"></i>Added by: Traveler';
    }
}

function getPaymentModeInfo(paymentMode) {
    switch(paymentMode) {
        case 'cash': return { text: 'Cash', icon: 'fas fa-money-bill-wave' };
        case 'upi': return { text: 'UPI', icon: 'fas fa-mobile-alt' };
        case 'card': return { text: 'Card', icon: 'fas fa-credit-card' };
        case 'other': return { text: 'Other', icon: 'fas fa-wallet' };
        default: return { text: paymentMode, icon: 'fas fa-wallet' };
    }
}

async function getMemberName(memberId) {
    try {
        if (memberId === auth.currentUser.uid) return 'You';
        
        const userDoc = await db.collection('users').doc(memberId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            return userData.name || userData.displayName || 'Traveler';
        }
        return 'Traveler';
    } catch (error) {
        console.error('Error getting member name:', error);
        return 'Traveler';
    }
}

function getCategoryName(categoryId) {
    const customCategory = customCategories.find(cat => cat.id === categoryId);
    if (customCategory) return customCategory.name;
    return categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
}

function handleCategoryChange(event) {
    if (event.target.value === 'other') {
        showCustomCategoryModal();
        setTimeout(() => event.target.value = 'fuel', 100);
    }
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
    if (!trip.expenses || trip.expenses.length === 0) return;
    
    const ctx = document.getElementById('expense-chart').getContext('2d');
    
    // Destroy previous chart if it exists
    if (expenseChart) expenseChart.destroy();
    
    // Group expenses by category
    const categories = {
        fuel: 0,
        hotel: 0,
        food: 0,
        activities: 0,
        other: 0
    };
    
    // Add custom categories
    customCategories.forEach(cat => categories[cat.id] = 0);
    
    trip.expenses.forEach(expense => {
        if (categories[expense.category] !== undefined) {
            categories[expense.category] += expense.amount;
        } else {
            categories.other += expense.amount;
        }
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
    
    // Add colors for custom categories
    customCategories.forEach((cat, index) => {
        backgroundColors.push(cat.color || `#${Math.floor(Math.random()*16777215).toString(16)}`);
    });
    
    Object.keys(categories).forEach((category, index) => {
        if (categories[category] > 0) {
            labels.push(getCategoryName(category));
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

function renderPaymentChart(trip) {
    if (!trip.expenses || trip.expenses.length === 0) return;
    
    const ctx = document.getElementById('payment-chart').getContext('2d');
    
    // Destroy previous chart if it exists
    if (paymentChart) paymentChart.destroy();
    
    // Group expenses by payment mode
    const paymentModes = {
        cash: 0,
        upi: 0,
        card: 0,
        other: 0
    };
    
    trip.expenses.forEach(expense => {
        if (paymentModes[expense.paymentMode] !== undefined) {
            paymentModes[expense.paymentMode] += expense.amount;
        } else {
            paymentModes.other += expense.amount;
        }
    });
    
    const labels = Object.keys(paymentModes).filter(mode => paymentModes[mode] > 0);
    const data = labels.map(mode => paymentModes[mode]);
    const backgroundColors = labels.map(mode => {
        switch(mode) {
            case 'cash': return '#28a745';
            case 'upi': return '#7248b9';
            case 'card': return '#17a2b8';
            case 'other': return '#6c757d';
            default: return '#6c757d';
        }
    });
    
    paymentChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels.map(mode => mode.charAt(0).toUpperCase() + mode.slice(1)),
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
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
                        padding: 15,
                        usePointStyle: true
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
    trip.itinerary.forEach((activity, index) => {
        if (!activitiesByDay[activity.day]) activitiesByDay[activity.day] = [];
        activitiesByDay[activity.day].push({...activity, index});
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
                            ${activity.addedBy === auth.currentUser.uid ? `
                                <div class="mt-2">
                                    <button class="btn btn-sm btn-outline-primary edit-activity-btn me-1" data-activity-id="${activity.index}">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger delete-activity-btn" data-activity-id="${activity.index}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            ` : ''}
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
    document.getElementById('expense-date').valueAsDate = new Date();
    document.getElementById('add-expense-form').reset();
    
    document.getElementById('save-expense-btn').innerHTML = 'Add Expense';
    delete document.getElementById('save-expense-btn').dataset.editingIndex;
    
    const modal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
    modal.show();
}

async function saveExpense() {
    const description = document.getElementById('expense-description').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;
    const paymentMode = document.getElementById('expense-payment-mode').value;
    const date = document.getElementById('expense-date').value;
    const isEditing = document.getElementById('save-expense-btn').dataset.editingIndex;
    
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
        paymentMode,
        addedBy: auth.currentUser.uid,
        addedAt: new Date().toISOString()
    };
    
    try {
        document.getElementById('save-expense-btn').disabled = true;
        document.getElementById('save-expense-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Saving...';
        
        const tripDoc = await db.collection('trips').doc(currentTrip.id).get();
        const tripData = tripDoc.data();
        
        let updatedExpenses;
        if (isEditing !== undefined) {
            updatedExpenses = [...tripData.expenses];
            updatedExpenses[isEditing] = expense;
        } else {
            updatedExpenses = [...(tripData.expenses || []), expense];
        }
        
        await db.collection('trips').doc(currentTrip.id).update({
            expenses: updatedExpenses,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentTrip.expenses = updatedExpenses;
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addExpenseModal'));
        modal.hide();
        
        document.getElementById('add-expense-form').reset();
        document.getElementById('save-expense-btn').innerHTML = 'Add Expense';
        delete document.getElementById('save-expense-btn').dataset.editingIndex;
        
        loadTripDetails();
        
        showToast(isEditing !== undefined ? 'Expense updated successfully!' : 'Expense added successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving expense:', error);
        showToast('Error saving expense. Please try again.', 'danger');
    } finally {
        document.getElementById('save-expense-btn').disabled = false;
    }
}

function showAddActivityModal() {
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
    
    document.getElementById('save-activity-btn').innerHTML = 'Add Activity';
    delete document.getElementById('save-activity-btn').dataset.editingIndex;
    
    const modal = new bootstrap.Modal(document.getElementById('addActivityModal'));
    modal.show();
}

async function saveActivity() {
    const day = parseInt(document.getElementById('activity-day').value);
    const time = document.getElementById('activity-time').value;
    const place = document.getElementById('activity-place').value;
    const notes = document.getElementById('activity-notes').value;
    const isEditing = document.getElementById('save-activity-btn').dataset.editingIndex;
    
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
        document.getElementById('save-activity-btn').disabled = true;
        document.getElementById('save-activity-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Saving...';
        
        const tripDoc = await db.collection('trips').doc(currentTrip.id).get();
        const tripData = tripDoc.data();
        
        let updatedItinerary;
        if (isEditing !== undefined) {
            updatedItinerary = [...tripData.itinerary];
            updatedItinerary[isEditing] = activity;
        } else {
            updatedItinerary = [...(tripData.itinerary || []), activity];
        }
        
        await db.collection('trips').doc(currentTrip.id).update({
            itinerary: updatedItinerary,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentTrip.itinerary = updatedItinerary;
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addActivityModal'));
        modal.hide();
        
        document.getElementById('add-activity-form').reset();
        document.getElementById('save-activity-btn').innerHTML = 'Add Activity';
        delete document.getElementById('save-activity-btn').dataset.editingIndex;
        
        loadTripDetails();
        
        showToast(isEditing !== undefined ? 'Activity updated successfully!' : 'Activity added successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving activity:', error);
        showToast('Error saving activity. Please try again.', 'danger');
    } finally {
        document.getElementById('save-activity-btn').disabled = false;
    }
}

// REAL OpenRouteService API Integration
async function geocodeLocation(locationName) {
    try {
        const response = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${OPENROUTESERVICE_API_KEY}&text=${encodeURIComponent(locationName)}`);
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
            return data.features[0].geometry.coordinates; // [longitude, latitude]
        }
        throw new Error('Location not found');
    } catch (error) {
        console.error('Geocoding error:', error);
        throw error;
    }
}

async function calculateRealDistance(startLocation, destination) {
    try {
        console.log('Calculating real distance using OpenRouteService API...');
        
        // First, geocode both locations to get coordinates
        const startCoords = await geocodeLocation(startLocation);
        const destCoords = await geocodeLocation(destination);
        
        console.log('Start coordinates:', startCoords);
        console.log('Destination coordinates:', destCoords);
        
        // Now calculate the route
        const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
            method: 'POST',
            headers: {
                'Authorization': OPENROUTESERVICE_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                coordinates: [startCoords, destCoords],
                format: 'json'
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const distance = (route.summary.distance / 1000).toFixed(1); // Convert to km
            const duration = formatDuration(route.summary.duration); // Convert seconds to readable format
            
            return {
                distance: `${distance} km`,
                duration: duration,
                coordinates: {
                    start: startCoords,
                    destination: destCoords
                }
            };
        } else {
            throw new Error('No route found');
        }
        
    } catch (error) {
        console.error('OpenRouteService API error:', error);
        console.log('Falling back to simulated distance calculation...');
        
        // Fallback to simulation if API fails
        return calculateSimulatedDistance(startLocation, destination);
    }
}

function calculateSimulatedDistance(start, destination) {
    // Fallback simulation when API fails
    const baseDistance = 350;
    const randomVariation = Math.random() * 200 - 100;
    const distance = Math.max(50, baseDistance + randomVariation);
    const hours = distance / 80;
    const totalMinutes = Math.round(hours * 60);
    
    const hoursPart = Math.floor(totalMinutes / 60);
    const minutesPart = totalMinutes % 60;
    
    let duration;
    if (hoursPart > 0) {
        duration = `${hoursPart} hour${hoursPart > 1 ? 's' : ''} ${minutesPart} minute${minutesPart > 1 ? 's' : ''}`;
    } else {
        duration = `${minutesPart} minute${minutesPart > 1 ? 's' : ''}`;
    }
    
    return {
        distance: `${distance.toFixed(1)} km`,
        duration: duration,
        simulated: true // Flag to indicate this is simulated data
    };
}

async function calculateRoute() {
    if (!currentTrip) return;
    
    try {
        document.getElementById('route-details').innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border spinner-border-lg me-2" role="status"></div>
                <div class="mt-2">Calculating route...</div>
            </div>
        `;
        document.getElementById('empty-route').classList.add('d-none');
        
        document.getElementById('calculate-route-btn').disabled = true;
        document.getElementById('calculate-route-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Calculating...';
        
        // Use the utility function from utils.js
        const routeData = await calculateRealDistance(currentTrip.startLocation, currentTrip.destination);
        
        console.log('Route calculated in trip details:', routeData);
        
        // Update Firestore
        await db.collection('trips').doc(currentTrip.id).update({
            route: {
                ...routeData,
                calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local trip data immediately
        currentTrip.route = {
            ...routeData,
            calculatedAt: new Date()
        };
        
        // Update the UI immediately without reloading
        loadTripRoute(currentTrip);
        loadTripOverview(currentTrip); // This updates the overview section
        
        showToast('Route calculated successfully!', 'success');
        
    } catch (error) {
        console.error('Error calculating route:', error);
        const errorMessage = handleRouteCalculationError(error);
        document.getElementById('route-details').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${errorMessage}
            </div>
        `;
        showToast('Error calculating route', 'danger');
    } finally {
        document.getElementById('calculate-route-btn').disabled = false;
        document.getElementById('calculate-route-btn').innerHTML = '<i class="fas fa-route me-1"></i>Calculate Route';
    }
}

// Enhanced CRUD Operations
function showCustomCategoryModal() {
    document.getElementById('custom-category-form').reset();
    document.getElementById('category-color').value = '#6c757d';
    
    const modal = new bootstrap.Modal(document.getElementById('customCategoryModal'));
    modal.show();
    
    setTimeout(() => document.getElementById('category-name').focus(), 500);
}

async function saveCustomCategory() {
    const name = document.getElementById('category-name').value.trim();
    const color = document.getElementById('category-color').value;
    
    if (!name) {
        showToast('Please enter category name', 'warning');
        return;
    }

    try {
        document.getElementById('save-category-btn').disabled = true;
        document.getElementById('save-category-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';

        const category = {
            id: 'custom_' + Date.now(),
            name: name,
            color: color,
            createdBy: auth.currentUser.uid,
            createdAt: new Date().toISOString()
        };

        customCategories.push(category);
        updateCategoryDropdown();
        
        const categorySelect = document.getElementById('expense-category');
        categorySelect.value = category.id;
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('customCategoryModal'));
        modal.hide();
        
        showToast('Custom category added and selected!', 'success');
        
    } catch (error) {
        console.error('Error saving category:', error);
        showToast('Error adding category', 'danger');
    } finally {
        document.getElementById('save-category-btn').disabled = false;
        document.getElementById('save-category-btn').innerHTML = 'Add Category';
    }
}

function updateCategoryDropdown() {
    const categorySelect = document.getElementById('expense-category');
    const currentSelection = categorySelect.value;
    
    categorySelect.innerHTML = '';
    
    const defaultCategories = [
        {value: 'fuel', text: 'Fuel'},
        {value: 'hotel', text: 'Hotel'},
        {value: 'food', text: 'Food'},
        {value: 'activities', text: 'Activities'}
    ];
    
    defaultCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.value;
        option.textContent = category.text;
        categorySelect.appendChild(option);
    });
    
    customCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        option.style.color = category.color;
        categorySelect.appendChild(option);
    });
    
    const otherOption = document.createElement('option');
    otherOption.value = 'other';
    otherOption.textContent = 'Other (Add Custom Category)';
    otherOption.style.fontStyle = 'italic';
    categorySelect.appendChild(otherOption);
    
    if (currentSelection && categorySelect.querySelector(`[value="${currentSelection}"]`)) {
        categorySelect.value = currentSelection;
    } else if (categorySelect.options.length > 0) {
        categorySelect.selectedIndex = 0;
    }
}

async function editExpense(expenseIndex) {
    const expense = currentTrip.expenses[expenseIndex];
    
    document.getElementById('expense-description').value = expense.description;
    document.getElementById('expense-amount').value = expense.amount;
    document.getElementById('expense-category').value = expense.category;
    document.getElementById('expense-payment-mode').value = expense.paymentMode;
    document.getElementById('expense-date').value = expense.date;
    
    document.getElementById('save-expense-btn').innerHTML = 'Update Expense';
    document.getElementById('save-expense-btn').dataset.editingIndex = expenseIndex;
    
    const modal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
    modal.show();
}

async function deleteExpense(expenseIndex) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
        const updatedExpenses = currentTrip.expenses.filter((_, index) => index !== parseInt(expenseIndex));
        
        await db.collection('trips').doc(currentTrip.id).update({
            expenses: updatedExpenses,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentTrip.expenses = updatedExpenses;
        loadTripDetails();
        showToast('Expense deleted successfully!', 'success');
        
    } catch (error) {
        console.error('Error deleting expense:', error);
        showToast('Error deleting expense', 'danger');
    }
}

async function editActivity(activityIndex) {
    const activity = currentTrip.itinerary[activityIndex];
    
    document.getElementById('activity-day').value = activity.day;
    document.getElementById('activity-time').value = activity.time;
    document.getElementById('activity-place').value = activity.place;
    document.getElementById('activity-notes').value = activity.notes || '';
    
    document.getElementById('save-activity-btn').innerHTML = 'Update Activity';
    document.getElementById('save-activity-btn').dataset.editingIndex = activityIndex;
    
    const modal = new bootstrap.Modal(document.getElementById('addActivityModal'));
    modal.show();
}

async function deleteActivity(activityIndex) {
    if (!confirm('Are you sure you want to delete this activity?')) return;

    try {
        const updatedItinerary = currentTrip.itinerary.filter((_, index) => index !== parseInt(activityIndex));
        
        await db.collection('trips').doc(currentTrip.id).update({
            itinerary: updatedItinerary,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentTrip.itinerary = updatedItinerary;
        loadTripDetails();
        showToast('Activity deleted successfully!', 'success');
        
    } catch (error) {
        console.error('Error deleting activity:', error);
        showToast('Error deleting activity', 'danger');
    }
}

async function leaveCurrentTrip() {
    if (!confirm('Are you sure you want to leave this trip? You will need a new invitation to rejoin.')) return;

    try {
        await db.collection('trips').doc(currentTrip.id).update({
            members: firebase.firestore.FieldValue.arrayRemove(auth.currentUser.uid),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('You have left the trip', 'success');
        setTimeout(() => navigateTo('dashboard.html'), 1500);
        
    } catch (error) {
        console.error('Error leaving trip:', error);
        showToast('Error leaving trip', 'danger');
    }
}

function addLeaveTripButton() {
    const overviewTab = document.getElementById('overview');
    const existingLeaveBtn = overviewTab.querySelector('.leave-trip-btn');
    
    if (existingLeaveBtn) existingLeaveBtn.remove();
    
    const leaveButton = document.createElement('button');
    leaveButton.className = 'btn btn-outline-danger btn-sm leave-trip-btn';
    leaveButton.innerHTML = '<i class="fas fa-sign-out-alt me-1"></i>Leave Trip';
    leaveButton.style.marginTop = '10px';
    
    const tripInfoCard = overviewTab.querySelector('.card');
    if (tripInfoCard) {
        const cardBody = tripInfoCard.querySelector('.card-body');
        if (cardBody) cardBody.appendChild(leaveButton);
    }
}

function handleLogout() {
    auth.signOut().then(() => {
        navigateTo('auth.html');
    }).catch((error) => {
        console.error('Logout error:', error);
        showToast('Error logging out', 'danger');
    });
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toastId = 'toast-' + Date.now();
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

function addTripActions(trip) {
    const actionsSection = document.getElementById('trip-actions-section');
    if (!actionsSection) return;
    
    const isCreator = trip.createdBy === auth.currentUser.uid;
    
    if (isCreator) {
        actionsSection.innerHTML = `
            <h6>Trip Management</h6>
            <div class="d-flex gap-2">
                <button class="btn btn-outline-warning btn-sm" onclick="editCurrentTrip()">
                    <i class="fas fa-edit me-1"></i>Edit Trip
                </button>
                <button class="btn btn-outline-danger btn-sm" onclick="deleteCurrentTrip()">
                    <i class="fas fa-trash me-1"></i>Delete Trip
                </button>
            </div>
            <small class="text-muted">As the trip creator, you can edit or delete this trip.</small>
        `;
    } else {
        actionsSection.innerHTML = `
            <h6>Trip Actions</h6>
            <button class="btn btn-outline-danger btn-sm" onclick="leaveCurrentTrip()">
                <i class="fas fa-sign-out-alt me-1"></i>Leave Trip
            </button>
            <small class="text-muted d-block mt-1">You can leave this trip at any time.</small>
        `;
    }
}

function editCurrentTrip() {
    if (!currentTrip) return;
    
    // Populate the edit modal with current trip data
    document.getElementById('edit-trip-id').value = currentTrip.id;
    document.getElementById('edit-trip-name').value = currentTrip.name;
    document.getElementById('edit-start-location').value = currentTrip.startLocation;
    document.getElementById('edit-trip-destination').value = currentTrip.destination;
    document.getElementById('edit-start-date').value = currentTrip.startDate;
    document.getElementById('edit-end-date').value = currentTrip.endDate;
    document.getElementById('edit-trip-budget').value = currentTrip.budget;
    
    document.getElementById('edit-distance-results').classList.add('d-none');
    document.getElementById('edit-calculate-distance').checked = false;
    
    // If route already exists, show it
    if (currentTrip.route) {
        document.getElementById('edit-distance-results').classList.remove('d-none');
        document.getElementById('edit-distance-details').innerHTML = `
            <p><strong>Current Distance:</strong> ${currentTrip.route.distance}</p>
            <p><strong>Current Travel Time:</strong> ${currentTrip.route.duration}</p>
            <div class="alert alert-info mt-2">
                <small><i class="fas fa-info-circle me-1"></i>Check the box above to recalculate with updated locations</small>
            </div>
        `;
    }
    
    // Show the edit modal
    const modal = new bootstrap.Modal(document.getElementById('editTripModal'));
    modal.show();
}

async function deleteCurrentTrip() {
    if (!confirm('Are you sure you want to delete this trip? This action cannot be undone and will delete all trip data including expenses and itinerary.')) {
        return;
    }

    try {
        await db.collection('trips').doc(currentTrip.id).delete();
        
        showToast('Trip deleted successfully!', 'success');
        setTimeout(() => navigateTo('dashboard.html'), 1500);
        
    } catch (error) {
        console.error('Error deleting trip:', error);
        showToast('Error deleting trip', 'danger');
    }
}

function handleRouteCalculationError(error) {
    console.error('Route calculation error:', error);
    if (error.message.includes('API request failed')) {
        return 'Route service temporarily unavailable. Please try again later.';
    } else if (error.message.includes('Location not found')) {
        return 'One or both locations could not be found. Please check the location names.';
    } else {
        return 'Failed to calculate route. Please check your locations and try again.';
    }
}

// Add this function to trip-details.js
function showProfileModal() {
    const user = auth.currentUser;
    if (!user) return;
    
    // Create profile modal HTML dynamically since it doesn't exist in trip-details.html
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
                                <img id="profile-avatar" class="user-avatar mb-3" style="width: 100px; height: 100px;" src="${user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=4361ee&color=fff`}" alt="Profile">
                            </div>
                            <div class="mb-3">
                                <label for="profile-name" class="form-label">Display Name</label>
                                <input type="text" class="form-control" id="profile-name" value="${user.displayName || ''}" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-control" value="${user.email || ''}" disabled>
                                <small class="text-muted">Email cannot be changed</small>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">User ID</label>
                                <input type="text" class="form-control" value="${user.uid}" disabled>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="updateProfile()">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('profileModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('profileModal'));
    modal.show();
}

// Add profile update function
async function updateProfile() {
    const name = document.getElementById('profile-name').value.trim();
    
    if (!name) {
        showToast('Please enter a display name', 'warning');
        return;
    }
    
    try {
        const saveBtn = document.querySelector('#profileModal .btn-primary');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
        
        await auth.currentUser.updateProfile({
            displayName: name
        });
        
        // Update user document in Firestore
        await db.collection('users').doc(auth.currentUser.uid).update({
            name: name,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update UI
        loadUserData();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
        modal.hide();
        
        showToast('Profile updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Error updating profile', 'danger');
    }
}
