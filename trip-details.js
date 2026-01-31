// Trip Details functionality
let currentTrip = null;
let expenseChart = null;
let paymentChart = null;
let customCategories = [];
let currentFilters = {
    category: 'all',
    payment: 'all',
    member: 'all',
    date: 'all'
};
let tripMarkers = {};
let routePolyline = null;
let memberCache = {};
let memberPromises = {};

// Professional category system with icons (Add this at the top with other variables)
const professionalCategories = [
    // Transportation
    { id: 'fuel', name: 'Fuel', icon: 'fas fa-gas-pump', group: 'transportation' },
    { id: 'public-transport', name: 'Public Transport', icon: 'fas fa-bus', group: 'transportation' },
    { id: 'taxi', name: 'Taxi/Ride Share', icon: 'fas fa-taxi', group: 'transportation' },
    { id: 'flight', name: 'Flights', icon: 'fas fa-plane', group: 'transportation' },
    { id: 'train', name: 'Train', icon: 'fas fa-train', group: 'transportation' },
    { id: 'parking', name: 'Parking', icon: 'fas fa-parking', group: 'transportation' },
    { id: 'tolls', name: 'Tolls', icon: 'fas fa-road', group: 'transportation' },
    
    // Accommodation
    { id: 'hotel', name: 'Hotel', icon: 'fas fa-hotel', group: 'accommodation' },
    { id: 'hostel', name: 'Hostel', icon: 'fas fa-bed', group: 'accommodation' },
    { id: 'rental', name: 'Vacation Rental', icon: 'fas fa-home', group: 'accommodation' },
    { id: 'camping', name: 'Camping', icon: 'fas fa-campground', group: 'accommodation' },
    
    // Food & Dining
    { id: 'restaurant', name: 'Restaurant', icon: 'fas fa-utensils', group: 'food' },
    { id: 'groceries', name: 'Groceries', icon: 'fas fa-shopping-basket', group: 'food' },
    { id: 'cafe', name: 'Cafe', icon: 'fas fa-coffee', group: 'food' },
    { id: 'street-food', name: 'Street Food', icon: 'fas fa-hotdog', group: 'food' },
    { id: 'alcohol', name: 'Alcohol', icon: 'fas fa-wine-glass-alt', group: 'food' },
    
    // Activities & Entertainment
    { id: 'sightseeing', name: 'Sightseeing', icon: 'fas fa-binoculars', group: 'activities' },
    { id: 'museum', name: 'Museums', icon: 'fas fa-landmark', group: 'activities' },
    { id: 'tours', name: 'Tours', icon: 'fas fa-map-signs', group: 'activities' },
    { id: 'adventure', name: 'Adventure', icon: 'fas fa-hiking', group: 'activities' },
    { id: 'events', name: 'Events/Shows', icon: 'fas fa-ticket-alt', group: 'activities' },
    { id: 'sports', name: 'Sports', icon: 'fas fa-running', group: 'activities' },
    
    // Shopping
    { id: 'souvenirs', name: 'Souvenirs', icon: 'fas fa-gift', group: 'shopping' },
    { id: 'clothing', name: 'Clothing', icon: 'fas fa-tshirt', group: 'shopping' },
    { id: 'electronics', name: 'Electronics', icon: 'fas fa-mobile-alt', group: 'shopping' },
    
    // Health & Wellness
    { id: 'medical', name: 'Medical', icon: 'fas fa-first-aid', group: 'health' },
    { id: 'pharmacy', name: 'Pharmacy', icon: 'fas fa-pills', group: 'health' },
    { id: 'spa', name: 'Spa/Wellness', icon: 'fas fa-spa', group: 'health' },
    
    // Communication
    { id: 'sim-card', name: 'SIM Card', icon: 'fas fa-sim-card', group: 'communication' },
    { id: 'internet', name: 'Internet', icon: 'fas fa-wifi', group: 'communication' },
    
    // Services
    { id: 'laundry', name: 'Laundry', icon: 'fas fa-tshirt', group: 'services' },
    { id: 'storage', name: 'Luggage Storage', icon: 'fas fa-suitcase', group: 'services' },
    { id: 'tips', name: 'Tips', icon: 'fas fa-hand-holding-usd', group: 'services' },
    
    // Transport Rental
    { id: 'car-rental', name: 'Car Rental', icon: 'fas fa-car', group: 'transport-rental' },
    { id: 'bike-rental', name: 'Bike Rental', icon: 'fas fa-bicycle', group: 'transport-rental' },
    { id: 'scooter-rental', name: 'Scooter Rental', icon: 'fas fa-motorcycle', group: 'transport-rental' },
    
    // Travel Documents
    { id: 'visa', name: 'Visa Fees', icon: 'fas fa-passport', group: 'travel-docs' },
    { id: 'travel-insurance', name: 'Travel Insurance', icon: 'fas fa-shield-alt', group: 'travel-docs' },
    
    // Emergency
    { id: 'emergency', name: 'Emergency', icon: 'fas fa-exclamation-triangle', group: 'emergency' },
    
    // Miscellaneous
    { id: 'miscellaneous', name: 'Miscellaneous', icon: 'fas fa-ellipsis-h', group: 'misc' }
];

// Initialize category system
function initCategorySystem() {
    const categoryGrid = document.getElementById('category-grid');
    const categorySelect = document.getElementById('expense-category');
    const showMoreBtn = document.getElementById('show-more-categories');
    
    if (!categoryGrid) {
        console.log('Category grid not found, skipping initialization');
        return;
    }
    
    // Clear existing options
    categoryGrid.innerHTML = '';
    if (categorySelect) {
        categorySelect.innerHTML = '';
    }
    
    // Add default option to select
    if (categorySelect) {
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Category';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        categorySelect.appendChild(defaultOption);
    }
    
    // Use only professional categories
    const allCategories = [...professionalCategories];
    
    // Display initial categories (first 12 for better UX)
    const initialCategories = allCategories.slice(0, 12);
    renderCategoryGrid(initialCategories, categoryGrid, categorySelect);
    
    // Reset and setup "Show More" button
    if (showMoreBtn) {
        showMoreBtn.style.display = allCategories.length > 12 ? 'block' : 'none';
        showMoreBtn.innerHTML = '<i class="fas fa-ellipsis-h me-1"></i>Show More Categories';
        
        // Remove existing event listeners and add new one
        showMoreBtn.replaceWith(showMoreBtn.cloneNode(true));
        const newShowMoreBtn = document.getElementById('show-more-categories');
        
        newShowMoreBtn.addEventListener('click', function() {
            console.log('Show more categories clicked');
            renderCategoryGrid(allCategories, categoryGrid, categorySelect);
            this.style.display = 'none';
        });
    }
    
    // Update hidden select when category is clicked
    categoryGrid.addEventListener('click', function(e) {
        const categoryItem = e.target.closest('.category-item');
        if (categoryItem) {
            const categoryId = categoryItem.dataset.categoryId;
            
            // Update select value
            if (categorySelect) {
                categorySelect.value = categoryId;
            }
            
            // Update visual selection
            document.querySelectorAll('.category-item').forEach(item => {
                item.classList.remove('selected');
            });
            categoryItem.classList.add('selected');
            
            console.log('Category selected:', categoryId);
        }
    });
    
    console.log('Category system initialized with', allCategories.length, 'categories');
}

function renderCategoryGrid(categories, gridElement, selectElement) {
    if (!gridElement) {
        console.error('Category grid element not found');
        return;
    }
    
    gridElement.innerHTML = '';
    
    console.log('Rendering', categories.length, 'categories');
    
    categories.forEach(category => {
        // Create grid item
        const categoryItem = document.createElement('div');
        categoryItem.className = `category-item category-${category.group}`;
        categoryItem.dataset.categoryId = category.id;
        categoryItem.title = category.name;
        
        categoryItem.innerHTML = `
            <div class="category-icon">
                <i class="${category.icon}"></i>
            </div>
            <div class="category-name">${category.name}</div>
        `;
        
        gridElement.appendChild(categoryItem);
        
        // Also add to select dropdown (for form submission)
        if (selectElement) {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            selectElement.appendChild(option);
        }
    });
    
    console.log('Category grid rendered successfully');
}

document.addEventListener('DOMContentLoaded', function() {
    // Only setup event listeners, checkAuthState will handle the rest
    checkAuthState();
    setupTheme();
    setupTripDetailsEventListeners();
});

function setupTripDetailsEventListeners() {
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('add-expense-btn').addEventListener('click', showAddExpenseModal);
    document.getElementById('save-expense-btn').addEventListener('click', saveExpense);
    document.getElementById('save-manual-member-btn')?.addEventListener('click', saveManualMember);
    document.getElementById('add-activity-btn').addEventListener('click', showAddActivityModal);
    document.getElementById('save-activity-btn').addEventListener('click', saveActivity);
    document.getElementById('calculate-route-btn').addEventListener('click', calculateRoute);
    document.getElementById('share-settlement-btn')?.addEventListener('click', shareSettlementPlan);
    document.getElementById('add-first-expense-btn')?.addEventListener('click', showAddExpenseModal);

     // Filter event listeners
    document.getElementById('category-filter').addEventListener('change', applyExpenseFilters);
    document.getElementById('payment-filter').addEventListener('change', applyExpenseFilters);
    document.getElementById('member-filter').addEventListener('change', applyExpenseFilters);
    document.getElementById('date-filter').addEventListener('change', applyExpenseFilters);
    document.getElementById('clear-filters-btn').addEventListener('click', clearExpenseFilters);

    // Add event listener for update trip button in trip details page
    document.getElementById('update-trip-btn-trip-details').addEventListener('click', updateTripFromDetails);
    
    // Profile navigation - check if element exists first
    const navProfile = document.getElementById('nav-profile');
    if (navProfile) {
        navProfile.addEventListener('click', showProfileModal);
    }
    
    // Enhanced CRUD event listeners
    setupEnhancedCRUDEventListeners();

    // Map initialization on tab show
    const routeTab = document.querySelector('a[href="#route"]');
    if (routeTab) {
        routeTab.addEventListener('shown.bs.tab', function (e) {
            if (currentTrip) {
                loadTripMap(currentTrip);
            }
        });
    }
}

function setupEnhancedCRUDEventListeners() {
    // Single event delegation for all dynamic buttons
    document.addEventListener('click', function(e) {
        // Handle expense edit
        if (e.target.classList.contains('edit-expense-btn') || e.target.closest('.edit-expense-btn')) {
            const btn = e.target.classList.contains('edit-expense-btn') ? e.target : e.target.closest('.edit-expense-btn');
            const expenseIndex = btn.dataset.expenseIndex;
            console.log('Edit expense clicked, index:', expenseIndex);
            editExpense(expenseIndex);
        }
        
        // Handle expense delete
        if (e.target.classList.contains('delete-expense-btn') || e.target.closest('.delete-expense-btn')) {
            const btn = e.target.classList.contains('delete-expense-btn') ? e.target : e.target.closest('.delete-expense-btn');
            const expenseIndex = btn.dataset.expenseIndex;
            console.log('Delete expense clicked, index:', expenseIndex);
            deleteExpense(expenseIndex);
        }
        
        // Handle activity edit
        if (e.target.classList.contains('edit-activity-btn') || e.target.closest('.edit-activity-btn')) {
            const btn = e.target.classList.contains('edit-activity-btn') ? e.target : e.target.closest('.edit-activity-btn');
            const activityIndex = btn.dataset.activityIndex;
            console.log('Edit activity clicked, index:', activityIndex);
            if (activityIndex !== undefined) {
                editActivity(parseInt(activityIndex));
            }
        }
        
        // Handle activity delete
        if (e.target.classList.contains('delete-activity-btn') || e.target.closest('.delete-activity-btn')) {
            const btn = e.target.classList.contains('delete-activity-btn') ? e.target : e.target.closest('.delete-activity-btn');
            const activityIndex = btn.dataset.activityIndex;
            console.log('Delete activity clicked, index:', activityIndex);
            if (activityIndex !== undefined) {
                deleteActivity(parseInt(activityIndex));
            }
        }
        
        // Handle leave trip
        if (e.target.classList.contains('leave-trip-btn') || e.target.closest('.leave-trip-btn')) {
            leaveCurrentTrip();
        }
        
        // Handle share settlement plan
        if (e.target.id === 'share-settlement-btn' || e.target.closest('#share-settlement-btn')) {
            console.log('Share settlement button clicked');
            shareSettlementPlan();
        }

        // Handle activity item click (for map zoom)
        const activityItem = e.target.closest('.activity-item');
        // Ensure we didn't click a button inside the item
        if (activityItem && !e.target.closest('.btn')) {
            const locationName = activityItem.dataset.location;
            if (locationName) {
                zoomToLocation(locationName);
            }
        }
    });
}

function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // User is not signed in, redirect to auth page
            navigateTo('login.html');
        } else {
            loadUserData();
            await loadTripDetails();
        }
    });
}

function loadUserData() {
    const user = auth.currentUser;
    document.getElementById('user-name').textContent = user.displayName || 'Traveler';
    document.getElementById('user-avatar').src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Traveler')}&background=4361ee&color=fff`;
}

async function loadTripDetails() {
    const user = auth.currentUser;
    if (!user) {
        console.log('User not authenticated, waiting for auth state...');
        return;
    }
    
    currentTrip = getCurrentTrip();
    
    if (!currentTrip) {
        navigateTo('dashboard.html');
        return;
    }
    
    try {
        // Load all members' custom categories first
        window.allTripCategories = await loadAllMembersCustomCategories(currentTrip);
        
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
        await Promise.all([
            loadTripOverview(currentTrip),
            loadTripExpenses(currentTrip),
            loadTripItinerary(currentTrip),
            loadTripRoute(currentTrip),
            loadTripWeather(currentTrip)
        ]);
        
        // Add leave trip button if user is not the creator
        if (currentTrip.createdBy !== user.uid) {
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

    // Add car expense section
    addCarExpenseSection(trip);
    
    // Load members
    await loadTripMembers(trip);

    // Add trip actions (edit/delete/leave buttons)
    addTripActions(trip);
}


function addCarExpenseSection(trip) {
    const overviewTab = document.getElementById('overview');

    // Only show for car trips
    if (trip.transportMode && trip.transportMode !== 'car') {
        return;
    }
    
    // Remove existing car expense section if it exists
    const existingSection = overviewTab.querySelector('#car-expense-section');
    if (existingSection) {
        existingSection.remove();
    }
    
    // Calculate car expenses for this trip
    const carExpenses = trip.expenses ? trip.expenses.filter(expense => 
        expense.category === 'fuel' || 
        expense.description.toLowerCase().includes('car') ||
        expense.description.toLowerCase().includes('fuel') ||
        expense.description.toLowerCase().includes('rental') ||
        expense.description.toLowerCase().includes('maintenance') ||
        expense.description.toLowerCase().includes('toll') ||
        expense.description.toLowerCase().includes('parking')
    ) : [];
    
    const totalCarExpenses = carExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    if (carExpenses.length === 0) {
        return; // Don't show section if no car expenses
    }
    
    // Create car expense section
    const carExpenseSection = document.createElement('div');
    carExpenseSection.id = 'car-expense-section';
    carExpenseSection.className = 'card mb-4';
    carExpenseSection.innerHTML = `
        <div class="card-header bg-info text-white">
            <h5 class="mb-0"><i class="fas fa-car me-2"></i>Car & Fuel Expenses</h5>
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col-md-6">
                    <h6 class="text-primary">Total Car Expenses: <span class="rupee-symbol">₹</span>${totalCarExpenses.toFixed(2)}</h6>
                    <div class="mt-3">
                        ${carExpenses.slice(0, 3).map(expense => `
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <small>${expense.description}</small>
                                <small class="fw-bold"><span class="rupee-symbol">₹</span>${expense.amount.toFixed(2)}</small>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="text-center">
                        <a href="car-calculations.html" class="btn btn-primary btn-sm mb-2">
                            <i class="fas fa-calculator me-1"></i>Calculate More
                        </a>
                        <p class="small text-muted mb-0">
                            ${carExpenses.length} car-related expenses recorded
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Insert after trip information card
    const tripInfoCard = overviewTab.querySelector('.card');
    tripInfoCard.parentNode.insertBefore(carExpenseSection, tripInfoCard.nextSibling);
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
                    memberCache[memberId] = userData.name || userData.displayName || userData.email || 'Traveler';
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

        // Add manual members
        if (trip.manualMembers) {
            trip.manualMembers.forEach(mm => {
                members.push({
                    id: mm.id,
                    name: mm.name + ' (Manual)',
                    email: null,
                    photoURL: null,
                    isCurrentUser: false,
                    isCreator: false,
                    isManual: true
                });
            });
        }
        
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

        // Show/Hide Add Manual Member Button (Only Creator)
        const addMemberBtn = document.getElementById('add-manual-member-btn-header');
        if (addMemberBtn) {
            if (trip.createdBy === auth.currentUser.uid) {
                addMemberBtn.classList.remove('d-none');
            } else {
                addMemberBtn.classList.add('d-none');
            }
        }
        
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

async function loadTripExpenses(trip) {
    const expensesTbody = document.getElementById('expenses-tbody');
    const emptyExpenses = document.getElementById('empty-expenses');
    const memberFilter = document.getElementById('member-filter');
    const categoryFilter = document.getElementById('category-filter');
    
    // Populate member filter
    memberFilter.innerHTML = '<option value="all">All Members</option>';
    
    // Populate category filter
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    professionalCategories.forEach(category => {
        categoryFilter.innerHTML += `<option value="${category.id}">${category.name}</option>`;
    });
    
    if (trip.members && trip.members.length > 0) {
        for (const memberId of trip.members) {
            const memberName = await getMemberName(memberId);
            memberFilter.innerHTML += `<option value="${memberId}">${memberName}</option>`;
        }
    }

    if (trip.manualMembers) {
        trip.manualMembers.forEach(mm => {
            memberFilter.innerHTML += `<option value="${mm.id}">${mm.name} (Manual)</option>`;
        });
    }
    
    if (!trip.expenses || trip.expenses.length === 0) {
        expensesTbody.innerHTML = '';
        emptyExpenses.classList.remove('d-none');
        document.getElementById('expenses-table').classList.add('d-none');
        updateExpenseStats(trip);
        loadMemberExpenditure(trip);
        return;
    }
    
    emptyExpenses.classList.add('d-none');
    document.getElementById('expenses-table').classList.remove('d-none');
    
    filterAndDisplayExpenses();
    updateExpenseStats(trip);
    renderExpenseChart(trip);
    loadMemberExpenditure(trip);
    loadRecentExpenses(trip);
}

async function loadMemberExpenditure(trip) {
    try {
        const memberData = await calculateTripMemberExpenditure(trip);
        displayMemberExpenditure(memberData);
    } catch (error) {
        console.error('Error loading member expenditure:', error);
        document.getElementById('member-expenditure-stats').innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error loading member statistics
            </div>
        `;
    }
}

function createExpenseItem(expense, originalIndex) {
    const expenseItem = document.createElement('div');
    expenseItem.className = 'expense-item card mb-3';
    expenseItem.dataset.expenseId = originalIndex;
    
    const categoryClass = `category-${expense.category}`;
    const categoryName = getCategoryName(expense.category);
    const expenseDate = new Date(expense.date).toLocaleDateString();
    
    const paymentModeInfo = getPaymentModeInfo(expense.paymentMode);
    const isPersonal = expense.isPersonal;
    
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
                        ${isPersonal ? '<span class="badge bg-secondary ms-2"><i class="fas fa-user-lock me-1"></i>Personal</span>' : ''}
                        <small class="text-muted ms-2">${expenseDate}</small>
                    </div>
                    <div class="mt-1">
                        <small class="text-muted">
                            <i class="fas fa-user me-1"></i>
                            Paid by: <span class="added-by-text">Loading...</span>
                        </small>
                    </div>
                </div>
                <div class="text-end ms-3">
                    <div class="fw-bold fs-5"><span class="rupee-symbol">₹</span>${expense.amount.toFixed(2)}</div>
                    <div class="mt-2">
                        ${(expense.createdBy === auth.currentUser.uid || expense.addedBy === auth.currentUser.uid || currentTrip.createdBy === auth.currentUser.uid) ? `
                            <button class="btn btn-sm btn-outline-primary edit-expense-btn me-1" 
                                    data-expense-index="${originalIndex}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-expense-btn" 
                                    data-expense-index="${originalIndex}">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    loadMemberNameForExpense(expenseItem, expense.addedBy);
    return expenseItem;
}

async function loadMemberNameForExpense(expenseItem, memberId) {
    // Fix the selector to correctly target the "Added by" element
    const addedByElement = expenseItem.querySelector('.added-by-text');
    if (!addedByElement) {
        console.warn('Added by element not found in expense item');
        return;
    }
    
    if (memberId === auth.currentUser.uid) {
        addedByElement.textContent = 'You';
        return;
    }
    
    try {
        const memberName = await getMemberName(memberId);
        addedByElement.textContent = memberName;
    } catch (error) {
        console.error('Error loading member name for expense:', error);
        addedByElement.textContent = 'Traveler';
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
        if (memberCache[memberId]) return memberCache[memberId];

        // Check manual members
        if (currentTrip && currentTrip.manualMembers) {
            const manual = currentTrip.manualMembers.find(m => m.id === memberId);
            if (manual) return manual.name + ' (Manual)';
        }
        
        // Check if request is already in progress
        if (memberPromises[memberId]) {
            return await memberPromises[memberId];
        }
        
        // Create new request
        const promise = (async () => {
            const userDoc = await db.collection('users').doc(memberId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const name = userData.name || userData.displayName || userData.email || 'Traveler';
                memberCache[memberId] = name;
                return name;
            }
            return 'Traveler';
        })();
        
        memberPromises[memberId] = promise;
        const result = await promise;
        delete memberPromises[memberId];
        return result;
    } catch (error) {
        console.error('Error getting member name:', error);
        
        // Fallback for current user
        if (memberId === auth.currentUser.uid) {
            return 'You';
        }
        
        return 'Traveler';
    }
}

function getCategoryName(categoryId) {
    // First check if it's a custom category in our loaded set
    if (window.allTripCategories && window.allTripCategories[categoryId]) {
        return window.allTripCategories[categoryId].name;
    }
    
    // Then check professional categories
    const category = professionalCategories.find(cat => cat.id === categoryId);
    if (category) {
        return category.name;
    }
    
    // Fallback - show the ID but formatted nicely
    if (categoryId.startsWith('custom_')) {
        return 'Custom Category';
    }
    
    return categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
}

function updateBudgetSummary(trip) {
    // Exclude personal expenses from total budget calculation
    const totalSpent = trip.expenses ? trip.expenses.filter(e => !e.isPersonal).reduce((sum, expense) => sum + expense.amount, 0) : 0;
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
        if (expense.isPersonal) return; // Exclude personal expenses from chart
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
        if (expense.isPersonal) return; // Exclude personal expenses from chart
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

async function loadTripItinerary(trip) {
    const itineraryDays = document.getElementById('itinerary-days');
    const emptyItinerary = document.getElementById('empty-itinerary');
    
    if (!trip.itinerary || trip.itinerary.length === 0) {
        itineraryDays.innerHTML = '';
        emptyItinerary.classList.remove('d-none');
        return;
    }
    
    emptyItinerary.classList.add('d-none');
    
    // Pre-load all member names first
    const memberNames = {};
    const memberPromises = trip.members.map(async (memberId) => {
        const name = await getMemberName(memberId);
        memberNames[memberId] = name;
    });
    
    await Promise.all(memberPromises);
    
    // Group activities by day while preserving original indices
    const activitiesByDay = {};
    trip.itinerary.forEach((activity, originalIndex) => {
        if (!activity || !activity.day) {
            console.warn('Invalid activity skipped:', activity);
            return;
        }
        
        const day = activity.day.toString();
        if (!activitiesByDay[day]) {
            activitiesByDay[day] = [];
        }
        activitiesByDay[day].push({
            ...activity,
            originalIndex: originalIndex
        });
    });
    
    // Clear existing content
    itineraryDays.innerHTML = '';
    
    // Sort days numerically and create day cards
    Object.keys(activitiesByDay)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach(day => {
            const dayCard = document.createElement('div');
            dayCard.className = 'card itinerary-card mb-4';
            
            // Sort activities by time within each day
            const sortedActivities = activitiesByDay[day].sort((a, b) => {
                return a.time.localeCompare(b.time);
            });
            
            dayCard.innerHTML = `
                <div class="card-header bg-success text-white">
                    <h5 class="mb-0">
                        <i class="fas fa-calendar-day me-2"></i>Day ${day}
                        <span class="badge bg-light text-dark ms-2">${sortedActivities.length} activities</span>
                    </h5>
                </div>
                <div class="card-body">
                    ${sortedActivities.map(activity => {
                        const canEdit = activity.addedBy === auth.currentUser.uid;
                        const memberName = memberNames[activity.addedBy] || 'Traveler';
                        
                        return `
                            <div class="d-flex align-items-start mb-3 p-3 border rounded activity-item" 
                                 data-location="${activity.place}" style="cursor: pointer;" title="Click to view on map">
                                <div class="me-3 text-center flex-shrink-0">
                                    <div class="bg-primary text-white rounded p-2" style="width: 80px;">
                                        <div class="fw-bold small">${activity.time}</div>
                                    </div>
                                </div>
                                <div class="flex-grow-1">
                                    <h6 class="mb-1 text-primary">${activity.place}</h6>
                                    ${activity.notes ? `<p class="mb-2 text-muted small">${activity.notes}</p>` : ''}
                                    <div class="d-flex justify-content-between align-items-center">
                                        <small class="text-muted">
                                            <i class="fas fa-user me-1"></i>
                                            <span class="activity-added-by">${memberName}</span>
                                        </small>
                                        ${canEdit ? `
                                            <div>
                                                <button class="btn btn-sm btn-outline-primary edit-activity-btn me-1" 
                                                        data-activity-index="${activity.originalIndex}"
                                                        title="Edit Activity">
                                                    <i class="fas fa-edit"></i> Edit
                                                </button>
                                                <button class="btn btn-sm btn-outline-danger delete-activity-btn" 
                                                        data-activity-index="${activity.originalIndex}"
                                                        title="Delete Activity">
                                                    <i class="fas fa-trash"></i> Delete
                                                </button>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
            itineraryDays.appendChild(dayCard);
        });
}

function loadTripRoute(trip) {
    const routeDetails = document.getElementById('route-details');
    const emptyRoute = document.getElementById('empty-route');
    
    if (trip.route && trip.route.distance) {
        emptyRoute.classList.add('d-none');
        
        // Handle both Firestore timestamp and regular date
        let calculatedDate = 'Unknown date';
        if (trip.route.calculatedAt) {
            if (typeof trip.route.calculatedAt.toDate === 'function') {
                calculatedDate = trip.route.calculatedAt.toDate().toLocaleDateString();
            } else if (trip.route.calculatedAt instanceof Date) {
                calculatedDate = trip.route.calculatedAt.toLocaleDateString();
            } else {
                calculatedDate = new Date(trip.route.calculatedAt).toLocaleDateString();
            }
        }
        
        routeDetails.innerHTML = `
            <div class="distance-info">
                <h5><i class="fas fa-route me-2 text-primary"></i>Route Information</h5>
                <div class="row mt-4">
                    <div class="col-md-6">
                        <div class="card bg-light">
                            <div class="card-body">
                                <h6><i class="fas fa-map-marker-alt me-2 text-success"></i>Start</h6>
                                <p class="mb-0">${trip.startLocation}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card bg-light">
                            <div class="card-body">
                                <h6><i class="fas fa-flag-checkered me-2 text-danger"></i>Destination</h6>
                                <p class="mb-0">${trip.destination}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mt-4">
                    <div class="col-md-6">
                        <div class="card bg-primary text-white">
                            <div class="card-body text-center">
                                <h6><i class="fas fa-road me-2"></i>Distance</h6>
                                <h4 class="mb-0">${trip.route.distance}</h4>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card bg-info text-white">
                            <div class="card-body text-center">
                                <h6><i class="fas fa-clock me-2"></i>Travel Time</h6>
                                <h4 class="mb-0">${trip.route.duration}</h4>
                            </div>
                        </div>
                    </div>
                </div>
                ${trip.route.simulated ? `
                    <div class="alert alert-warning mt-3">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <strong>Simulated Data:</strong> This is estimated distance as route service was unavailable.
                    </div>
                ` : ''}
                <div class="mt-3 text-center">
                    <small class="text-muted">
                        <i class="fas fa-clock me-1"></i>
                        Calculated on ${calculatedDate}
                    </small>
                </div>
                <div class="text-center mt-3">
                    <button class="btn btn-primary" id="recalculate-route-btn">
                        <i class="fas fa-redo me-1"></i>Recalculate Route
                    </button>
                </div>
            </div>
        `;
        
        // Add event listener for recalculate button
        document.getElementById('recalculate-route-btn').addEventListener('click', calculateRoute);
    } else {
        routeDetails.innerHTML = '';
        emptyRoute.classList.remove('d-none');
    }
}

let tripMap = null; // Ensure this is defined if not already

async function loadTripMap(trip) {
    const mapElement = document.getElementById('trip-map');
    if (!mapElement) return;

    // Initialize map if needed
    if (!tripMap) {
        tripMap = L.map('trip-map').setView([0, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(tripMap);
    } else {
        tripMap.invalidateSize();
    }

    // Clear existing layers (markers and polyline)
    if (tripMap) {
        tripMap.eachLayer((layer) => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                tripMap.removeLayer(layer);
            }
        });
    }

    tripMarkers = {};
    const pathCoordinates = [];

    // Helper to add marker and collect coordinates
    const addMarker = async (name, type, details) => {
        try {
            const coords = await geocodeLocation(name);
            // OpenRouteService returns [lon, lat], Leaflet needs [lat, lon]
            const latLng = [coords[1], coords[0]];
            
            const marker = L.marker(latLng).addTo(tripMap)
                .bindPopup(`<b>${type}:</b> ${name}${details ? '<br>' + details : ''}`);
            
            tripMarkers[name] = marker;
            pathCoordinates.push(latLng);
        } catch (e) {
            console.warn(`Could not map location: ${name}`);
        }
    };

    // 1. Start Location
    if (trip.startLocation) await addMarker(trip.startLocation, 'Start', '');

    // 2. Itinerary Items (Sorted Chronologically)
    if (trip.itinerary && trip.itinerary.length > 0) {
        const sortedItinerary = [...trip.itinerary].sort((a, b) => {
            if (a.day !== b.day) return a.day - b.day;
            return a.time.localeCompare(b.time);
        });

        for (const activity of sortedItinerary) {
            if (activity.place) {
                await addMarker(activity.place, `Day ${activity.day}`, `${activity.time} - ${activity.notes || ''}`);
            }
        }
    }

    // 3. Destination
    if (trip.destination) await addMarker(trip.destination, 'Destination', '');

    // Draw Polyline connecting all points
    if (pathCoordinates.length > 1) {
        routePolyline = L.polyline(pathCoordinates, {
            color: '#6366f1', // Primary color
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 10',
            lineJoin: 'round'
        }).addTo(tripMap);
        
        tripMap.fitBounds(routePolyline.getBounds().pad(0.1));
    } else if (pathCoordinates.length === 1) {
        tripMap.setView(pathCoordinates[0], 10);
    }
}

function zoomToLocation(locationName) {
    // Switch to route tab if not active
    const routeTabLink = document.querySelector('a[href="#route"]');
    if (routeTabLink && !routeTabLink.classList.contains('active')) {
        const tab = new bootstrap.Tab(routeTabLink);
        tab.show();
    }
    
    // Wait for tab switch animation/rendering
    setTimeout(() => {
        const marker = tripMarkers[locationName];
        if (marker && tripMap) {
            tripMap.flyTo(marker.getLatLng(), 14, {
                duration: 1.5
            });
            marker.openPopup();
        } else {
            // Try to find it loosely if exact match fails
            const foundKey = Object.keys(tripMarkers).find(key => 
                key.toLowerCase().includes(locationName.toLowerCase()) || 
                locationName.toLowerCase().includes(key.toLowerCase())
            );
            
            if (foundKey && tripMarkers[foundKey]) {
                tripMap.flyTo(tripMarkers[foundKey].getLatLng(), 14);
                tripMarkers[foundKey].openPopup();
            } else {
                showToast(`Location "${locationName}" not found on map`, 'warning');
            }
        }
    }, 200);
}

function showAddExpenseModal() {
    document.getElementById('expense-date').valueAsDate = new Date();
    document.getElementById('add-expense-form').reset();
    
    // Reset category selection
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    document.getElementById('save-expense-btn').innerHTML = 'Add Expense';
    delete document.getElementById('save-expense-btn').dataset.editingIndex;
    
    // Initialize category system
    initCategorySystem();
    
    const modal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
    modal.show();
}

async function saveExpense() {
    const description = document.getElementById('expense-description').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;
    const paymentMode = document.getElementById('expense-payment-mode').value;
    const date = document.getElementById('expense-date').value;
    const payerId = document.getElementById('expense-payer').value;
    const isPersonal = document.getElementById('expense-personal').checked;
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
        addedBy: payerId, // The Payer (used for settlement)
        createdBy: auth.currentUser.uid, // The Record Creator (used for permissions)
        isPersonal: isPersonal,
        addedAt: new Date().toISOString()
    };
    
    try {
        document.getElementById('save-expense-btn').disabled = true;
        document.getElementById('save-expense-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Saving...';
        
        // Get fresh trip data to ensure we have the latest expenses array
        const tripDoc = await db.collection('trips').doc(currentTrip.id).get();
        const tripData = tripDoc.data();
        
        // Ensure expenses array exists
        const currentExpenses = tripData.expenses || [];
        let updatedExpenses;
        
        if (isEditing !== undefined) {
            // Editing existing expense
            updatedExpenses = [...currentExpenses];
            const editIndex = parseInt(isEditing);
            
            if (editIndex >= 0 && editIndex < updatedExpenses.length) {
                updatedExpenses[editIndex] = expense;
            } else {
                throw new Error('Invalid expense index');
            }
        } else {
            // Adding new expense
            updatedExpenses = [...currentExpenses, expense];
        }
        
        // Update the trip document with the new expenses array
        await db.collection('trips').doc(currentTrip.id).update({
            expenses: updatedExpenses,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local trip data
        currentTrip.expenses = updatedExpenses;
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addExpenseModal'));
        modal.hide();
        
        document.getElementById('add-expense-form').reset();
        document.getElementById('save-expense-btn').innerHTML = 'Add Expense';
        delete document.getElementById('save-expense-btn').dataset.editingIndex;
        
        // Reload trip details to reflect changes
        loadTripDetails();
        
        showToast(isEditing !== undefined ? 'Expense updated successfully!' : 'Expense added successfully!', 'success');

        // After successful save, reload member expenditure
        await loadMemberExpenditure(currentTrip);
        
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

async function loadCustomCategories() {
    const user = auth.currentUser;
    
    // Check if user is available
    if (!user) {
        console.log('User not available for loading custom categories');
        customCategories = [];
        updateCategoryDropdown();
        return;
    }
    
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            customCategories = userData.customCategories || [];
            
            // Convert any Firestore timestamps to Date objects if needed
            customCategories = customCategories.map(cat => {
                if (cat.createdAt && typeof cat.createdAt.toDate === 'function') {
                    cat.createdAt = cat.createdAt.toDate().toISOString();
                }
                return cat;
            });
        } else {
            // Create user document if it doesn't exist
            await db.collection('users').doc(user.uid).set({
                name: user.displayName || '',
                email: user.email || '',
                customCategories: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            customCategories = [];
        }
        
        updateCategoryDropdown();
    } catch (error) {
        console.error('Error loading custom categories:', error);
        customCategories = [];
        updateCategoryDropdown();
    }
}

function updateCategoryDropdown() {
    const categorySelect = document.getElementById('expense-category');
    if (!categorySelect) return;
    
    const currentSelection = categorySelect.value;
    
    categorySelect.innerHTML = '';
    
    // Add default categories
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Category';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    categorySelect.appendChild(defaultOption);
    
    // Add default categories
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
    
    // Add custom categories from all members
    if (window.allTripCategories) {
        Object.values(window.allTripCategories)
            .filter(cat => cat.isCustom)
            .forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = `${category.name} (by ${category.createdBy === auth.currentUser.uid ? 'You' : 'Member'})`;
                if (category.color) {
                    option.style.color = category.color;
                }
                option.setAttribute('data-color', category.color || '#6c757d');
                categorySelect.appendChild(option);
            });
    }
    
    // Add "Other" option to create new categories
    const otherOption = document.createElement('option');
    otherOption.value = 'other';
    otherOption.textContent = '+ Create New Category';
    otherOption.style.fontStyle = 'italic';
    categorySelect.appendChild(otherOption);
    
    // Restore previous selection if it exists
    if (currentSelection && categorySelect.querySelector(`[value="${currentSelection}"]`)) {
        categorySelect.value = currentSelection;
    }
}

async function editExpense(expenseIndex) {
    console.log('Editing expense index:', expenseIndex);
    
    if (!currentTrip || !currentTrip.expenses) {
        console.error('No expenses found in current trip');
        showToast('No expenses found', 'danger');
        return;
    }
    
    const expenseIndexNum = parseInt(expenseIndex);
    
    if (isNaN(expenseIndexNum) || expenseIndexNum < 0 || expenseIndexNum >= currentTrip.expenses.length) {
        console.error('Invalid expense index:', expenseIndexNum, 'Available indices: 0 to', currentTrip.expenses.length - 1);
        showToast('Invalid expense selection', 'danger');
        return;
    }
    
    const expense = currentTrip.expenses[expenseIndexNum];
    
    if (!expense) {
        console.error('Expense not found at index:', expenseIndexNum);
        showToast('Expense not found', 'danger');
        return;
    }
    
    console.log('Editing expense:', expense);
    
    // Populate the modal with expense data
    document.getElementById('expense-description').value = expense.description || '';
    document.getElementById('expense-amount').value = expense.amount || '';
    document.getElementById('expense-payment-mode').value = expense.paymentMode || 'cash';
    document.getElementById('expense-date').value = expense.date || new Date().toISOString().split('T')[0];
    document.getElementById('expense-personal').checked = expense.isPersonal || false;
    
    // Set payer
    setTimeout(() => {
        document.getElementById('expense-payer').value = expense.addedBy || auth.currentUser.uid;
    }, 500); // Wait for dropdown to populate
    
    // Initialize category system FIRST
    initCategorySystem();
    
    // Wait a bit for the category system to initialize, then set the category
    setTimeout(() => {
        // Set category in both the grid and select
        document.getElementById('expense-category').value = expense.category || '';
        
        // Update visual selection in grid
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('selected');
            if (item.dataset.categoryId === expense.category) {
                item.classList.add('selected');
            }
        });
        
        console.log('Category set to:', expense.category);
    }, 100);
    
    // Update button to show it's in edit mode
    const saveBtn = document.getElementById('save-expense-btn');
    saveBtn.innerHTML = 'Update Expense';
    saveBtn.dataset.editingIndex = expenseIndexNum;
    
    const modal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
    modal.show();
}

async function deleteExpense(expenseIndex) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    const expenseIndexNum = parseInt(expenseIndex);
    
    if (isNaN(expenseIndexNum) || expenseIndexNum < 0) {
        console.error('Invalid expense index for deletion:', expenseIndex);
        showToast('Invalid expense selection', 'danger');
        return;
    }

    try {
        // Get fresh trip data
        const tripDoc = await db.collection('trips').doc(currentTrip.id).get();
        const tripData = tripDoc.data();
        
        const currentExpenses = tripData.expenses || [];
        
        if (expenseIndexNum >= currentExpenses.length) {
            throw new Error('Expense index out of bounds');
        }
        
        const updatedExpenses = currentExpenses.filter((_, index) => index !== expenseIndexNum);
        
        await db.collection('trips').doc(currentTrip.id).update({
            expenses: updatedExpenses,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local trip data
        currentTrip.expenses = updatedExpenses;
        
        // Reload the display
        loadTripDetails();
        
        showToast('Expense deleted successfully!', 'success');

         // After successful delete, reload member expenditure
        await loadMemberExpenditure(currentTrip);
        
        showToast('Expense deleted successfully!', 'success');
        
    } catch (error) {
        console.error('Error deleting expense:', error);
        showToast('Error deleting expense. Please try again.', 'danger');
    }
}

async function editActivity(activityIndex) {
    console.log('Editing activity, index:', activityIndex);
    
    // Enhanced validation
    if (!currentTrip) {
        console.error('No current trip available');
        showToast('No trip data found', 'warning');
        return;
    }
    
    if (!currentTrip.itinerary) {
        console.error('No itinerary data available');
        showToast('No itinerary data found', 'warning');
        return;
    }
    
    if (activityIndex === undefined || activityIndex === null) {
        console.error('Invalid activity index:', activityIndex);
        showToast('Invalid activity selection', 'warning');
        return;
    }
    
    const activityIndexNum = parseInt(activityIndex);
    
    if (isNaN(activityIndexNum)) {
        console.error('Activity index is not a number:', activityIndex);
        showToast('Invalid activity index', 'warning');
        return;
    }
    
    if (activityIndexNum < 0 || activityIndexNum >= currentTrip.itinerary.length) {
        console.error('Activity index out of bounds:', activityIndexNum, 'Available:', currentTrip.itinerary.length);
        showToast('Activity not found', 'warning');
        return;
    }
    
    const activity = currentTrip.itinerary[activityIndexNum];
    
    if (!activity) {
        console.error('Activity not found at index:', activityIndexNum);
        showToast('Activity data not found', 'warning');
        return;
    }
    
    console.log('Activity data to edit:', activity);
    
    // Validate required fields
    if (!activity.day || !activity.time || !activity.place) {
        console.error('Invalid activity data - missing required fields:', activity);
        showToast('Invalid activity data - missing required information', 'warning');
        return;
    }
    
    try {
        // First, populate the day dropdown
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
        
        // Now populate the form with activity data
        document.getElementById('activity-day').value = activity.day;
        document.getElementById('activity-time').value = activity.time;
        document.getElementById('activity-place').value = activity.place;
        document.getElementById('activity-notes').value = activity.notes || '';
        
        // Update button to show edit mode
        const saveBtn = document.getElementById('save-activity-btn');
        saveBtn.innerHTML = 'Update Activity';
        saveBtn.dataset.editingIndex = activityIndexNum;
        
        const modal = new bootstrap.Modal(document.getElementById('addActivityModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error populating activity form:', error);
        showToast('Error loading activity data', 'danger');
    }
}

async function deleteActivity(activityIndex) {
    console.log('Deleting activity, index:', activityIndex);
    
    if (!confirm('Are you sure you want to delete this activity?')) return;

    // Enhanced validation
    if (activityIndex === undefined || activityIndex === null) {
        console.error('Invalid activity index for deletion:', activityIndex);
        showToast('Invalid activity selection', 'warning');
        return;
    }

    const activityIndexNum = parseInt(activityIndex);
    
    if (isNaN(activityIndexNum)) {
        console.error('Activity index for deletion is not a number:', activityIndex);
        showToast('Invalid activity selection', 'danger');
        return;
    }

    if (activityIndexNum < 0) {
        console.error('Activity index for deletion is negative:', activityIndexNum);
        showToast('Invalid activity selection', 'danger');
        return;
    }

    try {
        // Get fresh trip data to ensure we have the latest itinerary
        const tripDoc = await db.collection('trips').doc(currentTrip.id).get();
        const tripData = tripDoc.data();
        
        const currentItinerary = tripData.itinerary || [];
        
        if (activityIndexNum >= currentItinerary.length) {
            console.error('Activity index out of bounds:', activityIndexNum, 'Available:', currentItinerary.length);
            showToast('Activity not found', 'danger');
            return;
        }
        
        // Get activity details for confirmation message
        const activityToDelete = currentItinerary[activityIndexNum];
        const activityDetails = activityToDelete ? `${activityToDelete.place} on Day ${activityToDelete.day}` : 'this activity';
        
        if (!confirm(`Are you sure you want to delete "${activityDetails}"?`)) {
            return;
        }
        
        const updatedItinerary = currentItinerary.filter((_, index) => index !== activityIndexNum);
        
        await db.collection('trips').doc(currentTrip.id).update({
            itinerary: updatedItinerary,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local trip data
        currentTrip.itinerary = updatedItinerary;
        
        // Reload the itinerary display
        loadTripItinerary(currentTrip);
        
        showToast('Activity deleted successfully!', 'success');
        
    } catch (error) {
        console.error('Error deleting activity:', error);
        showToast('Error deleting activity. Please try again.', 'danger');
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
    if (!confirm('Are you sure you want to log out?')) {
        return;
    }

    auth.signOut().then(() => {
        // Redirect to dashboard (which will show public view) instead of auth page
        navigateTo('dashboard.html');
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
    document.getElementById('edit-transport-mode').value = currentTrip.transportMode || 'car';
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
                                <label class="form-label">Password</label>
                                <button type="button" class="btn btn-outline-secondary w-100" onclick="handleChangePassword()">
                                    <i class="fas fa-key me-1"></i>Change Password
                                </button>
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

async function handleChangePassword() {
    const user = auth.currentUser;
    if (!user) return;

    const isGoogle = user.providerData.some(userInfo => userInfo.providerId === 'google.com');
    
    if (isGoogle) {
        showToast('You are logged in with Google. Please change your password via Google Account settings.', 'info');
        return;
    }

    if (confirm(`Send password reset email to ${user.email}?`)) {
        try {
            await auth.sendPasswordResetEmail(user.email);
            showToast('Password reset email sent!', 'success');
        } catch (error) {
            console.error('Error sending reset email:', error);
            showToast('Error sending reset email: ' + error.message, 'danger');
        }
    }
}

async function updateTripFromDetails() {
    const tripId = document.getElementById('edit-trip-id').value;
    const name = document.getElementById('edit-trip-name').value;
    const transportMode = document.getElementById('edit-transport-mode').value;
    const startLocation = document.getElementById('edit-start-location').value;
    const destination = document.getElementById('edit-trip-destination').value;
    const startDate = document.getElementById('edit-start-date').value;
    const endDate = document.getElementById('edit-end-date').value;
    const budget = parseFloat(document.getElementById('edit-trip-budget').value);
    const recalculateDistance = document.getElementById('edit-calculate-distance').checked;
    
    if (!name || !validateLocation(startLocation) || !validateLocation(destination) || !startDate || !endDate || !budget) {
        showToast('Please fill in all fields with valid data', 'warning');
        return;
    }
    
    if (!validateDates(startDate, endDate)) {
        showToast('End date must be after start date', 'warning');
        return;
    }
    
    if (budget <= 0) {
        showToast('Budget must be greater than 0', 'warning');
        return;
    }
    
    try {
        const updateBtn = document.getElementById('update-trip-btn-trip-details');
        updateBtn.disabled = true;
        updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Updating...';
        
        const updateData = {
            name: name.trim(),
            transportMode,
            startLocation: startLocation.trim(),
            destination: destination.trim(),
            startDate,
            endDate,
            budget,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Recalculate route if requested
        if (recalculateDistance) {
            try {
                const routeData = await calculateRealDistance(startLocation, destination);
                updateData.route = {
                    ...routeData,
                    calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
            } catch (error) {
                console.error('Error recalculating route:', error);
                // Continue without route data if calculation fails
            }
        }
        
        await db.collection('trips').doc(tripId).update(updateData);
        
        // Update local trip data
        currentTrip = {
            ...currentTrip,
            ...updateData
        };
        setCurrentTrip(currentTrip);
        
        // Reload the trip details to reflect changes
        await loadTripDetails();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('editTripModal'));
        modal.hide();
        
        showToast('Trip updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating trip:', error);
        showToast('Error updating trip. Please try again.', 'danger');
    } finally {
        const updateBtn = document.getElementById('update-trip-btn-trip-details');
        updateBtn.disabled = false;
        updateBtn.innerHTML = '<i class="fas fa-save me-1"></i>Update Trip';
    }
}

async function loadAllMembersCustomCategories(trip) {
    const allCategories = {};
    
    // Start with default categories
    const defaultCategories = {
        'fuel': 'Fuel',
        'hotel': 'Hotel',
        'food': 'Food', 
        'activities': 'Activities'
    };
    
    Object.keys(defaultCategories).forEach(catId => {
        allCategories[catId] = {
            id: catId,
            name: defaultCategories[catId],
            isDefault: true
        };
    });
    
    // Load custom categories from all members
    const memberPromises = trip.members.map(async (memberId) => {
        try {
            const userDoc = await db.collection('users').doc(memberId).get();
            if (userDoc.exists && userDoc.data().customCategories) {
                userDoc.data().customCategories.forEach(cat => {
                    if (!allCategories[cat.id]) {
                        allCategories[cat.id] = {
                            ...cat,
                            createdBy: memberId,
                            isCustom: true
                        };
                    }
                });
            }
        } catch (error) {
            console.error('Error loading categories for member:', memberId, error);
        }
    });
    
    await Promise.all(memberPromises);
    return allCategories;
}

function resetExpenseModal() {
    document.getElementById('add-expense-form').reset();
    document.getElementById('expense-date').valueAsDate = new Date();
    
    const saveBtn = document.getElementById('save-expense-btn');
    saveBtn.innerHTML = 'Add Expense';
    saveBtn.disabled = false;
    
    // Important: Clear the editing index
    if (saveBtn.dataset.editingIndex) {
        delete saveBtn.dataset.editingIndex;
    }
}

// Update showAddExpenseModal:
function showAddExpenseModal() {
    document.getElementById('expense-date').valueAsDate = new Date();
    document.getElementById('add-expense-form').reset();
    
    // Reset category selection
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    document.getElementById('save-expense-btn').innerHTML = 'Add Expense';
    delete document.getElementById('save-expense-btn').dataset.editingIndex;
    
    // Populate Payer Dropdown
    const payerSelect = document.getElementById('expense-payer');
    payerSelect.innerHTML = '';
    
    // Add current user
    const currentUserOption = document.createElement('option');
    currentUserOption.value = auth.currentUser.uid;
    currentUserOption.textContent = 'You';
    payerSelect.appendChild(currentUserOption);
    
    // Add other members
    if (currentTrip.members) {
        currentTrip.members.forEach(async memberId => {
            if (memberId !== auth.currentUser.uid) {
                const name = await getMemberName(memberId);
                const option = document.createElement('option');
                option.value = memberId;
                option.textContent = name;
                payerSelect.appendChild(option);
            }
        });
    }
    
    // Add manual members
    if (currentTrip.manualMembers) {
        currentTrip.manualMembers.forEach(mm => {
            const option = document.createElement('option');
            option.value = mm.id;
            option.textContent = mm.name + ' (Manual)';
            payerSelect.appendChild(option);
        });
    }
    
    // Reset personal checkbox
    document.getElementById('expense-personal').checked = false;

    // Initialize category system
    initCategorySystem();
    
    const modal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
    modal.show();
}

function showAddManualMemberModal() {
    document.getElementById('manual-member-name').value = '';
    const modal = new bootstrap.Modal(document.getElementById('addManualMemberModal'));
    modal.show();
}

async function saveManualMember() {
    const nameInput = document.getElementById('manual-member-name');
    const name = nameInput.value.trim();
    
    if (!name) {
        showToast('Please enter a member name', 'warning');
        return;
    }
    
    const saveBtn = document.getElementById('save-manual-member-btn');
    
    try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';
        
        const manualMember = {
            id: `manual_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name: name,
            addedAt: new Date().toISOString(),
            isManual: true
        };
        
        // Update Firestore
        await db.collection('trips').doc(currentTrip.id).update({
            manualMembers: firebase.firestore.FieldValue.arrayUnion(manualMember),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local trip data
        if (!currentTrip.manualMembers) {
            currentTrip.manualMembers = [];
        }
        currentTrip.manualMembers.push(manualMember);
        
        // Reload members list
        await loadTripMembers(currentTrip);
        
        // Update filters
        const memberFilter = document.getElementById('member-filter');
        if (memberFilter) {
             const option = document.createElement('option');
             option.value = manualMember.id;
             option.textContent = `${manualMember.name} (Manual)`;
             memberFilter.appendChild(option);
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('addManualMemberModal'));
        modal.hide();
        
        showToast('Manual member added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding manual member:', error);
        showToast('Error adding member', 'danger');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Add Member';
    }
}

// Add this to utils.js for data migration if needed
async function migrateExpensesToArrayFormat() {
    try {
        const tripsSnapshot = await db.collection('trips')
            .where('members', 'array-contains', auth.currentUser.uid)
            .get();
        
        const migrationPromises = [];
        
        tripsSnapshot.forEach(doc => {
            const tripData = doc.data();
            
            // If expenses don't exist as array, initialize them
            if (!tripData.expenses) {
                migrationPromises.push(
                    db.collection('trips').doc(doc.id).update({
                        expenses: [],
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    })
                );
            }
        });
        
        await Promise.all(migrationPromises);
        console.log('Expense migration completed');
    } catch (error) {
        console.error('Error migrating expenses:', error);
    }
}

function debugExpenses() {
    console.log('=== EXPENSE DEBUG INFO ===');
    console.log('Current Trip:', currentTrip);
    console.log('Expenses Array:', currentTrip?.expenses);
    console.log('Expenses Count:', currentTrip?.expenses?.length);
    
    if (currentTrip?.expenses) {
        currentTrip.expenses.forEach((expense, index) => {
            console.log(`Expense [${index}]:`, expense);
        });
    }
    console.log('=== END DEBUG INFO ===');
}

function applyExpenseFilters() {
    currentFilters = {
        category: document.getElementById('category-filter').value,
        payment: document.getElementById('payment-filter').value,
        member: document.getElementById('member-filter').value,
        date: document.getElementById('date-filter').value
    };
    
    filterAndDisplayExpenses();
}

function clearExpenseFilters() {
    document.getElementById('category-filter').value = 'all';
    document.getElementById('payment-filter').value = 'all';
    document.getElementById('member-filter').value = 'all';
    document.getElementById('date-filter').value = 'all';
    
    currentFilters = {
        category: 'all',
        payment: 'all',
        member: 'all',
        date: 'all'
    };
    
    filterAndDisplayExpenses();
}

function filterAndDisplayExpenses() {
    if (!currentTrip || !currentTrip.expenses) return;
    
    let filteredExpenses = [...currentTrip.expenses];
    
    // Apply filters
    if (currentFilters.category !== 'all') {
        filteredExpenses = filteredExpenses.filter(expense => 
            expense.category === currentFilters.category
        );
    }
    
    if (currentFilters.payment !== 'all') {
        filteredExpenses = filteredExpenses.filter(expense => 
            expense.paymentMode === currentFilters.payment
        );
    }
    
    if (currentFilters.member !== 'all') {
        filteredExpenses = filteredExpenses.filter(expense => 
            expense.addedBy === currentFilters.member
        );
    }
    
    if (currentFilters.date !== 'all') {
        const now = new Date();
        filteredExpenses = filteredExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            
            switch(currentFilters.date) {
                case 'today':
                    return expenseDate.toDateString() === now.toDateString();
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return expenseDate >= weekAgo;
                case 'month':
                    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                    return expenseDate >= monthAgo;
                default:
                    return true;
            }
        });
    }
    
    displayExpensesTable(filteredExpenses);
    updateExpenseStats(currentTrip, filteredExpenses);
}

function displayExpensesTable(expenses) {
    const expensesTbody = document.getElementById('expenses-tbody');
    const expensesCount = document.getElementById('expenses-count');
    
    expensesCount.textContent = `${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'}`;
    
    if (expenses.length === 0) {
        expensesTbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-muted">
                    <i class="fas fa-search fa-2x mb-3 d-block"></i>
                    No expenses match your filters
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort expenses by date (newest first)
    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    expensesTbody.innerHTML = sortedExpenses.map((expense, displayIndex) => {
        const categoryName = getCategoryName(expense.category);
        const expenseDate = new Date(expense.date).toLocaleDateString();
        const canEdit = expense.createdBy === auth.currentUser.uid || expense.addedBy === auth.currentUser.uid || currentTrip.createdBy === auth.currentUser.uid;
        const isPersonal = expense.isPersonal;
        
        // Find the original index in the currentTrip.expenses array
        let originalIndex = -1;
        if (currentTrip.expenses) {
            originalIndex = currentTrip.expenses.findIndex(e => 
                e.description === expense.description && 
                e.amount === expense.amount && 
                e.date === expense.date &&
                e.addedBy === expense.addedBy
            );
        }
        
        return `
            <tr>
                <td>
                    <div class="fw-semibold">${expense.description}</div>
                    <small class="text-muted">Paid by: <span class="added-by" data-member-id="${expense.addedBy}">Loading...</span></small>
                </td>
                <td>
                    <span class="expense-amount"><span class="rupee-symbol">₹</span>${expense.amount.toFixed(2)}</span>
                </td>
                <td>
                    <span class="expense-category category-${getCategoryGroup(expense.category)}">${categoryName}</span>
                </td>
                <td>
                    <span class="payment-badge payment-${expense.paymentMode}">
                        <i class="${getPaymentModeIcon(expense.paymentMode)} me-1"></i>
                        ${getPaymentModeText(expense.paymentMode)}
                    </span>
                    ${isPersonal ? '<br><span class="badge bg-secondary mt-1" style="font-size:0.65rem">Personal</span>' : ''}
                </td>
                <td>
                    <span class="expense-date">${expenseDate}</span>
                </td>
                <td>
                    ${canEdit ? `
                        <div class="action-buttons">
                            <button class="btn btn-outline-primary btn-sm edit-expense-btn" 
                                    data-expense-index="${originalIndex}"
                                    title="Edit Expense">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm delete-expense-btn" 
                                    data-expense-index="${originalIndex}"
                                    title="Delete Expense">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    ` : '<span class="text-muted">Read only</span>'}
                </td>
            </tr>
        `;
    }).join('');
    
    // Load member names for each expense
    loadAllMemberNamesForExpenses(expenses);
}

async function loadAllMemberNamesForExpenses(expenses) {
    // Get unique member IDs from all expenses
    const uniqueMemberIds = [...new Set(expenses.map(expense => expense.addedBy))];
    
    // Pre-load all member names
    const memberNames = {};
    const memberPromises = uniqueMemberIds.map(async (memberId) => {
        try {
            const name = await getMemberName(memberId);
            memberNames[memberId] = name;
        } catch (error) {
            console.error('Error loading member name:', error);
            memberNames[memberId] = 'Traveler';
        }
    });
    
    // Wait for all member names to load
    await Promise.all(memberPromises);
    
    // Update all "Added by" elements
    document.querySelectorAll('.added-by').forEach(element => {
        const memberId = element.dataset.memberId;
        if (memberNames[memberId]) {
            element.textContent = memberId === auth.currentUser.uid ? 'You' : memberNames[memberId];
        }
    });
}

function getCategoryGroup(categoryId) {
    const category = professionalCategories.find(cat => cat.id === categoryId);
    return category ? category.group : 'misc';
}

function getPaymentModeIcon(paymentMode) {
    switch(paymentMode) {
        case 'cash': return 'fas fa-money-bill-wave';
        case 'upi': return 'fas fa-mobile-alt';
        case 'card': return 'fas fa-credit-card';
        case 'other': return 'fas fa-wallet';
        default: return 'fas fa-wallet';
    }
}

function getPaymentModeText(paymentMode) {
    switch(paymentMode) {
        case 'cash': return 'Cash';
        case 'upi': return 'UPI';
        case 'card': return 'Card';
        case 'other': return 'Other';
        default: return paymentMode;
    }
}

function getOriginalExpenseIndex(expense) {
    if (!currentTrip.expenses) return -1;
    
    // Find the exact expense in the original array by matching multiple properties
    return currentTrip.expenses.findIndex(e => 
        e.description === expense.description && 
        e.amount === expense.amount && 
        e.date === expense.date &&
        e.addedBy === expense.addedBy &&
        e.category === expense.category
    );
}

function displayFilteredExpenses(expenses) {
    const expensesList = document.getElementById('expenses-list');
    const emptyExpenses = document.getElementById('empty-expenses');
    
    if (expenses.length === 0) {
        expensesList.innerHTML = '';
        emptyExpenses.classList.remove('d-none');
        return;
    }
    
    emptyExpenses.classList.add('d-none');
    
    // Sort expenses by date (newest first) but preserve original indices
    const sortedExpenses = expenses.map((expense, originalIndex) => ({
        ...expense,
        originalIndex
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    expensesList.innerHTML = '';
    sortedExpenses.forEach((expense, displayIndex) => {
        const expenseItem = createExpenseItem(expense, expense.originalIndex);
        expensesList.appendChild(expenseItem);
    });
    
    // Update summary with filtered data
    updateFilteredBudgetSummary(expenses);
}

function updateFilteredBudgetSummary(expenses) {
    const totalSpent = expenses.filter(e => !e.isPersonal).reduce((sum, expense) => sum + expense.amount, 0);
    const remaining = currentTrip.budget - totalSpent;
    const progressPercent = Math.min((totalSpent / currentTrip.budget) * 100, 100);
    
    document.getElementById('summary-total-budget').innerHTML = `<span class="rupee-symbol">₹</span>${currentTrip.budget.toFixed(2)}`;
    document.getElementById('summary-total-spent').innerHTML = `<span class="rupee-symbol">₹</span>${totalSpent.toFixed(2)}`;
    document.getElementById('summary-remaining').innerHTML = `<span class="rupee-symbol">₹</span>${remaining.toFixed(2)}`;
    
    const progressBar = document.getElementById('summary-progress-bar');
    progressBar.style.width = `${progressPercent}%`;
    progressBar.textContent = `${progressPercent.toFixed(1)}%`;
    
    // Color code based on budget status
    if (remaining < 0) {
        progressBar.className = 'progress-bar bg-danger';
    } else if (remaining < currentTrip.budget * 0.2) {
        progressBar.className = 'progress-bar bg-warning';
    } else {
        progressBar.className = 'progress-bar bg-success';
    }
}

// Add to trip-details.js

function calculateTripMemberExpenditure(trip) {
    const memberExpenses = {};
    const memberData = [];
    
    // Initialize member expenses
    trip.members.forEach(memberId => {
        memberExpenses[memberId] = 0;
    });
    if (trip.manualMembers) {
        trip.manualMembers.forEach(mm => {
            memberExpenses[mm.id] = 0;
        });
    }
    
    // Calculate expenses for each member
    if (trip.expenses) {
        trip.expenses.forEach(expense => {
            if (expense.isPersonal) return; // Skip personal expenses for settlement
            if (memberExpenses[expense.addedBy] !== undefined) {
                memberExpenses[expense.addedBy] += expense.amount;
            }
        });
    }
    
    // Prepare member data for display
    const allMemberIds = [...trip.members];
    if (trip.manualMembers) {
        trip.manualMembers.forEach(mm => allMemberIds.push(mm.id));
    }

    const promises = allMemberIds.map(async (memberId) => {
        const memberName = await getMemberName(memberId);
        const totalSpent = memberExpenses[memberId] || 0;
        
        return {
            id: memberId,
            name: memberName,
            totalSpent: totalSpent,
            isCurrentUser: memberId === auth.currentUser.uid
        };
    });
    
    return Promise.all(promises);
}

function displayMemberExpenditure(memberData) {
    const memberStatsElement = document.getElementById('member-expenditure-stats');
    
    if (!memberData || memberData.length === 0) {
        memberStatsElement.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="fas fa-users fa-2x mb-2"></i>
                <p>No members in this trip</p>
            </div>
        `;
        return;
    }
    
    // Calculate total expenses
    const totalExpenses = memberData.reduce((sum, member) => sum + member.totalSpent, 0);
    const averagePerPerson = totalExpenses / memberData.length;
    
    // Sort by amount spent (descending)
    memberData.sort((a, b) => b.totalSpent - a.totalSpent);
    
    if (totalExpenses === 0) {
        memberStatsElement.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="fas fa-receipt fa-2x mb-2"></i>
                <p>No expenses recorded yet</p>
                <small>Start adding expenses to see member breakdown</small>
            </div>
        `;
        return;
    }
    
    memberStatsElement.innerHTML = `
        <div class="mb-3 text-center">
            <h5 class="text-primary"><span class="rupee-symbol">₹</span>${totalExpenses.toFixed(2)}</h5>
            <small class="text-muted">Total Trip Expenses</small>
        </div>
        
        <div class="member-expense-list">
            ${memberData.map(member => {
                const percentage = totalExpenses > 0 ? (member.totalSpent / totalExpenses * 100) : 0;
                const balance = member.totalSpent - averagePerPerson;
                
                return `
                    <div class="d-flex justify-content-between align-items-center mb-3 p-2 border rounded ${member.isCurrentUser ? 'bg-light' : ''}">
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <strong class="${member.isCurrentUser ? 'text-primary' : ''}">
                                    ${member.name} ${member.isCurrentUser ? '(You)' : ''}
                                </strong>
                                <span class="fw-bold"><span class="rupee-symbol">₹</span>${member.totalSpent.toFixed(2)}</span>
                            </div>
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar ${member.isCurrentUser ? 'bg-primary' : 'bg-success'}" 
                                     style="width: ${percentage}%"></div>
                            </div>
                            <div class="d-flex justify-content-between mt-1">
                                <small class="text-muted">${percentage.toFixed(1)}%</small>
                                <small class="${balance > 0 ? 'text-warning' : balance < 0 ? 'text-info' : 'text-success'}">
                                    ${balance > 0 ? `+₹${Math.abs(balance).toFixed(2)}` : 
                                      balance < 0 ? `-₹${Math.abs(balance).toFixed(2)}` : 'Balanced'}
                                </small>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        
        <div class="text-center mt-3">
            <small class="text-muted">
                <i class="fas fa-info-circle me-1"></i>
                Average per person: <span class="rupee-symbol">₹</span>${averagePerPerson.toFixed(2)}
            </small>
        </div>
    `;
    
    // Calculate and display settlement summary
    calculateAndDisplaySettlement(memberData, averagePerPerson);
}

function calculateAndDisplaySettlement(memberData, averagePerPerson) {
    const settlementElement = document.getElementById('settlement-summary');
    
    // Calculate balances
    const memberBalances = memberData.map(member => ({
        ...member,
        balance: member.totalSpent - averagePerPerson
    }));
    
    // Separate receivers and payers
    const receivers = memberBalances.filter(m => m.balance > 0).sort((a, b) => b.balance - a.balance);
    const payers = memberBalances.filter(m => m.balance < 0).sort((a, b) => a.balance - b.balance);
    
    // Calculate transactions
    const transactions = [];
    let receiverIndex = 0;
    let payerIndex = 0;
    
    while (receiverIndex < receivers.length && payerIndex < payers.length) {
        const receiver = receivers[receiverIndex];
        const payer = payers[payerIndex];
        
        const amount = Math.min(receiver.balance, Math.abs(payer.balance));
        
        if (amount > 0.01) {
            transactions.push({
                from: payer.name,
                to: receiver.name,
                amount: amount
            });
            
            receiver.balance -= amount;
            payer.balance += amount;
            
            if (Math.abs(receiver.balance) < 0.01) receiverIndex++;
            if (Math.abs(payer.balance) < 0.01) payerIndex++;
        }
    }
    
    if (transactions.length === 0) {
        settlementElement.innerHTML = `
            <div class="text-center text-success py-3">
                <i class="fas fa-check-circle fa-2x mb-2"></i>
                <p>All expenses are balanced!</p>
                <small>No settlements needed</small>
            </div>
        `;
        return;
    }
    
    settlementElement.innerHTML = `
        <h6 class="text-center mb-3">Settlements Needed</h6>
        <div class="settlement-list">
            ${transactions.map(transaction => `
                <div class="alert alert-info py-2 mb-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <span>
                            <strong>${transaction.from}</strong>
                            <i class="fas fa-arrow-right mx-2 text-muted"></i>
                            <strong>${transaction.to}</strong>
                        </span>
                        <span class="fw-bold text-success">
                            <span class="rupee-symbol">₹</span>${transaction.amount.toFixed(2)}
                        </span>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="text-center mt-2">
            <button class="btn btn-outline-primary btn-sm" onclick="shareSettlementPlan()">
                <i class="fas fa-share-alt me-1"></i>Share Plan
            </button>
        </div>
    `;
}

function shareSettlementPlan() {
    console.log('Share settlement plan clicked');
    
    const settlementElement = document.getElementById('settlement-summary');
    
    if (!settlementElement) {
        console.error('Settlement summary element not found');
        showToast('Settlement summary not found', 'warning');
        return;
    }
    
    const transactionElements = settlementElement.querySelectorAll('.alert');
    
    if (transactionElements.length === 0) {
        showToast('No settlements to share', 'info');
        return;
    }
    
    let shareText = `💰 Settlement Plan for ${currentTrip.name} 💰\n\n`;
    shareText += `Trip Code: ${currentTrip.code}\n`;
    shareText += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
    shareText += `SETTLEMENTS NEEDED:\n`;
    shareText += '─'.repeat(30) + '\n\n';
    
    let totalSettlements = 0;
    
    transactionElements.forEach((transaction, index) => {
        const strongElements = transaction.querySelectorAll('strong');
        const amountElement = transaction.querySelector('.text-success');
        
        if (strongElements.length >= 2 && amountElement) {
            const from = strongElements[0].textContent;
            const to = strongElements[1].textContent;
            const amount = amountElement.textContent.replace('₹', '').trim();
            
            shareText += `${index + 1}. ${from} → ${to}: ₹${amount}\n`;
            totalSettlements++;
        }
    });
    
    shareText += `\nTotal settlements: ${totalSettlements}`;
    shareText += `\n\nHappy travels! 🚗✈️`;
    
    console.log('Share text prepared:', shareText);
    
    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareText).then(() => {
            showToast('Settlement plan copied to clipboard! 📋', 'success');
            console.log('Settlement plan copied successfully');
        }).catch((err) => {
            console.error('Clipboard API failed:', err);
            useFallbackCopy(shareText);
        });
    } else {
        console.log('Clipboard API not available, using fallback');
        useFallbackCopy(shareText);
    }
}

// Helper function for fallback copy method
function useFallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast('Settlement plan copied!', 'success');
    } catch (err) {
        console.error('Fallback copy failed:', err);
        showToast('Failed to copy settlement plan', 'danger');
    } finally {
        document.body.removeChild(textArea);
    }
}

async function loadMemberNameForTableRow(memberId, rowIndex) {
    const rows = document.querySelectorAll('#expenses-tbody tr');
    if (rows[rowIndex]) {
        const addedByElement = rows[rowIndex].querySelector('.added-by');
        if (addedByElement) {
            if (memberId === auth.currentUser.uid) {
                addedByElement.textContent = 'You';
            } else {
                try {
                    const memberName = await getMemberName(memberId);
                    addedByElement.textContent = memberName;
                } catch (error) {
                    addedByElement.textContent = 'Traveler';
                }
            }
        }
    }
}

function updateExpenseStats(trip, filteredExpenses = null) {
    const expenses = filteredExpenses || trip.expenses || [];
    // Filter out personal expenses for budget stats
    const budgetExpenses = expenses.filter(e => !e.isPersonal);
    const totalSpent = budgetExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Update summary cards
    document.getElementById('total-budget-amount').textContent = trip.budget.toFixed(2);
    document.getElementById('total-spent-amount').textContent = totalSpent.toFixed(2);
    document.getElementById('remaining-amount').textContent = (trip.budget - totalSpent).toFixed(2);
    
    // Update progress
    const progressPercent = Math.min((totalSpent / trip.budget) * 100, 100);
    document.getElementById('progress-spent').textContent = totalSpent.toFixed(2);
    document.getElementById('progress-remaining').textContent = (trip.budget - totalSpent).toFixed(2);
    document.getElementById('budget-percentage').textContent = `${progressPercent.toFixed(1)}% of budget used`;
    
    const progressBar = document.getElementById('budget-progress-bar');
    progressBar.style.width = `${progressPercent}%`;
    
    // Color code progress bar
    if (progressPercent > 90) {
        progressBar.className = 'progress-bar bg-danger';
    } else if (progressPercent > 75) {
        progressBar.className = 'progress-bar bg-warning';
    } else {
        progressBar.className = 'progress-bar bg-success';
    }
}

function loadRecentExpenses(trip) {
    const recentExpensesList = document.getElementById('recent-expenses-list');
    
    if (!trip.expenses || trip.expenses.length === 0) {
        recentExpensesList.innerHTML = '<div class="text-center text-muted py-3">No recent expenses</div>';
        return;
    }
    
    // Get 5 most recent expenses
    const recentExpenses = [...trip.expenses]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    recentExpensesList.innerHTML = recentExpenses.map(expense => {
        const categoryName = getCategoryName(expense.category);
        const expenseDate = new Date(expense.date).toLocaleDateString();
        
        return `
            <div class="recent-expense-item">
                <div class="flex-grow-1">
                    <div class="fw-semibold small">${expense.description}</div>
                    <small class="text-muted">${categoryName} • ${expenseDate}</small>
                </div>
                <div class="recent-expense-amount">
                    <span class="rupee-symbol">₹</span>${expense.amount.toFixed(2)}
                </div>
            </div>
        `;
    }).join('');
}

// Make function available globally for inline onclick
window.shareSettlementPlan = shareSettlementPlan;
window.showAddManualMemberModal = showAddManualMemberModal;

async function loadTripWeather(trip) {
    const weatherCard = document.getElementById('weather-widget-card');
    const weatherContent = document.getElementById('weather-widget-content');
    
    if (!trip.destination || !weatherCard || !weatherContent) return;

    // Show card with loading state
    weatherCard.style.display = 'block';

    try {
        // Get coordinates using existing geocode function
        const coords = await geocodeLocation(trip.destination); // returns [lon, lat]
        const lat = coords[1];
        const lon = coords[0];

        // Fetch weather from Open-Meteo (Free API, no key required)
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
        
        if (!response.ok) throw new Error('Weather API failed');
        
        const data = await response.json();
        const current = data.current_weather;
        const daily = data.daily;

        // Map WMO weather codes to icons and descriptions
        const getWeatherInfo = (code) => {
            const codes = {
                0: { icon: 'fa-sun', text: 'Clear sky', color: 'text-warning' },
                1: { icon: 'fa-cloud-sun', text: 'Mainly clear', color: 'text-warning' },
                2: { icon: 'fa-cloud-sun', text: 'Partly cloudy', color: 'text-secondary' },
                3: { icon: 'fa-cloud', text: 'Overcast', color: 'text-secondary' },
                45: { icon: 'fa-smog', text: 'Fog', color: 'text-secondary' },
                48: { icon: 'fa-smog', text: 'Depositing rime fog', color: 'text-secondary' },
                51: { icon: 'fa-cloud-rain', text: 'Light drizzle', color: 'text-info' },
                53: { icon: 'fa-cloud-rain', text: 'Moderate drizzle', color: 'text-info' },
                55: { icon: 'fa-cloud-rain', text: 'Dense drizzle', color: 'text-info' },
                61: { icon: 'fa-cloud-showers-heavy', text: 'Slight rain', color: 'text-primary' },
                63: { icon: 'fa-cloud-showers-heavy', text: 'Moderate rain', color: 'text-primary' },
                65: { icon: 'fa-cloud-showers-heavy', text: 'Heavy rain', color: 'text-primary' },
                71: { icon: 'fa-snowflake', text: 'Slight snow', color: 'text-info' },
                73: { icon: 'fa-snowflake', text: 'Moderate snow', color: 'text-info' },
                75: { icon: 'fa-snowflake', text: 'Heavy snow', color: 'text-info' },
                80: { icon: 'fa-cloud-showers-heavy', text: 'Slight rain showers', color: 'text-primary' },
                81: { icon: 'fa-cloud-showers-heavy', text: 'Moderate rain showers', color: 'text-primary' },
                82: { icon: 'fa-cloud-showers-heavy', text: 'Violent rain showers', color: 'text-primary' },
                95: { icon: 'fa-bolt', text: 'Thunderstorm', color: 'text-warning' },
                96: { icon: 'fa-bolt', text: 'Thunderstorm with hail', color: 'text-danger' },
                99: { icon: 'fa-bolt', text: 'Thunderstorm with hail', color: 'text-danger' }
            };
            return codes[code] || { icon: 'fa-cloud', text: 'Unknown', color: 'text-secondary' };
        };

        const currentInfo = getWeatherInfo(current.weathercode);

        let forecastHtml = '';
        // Show next 3 days forecast
        for(let i = 1; i <= 3; i++) {
            if (daily.time[i]) {
                const dayInfo = getWeatherInfo(daily.weathercode[i]);
                const date = new Date(daily.time[i]);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                
                forecastHtml += `
                    <div class="col-4 text-center border-end">
                        <small class="d-block text-muted">${dayName}</small>
                        <i class="fas ${dayInfo.icon} ${dayInfo.color} my-1"></i>
                        <div class="small fw-bold">${Math.round(daily.temperature_2m_max[i])}°</div>
                        <div class="small text-muted" style="font-size: 0.7rem;">${Math.round(daily.temperature_2m_min[i])}°</div>
                    </div>
                `;
            }
        }

        weatherContent.innerHTML = `
            <div class="d-flex align-items-center justify-content-between mb-3">
                <div>
                    <h2 class="mb-0 display-6 fw-bold">${Math.round(current.temperature)}°C</h2>
                    <div class="text-muted small">${currentInfo.text}</div>
                </div>
                <div class="text-center">
                    <i class="fas ${currentInfo.icon} ${currentInfo.color} fa-3x"></i>
                </div>
            </div>
            <div class="row g-0 border-top pt-2">
                ${forecastHtml.replace(/border-end(?![\s\S]*border-end)/, '')}
            </div>
        `;

    } catch (error) {
        console.error('Error loading weather:', error);
        weatherContent.innerHTML = `
            <div class="text-center text-muted py-2">
                <i class="fas fa-cloud-showers-heavy mb-2"></i>
                <p class="mb-0 small">Weather data unavailable</p>
            </div>
        `;
    }
}
