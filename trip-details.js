// Trip Details functionality
let currentTrip = null;
let expenseChart = null;
let paymentChart = null;
var customCategories = typeof customCategories !== 'undefined' ? customCategories : [];
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
    
    // Wire up edit trip image input
    const editTripImgInput = document.getElementById('edit-trip-image-input');
    if (editTripImgInput) {
        editTripImgInput.addEventListener('change', (e) => handleTripPhotoUpload(e, true));
    }
    
    // Wire up edit add stop button
    const editAddTripStopBtn = document.getElementById('edit-add-trip-stop-btn');
    if (editAddTripStopBtn) {
        editAddTripStopBtn.addEventListener('click', () => {
            addStopField(document.getElementById('edit-trip-stops-container'));
        });
    }
    
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

    // Tickets tab event listeners
    document.getElementById('btn-imagekit-settings')?.addEventListener('click', showImageKitSettingsModal);
    document.getElementById('save-imagekit-settings-btn')?.addEventListener('click', saveImageKitSettings);
    document.getElementById('btn-add-ticket')?.addEventListener('click', showAddTicketModal);
    document.getElementById('save-ticket-btn')?.addEventListener('click', saveTicket);

    const ticketTypeSelect = document.getElementById('ticket-type');
    if (ticketTypeSelect) {
        ticketTypeSelect.addEventListener('change', function() {
            toggleTicketFormFields(this.value);
        });
    }

    const ticketFilterTabs = document.getElementById('ticket-filter-tabs');
    if (ticketFilterTabs) {
        ticketFilterTabs.addEventListener('click', function(e) {
            const btn = e.target.closest('button[data-ticket-filter]');
            if (!btn) return;
            ticketFilterTabs.querySelectorAll('button').forEach(b => {
                b.classList.remove('active', 'btn-primary');
                b.classList.add('btn-outline-primary', 'btn-outline-warning', 'btn-outline-info');
            });
            btn.classList.add('active', 'btn-primary');
            window._currentTicketFilter = btn.getAttribute('data-ticket-filter');
            if (currentTrip) renderTicketsList(currentTrip);
        });
    }

    const ticketsTab = document.querySelector('a[href="#tickets-tab"]');
    if (ticketsTab) {
        ticketsTab.addEventListener('shown.bs.tab', function (e) {
            if (currentTrip) {
                renderTicketsList(currentTrip);
            }
        });
    }

    // Weather Widget Search & Quick Chips listeners
    const weatherSearchInput = document.getElementById('weather-search-input');
    const weatherSearchBtn = document.getElementById('btn-weather-search');
    const weatherQuickChips = document.getElementById('weather-quick-chips');

    const triggerWeatherSearch = () => {
        const query = weatherSearchInput?.value.trim();
        if (query && currentTrip) {
            loadTripWeather(currentTrip, query);
        }
    };

    weatherSearchBtn?.addEventListener('click', triggerWeatherSearch);
    weatherSearchInput?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            triggerWeatherSearch();
        }
    });

    weatherQuickChips?.addEventListener('click', function(e) {
        const chip = e.target.closest('.weather-chip');
        if (!chip) return;
        const locationName = chip.getAttribute('data-location');
        if (locationName && currentTrip) {
            if (weatherSearchInput) weatherSearchInput.value = locationName;
            loadTripWeather(currentTrip, locationName);
        }
    });

    const itineraryDayFilters = document.getElementById('itinerary-day-filters');
    if (itineraryDayFilters) {
        itineraryDayFilters.addEventListener('click', function(e) {
            const btn = e.target.closest('.itinerary-day-chip');
            if (!btn) return;
            window._activeItineraryDayFilter = btn.getAttribute('data-day');
            if (currentTrip) loadTripItinerary(currentTrip);
        });
    }

    // Periodically update departure alerts
    setInterval(() => {
        if (currentTrip) {
            updateDepartureAlerts(currentTrip);
        }
    }, 60000);
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
            if (typeof loadOpenRouterKeyShared === 'function') {
                await loadOpenRouterKeyShared();
            }
            await loadTripDetails();
        }
    });
}

async function loadUserData() {
    const user = auth.currentUser;
    if (!user) return;
    const nameEl = document.getElementById('user-name');
    if (nameEl) nameEl.textContent = user.displayName || 'Traveler';
    
    let avatarUrl = localStorage.getItem('user_avatar_' + user.uid) || user.photoURL;
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists && userDoc.data().photoURL) {
            avatarUrl = userDoc.data().photoURL;
            localStorage.setItem('user_avatar_' + user.uid, avatarUrl);
        }
    } catch (e) {}

    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar) {
        userAvatar.src = getSafeAvatarUrl(avatarUrl, user.displayName || 'Traveler');
        setupAvatarFallback(userAvatar, user.displayName || 'Traveler');
    }
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
            loadTripWeather(currentTrip),
            loadTripTickets(currentTrip)
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

    // Calculate and populate Eco Impact
    const ecoCard = document.getElementById('trip-eco-card');
    if (ecoCard) {
        if (trip.route && trip.route.distance) {
            ecoCard.style.display = 'block';
            const carbon = calculateTripCarbon(trip);
            const leaf = getLeafRating(carbon.emissions);
            
            document.getElementById('eco-co2-emissions').textContent = `${carbon.emissions.toFixed(1)} kg`;
            document.getElementById('eco-co2-saved').textContent = `${carbon.saved.toFixed(1)} kg`;
            
            const ratingBadge = document.getElementById('eco-leaf-rating');
            if (ratingBadge) {
                ratingBadge.className = `badge bg-light ${leaf.class}`;
                ratingBadge.innerHTML = `<i class="fas ${leaf.icon} me-1"></i>${leaf.rating}`;
                ratingBadge.title = leaf.desc;
            }
            
            // Generate eco tips based on transport mode
            const tipsContainer = document.getElementById('eco-travel-tips');
            if (tipsContainer) {
                let tipsHTML = '';
                
                if (trip.transportMode === 'car') {
                    tipsHTML = `
                        <div class="mb-1"><i class="fas fa-check text-success me-1"></i>Carpooling with ${trip.members.length + (trip.manualMembers ? trip.manualMembers.length : 0)} companions divides your footprint!</div>
                        <div class="mb-1"><i class="fas fa-info-circle text-primary me-1"></i>Drive at moderate speeds and maintain constant acceleration to optimize fuel efficiency by 15-30%.</div>
                        <div><i class="fas fa-lightbulb text-warning me-1"></i>Keep tires properly inflated to reduce carbon emissions by up to 3%.</div>
                    `;
                } else if (trip.transportMode === 'flight') {
                    tipsHTML = `
                        <div class="mb-1"><i class="fas fa-info-circle text-danger me-1"></i>Aviation has a high carbon density (${carbon.emissions.toFixed(1)} kg CO₂).</div>
                        <div class="mb-1"><i class="fas fa-check text-success me-1"></i>Pack light! Every kg saved reduces fuel burn and total emissions.</div>
                        <div><i class="fas fa-tree text-success me-1"></i>Consider purchasing certified Gold Standard carbon offsets for this flight.</div>
                    `;
                } else if (trip.transportMode === 'train') {
                    tipsHTML = `
                        <div class="mb-1"><i class="fas fa-star text-warning me-1"></i>Excellent choice! Train travel is highly efficient (90% cleaner than flying).</div>
                        <div class="mb-1"><i class="fas fa-check text-success me-1"></i>You saved approximately <strong>${carbon.saved.toFixed(1)} kg CO₂</strong> by choosing the tracks!</div>
                        <div><i class="fas fa-store text-success me-1"></i>Support local vendors at transit stations to foster sustainable eco-tourism.</div>
                    `;
                } else if (trip.transportMode === 'bus') {
                    tipsHTML = `
                        <div class="mb-1"><i class="fas fa-thumbs-up text-primary me-1"></i>Great choice! Riding the bus emits 75% less carbon than driving alone.</div>
                        <div class="mb-1"><i class="fas fa-check text-success me-1"></i>Your journey saved <strong>${carbon.saved.toFixed(1)} kg CO₂</strong>!</div>
                        <div><i class="fas fa-walking text-success me-1"></i>Walk or cycle for the last-mile transit to achieve zero local emissions.</div>
                    `;
                } else {
                    tipsHTML = `
                        <div class="mb-1"><i class="fas fa-check text-success me-1"></i>Public transport minimizes traffic congestion and carbon footprints.</div>
                        <div class="mb-1"><i class="fas fa-leaf text-success me-1"></i>Shared transits emit significantly less greenhouse gas per passenger-km.</div>
                        <div><i class="fas fa-tint text-primary me-1"></i>Carry a reusable bottle on your journey to reduce plastic single-use waste.</div>
                    `;
                }
                tipsContainer.innerHTML = tipsHTML;
            }
        } else {
            ecoCard.style.display = 'none';
        }
    }

    // Load Journey progress animation
    loadTravelAnimation(trip);

    // Add car expense section
    addCarExpenseSection(trip);
    
    // Load members
    await loadTripMembers(trip);
}

function loadTravelAnimation(trip) {
    const card = document.getElementById('travel-animation-card');
    const bar = document.getElementById('travel-animation-bar');
    const vehicle = document.getElementById('travel-animation-vehicle');
    const statusText = document.getElementById('travel-animation-status');
    const startText = document.getElementById('travel-animation-start');
    const currentText = document.getElementById('travel-animation-current');
    const destText = document.getElementById('travel-animation-dest');
    
    if (!card || !bar || !vehicle || !statusText || !startText || !destText) return;
    
    // Address-cleaning and name-truncating helper for timeline labels
    const getShortPlaceName = (fullName) => {
        if (!fullName) return '';
        let part = fullName.split(',')[0].trim();
        const words = part.split(/\s+/);
        if (words.length > 2) {
            if (/^(ward|plot|door|street|lane|flat|house|no|road|h\.no|hno)/i.test(words[0])) {
                if (/^\d+$/i.test(words[1]) || /^[A-Za-z0-9#-]+$/i.test(words[1])) {
                    part = words.slice(2).join(' ');
                } else {
                    part = words.slice(1).join(' ');
                }
            }
        }
        if (part.length > 15) {
            return part.substring(0, 14) + '…';
        }
        return part;
    };
    
    const totalDistance = parseFloat(trip.route?.distance) || parseFloat(trip.distance) || 0;
    const segments = getRouteSegments(trip, totalDistance);
    
    // Trigger background route calculation if stopsDistances is missing OR if AI key
    // is available but the route was not calculated with AI yet
    const hasAiKey = !!window._openrouterApiKey;
    const needsCalc = trip.stops && trip.stops.length > 0 && (
        !trip.route ||
        !trip.route.stopsDistances ||
        (hasAiKey && !trip.route.aiEnhanced)
    );
    if (needsCalc) {
        calculateAndSaveStopsDistances(trip);
    }
    
    // Set Locations text
    const hasReturnStops = segments.some(s => s.role === 'stop' && s.type === 'after');
    startText.textContent = getShortPlaceName(trip.startLocation) || 'Start';
    startText.title = trip.startLocation || '';
    if (hasReturnStops) {
        destText.textContent = `${getShortPlaceName(trip.startLocation)} (Return)`;
        destText.title = `${trip.startLocation} (Return)`;
    } else {
        destText.textContent = getShortPlaceName(trip.destination) || 'Destination';
        destText.title = trip.destination || '';
    }
    if (currentText) {
        currentText.innerHTML = trip.currentLocationName 
            ? `<i class="fas fa-location-dot me-1 text-success"></i><span title="${trip.currentLocationName}">${getShortPlaceName(trip.currentLocationName)}</span>` 
            : '';
    }
    
    // Parse Dates
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    const today = new Date();
    
    // Set dates bounds
    startDate.setHours(0,0,0,0);
    endDate.setHours(23,59,59,999);
    
    // Determine vehicle icon and animation class based on transportMode
    let iconClass = 'fa-car text-success animate-drive';
    let transportDesc = 'Car';
    
    switch(trip.transportMode) {
        case 'flight':
            iconClass = 'fa-plane text-info animate-flight';
            transportDesc = 'Flight';
            break;
        case 'train':
            iconClass = 'fa-train text-primary animate-ride';
            transportDesc = 'Train';
            break;
        case 'bus':
            iconClass = 'fa-bus text-warning animate-ride';
            transportDesc = 'Bus';
            break;
        case 'public':
            iconClass = 'fa-train-subway text-success animate-ride';
            transportDesc = 'Public Transport';
            break;
    }
    
    // Set Icon HTML
    vehicle.innerHTML = `<i class="fas ${iconClass}" style="font-size: 1.5rem; text-shadow: 0 2px 4px rgba(0,0,0,0.15);"></i>`;
    
    // Calculate progress
    let progressPercent = 0;
    let progressText = '';
    
    if (totalDistance > 0) {
        if (trip.currentKm !== undefined && trip.currentKm >= 0) {
            progressPercent = Math.min(100, (trip.currentKm / totalDistance) * 100);
            progressText = `: ${trip.currentKm} / ${totalDistance.toFixed(0)} km completed`;
        } else {
            if (today < startDate) {
                progressPercent = 0;
            } else if (today > endDate) {
                progressPercent = 100;
            } else {
                const totalTime = endDate.getTime() - startDate.getTime();
                const elapsedTime = today.getTime() - startDate.getTime();
                progressPercent = Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));
                const estDistance = (totalDistance * (progressPercent / 100)).toFixed(0);
                progressText = `: ~${estDistance} / ${totalDistance.toFixed(0)} km completed`;
            }
        }
    } else {
        // Fallback to percentage-based progression
        progressPercent = trip.currentKm !== undefined ? Math.min(100, trip.currentKm) : 0;
        if (trip.currentKm !== undefined) {
            progressText = `: ${progressPercent.toFixed(0)}% completed`;
        } else {
            if (today < startDate) {
                progressPercent = 0;
            } else if (today > endDate) {
                progressPercent = 100;
            } else {
                const totalTime = endDate.getTime() - startDate.getTime();
                const elapsedTime = today.getTime() - startDate.getTime();
                progressPercent = Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));
                progressText = `: ~${progressPercent.toFixed(0)}% completed (estimated)`;
            }
        }
    }
    
    if (today < startDate) {
        statusText.innerHTML = `<span class="badge bg-info">Upcoming trip by ${transportDesc}</span>`;
    } else if (today > endDate) {
        statusText.innerHTML = `<span class="badge bg-secondary">Completed trip by ${transportDesc}</span>`;
    } else {
        const currentKm = trip.currentKm || 0;
        const nextStopStatus = getNextStopStatus(trip, currentKm, totalDistance);
        const nextStopHtml = nextStopStatus ? `<span class="badge bg-primary-subtle text-primary ms-2 animate-bounce-subtle"><i class="fas fa-location-arrow me-1 text-primary"></i>${nextStopStatus}</span>` : '';
        const aiEnhancedBadge = trip.route?.aiEnhanced
            ? `<span class="badge ms-2" style="background: linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; font-size:0.65rem;"><i class="fas fa-robot me-1"></i>AI Enhanced</span>`
            : (window._openrouterApiKey ? `<span class="badge bg-secondary-subtle text-secondary ms-2" style="font-size:0.65rem;"><i class="fas fa-robot me-1"></i>AI Calculating...</span>` : '');

        statusText.innerHTML = `
            <span class="badge bg-success-subtle text-success animate-pulse-slow">Active Journey${progressText} (${transportDesc})</span>
            ${nextStopHtml}
            ${aiEnhancedBadge}
            <button class="btn btn-outline-success py-0 px-2 ms-2 border-0" style="font-size: 0.75rem; border-radius: 12px; background-color: rgba(45, 106, 79, 0.08);" id="update-details-progress" data-trip-id="${trip.id}" data-total-dist="${totalDistance}">
                <i class="fas fa-edit me-1"></i>Update Progress
            </button>
            ${'geolocation' in navigator ? `
            <button class="btn btn-outline-primary py-0 px-2 ms-1 border-0" style="font-size: 0.75rem; border-radius: 12px; background-color: rgba(33, 158, 188, 0.08);" id="auto-track-details-btn" data-trip-id="${trip.id}">
                <i class="fas fa-location-crosshairs me-1 text-info"></i>${trip.route?.aiEnhanced ? 'AI+GPS Track' : 'Auto-Track GPS'}
            </button>
            ` : ''}
        `;

    }
    
    card.style.display = 'block';
    
    // Render stops pins on progress bar in trip details
    const stopsPinsContainer = document.getElementById('travel-animation-stops-pins');
    if (stopsPinsContainer) {
        stopsPinsContainer.innerHTML = '';
        const segments = getRouteSegments(trip, totalDistance);
        if (segments.length > 0) {
            // We draw a pin for all segment endpoints except the very last one (which is the right end of the timeline)
            for (let i = 0; i < segments.length - 1; i++) {
                const seg = segments[i];
                let pct = 0;
                let legDistText = '';
                let stopDistText = '';
                
                if (totalDistance > 0) {
                    pct = Math.min(95, Math.max(5, (seg.to / totalDistance) * 100));
                    const legDist = seg.to - seg.from;
                    legDistText = `+${legDist.toFixed(0)} km`;
                    stopDistText = `${seg.to.toFixed(0)} km`;
                } else {
                    pct = ((i + 1) / (segments.length)) * 100;
                }
                
                const isCrossed = progressPercent >= pct;
                
                const pin = document.createElement('div');
                pin.className = 'position-absolute top-50 translate-middle';
                pin.style.left = `${pct}%`;
                pin.style.zIndex = '3';
                pin.style.cursor = 'pointer';
                
                let pinIconHtml = '';
                let labelColorClass = '';
                
                if (seg.role === 'destination') {
                    pinIconHtml = isCrossed 
                        ? '<i class="fas fa-flag text-muted opacity-75" style="font-size: 0.9rem; background-color: #fff; border-radius: 50%; padding: 2px;"></i>'
                        : '<i class="fas fa-flag text-danger" style="font-size: 0.9rem; text-shadow: 0 1px 2px rgba(0,0,0,0.2);"></i>';
                    labelColorClass = isCrossed ? 'text-muted opacity-75' : 'text-danger';
                } else {
                    const isReturnStop = (seg.type === 'after');
                    const activeColorClass = isReturnStop ? 'text-info' : 'text-success';
                    
                    if (isCrossed) {
                        pinIconHtml = '<i class="fas fa-circle-check text-muted opacity-75" style="font-size: 0.85rem; background-color: #fff; border-radius: 50%;"></i>';
                        labelColorClass = 'text-muted opacity-75';
                    } else {
                        const iconColor = isReturnStop ? 'text-info' : 'text-success';
                        pinIconHtml = `<i class="fas fa-location-dot ${iconColor}" style="font-size: 0.85rem; text-shadow: 0 1px 2px rgba(0,0,0,0.2);"></i>`;
                        labelColorClass = activeColorClass;
                    }
                }
                
                pin.innerHTML = pinIconHtml;
                pin.title = `${seg.name}${stopDistText ? ' (' + stopDistText + ')' : ''}`;
                
                const cleanName = getShortPlaceName(seg.name);
                const isOdd = (i % 2 === 1);
                const topOffset = isOdd ? '0px' : '44px';
                
                const label = document.createElement('div');
                label.className = `position-absolute text-center fw-semibold ${labelColorClass}`;
                label.style.fontSize = '0.65rem';
                label.style.left = `${pct}%`;
                label.style.transform = 'translateX(-50%)';
                label.style.top = topOffset;
                label.style.maxWidth = '80px';
                
                if (isOdd) {
                    label.innerHTML = `
                        <span style="font-size: 0.52rem; color: #6c757d; display: block; line-height: 1.1;">${legDistText}</span>
                        <span title="${seg.name}" style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.2;">${cleanName}</span>
                    `;
                } else {
                    label.innerHTML = `
                        <span title="${seg.name}" style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.2;">${cleanName}</span>
                        <span style="font-size: 0.52rem; color: #6c757d; display: block; line-height: 1.1;">${legDistText}</span>
                    `;
                }
                
                stopsPinsContainer.appendChild(pin);
                stopsPinsContainer.appendChild(label);
            }
        }
    }
    
    // Wire up prompt and GPS handlers
    setTimeout(() => {
        const autoTrackBtn = document.getElementById('auto-track-details-btn');
        if (autoTrackBtn) {
            autoTrackBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                autoTrackBtn.disabled = true;
                autoTrackBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Locating...';
                
                navigator.geolocation.getCurrentPosition(async (position) => {
                    const currentLat = position.coords.latitude;
                    const currentLon = position.coords.longitude;
                    
                    try {
                        let startCoords = trip.route?.coordinates?.start;
                        let destCoords = trip.route?.coordinates?.destination;
                        
                        if (!startCoords || !destCoords) {
                            startCoords = await geocodeLocation(trip.startLocation);
                            destCoords = await geocodeLocation(trip.destination);
                        }
                        
                        if (!startCoords || !destCoords) {
                            showAlert('Could not determine start/destination coordinates to track progress.', 'warning');
                            return;
                        }
                        
                        const startLat = startCoords[1];
                        const startLon = startCoords[0];
                        const destLat = destCoords[1];
                        const destLon = destCoords[0];
                        
                        const distFromStart = calculateHaversineDistance(startLat, startLon, currentLat, currentLon);
                        const distToDest = calculateHaversineDistance(currentLat, currentLon, destLat, destLon);
                        const calculatedTotal = distFromStart + distToDest;
                        let currentKm = 0;
                        
                        // AI-enhanced: snap to closest route segment using AI stop distances
                        const segments = getRouteSegments(trip, totalDistance);
                        if (segments.length > 0 && totalDistance > 0 && trip.route?.aiEnhanced) {
                            const placeSequence = resolveRouteMetadata(trip.startLocation, trip.destination, trip.stops);
                            const allStopCoords = [];
                            for (const place of placeSequence) {
                                try {
                                    allStopCoords.push(await geocodeLocation(place.name));
                                } catch (e) {
                                    allStopCoords.push(null);
                                }
                            }
                            
                            // Find closest segment start to current position
                            let bestSegment = 0;
                            let minSegDist = Infinity;
                            for (let si = 0; si < allStopCoords.length - 1; si++) {
                                const sc = allStopCoords[si];
                                if (!sc) continue;
                                const d = calculateHaversineDistance(sc[1], sc[0], currentLat, currentLon);
                                if (d < minSegDist) { minSegDist = d; bestSegment = si; }
                            }
                            
                            const bestSeg = segments[bestSegment] || { from: 0, to: totalDistance };
                            const segStartKm = bestSeg.from;
                            const segEndKm = bestSeg.to;
                            const segLen = segEndKm - segStartKm;
                            
                            const sc1 = allStopCoords[bestSegment];
                            const sc2 = allStopCoords[bestSegment + 1];
                            if (sc1 && sc2) {
                                const segFullLen = calculateHaversineDistance(sc1[1], sc1[0], sc2[1], sc2[0]);
                                const progressInSeg = segFullLen > 0
                                    ? calculateHaversineDistance(sc1[1], sc1[0], currentLat, currentLon) / segFullLen
                                    : 0;
                                currentKm = Math.min(totalDistance, parseFloat((segStartKm + segLen * Math.min(1, progressInSeg)).toFixed(1)));
                            } else {
                                currentKm = Math.min(totalDistance, parseFloat((totalDistance * (distFromStart / calculatedTotal)).toFixed(1)));
                            }
                        } else if (totalDistance > 0) {
                            const ratio = distFromStart / calculatedTotal;
                            currentKm = Math.min(totalDistance, parseFloat((totalDistance * ratio).toFixed(1)));
                        } else {
                            const ratio = distFromStart / calculatedTotal;
                            currentKm = Math.min(100, parseFloat((100 * ratio).toFixed(1)));
                        }

                        
                        // Reverse geocode to get village, district, state name
                        let currentLocationName = '';
                        try {
                            const revGeoResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${currentLat}&lon=${currentLon}&format=json&accept-language=en`);
                            if (revGeoResponse.ok) {
                                const geoData = await revGeoResponse.json();
                                const addr = geoData.address || {};
                                
                                const parts = [];
                                // Local: Village, Suburb, Town, or City
                                const local = addr.village || addr.suburb || addr.town || addr.city || addr.hamlet;
                                if (local) parts.push(local);
                                
                                // District: District, County, or City District
                                const dist = addr.district || addr.county || addr.city_district;
                                if (dist) parts.push(dist);
                                
                                // State
                                const state = addr.state;
                                if (state) parts.push(state);
                                
                                currentLocationName = parts.join(', ') || 'Active Location';
                            }
                        } catch (geoErr) {
                            console.warn('Reverse geocoding failed:', geoErr);
                            currentLocationName = `${currentLat.toFixed(2)}, ${currentLon.toFixed(2)}`;
                        }
                        
                        await db.collection('trips').doc(trip.id).update({
                            currentKm: currentKm,
                            currentLocationName: currentLocationName
                        });
                        
                        trip.currentKm = currentKm;
                        trip.currentLocationName = currentLocationName;
                        loadTravelAnimation(trip);
                        showAlert(`GPS tracking complete! Location: ${currentLocationName || 'Determined'}. Distance Traveled: ${currentKm}${totalDistance > 0 ? ' km' : '%'}`, 'success');
                    } catch (err) {
                        console.error('Error auto-tracking location:', err);
                        showAlert('Error auto-tracking location. Make sure GPS is enabled.', 'danger');
                    } finally {
                        autoTrackBtn.disabled = false;
                        autoTrackBtn.innerHTML = '<i class="fas fa-location-crosshairs me-1 text-info"></i>Auto-Track GPS';
                    }
                }, (error) => {
                    console.error('Geolocation error:', error);
                    showAlert('Failed to access GPS. Please check location permissions.', 'warning');
                    autoTrackBtn.disabled = false;
                    autoTrackBtn.innerHTML = '<i class="fas fa-location-crosshairs me-1 text-info"></i>Auto-Track GPS';
                }, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });
        }
        const updateBtn = document.getElementById('update-details-progress');
        if (updateBtn) {
            updateBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const tripId = updateBtn.dataset.tripId;
                const totalDist = parseFloat(updateBtn.dataset.totalDist) || 0;
                
                let promptMsg = '';
                let maxVal = 100;
                let isPercent = totalDist <= 0;
                
                if (isPercent) {
                    promptMsg = 'Trip distance is not calculated. Enter your journey progress as a percentage (0 to 100%):';
                    maxVal = 100;
                } else {
                    promptMsg = `Enter your current distance traveled in km (0 to ${totalDist.toFixed(0)} km):`;
                    maxVal = totalDist;
                }
                
                const currentKmStr = prompt(promptMsg, trip.currentKm || '0');
                if (currentKmStr !== null) {
                    const currentKm = parseFloat(currentKmStr);
                    if (isNaN(currentKm) || currentKm < 0 || currentKm > maxVal) {
                        showAlert(`Please enter a valid value between 0 and ${maxVal.toFixed(0)}${isPercent ? '%' : ' km'}`, 'warning');
                        return;
                    }
                    
                    try {
                        await db.collection('trips').doc(tripId).update({
                            currentKm: currentKm
                        });
                        trip.currentKm = currentKm;
                        loadTravelAnimation(trip);
                        showAlert('Journey progress updated!', 'success');
                    } catch (error) {
                        console.error('Error updating progress:', error);
                        showAlert('Failed to update progress.', 'danger');
                    }
                }
            });
        }
    }, 50);
    
    // Set styles smoothly
    setTimeout(() => {
        bar.style.width = `${progressPercent}%`;
        
        let offsetPercent = progressPercent;
        if (offsetPercent < 2) offsetPercent = 0;
        if (offsetPercent > 98) offsetPercent = 100;
        
        vehicle.style.left = `calc(${offsetPercent}% - 12px)`;
    }, 100);

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
            const avatarSrc = getSafeAvatarUrl(member.photoURL, member.name);
            
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
                     style="width: 50px; height: 50px; object-fit: cover; border: 2px solid ${member.isCreator ? '#e65100' : member.isCurrentUser ? '#ff6f00' : '#dee2e6'};">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center mb-1">
                        <strong class="mb-0 me-2" style="font-size: 1.1rem;">${member.name}</strong>
                        ${badges.join('')}
                    </div>
                    ${member.email ? `<small class="text-muted d-block">${member.email}</small>` : ''}
                    <small class="text-muted">Trip Member</small>
                </div>
            `;
            
            const imgEl = memberDiv.querySelector('img');
            if (imgEl) {
                setupAvatarFallback(imgEl, member.name);
            }
            
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
            
            const avatarSrc = getDefaultAvatar(memberName);
            
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
            
            const imgEl = memberDiv.querySelector('img');
            if (imgEl) {
                setupAvatarFallback(imgEl, memberName);
            }
            
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
        if (!memberId || typeof memberId !== 'string' || !memberId.trim()) return 'Traveler';
        if (auth.currentUser && memberId === auth.currentUser.uid) return 'You';
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
        if (auth.currentUser && memberId === auth.currentUser.uid) {
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
    
    const canvas = document.getElementById('expense-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Destroy previous chart if it exists
    if (expenseChart) expenseChart.destroy();
    
    // Dynamically group expenses by category
    const categories = {};
    
    trip.expenses.forEach(expense => {
        if (expense.isPersonal) return; // Exclude personal expenses from chart
        const catKey = expense.category || 'other';
        categories[catKey] = (categories[catKey] || 0) + expense.amount;
    });
    
    const activeCategoryKeys = Object.keys(categories).filter(catKey => categories[catKey] > 0);
    if (activeCategoryKeys.length === 0) return;
    
    const labels = [];
    const data = [];
    const backgroundColors = [];
    
    // Color palette mapping for categories
    const categoryColors = {
        'train': '#28a745',
        'flight': '#007bff',
        'bus': '#dc3545',
        'public-transport': '#fd7e14',
        'fuel': '#ffd166',
        'Transport': '#17a2b8',
        'transportation': '#17a2b8',
        'hotel': '#06d6a0',
        'accommodation': '#6610f2',
        'restaurant': '#e83e8c',
        'food': '#ef476f',
        'activities': '#118ab2',
        'Activities': '#118ab2',
        'sightseeing': '#20c997',
        'other': '#073b4c',
        'misc': '#6c757d'
    };
    
    const fallbackPalette = [
        '#28a745', '#007bff', '#dc3545', '#ffd166', '#06d6a0', 
        '#ef476f', '#118ab2', '#7248b9', '#fd7e14', '#e83e8c', 
        '#20c997', '#073b4c', '#6c757d', '#17a2b8', '#6610f2'
    ];
    
    activeCategoryKeys.forEach((catKey, index) => {
        labels.push(getCategoryName(catKey));
        data.push(categories[catKey]);
        
        let color = categoryColors[catKey];
        if (!color) {
            const knownCat = professionalCategories.find(c => c.id === catKey);
            if (knownCat && categoryColors[knownCat.group]) {
                color = categoryColors[knownCat.group];
            } else if (window.allTripCategories && window.allTripCategories[catKey] && window.allTripCategories[catKey].color) {
                color = window.allTripCategories[catKey].color;
            } else {
                color = fallbackPalette[index % fallbackPalette.length];
            }
        }
        backgroundColors.push(color);
    });
    
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
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

function getActivityCategoryBadge(cat) {
    switch(cat) {
        case 'temple': return '<span class="badge bg-warning bg-opacity-25 text-warning-emphasis border border-warning border-opacity-50 me-2" style="font-size:0.7rem;"><i class="fas fa-gopuram me-1"></i>Temple / Devotional</span>';
        case 'sightseeing': return '<span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 me-2" style="font-size:0.7rem;"><i class="fas fa-landmark me-1"></i>Sightseeing</span>';
        case 'food': return '<span class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 me-2" style="font-size:0.7rem;"><i class="fas fa-utensils me-1"></i>Food & Dining</span>';
        case 'shopping': return '<span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 me-2" style="font-size:0.7rem;"><i class="fas fa-shopping-bag me-1"></i>Shopping</span>';
        case 'hotel': return '<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 me-2" style="font-size:0.7rem;"><i class="fas fa-hotel me-1"></i>Hotel / Rest</span>';
        case 'transit': return '<span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 me-2" style="font-size:0.7rem;"><i class="fas fa-car me-1"></i>Transit</span>';
        default: return '<span class="badge bg-light text-dark border me-2" style="font-size:0.7rem;"><i class="fas fa-map-marker-alt me-1"></i>Activity</span>';
    }
}

async function loadTripItinerary(trip) {
    const itineraryDays = document.getElementById('itinerary-days');
    const emptyItinerary = document.getElementById('empty-itinerary');
    const dayFiltersContainer = document.getElementById('itinerary-day-filters');
    
    if (!trip.itinerary || trip.itinerary.length === 0) {
        itineraryDays.innerHTML = '';
        if (dayFiltersContainer) dayFiltersContainer.innerHTML = '';
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

    const sortedDayKeys = Object.keys(activitiesByDay).sort((a, b) => parseInt(a) - parseInt(b));

    // Render Day Filter Buttons
    if (dayFiltersContainer) {
        const activeFilter = window._activeItineraryDayFilter || 'all';
        let filtersHtml = `<button type="button" class="btn btn-xs ${activeFilter === 'all' ? 'btn-primary active' : 'btn-outline-secondary'} rounded-pill me-1 mb-1 itinerary-day-chip" data-day="all"><i class="fas fa-layer-group me-1"></i>All Days (${trip.itinerary.length})</button>`;
        
        sortedDayKeys.forEach(d => {
            const count = activitiesByDay[d].length;
            const isActive = activeFilter === d;
            filtersHtml += `<button type="button" class="btn btn-xs ${isActive ? 'btn-primary active' : 'btn-outline-secondary'} rounded-pill me-1 mb-1 itinerary-day-chip" data-day="${d}">Day ${d} (${count})</button>`;
        });
        
        dayFiltersContainer.innerHTML = filtersHtml;
    }
    
    // Clear existing content
    itineraryDays.innerHTML = '';
    
    const activeFilter = window._activeItineraryDayFilter || 'all';

    // Sort days numerically and create day cards
    sortedDayKeys.forEach(day => {
            if (activeFilter !== 'all' && day !== activeFilter) return;

            const dayCard = document.createElement('div');
            dayCard.className = 'card itinerary-card mb-4 border-0 shadow-sm rounded-3 overflow-hidden';
            
            // Sort activities by time within each day
            const sortedActivities = activitiesByDay[day].sort((a, b) => {
                return a.time.localeCompare(b.time);
            });
            
            dayCard.innerHTML = `
                <div class="card-header bg-success text-white py-2 px-3 d-flex align-items-center justify-content-between">
                    <h6 class="mb-0 fw-bold">
                        <i class="fas fa-calendar-day me-2"></i>Day ${day} Schedule
                    </h6>
                    <span class="badge bg-white text-success fw-bold" style="font-size:0.75rem;">${sortedActivities.length} Activities</span>
                </div>
                <div class="card-body p-3">
                    ${sortedActivities.map(activity => {
                        const canEdit = activity.addedBy === auth.currentUser.uid;
                        const memberName = memberNames[activity.addedBy] || 'Traveler';
                        const categoryBadge = getActivityCategoryBadge(activity.category);
                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.place)}`;
                        
                        return `
                            <div class="d-flex align-items-start mb-3 p-3 border rounded-3 bg-white shadow-sm activity-item" 
                                 data-location="${activity.place}">
                                <div class="me-3 text-center flex-shrink-0">
                                    <div class="bg-primary text-white rounded-3 p-2 shadow-sm" style="width: 75px;">
                                        <i class="far fa-clock small d-block opacity-75"></i>
                                        <div class="fw-bold small">${activity.time}</div>
                                    </div>
                                </div>
                                <div class="flex-grow-1">
                                    <div class="d-flex align-items-center flex-wrap mb-1">
                                        ${categoryBadge}
                                        <h6 class="mb-0 text-dark fw-bold">${activity.place}</h6>
                                    </div>
                                    ${activity.notes ? `<p class="mb-2 text-secondary small" style="font-size:0.8rem;"><i class="fas fa-info-circle text-info me-1"></i>${activity.notes}</p>` : ''}
                                    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top mt-2" style="font-size:0.75rem;">
                                        <small class="text-muted">
                                            <i class="fas fa-user me-1 text-muted"></i>
                                            <span class="activity-added-by">${memberName}</span>
                                        </small>
                                        <div class="d-flex align-items-center gap-1">
                                            <a href="${mapsUrl}" target="_blank" class="btn btn-xs btn-outline-success py-1 px-2.5 rounded-pill fw-semibold" style="font-size:0.7rem;" title="Directions on Google Maps">
                                                <i class="fas fa-compass me-1"></i>Directions
                                            </a>
                                            ${canEdit ? `
                                                <button class="btn btn-xs btn-outline-primary edit-activity-btn py-1 px-2 rounded-pill" 
                                                        data-activity-index="${activity.originalIndex}"
                                                        title="Edit Activity" style="font-size:0.7rem;">
                                                    <i class="fas fa-edit me-1"></i>Edit
                                                </button>
                                                <button class="btn btn-xs btn-outline-danger delete-activity-btn py-1 px-2 rounded-pill" 
                                                        data-activity-index="${activity.originalIndex}"
                                                        title="Delete Activity" style="font-size:0.7rem;">
                                                    <i class="fas fa-trash me-1"></i>Delete
                                                </button>
                                            ` : ''}
                                        </div>
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
                
                ${trip.stops && trip.stops.length > 0 ? `
                <div class="mt-4">
                    <div class="card bg-light bg-opacity-50 border border-success-subtle">
                        <div class="card-body py-3 px-4">
                            <h6 class="mb-2 text-success fw-bold" style="font-size: 0.9rem;"><i class="fas fa-map-pin me-2 text-success"></i>Route Stops</h6>
                            <div class="d-flex flex-wrap align-items-center gap-2 small text-muted">
                                <span class="fw-semibold text-dark">${trip.startLocation}</span>
                                ${(() => {
                                    const outboundStops = [];
                                    const returnStops = [];
                                    if (trip.stops && Array.isArray(trip.stops)) {
                                        trip.stops.forEach(stop => {
                                            const name = typeof stop === 'object' ? stop.name : stop;
                                            const type = typeof stop === 'object' ? stop.type : 'before';
                                            if (name) {
                                                if (type === 'after') {
                                                    returnStops.push(name);
                                                } else {
                                                    outboundStops.push(name);
                                                }
                                            }
                                        });
                                    }
                                    
                                    let html = '';
                                    outboundStops.forEach(name => {
                                        html += `
                                            <i class="fas fa-arrow-right-long text-success opacity-50 px-1"></i>
                                            <span class="badge bg-success-subtle text-success border border-success-subtle py-1 px-2">${name}</span>
                                        `;
                                    });
                                    
                                    html += `
                                        <i class="fas fa-arrow-right-long text-success opacity-50 px-1"></i>
                                        <span class="fw-semibold text-danger border border-danger-subtle rounded py-1 px-2 bg-danger-subtle" style="font-size:0.75rem;">${trip.destination}</span>
                                    `;
                                    
                                    returnStops.forEach(name => {
                                        html += `
                                            <i class="fas fa-arrow-right-long text-info opacity-50 px-1"></i>
                                            <span class="badge bg-info-subtle text-info border border-info-subtle py-1 px-2">${name}</span>
                                        `;
                                    });
                                    
                                    if (returnStops.length > 0) {
                                        html += `
                                            <i class="fas fa-arrow-right-long text-info opacity-50 px-1"></i>
                                            <span class="fw-semibold text-dark border border-dark-subtle rounded py-1 px-2 bg-light" style="font-size:0.75rem;">${trip.startLocation} (Return)</span>
                                        `;
                                    }
                                    
                                    return html;
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}
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
        const streetTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        });
        
        const satelliteTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USDA, USGS, and the GIS User Community'
        });
        
        const terrainTiles = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)'
        });
        
        tripMap = L.map('trip-map', {
            center: [0, 0],
            zoom: 2,
            layers: [streetTiles]
        });
        
        const baseMaps = {
            "Streets": streetTiles,
            "Satellite": satelliteTiles,
            "Terrain": terrainTiles
        };
        
        L.control.layers(baseMaps).addTo(tripMap);
        
        // Add Live Location Button Control
        const LiveButtonControl = L.Control.extend({
            options: { position: 'topleft' },
            onAdd: function(map) {
                const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control leaflet-control-custom btn btn-light p-0 d-flex align-items-center justify-content-center');
                btn.style.width = '30px';
                btn.style.height = '30px';
                btn.style.backgroundColor = '#ffffff';
                btn.style.borderRadius = '4px';
                btn.style.border = '2px solid rgba(0,0,0,0.2)';
                btn.style.cursor = 'pointer';
                btn.innerHTML = '<i class="fas fa-location-crosshairs text-success" style="font-size: 1rem;"></i>';
                btn.title = 'Pan to live location';
                
                L.DomEvent.disableClickPropagation(btn);
                
                btn.onclick = function() {
                    if ('geolocation' in navigator) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                            const lat = pos.coords.latitude;
                            const lon = pos.coords.longitude;
                            map.setView([lat, lon], 14);
                            
                            // Draw a live location circle/marker
                            L.circle([lat, lon], {
                                radius: 80,
                                color: '#147df5',
                                fillColor: '#147df5',
                                fillOpacity: 0.4
                            }).addTo(map).bindPopup('Your Current GPS Location').openPopup();
                        }, (err) => {
                            console.error(err);
                            alert('Could not determine GPS coordinates: ' + err.message);
                        });
                    } else {
                        alert('Geolocation is not supported by this browser.');
                    }
                };
                return btn;
            }
        });
        tripMap.addControl(new LiveButtonControl());
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
    const addMarker = async (name, type, details, isRoute = true) => {
        try {
            const coords = await geocodeLocation(name);
            // OpenRouteService returns [lon, lat], Leaflet needs [lat, lon]
            const latLng = [coords[1], coords[0]];
            
            const marker = L.marker(latLng).addTo(tripMap)
                .bindPopup(`<b>${type}:</b> ${name}${details ? '<br>' + details : ''}`);
            
            tripMarkers[name] = marker;
            if (isRoute) {
                pathCoordinates.push(latLng);
            }
        } catch (e) {
            console.warn(`Could not map location: ${name}`);
        }
    };

    // 1. Start Location
    if (trip.startLocation) await addMarker(trip.startLocation, 'Start', '', true);

    // 2. Stops (split into outbound and return)
    const outboundStops = [];
    const returnStops = [];
    if (trip.stops && Array.isArray(trip.stops)) {
        trip.stops.forEach((stop, index) => {
            const name = typeof stop === 'object' ? stop.name : stop;
            const type = typeof stop === 'object' ? stop.type : 'before';
            if (name && name.trim().length > 2) {
                const sObj = { name: name.trim(), originalIndex: index, type };
                if (type === 'after') {
                    returnStops.push(sObj);
                } else {
                    outboundStops.push(sObj);
                }
            }
        });
    }

    // Render Outbound Stops
    for (let i = 0; i < outboundStops.length; i++) {
        const s = outboundStops[i];
        await addMarker(s.name, `Stop #${s.originalIndex + 1}`, '', true);
    }

    // 3. Destination
    if (trip.destination) await addMarker(trip.destination, 'Destination', '', true);

    // Render Return Stops
    for (let i = 0; i < returnStops.length; i++) {
        const s = returnStops[i];
        await addMarker(s.name, `Return Stop #${s.originalIndex + 1}`, '', true);
    }

    // Return to Start
    if (returnStops.length > 0 && trip.startLocation) {
        await addMarker(trip.startLocation, 'Return Point', '', true);
    }

    // 4. Itinerary Items (Sorted Chronologically) - add markers only (don't draw route through them)
    if (trip.itinerary && trip.itinerary.length > 0) {
        const sortedItinerary = [...trip.itinerary].sort((a, b) => {
            if (a.day !== b.day) return a.day - b.day;
            return a.time.localeCompare(b.time);
        });

        for (const activity of sortedItinerary) {
            if (activity.place && !tripMarkers[activity.place]) {
                await addMarker(activity.place, `Day ${activity.day}`, `${activity.time} - ${activity.notes || ''}`, false);
            }
        }
    }

    // Draw Polyline connecting all points
    const mode = (trip.transportMode || 'car').toLowerCase().trim();
    let routeCoords = null;
    if (mode !== 'flight' && mode !== 'train') {
        routeCoords = await fetchRouteGeometryCoords(trip.startLocation, trip.destination, trip.stops);
    }
    
    const finalCoords = routeCoords && routeCoords.length > 1 ? routeCoords : pathCoordinates;
    
    if (finalCoords.length > 1) {
        if (mode === 'train') {
            // Train track style: solid dark gray casing with white dashes on top
            L.polyline(finalCoords, {
                color: '#333333',
                weight: 6,
                opacity: 0.9,
                lineJoin: 'round'
            }).addTo(tripMap);
            
            routePolyline = L.polyline(finalCoords, {
                color: '#ffffff',
                weight: 4,
                opacity: 1,
                dashArray: '8, 8',
                lineJoin: 'round'
            }).addTo(tripMap);
            
            tripMap.fitBounds(routePolyline.getBounds().pad(0.15));
        } else if (mode === 'flight') {
            // Flight curve style: curved dashed blue/indigo line
            const startPt = pathCoordinates[0];
            const endPt = pathCoordinates[pathCoordinates.length - 1];
            const curvedCoords = [];
            const steps = 60;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const lat = startPt[0] + (endPt[0] - startPt[0]) * t;
                const lng = startPt[1] + (endPt[1] - startPt[1]) * t;
                const offset = Math.sin(t * Math.PI) * (Math.abs(endPt[1] - startPt[1]) * 0.15 + 2);
                curvedCoords.push([lat + offset, lng]);
            }
            routePolyline = L.polyline(curvedCoords, {
                color: '#6366f1',
                weight: 3.5,
                opacity: 0.85,
                dashArray: '6, 8',
                lineJoin: 'round'
            }).addTo(tripMap);
            
            tripMap.fitBounds(routePolyline.getBounds().pad(0.15));
        } else {
            // Road transport: solid dark green highway
            L.polyline(finalCoords, {
                color: '#bf360c',
                weight: 6,
                opacity: 0.4,
                lineJoin: 'round'
            }).addTo(tripMap);
            
            routePolyline = L.polyline(finalCoords, {
                color: '#e65100',
                weight: 4,
                opacity: 0.9,
                lineJoin: 'round'
            }).addTo(tripMap);
            
            tripMap.fitBounds(routePolyline.getBounds().pad(0.15));
        }
    } else if (finalCoords.length === 1) {
        tripMap.setView(finalCoords[0], 10);
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
    const category = document.getElementById('activity-category').value || 'sightseeing';
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
        category,
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

// Routing and geocoding helpers are imported globally from utils.js

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
        
        // Use the utility function from utils.js with stops
        const routeData = await calculateRealDistance(currentTrip.startLocation, currentTrip.destination, currentTrip.stops || []);
        
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
        if (document.getElementById('activity-category')) {
            document.getElementById('activity-category').value = activity.category || 'sightseeing';
        }
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
    
    window._pendingEditTripImages = (currentTrip.images && Array.isArray(currentTrip.images)) ? [...currentTrip.images] : [];
    const editPreviewContainer = document.getElementById('edit-trip-image-previews');
    if (editPreviewContainer) renderTripImagePreviews(editPreviewContainer, window._pendingEditTripImages, true);
    const editImgInput = document.getElementById('edit-trip-image-input');
    if (editImgInput) editImgInput.value = '';

    // Populate the edit modal with current trip data
    document.getElementById('edit-trip-id').value = currentTrip.id;
    document.getElementById('edit-trip-name').value = currentTrip.name;
    document.getElementById('edit-transport-mode').value = currentTrip.transportMode || 'car';
    document.getElementById('edit-start-location').value = currentTrip.startLocation;
    document.getElementById('edit-trip-destination').value = currentTrip.destination;
    document.getElementById('edit-start-date').value = currentTrip.startDate;
    document.getElementById('edit-end-date').value = currentTrip.endDate;
    document.getElementById('edit-trip-budget').value = currentTrip.budget;
    
    // Populate stops container
    const editStopsContainer = document.getElementById('edit-trip-stops-container');
    if (editStopsContainer) {
        editStopsContainer.innerHTML = '';
        if (currentTrip.stops && Array.isArray(currentTrip.stops)) {
            currentTrip.stops.forEach(stop => {
                addStopField(editStopsContainer, stop);
            });
        }
    }
    
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

async function handleTripPhotoUpload(event, isEdit = true) {
    const files = Array.from(event.target.files);
    event.target.value = '';
    if (files.length === 0) return;
    
    const previewContainer = document.getElementById(isEdit ? 'edit-trip-image-previews' : 'trip-image-previews');
    const targetArrayKey = isEdit ? '_pendingEditTripImages' : '_pendingTripImages';
    window[targetArrayKey] = window[targetArrayKey] || [];
    
    const settings = typeof getImageKitSettings === 'function' ? getImageKitSettings() : null;
    let addedCount = 0;
    
    if (typeof showToast === 'function') showToast('Processing photo upload...', 'info');

    for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        
        try {
            let finalUrl = '';
            
            if (settings && settings.urlEndpoint && settings.publicKey && settings.privateKey && typeof uploadToImageKit === 'function') {
                const ikRes = await uploadToImageKit(file, `trip_cover_${Date.now()}_${file.name.replace(/\s+/g, '_')}`, settings);
                if (ikRes && ikRes.url) {
                    finalUrl = ikRes.url;
                }
            }
            
            if (!finalUrl) {
                finalUrl = await compressImageToDataUrl(file, 900, 0.75);
            }
            
            if (finalUrl) {
                window[targetArrayKey].push(finalUrl);
                addedCount++;
            }
        } catch (e) {
            console.error('Error processing trip photo upload:', e);
        }
    }

    if (addedCount > 0) {
        renderTripImagePreviews(previewContainer, window[targetArrayKey], isEdit);
        if (typeof showToast === 'function') showToast(`${addedCount} photo(s) added! Click "Update Trip" to save.`, 'success');
    } else {
        if (typeof showToast === 'function') showToast('Failed to process uploaded image file(s)', 'warning');
    }
}

function compressImageToDataUrl(file, maxWidth = 900, quality = 0.75) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function renderTripImagePreviews(container, imagesArray, isEdit = true) {
    if (!container) return;
    container.innerHTML = imagesArray.map((url, idx) => `
        <div class="position-relative rounded overflow-hidden shadow-sm border" style="width: 70px; height: 70px;">
            <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">
            <button type="button" class="btn btn-danger btn-xs position-absolute top-0 end-0 p-0 rounded-circle d-flex align-items-center justify-content-center"
                    style="width: 18px; height: 18px; font-size: 0.6rem; margin: 2px;"
                    onclick="removeTripImagePreview(${idx}, ${isEdit})" title="Remove photo">&times;</button>
        </div>
    `).join('');
}

function removeTripImagePreview(idx, isEdit = true) {
    const key = isEdit ? '_pendingEditTripImages' : '_pendingTripImages';
    if (window[key]) {
        window[key].splice(idx, 1);
        const container = document.getElementById(isEdit ? 'edit-trip-image-previews' : 'trip-image-previews');
        renderTripImagePreviews(container, window[key], isEdit);
    }
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
    
    const avatarUrl = localStorage.getItem('user_avatar_' + user.uid) || user.photoURL;
    
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
                                <img id="profile-avatar" class="user-avatar mb-3" style="width: 100px; height: 100px; border: 3px solid var(--primary-color); object-fit: cover;" src="${getSafeAvatarUrl(avatarUrl, user.displayName || 'User')}" alt="Profile">
                                <div>
                                    <input type="file" id="avatar-upload" class="d-none" accept="image/*">
                                    <button type="button" class="btn btn-outline-primary btn-sm rounded-pill px-3" onclick="document.getElementById('avatar-upload').click()">
                                        <i class="fas fa-camera me-1"></i>Upload Photo (ImageKit)
                                    </button>
                                </div>
                                <div class="mt-2">
                                    <label class="form-label d-block small text-muted">Or Select an Avatar</label>
                                    <div class="d-flex justify-content-center gap-2 mt-1" id="avatar-choices-container">
                                        <!-- Choices populated below -->
                                    </div>
                                </div>
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
    
    const avatarUpload = document.getElementById('avatar-upload');
    if (avatarUpload) {
        avatarUpload.addEventListener('change', handleAvatarUpload);
    }
    
    // Fetch latest Firestore profile picture to ensure it's up to date
    const profileAvatar = document.getElementById('profile-avatar');
    db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists && doc.data().photoURL) {
            const firestoreUrl = doc.data().photoURL;
            localStorage.setItem('user_avatar_' + user.uid, firestoreUrl);
            if (profileAvatar) {
                profileAvatar.src = getSafeAvatarUrl(firestoreUrl, user.displayName || 'User');
            }
        }
    }).catch(() => {});
    
    // Render default eco avatar selectors
    const container = document.getElementById('avatar-choices-container');
    if (container && profileAvatar) {
        setupAvatarFallback(profileAvatar, user.displayName || 'User');
        container.innerHTML = ECO_AVATARS.map(avatar => {
            const isSelected = (avatarUrl === avatar.value || (!avatarUrl && avatar.id === 'avatar-leaf'));
            return `
                <div class="avatar-option rounded-circle p-1 d-flex align-items-center justify-content-center" 
                     style="width: 42px; height: 42px; cursor: pointer; border: 2px solid ${isSelected ? 'var(--primary-color)' : 'transparent'}; background-color: rgba(45, 106, 79, 0.05);"
                     data-avatar-val="${avatar.value}"
                     title="${avatar.name}">
                     <img src="${avatar.value}" style="width: 28px; height: 28px; object-fit: contain;">
                </div>
            `;
        }).join('');
        
        container.querySelectorAll('.avatar-option').forEach(el => {
            el.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const newVal = target.dataset.avatarVal;
                
                // Highlight choice
                container.querySelectorAll('.avatar-option').forEach(opt => opt.style.borderColor = 'transparent');
                target.style.borderColor = 'var(--primary-color)';
                
                // Update preview
                profileAvatar.src = newVal;
            });
        });
    }
    
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
        
        // Retrieve selected avatar URL
        const profileAvatar = document.getElementById('profile-avatar');
        const selectedAvatarSrc = profileAvatar ? profileAvatar.src : '';
        
        const authPayload = { displayName: name };
        if (selectedAvatarSrc && selectedAvatarSrc.length <= 1800) {
            authPayload.photoURL = selectedAvatarSrc;
        }
        
        await auth.currentUser.updateProfile(authPayload);
        
        // Update user document in Firestore (no character limit)
        await db.collection('users').doc(auth.currentUser.uid).update({
            name: name,
            photoURL: selectedAvatarSrc,
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

async function handleAvatarUpload(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        if (typeof showToast === 'function') showToast('Please select a valid image file', 'warning');
        return;
    }
    
    const profileAvatar = document.getElementById('profile-avatar');
    const settings = typeof getImageKitSettings === 'function' ? getImageKitSettings() : null;
    let uploadedUrl = '';
    
    try {
        if (typeof showToast === 'function') showToast('Uploading profile photo...', 'info');
        
        // 1. Try ImageKit Direct CDN Upload if active
        if (settings && settings.urlEndpoint && settings.publicKey && settings.privateKey && typeof uploadToImageKit === 'function') {
            const fileName = `profile_${auth.currentUser?.uid || 'user'}_${Date.now()}_${file.name}`;
            const ikRes = await uploadToImageKit(file, fileName, settings);
            if (ikRes && ikRes.url) {
                uploadedUrl = ikRes.url;
                if (typeof showToast === 'function') showToast('Profile photo uploaded via ImageKit CDN!', 'success');
            }
        }
        
        // 2. Fallback to client-side JPEG compression
        if (!uploadedUrl) {
            uploadedUrl = await compressImageToDataUrl(file, 400, 0.8);
            if (typeof showToast === 'function') showToast('Photo updated! Click Save Changes to save your profile.', 'info');
        }
        
        if (uploadedUrl && profileAvatar) {
            profileAvatar.src = uploadedUrl;
            // Clear default eco avatar selections
            const container = document.getElementById('avatar-choices-container');
            if (container) {
                container.querySelectorAll('.avatar-option').forEach(opt => opt.style.borderColor = 'transparent');
            }
        }
    } catch (err) {
        console.error('Error uploading profile picture:', err);
        if (typeof showToast === 'function') showToast('Failed to process profile image', 'danger');
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
    
    // Extract stops
    const stops = Array.from(document.querySelectorAll('#edit-trip-stops-container .stop-input-row'))
        .map(row => {
            const input = row.querySelector('.trip-stop-input');
            const select = row.querySelector('.trip-stop-type-select');
            return {
                name: input ? input.value.trim() : '',
                type: select ? select.value : 'before'
            };
        })
        .filter(stop => stop.name.length > 0);
        
    try {
        const updateBtn = document.getElementById('update-trip-btn-trip-details');
        updateBtn.disabled = true;
        updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Updating...';
        
        const updateData = {
            name: name.trim(),
            transportMode,
            startLocation: startLocation.trim(),
            destination: destination.trim(),
            stops: stops,
            images: window._pendingEditTripImages || [],
            startDate,
            endDate,
            budget,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Recalculate route if requested
        if (recalculateDistance) {
            try {
                const routeData = await calculateRealDistance(startLocation, destination, stops);
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
    if (!categoryId) return 'misc';
    const category = professionalCategories.find(cat => cat.id === categoryId);
    if (category) return category.group;
    const lower = categoryId.toLowerCase();
    if (lower.includes('transport') || lower === 'train' || lower === 'flight' || lower === 'bus') return 'transportation';
    if (lower.includes('hotel') || lower.includes('stay') || lower.includes('accommodation')) return 'accommodation';
    if (lower.includes('food') || lower.includes('dining')) return 'food';
    if (lower.includes('activity') || lower.includes('darshan') || lower.includes('event')) return 'activities';
    return lower;
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

async function loadTripWeather(trip, targetLocation = null) {
    const weatherCard = document.getElementById('weather-widget-card');
    const weatherContent = document.getElementById('weather-widget-content');
    const activeBadge = document.getElementById('weather-active-city-badge');
    const quickChipsContainer = document.getElementById('weather-quick-chips');
    
    if (!weatherCard || !weatherContent) return;

    weatherCard.style.display = 'block';

    // Determine target location to load
    const activeCity = targetLocation ? targetLocation.trim() : (window._activeWeatherCity || trip.destination || trip.startLocation || 'Vijayawada');
    window._activeWeatherCity = activeCity;

    if (activeBadge) {
        activeBadge.innerHTML = `<i class="fas fa-location-dot me-1"></i>${activeCity}`;
    }

    // Render quick itinerary location chips
    if (quickChipsContainer && trip) {
        const places = new Set();
        if (trip.destination) places.add(trip.destination.trim());
        if (trip.startLocation) places.add(trip.startLocation.trim());
        
        if (trip.tickets && Array.isArray(trip.tickets)) {
            trip.tickets.forEach(t => {
                if (t.departurePlace) places.add(t.departurePlace.trim());
                if (t.arrivalPlace) places.add(t.arrivalPlace.trim());
                if (t.templeName) places.add(t.templeName.trim());
            });
        }

        const placeList = Array.from(places).filter(p => p.length > 0);
        if (placeList.length > 0) {
            quickChipsContainer.innerHTML = placeList.map(place => {
                const isActive = place.toLowerCase() === activeCity.toLowerCase();
                const btnClass = isActive ? 'btn-info text-white fw-bold shadow-sm' : 'btn-outline-secondary';
                return `<button type="button" class="btn btn-xs py-0.5 px-2 rounded-pill weather-chip ${btnClass}" data-location="${place}" style="font-size: 0.7rem;"><i class="fas fa-location-dot me-1"></i>${place}</button>`;
            }).join('');
        }
    }

    // Show loading indicator
    weatherContent.innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border spinner-border-sm text-info" role="status"></div>
            <span class="ms-2 small text-muted">Fetching weather for <strong>${activeCity}</strong>...</span>
        </div>
    `;

    try {
        // Geocode location
        const coords = await geocodeLocation(activeCity); // returns [lon, lat]
        const lat = coords[1];
        const lon = coords[0];

        // Fetch weather from Open-Meteo
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
        
        if (!response.ok) throw new Error('Weather API failed');
        
        const data = await response.json();
        const current = data.current_weather;
        const daily = data.daily;

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
        for(let i = 1; i <= 3; i++) {
            if (daily.time[i]) {
                const dayInfo = getWeatherInfo(daily.weathercode[i]);
                const date = new Date(daily.time[i]);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                
                forecastHtml += `
                    <div class="col-4 text-center border-end">
                        <small class="d-block text-muted" style="font-size:0.7rem;">${dayName}</small>
                        <i class="fas ${dayInfo.icon} ${dayInfo.color} my-1"></i>
                        <div class="small fw-bold">${Math.round(daily.temperature_2m_max[i])}°</div>
                        <div class="small text-muted" style="font-size: 0.65rem;">${Math.round(daily.temperature_2m_min[i])}°</div>
                    </div>
                `;
            }
        }

        weatherContent.innerHTML = `
            <div class="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                <div>
                    <span class="text-uppercase text-muted fw-bold" style="font-size:0.6rem;">LOCATION WEATHER</span>
                    <h6 class="mb-0 fw-bold text-dark text-truncate" style="max-width:170px;" title="${activeCity}">
                        <i class="fas fa-location-dot text-danger me-1"></i>${activeCity}
                    </h6>
                </div>
                <span class="badge bg-info-subtle text-info py-1 px-2 fw-semibold" style="font-size:0.65rem;"><i class="fas fa-wind me-1"></i>${current.windspeed} km/h</span>
            </div>
            <div class="d-flex align-items-center justify-content-between mb-3">
                <div>
                    <h2 class="mb-0 display-6 fw-bold text-dark">${Math.round(current.temperature)}°C</h2>
                    <div class="text-muted small fw-semibold">${currentInfo.text}</div>
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
        console.error('Error loading weather for', activeCity, error);
        weatherContent.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="fas fa-exclamation-circle text-warning mb-2 fa-2x"></i>
                <p class="mb-1 small fw-semibold text-dark">Could not find weather for "${activeCity}"</p>
                <span class="small text-secondary" style="font-size:0.75rem;">Try searching another city or check spelling.</span>
            </div>
        `;
    }
}

function addStopField(container, value = '') {
    if (!container) return;
    
    let stopName = '';
    let stopType = 'before';
    
    if (value && typeof value === 'object') {
        stopName = value.name || '';
        stopType = value.type || 'before';
    } else {
        stopName = value || '';
    }
    
    const div = document.createElement('div');
    div.className = 'd-flex align-items-center gap-2 stop-input-row animate-fade-in mb-2';
    
    const span = document.createElement('span');
    span.className = 'text-muted small stop-pin-icon';
    
    const updatePinIcon = (type) => {
        if (type === 'after') {
            span.innerHTML = '<i class="fas fa-undo text-info" title="On Return Stop"></i>';
        } else {
            span.innerHTML = '<i class="fas fa-map-pin text-success" title="On the Way Stop"></i>';
        }
    };
    updatePinIcon(stopType);
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control form-control-sm trip-stop-input';
    input.placeholder = 'Stop name/city';
    input.value = stopName;
    input.required = true;
    
    const select = document.createElement('select');
    select.className = 'form-select form-select-sm trip-stop-type-select';
    select.style.width = '125px';
    select.innerHTML = `
        <option value="before" ${stopType === 'before' ? 'selected' : ''}>On the Way</option>
        <option value="after" ${stopType === 'after' ? 'selected' : ''}>On Return</option>
    `;
    
    const triggerRecalc = () => {
        if (container.id === 'trip-stops-container') {
            if (typeof calculateDistance === 'function') {
                const chk = document.getElementById('calculate-distance');
                if (chk && chk.checked) calculateDistance();
            }
        } else if (container.id === 'edit-trip-stops-container') {
            if (typeof calculateEditDistance === 'function') {
                const chk = document.getElementById('edit-calculate-distance');
                if (chk && chk.checked) calculateEditDistance();
            }
        }
    };
    
    select.addEventListener('change', () => {
        updatePinIcon(select.value);
        triggerRecalc();
    });
    
    input.addEventListener('change', () => {
        triggerRecalc();
    });
    
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-danger btn-sm py-1 px-2 border-0';
    btn.innerHTML = '<i class="fas fa-trash-can"></i>';
    btn.addEventListener('click', () => {
        div.remove();
        triggerRecalc();
    });
    
    div.appendChild(span);
    div.appendChild(input);
    div.appendChild(select);
    div.appendChild(btn);
    
    container.appendChild(div);
}

window.addEventListener('tripRouteUpdated', () => {
    console.log('Trip route data refreshed. Updating trip details...');
    loadTripDetails();
});

// =========================================================================
// TICKET MANAGEMENT SYSTEM & IMAGEKIT INTEGRATION
// =========================================================================

async function loadGlobalImageKitSettings() {
    try {
        let settings = null;
        
        // 1. Try reading from Firestore shared settings collection
        try {
            const doc = await db.collection('settings').doc('imagekit_keys').get();
            if (doc.exists && doc.data()?.urlEndpoint) {
                settings = doc.data();
            }
        } catch (e) {
            console.warn('Could not read shared ImageKit settings doc:', e);
        }
        
        // 2. Try reading from User profile if not found in shared doc
        if (!settings && auth && auth.currentUser) {
            try {
                const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
                if (userDoc.exists && userDoc.data()?.imageKitSettings?.urlEndpoint) {
                    settings = userDoc.data().imageKitSettings;
                }
            } catch (e) {
                console.warn('Could not read user profile ImageKit settings:', e);
            }
        }
        
        // 3. Fallback to localStorage
        if (!settings) {
            try {
                const stored = localStorage.getItem('global_imagekit_settings') || localStorage.getItem('imagekit_settings');
                if (stored) settings = JSON.parse(stored);
            } catch (e) {}
        }
        
        if (settings) {
            window._globalImageKitSettings = settings;
            try { localStorage.setItem('global_imagekit_settings', JSON.stringify(settings)); } catch (e) {}
        }
        
        updateImageKitStatusBadge();
        return settings;
    } catch (e) {
        console.error('Error loading global ImageKit settings:', e);
        return null;
    }
}

function getImageKitSettings() {
    // 1. Check trip-specific override
    if (typeof currentTrip !== 'undefined' && currentTrip && currentTrip.imageKitSettings && currentTrip.imageKitSettings.urlEndpoint) {
        return currentTrip.imageKitSettings;
    }
    
    // 2. Check global memory
    if (window._globalImageKitSettings && window._globalImageKitSettings.urlEndpoint) {
        return window._globalImageKitSettings;
    }
    
    // 3. Check localStorage cache
    try {
        const stored = localStorage.getItem('global_imagekit_settings') || localStorage.getItem('imagekit_settings');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.urlEndpoint) {
                window._globalImageKitSettings = parsed;
                return parsed;
            }
        }
    } catch (e) {}
    
    return null;
}

function showImageKitSettingsModal() {
    const settings = getImageKitSettings() || {};
    document.getElementById('ik-url-endpoint').value = settings.urlEndpoint || '';
    document.getElementById('ik-public-key').value = settings.publicKey || '';
    document.getElementById('ik-private-key').value = settings.privateKey || '';
    
    const modal = new bootstrap.Modal(document.getElementById('imageKitSettingsModal'));
    modal.show();
}

async function saveImageKitSettings() {
    const urlEndpoint = document.getElementById('ik-url-endpoint').value.trim();
    const publicKey = document.getElementById('ik-public-key').value.trim();
    const privateKey = document.getElementById('ik-private-key').value.trim();
    
    if (!urlEndpoint || !publicKey || !privateKey) {
        showToast('All settings fields are required', 'warning');
        return;
    }
    
    const settings = { urlEndpoint, publicKey, privateKey };
    
    const saveBtn = document.getElementById('save-imagekit-settings-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Saving Globally...';
    
    try {
        // 1. Save globally to Firestore settings collection (app-wide)
        try {
            await db.collection('settings').doc('imagekit_keys').set(settings, { merge: true });
        } catch (e) {
            console.warn('Could not save to shared settings collection:', e);
        }
        
        // 2. Save to User profile document in Firestore
        if (auth && auth.currentUser) {
            try {
                await db.collection('users').doc(auth.currentUser.uid).set({
                    imageKitSettings: settings
                }, { merge: true });
            } catch (e) {
                console.warn('Could not save to user profile doc:', e);
            }
        }
        
        // 3. Save to current trip document if viewing a trip
        if (typeof currentTrip !== 'undefined' && currentTrip && currentTrip.id) {
            try {
                await db.collection('trips').doc(currentTrip.id).update({
                    imageKitSettings: settings,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                currentTrip.imageKitSettings = settings;
                if (typeof setCurrentTrip === 'function') setCurrentTrip(currentTrip);
            } catch (e) {
                console.warn('Could not save to current trip doc:', e);
            }
        }
        
        // 4. Update memory & localStorage cache
        window._globalImageKitSettings = settings;
        try {
            localStorage.setItem('global_imagekit_settings', JSON.stringify(settings));
        } catch (e) {}
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('imageKitSettingsModal'));
        modal?.hide();
        
        updateImageKitStatusBadge();
        showToast('ImageKit settings saved globally for all trips!', 'success');
        
        if (typeof loadTripDetails === 'function') {
            loadTripDetails();
        }
    } catch (e) {
        console.error('Error saving ImageKit settings:', e);
        showToast('Error saving settings to Firestore', 'danger');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Save Settings';
    }
}

function updateImageKitStatusBadge() {
    const settings = getImageKitSettings();
    const badge = document.getElementById('imagekit-config-warning');
    if (badge) {
        if (settings && settings.urlEndpoint && settings.publicKey && settings.privateKey) {
            badge.classList.add('d-none');
        } else {
            badge.classList.remove('d-none');
        }
    }
}

async function generateImageKitSignature(token, expire, privateKey) {
    const textEncoder = new TextEncoder();
    const keyData = textEncoder.encode(privateKey);
    const messageData = textEncoder.encode(token + expire);
    
    const cryptoKey = await crypto.subtle.importKey(
        'raw', 
        keyData, 
        { name: 'HMAC', hash: { name: 'SHA-1' } }, 
        false, 
        ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    
    return Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function uploadToImageKit(file, fileName, settings) {
    const { publicKey, privateKey, urlEndpoint } = settings;
    const uploadUrl = 'https://upload.imagekit.io/api/v1/files/upload';
    
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expire = Math.floor(Date.now() / 1000) + 1800; // 30 minutes expiration
    
    const signature = await generateImageKitSignature(token, expire, privateKey);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);
    formData.append('publicKey', publicKey);
    formData.append('signature', signature);
    formData.append('expire', expire.toString());
    formData.append('token', token);
    
    const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'ImageKit upload request failed');
    }
    
    const result = await response.json();
    return result.url;
}

function loadTripTickets(trip) {
    updateImageKitStatusBadge();
    updateDepartureAlerts(trip);
    renderJourneyStayBreakdown(trip);
    if (document.getElementById('tickets-tab')?.classList.contains('active')) {
        renderTicketsList(trip);
    }
}

function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = err => reject(err);
        reader.readAsDataURL(file);
    });
}

function toggleTicketFormFields(ticketType) {
    const darshanContainer = document.getElementById('darshan-fields-container');
    const transportContainer = document.getElementById('transport-fields-container');
    
    const labelTicketNo = document.getElementById('label-ticket-no');
    const labelPassengerName = document.getElementById('label-passenger-name');
    
    if (ticketType === 'darshan') {
        if (darshanContainer) darshanContainer.style.display = 'block';
        if (transportContainer) transportContainer.style.display = 'none';
        if (labelTicketNo) labelTicketNo.textContent = 'Token / Ticket / Booking Number';
        if (labelPassengerName) labelPassengerName.textContent = 'Primary Devotee Name';
    } else {
        if (darshanContainer) darshanContainer.style.display = 'none';
        if (transportContainer) transportContainer.style.display = 'block';
        if (labelTicketNo) labelTicketNo.textContent = 'PNR / Ticket / Booking Number';
        if (labelPassengerName) labelPassengerName.textContent = 'Passenger Name';
    }
}

function showAddTicketModal() {
    document.getElementById('add-ticket-form').reset();
    document.getElementById('edit-ticket-id').value = '';
    document.getElementById('edit-ticket-expense-index').value = '';
    document.getElementById('ticketModalTitle').textContent = 'Add Ticket / Darshan Pass';
    document.getElementById('ticket-image-info').textContent = 'Upload receipt, QR pass, or PDF file. Saved directly to your trip.';
    
    const typeSelect = document.getElementById('ticket-type');
    if (typeSelect) {
        typeSelect.value = 'darshan';
        toggleTicketFormFields('darshan');
    }
    
    const modal = new bootstrap.Modal(document.getElementById('addTicketModal'));
    modal.show();
}

async function showEditTicketModal(ticketId) {
    if (!currentTrip || !currentTrip.tickets) return;
    const ticket = currentTrip.tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    document.getElementById('edit-ticket-id').value = ticket.id;
    document.getElementById('edit-ticket-expense-index').value = ticket.expenseIndex !== undefined ? ticket.expenseIndex : '';
    document.getElementById('ticketModalTitle').textContent = 'Edit Ticket / Darshan Pass';
    
    const tType = ticket.type || 'darshan';
    document.getElementById('ticket-type').value = tType;
    toggleTicketFormFields(tType);
    
    if (tType === 'darshan') {
        document.getElementById('ticket-temple-name').value = ticket.templeName || ticket.operator || '';
        document.getElementById('ticket-darshan-category').value = ticket.darshanCategory || ticket.serviceName || '';
        document.getElementById('ticket-reporting-venue').value = ticket.reportingVenue || ticket.departurePlace || '';
        document.getElementById('ticket-devotees-count').value = ticket.devoteesCount || 1;
        document.getElementById('ticket-prasadam-info').value = ticket.prasadamInfo || '';
        document.getElementById('ticket-darshan-slot').value = ticket.darshanSlot || ticket.departureTime || '';
    } else {
        document.getElementById('ticket-operator').value = ticket.operator || '';
        document.getElementById('ticket-service-name').value = ticket.serviceName || '';
        document.getElementById('ticket-service-no').value = ticket.serviceNo || '';
        document.getElementById('ticket-seat').value = ticket.seatNo || '';
        document.getElementById('ticket-dep-place').value = ticket.departurePlace || '';
        document.getElementById('ticket-dep-code').value = ticket.depCode || '';
        document.getElementById('ticket-dep-time').value = ticket.departureTime || '';
        document.getElementById('ticket-arr-place').value = ticket.arrivalPlace || '';
        document.getElementById('ticket-arr-code').value = ticket.arrCode || '';
        document.getElementById('ticket-arr-time').value = ticket.arrivalTime || '';
    }
    
    document.getElementById('ticket-no').value = ticket.ticketNo || '';
    document.getElementById('ticket-passenger-name').value = ticket.passengerName || '';
    document.getElementById('ticket-booking-status').value = ticket.bookingStatus || '';
    document.getElementById('ticket-cost').value = ticket.cost !== undefined ? ticket.cost : '';
    document.getElementById('ticket-track-expense').checked = ticket.expenseIndex !== undefined;
    document.getElementById('ticket-notes').value = ticket.notes || '';
    
    if (ticket.imageUrl) {
        document.getElementById('ticket-image-info').innerHTML = `Current file: <a href="${ticket.imageUrl}" target="_blank" class="text-primary fw-semibold">View Receipt/QR Pass</a>. Select a new file to replace it.`;
    } else {
        document.getElementById('ticket-image-info').textContent = 'No receipt uploaded. Select a file to upload.';
    }
    
    const modal = new bootstrap.Modal(document.getElementById('addTicketModal'));
    modal.show();
}

async function saveTicket() {
    const ticketId = document.getElementById('edit-ticket-id').value;
    const type = document.getElementById('ticket-type').value;
    
    let operator = '';
    let serviceName = '';
    let serviceNo = '';
    let seatNo = '';
    let departurePlace = '';
    let depCode = '';
    let departureTime = '';
    let arrivalPlace = '';
    let arrCode = '';
    let arrivalTime = '';
    
    let templeName = '';
    let darshanCategory = '';
    let reportingVenue = '';
    let devoteesCount = 1;
    let prasadamInfo = '';
    let darshanSlot = '';
    
    if (type === 'darshan') {
        templeName = document.getElementById('ticket-temple-name').value.trim();
        darshanCategory = document.getElementById('ticket-darshan-category').value.trim();
        reportingVenue = document.getElementById('ticket-reporting-venue').value.trim();
        devoteesCount = parseInt(document.getElementById('ticket-devotees-count').value) || 1;
        prasadamInfo = document.getElementById('ticket-prasadam-info').value.trim();
        darshanSlot = document.getElementById('ticket-darshan-slot').value;
        
        operator = templeName || 'Temple Devasthanam';
        serviceName = darshanCategory || 'Darshan Pass';
        departurePlace = reportingVenue || templeName || 'Temple Gate';
        departureTime = darshanSlot || new Date().toISOString().slice(0,16);
        arrivalPlace = templeName || 'Main Shrine';
    } else {
        operator = document.getElementById('ticket-operator').value.trim();
        serviceName = document.getElementById('ticket-service-name').value.trim();
        serviceNo = document.getElementById('ticket-service-no').value.trim();
        seatNo = document.getElementById('ticket-seat').value.trim();
        departurePlace = document.getElementById('ticket-dep-place').value.trim();
        depCode = document.getElementById('ticket-dep-code').value.trim().toUpperCase();
        departureTime = document.getElementById('ticket-dep-time').value;
        arrivalPlace = document.getElementById('ticket-arr-place').value.trim();
        arrCode = document.getElementById('ticket-arr-code').value.trim().toUpperCase();
        arrivalTime = document.getElementById('ticket-arr-time').value;
    }
    
    const ticketNo = document.getElementById('ticket-no').value.trim();
    const passengerName = document.getElementById('ticket-passenger-name').value.trim();
    const bookingStatus = document.getElementById('ticket-booking-status').value.trim();
    const costVal = document.getElementById('ticket-cost').value;
    const cost = costVal ? parseFloat(costVal) : 0;
    const trackExpense = document.getElementById('ticket-track-expense').checked;
    const notes = document.getElementById('ticket-notes').value.trim();
    
    const imageFileInput = document.getElementById('ticket-image');
    
    if (!ticketNo || !departureTime || (type !== 'darshan' && (!operator || !departurePlace))) {
        showToast('Please fill in all required ticket fields', 'warning');
        return;
    }
    
    const saveBtn = document.getElementById('save-ticket-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Saving...';
    
    try {
        let imageUrl = '';
        
        let existingTicket = null;
        if (ticketId && currentTrip.tickets) {
            existingTicket = currentTrip.tickets.find(t => t.id === ticketId);
            if (existingTicket) {
                imageUrl = existingTicket.imageUrl || '';
            }
        }
        
        if (imageFileInput.files.length > 0) {
            const file = imageFileInput.files[0];
            const settings = typeof getImageKitSettings === 'function' ? getImageKitSettings() : null;
            
            // Try ImageKit first if credentials configured
            if (settings && settings.publicKey && settings.privateKey && settings.urlEndpoint && typeof uploadToImageKit === 'function') {
                try {
                    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Uploading to ImageKit...';
                    const fileExt = file.name.split('.').pop();
                    const fileName = `ticket_${Date.now()}.${fileExt}`;
                    imageUrl = await uploadToImageKit(file, fileName, settings);
                } catch (ikErr) {
                    console.warn('ImageKit upload failed, fallback to local file encoding:', ikErr);
                }
            }
            
            // Fallback to local DataURL so upload NEVER throws error
            if (!imageUrl) {
                saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Processing ticket file...';
                if (file.type.startsWith('image/')) {
                    imageUrl = await compressImageToDataUrl(file, 1200, 0.8);
                } else {
                    imageUrl = await readAsDataUrl(file);
                }
            }
        }
        
        const ticketObj = {
            id: ticketId || `tkt_${Date.now()}`,
            type,
            templeName,
            darshanCategory,
            reportingVenue,
            devoteesCount,
            prasadamInfo,
            darshanSlot,
            operator,
            serviceName,
            serviceNo,
            ticketNo,
            seatNo,
            departurePlace,
            depCode,
            departureTime,
            arrivalPlace,
            arrCode,
            arrivalTime,
            passengerName,
            bookingStatus,
            cost,
            imageUrl,
            notes
        };
        
        const tripDoc = await db.collection('trips').doc(currentTrip.id).get();
        if (!tripDoc.exists) throw new Error('Trip does not exist');
        
        const tripData = tripDoc.data();
        const tickets = tripData.tickets || [];
        const expenses = tripData.expenses || [];
        
        let newExpenseIndex = existingTicket ? existingTicket.expenseIndex : undefined;
        
        if (trackExpense && cost > 0) {
            const expCat = type === 'darshan' ? 'activities' : (['train', 'flight', 'bus'].includes(type) ? type : 'public-transport');
            const expDesc = type === 'darshan' 
                ? `[Darshan Ticket] ${templeName || operator}: ${darshanCategory || serviceName} (Token: ${ticketNo})`
                : `[Ticket] ${type.toUpperCase()}: ${serviceNo ? serviceNo + ' - ' : ''}${serviceName || operator} (${depCode || departurePlace} → ${arrCode || arrivalPlace})`;

            const expenseObj = {
                description: expDesc,
                amount: cost,
                category: expCat,
                date: departureTime.split('T')[0],
                paymentMode: 'Card',
                addedBy: auth.currentUser.uid,
                createdBy: auth.currentUser.uid,
                isPersonal: false,
                addedAt: new Date().toISOString()
            };
            
            if (newExpenseIndex !== undefined && newExpenseIndex >= 0 && newExpenseIndex < expenses.length) {
                expenses[newExpenseIndex] = expenseObj;
            } else {
                expenses.push(expenseObj);
                newExpenseIndex = expenses.length - 1;
            }
        } else {
            if (newExpenseIndex !== undefined && newExpenseIndex >= 0 && newExpenseIndex < expenses.length) {
                expenses.splice(newExpenseIndex, 1);
                tickets.forEach(t => {
                    if (t.expenseIndex > newExpenseIndex) {
                        t.expenseIndex--;
                    }
                });
                newExpenseIndex = undefined;
            }
        }
        
        ticketObj.expenseIndex = newExpenseIndex;
        
        if (ticketId) {
            const idx = tickets.findIndex(t => t.id === ticketId);
            if (idx >= 0) {
                tickets[idx] = ticketObj;
            }
        } else {
            tickets.push(ticketObj);
        }
        
        await db.collection('trips').doc(currentTrip.id).update({
            tickets,
            expenses,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentTrip.tickets = tickets;
        currentTrip.expenses = expenses;
        setCurrentTrip(currentTrip);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addTicketModal'));
        modal?.hide();
        
        showToast(type === 'darshan' ? 'Darshan ticket saved successfully! 🙏' : 'Ticket saved successfully!', 'success');
        loadTripDetails();
        
    } catch (e) {
        console.error('Error saving ticket:', e);
        showToast(e.message || 'Error saving ticket', 'danger');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Save Ticket';
    }
}

async function deleteTicket(ticketId) {
    if (!confirm('Are you sure you want to delete this ticket? This will also remove any linked ticket expenses.')) return;
    
    try {
        const tripDoc = await db.collection('trips').doc(currentTrip.id).get();
        if (!tripDoc.exists) throw new Error('Trip does not exist');
        
        const tripData = tripDoc.data();
        const tickets = tripData.tickets || [];
        const expenses = tripData.expenses || [];
        
        const idx = tickets.findIndex(t => t.id === ticketId);
        if (idx === -1) return;
        
        const ticket = tickets[idx];
        const newExpenseIndex = ticket.expenseIndex;
        
        if (newExpenseIndex !== undefined && newExpenseIndex >= 0 && newExpenseIndex < expenses.length) {
            expenses.splice(newExpenseIndex, 1);
            tickets.forEach(t => {
                if (t.expenseIndex > newExpenseIndex) {
                    t.expenseIndex--;
                }
            });
        }
        
        tickets.splice(idx, 1);
        
        await db.collection('trips').doc(currentTrip.id).update({
            tickets,
            expenses,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentTrip.tickets = tickets;
        currentTrip.expenses = expenses;
        setCurrentTrip(currentTrip);
        
        showToast('Ticket deleted successfully!', 'success');
        loadTripDetails();
        
    } catch (e) {
        console.error('Error deleting ticket:', e);
        showToast('Error deleting ticket', 'danger');
    }
}

function renderTicketsList(trip) {
    const container = document.getElementById('tickets-container');
    const emptyState = document.getElementById('empty-tickets');
    
    if (!container || !emptyState) return;
    
    container.innerHTML = '';
    
    let tickets = trip.tickets || [];
    if (tickets.length === 0) {
        emptyState.classList.remove('d-none');
        return;
    }

    const currentFilter = window._currentTicketFilter || 'all';
    if (currentFilter === 'darshan') {
        tickets = tickets.filter(t => t.type === 'darshan');
    } else if (currentFilter === 'transport') {
        tickets = tickets.filter(t => ['train', 'flight', 'bus'].includes(t.type));
    } else if (currentFilter === 'event') {
        tickets = tickets.filter(t => ['event', 'other'].includes(t.type));
    }
    
    if (tickets.length === 0) {
        emptyState.classList.remove('d-none');
        return;
    }
    
    emptyState.classList.add('d-none');
    
    const sortedTickets = [...tickets].sort((a, b) => (a.departureTime || '').localeCompare(b.departureTime || ''));
    
    sortedTickets.forEach(ticket => {
        const card = document.createElement('div');
        card.className = 'col-md-6';
        
        const isDarshan = ticket.type === 'darshan';
        const isExpensed = ticket.expenseIndex !== undefined;

        const depD = new Date(ticket.departureTime || Date.now());
        const arrD = ticket.arrivalTime ? new Date(ticket.arrivalTime) : null;
        
        const depTime24 = depD.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
        const depDateFormatted = depD.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: '2-digit' });
        
        const arrTime24 = arrD ? arrD.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
        const arrDateFormatted = arrD ? arrD.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: '2-digit' }) : '';
        
        const bookedOnDate = ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: '2-digit' }) : '--';

        if (isDarshan) {
            // Saffron & Gold Devotional Card layout for Darshan Passes
            card.innerHTML = `
                <div class="card h-100 border border-warning border-opacity-50 shadow-sm rounded-3 overflow-hidden">
                    <div class="px-3 py-2 text-white d-flex justify-content-between align-items-center" style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%);">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-gopuram me-2 text-warning-light" style="font-size: 1.05rem;"></i>
                            <span class="fw-bold small text-uppercase" style="letter-spacing: 0.5px;">🙏 Darshan / Temple Pass</span>
                        </div>
                        <div>
                            <button type="button" class="btn btn-link text-white p-0 me-2 btn-xs" onclick="showEditTicketModal('${ticket.id}')" title="Edit Pass">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn btn-link text-white p-0 btn-xs" onclick="deleteTicket('${ticket.id}')" title="Delete Pass">
                                <i class="fas fa-trash text-white-50"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="card-body pt-3 pb-3 px-3">
                        <div class="d-flex justify-content-between align-items-start border-bottom pb-2 mb-3">
                            <div class="text-start">
                                <span class="small text-muted d-block text-uppercase" style="font-size:0.6rem;">Temple / Devasthanam</span>
                                <div class="fw-bold text-dark fs-6">${ticket.templeName || ticket.operator || 'Devasthanam'}</div>
                                <span class="badge bg-warning bg-opacity-25 text-warning-emphasis border border-warning border-opacity-50 mt-1" style="font-size:0.7rem;">
                                    ${ticket.darshanCategory || ticket.serviceName || 'Special Entry Darshan'}
                                </span>
                            </div>
                            <div class="text-end">
                                <span class="small text-muted d-block text-uppercase" style="font-size:0.6rem;">Token / Booking ID</span>
                                <div class="d-flex align-items-center justify-content-end">
                                    <strong class="text-primary ticket-pnr-box" style="font-size:0.95rem;">${ticket.ticketNo}</strong>
                                    <button class="btn btn-link text-secondary p-0 ms-1" onclick="navigator.clipboard.writeText('${ticket.ticketNo}'); showToast('Token Number Copied!', 'success');" style="font-size:0.8rem;" title="Copy Token">
                                        <i class="far fa-copy"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="p-2.5 rounded mb-3 border border-warning border-opacity-25" style="background: rgba(217, 119, 6, 0.06);">
                            <div class="row align-items-center">
                                <div class="col-7 text-start">
                                    <small class="text-muted d-block text-uppercase" style="font-size:0.6rem;">Reporting / Slot Time</small>
                                    <div class="fw-bold text-dark" style="font-size:0.9rem;">
                                        <i class="far fa-calendar-alt text-warning me-1"></i>${depDateFormatted} at ${depTime24}
                                    </div>
                                </div>
                                <div class="col-5 text-end">
                                    <small class="text-muted d-block text-uppercase" style="font-size:0.6rem;">Gate / Line</small>
                                    <div class="fw-bold text-dark text-truncate" style="font-size:0.82rem;" title="${ticket.reportingVenue || ticket.departurePlace}">
                                        <i class="fas fa-location-dot text-danger me-1"></i>${ticket.reportingVenue || ticket.departurePlace || 'Main Entrance'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="border-top pt-2 mt-2">
                            <div class="row align-items-center" style="font-size: 0.75rem;">
                                <div class="col-6 text-start">
                                    <span class="text-muted d-block" style="font-size:0.6rem; text-transform:uppercase;">Primary Devotee</span>
                                    <strong class="text-dark text-truncate d-block">${ticket.passengerName || '--'} (${ticket.devoteesCount || 1} Person${(ticket.devoteesCount || 1) > 1 ? 's' : ''})</strong>
                                </div>
                                <div class="col-6 text-end">
                                    <span class="text-muted d-block" style="font-size:0.6rem; text-transform:uppercase;">Pass Status</span>
                                    <strong class="text-success text-truncate d-block">${ticket.bookingStatus || 'Confirmed'}</strong>
                                </div>
                            </div>
                            ${ticket.prasadamInfo ? `
                                <div class="mt-2 pt-1 text-success fw-semibold small" style="font-size:0.72rem;">
                                    <i class="fas fa-gift me-1"></i>Prasadam: ${ticket.prasadamInfo}
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                            <div class="small">
                                ${ticket.cost > 0 ? `
                                    <span class="fw-bold text-success" style="font-size:0.85rem;"><span class="rupee-symbol">₹</span>${ticket.cost.toFixed(2)}</span>
                                    ${isExpensed ? `<span class="badge bg-success-subtle text-success ms-1" style="font-size: 0.55rem;"><i class="fas fa-check me-1"></i>Expensed</span>` : ''}
                                ` : `<span class="badge bg-secondary-subtle text-secondary" style="font-size:0.7rem;">Free Entry Pass</span>`}
                            </div>
                            <div>
                                ${ticket.imageUrl ? `
                                    <button class="btn btn-outline-warning btn-sm py-1 px-2.5 rounded-pill shadow-sm" onclick="viewTicketReceipt('${ticket.imageUrl}', 'Darshan Pass - ${ticket.templeName || ticket.operator}')" style="font-size:0.75rem;">
                                        <i class="fas fa-qrcode me-1"></i>View Pass / QR
                                    </button>
                                ` : '<span class="text-muted small"><i class="fas fa-image-slash me-1"></i>No File</span>'}
                            </div>
                        </div>
                        
                        ${ticket.notes ? `
                            <div class="mt-2 p-2 border-start border-3 border-warning bg-warning bg-opacity-10 rounded-end" style="font-size: 0.7rem;">
                                <span class="text-dark text-break"><i class="fas fa-info-circle me-1 text-warning"></i>${ticket.notes}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } else {
            // Transport / Event Ticket Layout
            let typeIcon = 'fa-plane';
            let headerBgClass = 'bg-primary';
            let headerTextClass = 'text-white';
            
            if (ticket.type === 'train') {
                typeIcon = 'fa-train-subway';
                headerBgClass = 'bg-success';
            } else if (ticket.type === 'bus') {
                typeIcon = 'fa-bus';
                headerBgClass = 'bg-danger';
            } else if (ticket.type === 'event' || ticket.type === 'other') {
                typeIcon = 'fa-ticket-alt';
                headerBgClass = 'bg-info';
            }
            
            let durationText = '';
            if (arrD) {
                const diffMs = arrD - depD;
                if (diffMs > 0) {
                    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    durationText = `${diffHrs}h ${diffMins}m`;
                }
            }
            
            card.innerHTML = `
                <div class="card h-100 border border-light shadow-sm rounded-3 overflow-hidden">
                    <div class="${headerBgClass} ${headerTextClass} px-3 py-2 d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <i class="fas ${typeIcon} me-2" style="font-size: 0.9rem;"></i>
                            <span class="fw-bold small text-uppercase" style="letter-spacing: 0.5px;">${ticket.type} Ticket</span>
                        </div>
                        <div>
                            <button type="button" class="btn btn-link text-white p-0 me-2 btn-xs" onclick="showEditTicketModal('${ticket.id}')" title="Edit Ticket">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn btn-link text-white p-0 btn-xs" onclick="deleteTicket('${ticket.id}')" title="Delete Ticket">
                                <i class="fas fa-trash text-white-50"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="card-body pt-3 pb-3 px-3">
                        <div class="d-flex justify-content-between align-items-start border-bottom pb-2 mb-3">
                            <div class="text-start">
                                <span class="small text-muted d-block" style="font-size:0.6rem; text-transform:uppercase;">Service / Carrier</span>
                                <div class="fw-bold text-dark" style="font-size:0.95rem;">${ticket.serviceNo || '---'}</div>
                                <div class="text-secondary small fw-semibold">${ticket.serviceName || ticket.operator}</div>
                            </div>
                            <div class="text-end">
                                <span class="small text-muted d-block" style="font-size:0.6rem; text-transform:uppercase;">PNR / Booking ID</span>
                                <div class="d-flex align-items-center justify-content-end">
                                    <strong class="text-primary ticket-pnr-box" style="font-size:0.95rem;">${ticket.ticketNo}</strong>
                                    <button class="btn btn-link text-secondary p-0 ms-1" onclick="navigator.clipboard.writeText('${ticket.ticketNo}'); showToast('PNR Copied!', 'success');" style="font-size:0.8rem;" title="Copy PNR">
                                        <i class="far fa-copy"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row align-items-center mb-3">
                            <div class="col-4 text-start">
                                <div class="h5 mb-0 fw-bold text-dark">${depTime24}</div>
                                <div class="small text-muted" style="font-size: 0.7rem;">${depDateFormatted}</div>
                                <div class="fw-bold text-dark mt-2 text-uppercase text-truncate" style="font-size: 0.8rem;" title="${ticket.departurePlace}">${ticket.departurePlace}</div>
                                <div class="small text-secondary fw-bold" style="font-size: 0.7rem;">${ticket.depCode || '--'}</div>
                            </div>
                            <div class="col-4 text-center">
                                <div class="text-muted small" style="font-size:0.65rem;">${durationText ? `${durationText}` : '—'}</div>
                                <div class="my-1 d-flex align-items-center justify-content-center">
                                    <div class="flex-grow-1" style="height: 1px; background-color: #dee2e6;"></div>
                                    <i class="fas ${typeIcon} text-muted mx-2" style="font-size: 0.75rem;"></i>
                                    <div class="flex-grow-1" style="height: 1px; background-color: #dee2e6;"></div>
                                </div>
                                <span class="badge rounded-pill bg-light text-secondary border px-2 py-1" style="font-size:0.6rem; text-transform:uppercase;">${ticket.operator}</span>
                            </div>
                            <div class="col-4 text-end">
                                <div class="h5 mb-0 fw-bold text-dark">${arrTime24}</div>
                                <div class="small text-muted" style="font-size: 0.7rem;">${arrDateFormatted || '--'}</div>
                                <div class="fw-bold text-dark mt-2 text-uppercase text-truncate" style="font-size: 0.8rem;" title="${ticket.arrivalPlace}">${ticket.arrivalPlace}</div>
                                <div class="small text-secondary fw-bold" style="font-size: 0.7rem;">${ticket.arrCode || '--'}</div>
                            </div>
                        </div>
                        
                        <div class="bg-light bg-opacity-75 p-2 rounded small mb-2 border d-flex justify-content-between align-items-center" style="font-size: 0.75rem;">
                            <span>Seat/Berth: <strong class="text-dark">${ticket.seatNo || '--'}</strong></span>
                            <span>Booked on: <strong class="text-dark">${bookedOnDate}</strong></span>
                        </div>
                        
                        <div class="border-top pt-2 mt-2">
                            <div class="row align-items-center" style="font-size: 0.75rem;">
                                <div class="col-6 text-start">
                                    <span class="text-muted d-block" style="font-size:0.6rem; text-transform:uppercase;">Passenger</span>
                                    <strong class="text-dark text-truncate d-block">${ticket.passengerName || '--'}</strong>
                                </div>
                                <div class="col-6 text-end">
                                    <span class="text-muted d-block" style="font-size:0.6rem; text-transform:uppercase;">Booking Status</span>
                                    <strong class="text-success text-truncate d-block">${ticket.bookingStatus || '--'}</strong>
                                </div>
                            </div>
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                            <div class="small">
                                ${ticket.cost > 0 ? `
                                    <span class="fw-bold text-success" style="font-size:0.85rem;"><span class="rupee-symbol">₹</span>${ticket.cost.toFixed(2)}</span>
                                    ${isExpensed ? `<span class="badge bg-success-subtle text-success ms-1" style="font-size: 0.55rem;"><i class="fas fa-check me-1"></i>Expensed</span>` : ''}
                                ` : '<span class="text-muted small">No cost tracked</span>'}
                            </div>
                            <div>
                                ${ticket.imageUrl ? `
                                    <button type="button" class="btn btn-outline-primary btn-xs py-1 px-2 fw-semibold" style="font-size: 0.65rem;" onclick="viewTicketReceipt('${ticket.imageUrl}', '${ticket.operator}')">
                                        <i class="fas fa-image me-1"></i>View Ticket
                                    </button>
                                ` : '<span class="text-muted small"><i class="fas fa-image-slash me-1"></i>No Image</span>'}
                            </div>
                        </div>
                        
                        ${ticket.notes ? `
                            <div class="mt-2 p-2 border-start border-3 border-secondary bg-light bg-opacity-50 rounded-end" style="font-size: 0.7rem;">
                                <span class="text-secondary text-break">${ticket.notes}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        container.appendChild(card);
    });
}

function viewTicketReceipt(url, operator) {
    const modalImg = document.getElementById('view-ticket-img-element');
    const modalTitle = document.getElementById('viewTicketImageTitle');
    
    if (modalImg && modalTitle) {
        modalImg.src = url;
        modalTitle.textContent = `${operator} Ticket Receipt Preview`;
        
        const modal = new bootstrap.Modal(document.getElementById('viewTicketImageModal'));
        modal.show();
    }
}

function updateDepartureAlerts(trip) {
    const alertContainer = document.getElementById('ticket-departure-alerts');
    const overviewAlertContainer = document.getElementById('overview-ticket-departure-alerts');
    
    if (alertContainer) {
        alertContainer.innerHTML = '';
        alertContainer.classList.add('d-none');
    }
    if (overviewAlertContainer) {
        overviewAlertContainer.innerHTML = '';
        overviewAlertContainer.classList.add('d-none');
    }
    
    const tickets = trip.tickets || [];
    if (tickets.length === 0) return;
    
    const now = new Date();
    const upcomingDepartures = [];
    
    tickets.forEach(ticket => {
        const depTime = new Date(ticket.departureTime);
        const diffMs = depTime - now;
        const diffHours = diffMs / (1000 * 60 * 60);
        
        if (diffMs > 0 && diffHours <= 36) {
            upcomingDepartures.push({
                ticket,
                depTime,
                diffMs
            });
        }
    });
    
    if (upcomingDepartures.length === 0) return;
    
    upcomingDepartures.sort((a, b) => a.diffMs - b.diffMs);
    
    if (alertContainer) {
        alertContainer.classList.remove('d-none');
    }
    if (overviewAlertContainer) {
        overviewAlertContainer.classList.remove('d-none');
    }
    
    upcomingDepartures.forEach(item => {
        const tkt = item.ticket;
        const diffHrs = Math.floor(item.diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((item.diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        let typeIcon = 'fa-plane';
        let alertClass = 'alert-danger';
        const isDarshan = tkt.type === 'darshan';
        
        if (tkt.type === 'train') {
            typeIcon = 'fa-train-subway';
        } else if (tkt.type === 'bus') {
            typeIcon = 'fa-bus';
        } else if (isDarshan) {
            typeIcon = 'fa-gopuram';
        }
        
        if (diffHrs >= 12) {
            alertClass = isDarshan ? 'alert-warning' : 'alert-info';
        } else if (diffHrs >= 4) {
            alertClass = 'alert-warning';
        }
        
        const countdownText = diffHrs > 0 
            ? `${diffHrs}h ${diffMins}m`
            : `${diffMins}m`;
            
        const titleText = isDarshan 
            ? `🙏 Darshan Slot: ${tkt.templeName || tkt.operator}` 
            : `Upcoming ${tkt.type} to ${tkt.arrivalPlace}`;
            
        const detailText = isDarshan 
            ? `Reporting Gate: <strong>${tkt.reportingVenue || tkt.departurePlace}</strong> @ <strong>${new Date(tkt.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong>. Pass: ${tkt.darshanCategory || 'Special Entry'}` 
            : `Departure from <strong>${tkt.departurePlace}</strong> @ <strong>${new Date(tkt.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong>. Seat: ${tkt.seatNo || '--'}`;

        const badgeText = isDarshan ? `Slot in ${countdownText}` : `Departs in ${countdownText}`;
            
        const alertHtml = `
            <div class="alert ${alertClass} d-flex align-items-center justify-content-between p-3 border-0 shadow-sm animate-pulse-slow mb-2" role="alert">
                <div class="d-flex align-items-center">
                    <div class="me-3 fs-4"><i class="fas ${typeIcon}"></i></div>
                    <div>
                        <strong class="d-block text-capitalize" style="font-size:0.9rem;">${titleText}</strong>
                        <span class="small text-secondary" style="font-size:0.75rem;">${detailText}</span>
                    </div>
                </div>
                <div class="text-end">
                    <span class="badge rounded-pill bg-dark py-1 px-3" style="font-size:0.7rem;">${badgeText}</span>
                </div>
            </div>
        `;
        
        if (alertContainer) {
            alertContainer.insertAdjacentHTML('beforeend', alertHtml);
        }
        if (overviewAlertContainer) {
            overviewAlertContainer.insertAdjacentHTML('beforeend', alertHtml);
        }
    });
}

// =========================================================================
// JOURNEY & LOCATION STAY TIME TRACKING ENGINE
// =========================================================================

function calculateJourneyStayTimes(trip) {
    const tickets = trip.tickets || [];
    if (tickets.length === 0) return null;
    
    // Sort transport tickets chronologically by departureTime (exclude Darshan, Events, etc. which are part of destination exploration)
    const validTickets = tickets
        .filter(t => t.departureTime && ['flight', 'train', 'bus'].includes(t.type))
        .sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));
        
    if (validTickets.length === 0) return null;
    
    const transitLegs = [];
    const stayLegs = [];
    let totalTransitMs = 0;
    let totalStayMs = 0;
    
    for (let i = 0; i < validTickets.length; i++) {
        const currentTicket = validTickets[i];
        const depTime = new Date(currentTicket.departureTime);
        const arrTime = currentTicket.arrivalTime ? new Date(currentTicket.arrivalTime) : depTime;
        
        const transitMs = Math.max(0, arrTime - depTime);
        totalTransitMs += transitMs;
        
        transitLegs.push({
            ticket: currentTicket,
            departureTime: depTime,
            arrivalTime: arrTime,
            durationMs: transitMs,
            from: currentTicket.departurePlace,
            depCode: currentTicket.depCode || '',
            to: currentTicket.arrivalPlace,
            arrCode: currentTicket.arrCode || '',
            type: currentTicket.type,
            operator: currentTicket.operator,
            serviceNo: currentTicket.serviceNo || ''
        });
        
        // Calculate layover/stay until next ticket departure
        if (i < validTickets.length - 1) {
            const nextTicket = validTickets[i + 1];
            const nextDepTime = new Date(nextTicket.departureTime);
            
            const stayStart = arrTime;
            const stayEnd = nextDepTime;
            const stayMs = Math.max(0, stayEnd - stayStart);
            
            totalStayMs += stayMs;
            
            const locationName = currentTicket.arrivalPlace || nextTicket.departurePlace;
            const locationCode = currentTicket.arrCode || nextTicket.depCode || '';
            
            stayLegs.push({
                location: locationName,
                code: locationCode,
                stayStart,
                stayEnd,
                durationMs: stayMs,
                arrivedVia: currentTicket,
                departingVia: nextTicket
            });
        }
    }
    
    const totalTripMs = totalTransitMs + totalStayMs;
    const transitPercent = totalTripMs > 0 ? ((totalTransitMs / totalTripMs) * 100) : 0;
    const stayPercent = totalTripMs > 0 ? ((totalStayMs / totalTripMs) * 100) : 0;
    
    return {
        transitLegs,
        stayLegs,
        totalTransitMs,
        totalStayMs,
        totalTripMs,
        transitPercent,
        stayPercent,
        ticketCount: validTickets.length
    };
}

function formatDurationNice(ms) {
    if (!ms || ms <= 0) return '0 Mins';
    
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const mins = totalMinutes % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days} ${days === 1 ? 'Day' : 'Days'}`);
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'Hour' : 'Hours'}`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins} Mins`);
    
    return parts.join(', ');
}

function formatDurationShort(ms) {
    if (!ms || ms <= 0) return '0m';
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const mins = totalMinutes % 60;
    
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

function renderJourneyStayBreakdown(trip) {
    const card = document.getElementById('journey-stay-breakdown-card');
    const overviewWidget = document.getElementById('overview-stay-breakdown-widget');
    
    if (!card && !overviewWidget) return;
    
    const analysis = calculateJourneyStayTimes(trip);
    
    if (!analysis || (analysis.stayLegs.length === 0 && analysis.transitLegs.length === 0)) {
        if (card) { card.classList.add('d-none'); card.innerHTML = ''; }
        if (overviewWidget) { overviewWidget.classList.add('d-none'); overviewWidget.innerHTML = ''; }
        return;
    }
    
    const formattedTransitTime = formatDurationNice(analysis.totalTransitMs);
    const formattedStayTime = formatDurationNice(analysis.totalStayMs);
    
    const stayCardsHtml = analysis.stayLegs.map(leg => {
        const startStr = leg.stayStart.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) + 
            ' @ ' + leg.stayStart.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
        const endStr = leg.stayEnd.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) + 
            ' @ ' + leg.stayEnd.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
        const durationStr = formatDurationNice(leg.durationMs);
        const codeBadge = leg.code ? `<span class="badge bg-secondary ms-1">${leg.code}</span>` : '';
        
        return `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 border-0 shadow-sm bg-light bg-opacity-75 rounded-3 position-relative overflow-hidden">
                    <div class="position-absolute top-0 start-0 bottom-0 bg-success" style="width: 4px;"></div>
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <small class="text-uppercase text-muted fw-bold" style="font-size:0.6rem;">Exploring Destination</small>
                                <h6 class="mb-0 fw-bold text-dark text-capitalize">${leg.location}${codeBadge}</h6>
                            </div>
                            <span class="badge bg-success-subtle text-success py-1 px-2 fw-bold" style="font-size:0.75rem;">
                                <i class="fas fa-clock me-1"></i>${formatDurationShort(leg.durationMs)}
                            </span>
                        </div>
                        
                        <div class="p-2 bg-white rounded-2 border mb-2" style="font-size:0.75rem;">
                            <div class="d-flex justify-content-between text-muted mb-1">
                                <span><i class="fas fa-plane-arrival text-info me-1"></i>Arrival:</span>
                                <strong class="text-dark">${startStr}</strong>
                            </div>
                            <div class="d-flex justify-content-between text-muted">
                                <span><i class="fas fa-plane-departure text-warning me-1"></i>Next Departure:</span>
                                <strong class="text-dark">${endStr}</strong>
                            </div>
                        </div>
                        
                        <div class="small text-success fw-semibold" style="font-size:0.72rem;">
                            <i class="fas fa-compass me-1"></i><strong>${durationStr}</strong> available to explore ${leg.location}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    if (card) {
        card.classList.remove('d-none');
        card.innerHTML = `
            <div class="card border-0 shadow-sm rounded-3 overflow-hidden">
                <div class="card-header bg-white py-3 px-4 border-bottom-0 d-flex align-items-center justify-content-between">
                    <div>
                        <h5 class="mb-0 fw-bold text-dark"><i class="fas fa-map-location-dot me-2 text-success"></i>Location Exploration & Transit Tracker</h5>
                        <small class="text-muted">Calculated automatically from your booked tickets</small>
                    </div>
                    <span class="badge bg-dark rounded-pill px-3 py-2" style="font-size: 0.75rem;">
                        ${analysis.stayLegs.length} ${analysis.stayLegs.length === 1 ? 'Location Stay' : 'Location Stays'}
                    </span>
                </div>
                <div class="card-body px-4 pt-0 pb-3">
                    <!-- Progress Bar Split -->
                    <div class="mb-3">
                        <div class="d-flex justify-content-between small fw-semibold mb-1" style="font-size: 0.75rem;">
                            <span class="text-primary"><i class="fas fa-train me-1"></i>Transit Time: <strong>${formattedTransitTime}</strong> (${analysis.transitPercent.toFixed(0)}%)</span>
                            <span class="text-success"><i class="fas fa-hotel me-1"></i>Stay & Exploring Time: <strong>${formattedStayTime}</strong> (${analysis.stayPercent.toFixed(0)}%)</span>
                        </div>
                        <div class="progress" style="height: 8px; border-radius: 4px;">
                            <div class="progress-bar bg-primary" role="progressbar" style="width: ${analysis.transitPercent}%" title="Transit: ${formattedTransitTime}"></div>
                            <div class="progress-bar bg-success" role="progressbar" style="width: ${analysis.stayPercent}%" title="Stay: ${formattedStayTime}"></div>
                        </div>
                    </div>
                    
                    ${analysis.stayLegs.length > 0 ? `
                        <div class="row g-3">
                            ${stayCardsHtml}
                        </div>
                    ` : `
                        <div class="alert alert-info py-2 px-3 mb-0 small">
                            <i class="fas fa-info-circle me-1"></i> Add multiple tickets to calculate stay & layover durations between destinations!
                        </div>
                    `}
                </div>
            </div>
        `;
    }
    
    if (overviewWidget) {
        overviewWidget.classList.remove('d-none');
        overviewWidget.innerHTML = `
            <div class="card border-0 shadow-sm rounded-3 bg-white p-3">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="small fw-bold text-dark"><i class="fas fa-clock-rotate-left me-1 text-primary"></i>Travel Allocation (Transit vs Stay)</span>
                    <span class="badge bg-success-subtle text-success">${analysis.stayLegs.length} Destinations Tracked</span>
                </div>
                <div class="row g-2 align-items-center">
                    <div class="col-md-6">
                        <div class="p-2 border rounded-2 bg-light">
                            <small class="text-muted d-block" style="font-size:0.65rem;">TOTAL EXPLORING & STAY TIME</small>
                            <strong class="text-success" style="font-size:0.95rem;">${formattedStayTime}</strong>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-2 border rounded-2 bg-light">
                            <small class="text-muted d-block" style="font-size:0.65rem;">TOTAL TRANSIT TIME</small>
                            <strong class="text-primary" style="font-size:0.95rem;">${formattedTransitTime}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

function shareItineraryText() {
    if (!currentTrip || !currentTrip.itinerary || currentTrip.itinerary.length === 0) {
        showToast('No itinerary items to share! Please add activities first.', 'warning');
        return;
    }
    
    let text = `✈️ *TravelMate Itinerary for ${currentTrip.title || currentTrip.destination}*\n📅 Dates: ${currentTrip.startDate} to ${currentTrip.endDate}\n\n`;
    
    const activitiesByDay = {};
    currentTrip.itinerary.forEach(act => {
        if (!activitiesByDay[act.day]) activitiesByDay[act.day] = [];
        activitiesByDay[act.day].push(act);
    });
    
    Object.keys(activitiesByDay).sort((a,b) => parseInt(a)-parseInt(b)).forEach(day => {
        text += `📌 *DAY ${day}*\n`;
        activitiesByDay[day].sort((a,b) => a.time.localeCompare(b.time)).forEach(act => {
            const catEmoji = act.category === 'temple' ? '🕉️' : (act.category === 'food' ? '🍽️' : (act.category === 'shopping' ? '🛍️' : '🏛️'));
            text += `  • ⏰ ${act.time} - ${catEmoji} *${act.place}* ${act.notes ? '(' + act.notes + ')' : ''}\n`;
        });
        text += `\n`;
    });
    
    text += `Shared via TravelMate 🌍`;
    
    if (navigator.share) {
        navigator.share({ title: currentTrip.title || 'Trip Itinerary', text: text }).catch(() => {
            navigator.clipboard.writeText(text);
            showToast('Itinerary copied to clipboard!', 'success');
        });
    } else {
        navigator.clipboard.writeText(text);
        showToast('Itinerary copied to clipboard! You can paste it in WhatsApp or messages.', 'success');
    }
}

// =========================================================================
// AI AUTO-ITINERARY PLANNER ENGINE (USES BOOKED TICKETS & DESTINATION DATA)
// =========================================================================

async function callAIModelForItinerary(prompt) {
    if (typeof loadOpenRouterKeyShared === 'function') {
        await loadOpenRouterKeyShared();
    }
    
    let openrouterKey = window._openrouterApiKey ? window._openrouterApiKey.trim() : '';
    let groqKey = window._groqApiKey ? window._groqApiKey.trim() : '';

    const systemPrompt = "You are a professional travel planner API that returns strictly valid JSON arrays of itinerary activity objects. Return ONLY the raw JSON array without markdown codeblocks or introductory text.";

    // 1. Try Groq API first if key is available
    if (groqKey) {
        const groqModels = ['llama-3.3-70b-versatile', 'llama3-8b-8192', 'mixtral-8x7b-32768'];
        for (const model of groqModels) {
            try {
                console.log(`🤖 Trying Groq model for AI Itinerary: ${model}`);
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${groqKey}`
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: prompt }
                        ],
                        max_tokens: 1500,
                        temperature: 0.3
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const text = data.choices?.[0]?.message?.content?.trim();
                    if (text) {
                        console.log(`✅ Groq model ${model} successfully returned AI itinerary.`);
                        return text;
                    }
                } else {
                    console.warn(`Groq model ${model} status ${response.status}`);
                }
            } catch (err) {
                console.warn(`Groq model ${model} exception:`, err.message);
            }
        }
    }

    // 2. Try OpenRouter API
    const openrouterModels = [
        'meta-llama/llama-3.3-70b-instruct:free',
        'google/gemini-2.0-flash-exp:free',
        'qwen/qwen-2.5-72b-instruct:free',
        'deepseek/deepseek-r1:free',
        'openrouter/free'
    ];

    if (window._openrouterModel && window._openrouterModel !== 'auto' && window._openrouterModel !== 'custom') {
        openrouterModels.unshift(window._openrouterModel);
    }

    for (const model of openrouterModels) {
        try {
            console.log(`🤖 Requesting OpenRouter AI Itinerary via model: ${model}`);
            const headers = {
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'TravelMate AI Planner'
            };
            if (openrouterKey) {
                headers['Authorization'] = `Bearer ${openrouterKey}`;
            }

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 1500,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.warn(`OpenRouter ${model} status ${response.status}:`, errText);
                continue;
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content?.trim();
            if (text) return text;
        } catch (e) {
            console.warn(`OpenRouter ${model} exception:`, e.message);
        }
    }

    return null;
}

function buildFallbackItinerary(trip, totalDays, pace) {
    const activities = [];
    const tickets = trip.tickets || [];
    const destination = trip.destination || 'Destination';

    // 1. Incorporate booked tickets
    tickets.forEach((t) => {
        let day = 1;
        let time = '08:00';
        if (t.departureTime) {
            const ticketDate = new Date(t.departureTime);
            const startDate = new Date(trip.startDate);
            const diffDays = Math.ceil((ticketDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            day = Math.min(Math.max(1, diffDays), totalDays);
            time = t.departureTime.includes('T') ? t.departureTime.split('T')[1].substring(0, 5) : '08:00';
        }

        if (t.type === 'darshan') {
            activities.push({
                day,
                time,
                category: 'temple',
                place: t.templeName || `${destination} Temple`,
                notes: `🙏 Darshan Slot (${t.darshanCategory || 'Special Entry'}) - Gate: ${t.reportingVenue || t.departurePlace || 'Reporting Gate'}`,
                addedBy: auth.currentUser?.uid || 'system',
                addedAt: new Date().toISOString()
            });
        } else {
            activities.push({
                day,
                time,
                category: 'transit',
                place: `Transit: ${t.departurePlace} → ${t.arrivalPlace}`,
                notes: `🚕 ${t.type.toUpperCase()} Carrier: ${t.serviceNo ? t.serviceNo + ' - ' : ''}${t.serviceName || t.operator || 'Transport'}. Departure @ ${time}.`,
                addedBy: auth.currentUser?.uid || 'system',
                addedAt: new Date().toISOString()
            });
        }
    });

    // 2. Fill in exploring activities for each day
    for (let d = 1; d <= totalDays; d++) {
        const hasTemple = activities.some(a => a.day === d && a.category === 'temple');
        const hasSightseeing = activities.some(a => a.day === d && a.category === 'sightseeing');

        if (!hasTemple && (pace === 'spiritual' || pace === 'balanced')) {
            activities.push({
                day: d,
                time: '09:00',
                category: 'temple',
                place: `${destination} Main Temple / Devotional Visit`,
                notes: 'Morning prayers, peaceful darshan & spiritual exploration.',
                addedBy: auth.currentUser?.uid || 'system',
                addedAt: new Date().toISOString()
            });
        }

        if (!hasSightseeing) {
            activities.push({
                day: d,
                time: '11:30',
                category: 'sightseeing',
                place: `${destination} Famous Landmarks & Sightseeing Spot`,
                notes: 'Explore top attractions, cultural sights & scenic viewpoints.',
                addedBy: auth.currentUser?.uid || 'system',
                addedAt: new Date().toISOString()
            });
        }

        activities.push({
            day: d,
            time: '13:30',
            category: 'food',
            place: `Famous Regional Restaurant in ${destination}`,
            notes: 'Enjoy authentic local delicacies & refreshing lunch.',
            addedBy: auth.currentUser?.uid || 'system',
            addedAt: new Date().toISOString()
        });

        activities.push({
            day: d,
            time: '17:00',
            category: 'shopping',
            place: `${destination} Evening Market & Local Bazaar`,
            notes: 'Handicrafts, local shopping, souvenirs & evening snacks.',
            addedBy: auth.currentUser?.uid || 'system',
            addedAt: new Date().toISOString()
        });
    }

    return activities;
}

function showAiAutoItineraryModal() {
    if (!currentTrip) {
        showToast('No trip selected', 'warning');
        return;
    }
    
    const summaryContainer = document.getElementById('ai-itinerary-ticket-summary');
    if (summaryContainer) {
        const tickets = currentTrip.tickets || [];
        if (tickets.length > 0) {
            summaryContainer.innerHTML = `
                <div class="fw-bold text-dark mb-1"><i class="fas fa-ticket-alt text-primary me-1"></i>Found ${tickets.length} Booked Ticket(s) & Slots:</div>
                <ul class="mb-0 ps-3 text-secondary" style="font-size:0.8rem;">
                    ${tickets.slice(0, 5).map(t => {
                        if (t.type === 'darshan') {
                            return `<li><strong>🙏 Darshan Pass:</strong> ${t.templeName || t.operator} (${t.darshanCategory || 'Special Entry'}) - Slot: ${t.departureTime.replace('T', ' ')}</li>`;
                        }
                        return `<li><strong>${t.type.toUpperCase()}:</strong> ${t.serviceNo ? t.serviceNo + ' - ' : ''}${t.serviceName || t.operator} (${t.departurePlace} → ${t.arrivalPlace}) @ ${t.departureTime.replace('T', ' ')}</li>`;
                    }).join('')}
                    ${tickets.length > 5 ? `<li><em>...and ${tickets.length - 5} more ticket(s)</em></li>` : ''}
                </ul>
            `;
        } else {
            summaryContainer.innerHTML = `
                <div class="text-secondary small"><i class="fas fa-info-circle text-info me-1"></i>No tickets added yet. AI will generate an optimal day-wise itinerary for <strong>${currentTrip.destination}</strong> based on trip duration (${currentTrip.startDate} to ${currentTrip.endDate}).</div>
            `;
        }
    }

    const statusEl = document.getElementById('ai-itinerary-status');
    const formEl = document.getElementById('ai-itinerary-form');
    const submitBtn = document.getElementById('btn-generate-ai-itinerary-submit');
    if (statusEl) statusEl.classList.add('d-none');
    if (formEl) formEl.classList.remove('d-none');
    if (submitBtn) submitBtn.disabled = false;

    const modal = new bootstrap.Modal(document.getElementById('aiAutoItineraryModal'));
    modal.show();
}

async function runAiAutoItineraryGeneration() {
    if (!currentTrip) return;

    const mode = document.getElementById('ai-itinerary-mode').value;
    const pace = document.getElementById('ai-itinerary-pace').value;

    const statusEl = document.getElementById('ai-itinerary-status');
    const statusText = document.getElementById('ai-itinerary-status-text');
    const formEl = document.getElementById('ai-itinerary-form');
    const submitBtn = document.getElementById('btn-generate-ai-itinerary-submit');

    if (statusEl) statusEl.classList.remove('d-none');
    if (formEl) formEl.classList.add('d-none');
    if (submitBtn) submitBtn.disabled = true;

    try {
        const startDate = new Date(currentTrip.startDate);
        const endDate = new Date(currentTrip.endDate);
        const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);

        if (statusText) statusText.textContent = `Analyzing tickets & generating Day 1 to Day ${totalDays} schedule for ${currentTrip.destination}...`;

        const ticketsList = (currentTrip.tickets || []).map((t, idx) => {
            if (t.type === 'darshan') {
                return `Ticket #${idx+1} [DARSHAN PASS]: Temple "${t.templeName || t.operator}", Slot Date/Time "${t.departureTime}", Reporting Gate "${t.reportingVenue || t.departurePlace}", Category "${t.darshanCategory || 'Special Entry'}"`;
            }
            return `Ticket #${idx+1} [${t.type.toUpperCase()}]: Carrier "${t.serviceNo ? t.serviceNo + ' - ' : ''}${t.serviceName || t.operator}", Departs "${t.departurePlace}" at "${t.departureTime}", Arrives "${t.arrivalPlace}" at "${t.arrivalTime || 'N/A'}"`;
        }).join('\n');

        const stayAnalysis = typeof calculateJourneyStayTimes === 'function' ? calculateJourneyStayTimes(currentTrip) : null;
        let exploringWindowsText = '';
        if (stayAnalysis && stayAnalysis.stayLegs && stayAnalysis.stayLegs.length > 0) {
            exploringWindowsText = stayAnalysis.stayLegs.map((leg, idx) => {
                const startStr = leg.stayStart.toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
                const endStr = leg.stayEnd.toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
                const hrs = (leg.durationMs / 3600000).toFixed(1);
                return `Exploring Window #${idx+1} at "${leg.location}": Available from ${startStr} to ${endStr} (${hrs} total hours available).`;
            }).join('\n');
        }

        const prompt = `You are a professional travel itinerary planner API.
Destination: "${currentTrip.destination}"
Trip Dates: ${currentTrip.startDate} to ${currentTrip.endDate} (${totalDays} total day(s))
Travel Style / Focus: ${pace}

BOOKED TRAVEL TICKETS & APPOINTMENTS:
${ticketsList || 'No specific tickets booked.'}

EXACT DESTINATION EXPLORING TIME WINDOWS (EXCLUDES JOURNEY TRANSIT HOURS):
${exploringWindowsText || 'Plan activities after arrival at the destination.'}

CRITICAL TIMING & PLANNING RULES:
1. AVOID PLANNING SIGHTSEEING DURING JOURNEY TRANSIT TIME: Do NOT schedule sightseeing, shopping, or temple visits during the hours when travelers are inside a train, flight, or bus traveling between cities! Mark journey travel hours simply as "Travel in Transit to [City]" with category "transit".
2. PLAN ACTIVITIES ONLY DURING ACTUAL EXPLORING TIME WINDOWS: Schedule activities only after arrival in a city (after train/flight arrival) and before the next transport departure time.
3. RESPECT DARSHAN SLOTS EXACTLY: For Darshan tickets, schedule temple queue reporting at the exact slot date & time.
4. For each day, include 3 to 5 realistic activities (Sightseeing, Temple visits, Famous local food, Shopping, Hotel check-in/rest, Travel transit).
5. OUTPUT FORMAT REQUIREMENTS:
   - Output MUST be ONLY a raw JSON array of objects.
   - Do NOT include any markdown codeblocks (\`\`\`json ... \`\`\`), no text outside the array.
   - Schema for each object:
     {
       "day": 1,
       "time": "09:00",
       "category": "temple|sightseeing|food|shopping|hotel|transit",
       "place": "Name of location/place",
       "notes": "Brief tips or instructions"
     }

Allowed values for "category": "temple", "sightseeing", "food", "shopping", "hotel", "transit", "other".
`;

        let formattedActivities = [];
        const aiResponseText = await callAIModelForItinerary(prompt);

        if (aiResponseText) {
            try {
                let cleanText = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
                const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
                if (jsonMatch) cleanText = jsonMatch[0];

                const parsed = JSON.parse(cleanText);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    formattedActivities = parsed.map(act => ({
                        day: Math.min(Math.max(1, parseInt(act.day) || 1), totalDays),
                        time: act.time || '10:00',
                        category: ['temple', 'sightseeing', 'food', 'shopping', 'hotel', 'transit'].includes(act.category) ? act.category : 'sightseeing',
                        place: (act.place || 'Local Sightseeing').trim(),
                        notes: (act.notes || '').trim(),
                        addedBy: auth.currentUser.uid,
                        addedAt: new Date().toISOString()
                    }));
                }
            } catch (jsonErr) {
                console.warn('AI text response was non-JSON, using ticket-aware fallback generator:', jsonErr.message);
            }
        }

        // Fallback: If AI returned non-JSON text or API failed, build ticket-aware itinerary
        if (formattedActivities.length === 0) {
            console.log('🤖 Building ticket-aware fallback itinerary...');
            formattedActivities = buildFallbackItinerary(currentTrip, totalDays, pace);
        }

        const tripDoc = await db.collection('trips').doc(currentTrip.id).get();
        if (!tripDoc.exists) throw new Error('Trip not found');

        const tripData = tripDoc.data();
        let finalItinerary = [];

        if (mode === 'append') {
            finalItinerary = [...(tripData.itinerary || []), ...formattedActivities];
        } else {
            finalItinerary = formattedActivities;
        }

        await db.collection('trips').doc(currentTrip.id).update({
            itinerary: finalItinerary,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        currentTrip.itinerary = finalItinerary;

        const modal = bootstrap.Modal.getInstance(document.getElementById('aiAutoItineraryModal'));
        modal?.hide();

        showToast(`AI successfully generated ${formattedActivities.length} itinerary activities! 🎉`, 'success');
        loadTripDetails();

    } catch (err) {
        console.error('Error generating AI itinerary:', err);
        showToast(err.message || 'Failed to generate AI itinerary. Please try again.', 'danger');
    } finally {
        if (statusEl) statusEl.classList.add('d-none');
        if (formEl) formEl.classList.remove('d-none');
        if (submitBtn) submitBtn.disabled = false;
    }
}

// Expose functions globally for onclick calls
window.showEditTicketModal = showEditTicketModal;
window.deleteTicket = deleteTicket;
window.viewTicketReceipt = viewTicketReceipt;
window.loadTripTickets = loadTripTickets;
window.loadTripWeather = loadTripWeather;
window.renderJourneyStayBreakdown = renderJourneyStayBreakdown;
window.shareItineraryText = shareItineraryText;
window.showAiAutoItineraryModal = showAiAutoItineraryModal;
window.runAiAutoItineraryGeneration = runAiAutoItineraryGeneration;
