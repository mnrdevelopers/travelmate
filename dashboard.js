let currentUser = null;
let userTrips = [];
var customCategories = typeof customCategories !== 'undefined' ? customCategories : [];
let carExpenseChart = null;
let fuelPriceChart = null;
let dashboardTrackerMap = null;
let activeTripTrackerTimeout = null;

document.addEventListener('DOMContentLoaded', function () {
    // Only run dashboard UI setup if we are on dashboard.html
    const isDashboardPage = !!document.getElementById('trips-container') || !!document.getElementById('public-dashboard');
    
    if (isDashboardPage) {
        console.log('DOM loaded, initializing dashboard...');
        
        const publicDashboard = document.getElementById('public-dashboard');
        if (publicDashboard) publicDashboard.classList.add('d-none');
        
        const privateDashboard = document.querySelector('.container.mt-4');
        if (privateDashboard) privateDashboard.classList.add('d-none');

        setupDashboardEventListeners();
        setupProtectedNavigation();
        checkAuthState();
        setupTheme();
        initializeApp();
    } else {
        // On non-dashboard pages (like trip-details.html), only setup Theme & AI Chatbot
        setupTheme();
        if (typeof loadOpenRouterKey === 'function') {
            loadOpenRouterKey().then(() => {
                if (typeof initAiChatbot === 'function') initAiChatbot();
            });
        }
    }
});

    // Protect car calculations link
    const carCalcLink = document.querySelector('a[href="car-calculations.html"]');
    if (carCalcLink) {
        carCalcLink.addEventListener('click', function (e) {
            if (!auth.currentUser) {
                e.preventDefault();
                window.location.href = 'login.html';
            }
        });
    }

    // Protect "Create First Trip" button
    const createFirstTripBtn = document.getElementById('create-first-trip-btn');
    if (createFirstTripBtn) {
        createFirstTripBtn.addEventListener('click', function (e) {
            if (!auth.currentUser) {
                e.preventDefault();
                window.location.href = 'login.html';
            }
        });
    }

function setupDashboardEventListeners() {
    // Trip management - check if elements exist first
    const createTripBtn = document.getElementById('create-trip-btn');
    const joinTripBtn = document.getElementById('join-trip-btn');
    const saveTripBtn = document.getElementById('save-trip-btn');
    const updateTripBtn = document.getElementById('update-trip-btn');
    const deleteTripBtn = document.getElementById('confirm-delete-trip-btn');
    const joinTripCodeBtn = document.getElementById('join-trip-code-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const copyCodeBtn = document.getElementById('copy-code-btn');
    const navProfile = document.getElementById('nav-profile');
    const createFirstTripBtn = document.getElementById('create-first-trip-btn');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    
    // Only add event listeners if elements exist
    if (createTripBtn) createTripBtn.addEventListener('click', showCreateTripModal);
    if (joinTripBtn) joinTripBtn.addEventListener('click', showJoinTripModal);
    if (saveTripBtn) saveTripBtn.addEventListener('click', saveTrip);
    if (updateTripBtn) updateTripBtn.addEventListener('click', updateTrip);
    if (deleteTripBtn) deleteTripBtn.addEventListener('click', deleteTrip);
    if (joinTripCodeBtn) joinTripCodeBtn.addEventListener('click', joinTripWithCode);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (copyCodeBtn) copyCodeBtn.addEventListener('click', copyTripCode);
    if (navProfile) navProfile.addEventListener('click', showProfileModal);
    if (createFirstTripBtn) createFirstTripBtn.addEventListener('click', showCreateTripModal);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);
    
    // Dynamic stops wiring
    const addTripStopBtn = document.getElementById('add-trip-stop-btn');
    if (addTripStopBtn) {
        addTripStopBtn.addEventListener('click', () => {
            addStopField(document.getElementById('trip-stops-container'));
        });
    }
    
    const editAddTripStopBtn = document.getElementById('edit-add-trip-stop-btn');
    if (editAddTripStopBtn) {
        editAddTripStopBtn.addEventListener('click', () => {
            addStopField(document.getElementById('edit-trip-stops-container'));
        });
    }
    
    // Distance calculation - check if elements exist
    const calculateDistanceCheckbox = document.getElementById('calculate-distance');
    const editCalculateDistanceCheckbox = document.getElementById('edit-calculate-distance');
    
    if (calculateDistanceCheckbox) {
        calculateDistanceCheckbox.addEventListener('change', function() {
            if (this.checked) {
                calculateDistance();
            } else {
                document.getElementById('distance-results').classList.add('d-none');
            }
        });
    }
    
    if (editCalculateDistanceCheckbox) {
        editCalculateDistanceCheckbox.addEventListener('change', function() {
            if (this.checked) {
                calculateEditDistance();
            } else {
                document.getElementById('edit-distance-results').classList.add('d-none');
            }
        });
    }

    // Transport mode change listeners
    const transportMode = document.getElementById('transport-mode');
    if (transportMode) {
        transportMode.addEventListener('change', function() {
            toggleDistanceCalculation(this.value, 'distance-calc-container', 'calculate-distance', 'distance-results');
        });
    }
    
    // Profile operations
    setupProfileEventListeners();
    
    // Slideshow quick-upload button wiring (Active Trip Hero Banner)
    const addSlideshowPhotoBtn = document.getElementById('add-slideshow-photo-btn');
    const slideshowQuickInput = document.getElementById('slideshow-quick-photo-input');
    if (addSlideshowPhotoBtn && slideshowQuickInput) {
        addSlideshowPhotoBtn.addEventListener('click', () => slideshowQuickInput.click());
        slideshowQuickInput.addEventListener('change', handleQuickActiveTripPhotoUpload);
    }
    
    // Protect any other navigation links
    const protectedLinks = document.querySelectorAll('.nav-link[href="#"]');
    protectedLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (!auth.currentUser) {
                e.preventDefault();
                window.location.href = 'login.html';
            }
        });
    });
}

function toggleDistanceCalculation(mode, containerId, checkboxId, resultsId) {
    const container = document.getElementById(containerId);
    const checkbox = document.getElementById(checkboxId);
    
    if (mode === 'car') {
        container.classList.remove('d-none');
    } else {
        container.classList.add('d-none');
        checkbox.checked = false;
        document.getElementById(resultsId).classList.add('d-none');
    }
}

function setupProfileEventListeners() {
    const navProfile = document.getElementById('nav-profile');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const avatarUpload = document.getElementById('avatar-upload');
    const leaveAllTripsBtn = document.getElementById('leave-all-trips-btn');
    const changePasswordBtn = document.getElementById('change-password-btn');
    
    if (navProfile) navProfile.addEventListener('click', showProfileModal);
    if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);
    if (avatarUpload) avatarUpload.addEventListener('change', handleAvatarUpload);
    if (leaveAllTripsBtn) leaveAllTripsBtn.addEventListener('click', leaveAllTrips);
    if (changePasswordBtn) changePasswordBtn.addEventListener('click', handleChangePassword);
    
    // Model preference event listener
    const modelSelect = document.getElementById('profile-openrouter-model');
    const customInput = document.getElementById('profile-openrouter-custom-model');
    if (modelSelect) {
        modelSelect.addEventListener('change', () => {
            if (modelSelect.value === 'custom') {
                customInput?.classList.remove('d-none');
            } else {
                customInput?.classList.add('d-none');
            }
        });
    }
}

// Add the missing profile functions
function showProfileModal() {
    const user = auth.currentUser;
    if (!user) return;
    
    document.getElementById('profile-name').value = user.displayName || '';
    document.getElementById('profile-email').value = user.email || '';
    
    const profileAvatar = document.getElementById('profile-avatar');
    const avatarUrl = localStorage.getItem('user_avatar_' + user.uid) || user.photoURL;
    if (profileAvatar) {
        profileAvatar.src = getSafeAvatarUrl(avatarUrl, user.displayName || 'User');
        setupAvatarFallback(profileAvatar, user.displayName || 'User');
    }
    
    // Load saved OpenRouter API key & model preferences from Firestore
    db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            if (data.photoURL) {
                localStorage.setItem('user_avatar_' + user.uid, data.photoURL);
                if (profileAvatar) {
                    profileAvatar.src = getSafeAvatarUrl(data.photoURL, user.displayName || 'User');
                }
            }
            const keyField = document.getElementById('profile-openrouter-key');
            if (keyField && data.openrouterApiKey) {
                keyField.value = data.openrouterApiKey;
            }
            
            const groqKeyField = document.getElementById('profile-groq-key');
            if (groqKeyField && data.groqApiKey) {
                groqKeyField.value = data.groqApiKey;
            }
            
            const modelSelect = document.getElementById('profile-openrouter-model');
            const customInput = document.getElementById('profile-openrouter-custom-model');
            if (modelSelect) {
                modelSelect.value = data.openrouterModel || 'auto';
                if (data.openrouterModel === 'custom') {
                    customInput?.classList.remove('d-none');
                    if (customInput && data.openrouterCustomModel) {
                        customInput.value = data.openrouterCustomModel;
                    }
                } else {
                    customInput?.classList.add('d-none');
                }
            }
        }
    }).catch(() => {});
    
    // Render default eco avatar selectors
    const container = document.getElementById('avatar-choices-container');
    if (container) {
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
                container.querySelectorAll('.avatar-option').forEach(opt => opt.style.borderColor = 'transparent');
                target.style.borderColor = 'var(--primary-color)';
                if (profileAvatar) profileAvatar.src = newVal;
            });
        });
    }
    
    const modal = new bootstrap.Modal(document.getElementById('profileModal'));
    modal.show();
}

async function saveProfile() {
    const name = document.getElementById('profile-name').value.trim();
    
    if (!name) {
        showAlert('Please enter a display name', 'warning');
        return;
    }
    
    try {
        document.getElementById('save-profile-btn').disabled = true;
        document.getElementById('save-profile-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
        
        // Retrieve selected avatar URL
        const profileAvatar = document.getElementById('profile-avatar');
        const selectedAvatarSrc = profileAvatar ? profileAvatar.src : '';
        
        // Firebase Auth enforces max 2048 chars for photoURL attribute.
        // Include in Auth profile update only if within limit (e.g. ImageKit CDN URL).
        // The full URL is always persisted safely in Firestore user document.
        const authPayload = { displayName: name };
        if (selectedAvatarSrc && selectedAvatarSrc.length <= 1800) {
            authPayload.photoURL = selectedAvatarSrc;
        }
        
        await auth.currentUser.updateProfile(authPayload);
        
        // Save OpenRouter API key & settings if provided
        const orKeyInput = document.getElementById('profile-openrouter-key');
        const openrouterApiKey = orKeyInput ? orKeyInput.value.trim() : '';
        if (openrouterApiKey) {
            window._openrouterApiKey = openrouterApiKey;
        }
        
        const groqKeyInput = document.getElementById('profile-groq-key');
        const groqApiKey = groqKeyInput ? groqKeyInput.value.trim() : '';
        if (groqApiKey) {
            window._groqApiKey = groqApiKey;
        }
        
        const modelSelect = document.getElementById('profile-openrouter-model');
        const openrouterModel = modelSelect ? modelSelect.value : 'auto';
        window._openrouterModel = openrouterModel;
        
        const customInput = document.getElementById('profile-openrouter-custom-model');
        const openrouterCustomModel = customInput ? customInput.value.trim() : '';
        window._openrouterCustomModel = openrouterCustomModel;
        
        // Update user document in Firestore
        const updatePayload = {
            name: name,
            photoURL: selectedAvatarSrc,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            openrouterModel: openrouterModel,
            openrouterCustomModel: openrouterCustomModel
        };
        if (openrouterApiKey !== undefined) updatePayload.openrouterApiKey = openrouterApiKey;
        if (groqApiKey !== undefined) updatePayload.groqApiKey = groqApiKey;
        
        await db.collection('users').doc(auth.currentUser.uid).set(updatePayload, { merge: true });
        if (selectedAvatarSrc && auth.currentUser) {
            localStorage.setItem('user_avatar_' + auth.currentUser.uid, selectedAvatarSrc);
        }
        
        // Sync to shared global config so all users can use it as a fallback
        try {
            const sharedPayload = {};
            if (openrouterApiKey) sharedPayload.openrouterApiKey = openrouterApiKey;
            if (groqApiKey) sharedPayload.groqApiKey = groqApiKey;
            if (openrouterModel) sharedPayload.openrouterModel = openrouterModel;
            if (openrouterCustomModel) sharedPayload.openrouterCustomModel = openrouterCustomModel;
            
            if (Object.keys(sharedPayload).length > 0) {
                sharedPayload.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('settings').doc('ai_keys').set(sharedPayload, { merge: true });
                console.log('Synced AI keys globally for all users.');
            }
        } catch (sharedErr) {
            console.warn('Could not sync AI keys globally (might be a permission issue):', sharedErr);
        }
        
        // Reinitialize chatbot if key was just added
        if (openrouterApiKey || groqApiKey) {
            initAIChatbot();
            updateAIProviderBadge();
        } else {
            updateAIProviderBadge();
        }
        
        // Update UI
        loadUserData();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
        modal.hide();
        
        showAlert('Profile updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert('Error updating profile', 'danger');
    } finally {
        document.getElementById('save-profile-btn').disabled = false;
        document.getElementById('save-profile-btn').innerHTML = 'Save Changes';
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

async function loadCustomCategories() {
    try {
        const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            customCategories = userData.customCategories || [];
        }
    } catch (error) {
        console.error('Error loading custom categories:', error);
        customCategories = [];
    }
}

async function handleAvatarUpload(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        if (typeof showAlert === 'function') showAlert('Please select a valid image file', 'warning');
        return;
    }
    
    const profileAvatar = document.getElementById('profile-avatar');
    const settings = typeof getImageKitSettings === 'function' ? getImageKitSettings() : null;
    let uploadedUrl = '';
    
    try {
        if (typeof showToast === 'function') showToast('Uploading profile photo...', 'info');
        else if (typeof showAlert === 'function') showAlert('Uploading profile photo...', 'info');
        
        // 1. Try ImageKit Direct CDN Upload if active
        if (settings && settings.urlEndpoint && settings.publicKey && settings.privateKey && typeof uploadToImageKit === 'function') {
            const fileName = `profile_${auth.currentUser?.uid || 'user'}_${Date.now()}_${file.name}`;
            const ikRes = await uploadToImageKit(file, fileName, settings);
            if (ikRes && ikRes.url) {
                uploadedUrl = ikRes.url;
                if (typeof showToast === 'function') showToast('Profile photo uploaded via ImageKit CDN!', 'success');
                else if (typeof showAlert === 'function') showAlert('Profile photo uploaded via ImageKit CDN!', 'success');
            }
        }
        
        // 2. Fallback to client-side JPEG compression
        if (!uploadedUrl) {
            uploadedUrl = await compressImageToDataUrl(file, 400, 0.8);
            if (typeof showToast === 'function') showToast('Photo processed! Click Save Changes to save your profile.', 'info');
            else if (typeof showAlert === 'function') showAlert('Photo processed! Click Save Changes to save your profile.', 'info');
        }
        
        if (uploadedUrl && profileAvatar) {
            profileAvatar.src = uploadedUrl;
            
            // Persist immediately in localStorage & Firestore so it never disappears on hard refresh!
            if (auth.currentUser) {
                localStorage.setItem('user_avatar_' + auth.currentUser.uid, uploadedUrl);
                try {
                    await db.collection('users').doc(auth.currentUser.uid).set({
                        photoURL: uploadedUrl,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                } catch (dbErr) {
                    console.warn('Could not auto-save avatar to Firestore:', dbErr);
                }
            }
            
            // Clear default eco avatar selections
            const container = document.getElementById('avatar-choices-container');
            if (container) {
                container.querySelectorAll('.avatar-option').forEach(opt => opt.style.borderColor = 'transparent');
            }
            
            // Update navbar avatar live!
            const navAvatar = document.getElementById('user-avatar');
            if (navAvatar) navAvatar.src = uploadedUrl;
        }
    } catch (err) {
        console.error('Error uploading profile picture:', err);
        if (typeof showAlert === 'function') showAlert('Failed to process profile image', 'danger');
    }
}

async function leaveAllTrips() {
    if (!confirm('Are you sure you want to leave all trips? This action cannot be undone.')) {
        return;
    }
    
    try {
        document.getElementById('leave-all-trips-btn').disabled = true;
        document.getElementById('leave-all-trips-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Leaving...';
        
        // Remove user from all trips
        const batch = db.batch();
        
        for (const trip of userTrips) {
            if (trip.createdBy !== auth.currentUser.uid) {
                const tripRef = db.collection('trips').doc(trip.id);
                batch.update(tripRef, {
                    members: firebase.firestore.FieldValue.arrayRemove(auth.currentUser.uid),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        await batch.commit();
        
        // Reload trips
        await loadUserTrips();
        
        showAlert('Left all trips successfully!', 'success');
        
    } catch (error) {
        console.error('Error leaving all trips:', error);
        showAlert('Error leaving trips', 'danger');
    } finally {
        document.getElementById('leave-all-trips-btn').disabled = false;
        document.getElementById('leave-all-trips-btn').innerHTML = '<i class="fas fa-sign-out-alt me-1"></i>Leave All Trips';
    }
}

function initializeApp() {
    const today = new Date().toISOString().split('T')[0];
    const sDate = document.getElementById('start-date');
    const eDate = document.getElementById('end-date');
    const esDate = document.getElementById('edit-start-date');
    const eeDate = document.getElementById('edit-end-date');
    
    if (sDate) sDate.min = today;
    if (eDate) eDate.min = today;
    if (esDate) esDate.min = today;
    if (eeDate) eeDate.min = today;
}

function checkAuthState() {
    showLoadingOverlay();
    
    // Set a timeout as fallback (5 seconds)
    const authTimeout = setTimeout(() => {
        console.warn('Auth check timeout, showing public dashboard');
        showPublicDashboard();
        updateNavigationBasedOnAuth(false);
        hideLoadingOverlay();
    }, 5000);
    
    auth.onAuthStateChanged(async (user) => {
        // Clear the timeout since we got a response
        clearTimeout(authTimeout);
        
        if (user) {
            console.log('User is logged in');
            currentUser = user;
            
            try {
                await Promise.all([
                    loadUserData(),
                    loadCustomCategories(),
                    loadUserTrips()
                ]);
                showPrivateDashboard();
                updateNavigationBasedOnAuth(true);
                
                // Initialize AI chatbot (shown only for logged-in users)
                initAIChatbot();
                
                // Show welcome back message if this is a login
                if (sessionStorage.getItem('justLoggedIn')) {
                    showToast(`Welcome back, ${user.displayName || 'Traveler'}!`, 'success');
                    sessionStorage.removeItem('justLoggedIn');
                }
                
            } catch (error) {
                console.error('Error loading user data:', error);
                showPublicDashboard();
                updateNavigationBasedOnAuth(false);
            }
        } else {
            console.log('User is not logged in, showing public dashboard');
            showPublicDashboard();
            updateNavigationBasedOnAuth(false);
            currentUser = null;
            userTrips = [];
        }
        
        hideLoadingOverlay();
    }, (error) => {
        clearTimeout(authTimeout);
        console.error('Auth state error:', error);
        showPublicDashboard();
        updateNavigationBasedOnAuth(false);
        hideLoadingOverlay();
    });
}

function showLoadingOverlay() {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        // Create loading overlay if it doesn't exist
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="premium-loader">
                    <div class="loader-ring"></div>
                    <div class="travel-icons-cycle">
                        <i class="fas fa-plane travel-icon-item"></i>
                        <i class="fas fa-train travel-icon-item"></i>
                        <i class="fas fa-car travel-icon-item"></i>
                    </div>
                </div>
                <p class="loading-text">Planning your journey...</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.style.display = 'none';
    }
}

async function loadUserData() {
    if (!currentUser) return;
    
    // Only update these elements if they exist (private dashboard)
    const userNameElement = document.getElementById('user-name');
    const userAvatarElement = document.getElementById('user-avatar');
    
    if (userNameElement) {
        userNameElement.textContent = currentUser.displayName || 'Traveler';
    }
    
    // Retrieve avatar from Firebase Auth or Firestore user document
    let avatarUrl = currentUser.photoURL;
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists && userDoc.data().photoURL) {
            avatarUrl = userDoc.data().photoURL;
        }
    } catch (e) {}

    if (userAvatarElement) {
        userAvatarElement.src = getSafeAvatarUrl(avatarUrl, currentUser.displayName || 'Traveler');
        setupAvatarFallback(userAvatarElement, currentUser.displayName || 'Traveler');
    }
}

async function loadUserTrips() {
    try {
        showLoadingState(true);
        
        const tripsSnapshot = await db.collection('trips')
            .where('members', 'array-contains', currentUser.uid)
            .get();
        
        userTrips = [];
        tripsSnapshot.forEach(doc => {
            const tripData = doc.data();
            userTrips.push({
                id: doc.id,
                ...tripData
            });
        });
        
        userTrips.sort((a, b) => {
            const dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
            const dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
            return dateB - dateA;
        });
        
        // Expose to window so utils.js and the AI chatbot can access it
        window.userTrips = userTrips;
        
        displayTrips();
        updateDashboardStats();
        
    } catch (error) {
        console.error('Error loading trips:', error);
        showError('Failed to load trips. Please refresh the page.');
    } finally {
        showLoadingState(false);
    }
}

async function loadRecentCalculations() {
    const recentCalculationsList = document.getElementById('recent-calculations-list');
    
    try {
        // Load from localStorage (you can modify this to use Firestore)
        const templates = JSON.parse(localStorage.getItem('carCalculationTemplates') || '[]');
        const recentCalculations = templates.slice(-3).reverse(); // Show last 3 calculations
        
        if (recentCalculations.length === 0) {
            recentCalculationsList.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="fas fa-calculator fa-2x mb-3"></i>
                    <p>No recent calculations</p>
                    <a href="car-calculations.html" class="btn btn-primary btn-sm">
                        <i class="fas fa-calculator me-1"></i>Create Calculation
                    </a>
                </div>
            `;
            return;
        }
        
        recentCalculationsList.innerHTML = recentCalculations.map(calc => {
            const date = new Date(calc.timestamp).toLocaleDateString();
            
            return `
                <div class="card mb-2">
                    <div class="card-body py-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${calc.vehicleType === 'rental' ? 'Rental Car' : 'Self Owned'} Calculation</h6>
                                <small class="text-muted">
                                    <i class="fas fa-route me-1"></i>${calc.tripDistance} km
                                </small>
                                <br>
                                <small class="text-muted">
                                    <i class="fas fa-gas-pump me-1"></i>${calc.fuelConsumed} L
                                </small>
                            </div>
                            <div class="text-end">
                                <h6 class="text-success mb-0"><span class="rupee-symbol">₹</span>${calc.totalCost.toFixed(2)}</h6>
                                <small class="text-muted">${date}</small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading recent calculations:', error);
        recentCalculationsList.innerHTML = `
            <div class="text-center text-muted py-3">
                <p>Error loading calculations</p>
            </div>
        `;
    }
}



// In dashboard.js, update the statistics section to be more descriptive
function updateDashboardStats() {
    const totalTrips = userTrips.length;
    const today = new Date();

    // Count active trips
    const activeTrips = userTrips.filter(trip => {
        const startDate = new Date(trip.startDate);
        const endDate = new Date(trip.endDate);
        return startDate <= today && endDate >= today;
    }).length;

    // Count upcoming and completed trips
    const upcomingTrips = userTrips.filter(trip => new Date(trip.startDate) > today).length;
    const completedTrips = userTrips.filter(trip => new Date(trip.endDate) < today).length;

    // Update DOM elements
    document.getElementById('total-trips-count').textContent = totalTrips;
    document.getElementById('active-trips-count').textContent = activeTrips;
    document.getElementById('total-spent-amount').textContent = upcomingTrips;
    document.getElementById('car-expenses-amount').textContent = completedTrips;

    // Calculate Eco Metrics
    let totalEmitted = 0;
    let totalSaved = 0;
    let hasRouteData = false;

    userTrips.forEach(trip => {
        if (trip.route && trip.route.distance) {
            hasRouteData = true;
            const carbon = calculateTripCarbon(trip);
            totalEmitted += carbon.emissions;
            totalSaved += carbon.saved;
        }
    });

    const ecoCard = document.getElementById('dashboard-eco-card');
    if (ecoCard) {
        if (hasRouteData && totalTrips > 0) {
            ecoCard.style.display = 'block';
            document.getElementById('dashboard-co2-emitted').textContent = `${totalEmitted.toFixed(1)} kg`;
            document.getElementById('dashboard-co2-saved').textContent = `${totalSaved.toFixed(1)} kg`;
        } else {
            ecoCard.style.display = 'none';
        }
    }
}

function showLoadingState(show) {
    const tripsContainer = document.getElementById('trips-container');
    const emptyTrips = document.getElementById('empty-trips');
    
    if (show && tripsContainer) {
        tripsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Loading your trips...</p>
            </div>
        `;
        if (emptyTrips) emptyTrips.classList.add('d-none');
    }
}

function showError(message) {
    const tripsContainer = document.getElementById('trips-container');
    if (!tripsContainer) return;
    tripsContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger d-flex align-items-center" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <div>
                    <strong>Error loading trips</strong>
                    <div class="small">${message}</div>
                </div>
            </div>
            <div class="text-center mt-3">
                <button class="btn btn-primary" onclick="loadUserTrips()">
                    <i class="fas fa-sync-alt me-1"></i> Try Again
                </button>
            </div>
        </div>
    `;
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Separate trips into Active/Upcoming and Completed
    const activeTrips = userTrips.filter(trip => {
        const endDate = new Date(trip.endDate);
        return endDate >= today;
    });

    const completedTrips = userTrips.filter(trip => {
        const endDate = new Date(trip.endDate);
        return endDate < today;
    });

    // Render Active/Upcoming Trips
    if (activeTrips.length > 0) {
        activeTrips.forEach(trip => {
            const tripCard = createTripCard(trip);
            tripsContainer.appendChild(tripCard);
        });
    } else if (completedTrips.length > 0) {
        const noActiveMsg = document.createElement('div');
        noActiveMsg.className = 'col-12 mb-4 text-center text-muted py-4 bg-white rounded shadow-sm';
        noActiveMsg.innerHTML = '<i class="fas fa-plane-departure fa-2x mb-3 text-secondary"></i><p class="mb-0">No upcoming trips. Plan your next adventure!</p>';
        tripsContainer.appendChild(noActiveMsg);
    }

    // Render Completed Trips Section (Hidden by default)
    if (completedTrips.length > 0) {
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'col-12 text-center my-4';
        toggleContainer.innerHTML = `
            <button class="btn btn-light rounded-pill px-4 shadow-sm fw-bold text-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#completedTripsSection">
                <i class="fas fa-history me-2"></i>View Completed Trips (${completedTrips.length})
            </button>
        `;
        tripsContainer.appendChild(toggleContainer);

        const completedSection = document.createElement('div');
        completedSection.className = 'col-12 collapse';
        completedSection.id = 'completedTripsSection';
        
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';

        completedTrips.forEach(trip => {
            const tripCard = createTripCard(trip);
            tripCard.querySelector('.card').classList.add('opacity-75'); // Visual cue for completed
            rowDiv.appendChild(tripCard);
        });

        completedSection.appendChild(rowDiv);
        tripsContainer.appendChild(completedSection);
     }
     
     // Update Live journey progress animation tracker
     updateDashboardActiveTripTracker();
}

let slideshowInterval = null;
let currentSlideIndex = 0;

function updateDashboardActiveTripTracker() {
    const card = document.getElementById('dashboard-active-trip-tracker');
    const mapElement = document.getElementById('dashboard-tracker-map');
    const statusText = document.getElementById('dashboard-tracker-status');
    const startText = document.getElementById('dashboard-tracker-start');
    const currentText = document.getElementById('dashboard-tracker-current');
    const destText = document.getElementById('dashboard-tracker-dest');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find active trip
    const activeTrip = userTrips.find(trip => {
        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return today >= start && today <= end;
    });
    
    // Render Active Trip Hero Slideshow
    renderActiveTripHeroSlideshow(activeTrip);
    
    if (!card || !mapElement || !statusText || !startText || !destText) return;
    
    if (!activeTrip) {
        card.style.display = 'none';
        return;
    }
    
    // Trigger background route calculation if stopsDistances is missing
    const hasAiKey = !!window._openrouterApiKey;
    const needsCalc = activeTrip.stops && activeTrip.stops.length > 0 && (
        !activeTrip.route ||
        !activeTrip.route.stopsDistances ||
        (hasAiKey && !activeTrip.route.aiEnhanced)
    );
    if (needsCalc) {
        calculateAndSaveStopsDistances(activeTrip);
    }
    
    // Set Locations text
    startText.textContent = activeTrip.startLocation || 'Start';
    destText.textContent = activeTrip.destination || 'Destination';
    if (currentText) {
        currentText.innerHTML = activeTrip.currentLocationName ? `<i class="fas fa-location-dot me-1"></i>${activeTrip.currentLocationName}` : '';
    }
    
    // Parse Dates
    const startDate = new Date(activeTrip.startDate);
    const endDate = new Date(activeTrip.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    // Determine vehicle icon and color based on transportMode
    const mode = (activeTrip.transportMode || 'car').toLowerCase().trim();
    let vehicleIcon = 'fas fa-car text-success';
    let transportDesc = 'Car';
    
    switch(mode) {
        case 'flight':
            vehicleIcon = 'fas fa-plane text-info';
            transportDesc = 'Flight';
            break;
        case 'train':
            vehicleIcon = 'fas fa-train text-primary';
            transportDesc = 'Train';
            break;
        case 'bus':
            vehicleIcon = 'fas fa-bus text-warning';
            transportDesc = 'Bus';
            break;
        case 'public':
            vehicleIcon = 'fas fa-train-subway text-success';
            transportDesc = 'Public Transport';
            break;
    }
    
    // Calculate progress percentage
    const totalDistance = parseFloat(activeTrip.route?.distance) || parseFloat(activeTrip.distance) || 0;
    let progressPercent = 0;
    let progressText = '';
    
    if (totalDistance > 0) {
        if (activeTrip.currentKm !== undefined && activeTrip.currentKm >= 0) {
            progressPercent = Math.min(100, (activeTrip.currentKm / totalDistance) * 100);
            progressText = `: ${activeTrip.currentKm} / ${totalDistance.toFixed(0)} km completed`;
        } else {
            const totalTime = endDate.getTime() - startDate.getTime();
            const elapsedTime = today.getTime() - startDate.getTime();
            progressPercent = Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));
            const estDistance = (totalDistance * (progressPercent / 100)).toFixed(0);
            progressText = `: ~${estDistance} / ${totalDistance.toFixed(0)} km completed`;
        }
    } else {
        progressPercent = activeTrip.currentKm !== undefined ? Math.min(100, activeTrip.currentKm) : 0;
        if (activeTrip.currentKm !== undefined) {
            progressText = `: ${progressPercent.toFixed(0)}% completed`;
        } else {
            const totalTime = endDate.getTime() - startDate.getTime();
            const elapsedTime = today.getTime() - startDate.getTime();
            progressPercent = Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));
            progressText = `: ~${progressPercent.toFixed(0)}% completed (estimated)`;
        }
    }
    
    const currentKm = activeTrip.currentKm || 0;
    const nextStopStatus = getNextStopStatus(activeTrip, currentKm, totalDistance);
    const nextStopHtml = nextStopStatus ? `<span class="badge bg-primary-subtle text-primary ms-2 animate-bounce-subtle"><i class="fas fa-location-arrow me-1 text-primary"></i>${nextStopStatus}</span>` : '';
    const aiEnhancedBadge = activeTrip.route?.aiEnhanced
        ? `<span class="badge ms-2" style="background: linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; font-size:0.65rem;"><i class="fas fa-robot me-1"></i>AI Enhanced</span>`
        : (window._openrouterApiKey ? `<span class="badge bg-secondary-subtle text-secondary ms-2" style="font-size:0.65rem;"><i class="fas fa-robot me-1"></i>AI Calculating...</span>` : '');

    statusText.innerHTML = `
        <span class="badge bg-success-subtle text-success animate-pulse-slow">Active Journey${progressText} (${transportDesc})</span>
        ${nextStopHtml}
        ${aiEnhancedBadge}
        <button class="btn btn-outline-success py-0 px-2 ms-2 border-0" style="font-size: 0.75rem; border-radius: 12px; background-color: rgba(45, 106, 79, 0.08);" id="update-dashboard-progress" data-trip-id="${activeTrip.id}" data-total-dist="${totalDistance}">
            <i class="fas fa-edit me-1"></i>Update Progress
        </button>
        ${'geolocation' in navigator ? `
        <button class="btn btn-outline-primary py-0 px-2 ms-1 border-0" style="font-size: 0.75rem; border-radius: 12px; background-color: rgba(33, 158, 188, 0.08);" id="auto-track-dashboard-btn" data-trip-id="${activeTrip.id}">
            <i class="fas fa-location-crosshairs me-1 text-info"></i>${activeTrip.route?.aiEnhanced ? 'AI+GPS Track' : 'Auto-Track GPS'}
        </button>
        ` : ''}
    `;
    
    card.style.display = 'block';
    
    if (activeTripTrackerTimeout) {
        clearTimeout(activeTripTrackerTimeout);
    }
    
    activeTripTrackerTimeout = setTimeout(async () => {
        // Initialize or resize Leaflet Map
        if (!dashboardTrackerMap) {
            const streetTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            });
            
            const satelliteTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USDA, USGS, and the GIS User Community'
            });
            
            const terrainTiles = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)'
            });
            
            dashboardTrackerMap = L.map('dashboard-tracker-map', {
                center: [20, 78],
                zoom: 5,
                layers: [streetTiles]
            });
            
            const baseMaps = {
                "Streets": streetTiles,
                "Satellite": satelliteTiles,
                "Terrain": terrainTiles
            };
            
            L.control.layers(baseMaps).addTo(dashboardTrackerMap);
            
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
            dashboardTrackerMap.addControl(new LiveButtonControl());
        } else {
            dashboardTrackerMap.invalidateSize();
        }
        
        // Clear old map layers
        dashboardTrackerMap.eachLayer((layer) => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                dashboardTrackerMap.removeLayer(layer);
            }
        });
        
        const pathCoordinates = [];
        
        // Helper to add custom icon markers to Leaflet
        const addTrackerMarker = async (name, title, iconClass, isRoute = true) => {
            try {
                const coords = await geocodeLocation(name);
                const latLng = [coords[1], coords[0]];
                
                const customIcon = L.divIcon({
                    html: `<div class="d-flex align-items-center justify-content-center bg-white rounded-circle shadow-sm" style="width: 28px; height: 28px; border: 2px solid #2d6a4f;"><i class="${iconClass}"></i></div>`,
                    className: 'custom-tracker-icon',
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                });
                
                L.marker(latLng, { icon: customIcon }).addTo(dashboardTrackerMap).bindPopup(`<b>${title}:</b> ${name}`);
                
                if (isRoute) {
                    pathCoordinates.push(latLng);
                }
                return latLng;
            } catch (e) {
                console.warn(`Could not geocode tracker marker: ${name}`);
                return null;
            }
        };
        
        // Load markers asynchronously and draw path
        const loadTrackerMapData = async () => {
            const startLatLng = await addTrackerMarker(activeTrip.startLocation, 'Start Point', 'fas fa-circle-play text-success', true);
            
            const outboundStops = [];
            const returnStops = [];
            if (activeTrip.stops && Array.isArray(activeTrip.stops)) {
                activeTrip.stops.forEach((stop, index) => {
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
                await addTrackerMarker(s.name, `Stop #${s.originalIndex + 1}`, 'fas fa-location-dot text-success', true);
            }
            
            const destLatLng = await addTrackerMarker(activeTrip.destination, 'Destination', 'fas fa-flag-checkered text-danger', true);
            
            // Render Return Stops
            for (let i = 0; i < returnStops.length; i++) {
                const s = returnStops[i];
                await addTrackerMarker(s.name, `Return Stop #${s.originalIndex + 1}`, 'fas fa-location-dot text-info', true);
            }
            
            // Return back to Start
            if (returnStops.length > 0) {
                await addTrackerMarker(activeTrip.startLocation, 'Return Point', 'fas fa-undo text-success', true);
            }
            
            // Render Vehicle Marker
            let vehicleLatLng = null;
            if (activeTrip.currentLocationName) {
                vehicleLatLng = await addTrackerMarker(activeTrip.currentLocationName, 'Vehicle Position', `${vehicleIcon} animate-bounce-subtle`, false);
            } else if (startLatLng) {
                // Draw vehicle marker at start location so it's always shown
                const customIcon = L.divIcon({
                    html: `<div class="d-flex align-items-center justify-content-center bg-white rounded-circle shadow-sm animate-pulse-slow" style="width: 32px; height: 32px; border: 2.5px solid #e65100; z-index: 999;"><i class="${vehicleIcon}" style="font-size: 1.15rem;"></i></div>`,
                    className: 'custom-tracker-vehicle',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });
                L.marker(startLatLng, { icon: customIcon }).addTo(dashboardTrackerMap).bindPopup(`<b>Vehicle Position (Start):</b> ${activeTrip.startLocation}`);
                vehicleLatLng = startLatLng;
            }
            
            let routeCoords = null;
            if (mode !== 'flight' && mode !== 'train') {
                routeCoords = await fetchRouteGeometryCoords(activeTrip.startLocation, activeTrip.destination, activeTrip.stops);
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
                    }).addTo(dashboardTrackerMap);
                    
                    const dashes = L.polyline(finalCoords, {
                        color: '#ffffff',
                        weight: 4,
                        opacity: 1,
                        dashArray: '8, 8',
                        lineJoin: 'round'
                    }).addTo(dashboardTrackerMap);
                    
                    dashboardTrackerMap.fitBounds(dashes.getBounds().pad(0.15));
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
                    const flightLine = L.polyline(curvedCoords, {
                        color: '#6366f1',
                        weight: 3.5,
                        opacity: 0.85,
                        dashArray: '6, 8',
                        lineJoin: 'round'
                    }).addTo(dashboardTrackerMap);
                    
                    dashboardTrackerMap.fitBounds(flightLine.getBounds().pad(0.15));
                } else {
                    // Road transport: solid dark green highway
                    L.polyline(finalCoords, {
                        color: '#1b4332',
                        weight: 6,
                        opacity: 0.4,
                        lineJoin: 'round'
                    }).addTo(dashboardTrackerMap);
                    
                    const roadLine = L.polyline(finalCoords, {
                        color: '#2d6a4f',
                        weight: 4,
                        opacity: 0.9,
                        lineJoin: 'round'
                    }).addTo(dashboardTrackerMap);
                    
                    dashboardTrackerMap.fitBounds(roadLine.getBounds().pad(0.15));
                }
            } else if (finalCoords.length === 1) {
                dashboardTrackerMap.setView(finalCoords[0], 11);
            }
        };
        
        await loadTrackerMapData();
    }, 150);
    
    // Wire up prompt and GPS handlers
    setTimeout(() => {
        const autoTrackBtn = document.getElementById('auto-track-dashboard-btn');
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
                        let startCoords = activeTrip.route?.coordinates?.start;
                        let destCoords = activeTrip.route?.coordinates?.destination;
                        
                        if (!startCoords || !destCoords) {
                            startCoords = await geocodeLocation(activeTrip.startLocation);
                            destCoords = await geocodeLocation(activeTrip.destination);
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
                        const segments = getRouteSegments(activeTrip, totalDistance);
                        if (segments.length > 0 && totalDistance > 0 && activeTrip.route?.aiEnhanced) {
                            const placeSequence = resolveRouteMetadata(activeTrip.startLocation, activeTrip.destination, activeTrip.stops);
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
                        
                        await db.collection('trips').doc(activeTrip.id).update({
                            currentKm: currentKm,
                            currentLocationName: currentLocationName
                        });
                        
                        activeTrip.currentKm = currentKm;
                        activeTrip.currentLocationName = currentLocationName;
                        displayTrips();
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
        const updateBtn = document.getElementById('update-dashboard-progress');
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
                
                const currentKmStr = prompt(promptMsg, activeTrip.currentKm || '0');
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
                        activeTrip.currentKm = currentKm;
                        displayTrips();
                        showAlert('Journey progress updated!', 'success');
                    } catch (error) {
                        console.error('Error updating progress:', error);
                        showAlert('Failed to update progress.', 'danger');
                    }
                }
            });
        }
    }, 50);
}

// =========================================================================
// ACTIVE TRIP HERO SLIDESHOW & PHOTO UPLOAD ENGINE
// =========================================================================

function renderActiveTripHeroSlideshow(activeTrip) {
    const carouselInner  = document.getElementById('hero-carousel-inner');
    const carouselIndicators = document.getElementById('hero-carousel-indicators');
    const uploadOverlay  = document.getElementById('hero-upload-overlay');

    // --- Default slides (shown when no active trip) ---
    const defaultSlides = [
        { img: 'https://images.unsplash.com/photo-1548013146-72479768bada?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', title: 'Spiritual Journeys', sub: 'Find peace in devotional trips' },
        { img: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', title: 'Adventure Awaits', sub: 'Challenge yourself with thrilling experiences' },
        { img: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', title: 'Wild Safari', sub: 'Explore nature and wildlife' },
        { img: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', title: 'Party in Goa & Bangkok', sub: 'Experience the best nightlife' },
        { img: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', title: 'Local Road Trips', sub: 'Discover hidden gems nearby' }
    ];

    if (!activeTrip) {
        // Restore default slides
        if (carouselInner) {
            carouselInner.innerHTML = defaultSlides.map((s, i) => `
                <div class="carousel-item ${i === 0 ? 'active' : ''}" data-bs-interval="4000">
                    <div class="hero-slide-img" style="background-image: url('${s.img}');"></div>
                    <div class="hero-overlay p-4 d-flex align-items-end">
                        <div class="text-white text-shadow">
                            <h3 class="fw-bold mb-1">${s.title}</h3>
                            <p class="mb-0 d-none d-md-block">${s.sub}</p>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        if (carouselIndicators) {
            carouselIndicators.innerHTML = defaultSlides.map((_, i) => `
                <button type="button" data-bs-target="#dashboardHeroCarousel" data-bs-slide-to="${i}" ${i === 0 ? 'class="active"' : ''}></button>
            `).join('');
        }
        if (uploadOverlay) uploadOverlay.style.display = 'none';
        return;
    }

    // --- Active trip: use uploaded images or show a "no photos" prompt slide ---
    const uploadedImages = (activeTrip.images && Array.isArray(activeTrip.images))
        ? activeTrip.images.filter(img => typeof img === 'string' && img.trim().length > 0)
        : [];

    const tripName = activeTrip.name || 'Your Active Trip';
    const sDate = new Date(activeTrip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const eDate = new Date(activeTrip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    let slidesHtml = '';
    let indicatorsHtml = '';

    if (uploadedImages.length > 0) {
        // Show uploaded images in carousel — each photo is a slide
        slidesHtml = uploadedImages.map((url, i) => `
            <div class="carousel-item ${i === 0 ? 'active' : ''}" data-bs-interval="4000">
                <div class="hero-slide-img" style="background-image: url('${url}');"></div>
                <div class="hero-overlay p-4 d-flex align-items-end">
                    <div class="text-white text-shadow">
                        <h3 class="fw-bold mb-1">🚀 ${tripName}</h3>
                        <p class="mb-0 d-none d-md-block">
                            <i class="fas fa-location-dot me-1 text-warning"></i>${activeTrip.startLocation} → ${activeTrip.destination}
                            &nbsp;·&nbsp;
                            <i class="far fa-calendar-alt me-1"></i>${sDate} – ${eDate}
                        </p>
                    </div>
                </div>
            </div>
        `).join('');
        indicatorsHtml = uploadedImages.map((_, i) => `
            <button type="button" data-bs-target="#dashboardHeroCarousel" data-bs-slide-to="${i}" ${i === 0 ? 'class="active"' : ''}></button>
        `).join('');
    } else {
        // No images uploaded yet — show one prompt slide with a nice overlay
        slidesHtml = defaultSlides.map((s, i) => `
            <div class="carousel-item ${i === 0 ? 'active' : ''}" data-bs-interval="4000">
                <div class="hero-slide-img" style="background-image: url('${s.img}');"></div>
                <div class="hero-overlay p-4 d-flex align-items-end">
                    <div class="text-white text-shadow">
                        <h3 class="fw-bold mb-1">🚀 ${tripName}</h3>
                        <p class="mb-0 d-none d-md-block">
                            <i class="fas fa-location-dot me-1 text-warning"></i>${activeTrip.startLocation} → ${activeTrip.destination}
                            &nbsp;·&nbsp;
                            <i class="far fa-calendar-alt me-1"></i>${sDate} – ${eDate}
                        </p>
                    </div>
                </div>
            </div>
        `).join('');
        indicatorsHtml = defaultSlides.map((_, i) => `
            <button type="button" data-bs-target="#dashboardHeroCarousel" data-bs-slide-to="${i}" ${i === 0 ? 'class="active"' : ''}></button>
        `).join('');
    }

    if (carouselInner) carouselInner.innerHTML = slidesHtml;
    if (carouselIndicators) carouselIndicators.innerHTML = indicatorsHtml;

    // Show/update the upload overlay button on top of the carousel
    if (uploadOverlay) {
        uploadOverlay.style.display = 'block';
        const btn = document.getElementById('add-slideshow-photo-btn');
        const statusSpan = document.getElementById('hero-upload-status');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-camera me-1"></i> Add Trip Photos';
            btn.disabled = false;
        }
        if (statusSpan) {
            const count = uploadedImages.length;
            statusSpan.style.display = count > 0 ? 'inline-block' : 'none';
            statusSpan.textContent = count > 0 ? `${count} photo${count > 1 ? 's' : ''} in slideshow` : '';
        }
    }
}


async function deleteActiveTripPhoto(photoIndex) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeTrip = userTrips.find(trip => {
        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return today >= start && today <= end;
    });

    if (!activeTrip || !activeTrip.images) return;
    if (!confirm(`Remove photo ${photoIndex + 1} from your trip slideshow?`)) return;

    activeTrip.images.splice(photoIndex, 1);

    try {
        await db.collection('trips').doc(activeTrip.id).update({
            images: activeTrip.images,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        const idx = userTrips.findIndex(t => t.id === activeTrip.id);
        if (idx !== -1) userTrips[idx].images = activeTrip.images;
        window.userTrips = userTrips;
        if (typeof showToast === 'function') showToast('Photo removed from slideshow.', 'info');
        currentSlideIndex = 0;
        renderActiveTripHeroSlideshow(activeTrip);
    } catch (e) {
        console.error('Error removing photo:', e);
        if (typeof showToast === 'function') showToast('Failed to remove photo.', 'danger');
    }
}

// updateSlideshowDOM is no longer needed — Bootstrap carousel handles slide transitions
// It's kept as a no-op stub to avoid breaking any lingering calls
function updateSlideshowDOM() {}


// Function to handle photo uploads from Create & Edit modals
async function handleTripPhotoUpload(event, isEdit = false) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    const previewContainer = document.getElementById(isEdit ? 'edit-trip-image-previews' : 'trip-image-previews');
    const targetArrayKey = isEdit ? '_pendingEditTripImages' : '_pendingTripImages';
    window[targetArrayKey] = window[targetArrayKey] || [];
    
    const settings = typeof getImageKitSettings === 'function' ? getImageKitSettings() : null;
    
    for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        
        try {
            let finalUrl = '';
            
            // 1. Try ImageKit Upload if configured
            if (settings && settings.urlEndpoint && settings.publicKey && settings.privateKey && typeof uploadToImageKit === 'function') {
                if (typeof showToast === 'function') showToast('Uploading photo to ImageKit...', 'info');
                const ikRes = await uploadToImageKit(file, `trip_cover_${Date.now()}_${file.name}`, settings);
                if (ikRes && ikRes.url) {
                    finalUrl = ikRes.url;
                }
            }
            
            // 2. Fallback to resized compressed Data URL
            if (!finalUrl) {
                finalUrl = await compressImageToDataUrl(file, 900, 0.75);
            }
            
            if (finalUrl) {
                window[targetArrayKey].push(finalUrl);
                renderTripImagePreviews(previewContainer, window[targetArrayKey], isEdit);
            }
        } catch (e) {
            console.error('Error processing trip photo upload:', e);
            if (typeof showToast === 'function') showToast('Failed to process image file', 'warning');
        }
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

function renderTripImagePreviews(container, imagesArray, isEdit = false) {
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

function removeTripImagePreview(idx, isEdit) {
    const key = isEdit ? '_pendingEditTripImages' : '_pendingTripImages';
    if (window[key]) {
        window[key].splice(idx, 1);
        const container = document.getElementById(isEdit ? 'edit-trip-image-previews' : 'trip-image-previews');
        renderTripImagePreviews(container, window[key], isEdit);
    }
}

async function handleQuickActiveTripPhotoUpload(event) {
    const files = Array.from(event.target.files);
    // Reset input so same file can be re-selected
    event.target.value = '';
    if (files.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeTrip = userTrips.find(trip => {
        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return today >= start && today <= end;
    });

    if (!activeTrip) {
        if (typeof showToast === 'function') showToast('No active trip found to add photos to!', 'warning');
        return;
    }

    activeTrip.images = activeTrip.images || [];

    const settings = typeof getImageKitSettings === 'function' ? getImageKitSettings() : null;
    const useImageKit = settings && settings.urlEndpoint && settings.publicKey && settings.privateKey && typeof uploadToImageKit === 'function';

    // Show upload progress in the button
    const addBtn = document.getElementById('add-slideshow-photo-btn');
    const statusSpan = document.getElementById('hero-upload-status');
    if (addBtn) {
        addBtn.disabled = true;
        addBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Uploading...';
    }

    const validFiles = files.filter(f => f.type.startsWith('image/'));
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        // Update status span with live progress
        if (statusSpan) {
            statusSpan.style.display = 'inline-block';
            statusSpan.textContent = `Uploading ${i + 1} / ${validFiles.length}...`;
        }

        try {
            let finalUrl = '';

            if (useImageKit) {
                const fileName = `trip_${activeTrip.id}_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                const ikRes = await uploadToImageKit(file, fileName, settings);
                if (ikRes && ikRes.url) {
                    finalUrl = ikRes.url;
                }
            }

            // Fallback: compressed data URL
            if (!finalUrl) {
                finalUrl = await compressImageToDataUrl(file, 900, 0.78);
            }

            if (finalUrl) {
                activeTrip.images.push(finalUrl);
                successCount++;
            }
        } catch (err) {
            console.error('Error uploading photo:', err);
            failCount++;
        }
    }

    if (addBtn) {
        addBtn.disabled = false;
        addBtn.innerHTML = '<i class="fas fa-camera me-1"></i> Add Trip Photos';
    }

    if (successCount === 0) {
        if (typeof showToast === 'function') showToast('Failed to process all photos. Please try again.', 'danger');
        return;
    }

    // Save to Firestore
    try {
        await db.collection('trips').doc(activeTrip.id).update({
            images: activeTrip.images,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update the userTrips array in memory
        const idx = userTrips.findIndex(t => t.id === activeTrip.id);
        if (idx !== -1) userTrips[idx].images = activeTrip.images;
        window.userTrips = userTrips;

        const msg = failCount > 0
            ? `${successCount} photo(s) uploaded! ${failCount} failed.`
            : `${successCount} photo(s) added to your trip slideshow! 🎉`;
        if (typeof showToast === 'function') showToast(msg, 'success');

        // Re-render slideshow with newly uploaded photos
        renderActiveTripHeroSlideshow(activeTrip);

    } catch (e) {
        console.error('Error saving photos to Firestore:', e);
        if (typeof showToast === 'function') showToast('Photos processed but failed to save. Please retry.', 'danger');
    }
}

function createTripCard(trip) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';
    
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    const today = new Date();
    
    // Calculate trip-specific statistics
    const totalSpent = trip.expenses ? trip.expenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
    const progressPercent = Math.min((totalSpent / trip.budget) * 100, 100);
    const remaining = trip.budget - totalSpent;
    
    // Calculate car expenses for THIS trip only
    const carExpenses = trip.expenses ? trip.expenses.filter(expense => 
        expense.category === 'fuel' || 
        expense.description.toLowerCase().includes('car') ||
        expense.description.toLowerCase().includes('fuel') ||
        expense.description.toLowerCase().includes('rental') ||
        expense.description.toLowerCase().includes('maintenance') ||
        expense.description.toLowerCase().includes('toll') ||
        expense.description.toLowerCase().includes('parking')
    ).reduce((sum, expense) => sum + expense.amount, 0) : 0;
    
    let progressBarClass = 'bg-success';
    if (remaining < 0) progressBarClass = 'bg-danger';
    else if (remaining < trip.budget * 0.2) progressBarClass = 'bg-warning';
    
    // Trip status badge
    let statusBadge = '';
    if (startDate > today) {
        statusBadge = '<span class="badge bg-info">Upcoming</span>';
    } else if (endDate < today) {
        statusBadge = '<span class="badge bg-secondary">Completed</span>';
    } else {
        statusBadge = '<span class="badge bg-success">Active</span>';
    }

    // Carbon footprint calculation for card
    let carbonBadge = '';
    if (trip.route && trip.route.distance) {
        const carbon = calculateTripCarbon(trip);
        const leaf = getLeafRating(carbon.emissions);
        carbonBadge = `<span class="badge bg-light ${leaf.class} ms-1" style="font-size: 0.75rem;" title="${leaf.desc}"><i class="fas ${leaf.icon} me-1"></i>${leaf.rating}</span>`;
    }
    
    const isCreator = trip.createdBy === currentUser.uid;
    
    col.innerHTML = `
        <div class="card trip-card h-100" data-trip-id="${trip.id}">
            <div class="trip-card-header">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h5 class="card-title mb-1">${trip.name}</h5>
                        <p class="card-text mb-1">${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
                        ${statusBadge}${carbonBadge}
                    </div>
                    ${isCreator ? `
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item edit-trip-btn" href="#" data-trip-id="${trip.id}">
                                    <i class="fas fa-edit me-2"></i>Edit Trip
                                </a></li>
                                <li><a class="dropdown-item text-danger delete-trip-btn" href="#" data-trip-id="${trip.id}" data-trip-name="${trip.name}">
                                    <i class="fas fa-trash me-2"></i>Delete Trip
                                </a></li>
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="card-body">
                <p class="card-text mb-1">
                    <i class="fas fa-map-marker-alt me-2"></i>${trip.startLocation} → ${trip.destination}
                </p>
                ${trip.stops && trip.stops.length > 0 ? `
                <p class="card-text small text-muted mb-2">
                    <i class="fas fa-map-pin me-2 text-success"></i>Stops: ${trip.stops.map(s => typeof s === 'object' ? s.name : s).join(', ')}
                </p>
                ` : ''}
                
                <!-- Trip-specific Budget Progress -->
                <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <small>Budget: <span class="rupee-symbol">₹</span>${trip.budget.toFixed(2)}</small>
                        <small>Spent: <span class="rupee-symbol">₹</span>${totalSpent.toFixed(2)}</small>
                    </div>
                    <div class="progress mb-2" style="height: 8px;">
                        <div class="progress-bar ${progressBarClass}" role="progressbar" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="d-flex justify-content-between">
                        <small class="text-muted">${progressPercent.toFixed(1)}% used</small>
                        <small class="${remaining < 0 ? 'text-danger' : 'text-success'}">
                            ${remaining < 0 ? 'Over budget' : 'Remaining: ₹' + remaining.toFixed(2)}
                        </small>
                    </div>
                </div>
                
                <!-- Trip-specific Car Expense Info -->
                ${carExpenses > 0 ? `
                <div class="mb-3 p-2 bg-light rounded">
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="fas fa-car me-1"></i>Car Expenses:
                        </small>
                        <small class="fw-bold text-primary">
                            <span class="rupee-symbol">₹</span>${carExpenses.toFixed(2)}
                        </small>
                    </div>
                </div>
                ` : ''}
                
                <!-- Trip-specific Expense Summary -->
                <div class="mb-3">
                    <div class="row text-center">
                        <div class="col-6">
                            <small class="text-muted d-block">Total Expenses</small>
                            <strong class="text-primary"><span class="rupee-symbol">₹</span>${totalSpent.toFixed(2)}</strong>
                        </div>
                        <div class="col-6">
                            <small class="text-muted d-block">Expense Count</small>
                            <strong class="text-info">${trip.expenses ? trip.expenses.length : 0}</strong>
                        </div>
                    </div>
                </div>
                
                <div class="d-flex justify-content-between align-items-center">
                    <button class="btn btn-outline-primary btn-sm view-trip-btn">
                        <i class="fas fa-eye me-1"></i>View Details
                    </button>
                    <div class="d-flex align-items-center">
                        <div class="member-avatar me-2" title="${trip.members.length} members">
                            <i class="fas fa-users"></i>
                            <small class="ms-1">${trip.members.length}</small>
                        </div>
                        <span class="trip-code">${trip.code}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    col.querySelector('.view-trip-btn').addEventListener('click', () => {
        setCurrentTrip(trip);
        navigateTo('trip-details.html');
    });
    
    // Add event listeners for edit and delete buttons
    if (isCreator) {
        col.querySelector('.edit-trip-btn').addEventListener('click', (e) => {
            e.preventDefault();
            showEditTripModal(trip);
        });
        
        col.querySelector('.delete-trip-btn').addEventListener('click', (e) => {
            e.preventDefault();
            showDeleteTripModal(trip);
        });
    }
    
    return col;
}

function showCreateTripModal() {
    if (!auth.currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    window._pendingTripImages = [];
    const previewContainer = document.getElementById('trip-image-previews');
    if (previewContainer) previewContainer.innerHTML = '';
    const imgInput = document.getElementById('trip-image-input');
    if (imgInput) imgInput.value = '';
    
    document.getElementById('add-trip-form').reset();
    document.getElementById('transport-mode').value = 'car';
    document.getElementById('distance-calc-container').classList.remove('d-none');
    document.getElementById('distance-results').classList.add('d-none');
    document.getElementById('calculate-distance').checked = false;
    
    // Clear stops
    const stopsContainer = document.getElementById('trip-stops-container');
    if (stopsContainer) stopsContainer.innerHTML = '';
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    document.getElementById('start-date').value = today.toISOString().split('T')[0];
    document.getElementById('end-date').value = tomorrow.toISOString().split('T')[0];
    
    const modal = new bootstrap.Modal(document.getElementById('createTripModal'));
    modal.show();
}

function showEditTripModal(trip) {
    window._pendingEditTripImages = (trip.images && Array.isArray(trip.images)) ? [...trip.images] : [];
    const editPreviewContainer = document.getElementById('edit-trip-image-previews');
    if (editPreviewContainer) renderTripImagePreviews(editPreviewContainer, window._pendingEditTripImages, true);
    const editImgInput = document.getElementById('edit-trip-image-input');
    if (editImgInput) editImgInput.value = '';

    document.getElementById('edit-trip-id').value = trip.id;
    document.getElementById('edit-trip-name').value = trip.name;
    document.getElementById('edit-transport-mode').value = trip.transportMode || 'car';
    document.getElementById('edit-start-location').value = trip.startLocation;
    document.getElementById('edit-trip-destination').value = trip.destination;
    document.getElementById('edit-start-date').value = trip.startDate;
    document.getElementById('edit-end-date').value = trip.endDate;
    document.getElementById('edit-trip-budget').value = trip.budget;
    
    // Populate stops container
    const editStopsContainer = document.getElementById('edit-trip-stops-container');
    if (editStopsContainer) {
        editStopsContainer.innerHTML = '';
        if (trip.stops && Array.isArray(trip.stops)) {
            trip.stops.forEach(stop => {
                addStopField(editStopsContainer, stop);
            });
        }
    }
    
    document.getElementById('edit-distance-results').classList.add('d-none');
    document.getElementById('edit-calculate-distance').checked = false;
    
    // If route already exists, show it
    if (trip.route) {
        document.getElementById('edit-distance-results').classList.remove('d-none');
        document.getElementById('edit-distance-details').innerHTML = `
            <p><strong>Current Distance:</strong> ${trip.route.distance}</p>
            <p><strong>Current Travel Time:</strong> ${trip.route.duration}</p>
            <div class="alert alert-info mt-2">
                <small><i class="fas fa-info-circle me-1"></i>Check the box above to recalculate with updated locations</small>
            </div>
        `;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('editTripModal'));
    modal.show();
}

function showDeleteTripModal(trip) {
    document.getElementById('delete-trip-id').value = trip.id;
    document.getElementById('delete-trip-name').textContent = trip.name;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteTripModal'));
    modal.show();
}

function showJoinTripModal() {
    if (!auth.currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    // Original join trip modal code...
    document.getElementById('join-trip-message').classList.add('d-none');
    document.getElementById('trip-code').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('joinTripModal'));
    modal.show();
}

async function calculateDistance() {
    const startLocation = document.getElementById('start-location').value;
    const destination = document.getElementById('trip-destination').value;
    
    if (!validateLocation(startLocation) || !validateLocation(destination)) {
        showAlert('Please enter valid locations', 'warning');
        return;
    }
    
    // Extract stops
    const stops = Array.from(document.querySelectorAll('#trip-stops-container .stop-input-row'))
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
        document.getElementById('distance-details').innerHTML = `
            <div class="text-center">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                Calculating distance...
            </div>
        `;
        document.getElementById('distance-results').classList.remove('d-none');
        
        const routeData = await calculateRealDistance(startLocation, destination, stops);
        
        displayDistanceResults(routeData.distance, routeData.duration);
        
    } catch (error) {
        console.error('Error calculating distance:', error);
        const errorMessage = handleRouteCalculationError(error);
        document.getElementById('distance-details').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${errorMessage}
            </div>
        `;
    }
}

async function calculateEditDistance() {
    const startLocation = document.getElementById('edit-start-location').value;
    const destination = document.getElementById('edit-trip-destination').value;
    
    if (!validateLocation(startLocation) || !validateLocation(destination)) {
        showAlert('Please enter valid locations', 'warning');
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
        document.getElementById('edit-distance-details').innerHTML = `
            <div class="text-center">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                Calculating distance...
            </div>
        `;
        document.getElementById('edit-distance-results').classList.remove('d-none');
        
        const routeData = await calculateRealDistance(startLocation, destination, stops);
        
        document.getElementById('edit-distance-details').innerHTML = `
            <p><strong>Distance:</strong> ${routeData.distance}</p>
            <p><strong>Estimated Travel Time:</strong> ${routeData.duration}</p>
            <div class="alert alert-success mt-2">
                <small><i class="fas fa-check-circle me-1"></i>Distance calculated using OpenRouteService API</small>
            </div>
        `;
        
    } catch (error) {
        console.error('Error calculating distance:', error);
        const errorMessage = handleRouteCalculationError(error);
        document.getElementById('edit-distance-details').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${errorMessage}
            </div>
        `;
    }
}

function displayDistanceResults(distance, duration) {
    const distanceDetails = document.getElementById('distance-details');
    
    distanceDetails.innerHTML = `
        <p><strong>Distance:</strong> ${distance}</p>
        <p><strong>Estimated Travel Time:</strong> ${duration}</p>
        <div class="alert alert-success mt-2">
            <small><i class="fas fa-check-circle me-1"></i>Distance calculated using OpenRouteService API</small>
        </div>
    `;
}

async function saveTrip() {
    const name = document.getElementById('trip-name').value;
    const transportMode = document.getElementById('transport-mode').value;
    const startLocation = document.getElementById('start-location').value;
    const destination = document.getElementById('trip-destination').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const budget = parseFloat(document.getElementById('trip-budget').value);
    const calculateDistanceVal = document.getElementById('calculate-distance').checked;
    
    if (!name || !validateLocation(startLocation) || !validateLocation(destination) || !startDate || !endDate || !budget) {
        showAlert('Please fill in all fields with valid data', 'warning');
        return;
    }
    
    if (!validateDates(startDate, endDate)) {
        showAlert('End date must be after start date', 'warning');
        return;
    }
    
    if (budget <= 0) {
        showAlert('Budget must be greater than 0', 'warning');
        return;
    }
    
    // Extract stops
    const stops = Array.from(document.querySelectorAll('#trip-stops-container .stop-input-row'))
        .map(row => {
            const input = row.querySelector('.trip-stop-input');
            const select = row.querySelector('.trip-stop-type-select');
            return {
                name: input ? input.value.trim() : '',
                type: select ? select.value : 'before'
            };
        })
        .filter(stop => stop.name.length > 0);
    
    const code = generateTripCode();
    
    // Create trip data with proper structure
    const tripData = {
        name: name.trim(),
        transportMode,
        startLocation: startLocation.trim(),
        destination: destination.trim(),
        stops: stops,
        images: window._pendingTripImages || [],
        startDate,
        endDate,
        budget,
        code,
        createdBy: currentUser.uid,
        members: [currentUser.uid],
        expenses: [],
        itinerary: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Calculate route if requested
    if (calculateDistanceVal) {
        try {
            document.getElementById('save-trip-btn').disabled = true;
            document.getElementById('save-trip-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Calculating Route...';
            
            const routeData = await calculateRealDistance(startLocation, destination, stops);
            tripData.route = {
                distance: routeData.distance,
                duration: routeData.duration,
                calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            console.log('Route calculated during trip creation:', routeData);
            
        } catch (error) {
            console.error('Error calculating route during trip creation:', error);
            showAlert('Trip created but route calculation failed. You can calculate it later.', 'warning');
        }
    }
    
    try {
        document.getElementById('save-trip-btn').disabled = true;
        document.getElementById('save-trip-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Creating...';
        
        const docRef = await db.collection('trips').add(tripData);
        tripData.id = docRef.id;
        
        // Add the new trip to the local array with proper date handling
        const newTrip = {
            ...tripData,
            createdAt: new Date()
        };
        userTrips.unshift(newTrip);
        window.userTrips = userTrips; // keep chatbot context in sync
        displayTrips();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('createTripModal'));
        modal.hide();
        
        document.getElementById('share-trip-code').textContent = code;
        const shareModal = new bootstrap.Modal(document.getElementById('shareTripModal'));
        shareModal.show();
        
    } catch (error) {
        console.error('Error creating trip:', error);
        showAlert('Error creating trip. Please try again.', 'danger');
    } finally {
        document.getElementById('save-trip-btn').disabled = false;
        document.getElementById('save-trip-btn').innerHTML = 'Create Trip';
    }
}

async function updateTrip() {
    const tripId = document.getElementById('edit-trip-id').value;
    const name = document.getElementById('edit-trip-name').value;
    const transportMode = document.getElementById('edit-transport-mode').value;
    const startLocation = document.getElementById('edit-start-location').value;
    const destination = document.getElementById('edit-trip-destination').value;
    const startDate = document.getElementById('edit-start-date').value;
    const endDate = document.getElementById('edit-end-date').value;
    const budget = parseFloat(document.getElementById('edit-trip-budget').value);
    const recalculateDistanceVal = document.getElementById('edit-calculate-distance').checked;
    
    if (!name || !validateLocation(startLocation) || !validateLocation(destination) || !startDate || !endDate || !budget) {
        showAlert('Please fill in all fields with valid data', 'warning');
        return;
    }
    
    if (!validateDates(startDate, endDate)) {
        showAlert('End date must be after start date', 'warning');
        return;
    }
    
    if (budget <= 0) {
        showAlert('Budget must be greater than 0', 'warning');
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
        document.getElementById('update-trip-btn').disabled = true;
        document.getElementById('update-trip-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Updating...';
        
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
        if (recalculateDistanceVal) {
            try {
                const routeData = await calculateRealDistance(startLocation, destination, stops);
                updateData.route = {
                    distance: routeData.distance,
                    duration: routeData.duration,
                    calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
            } catch (error) {
                console.error('Error recalculating route:', error);
            }
        }
        
        await db.collection('trips').doc(tripId).update(updateData);
        
        // Update local trip data
        const tripIndex = userTrips.findIndex(trip => trip.id === tripId);
        if (tripIndex !== -1) {
            userTrips[tripIndex] = {
                ...userTrips[tripIndex],
                ...updateData
            };
        }
        
        displayTrips();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('editTripModal'));
        modal.hide();
        
        showAlert('Trip updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating trip:', error);
        showAlert('Error updating trip. Please try again.', 'danger');
    } finally {
        document.getElementById('update-trip-btn').disabled = false;
        document.getElementById('update-trip-btn').innerHTML = 'Update Trip';
    }
}

async function deleteTrip() {
    const tripId = document.getElementById('delete-trip-id').value;
    
    try {
        document.getElementById('confirm-delete-trip-btn').disabled = true;
        document.getElementById('confirm-delete-trip-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Deleting...';
        
        await db.collection('trips').doc(tripId).delete();
        
        // Remove from local array
        userTrips = userTrips.filter(trip => trip.id !== tripId);
        window.userTrips = userTrips; // keep chatbot context in sync
        displayTrips();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteTripModal'));
        modal.hide();
        
        showAlert('Trip deleted successfully!', 'success');
        
    } catch (error) {
        console.error('Error deleting trip:', error);
        showAlert('Error deleting trip. Please try again.', 'danger');
    } finally {
        document.getElementById('confirm-delete-trip-btn').disabled = false;
        document.getElementById('confirm-delete-trip-btn').innerHTML = '<i class="fas fa-trash me-1"></i>Delete Trip';
    }
}

async function joinTripWithCode() {
    const code = document.getElementById('trip-code').value.trim().toUpperCase();
    const messageEl = document.getElementById('join-trip-message');
    
    if (!code || code.length < 6 || code.length > 8) {
        showMessage(messageEl, 'Please enter a valid 6-8 character trip code', 'warning');
        return;
    }
    
    try {
        document.getElementById('join-trip-code-btn').disabled = true;
        document.getElementById('join-trip-code-btn').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Joining...';
        
        const tripsSnapshot = await db.collection('trips')
            .where('code', '==', code)
            .get();
        
        if (tripsSnapshot.empty) {
            showMessage(messageEl, 'Invalid trip code. Please check the code and try again.', 'warning');
            return;
        }
        
        const tripDoc = tripsSnapshot.docs[0];
        const trip = tripDoc.data();
        const tripId = tripDoc.id;
        
        if (trip.members.includes(currentUser.uid)) {
            showMessage(messageEl, 'You are already a member of this trip.', 'info');
            return;
        }
        
        await db.collection('trips').doc(tripId).update({
            members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const joinedTrip = { id: tripId, ...trip };
        userTrips.unshift(joinedTrip);
        displayTrips();
        
        showMessage(messageEl, 'Successfully joined the trip! Redirecting...', 'success');
        
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('joinTripModal'));
            modal.hide();
            setCurrentTrip(joinedTrip);
            navigateTo('trip-details.html');
        }, 2000);
        
    } catch (error) {
        console.error('Error joining trip:', error);
        showMessage(messageEl, 'Error joining trip. Please try again.', 'danger');
    } finally {
        document.getElementById('join-trip-code-btn').disabled = false;
        document.getElementById('join-trip-code-btn').innerHTML = 'Join Trip';
    }
}

function showMessage(messageEl, message, type) {
    messageEl.textContent = message;
    messageEl.className = `alert alert-${type} mt-3`;
    messageEl.classList.remove('d-none');
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${getAlertIcon(type)} me-2"></i>
            <div>${message}</div>
            <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) alertDiv.remove();
    }, 5000);
}

function getAlertIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'danger': return 'exclamation-triangle';
        case 'warning': return 'exclamation-circle';
        case 'info': return 'info-circle';
        default: return 'info-circle';
    }
}

function copyTripCode() {
    const code = document.getElementById('share-trip-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const copySuccess = document.getElementById('copy-success');
        copySuccess.classList.remove('d-none');
        setTimeout(() => copySuccess.classList.add('d-none'), 3000);
    }).catch(err => {
        console.error('Failed to copy code: ', err);
        showAlert('Failed to copy code. Please copy it manually.', 'warning');
    });
}

async function handleLogout() {
    if (!confirm('Are you sure you want to log out?')) {
        return;
    }

    try {
        // Show loading state
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            const originalText = logoutBtn.innerHTML;
            logoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing out...';
            logoutBtn.disabled = true;
        }
        
        // Show loading overlay during logout
        showLoadingOverlay();
        
        await auth.signOut();
        
        // Show success message
        showToast('Signed out successfully!', 'success');
        
        // The auth state listener will automatically show public dashboard
        // No need to navigate away
        
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error during sign out', 'danger');
    } finally {
        // Reset button state
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.disabled = false;
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt me-1"></i>Logout';
        }
        
        // Ensure loading overlay is hidden
        hideLoadingOverlay();
    }
}

// Simple test function that shows results in alert
function testRouteCalculation() {
    const testStart = "New Delhi";
    const testDest = "Mumbai";
    
    console.log("Testing route calculation...");
    
    calculateRealDistance(testStart, testDest)
        .then(result => {
            console.log("Test result:", result);
            showAlert(`Test: ${testStart} to ${testDest} - ${result.distance} in ${result.duration}`, 'info');
        })
        .catch(error => {
            console.error("Test failed:", error);
            showAlert('Test failed: ' + error.message, 'danger');
        });
}

function validateDates(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (start < today) {
        showAlert('Start date cannot be in the past', 'warning');
        return false;
    }
    if (end <= start) {
        showAlert('End date must be after start date', 'warning');
        return false;
    }
    return true;
}

// Add getMemberName function to dashboard.js
// Enhanced getMemberName function
async function getMemberName(memberId) {
    try {
        if (!memberId || typeof memberId !== 'string' || !memberId.trim()) return 'Traveler';
        if (auth.currentUser && memberId === auth.currentUser.uid) return 'You';
        
        const userDoc = await db.collection('users').doc(memberId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            return userData.name || userData.displayName || userData.email || 'Traveler';
        }
        
        return 'Traveler';
    } catch (error) {
        console.error('Error getting member name:', error);
        return 'Traveler';
    }
}

// Public Dashboard functionality
function showPublicDashboard() {
    // Hide loading overlay
    hideLoadingOverlay();
    
    // Show public dashboard
    const pubDash = document.getElementById('public-dashboard');
    if (pubDash) pubDash.classList.remove('d-none');
    
    // Hide private dashboard
    const privateDashboard = document.querySelector('.container.mt-4');
    if (privateDashboard && window.location.pathname.includes('dashboard.html')) {
        privateDashboard.classList.add('d-none');
    }
    
    // Show navigation for public view but update its content
    const nav = document.querySelector('nav');
    if (nav) {
        nav.classList.remove('d-none');
        
        // Update navigation content for public view
        const navbarNav = nav.querySelector('.navbar-nav');
        if (navbarNav) {
            navbarNav.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link active" href="dashboard.html">
                        <i class="fas fa-home me-1"></i>Home
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#features">
                        <i class="fas fa-star me-1"></i>Features
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#how-it-works">
                        <i class="fas fa-play-circle me-1"></i>How It Works
                    </a>
                </li>
            `;
        }
    }
    
    // Update auth section for public view
    updateNavigationBasedOnAuth(false);
}

function showPrivateDashboard() {
    // Hide loading overlay
    hideLoadingOverlay();
    
    // Hide public dashboard
    document.getElementById('public-dashboard').classList.add('d-none');
    
    // Show private dashboard
    const privateDashboard = document.querySelector('.container.mt-4');
    if (privateDashboard) {
        privateDashboard.classList.remove('d-none');
    }
    
    // Show navigation for private view with full menu
    const nav = document.querySelector('nav');
    if (nav) {
        nav.classList.remove('d-none');
        
        // Update navigation content for private view
        const navbarNav = nav.querySelector('.navbar-nav');
        if (navbarNav) {
            navbarNav.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link active" href="dashboard.html">
                        <i class="fas fa-home me-1"></i>Dashboard
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="car-calculations.html">
                        <i class="fas fa-calculator me-1"></i>Car Calculator
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" id="nav-profile">
                        <i class="fas fa-user me-1"></i>Profile
                    </a>
                </li>
            `;
            
            // Re-attach profile event listener
            setTimeout(() => {
                const navProfile = document.getElementById('nav-profile');
                if (navProfile) {
                    navProfile.addEventListener('click', showProfileModal);
                }
            }, 100);
        }
    }
    
    // Update auth section for private view
    updateNavigationBasedOnAuth(true);
}

function redirectToAuth() {
    navigateTo('auth.html');
}

function updateNavigationBasedOnAuth(isLoggedIn) {
    const navAuthSection = document.getElementById('nav-auth-section');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    
    if (mobileLogoutBtn) {
        mobileLogoutBtn.style.display = isLoggedIn ? 'block' : 'none';
    }
    
    if (!navAuthSection) return;
    
    if (isLoggedIn && currentUser) {
        // User is logged in
        const avatarUrl = localStorage.getItem('user_avatar_' + currentUser.uid) || currentUser.photoURL;
        navAuthSection.innerHTML = `
            <img id="user-avatar" class="user-avatar me-2" src="${getSafeAvatarUrl(avatarUrl, currentUser.displayName || 'User')}" alt="User Avatar">
            <span class="me-3" id="user-name">${currentUser.displayName || 'User'}</span>
            <button class="btn btn-outline-primary btn-sm" id="logout-btn">
                <i class="fas fa-sign-out-alt me-1"></i>Logout
            </button>
        `;
        
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            setupAvatarFallback(userAvatar, currentUser.displayName || 'User');
        }
        
        // Re-attach logout event listener
        setTimeout(() => {
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', handleLogout);
            }
        }, 100);
        
    } else {
        // User is not logged in
        navAuthSection.innerHTML = `
            <button class="btn btn-primary btn-sm" id="login-btn">
                <i class="fas fa-sign-in-alt me-1"></i>Sign In
            </button>
        `;
        
        // Attach login event listener
        setTimeout(() => {
            const loginBtn = document.getElementById('login-btn');
            if (loginBtn) {
                loginBtn.addEventListener('click', () => window.location.href = 'login.html');
            }
        }, 100);
    }
}

function setupProtectedNavigation() {
    // Update car calculator link to handle auth
    const carCalcLink = document.querySelector('a[href="car-calculations.html"]');
    if (carCalcLink) {
        carCalcLink.addEventListener('click', function(e) {
            if (!auth.currentUser) {
                e.preventDefault();
                window.location.href = 'login.html';
            }
        });
    }
    
    // Update create first trip button
    const createFirstTripBtn = document.getElementById('create-first-trip-btn');
    if (createFirstTripBtn) {
        createFirstTripBtn.addEventListener('click', function(e) {
            if (!auth.currentUser) {
                e.preventDefault();
                window.location.href = 'login.html';
            }
        });
    }
    
    const navProfile = document.getElementById('nav-profile');
    if (navProfile) {
        navProfile.addEventListener('click', function(e) {
            if (!auth.currentUser) {
                e.preventDefault();
                window.location.href = 'login.html';
            }
        });
    }
}

function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
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
                <i class="fas ${getToastIcon(type)} me-2"></i>
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
    
    toast.addEventListener('hidden.bs.toast', () => {
        if (toast.parentNode) {
            toast.remove();
        }
    });
}

function getToastIcon(type) {
    switch(type) {
        case 'success': return 'fa-check-circle';
        case 'danger': return 'fa-exclamation-triangle';
        case 'warning': return 'fa-exclamation-circle';
        case 'info': return 'fa-info-circle';
        default: return 'fa-info-circle';
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
            const chk = document.getElementById('calculate-distance');
            if (chk && chk.checked) calculateDistance();
        } else if (container.id === 'edit-trip-stops-container') {
            const chk = document.getElementById('edit-calculate-distance');
            if (chk && chk.checked) calculateEditDistance();
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
    console.log('Trip route data refreshed. Updating dashboard...');
    displayTrips();
    updateDashboardActiveTripTracker();
});

// ============================================================
// AI TRAVEL COMPANION CHATBOT  (powered by OpenRouter)
// Free model priority list — first available wins.
// ============================================================

// Ordered list of models to try.
// 'openrouter/free' is an official auto-router slug that always picks a
// currently-available free model — no more 404s from rotated-out models.
const OPENROUTER_FREE_MODELS = [
    'openrouter/free',                              // OpenRouter's official free auto-router (ALWAYS works for free tier!)
    'tencent/hy3:free',                            // Tencent Hy3 free model
    'poolside/laguna-xs-2.1:free',                  // Poolside Laguna free model
    'cohere/north-mini-code:free',                  // Cohere North Mini Code free model
    'nvidia/nemotron-3-ultra-550b-a55b:free'        // NVIDIA Nemotron Ultra free model
];

async function loadOpenRouterKey() {
    try {
        const user = auth.currentUser;
        let userData = {};
        if (user) {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) userData = doc.data();
        }
        
        let sharedData = {};
        try {
            const sharedDoc = await db.collection('settings').doc('ai_keys').get();
            if (sharedDoc.exists) sharedData = sharedDoc.data();
        } catch (e) {
            console.warn('Could not read shared AI keys settings:', e);
        }
        
        window._openrouterApiKey = userData.openrouterApiKey || sharedData.openrouterApiKey || '';
        window._groqApiKey = userData.groqApiKey || sharedData.groqApiKey || '';
        window._openrouterModel = userData.openrouterModel || sharedData.openrouterModel || 'auto';
        window._openrouterCustomModel = userData.openrouterCustomModel || sharedData.openrouterCustomModel || '';
        
        return window._openrouterApiKey;
    } catch (e) {
        console.warn('Could not load OpenRouter key:', e);
    }
    return window._openrouterApiKey || null;
}

function buildTripContext() {
    // 1. Determine target trip (check currentTrip first if on trip-details page, else userTrips/activeTrip)
    const trips = typeof userTrips !== 'undefined' && userTrips.length > 0 ? userTrips : (window.userTrips || []);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    function parseDate(val) {
        if (!val) return null;
        if (val.toDate) return val.toDate();
        if (val.seconds) return new Date(val.seconds * 1000);
        return new Date(val);
    }
    
    let targetTrip = null;
    if (typeof currentTrip !== 'undefined' && currentTrip) {
        targetTrip = currentTrip;
    } else {
        targetTrip = trips.find(t => {
            const start = parseDate(t.startDate);
            const end = parseDate(t.endDate);
            if (!start || !end) return false;
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return today >= start && today <= end;
        });
        if (!targetTrip && trips.length > 0) {
            targetTrip = trips[0];
        }
    }
    
    if (!targetTrip) {
        return `User currently has no trips created in TravelMate.`;
    }
    
    const totalKm = parseFloat(targetTrip.route?.distance || targetTrip.distance) || 0;
    const currentKm = targetTrip.currentKm || 0;
    const pct = totalKm > 0 ? ((currentKm / totalKm) * 100).toFixed(1) : 0;
    const stopsNames = (targetTrip.stops || []).map(st => typeof st === 'object' ? `${st.name} (${st.type === 'after' ? 'Return Leg' : 'Outbound Leg'})` : st);
    const stopsInfo = stopsNames.length > 0 ? stopsNames.join(' → ') : 'Direct journey without stops';
    
    // Process Tickets and Pre-calculate Stay & Layover Breakdown
    let ticketsSection = 'No tickets booked yet.';
    let staySection = 'No stay breakdown calculated yet.';
    
    const tickets = targetTrip.tickets || [];
    if (tickets.length > 0) {
        const sortedTickets = [...tickets]
            .filter(t => t.departureTime)
            .sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));
            
        ticketsSection = sortedTickets.map((t, idx) => {
            const depStr = `${t.departurePlace}${t.depCode ? ' (' + t.depCode + ')' : ''} at ${t.departureTime.replace('T', ' ')}`;
            const arrStr = t.arrivalTime ? `${t.arrivalPlace}${t.arrCode ? ' (' + t.arrCode + ')' : ''} at ${t.arrivalTime.replace('T', ' ')}` : t.arrivalPlace;
            return `  ${idx + 1}. [${t.type.toUpperCase()}] ${t.serviceNo || ''} ${t.serviceName || t.operator || ''} | PNR: ${t.ticketNo} | Departs: ${depStr} | Arrives: ${arrStr} | Seat: ${t.seatNo || 'N/A'} | Status: ${t.bookingStatus || 'CNF'} | Cost: ₹${t.cost || 0}`;
        }).join('\n');
        
        // Layover and Exploring Stay calculations
        const stayLegs = [];
        let totalTransitMs = 0;
        let totalStayMs = 0;
        
        for (let i = 0; i < sortedTickets.length; i++) {
            const currentT = sortedTickets[i];
            const depT = new Date(currentT.departureTime);
            const arrT = currentT.arrivalTime ? new Date(currentT.arrivalTime) : depT;
            totalTransitMs += Math.max(0, arrT - depT);
            
            if (i < sortedTickets.length - 1) {
                const nextT = sortedTickets[i + 1];
                const nextDepT = new Date(nextT.departureTime);
                const stayMs = Math.max(0, nextDepT - arrT);
                totalStayMs += stayMs;
                
                const totalMins = Math.floor(stayMs / (1000 * 60));
                const days = Math.floor(totalMins / (60 * 24));
                const hours = Math.floor((totalMins % (60 * 24)) / 60);
                const mins = totalMins % 60;
                
                let durationText = '';
                if (days > 0) durationText += `${days} Day${days > 1 ? 's' : ''}, `;
                if (hours > 0) durationText += `${hours} Hour${hours > 1 ? 's' : ''}, `;
                durationText += `${mins} Mins`;
                
                const loc = currentT.arrivalPlace || nextT.departurePlace;
                const code = currentT.arrCode || nextT.depCode || '';
                
                stayLegs.push(`  * ${loc}${code ? ' (' + code + ')' : ''}: EXACT EXPLORING TIME = ${durationText} (${(stayMs / 3600000).toFixed(1)} hrs total). Arrives ${currentT.arrivalTime ? currentT.arrivalTime.replace('T', ' ') : 'N/A'} via ${currentT.serviceNo || currentT.operator} -> Next Departure ${nextT.departureTime.replace('T', ' ')} via ${nextT.serviceNo || nextT.operator}.`);
            }
        }
        
        if (stayLegs.length > 0) {
            const totalMs = totalTransitMs + totalStayMs;
            const stayPct = totalMs > 0 ? ((totalStayMs / totalMs) * 100).toFixed(0) : 0;
            const transitPct = totalMs > 0 ? ((totalTransitMs / totalMs) * 100).toFixed(0) : 0;
            staySection = `Overall Split: ${stayPct}% Exploring Stay (${(totalStayMs/3600000).toFixed(1)} hrs) vs ${transitPct}% Transit (${(totalTransitMs/3600000).toFixed(1)} hrs).\n` + stayLegs.join('\n');
        } else {
            staySection = `Only 1 ticket found or missing arrival timestamps to calculate layover gap.`;
        }
    }
    
    // Process Expenses Context
    const expenses = targetTrip.expenses || [];
    let expenseSum = 0;
    expenses.forEach(e => expenseSum += (parseFloat(e.amount) || 0));
    const budget = parseFloat(targetTrip.budget) || 0;
    const balance = budget - expenseSum;
    
    const startD = parseDate(targetTrip.startDate);
    const endD = parseDate(targetTrip.endDate);
    
    return `TARGET TRIP DATA & LIVE APP CONTEXT:
- Trip Name: "${targetTrip.name}"
- Primary Route: ${targetTrip.startLocation} → ${targetTrip.destination}
- Sequential Itinerary Stops: ${stopsInfo}
- Transport Mode: ${targetTrip.transportMode || 'car'}
- Total Distance: ${totalKm} km (${currentKm} km completed, ${pct}% progress)
- Dates: ${startD ? startD.toLocaleDateString() : targetTrip.startDate} to ${endD ? endD.toLocaleDateString() : targetTrip.endDate}
- Current GPS/Location: ${targetTrip.currentLocationName || 'Not tracked'}
- Budget: ₹${budget} | Total Expenses Logged: ₹${expenseSum} | Remaining Balance: ₹${balance}

[BOOKED TICKETS DETAILS]:
${ticketsSection}

[CALCULATED EXPLORATION & STAY TIME BREAKDOWN BY LOCATION]:
${staySection}`;
}

const GROQ_MODELS = [
    'llama-3.3-70b-versatile',
    'llama3-8b-8192',
    'mixtral-8x7b-32768'
];

function buildSystemPrompt(tripContext) {
    return `You are TravelMate AI, the user's dedicated personal travel assistant with FULL COMMAND and realtime context of their TravelMate application.

${tripContext}

CRITICAL RESPONSE GUIDELINES:
1. FULL COMMAND OVER APP DATA: You have direct access to the user's live trip context above (including their booked tickets, train/flight numbers, station codes, arrival/departure timestamps, pre-calculated exploration stay hours, expenses, and itinerary).
2. DIRECT, PRECISE & ACCURATE ANSWERS: When the user asks about how much time they have to explore a place (e.g., "how much time do I have to explore Vijayawada based on tickets"), DO NOT give generic formulas, manual calculation steps, or general math guides! ALWAYS quote their exact arrival time, next departure time, train/flight numbers, and the EXACT calculated stay duration (e.g., "You have exactly 36 Hours and 35 Minutes to explore Vijayawada from July 27 at 05:25 to July 28 at 18:00")!
3. HIGHLY HELPFUL & ACTIONABLE: After providing the exact stay duration, give personalized sightseeing suggestions tailored to fit inside that exact available exploring time.
4. MULTILINGUAL & WELCOMING: Answer fluently in English, Hindi (हिन्दी), or Telugu (తెలుగు) based on user preference. Be warm, polite, and encouraging.

If the user asks you to perform an action on their trip, you can trigger specific functions in the application by appending a command at the VERY END of your reply.
Available commands:
1. To add a stop to their current/active trip:
   [[ACTION: ADD_STOP, "Stop Name"]]
   Example user request: "Add stop Pune to my trip."
   Example reply: "I've added Pune as a stop on your active trip!\n\n[[ACTION: ADD_STOP, \"Pune\"]]"
   
2. To add an expense to their active trip:
   [[ACTION: ADD_EXPENSE, amount, "category", "description"]]
   Valid categories: fuel, hotel, food, activities, other.
   Example user request: "Add expense 500 for lunch."
   Example reply: "Sure, I have recorded an expense of ₹500 for lunch.\n\n[[ACTION: ADD_EXPENSE, 500, \"food\", \"Lunch\"]]"
   
3. To suggest nearby places based on their current location/GPS:
   [[ACTION: GPS_SUGGEST]]
   Example user request: "Find tourist spots near my location."
   Example reply: "Let's fetch your GPS coordinates and search for local recommendations.\n\n[[ACTION: GPS_SUGGEST]]"

Always explain to the user in your message what you are doing before adding the command. Limit your command block to a single ACTION command at the end of the text. Do not output commands if they are not requested.`;
}

async function sendToGroq(userMessage, apiKey) {
    const tripContext = buildTripContext();
    const systemPrompt = buildSystemPrompt(tripContext);

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage }
    ];
    
    let lastError = 'No Groq models available.';
    for (const model of GROQ_MODELS) {
        try {
            console.log(`🤖 Trying Groq model: ${model}`);
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages,
                    max_tokens: 1000,
                    temperature: 0.7
                })
            });
            
            if (!response.ok) {
                let errMsg = `Groq ${model} → HTTP ${response.status}`;
                try { const e = await response.json(); errMsg = e.error?.message || errMsg; } catch (_) {}
                console.warn('Groq model failed, trying next:', errMsg);
                lastError = errMsg;
                continue;
            }
            
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content?.trim();
            if (!text) { lastError = `${model} returned empty response`; continue; }
            
            console.log(`✅ Groq response from: ${model}`);
            updateAIProviderBadge('Groq');
            return text;
        } catch (err) {
            console.warn('Groq error for model', model, err.message);
            lastError = err.message;
        }
    }
    throw new Error(lastError);
}

async function sendToOpenRouter(userMessage, apiKey) {
    const tripContext = buildTripContext();
    const systemPrompt = buildSystemPrompt(tripContext);
    
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage }
    ];
    
    let lastError = 'No free models available at the moment. Please try again later.';
    
    let modelsToTry = [...OPENROUTER_FREE_MODELS];
    let preferredModel = window._openrouterModel || 'auto';
    if (preferredModel === 'custom' && window._openrouterCustomModel) {
        preferredModel = window._openrouterCustomModel;
    }
    if (preferredModel && preferredModel !== 'auto') {
        modelsToTry.unshift(preferredModel);
    }
    
    for (const model of modelsToTry) {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'TravelMate AI'
                },
                body: JSON.stringify({
                    model,
                    messages,
                    max_tokens: 1000,
                    temperature: 0.7
                })
            });
            
            if (!response.ok) {
                let errMsg = `${model} → HTTP ${response.status}`;
                try { const e = await response.json(); errMsg = e.error?.message || errMsg; } catch (_) {}
                console.warn('OpenRouter model failed, trying next:', errMsg);
                lastError = errMsg;
                continue; // try next model
            }
            
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content?.trim();
            if (!text) { lastError = `${model} returned empty response`; continue; }
            
            console.log(`✅ OpenRouter response from: ${model}`);
            updateAIProviderBadge('OpenRouter');
            return text;
            
        } catch (networkErr) {
            console.warn('Network error for model', model, networkErr.message);
            lastError = networkErr.message;
        }
    }
    
    // If all OpenRouter models failed, try Groq fallback
    if (window._groqApiKey) {
        console.warn('OpenRouter failed. Attempting fallback to Groq...');
        try {
            return await sendToGroq(userMessage, window._groqApiKey);
        } catch (groqErr) {
            console.error('Groq fallback failed as well:', groqErr);
            throw new Error(`OpenRouter failed (${lastError}) AND Groq fallback failed (${groqErr.message})`);
        }
    }
    
    throw new Error(lastError);
}

function appendChatMessage(role, text, shouldSave = true) {
    const messagesEl = document.getElementById('ai-chat-messages');
    if (!messagesEl) return;
    
    // Strip action commands from user-facing display
    const cleanText = text.replace(/\[\[ACTION:[\s\S]*?\]\]/g, '').trim();
    
    const div = document.createElement('div');
    div.className = `ai-chat-message ${role}`;
    div.dataset.rawText = text; // store the raw unformatted text
    
    if (role === 'user') {
        div.innerHTML = `
            <div class="d-flex align-items-center justify-content-between w-100">
                <span class="msg-content-text">${cleanText}</span>
                <button class="edit-user-msg-btn text-white-50 border-0 bg-transparent btn-sm p-0 ms-2" style="cursor: pointer; background: none; display: flex; align-items: center;" title="Edit Prompt">
                    <i class="fas fa-pen" style="font-size: 0.7rem;"></i>
                </button>
            </div>
        `;
    } else {
        // Simple markdown: **bold**, [links](url), and newlines
        div.innerHTML = cleanText
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-decoration-underline text-success fw-bold">$1</a>')
            .replace(/\n/g, '<br>');
    }
    
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    
    if (shouldSave) {
        saveMessageToHistory(role, text); // save full text with commands
    }
    
    return div;
}

function getActiveTrip() {
    const trips = typeof userTrips !== 'undefined' && userTrips.length > 0 ? userTrips : (window.userTrips || []);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    function parseDate(val) {
        if (!val) return null;
        if (val.toDate) return val.toDate();
        if (val.seconds) return new Date(val.seconds * 1000);
        return new Date(val);
    }
    
    return trips.find(trip => {
        const start = parseDate(trip.startDate);
        const end = parseDate(trip.endDate);
        if (!start || !end) return false;
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return today >= start && today <= end;
    });
}

async function executeAddStop(stopName) {
    const activeTrip = getActiveTrip();
    if (!activeTrip) {
        appendChatMessage('assistant', '⚠️ No active trip found to add the stop.', false);
        return;
    }
    
    try {
        const tripRef = db.collection('trips').doc(activeTrip.id);
        const doc = await tripRef.get();
        if (!doc.exists) return;
        
        const currentStops = doc.data().stops || [];
        if (currentStops.map(s => s.toLowerCase()).includes(stopName.toLowerCase())) {
            appendChatMessage('assistant', `💡 *Stop "${stopName}" is already in your trip itinerary.*`, false);
            return;
        }
        
        currentStops.push(stopName);
        
        // Update Firestore
        await tripRef.update({
            stops: currentStops,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local trip representation
        activeTrip.stops = currentStops;
        
        // Trigger background stops calculation
        if (typeof calculateAndSaveStopsDistances === 'function') {
            calculateAndSaveStopsDistances(activeTrip);
        }
        
        appendChatMessage('assistant', `✅ *Stop Added:* Successfully added stop "${stopName}" to your active trip "${activeTrip.name}".`, false);
        
        // Refresh dashboard display
        if (typeof displayTrips === 'function') displayTrips();
        if (typeof updateDashboardActiveTripTracker === 'function') updateDashboardActiveTripTracker();
        
    } catch (e) {
        console.error('Error adding stop from AI:', e);
        appendChatMessage('assistant', `❌ *Failed to add stop "${stopName}" to your trip.*`, false);
    }
}

async function executeAddExpense(amount, category, description) {
    const activeTrip = getActiveTrip();
    if (!activeTrip) {
        appendChatMessage('assistant', '⚠️ No active trip found to record this expense.', false);
        return;
    }
    
    try {
        const user = auth.currentUser;
        if (!user) return;
        
        const tripRef = db.collection('trips').doc(activeTrip.id);
        const doc = await tripRef.get();
        if (!doc.exists) return;
        
        const currentExpenses = doc.data().expenses || [];
        const cleanCategory = String(category).trim().toLowerCase();
        
        const newExpense = {
            amount: parseFloat(amount),
            category: ['fuel', 'hotel', 'food', 'activities', 'other'].includes(cleanCategory) ? cleanCategory : 'other',
            description: description || 'AI Expense',
            date: new Date().toISOString().split('T')[0],
            addedBy: user.uid,
            createdAt: new Date().toISOString(),
            isPersonal: false,
            splits: []
        };
        
        currentExpenses.push(newExpense);
        
        // Update Firestore
        await tripRef.update({
            expenses: currentExpenses,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local representation
        activeTrip.expenses = currentExpenses;
        
        appendChatMessage('assistant', `✅ *Expense Recorded:* Added ₹${parseFloat(amount).toFixed(2)} under category "${newExpense.category}" for "${newExpense.description}".`, false);
        
        // Refresh dashboard
        if (typeof displayTrips === 'function') displayTrips();
        
    } catch (e) {
        console.error('Error adding expense from AI:', e);
        appendChatMessage('assistant', `❌ *Failed to record expense.*`, false);
    }
}

function executeGPSSuggest() {
    if (!navigator.geolocation) {
        appendChatMessage('assistant', '⚠️ GPS Geolocation is not supported by your browser.', false);
        return;
    }
    
    appendChatMessage('assistant', '🛰️ *Fetching your location from GPS...*', false);
    
    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        appendChatMessage('assistant', `📍 *Location fetched:* Latitude ${lat.toFixed(4)}, Longitude ${lng.toFixed(4)}. *Opening recommendations viewer in a new tab...*`, false);
        
        openAISuggestedPlacesTab(lat, lng);
        
    }, (error) => {
        console.error('GPS error:', error);
        appendChatMessage('assistant', `❌ *Could not fetch GPS location:* ${error.message}`, false);
    });
}

function openAISuggestedPlacesTab(lat, lng) {
    const newTab = window.open('', '_blank');
    if (!newTab) {
        appendChatMessage('assistant', '⚠️ *Pop-up blocked!* Please allow pop-ups to view AI Suggested Places.', false);
        return;
    }
    
    newTab.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>AI Travel Recommendations</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
            <style>
                :root {
                    --primary-color: #e65100;
                    --secondary-color: #ff6f00;
                    --bg-gradient: linear-gradient(135deg, #bf360c 0%, #e65100 100%);
                }
                body {
                    background-color: #f4f7f6;
                    font-family: 'Outfit', sans-serif;
                }
                .hero-section {
                    background: var(--bg-gradient);
                    color: white;
                    padding: 4rem 2rem;
                    border-bottom-left-radius: 30px;
                    border-bottom-right-radius: 30px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                }
                .card-suggestion {
                    border: none;
                    border-radius: 16px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                    background: white;
                    overflow: hidden;
                }
                .card-suggestion:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 15px 40px rgba(0,0,0,0.1);
                }
                .badge-category {
                    background-color: rgba(45, 106, 79, 0.1);
                    color: var(--primary-color);
                    font-weight: 600;
                    padding: 0.4em 0.8em;
                    border-radius: 8px;
                }
                .map-container {
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }
            </style>
        </head>
        <body>
            <div class="hero-section text-center">
                <div class="container">
                    <i class="fas fa-wand-magic-sparkles fa-3x mb-3 text-warning"></i>
                    <h1 class="fw-bold">AI Location Recommendations</h1>
                    <p class="lead">Nearby attractions and sightseeing suggestions based on your GPS coordinates</p>
                    <span class="badge bg-light text-dark px-3 py-2 mt-2">
                        <i class="fas fa-location-dot text-danger me-1"></i>\${lat.toFixed(5)}, \${lng.toFixed(5)}
                    </span>
                </div>
            </div>
            
            <div class="container my-5">
                <div class="row">
                    <div class="col-lg-8">
                        <h3 class="fw-bold mb-4"><i class="fas fa-compass me-2 text-success"></i>AI Recommended Places</h3>
                        <div id="suggestions-loading" class="text-center py-5">
                            <div class="spinner-border text-success" role="status" style="width: 3rem; height: 3rem;"></div>
                            <h5 class="mt-3 text-muted">Consulting geography experts...</h5>
                        </div>
                        <div id="suggestions-list" class="row g-4 d-none">
                            <!-- Populated dynamically -->
                        </div>
                    </div>
                    
                    <div class="col-lg-4 mt-5 mt-lg-0">
                        <h3 class="fw-bold mb-4"><i class="fas fa-map-location-dot me-2 text-success"></i>Quick Map</h3>
                        <div class="map-container">
                            <iframe 
                                width="100%" 
                                height="350" 
                                frameborder="0" 
                                scrolling="no" 
                                marginheight="0" 
                                marginwidth="0" 
                                src="https://www.openstreetmap.org/export/embed.html?bbox=\${lng-0.03}%2C\${lat-0.02}%2C\${lng+0.03}%2C\${lat+0.02}&layer=mapnik&marker=\${lat}%2C\${lng}">
                            </iframe>
                        </div>
                        <div class="mt-3 text-center">
                            <a href="https://www.openstreetmap.org/?mlat=\${lat}&mlon=\${lng}#map=15/\${lat}/\${lng}" target="_blank" class="btn btn-outline-success w-100">
                                <i class="fas fa-arrow-up-right-from-square me-2"></i>Open Full Map
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <script>
                // Async request to fetch AI suggestions for these coordinates
                async function fetchSuggestions() {
                    const apiKey = "${window._openrouterApiKey || window._groqApiKey || ''}";
                    const isGroq = !${!!window._openrouterApiKey} && ${!!window._groqApiKey};
                    
                    const prompt = \\\`You are a local travel guide. Provide 4 top tourist/sightseeing recommendations near coordinates: Latitude \${lat}, Longitude \${lng}.
For each place, provide name, category (e.g. Scenic, Historic, Food, Temple, Park), road distance from coordinates (estimate in km), and a short, exciting description (15-25 words).
Reply ONLY with a valid JSON array of objects with the fields: name, category, distance, description. Example:
[
  {"name": "Marine Drive", "category": "Scenic", "distance": "2.5 km", "description": "A beautiful promenade along the sea, perfect for sunsets and late night walks."},
  {"name": "Gateway of India", "category": "Historic", "distance": "3.8 km", "description": "The iconic arch monument overlooking the Mumbai harbor."}
]
Do NOT write any introduction or explanation outside the JSON.\\\`;

                    try {
                        const url = isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
                        const headers = { 'Content-Type': 'application/json' };
                        headers['Authorization'] = 'Bearer ' + apiKey;
                        
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: headers,
                            body: JSON.stringify({
                                model: isGroq ? 'llama-3.3-70b-versatile' : 'openrouter/free',
                                messages: [{ role: 'user', content: prompt }],
                                max_tokens: 400,
                                temperature: 0.6
                            })
                        });
                        
                        if (!response.ok) throw new Error('API failed');
                        
                        const data = await response.json();
                        const text = data.choices[0].message.content.trim();
                        const jsonMatch = text.match(/\\\\\\\\[[\\\\\\\s\\\\\\\S]*?\\\\\\\\\]/);
                        if (!jsonMatch) throw new Error('Invalid JSON structure');
                        
                        const places = JSON.parse(jsonMatch[0]);
                        renderPlaces(places);
                    } catch (e) {
                        console.error(e);
                        document.getElementById('suggestions-loading').innerHTML = \\\`
                            <div class="alert alert-warning">
                                <i class="fas fa-circle-exclamation me-2 fs-4"></i>
                                <strong>Could not load AI recommendations.</strong> Here are some nearby places on the map instead!
                            </div>
                        \\\`;
                    }
                }
                
                function renderPlaces(places) {
                    const list = document.getElementById('suggestions-list');
                    list.innerHTML = places.map(place => \\\`
                        <div class="col-md-6">
                            <div class="card card-suggestion h-100 p-4">
                                <div class="d-flex justify-content-between align-items-start mb-3">
                                    <span class="badge-category">\\\\\\\${place.category}</span>
                                    <span class="text-muted small"><i class="fas fa-location-arrow me-1"></i>\\\\\\\${place.distance}</span>
                                </div>
                                <h5 class="fw-bold text-success mb-2">\\\\\\\${place.name}</h5>
                                <p class="text-muted mb-0 small">\\\\\\\${place.description}</p>
                            </div>
                        </div>
                    \\\`).join('');
                    document.getElementById('suggestions-loading').classList.add('d-none');
                    list.classList.remove('d-none');
                }
                
                fetchSuggestions();
            </script>
        </body>
        </html>
    `);
    newTab.document.close();
}

function handleAIActionParsing(text) {
    if (!text) return;
    
    // Check for ADD_STOP
    const stopMatch = text.match(/\[\[ACTION:\s*ADD_STOP,\s*"([^"]+)"\]\]/i);
    if (stopMatch) {
        const stopName = stopMatch[1];
        executeAddStop(stopName);
        return;
    }
    
    // Check for ADD_EXPENSE
    const expenseMatch = text.match(/\[\[ACTION:\s*ADD_EXPENSE,\s*([\d.]+),\s*"([^"]*)",\s*"([^"]*)"\]\]/i);
    if (expenseMatch) {
        const amount = parseFloat(expenseMatch[1]);
        const category = expenseMatch[2];
        const description = expenseMatch[3];
        executeAddExpense(amount, category, description);
        return;
    }
    
    // Check for GPS_SUGGEST
    const gpsMatch = text.match(/\[\[ACTION:\s*GPS_SUGGEST\]\]/i);
    if (gpsMatch) {
        executeGPSSuggest();
        return;
    }
}

async function saveMessageToHistory(role, text) {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const userRef = db.collection('users').doc(user.uid);
        const doc = await userRef.get();
        let history = [];
        if (doc.exists && doc.data().chatHistory) {
            history = doc.data().chatHistory;
        }
        
        history.push({ role, text, timestamp: new Date().toISOString() });
        
        // Cap history at 50 messages to keep the document size lightweight
        if (history.length > 50) {
            history = history.slice(history.length - 50);
        }
        
        await userRef.update({ chatHistory: history });
    } catch (e) {
        console.warn('Error saving chat message to history:', e);
    }
}

async function loadChatHistory() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists && doc.data().chatHistory) {
            const history = doc.data().chatHistory;
            if (history.length > 0) {
                const messagesEl = document.getElementById('ai-chat-messages');
                if (messagesEl) {
                    messagesEl.innerHTML = ''; // Clear default welcome message
                    history.forEach(msg => {
                        appendChatMessage(msg.role, msg.text, false);
                    });
                }
            }
        }
    } catch (e) {
        console.warn('Could not load chat history:', e);
    }
}

function showTypingIndicator() {
    const messagesEl = document.getElementById('ai-chat-messages');
    if (!messagesEl) return null;
    const div = document.createElement('div');
    div.className = 'ai-chat-message assistant';
    div.id = 'ai-typing-indicator';
    div.innerHTML = '<span class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
}

async function triggerChatRegeneration(message) {
    const apiKey = await loadOpenRouterKey();
    if (!apiKey) {
        appendChatMessage('assistant',
            '⚠️ No OpenRouter API key found. Go to **Profile → OpenRouter API Key** and paste your free key to enable AI features.');
        return;
    }
    
    const typingIndicator = showTypingIndicator();
    const sendBtn = document.getElementById('ai-chat-send');
    if (sendBtn) sendBtn.disabled = true;
    
    try {
        const reply = await sendToOpenRouter(message, apiKey);
        if (typingIndicator) typingIndicator.remove();
        appendChatMessage('assistant', reply);
        
        // Parse and execute agentic actions from chatbot responses
        handleAIActionParsing(reply);
    } catch (err) {
        if (typingIndicator) typingIndicator.remove();
        console.error('OpenRouter API error:', err);
        let errorMsg = `❌ **Error**: ${err.message}`;
        appendChatMessage('assistant', errorMsg);
    } finally {
        if (sendBtn) sendBtn.disabled = false;
    }
}

async function handleChatSend() {
    const input = document.getElementById('ai-chat-input');
    const message = input ? input.value.trim() : '';
    if (!message) return;
    
    input.value = '';
    appendChatMessage('user', message);
    
    const apiKey = await loadOpenRouterKey();
    if (!apiKey) {
        appendChatMessage('assistant',
            '⚠️ No OpenRouter API key found. Go to **Profile → OpenRouter API Key** and paste your free key from [openrouter.ai/keys](https://openrouter.ai/keys) to enable AI features.');
        return;
    }
    
    const typingIndicator = showTypingIndicator();
    const sendBtn = document.getElementById('ai-chat-send');
    if (sendBtn) sendBtn.disabled = true;
    
    try {
        const reply = await sendToOpenRouter(message, apiKey);
        if (typingIndicator) typingIndicator.remove();
        appendChatMessage('assistant', reply);
        
        // Parse and execute agentic actions from chatbot responses
        handleAIActionParsing(reply);
    } catch (err) {
        if (typingIndicator) typingIndicator.remove();
        console.error('OpenRouter API error:', err);
        
        let errorMsg = `❌ **Error**: ${err.message}`;
        const errStr = String(err.message).toLowerCase();
        if (errStr.includes('rate limit') || errStr.includes('rate_limit') || errStr.includes('429')) {
            errorMsg = `❌ **Rate Limit Exceeded**
            
You have reached the daily limit for free AI models on OpenRouter.

**How to fix this:**
1. **Add credits**: Go to [openrouter.ai/credits](https://openrouter.ai/credits) and add a small amount (minimum $5) to unlock **1000 free requests per day** and use paid models.
2. **Switch to a Paid Model**: Go to **Profile → AI Model Preference** (click your avatar at top-right) and select a high-quality paid model like **Google Gemini 2.5 Flash** (costs less than $0.05 for hundreds of questions).
3. **Wait it out**: Your free limit resets daily.`;
        } else {
            errorMsg += `\n\nCheck your API key is valid at [openrouter.ai/keys](https://openrouter.ai/keys) and has credits for free models.`;
        }
        appendChatMessage('assistant', errorMsg);
    } finally {
        if (sendBtn) sendBtn.disabled = false;
    }
}

function updateAIProviderBadge(activeProvider) {
    const badge = document.getElementById('ai-chat-provider-badge');
    if (!badge) return;
    
    if (activeProvider) {
        if (activeProvider === 'OpenRouter') {
            let preferredModel = window._openrouterModel || 'auto';
            if (preferredModel === 'custom' && window._openrouterCustomModel) {
                preferredModel = window._openrouterCustomModel;
            }
            const modelName = preferredModel === 'auto' ? 'Free Models' : preferredModel.split('/').pop();
            badge.className = 'badge bg-success-subtle text-success';
            badge.innerHTML = `<i class="fas fa-network-wired me-1"></i>OpenRouter (${modelName})`;
        } else if (activeProvider === 'Groq') {
            badge.className = 'badge bg-warning-subtle text-warning';
            badge.innerHTML = '<i class="fas fa-bolt me-1"></i>Groq (Fallback)';
        }
        return;
    }
    
    if (window._openrouterApiKey) {
        let preferredModel = window._openrouterModel || 'auto';
        if (preferredModel === 'custom' && window._openrouterCustomModel) {
            preferredModel = window._openrouterCustomModel;
        }
        const modelName = preferredModel === 'auto' ? 'Free Models' : preferredModel.split('/').pop();
        badge.className = 'badge bg-success-subtle text-success';
        badge.innerHTML = `<i class="fas fa-network-wired me-1"></i>OpenRouter (${modelName})`;
    } else if (window._groqApiKey) {
        badge.className = 'badge bg-warning-subtle text-warning';
        badge.innerHTML = '<i class="fas fa-bolt me-1"></i>Groq (Fallback)';
    } else {
        badge.className = 'badge bg-secondary-subtle text-secondary';
        badge.innerHTML = '<i class="fas fa-eye-slash me-1"></i>No AI Key';
    }
}

function initAIChatbot() {
    const widget    = document.getElementById('ai-chat-widget');
    const toggleBtn = document.getElementById('ai-chat-toggle');
    const closeBtn  = document.getElementById('ai-chat-close');
    const container = document.getElementById('ai-chat-container');
    const sendBtn   = document.getElementById('ai-chat-send');
    const inputEl   = document.getElementById('ai-chat-input');
    const chips     = document.querySelectorAll('.ai-chat-suggestion-chip');
    
    if (!widget || !toggleBtn) return;
    
    // Prevent double-binding on re-init
    if (widget.dataset.chatInitialized) return;
    widget.dataset.chatInitialized = 'true';
    
    // Show the widget only for logged-in users
    widget.style.display = 'block';
    
    toggleBtn.addEventListener('click', () => {
        const isOpen = container.classList.toggle('active');
        const img = toggleBtn.querySelector('#ai-chat-toggle-img');
        const icon = toggleBtn.querySelector('#ai-chat-toggle-close-icon');
        if (img && icon) {
            if (isOpen) {
                img.classList.add('d-none');
                icon.classList.remove('d-none');
            } else {
                img.classList.remove('d-none');
                icon.classList.add('d-none');
            }
        }
    });
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            container.classList.remove('active');
            const img = toggleBtn.querySelector('#ai-chat-toggle-img');
            const icon = toggleBtn.querySelector('#ai-chat-toggle-close-icon');
            if (img && icon) {
                img.classList.remove('d-none');
                icon.classList.add('d-none');
            }
        });
    }
    
    if (sendBtn) sendBtn.addEventListener('click', handleChatSend);
    
    if (inputEl) {
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleChatSend();
            }
        });
    }
    
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            if (inputEl) inputEl.value = chip.dataset.query;
            handleChatSend();
        });
    });
    
    // Delegated click handler for editing messages
    const messagesEl = document.getElementById('ai-chat-messages');
    if (messagesEl) {
        messagesEl.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.edit-user-msg-btn');
            if (editBtn) {
                const messageDiv = editBtn.closest('.ai-chat-message');
                if (!messageDiv) return;
                
                // Prevent editing multiple times simultaneously
                if (messageDiv.classList.contains('editing')) return;
                messageDiv.classList.add('editing');
                
                const rawText = messageDiv.dataset.rawText || '';
                const contentSpan = messageDiv.querySelector('.msg-content-text');
                if (!contentSpan) return;
                
                // Store original HTML to restore if cancelled
                const originalHTML = messageDiv.innerHTML;
                
                messageDiv.innerHTML = `
                    <div class="w-100 mt-1">
                        <textarea class="form-control form-control-sm mb-2 edit-chat-textarea" rows="2" style="font-size: 0.8rem; border-radius: 8px; color: #1e293b; background-color: #fff;">${rawText}</textarea>
                        <div class="d-flex justify-content-end gap-1">
                            <button class="btn btn-xs btn-light text-dark py-0 px-2 cancel-edit-btn" style="font-size: 0.75rem; border-radius: 6px;">Cancel</button>
                            <button class="btn btn-xs btn-success py-0 px-2 save-edit-btn" style="font-size: 0.75rem; border-radius: 6px;">Save & Resend</button>
                        </div>
                    </div>
                `;
                
                const textarea = messageDiv.querySelector('.edit-chat-textarea');
                textarea?.focus();
                
                // Handle Cancel
                messageDiv.querySelector('.cancel-edit-btn').addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    messageDiv.classList.remove('editing');
                    messageDiv.innerHTML = originalHTML;
                });
                
                // Handle Save
                messageDiv.querySelector('.save-edit-btn').addEventListener('click', async (ev) => {
                    ev.stopPropagation();
                    const newText = textarea.value.trim();
                    if (!newText) return;
                    
                    messageDiv.classList.remove('editing');
                    
                    // 1. Get index of this message
                    const allMessages = Array.from(messagesEl.children);
                    const index = allMessages.indexOf(messageDiv);
                    
                    // 2. Remove all subsequent messages from the DOM
                    while (messagesEl.children.length > index + 1) {
                        messagesEl.removeChild(messagesEl.lastChild);
                    }
                    
                    // 3. Update the edited message div text
                    messageDiv.dataset.rawText = newText;
                    messageDiv.innerHTML = `
                        <div class="d-flex align-items-center justify-content-between w-100">
                            <span class="msg-content-text">${newText}</span>
                            <button class="edit-user-msg-btn text-white-50 border-0 bg-transparent btn-sm p-0 ms-2" style="cursor: pointer; background: none; display: flex; align-items: center;" title="Edit Prompt">
                                <i class="fas fa-pen" style="font-size: 0.7rem;"></i>
                            </button>
                        </div>
                    `;
                    
                    // 4. Update the Firestore history
                    const user = auth.currentUser;
                    if (user) {
                        try {
                            const userRef = db.collection('users').doc(user.uid);
                            const doc = await userRef.get();
                            if (doc.exists && doc.data().chatHistory) {
                                let history = doc.data().chatHistory;
                                history = history.slice(0, index);
                                history.push({ role: 'user', text: newText, timestamp: new Date().toISOString() });
                                await userRef.update({ chatHistory: history });
                            }
                        } catch (err) {
                            console.warn('Error updating chat history for edit:', err);
                        }
                    }
                    
                    // 5. Trigger regeneration of reply
                    triggerChatRegeneration(newText);
                });
            }
        });
    }
    
    // Clear chat button event listener
    const clearBtn = document.getElementById('ai-chat-clear');
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to clear your chat history?')) {
                const messagesEl = document.getElementById('ai-chat-messages');
                if (messagesEl) {
                    messagesEl.innerHTML = `
                        <div class="ai-chat-message assistant">
                            Hello! I am your AI Travel Assistant. If you have an active trip, I can help you optimize your route stops, calculate exact mileage, suggest budget splits, or find cool places to visit. Ask me anything!
                        </div>
                    `;
                }
                
                const user = auth.currentUser;
                if (user) {
                    try {
                        await db.collection('users').doc(user.uid).update({
                            chatHistory: firebase.firestore.FieldValue.delete()
                        });
                        showToast('Chat history cleared.', 'success');
                    } catch (e) {
                        console.warn('Error clearing chat history:', e);
                    }
                }
            }
        });
    }
    
    // Load existing chat history from Firestore
    loadChatHistory();
    
    // Show setup tip if no key is stored yet
    loadOpenRouterKey().then(key => {
        updateAIProviderBadge();
        if (!key) {
            const messagesEl = document.getElementById('ai-chat-messages');
            if (messagesEl && (messagesEl.children.length === 1 && messagesEl.firstElementChild.classList.contains('assistant'))) {
                appendChatMessage('assistant',
                    '💡 **Get started**: Add your free OpenRouter key in **Profile → OpenRouter API Key**.\n\nGet one free at [openrouter.ai/keys](https://openrouter.ai/keys) — then I can optimize your route stops, calculate mileage, and suggest cool places along your journey!',
                    false); // Don't persist this system tip
            }
        }
    });
}

// Initialize chatbot when auth state confirms the user is logged in
// (called inside the onAuthStateChanged listener)

