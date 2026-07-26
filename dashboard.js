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
        initGlobalSearch();
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
    
    // Hero photo upload file input — wired dynamically inside renderTripHero() each render.
    // The initial wire is done here as a fallback for first page load.
    const slideshowQuickInput = document.getElementById('slideshow-quick-photo-input');
    if (slideshowQuickInput) {
        slideshowQuickInput.addEventListener('change', handleQuickActiveTripPhotoUpload);
    }
    
    // Modal photo upload inputs (Create & Edit trip modals)
    const tripImgInput = document.getElementById('trip-image-input');
    if (tripImgInput) {
        tripImgInput.addEventListener('change', (e) => handleTripPhotoUpload(e, false));
    }
    const editTripImgInput = document.getElementById('edit-trip-image-input');
    if (editTripImgInput) {
        editTripImgInput.addEventListener('change', (e) => handleTripPhotoUpload(e, true));
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
// TRIP COMMAND CENTER HERO
// =========================================================================

let _heroCountdownInterval = null;

/**
 * Main entry point — replaces the old carousel slideshow.
 * Called from updateDashboardActiveTripTracker().
 */
function renderTripHero(activeTrip) {
    const section = document.getElementById('trip-hero-section');
    if (!section) return;

    // Clear any existing countdown ticker
    if (_heroCountdownInterval) {
        clearInterval(_heroCountdownInterval);
        _heroCountdownInterval = null;
    }

    if (activeTrip) {
        section.innerHTML = _buildActiveTripHero(activeTrip);
        _wireHeroButtons(activeTrip);
        _startHeroCountdown(activeTrip);
    } else {
        // No active trip — show upcoming trips preview
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcoming = (window.userTrips || [])
            .filter(t => new Date(t.startDate) > today)
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
            .slice(0, 3);
        section.innerHTML = _buildNoTripHero(upcoming);
        _wireNoTripButtons();
    }

    // Wire the photo-upload file input (kept outside hero in HTML)
    const quickInput = document.getElementById('slideshow-quick-photo-input');
    if (quickInput) {
        // Remove any old listener and add fresh one
        const newInput = quickInput.cloneNode(true);
        quickInput.parentNode.replaceChild(newInput, quickInput);
        newInput.addEventListener('change', handleQuickActiveTripPhotoUpload);
    }
}

// ── Countdown helpers ──────────────────────────────────────────────────────

function _formatCountdown(ms) {
    if (ms <= 0) return '0m';
    const totalSec = Math.floor(ms / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function _startHeroCountdown(activeTrip) {
    const endDate = new Date(activeTrip.endDate);
    endDate.setHours(23, 59, 59, 999);

    function tick() {
        const now = Date.now();
        const remaining = endDate - now;
        const el = document.getElementById('hero-countdown-value');
        if (el) {
            if (remaining <= 0) {
                el.textContent = 'Done!';
            } else {
                el.textContent = _formatCountdown(remaining);
            }
        }

        // Live departure countdown for train tickets
        document.querySelectorAll('.train-dep-countdown').forEach(cdEl => {
            const depMs = parseInt(cdEl.getAttribute('data-dep-ms'));
            if (!depMs) return;
            const diff = depMs - now;
            if (diff <= 0) {
                cdEl.textContent = 'Departed / In Transit';
                if (cdEl.parentElement) {
                    cdEl.parentElement.style.background = 'rgba(102,187,106,0.22)';
                    cdEl.parentElement.style.borderColor = 'rgba(102,187,106,0.4)';
                    cdEl.parentElement.style.color = '#a5d6a7';
                }
            } else {
                cdEl.textContent = 'Departs in ' + _formatCountdown(diff);
            }
        });
    }
    tick();
    _heroCountdownInterval = setInterval(tick, 1000);
}

// ── Transport icon helper ──────────────────────────────────────────────────

function _transportIcon(mode) {
    const m = (mode || 'car').toLowerCase();
    const map = {
        car: 'fa-car', flight: 'fa-plane', train: 'fa-train',
        bus: 'fa-bus', public: 'fa-train-subway'
    };
    return map[m] || 'fa-car';
}
function _transportColor(mode) {
    const m = (mode || 'car').toLowerCase();
    const map = { car: '#6ee09e', flight: '#90caf9', train: '#80deea', bus: '#ffe082', public: '#b39ddb' };
    return map[m] || '#6ee09e';
}
function _transportLabel(mode) {
    const m = (mode || 'car').toLowerCase();
    const map = { car: 'Car', flight: 'Flight', train: 'Train', bus: 'Bus', public: 'Public' };
    return map[m] || 'Car';
}

// ── Active trip hero HTML builder ──────────────────────────────────────────

function _buildActiveTripHero(trip) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(trip.startDate);
    const endDate   = new Date(trip.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const totalDays   = Math.round((endDate - startDate) / 86400000) + 1;
    const dayOfTrip   = Math.max(1, Math.round((today - startDate) / 86400000) + 1);
    const totalSpent  = (trip.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    const budget      = trip.budget || 0;
    const budgetPct   = budget > 0 ? Math.min(100, (totalSpent / budget) * 100) : 0;
    const budgetColor = budgetPct > 85 ? '#ef5350' : budgetPct > 60 ? '#ffa726' : '#66bb6a';
    const totalDist   = parseFloat(trip.route?.distance) || parseFloat(trip.distance) || 0;
    const mode        = (trip.transportMode || 'car').toLowerCase();
    const icon        = _transportIcon(mode);
    const iconColor   = _transportColor(mode);
    const modeLabel   = _transportLabel(mode);

    // Background photo (first image if any)
    const photoBg = (trip.images && trip.images[0])
        ? `<div class="trip-hero-photo-bg" style="background-image:url('${trip.images[0]}');"></div>`
        : '';

    // Upcoming trips for the side panel
    const allTrips    = window.userTrips || [];
    const nowTs       = Date.now();
    const upcomingList = allTrips
        .filter(t => new Date(t.startDate) > today && t.id !== trip.id)
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        .slice(0, 3);

    // Upcoming train tickets panel — strictly trains departing within the next 12 hours
    const now = Date.now();
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    const trainTickets = (trip.tickets || [])
        .filter(t => {
            // Must be train type (or default if type is unspecified/train)
            const isTrain = (t.type === 'train' || (!t.type && (t.serviceNo || t.operator)));
            if (!isTrain) return false;
            
            const depMs = _getDepartureMs(t.departureTime, trip.startDate);
            if (!depMs) return true; // Keep if time not specified
            return depMs > now && depMs <= (now + twelveHoursMs);
        })
        .sort((a, b) => {
            const da = _getDepartureMs(a.departureTime, trip.startDate) || 0;
            const db2 = _getDepartureMs(b.departureTime, trip.startDate) || 0;
            return da - db2;
        });

    const manualTd = trip.trainDetails || {};
    const trainPanel = (trainTickets.length > 0 || manualTd.number || manualTd.name || mode === 'train' || mode === 'public')
        ? _buildTrainPanel(trainTickets, manualTd, trip.id)
        : '';

    // Countdown end
    const endTs = endDate.getTime();
    const remainMs = endTs - Date.now();

    const sDateStr = startDate.toLocaleDateString(undefined, { month:'short', day:'numeric' });
    const eDateStr = endDate.toLocaleDateString(undefined, { month:'short', day:'numeric' });

    return `
    <div class="trip-hero-bg" style="position:relative;">
        ${photoBg}
        <div style="position:relative; z-index:2;">

            <!-- Top badges row -->
            <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
                <span class="hero-live-badge"><span class="pulse-dot"></span>Active</span>
                <span class="hero-day-badge"><i class="fas ${icon} me-1" style="color:${iconColor};"></i>Day ${dayOfTrip} of ${totalDays} · ${modeLabel}</span>
                <span class="hero-day-badge"><i class="far fa-calendar-alt me-1"></i>${sDateStr} – ${eDateStr}</span>
            </div>

            <!-- Trip title -->
            <div class="hero-trip-title">🧳 ${trip.name || 'Active Trip'}</div>

            <!-- Route row -->
            <div class="hero-route-row">
                <span class="hero-route-chip"><i class="fas fa-circle-play" style="color:#66bb6a; font-size:0.75rem;"></i>${trip.startLocation || '—'}</span>
                ${(trip.stops && trip.stops.length > 0)
                    ? trip.stops.slice(0,2).map(s => {
                        const n = typeof s === 'object' ? s.name : s;
                        return `<span class="hero-route-arrow">›</span><span class="hero-route-chip"><i class="fas fa-location-dot" style="color:#ffa726; font-size:0.75rem;"></i>${n}</span>`;
                    }).join('') + (trip.stops.length > 2 ? `<span class="hero-route-arrow">›</span><span class="hero-route-chip" style="opacity:0.65;">+${trip.stops.length-2} stops</span>` : '')
                    : ''}
                <span class="hero-route-arrow">›</span>
                <span class="hero-route-chip"><i class="fas fa-flag-checkered" style="color:#ef5350; font-size:0.75rem;"></i>${trip.destination || '—'}</span>
            </div>

            <!-- Stats + countdown row -->
            <div class="d-flex gap-3 flex-wrap align-items-start mb-0">

                <!-- Stats pills -->
                <div class="hero-stats-row flex-grow-1" style="margin-bottom:0;">

                    <!-- Budget pill -->
                    <div class="hero-stat-pill">
                        <span class="stat-label"><i class="fas fa-wallet me-1"></i>Budget</span>
                        <div class="stat-value">₹${totalSpent.toLocaleString('en-IN')}<span style="font-size:0.75rem; font-weight:500; color:rgba(255,255,255,0.5);"> / ₹${budget.toLocaleString('en-IN')}</span></div>
                        <div class="hero-budget-bar">
                            <div class="progress mt-1">
                                <div class="progress-bar" role="progressbar" style="width:${budgetPct.toFixed(1)}%; background:${budgetColor};"></div>
                            </div>
                        </div>
                        <span class="stat-sub">${budget > 0 ? `₹${(budget - totalSpent).toLocaleString('en-IN')} remaining` : 'No budget set'}</span>
                    </div>

                    <!-- Distance pill -->
                    ${totalDist > 0 ? `
                    <div class="hero-stat-pill">
                        <span class="stat-label"><i class="fas fa-route me-1"></i>Distance</span>
                        <div class="stat-value">${totalDist.toFixed(0)} <span style="font-size:0.75rem; font-weight:500; color:rgba(255,255,255,0.5);">km</span></div>
                        <span class="stat-sub">${trip.startLocation} → ${trip.destination}</span>
                    </div>` : ''}

                    <!-- Photos pill -->
                    <div class="hero-stat-pill" style="cursor:pointer;" id="hero-add-photo-pill" title="Add trip photos">
                        <span class="stat-label"><i class="fas fa-camera me-1"></i>Photos</span>
                        <div class="stat-value">${(trip.images||[]).length}</div>
                        <span class="stat-sub">Tap to add</span>
                    </div>
                </div>

                <!-- Countdown block -->
                <div class="hero-countdown-block flex-shrink-0">
                    <div class="hero-countdown-value" id="hero-countdown-value">${_formatCountdown(remainMs)}</div>
                    <div class="hero-countdown-label">Trip ends in</div>
                </div>

                <!-- Upcoming panel (hidden on very small) -->
                ${upcomingList.length > 0 ? `
                <div class="hero-upcoming-panel flex-shrink-0 d-none d-md-block" style="min-width:180px; max-width:220px;">
                    <div class="hero-upcoming-title"><i class="fas fa-calendar-days me-1"></i>Upcoming</div>
                    ${upcomingList.map(t => {
                        const daysLeft = Math.ceil((new Date(t.startDate) - Date.now()) / 86400000);
                        const uIcon = _transportIcon(t.transportMode);
                        const chipColor = daysLeft <= 3 ? 'background:#ef535022; color:#ef9a9a;' : daysLeft <= 7 ? 'background:#ffa72622; color:#ffcc80;' : 'background:#66bb6a22; color:#a5d6a7;';
                        return `
                        <div class="hero-upcoming-item">
                            <div class="hero-upcoming-icon"><i class="fas ${uIcon}" style="color:${_transportColor(t.transportMode)};"></i></div>
                            <span class="hero-upcoming-name" title="${t.name}">${t.name}</span>
                            <span class="hero-upcoming-chip" style="${chipColor}">${daysLeft}d</span>
                        </div>`;
                    }).join('')}
                </div>` : ''}
            </div>

            <!-- Train panel -->
            ${trainPanel}

            <!-- Quick actions bar -->
            <div class="hero-actions-bar">
                <button class="hero-action-btn primary" id="hero-gps-track-btn" data-trip-id="${trip.id}">
                    <i class="fas fa-location-crosshairs"></i>GPS Track
                </button>
                <button class="hero-action-btn info-btn" id="hero-photo-btn">
                    <i class="fas fa-camera"></i>Add Photos
                    <span id="hero-photo-count" style="opacity:0.7;">${(trip.images||[]).length > 0 ? `(${trip.images.length})` : ''}</span>
                </button>
                <a class="hero-action-btn" href="trip-details.html?id=${trip.id}" id="hero-view-trip-btn">
                    <i class="fas fa-map-marked-alt"></i>View Trip
                </a>
                <button class="hero-action-btn" id="hero-update-progress-btn" data-trip-id="${trip.id}" data-total-dist="${totalDist}">
                    <i class="fas fa-edit"></i>Progress
                </button>
            </div>

        </div>
    </div>`;
}

// ── Train panel builder ────────────────────────────────────────────────────

/**
 * Builds the upcoming train panel in the hero.
 * @param {Array}  tickets  - upcoming train tickets from trip.tickets (type === train)
 * @param {Object} manualTd - manually saved trainDetails fallback
 * @param {string} tripId
 */
function _buildTrainPanel(tickets, manualTd, tripId) {
    const typeIconMap = { train: 'fa-train', flight: 'fa-plane', bus: 'fa-bus', public: 'fa-train-subway' };
    const typeColorMap = { train: '#80deea', flight: '#90caf9', bus: '#ffe082', public: '#b39ddb' };
    const typeLabelMap = { train: 'Train', flight: 'Flight', bus: 'Bus', public: 'Transit' };

    // Build first-ticket pre-fill values for the manual edit form
    const firstTkt = tickets[0] || {};
    const prefill = {
        number:    firstTkt.serviceNo     || manualTd.number    || '',
        name:      firstTkt.serviceName   || manualTd.name      || '',
        departure: _extractTime(firstTkt.departureTime) || manualTd.departure || '',
        arrival:   _extractTime(firstTkt.arrivalTime)   || manualTd.arrival   || '',
        platform:  manualTd.platform || '',
        coach:     firstTkt.seatNo   || manualTd.coach || '',
    };

    // ── Ticket rows from trip.tickets ────────────────────────────────────────
    let ticketsHtml = '';
    if (tickets.length > 0) {
        ticketsHtml = tickets.map(tkt => {
            const tIcon  = typeIconMap[tkt.type]  || 'fa-train';
            const tColor = typeColorMap[tkt.type] || '#80deea';
            const depTime = _extractTime(tkt.departureTime);
            const arrTime = _extractTime(tkt.arrivalTime);
            const depStn  = tkt.depCode   || tkt.departurePlace || '';
            const arrStn  = tkt.arrCode   || tkt.arrivalPlace   || '';
            const pnr     = tkt.ticketNo  || '';
            const seat    = tkt.seatNo    || '';
            const status  = tkt.bookingStatus || '';
            const statusColor = status.toLowerCase().includes('confirm') ? '#66bb6a'
                              : status.toLowerCase().includes('wait')    ? '#ffa726'
                              : status.toLowerCase().includes('cancel')  ? '#ef5350'
                              : '#90a4ae';
            const depMs = _getDepartureMs(tkt.departureTime);
            const countdownChip = depMs ? `
                <span class="hero-train-chip" style="background:rgba(239,83,80,0.22); border-color:rgba(239,83,80,0.45); color:#ff8a80; font-weight:700;">
                    <i class="fas fa-stopwatch me-1"></i><span class="train-dep-countdown" data-dep-ms="${depMs}">Departs in ${_formatCountdown(depMs - Date.now())}</span>
                </span>` : '';

            const isConc = tkt.isConcession || (tkt.generalFare > 0 && tkt.generalFare > tkt.cost);
            const concSaved = tkt.concessionSavings !== undefined ? tkt.concessionSavings : Math.max(0, (tkt.generalFare || 0) - (tkt.cost || 0));
            const concChip = isConc ? `
                <span class="hero-train-chip" style="background:rgba(13,202,240,0.18); border-color:rgba(13,202,240,0.4); color:#80deea;">
                    <i class="fas fa-wheelchair me-1"></i>Divyangjan${concSaved > 0 ? ` (Saved ₹${concSaved.toFixed(0)})` : ''}
                </span>` : '';

            return `
            <div style="margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.08);">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:5px;">
                    <i class="fas ${tIcon}" style="color:${tColor};"></i>
                    ${tkt.serviceNo   ? `<span class="hero-train-chip" style="border-color:${tColor}40; background:${tColor}18;"><i class="fas fa-hashtag"></i>${tkt.serviceNo}</span>` : ''}
                    ${tkt.serviceName ? `<span class="hero-train-chip" style="border-color:${tColor}40; background:${tColor}18;"><i class="fas fa-id-badge"></i>${tkt.serviceName}</span>` : ''}
                    ${tkt.operator && tkt.operator !== tkt.serviceName ? `<span class="hero-train-chip" style="border-color:${tColor}40; background:${tColor}18;"><i class="fas fa-building"></i>${tkt.operator}</span>` : ''}
                    ${countdownChip}
                    ${concChip}
                    ${status ? `<span class="hero-train-chip" style="background:${statusColor}22; border-color:${statusColor}44; color:${statusColor};">${status}</span>` : ''}
                    <button type="button" class="hero-action-btn primary ms-auto" style="padding:2px 10px; font-size:0.72rem; background:rgba(33,150,243,0.25); border-color:rgba(33,150,243,0.45); color:#90caf9;" onclick="openHeroTicketModal(event, '${tkt.id}')">
                        <i class="fas fa-ticket-alt me-1"></i>View Ticket
                    </button>
                    ${tkt.serviceNo ? `<button type="button" class="hero-action-btn primary ms-1" style="padding:2px 10px; font-size:0.72rem; background:rgba(40,200,100,0.22); border-color:rgba(40,200,100,0.4); color:#52d68a;" onclick="fetchAndShowLiveTrainStatus(event, '${tkt.serviceNo}', null, '${(tkt.serviceName || tkt.operator || '').replace(/'/g, "\\'")}', '${(tkt.depCode || tkt.departurePlace || '').replace(/'/g, "\\'")}')"><i class="fas fa-satellite-dish me-1"></i>Live Status</button>` : ''}
                    <button type="button" class="hero-action-btn primary ms-1" style="padding:2px 10px; font-size:0.72rem; background:rgba(234,179,8,0.22); border-color:rgba(234,179,8,0.45); color:#fde047;" onclick="togglePassengerOnTrainGps(event)" title="Track your current physical location on train using phone GPS">
                        <i class="fas fa-location-crosshairs me-1"></i>Track My GPS
                    </button>
                </div>
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    ${depStn  ? `<span class="hero-train-chip"><i class="fas fa-circle-play" style="color:#66bb6a; font-size:0.7rem;"></i>${depStn}</span>` : ''}
                    ${depTime ? `<span class="hero-train-chip"><i class="fas fa-arrow-right-from-bracket"></i>${depTime}</span>` : ''}
                    ${(depStn || depTime) && (arrStn || arrTime) ? `<span style="color:rgba(255,255,255,0.3); font-size:0.8rem;">›</span>` : ''}
                    ${arrTime ? `<span class="hero-train-chip"><i class="fas fa-arrow-right-to-bracket"></i>${arrTime}</span>` : ''}
                    ${arrStn  ? `<span class="hero-train-chip"><i class="fas fa-flag-checkered" style="color:#ef5350; font-size:0.7rem;"></i>${arrStn}</span>` : ''}
                    ${pnr     ? `<span class="hero-train-chip"><i class="fas fa-qrcode"></i>PNR: ${pnr}</span>` : ''}
                    ${seat    ? `<span class="hero-train-chip"><i class="fas fa-couch"></i>${seat}</span>` : ''}
                </div>
            </div>`;
        }).join('');
    } else {
        // No tickets — show manual trainDetails chips or empty state
        const hasMd = manualTd.number || manualTd.name || manualTd.departure;
        if (hasMd) {
            ticketsHtml = `
            <div style="display:flex; flex-wrap:wrap; gap:4px; align-items:center;">
                ${manualTd.number    ? `<span class="hero-train-chip"><i class="fas fa-train"></i>${manualTd.number}</span>` : ''}
                ${manualTd.name      ? `<span class="hero-train-chip"><i class="fas fa-id-badge"></i>${manualTd.name}</span>` : ''}
                ${manualTd.departure ? `<span class="hero-train-chip"><i class="fas fa-arrow-right-from-bracket"></i>Dep ${manualTd.departure}</span>` : ''}
                ${manualTd.arrival   ? `<span class="hero-train-chip"><i class="fas fa-arrow-right-to-bracket"></i>Arr ${manualTd.arrival}</span>` : ''}
                ${manualTd.platform  ? `<span class="hero-train-chip"><i class="fas fa-grip-lines-vertical"></i>PF ${manualTd.platform}</span>` : ''}
                ${manualTd.coach     ? `<span class="hero-train-chip"><i class="fas fa-couch"></i>${manualTd.coach}</span>` : ''}
                <button type="button" class="hero-action-btn primary ms-auto" style="padding:2px 10px; font-size:0.72rem; background:rgba(33,150,243,0.25); border-color:rgba(33,150,243,0.45); color:#90caf9;" onclick="openHeroTicketModal(event, 'manual')">
                    <i class="fas fa-ticket-alt me-1"></i>View Ticket
                </button>
                ${manualTd.number ? `<button type="button" class="hero-action-btn primary ms-1" style="padding:2px 10px; font-size:0.72rem; background:rgba(40,200,100,0.22); border-color:rgba(40,200,100,0.4); color:#52d68a;" onclick="fetchAndShowLiveTrainStatus(event, '${manualTd.number}', null, '${(manualTd.name || '').replace(/'/g, "\\'")}')"><i class="fas fa-satellite-dish me-1"></i>Live Status</button>` : ''}
                <button type="button" class="hero-action-btn primary ms-1" style="padding:2px 10px; font-size:0.72rem; background:rgba(234,179,8,0.22); border-color:rgba(234,179,8,0.45); color:#fde047;" onclick="togglePassengerOnTrainGps(event)">
                    <i class="fas fa-location-crosshairs me-1"></i>Track My GPS
                </button>
            </div>`;
        } else {
            ticketsHtml = `<span style="font-size:0.78rem; color:rgba(255,255,255,0.4);"><i class="fas fa-circle-info me-1"></i>No train departing in the next 12 hours. <a href="trip-details.html?id=${tripId}&tab=tickets" style="color:#80deea;">Add in Trip Details →</a></span>`;
        }
    }

    return `
    <div class="hero-train-panel mb-3">
        <div class="d-flex align-items-center gap-2 mb-2">
            <i class="fas fa-train" style="color:#80deea;"></i>
            <span style="font-size:0.78rem; font-weight:700; color:rgba(255,255,255,0.85); text-transform:uppercase; letter-spacing:0.5px;">
                Upcoming Train
                ${tickets.length > 0 ? `<span style="background:rgba(128,222,234,0.2); border:1px solid rgba(128,222,234,0.3); color:#80deea; border-radius:8px; padding:1px 7px; font-size:0.68rem; margin-left:4px;">${tickets.length}</span>` : ''}
            </span>
            <button class="hero-action-btn ms-auto" style="padding:2px 10px; font-size:0.72rem;" id="hero-train-toggle-btn">
                <i class="fas fa-pencil"></i>${(prefill.number || prefill.name) ? 'Edit' : 'Add'}
            </button>
        </div>

        <!-- Passenger On-Train Real-Time GPS Tracking Card Widget -->
        <div id="on-train-gps-container" class="mt-2 mb-2 p-3 rounded-3 text-white shadow-sm" style="display:none; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 1px solid rgba(59,130,246,0.4);">
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2 pb-2 border-bottom border-secondary border-opacity-50">
                <div class="d-flex align-items-center gap-2">
                    <span class="spinner-grow spinner-grow-sm text-success" role="status"></span>
                    <strong class="text-white small" style="font-size:0.82rem;"><i class="fas fa-satellite-dish text-success me-1"></i>PASSENGER ON-TRAIN LIVE GPS TRACKER</strong>
                </div>
                <div class="d-flex align-items-center gap-1">
                    <button type="button" class="btn btn-xs btn-outline-info rounded-pill px-2.5 py-0.5" style="font-size:0.65rem;" onclick="refreshPassengerGpsPosition()"><i class="fas fa-rotate me-1"></i>Refresh GPS</button>
                    <button type="button" class="btn btn-xs btn-outline-danger rounded-pill px-2.5 py-0.5" style="font-size:0.65rem;" onclick="stopPassengerOnTrainGpsTracking()"><i class="fas fa-stop me-1"></i>Stop GPS</button>
                </div>
            </div>

            <div class="row g-2 text-center">
                <div class="col-md-5 col-12">
                    <div class="p-2 rounded bg-white bg-opacity-10 border border-white border-opacity-10">
                        <small class="text-white-50 d-block text-uppercase" style="font-size:0.6rem;"><i class="fas fa-location-dot text-danger me-1"></i>Your Current Location / Place</small>
                        <strong id="dashboard-gps-place" class="text-warning fs-6 d-block text-truncate" style="color:#fde047 !important;">📍 Locating GPS Place...</strong>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="p-2 rounded bg-white bg-opacity-10 border border-white border-opacity-10">
                        <small class="text-white-50 d-block text-uppercase" style="font-size:0.6rem;"><i class="fas fa-gauge-high text-success me-1"></i>Moving Speed</small>
                        <strong id="dashboard-gps-speed" class="text-success fs-6 d-block" style="color:#4ade80 !important;">⚡ 0 km/h</strong>
                    </div>
                </div>
                <div class="col-md-4 col-6">
                    <div class="p-2 rounded bg-white bg-opacity-10 border border-white border-opacity-10">
                        <small class="text-white-50 d-block text-uppercase" style="font-size:0.6rem;"><i class="fas fa-compass text-info me-1"></i>GPS Coordinates</small>
                        <strong id="dashboard-gps-coords" class="text-info fs-6 d-block font-monospace" style="color:#38bdf8 !important;">--° N, --° E</strong>
                    </div>
                </div>
            </div>
        </div>

        <div id="hero-train-chips">${ticketsHtml}</div>
        <div id="hero-train-edit-form" style="display:none; margin-top:8px;">
            <div style="font-size:0.72rem; color:rgba(255,255,255,0.45); margin-bottom:6px;"><i class="fas fa-circle-info me-1"></i>Edit or add upcoming train details for the hero view.</div>
            <div class="hero-train-edit-row">
                <input id="htd-number"    placeholder="Train No."           value="${prefill.number}">
                <input id="htd-name"      placeholder="Train Name"          value="${prefill.name}">
                <input id="htd-departure" placeholder="Departure" type="time" value="${prefill.departure}">
                <input id="htd-arrival"   placeholder="Arrival"   type="time" value="${prefill.arrival}">
                <input id="htd-platform"  placeholder="Platform"            value="${prefill.platform}" style="max-width:80px;">
                <input id="htd-coach"     placeholder="Coach/Seat"          value="${prefill.coach}" style="max-width:80px;">
            </div>
            <div class="d-flex gap-2 mt-2">
                <button class="hero-action-btn primary" style="padding:4px 14px;" id="hero-train-save-btn" data-trip-id="${tripId}">
                    <i class="fas fa-check"></i>Save Train Details
                </button>
                <button class="hero-action-btn" style="padding:4px 12px; color:rgba(255,255,255,0.55);" id="hero-train-cancel-btn">Cancel</button>
            </div>
        </div>
    </div>`;
}

// ── Time & Date helpers ───────────────────────────────────────────────────

/** Parses departureTime (ISO datetime, time string HH:MM, or Date string) into milliseconds timestamp */
function _getDepartureMs(departureTime, startDate) {
    if (!departureTime) return null;
    if (typeof departureTime === 'string' && departureTime.includes('T')) {
        const d = new Date(departureTime);
        return isNaN(d.getTime()) ? null : d.getTime();
    }
    const parsed = new Date(departureTime);
    if (!isNaN(parsed.getTime())) {
        return parsed.getTime();
    }
    if (typeof departureTime === 'string' && /^\d{2}:\d{2}/.test(departureTime)) {
        const [hh, mm] = departureTime.split(':').map(Number);
        const baseDate = startDate ? new Date(startDate) : new Date();
        baseDate.setHours(hh, mm, 0, 0);
        return baseDate.getTime();
    }
    return null;
}

// ── Time extraction helper ─────────────────────────────────────────────────

/** Extract HH:MM from an ISO datetime string (2026-07-26T06:30) or bare time (06:30 / 06:30:00) */
function _extractTime(val) {
    if (!val) return '';
    if (typeof val === 'string' && val.includes('T')) {
        const t = val.split('T')[1];
        return t ? t.slice(0, 5) : '';
    }
    if (typeof val === 'string' && /^\d{2}:\d{2}/.test(val)) return val.slice(0, 5);
    return val;
}

// ── No-trip hero HTML builder ──────────────────────────────────────────────

function _buildNoTripHero(upcoming) {
    const now = Date.now();
    const cardsHtml = upcoming.length > 0
        ? upcoming.map(t => {
            const daysLeft = Math.ceil((new Date(t.startDate) - now) / 86400000);
            const sd = new Date(t.startDate).toLocaleDateString(undefined, { month:'short', day:'numeric' });
            const ed = new Date(t.endDate).toLocaleDateString(undefined,   { month:'short', day:'numeric' });
            const tIcon = _transportIcon(t.transportMode);
            return `
            <div class="hero-no-trip-card">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
                    <i class="fas ${tIcon}" style="color:${_transportColor(t.transportMode)};"></i>
                    <div class="card-trip-name" title="${t.name}">${t.name}</div>
                </div>
                <div class="card-trip-date">${t.startLocation||'?'} → ${t.destination||'?'} · ${sd}–${ed}</div>
                <div class="d-flex align-items-baseline gap-1">
                    <span class="card-trip-countdown">${daysLeft}</span>
                    <span class="card-trip-unit">days away</span>
                </div>
            </div>`;
        }).join('')
        : `<div style="color:rgba(255,255,255,0.7); font-size:0.9rem;">No upcoming trips yet. Start planning! 🗺️</div>`;

    return `
    <div class="trip-hero-no-trip" style="position:relative;">
        <div style="position:relative; z-index:2;">
            <div class="d-flex align-items-center gap-2 mb-2">
                <i class="fas fa-globe-asia" style="font-size:1.4rem; color:rgba(255,255,255,0.8);"></i>
                <div>
                    <div style="font-size:1.25rem; font-weight:800; color:#fff; line-height:1.15;">No Active Trip</div>
                    <div style="font-size:0.8rem; color:rgba(255,255,255,0.65);">Ready for your next adventure?</div>
                </div>
                <button class="hero-action-btn ms-auto" id="hero-create-trip-btn" style="background:rgba(255,255,255,0.2); border-color:rgba(255,255,255,0.35);">
                    <i class="fas fa-plus"></i>New Trip
                </button>
            </div>
            ${upcoming.length > 0
                ? `<div style="font-size:0.7rem; color:rgba(255,255,255,0.55); text-transform:uppercase; letter-spacing:0.7px; font-weight:700; margin:14px 0 8px;"><i class="fas fa-calendar-days me-1"></i>Upcoming Trips</div>`
                : ''}
            <div class="d-flex gap-3 flex-wrap">${cardsHtml}</div>
        </div>
    </div>`;
}

// ── Button wiring ──────────────────────────────────────────────────────────

function _wireHeroButtons(activeTrip) {
    // GPS Track
    const gpsBtn = document.getElementById('hero-gps-track-btn');
    if (gpsBtn) {
        gpsBtn.addEventListener('click', () => {
            const existingBtn = document.getElementById('auto-track-dashboard-btn');
            if (existingBtn) { existingBtn.click(); return; }
            if ('geolocation' in navigator) {
                if (typeof showToast === 'function') showToast('GPS tracking — use the Live Tracker card below.', 'info');
            } else {
                if (typeof showToast === 'function') showToast('Geolocation not supported on this device.', 'warning');
            }
        });
    }

    // Add photos — triggers the hidden file input
    const photoBtn = document.getElementById('hero-photo-btn');
    const photoPill = document.getElementById('hero-add-photo-pill');
    const fileInput = document.getElementById('slideshow-quick-photo-input');
    if (photoBtn && fileInput)  photoBtn.addEventListener('click',  () => fileInput.click());
    if (photoPill && fileInput) photoPill.addEventListener('click', () => fileInput.click());

    // Update Progress — delegate to existing card button
    const progressBtn = document.getElementById('hero-update-progress-btn');
    if (progressBtn) {
        progressBtn.addEventListener('click', () => {
            const existing = document.getElementById('update-dashboard-progress');
            if (existing) { existing.click(); return; }
            if (typeof showUpdateProgressModal === 'function') {
                showUpdateProgressModal(activeTrip.id, parseFloat(activeTrip.route?.distance) || 0);
            }
        });
    }

    // Train panel toggle
    const trainToggle = document.getElementById('hero-train-toggle-btn');
    const trainForm   = document.getElementById('hero-train-edit-form');
    const trainChips  = document.getElementById('hero-train-chips');
    if (trainToggle && trainForm) {
        trainToggle.addEventListener('click', () => {
            const isOpen = trainForm.style.display !== 'none';
            trainForm.style.display = isOpen ? 'none' : 'block';
            trainToggle.innerHTML   = isOpen ? '<i class="fas fa-pencil"></i>Edit' : '<i class="fas fa-times"></i>Close';
        });
    }
    const trainCancel = document.getElementById('hero-train-cancel-btn');
    if (trainCancel && trainForm) {
        trainCancel.addEventListener('click', () => {
            trainForm.style.display = 'none';
            if (trainToggle) trainToggle.innerHTML = '<i class="fas fa-pencil"></i>Edit';
        });
    }

    // Train save
    const trainSave = document.getElementById('hero-train-save-btn');
    if (trainSave) {
        trainSave.addEventListener('click', async () => {
            const details = {
                number:    document.getElementById('htd-number')?.value.trim()    || '',
                name:      document.getElementById('htd-name')?.value.trim()      || '',
                departure: document.getElementById('htd-departure')?.value.trim() || '',
                arrival:   document.getElementById('htd-arrival')?.value.trim()   || '',
                platform:  document.getElementById('htd-platform')?.value.trim()  || '',
                coach:     document.getElementById('htd-coach')?.value.trim()     || '',
            };
            await _saveTrainDetails(activeTrip.id, details, activeTrip);
        });
    }
}

function _wireNoTripButtons() {
    const createBtn = document.getElementById('hero-create-trip-btn');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            if (typeof showCreateTripModal === 'function') showCreateTripModal();
            else document.getElementById('create-trip-btn')?.click();
        });
    }
}

// ── Firestore save for train details ──────────────────────────────────────

async function _saveTrainDetails(tripId, details, activeTrip) {
    const saveBtn = document.getElementById('hero-train-save-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Saving...'; }
    try {
        await db.collection('trips').doc(tripId).update({
            trainDetails: details,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        // Update local cache
        activeTrip.trainDetails = details;
        const idx = (window.userTrips||[]).findIndex(t => t.id === tripId);
        if (idx !== -1) window.userTrips[idx].trainDetails = details;

        if (typeof showToast === 'function') showToast('Train details saved!', 'success');
        // Re-render hero to show chips
        renderTripHero(activeTrip);
    } catch(e) {
        console.error('Error saving train details:', e);
        if (typeof showToast === 'function') showToast('Failed to save train details.', 'danger');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-check"></i>Save'; }
    }
}

// ── Compatibility stub (old calls still work) ──────────────────────────────

/** @deprecated — kept so any lingering call sites don't error out */
function renderActiveTripHeroSlideshow(activeTrip) {
    renderTripHero(activeTrip);
}

// updateSlideshowDOM is no longer needed — stub preserved
function updateSlideshowDOM() {}




// Function to handle photo uploads from Create & Edit modals
async function handleTripPhotoUpload(event, isEdit = false) {
    const files = Array.from(event.target.files);
    event.target.value = ''; // Reset input so same files can be re-selected if needed
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
            
            // 1. Try ImageKit Upload if configured
            if (settings && settings.urlEndpoint && settings.publicKey && settings.privateKey && typeof uploadToImageKit === 'function') {
                const ikRes = await uploadToImageKit(file, `trip_cover_${Date.now()}_${file.name.replace(/\s+/g, '_')}`, settings);
                if (ikRes && ikRes.url) {
                    finalUrl = ikRes.url;
                }
            }
            
            // 2. Fallback: resize to 16:5 canvas (1600×500, crisp, no crop)
            if (!finalUrl) {
                finalUrl = await resizeImageTo16x5(file);
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
        const actionText = isEdit ? 'Save/Update Trip' : 'Create Trip';
        if (typeof showToast === 'function') showToast(`${addedCount} photo(s) added! Click "${actionText}" to save changes.`, 'success');
    } else {
        if (typeof showToast === 'function') showToast('Failed to process uploaded image file(s)', 'warning');
    }
}

function compressImageToDataUrl(file, maxWidth = 900, quality = 0.75) {
    // Legacy stub — kept so any other callers don't break.
    // New uploads use resizeImageTo16x5() instead.
    return resizeImageTo16x5(file, quality);
}

/**
 * Resize an uploaded image to a 1600×500 canvas (16:5 ratio).
 * The image is scaled to *fit inside* the canvas (contain logic)
 * with black letterbox bars filling any remaining space.
 * Exports as JPEG at the given quality (default 0.88 for crisp results).
 */
function resizeImageTo16x5(file, quality = 0.88) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const TARGET_W = 1600;
                const TARGET_H = 500; // 16:5 ratio
                const canvas = document.createElement('canvas');
                canvas.width = TARGET_W;
                canvas.height = TARGET_H;
                const ctx = canvas.getContext('2d');

                // Letterbox background
                ctx.fillStyle = '#111111';
                ctx.fillRect(0, 0, TARGET_W, TARGET_H);

                // Scale image to fit inside canvas without any cropping
                const scale = Math.min(TARGET_W / img.width, TARGET_H / img.height);
                const drawW = Math.round(img.width * scale);
                const drawH = Math.round(img.height * scale);
                const offsetX = Math.round((TARGET_W - drawW) / 2);
                const offsetY = Math.round((TARGET_H - drawH) / 2);

                ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
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

            // Fallback: resize to 16:5 canvas (1600×500, crisp, no crop)
            if (!finalUrl) {
                finalUrl = await resizeImageTo16x5(file);
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
            <div class="d-flex align-items-center me-2 pe-1 cursor-pointer" id="nav-profile" title="View Profile" style="cursor: pointer;">
                <img id="user-avatar" class="user-avatar me-2 shadow-2xs" src="${getSafeAvatarUrl(avatarUrl, currentUser.displayName || 'User')}" alt="User Avatar" style="width:34px; height:34px; border-radius:50%; object-fit:cover; border:2px solid var(--primary-color);">
                <span class="fw-semibold text-dark small me-1" id="user-name">${currentUser.displayName || 'User'}</span>
            </div>
            <button class="btn btn-outline-danger btn-sm rounded-pill px-3 py-1 ms-auto ms-lg-0" id="logout-btn" title="Logout">
                <i class="fas fa-sign-out-alt me-1"></i><span>Logout</span>
            </button>
        `;
        
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            setupAvatarFallback(userAvatar, currentUser.displayName || 'User');
        }
        
        // Re-attach event listeners
        setTimeout(() => {
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', handleLogout);
            }
            const navProfile = document.getElementById('nav-profile');
            if (navProfile) {
                navProfile.addEventListener('click', showProfileModal);
            }
        }, 100);
        
    } else {
        // User is not logged in
        navAuthSection.innerHTML = `
            <button class="btn btn-primary btn-sm rounded-pill px-3 py-1 ms-auto ms-lg-0" id="login-btn">
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

function enableStopsDragAndDrop(container, onReorderCallback) {
    if (!container || container.dataset.dragInitialized === 'true') return;
    container.dataset.dragInitialized = 'true';

    let draggedItem = null;

    container.addEventListener('dragstart', (e) => {
        const row = e.target.closest('.stop-input-row');
        if (!row) return;
        draggedItem = row;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', ''); } catch (_) {}
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const targetRow = e.target.closest('.stop-input-row');
        if (targetRow && targetRow !== draggedItem && targetRow.parentNode === container) {
            const rect = targetRow.getBoundingClientRect();
            const next = (e.clientY - rect.top) > (rect.height / 2);
            container.insertBefore(draggedItem, next ? targetRow.nextSibling : targetRow);
        }
    });

    container.addEventListener('dragend', () => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            if (typeof onReorderCallback === 'function') onReorderCallback();
        }
    });

    // Touch Support for Mobile Drag & Drop
    let touchItem = null;

    container.addEventListener('touchstart', (e) => {
        const handle = e.target.closest('.drag-handle');
        if (!handle) return;
        const row = handle.closest('.stop-input-row');
        if (!row) return;

        touchItem = row;
        touchItem.classList.add('dragging');
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
        if (!touchItem) return;
        e.preventDefault();
        const touch = e.touches[0];
        const elem = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!elem) return;
        const targetRow = elem.closest('.stop-input-row');
        if (targetRow && targetRow !== touchItem && targetRow.parentNode === container) {
            const rect = targetRow.getBoundingClientRect();
            const next = (touch.clientY - rect.top) > (rect.height / 2);
            container.insertBefore(touchItem, next ? targetRow.nextSibling : targetRow);
        }
    }, { passive: false });

    container.addEventListener('touchend', () => {
        if (touchItem) {
            touchItem.classList.remove('dragging');
            touchItem = null;
            if (typeof onReorderCallback === 'function') onReorderCallback();
        }
    });
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
    div.draggable = true;
    
    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle text-muted me-1 px-1';
    dragHandle.title = 'Drag to reorder stop';
    dragHandle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
    
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
    
    div.appendChild(dragHandle);
    div.appendChild(span);
    div.appendChild(input);
    div.appendChild(select);
    div.appendChild(btn);
    
    container.appendChild(div);

    enableStopsDragAndDrop(container, triggerRecalc);
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
            if (t.type === 'darshan') {
                return `  ${idx + 1}. [DARSHAN / TEMPLE PASS] ${t.templeName || t.operator} | Category: ${t.darshanCategory || 'Special Entry'} | Token: ${t.ticketNo} | Reporting Slot: ${t.departureTime.replace('T', ' ')} | Gate: ${t.reportingVenue || t.departurePlace} | Devotees: ${t.devoteesCount || 1} Person(s) (${t.passengerName || ''}) | Status: ${t.bookingStatus || 'Confirmed'} | Cost: ₹${t.cost || 0}`;
            }
            const depStr = `${t.departurePlace}${t.depCode ? ' (' + t.depCode + ')' : ''} at ${t.departureTime.replace('T', ' ')}`;
            const arrStr = t.arrivalTime ? `${t.arrivalPlace}${t.arrCode ? ' (' + t.arrCode + ')' : ''} at ${t.arrivalTime.replace('T', ' ')}` : t.arrivalPlace;
            return `  ${idx + 1}. [${t.type.toUpperCase()}] ${t.serviceNo || ''} ${t.serviceName || t.operator || ''} | PNR: ${t.ticketNo} | Departs: ${depStr} | Arrives: ${arrStr} | Seat: ${t.seatNo || 'N/A'} | Status: ${t.bookingStatus || 'CNF'} | Cost: ₹${t.cost || 0}`;
        }).join('\n');
        
        // Layover and Exploring Stay calculations (Transport tickets only)
        const transportTickets = sortedTickets.filter(t => ['flight', 'train', 'bus'].includes(t.type));
        const stayLegs = [];
        let totalTransitMs = 0;
        let totalStayMs = 0;
        
        for (let i = 0; i < transportTickets.length; i++) {
            const currentT = transportTickets[i];
            const depT = new Date(currentT.departureTime);
            const arrT = currentT.arrivalTime ? new Date(currentT.arrivalTime) : depT;
            totalTransitMs += Math.max(0, arrT - depT);
            
            if (i < transportTickets.length - 1) {
                const nextT = transportTickets[i + 1];
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
    'llama-3.1-8b-instant',
    'gemma2-9b-it'
];

function buildSystemPrompt(tripContext) {
    let memoryContextStr = "";
    if (window.aiMemory) {
        const mem = window.aiMemory.getMemoryPromptContext();
        memoryContextStr = `[USER LONG-TERM AI MEMORY PROFILE]:
- Preferred Language: ${mem.language || 'en-IN'}
- Budget Range: ${mem.budgetTier || 'medium'}
- Dietary Preference: ${mem.dietary || 'local_thali'}
- Walking Tolerance: ${mem.walkingTolerance || 'medium'}
- Temple Interest: ${mem.templeInterest || 'high'} | Photography Interest: ${mem.photographyInterest || 'high'}
- Special Requirements: Senior Assistance = ${mem.seniorAssistance ? 'YES' : 'NO'}, Children Traveling = ${mem.childrenTraveling ? 'YES' : 'NO'}
- Frequently Visited Destinations: ${mem.frequentlyVisited || 'None recorded'}
- Custom Notes: ${mem.medical || 'None'}`;
    }

    let destKnowledgeStr = "";
    const activeTrip = getActiveTrip();
    if (activeTrip && activeTrip.destination && window.destinationKnowledge) {
        const info = window.destinationKnowledge.getDestinationInfo(activeTrip.destination);
        if (info) {
            destKnowledgeStr = `[DESTINATION KNOWLEDGE GRAPH FOR "${info.city.toUpperCase()}"]:
- State: ${info.state} | Best Season: ${info.bestSeason}
- Key Stations/Hubs: ${info.hubs.railway.join(', ')}
- Famous Attractions: ${info.attractions.map(a => `${a.name} (${a.category}, Hours: ${a.openingHours}, Entry: ${a.entryFee})`).join('; ')}
- Nearby Recommended Thalis: ${info.attractions.map(a => a.nearbyThalis).filter(Boolean).join(', ')}
- Emergency Contacts: Hospitals: ${info.emergency.hospitals.join(', ')} | Police: ${info.emergency.police}`;
        }
    }

    return `You are TravelMate AI — a world-class Professional AI Travel Planner Engine, local tour guide, pilgrimage planner, budget optimizer, and safety advisor with FULL COMMAND and realtime context of the user's TravelMate application.

${tripContext}

${memoryContextStr}

${destKnowledgeStr}

----------------------------------------------------
CORE ROLE & CAPABILITIES
----------------------------------------------------
You reason over structured travel data, user preferences, train milestones, and real-world constraints.
Capabilities: Multi-city trips, Pilgrimage tours, Road trips, Train/Flight/Bus journeys, Family/Solo/Senior citizen trips, Weekend & Long vacations.

----------------------------------------------------
TRAIN JOURNEY MILESTONE LOGIC
----------------------------------------------------
Train tickets are milestones. Read ticket details, boarding stations, arrival times, departure times, and continue itinerary after reaching the next city. NEVER assume the trip ends after one destination; support multi-stage journeys (e.g., Hyderabad -> Vijayawada -> Samalkot -> Pithapuram -> Visakhapatnam -> Return).

----------------------------------------------------
PILGRIMAGE & LOCAL DISCOVERY MODE
----------------------------------------------------
Understand temple timings, dress codes, special darshan queues, prasadam, footwear stands, locker availability, and pilgrimage circuits.
Recommend famous regional thalis, street food, local markets, sunrise/sunset viewpoints, and cultural experiences.

----------------------------------------------------
WEATHER AWARENESS & SMART BUDGET ENGINE
----------------------------------------------------
- Weather Adaptability: If rain, suggest indoor attractions; if extreme heat, move outdoor sightseeing to early morning or evening.
- Budget Estimation: Estimate Transport, Hotels, Food, Temple tickets, Parking, and Shopping across Low, Medium, and Premium tiers.

----------------------------------------------------
CRITICAL RESPONSE GUIDELINES
----------------------------------------------------
1. FULL COMMAND OVER APP DATA: You have direct access to the user's live trip context, booked tickets, train/flight numbers, station codes, arrival/departure timestamps, and pre-calculated exploration stay hours.
2. DIRECT, PRECISE & ACCURATE ANSWERS: Always quote exact arrival times, next departure times, train numbers, and exact calculated stay/free hours.
3. PERSONALIZED MEMORY: Automatically apply user preferences (e.g. recommend pure veg/local thalis, respect walking tolerance, add senior citizen assistance tips).
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

function buildChatConversationMessages(userMessage, systemPrompt) {
    const messages = [{ role: 'system', content: systemPrompt }];
    const messagesEl = document.getElementById('ai-chat-messages');
    
    if (messagesEl) {
        const msgNodes = Array.from(messagesEl.querySelectorAll('.ai-chat-message:not(#ai-typing-indicator)'));
        const recentNodes = msgNodes.slice(-4);
        recentNodes.forEach(node => {
            const role = node.classList.contains('user') ? 'user' : 'assistant';
            let text = node.dataset.rawText || node.innerText || '';
            if (text.length > 800) text = text.substring(0, 800) + '...';
            if (text && !text.includes('Hello! I am your AI')) {
                messages.push({ role, content: text });
            }
        });
    }

    if (messages.length === 1 || messages[messages.length - 1].content !== userMessage) {
        messages.push({ role: 'user', content: userMessage });
    }

    return messages;
}

async function sendToGroq(userMessage, apiKey) {
    const tripContext = buildTripContext();
    const systemPrompt = buildSystemPrompt(tripContext);
    let messages = buildChatConversationMessages(userMessage, systemPrompt);

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
                    max_tokens: 1200,
                    temperature: 0.7
                })
            });
            
            if (!response.ok) {
                let errMsg = `Groq ${model} → HTTP ${response.status}`;
                try { const e = await response.json(); errMsg = e.error?.message || errMsg; } catch (_) {}
                console.warn('Groq model failed, trying next:', errMsg);
                lastError = errMsg;

                // Handle 413 Content Too Large by purging past conversation history
                if (response.status === 413 && messages.length > 2) {
                    console.warn('Groq payload too large (413), truncating conversation history...');
                    messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }];
                }
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
    const messages = buildChatConversationMessages(userMessage, systemPrompt);
    
    let lastError = 'No free OpenRouter models available at the moment.';
    
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
                    max_tokens: 2500,
                    temperature: 0.7
                })
            });
            
            if (!response.ok) {
                let errMsg = `${model} → HTTP ${response.status}`;
                try { const e = await response.json(); errMsg = e.error?.message || errMsg; } catch (_) {}
                console.warn('OpenRouter model failed, trying next:', errMsg);
                lastError = errMsg;

                // Stop retrying OpenRouter models on rate/quota limits so sendToAiAssistant can trigger Groq fallback cleanly
                if (response.status === 429 || response.status === 402) {
                    console.warn(`⚡ OpenRouter limit hit (${response.status}) on ${model}. Fast-tracking Groq fallback.`);
                    throw new Error(`OpenRouter rate/quota limit reached (${response.status})`);
                }
                continue;
            }
            
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content?.trim();
            if (!text) { lastError = `${model} returned empty response`; continue; }
            
            console.log(`✅ OpenRouter response from: ${model}`);
            updateAIProviderBadge('OpenRouter');
            return text;
            
        } catch (networkErr) {
            console.warn('Network/API error for model', model, networkErr.message);
            lastError = networkErr.message;
            if (networkErr.message.includes('limit reached')) {
                throw networkErr;
            }
        }
    }
    
    throw new Error(lastError);
}

// Master AI Entrypoint with robust fallback between OpenRouter and Groq
async function sendToAiAssistant(userMessage) {
    await loadOpenRouterKey();
    const openrouterKey = window._openrouterApiKey;
    const groqKey = window._groqApiKey;

    if (!openrouterKey && !groqKey) {
        throw new Error('⚠️ No AI API Key found. Please add an OpenRouter or Groq API Key in Profile Settings to enable AI features.');
    }

    let openrouterError = '';

    // 1. Try OpenRouter if key is configured
    if (openrouterKey) {
        try {
            return await sendToOpenRouter(userMessage, openrouterKey);
        } catch (orErr) {
            console.warn('⚠️ OpenRouter call failed:', orErr.message);
            openrouterError = orErr.message;
        }
    }

    // 2. Fallback to Groq if Groq key is configured
    if (groqKey) {
        console.warn('🔄 Directing request to Groq API fallback...');
        try {
            return await sendToGroq(userMessage, groqKey);
        } catch (groqErr) {
            console.error('❌ Groq execution failed:', groqErr.message);
            throw new Error(`OpenRouter failed (${openrouterError}) AND Groq fallback failed (${groqErr.message})`);
        }
    }

    throw new Error(openrouterError);
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
                // Async request to fetch AI suggestions for these coordinates with Groq fallback
                async function fetchSuggestions() {
                    const openrouterKey = "${window._openrouterApiKey || ''}";
                    const groqKey = "${window._groqApiKey || ''}";
                    
                    const prompt = \\\`You are a local travel guide. Provide 4 top tourist/sightseeing recommendations near coordinates: Latitude \${lat}, Longitude \${lng}.
For each place, provide name, category (e.g. Scenic, Historic, Food, Temple, Park), road distance from coordinates (estimate in km), and a short, exciting description (15-25 words).
Reply ONLY with a valid JSON array of objects with the fields: name, category, distance, description. Example:
[
  {"name": "Marine Drive", "category": "Scenic", "distance": "2.5 km", "description": "A beautiful promenade along the sea, perfect for sunsets and late night walks."},
  {"name": "Gateway of India", "category": "Historic", "distance": "3.8 km", "description": "The iconic arch monument overlooking the Mumbai harbor."}
]
Do NOT write any introduction or explanation outside the JSON.\\\`;

                    let success = false;

                    // 1. Try OpenRouter if key is available
                    if (openrouterKey) {
                        try {
                            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': 'Bearer ' + openrouterKey,
                                    'HTTP-Referer': window.location.origin,
                                    'X-Title': 'TravelMate AI GPS'
                                },
                                body: JSON.stringify({
                                    model: 'openrouter/free',
                                    messages: [{ role: 'user', content: prompt }],
                                    max_tokens: 450,
                                    temperature: 0.6
                                })
                            });
                            
                            if (response.ok) {
                                const data = await response.json();
                                const text = data.choices?.[0]?.message?.content?.trim() || '';
                                const jsonMatch = text.match(/\\\\\\\\[[\\\\\\\s\\\\\\\S]*?\\\\\\\\\]/);
                                if (jsonMatch) {
                                    const places = JSON.parse(jsonMatch[0]);
                                    renderPlaces(places);
                                    success = true;
                                }
                            } else {
                                console.warn('OpenRouter fetchSuggestions HTTP ' + response.status + ', trying Groq fallback...');
                            }
                        } catch (e) {
                            console.warn('OpenRouter fetchSuggestions failed, trying Groq fallback:', e);
                        }
                    }

                    // 2. Try Groq fallback if OpenRouter failed or key was missing
                    if (!success && groqKey) {
                        try {
                            console.log('🤖 Fetching GPS suggestions via Groq fallback...');
                            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': 'Bearer ' + groqKey
                                },
                                body: JSON.stringify({
                                    model: 'llama-3.3-70b-versatile',
                                    messages: [{ role: 'user', content: prompt }],
                                    max_tokens: 450,
                                    temperature: 0.6
                                })
                            });
                            
                            if (response.ok) {
                                const data = await response.json();
                                const text = data.choices?.[0]?.message?.content?.trim() || '';
                                const jsonMatch = text.match(/\\\\\\\\[[\\\\\\\s\\\\\\\S]*?\\\\\\\\\]/);
                                if (jsonMatch) {
                                    const places = JSON.parse(jsonMatch[0]);
                                    renderPlaces(places);
                                    success = true;
                                }
                            }
                        } catch (e) {
                            console.warn('Groq fetchSuggestions failed as well:', e);
                        }
                    }

                    if (!success) {
                        document.getElementById('suggestions-loading').innerHTML = \\\`
                            <div class="alert alert-warning">
                                <i class="fas fa-circle-exclamation me-2 fs-4"></i>
                                <strong>Could not load AI recommendations.</strong> Please check your OpenRouter or Groq API key in Profile settings.
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
    const typingIndicator = showTypingIndicator();
    const sendBtn = document.getElementById('ai-chat-send');
    if (sendBtn) sendBtn.disabled = true;
    
    try {
        const reply = await sendToAiAssistant(message);
        if (typingIndicator) typingIndicator.remove();
        appendChatMessage('assistant', reply);
        
        // Parse and execute agentic actions from chatbot responses
        handleAIActionParsing(reply);
    } catch (err) {
        if (typingIndicator) typingIndicator.remove();
        console.error('AI Assistant API error:', err);
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
    
    const typingIndicator = showTypingIndicator();
    const sendBtn = document.getElementById('ai-chat-send');
    if (sendBtn) sendBtn.disabled = true;
    
    try {
        const reply = await sendToAiAssistant(message);
        if (typingIndicator) typingIndicator.remove();
        appendChatMessage('assistant', reply);
        
        // Parse and execute agentic actions from chatbot responses
        handleAIActionParsing(reply);
    } catch (err) {
        if (typingIndicator) typingIndicator.remove();
        console.error('AI Assistant API error:', err);
        
        let errorMsg = `❌ **AI Service Notice**: ${err.message}`;
        const errStr = String(err.message).toLowerCase();
        if (errStr.includes('rate limit') || errStr.includes('rate_limit') || errStr.includes('429')) {
            errorMsg = `❌ **OpenRouter Rate Limit Exceeded**
            
You have reached the free limit for OpenRouter models.

**Instant Options:**
1. **Add a Free Groq Key**: Paste a free API key from [console.groq.com](https://console.groq.com/keys) in **Profile → AI Settings** to get ultra-fast free responses!
2. **Add OpenRouter Credits**: Add $5 at [openrouter.ai/credits](https://openrouter.ai/credits) for 1000s of requests.`;
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

/* ==========================================================================
   GLOBAL SEARCH ENGINE (TICKETS, TRIPS, EXPENSES, ITINERARY, DESTINATIONS & TOOLS)
   ========================================================================== */

let _currentSearchFilter = 'all';
let _activeSearchIndex = -1;
let _currentSearchResults = [];

function initGlobalSearch() {
    console.log('Initializing Global Search Engine...');
    const overlay = document.getElementById('global-search-overlay');
    const backdrop = document.getElementById('global-search-backdrop');
    const closeBtn = document.getElementById('close-search-overlay-btn');
    const overlayInput = document.getElementById('overlay-search-input');
    const heroInput = document.getElementById('hero-global-search-input');
    const heroBtn = document.getElementById('hero-global-search-btn');
    const categoryTabs = document.getElementById('search-category-tabs');

    if (!overlay || !overlayInput) {
        console.warn('Global Search DOM elements missing.');
        return;
    }

    const allSearchInputs = [overlayInput, heroInput].filter(Boolean);

    // Live typing & focus handler across Hero & Overlay search inputs
    allSearchInputs.forEach(inputEl => {
        inputEl.addEventListener('input', (e) => {
            const query = e.target.value;
            // Sync typed query to the other input field
            allSearchInputs.forEach(el => {
                if (el !== e.target) el.value = query;
            });
            if (overlay.style.display === 'none' || !overlay.style.display) {
                overlay.style.display = 'flex';
            }
            performGlobalSearch(query);
        });

        inputEl.addEventListener('focus', (e) => {
            if (e.target !== overlayInput && (overlay.style.display === 'none' || !overlay.style.display)) {
                openGlobalSearchOverlay(e.target.value || '');
            }
        });
    });

    if (heroBtn) {
        heroBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const val = heroInput ? heroInput.value.trim() : '';
            performGlobalSearch(val);
            let filtered = _currentSearchResults;
            if (_currentSearchFilter !== 'all') {
                filtered = _currentSearchResults.filter(r => r.category === _currentSearchFilter);
            }
            if (filtered.length > 0) {
                handleSearchResultClick(filtered[0]);
            } else {
                openGlobalSearchOverlay(val);
            }
        });
    }

    // Close overlay handlers
    if (backdrop) backdrop.addEventListener('click', closeGlobalSearchOverlay);
    if (closeBtn) closeBtn.addEventListener('click', closeGlobalSearchOverlay);

    // Category Filter Tabs
    if (categoryTabs) {
        categoryTabs.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-search-filter]');
            if (!btn) return;
            categoryTabs.querySelectorAll('button').forEach(b => {
                b.classList.remove('btn-primary', 'active', 'shadow-2xs');
                b.classList.add('btn-outline-secondary');
                const badge = b.querySelector('.badge');
                if (badge) {
                    badge.classList.remove('bg-white', 'text-primary');
                    badge.classList.add('bg-secondary-subtle', 'text-dark');
                }
            });
            btn.classList.remove('btn-outline-secondary');
            btn.classList.add('btn-primary', 'active', 'shadow-2xs');
            const activeBadge = btn.querySelector('.badge');
            if (activeBadge) {
                activeBadge.classList.remove('bg-secondary-subtle', 'text-dark');
                activeBadge.classList.add('bg-white', 'text-primary');
            }
            _currentSearchFilter = btn.getAttribute('data-search-filter') || 'all';
            renderGlobalSearchResults(overlayInput.value);
        });
    }

    // Hotkey Listener: Ctrl+K / Cmd+K or / key
    document.addEventListener('keydown', (e) => {
        const isEditingText = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) 
                              && !allSearchInputs.includes(document.activeElement);

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (overlay.style.display === 'none' || !overlay.style.display) {
                openGlobalSearchOverlay('');
            } else {
                closeGlobalSearchOverlay();
            }
        } else if (e.key === 'Escape' && overlay.style.display !== 'none') {
            closeGlobalSearchOverlay();
        } else if (!isEditingText && e.key === '/' && (overlay.style.display === 'none' || !overlay.style.display)) {
            e.preventDefault();
            openGlobalSearchOverlay('');
        } else if (overlay.style.display !== 'none' && ['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
            handleSearchKeyboardNav(e);
        }
    });
}

function openGlobalSearchOverlay(initialQuery = '') {
    const overlay = document.getElementById('global-search-overlay');
    const overlayInput = document.getElementById('overlay-search-input');
    if (!overlay || !overlayInput) return;

    overlay.style.display = 'flex';
    overlayInput.value = initialQuery;

    setTimeout(() => {
        overlayInput.focus();
    }, 50);

    performGlobalSearch(initialQuery);
}

function closeGlobalSearchOverlay() {
    const overlay = document.getElementById('global-search-overlay');
    if (!overlay) return;
    overlay.style.display = 'none';
}

function performGlobalSearch(query) {
    try {
        const q = (query || '').trim().toLowerCase();
        const results = [];
        const trips = window.userTrips || userTrips || [];

        // 1. TICKETS & DARSHAN PASSES
        trips.forEach(trip => {
            const tripTickets = trip.tickets || [];
            tripTickets.forEach(ticket => {
                const textToSearch = [
                    ticket.title || '',
                    ticket.type || '',
                    ticket.pnr || '',
                    ticket.bookingNo || '',
                    ticket.ticketNo || '',
                    ticket.passNo || '',
                    ticket.holderName || '',
                    ticket.passengerName || '',
                    ticket.origin || '',
                    ticket.destination || '',
                    ticket.venue || '',
                    ticket.seatNo || '',
                    ticket.notes || '',
                    ticket.price ? '₹' + ticket.price : '',
                    trip.name || '',
                    trip.destination || ''
                ].join(' ').toLowerCase();

                if (!q || textToSearch.includes(q)) {
                    let iconClass = 'fas fa-ticket-alt';
                    let iconBg = 'bg-warning-subtle text-warning-emphasis';
                    const type = (ticket.type || 'ticket').toLowerCase();

                    if (type === 'darshan') { iconClass = 'fas fa-gopuram'; iconBg = 'bg-danger-subtle text-danger'; }
                    else if (type === 'flight') { iconClass = 'fas fa-plane'; iconBg = 'bg-primary-subtle text-primary'; }
                    else if (type === 'train') { iconClass = 'fas fa-train'; iconBg = 'bg-success-subtle text-success'; }
                    else if (type === 'bus') { iconClass = 'fas fa-bus'; iconBg = 'bg-info-subtle text-info'; }
                    else if (type === 'event' || type === 'movie') { iconClass = 'fas fa-film'; iconBg = 'bg-purple-subtle text-purple'; }
                    else if (type === 'hotel') { iconClass = 'fas fa-hotel'; iconBg = 'bg-warning-subtle text-warning'; }

                    const pnrCode = ticket.pnr || ticket.bookingNo || ticket.ticketNo || ticket.passNo || '';

                    results.push({
                        category: 'tickets',
                        title: ticket.title || `${ticket.type ? ticket.type.toUpperCase() : 'TICKET'} PASS`,
                        subtitle: `Trip: ${trip.name || trip.destination}${pnrCode ? ' • PNR: ' + pnrCode : ''}${ticket.date ? ' • Date: ' + ticket.date : ''}`,
                        badge: ticket.type ? ticket.type.toUpperCase() : 'TICKET',
                        badgeClass: 'bg-warning text-dark',
                        iconClass: iconClass,
                        iconBg: iconBg,
                        data: {
                            tripId: trip.id,
                            ticketId: ticket.id,
                            action: 'open_ticket',
                            trip: trip,
                            ticket: ticket
                        }
                    });
                }
            });
        });

        // 2. TRIPS
        trips.forEach(trip => {
            const textToSearch = [
                trip.name || '',
                trip.destination || '',
                trip.startLocation || '',
                trip.code || '',
                trip.transportMode || '',
                trip.notes || '',
                trip.status || '',
                trip.budget ? '₹' + trip.budget : ''
            ].join(' ').toLowerCase();

            if (!q || textToSearch.includes(q)) {
                const startDate = trip.startDate ? new Date(trip.startDate).toLocaleDateString() : '';
                const endDate = trip.endDate ? new Date(trip.endDate).toLocaleDateString() : '';

                results.push({
                    category: 'trips',
                    title: trip.name || trip.destination,
                    subtitle: `Destination: ${trip.destination || 'N/A'} • ${startDate ? startDate + ' - ' + endDate : 'Code: ' + (trip.code || '-')}`,
                    badge: trip.transportMode ? trip.transportMode.toUpperCase() : 'TRIP',
                    badgeClass: 'bg-primary text-white',
                    iconClass: 'fas fa-suitcase-rolling',
                    iconBg: 'bg-primary-subtle text-primary',
                    data: {
                        tripId: trip.id,
                        action: 'open_trip',
                        trip: trip
                    }
                });
            }
        });

        // 3. EXPENSES
        trips.forEach(trip => {
            const expenses = trip.expenses || [];
            expenses.forEach((expense, index) => {
                const textToSearch = [
                    expense.title || expense.name || '',
                    expense.category || '',
                    expense.paidBy || '',
                    expense.amount ? '₹' + expense.amount : '',
                    expense.notes || '',
                    trip.name || ''
                ].join(' ').toLowerCase();

                if (!q || textToSearch.includes(q)) {
                    results.push({
                        category: 'expenses',
                        title: `${expense.title || expense.name || 'Expense'} - ₹${expense.amount || 0}`,
                        subtitle: `Trip: ${trip.name || trip.destination} • Category: ${expense.category || 'General'} • Paid by: ${expense.paidBy || 'Member'}`,
                        badge: `₹${expense.amount || 0}`,
                        badgeClass: 'bg-success text-white',
                        iconClass: 'fas fa-receipt',
                        iconBg: 'bg-success-subtle text-success',
                        data: {
                            tripId: trip.id,
                            expenseId: expense.id || index,
                            action: 'open_expense',
                            trip: trip
                        }
                    });
                }
            });
        });

        // 4. ITINERARY & ACTIVITIES
        trips.forEach(trip => {
            const itinerary = trip.itinerary || [];
            itinerary.forEach((act, index) => {
                const textToSearch = [
                    act.title || act.activity || '',
                    act.place || act.location || '',
                    act.notes || '',
                    act.date || '',
                    act.time || '',
                    trip.name || ''
                ].join(' ').toLowerCase();

                if (!q || textToSearch.includes(q)) {
                    results.push({
                        category: 'itinerary',
                        title: act.title || act.activity || act.place || 'Activity',
                        subtitle: `Trip: ${trip.name || trip.destination}${act.place ? ' • Location: ' + act.place : ''}${act.time ? ' • Time: ' + act.time : ''}`,
                        badge: 'ACTIVITY',
                        badgeClass: 'bg-danger text-white',
                        iconClass: 'fas fa-map-pin',
                        iconBg: 'bg-danger-subtle text-danger',
                        data: {
                            tripId: trip.id,
                            activityId: act.id || index,
                            action: 'open_itinerary',
                            trip: trip
                        }
                    });
                }
            });
        });

        // 5. DESTINATIONS & ATTRACTIONS (DESTINATION_KNOWLEDGE_DB)
        if (typeof DESTINATION_KNOWLEDGE_DB !== 'undefined' && DESTINATION_KNOWLEDGE_DB) {
            Object.keys(DESTINATION_KNOWLEDGE_DB).forEach(key => {
                const dest = DESTINATION_KNOWLEDGE_DB[key];
                if (!dest) return;
                const attractions = Array.isArray(dest.attractions) ? dest.attractions : [];
                const attText = attractions.map(a => `${a.name || ''} ${a.category || ''} ${a.highlights || ''}`).join(' ');
                const textToSearch = `${dest.city || ''} ${dest.state || ''} ${dest.country || ''} ${dest.description || ''} ${attText}`.toLowerCase();

                if (q && textToSearch.includes(q)) {
                    results.push({
                        category: 'destinations',
                        title: `${dest.city || 'City'}, ${dest.state || ''}`,
                        subtitle: dest.description || `Best season: ${dest.bestSeason || 'All year'}`,
                        badge: 'DESTINATION',
                        badgeClass: 'bg-info text-white',
                        iconClass: 'fas fa-city',
                        iconBg: 'bg-info-subtle text-info',
                        data: {
                            destinationName: dest.city,
                            action: 'create_trip_dest',
                            dest: dest
                        }
                    });

                    attractions.forEach(att => {
                        if (att && `${att.name || ''} ${att.category || ''} ${att.highlights || ''}`.toLowerCase().includes(q)) {
                            results.push({
                                category: 'destinations',
                                title: `${att.name} (${dest.city})`,
                                subtitle: att.highlights || att.category || 'Popular attraction',
                                badge: att.category ? att.category.toUpperCase() : 'ATTRACTION',
                                badgeClass: 'bg-secondary text-white',
                                iconClass: 'fas fa-landmark',
                                iconBg: 'bg-secondary-subtle text-secondary',
                                data: {
                                    destinationName: dest.city,
                                    attractionName: att.name,
                                    action: 'create_trip_dest',
                                    dest: dest
                                }
                            });
                        }
                    });
                }
            });
        }

        // 6. QUICK TOOLS & APP ACTIONS
        const tools = [
            {
                name: 'Car Expense & Fuel Calculator',
                keywords: 'car fuel expense calculator vehicle distance petrol diesel mileage cost',
                subtitle: 'Calculate trip fuel cost, mileage & per-head expense splits',
                badge: 'TOOL',
                badgeClass: 'bg-dark text-white',
                iconClass: 'fas fa-calculator',
                iconBg: 'bg-dark-subtle text-dark',
                url: 'car-calculations.html'
            },
            {
                name: 'Create New Trip',
                keywords: 'create new trip plan journey add route budget stops',
                subtitle: 'Start planning a new trip with custom itinerary and budget',
                badge: 'ACTION',
                badgeClass: 'bg-primary text-white',
                iconClass: 'fas fa-plus-circle',
                iconBg: 'bg-primary-subtle text-primary',
                action: 'modal_create_trip'
            },
            {
                name: 'Join Trip with Share Code',
                keywords: 'join trip code share invite friend group collaborate',
                subtitle: 'Enter a 6-digit code to join a friend\'s travel plan',
                badge: 'ACTION',
                badgeClass: 'bg-info text-white',
                iconClass: 'fas fa-user-plus',
                iconBg: 'bg-info-subtle text-info',
                action: 'modal_join_trip'
            },
            {
                name: 'AI Travel Companion Chatbot',
                keywords: 'ai chatbot assistant companion route optimization tips sightseeing',
                subtitle: 'Ask AI for route stop optimization, mileage tips & sightseeing',
                badge: 'AI FEATURE',
                badgeClass: 'bg-success text-white',
                iconClass: 'fas fa-robot',
                iconBg: 'bg-success-subtle text-success',
                action: 'toggle_ai_chat'
            },
            {
                name: 'Eco Carbon Tracker',
                keywords: 'eco carbon footprint green co2 emissions train ev bus savings',
                subtitle: 'View environmental impact and CO2 savings for your journeys',
                badge: 'ECO',
                badgeClass: 'bg-success text-white',
                iconClass: 'fas fa-leaf',
                iconBg: 'bg-success-subtle text-success',
                action: 'scroll_to_eco'
            }
        ];

        tools.forEach(tool => {
            if (!q || tool.name.toLowerCase().includes(q) || tool.keywords.includes(q)) {
                results.push({
                    category: 'tools',
                    title: tool.name,
                    subtitle: tool.subtitle,
                    badge: tool.badge,
                    badgeClass: tool.badgeClass,
                    iconClass: tool.iconClass,
                    iconBg: tool.iconBg,
                    data: {
                        action: tool.action || 'open_url',
                        url: tool.url
                    }
                });
            }
        });

        _currentSearchResults = results;
        _activeSearchIndex = -1;

        updateSearchCategoryCounters(results);
        renderGlobalSearchResults(q);

    } catch (err) {
        console.error('Error during performGlobalSearch:', err);
    }
}

function updateSearchCategoryCounters(results) {
    const counts = {
        all: results.length,
        tickets: results.filter(r => r.category === 'tickets').length,
        trips: results.filter(r => r.category === 'trips').length,
        expenses: results.filter(r => r.category === 'expenses').length,
        itinerary: results.filter(r => r.category === 'itinerary').length,
        destinations: results.filter(r => r.category === 'destinations').length,
        tools: results.filter(r => r.category === 'tools').length
    };

    Object.keys(counts).forEach(cat => {
        const badge = document.getElementById(`cnt-${cat}`);
        if (badge) badge.textContent = counts[cat];
    });
}

function renderGlobalSearchResults(highlightQuery = '') {
    const container = document.getElementById('global-search-results-list');
    const summary = document.getElementById('search-results-summary');
    if (!container) return;

    let filtered = _currentSearchResults;
    if (_currentSearchFilter !== 'all') {
        filtered = _currentSearchResults.filter(r => r.category === _currentSearchFilter);
    }

    if (summary) {
        summary.textContent = `${filtered.length} result${filtered.length === 1 ? '' : 's'} found`;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="search-empty-state">
                <i class="fas fa-search-minus fa-3x mb-3 text-muted"></i>
                <h6 class="fw-bold">No matching results found</h6>
                <p class="text-muted small mb-0">Try searching for ticket PNRs, trip names, expenses like "Fuel", or cities like "Hyderabad"</p>
            </div>
        `;
        return;
    }

    const highlightText = (text, q) => {
        if (!q || !text) return text || '';
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    };

    let html = '';
    const categories = ['tickets', 'trips', 'expenses', 'itinerary', 'destinations', 'tools'];
    const categoryLabels = {
        tickets: '🎟️ Tickets & Darshan Passes',
        trips: '✈️ Trips',
        expenses: '💰 Expenses',
        itinerary: '📍 Itinerary & Activities',
        destinations: '🌍 Popular Destinations & Places',
        tools: '⚡ Quick Tools & Features'
    };

    categories.forEach(cat => {
        const catItems = filtered.filter(item => item.category === cat);
        if (catItems.length > 0) {
            if (_currentSearchFilter === 'all') {
                html += `<div class="search-result-group-header">${categoryLabels[cat]} (${catItems.length})</div>`;
            }

            catItems.forEach(item => {
                const itemIdx = filtered.indexOf(item);
                const isSelected = itemIdx === _activeSearchIndex;
                html += `
                    <div class="search-result-item ${isSelected ? 'selected' : ''}" data-result-index="${itemIdx}">
                        <div class="d-flex align-items-center gap-3 overflow-hidden">
                            <div class="search-result-icon ${item.iconBg}">
                                <i class="${item.iconClass}"></i>
                            </div>
                            <div class="overflow-hidden">
                                <div class="fw-bold text-dark text-truncate" style="font-size: 0.95rem;">
                                    ${highlightText(item.title, highlightQuery)}
                                </div>
                                <div class="text-muted small text-truncate" style="font-size: 0.8rem;">
                                    ${highlightText(item.subtitle, highlightQuery)}
                                </div>
                            </div>
                        </div>
                        <div class="ms-2 flex-shrink-0">
                            <span class="badge ${item.badgeClass} rounded-pill px-2.5 py-1 small">${item.badge}</span>
                        </div>
                    </div>
                `;
            });
        }
    });

    container.innerHTML = html;

    // Attach click and pointer listeners to result cards
    container.querySelectorAll('.search-result-item').forEach(el => {
        const selectHandler = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            const idx = parseInt(el.getAttribute('data-result-index'), 10);
            if (!isNaN(idx) && filtered[idx]) {
                handleSearchResultClick(filtered[idx]);
            }
        };
        el.addEventListener('click', selectHandler);
        el.addEventListener('mousedown', selectHandler);
    });
}

function handleSearchKeyboardNav(e) {
    let filtered = _currentSearchResults;
    if (_currentSearchFilter !== 'all') {
        filtered = _currentSearchResults.filter(r => r.category === _currentSearchFilter);
    }
    if (filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        _activeSearchIndex = (_activeSearchIndex + 1) % filtered.length;
        renderGlobalSearchResults(document.getElementById('overlay-search-input')?.value || '');
        scrollToActiveSearchResult();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        _activeSearchIndex = (_activeSearchIndex - 1 + filtered.length) % filtered.length;
        renderGlobalSearchResults(document.getElementById('overlay-search-input')?.value || '');
        scrollToActiveSearchResult();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (_activeSearchIndex >= 0 && filtered[_activeSearchIndex]) {
            handleSearchResultClick(filtered[_activeSearchIndex]);
        } else if (filtered.length > 0) {
            handleSearchResultClick(filtered[0]);
        }
    }
}

function scrollToActiveSearchResult() {
    const container = document.getElementById('global-search-results-list');
    const selected = container?.querySelector('.search-result-item.selected');
    if (selected && container) {
        selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

function handleSearchResultClick(result) {
    if (!result || !result.data) return;
    const data = result.data;
    closeGlobalSearchOverlay();

    if (data.action === 'open_ticket') {
        if (data.trip && typeof setCurrentTrip === 'function') {
            setCurrentTrip(data.trip);
        }
        window.location.href = `trip-details.html?id=${data.tripId}&tab=tickets&ticketId=${data.ticketId}`;
    } else if (data.action === 'open_trip') {
        if (data.trip && typeof setCurrentTrip === 'function') {
            setCurrentTrip(data.trip);
        }
        window.location.href = `trip-details.html?id=${data.tripId}`;
    } else if (data.action === 'open_expense') {
        if (data.trip && typeof setCurrentTrip === 'function') {
            setCurrentTrip(data.trip);
        }
        window.location.href = `trip-details.html?id=${data.tripId}&tab=expenses&expenseId=${data.expenseId}`;
    } else if (data.action === 'open_itinerary') {
        if (data.trip && typeof setCurrentTrip === 'function') {
            setCurrentTrip(data.trip);
        }
        window.location.href = `trip-details.html?id=${data.tripId}&tab=itinerary`;
    } else if (data.action === 'create_trip_dest') {
        if (typeof showCreateTripModal === 'function') {
            showCreateTripModal();
            setTimeout(() => {
                const tripNameInput = document.getElementById('trip-name');
                if (tripNameInput && data.destinationName) {
                    tripNameInput.value = `Trip to ${data.destinationName}`;
                }
            }, 300);
        }
    } else if (data.action === 'open_url' && data.url) {
        window.location.href = data.url;
    } else if (data.action === 'modal_create_trip') {
        if (typeof showCreateTripModal === 'function') showCreateTripModal();
    } else if (data.action === 'modal_join_trip') {
        if (typeof showJoinTripModal === 'function') showJoinTripModal();
    } else if (data.action === 'toggle_ai_chat') {
        const toggleBtn = document.getElementById('ai-chat-toggle');
        const container = document.getElementById('ai-chat-container');
        if (container && container.style.display !== 'flex') {
            if (toggleBtn) toggleBtn.click();
        }
    } else if (data.action === 'scroll_to_eco') {
        const ecoCard = document.getElementById('dashboard-eco-card');
        if (ecoCard) {
            ecoCard.scrollIntoView({ behavior: 'smooth' });
        }
    }
}


// ── HERO DIGITAL TICKET VIEW MODAL ───────────────────────────────────────

function openHeroTicketModal(param1, param2) {
    let ticketId = param1;
    if (param1 && typeof param1 === 'object' && param1.preventDefault) {
        param1.preventDefault();
        param1.stopPropagation();
        ticketId = param2;
    }

    const modalEl = document.getElementById('heroTicketViewModal');
    const modalBody = document.getElementById('hero-ticket-modal-body');
    if (!modalEl || !modalBody) return;

    // Ensure modal element is at body root level to avoid CSS transform/overflow traps
    if (modalEl.parentNode !== document.body) {
        document.body.appendChild(modalEl);
    }

    let ticket = null;
    let tripName = 'Active Trip';

    // Find active trip or search all userTrips for this ticketId
    const activeTrip = (window.userTrips || []).find(t => {
        if (!t.tickets) return false;
        return t.tickets.some(tkt => tkt && tkt.id === ticketId);
    });

    if (activeTrip && activeTrip.tickets) {
        ticket = activeTrip.tickets.find(tkt => tkt && tkt.id === ticketId);
        tripName = activeTrip.name || 'Trip Pass';
    }

    const detailsLink = document.getElementById('hero-ticket-details-link');
    if (detailsLink && activeTrip) {
        detailsLink.href = `trip-details.html?id=${activeTrip.id}&tab=tickets`;
    }

    // Fallback search across all trips
    if (!ticket && window.userTrips) {
        for (const tr of window.userTrips) {
            if (tr.tickets) {
                const found = tr.tickets.find(tkt => tkt && tkt.id === ticketId);
                if (found) {
                    ticket = found;
                    tripName = tr.name || 'Trip Pass';
                    break;
                }
            }
        }
    }

    // Fallback: check activeTrip.trainDetails if ticketId === 'manual' or ticket not found
    if (!ticket) {
        const curActive = (window.userTrips || []).find(t => {
            const today = new Date();
            today.setHours(0,0,0,0);
            const start = new Date(t.startDate);
            const end = new Date(t.endDate);
            start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
            return today >= start && today <= end;
        }) || (window.userTrips && window.userTrips[0]);

        if (curActive) {
            tripName = curActive.name || 'Active Trip';
            if (curActive.tickets && curActive.tickets.length > 0) {
                ticket = curActive.tickets.find(tkt => tkt.type === 'train') || curActive.tickets[0];
            }
            if (!ticket && curActive.trainDetails) {
                const td = curActive.trainDetails;
                ticket = {
                    id: 'manual',
                    serviceNo: td.number,
                    serviceName: td.name,
                    departureTime: td.departure,
                    arrivalTime: td.arrival,
                    departurePlace: curActive.startLocation,
                    arrivalPlace: curActive.destination,
                    seatNo: td.coach,
                    bookingStatus: 'Confirmed',
                    operator: 'Indian Railways'
                };
            }
        }
    }

    if (!ticket) {
        if (typeof showToast === 'function') showToast('Ticket details not found.', 'warning');
        return;
    }

    const depTime = typeof _extractTime === 'function' ? _extractTime(ticket.departureTime) : (ticket.departureTime || '—');
    const arrTime = typeof _extractTime === 'function' ? _extractTime(ticket.arrivalTime) : (ticket.arrivalTime || '—');
    const status = ticket.bookingStatus || 'Confirmed';
    const statusColor = status.toLowerCase().includes('confirm') ? 'bg-success'
                      : status.toLowerCase().includes('wait')    ? 'bg-warning text-dark'
                      : 'bg-danger';

    modalBody.innerHTML = `
    <div class="card border-0 shadow-sm overflow-hidden" style="border-radius: 16px;">
        <!-- Digital Pass Header -->
        <div class="p-3 text-white d-flex justify-content-between align-items-center" style="background: linear-gradient(135deg, #1a3a2a 0%, #0d2318 100%);">
            <div>
                <span class="badge ${statusColor} mb-1"><i class="fas fa-check-circle me-1"></i>${status}</span>
                <h4 class="fw-bold mb-0 text-white">${ticket.serviceNo ? ticket.serviceNo + ' - ' : ''}${ticket.serviceName || ticket.operator || 'Train Boarding Pass'}</h4>
                <small class="text-white-50"><i class="fas fa-suitcase-rolling me-1"></i>${tripName}</small>
            </div>
            <div class="text-end">
                <span class="text-white-50 small d-block" style="font-size:0.7rem; letter-spacing:0.5px;">PNR / BOOKING NO.</span>
                <span class="fw-bold font-monospace fs-5 text-warning">${ticket.ticketNo || 'N/A'}</span>
            </div>
        </div>

        <!-- Pass Body -->
        <div class="p-4 bg-white">
            <!-- Route / Stations -->
            <div class="row align-items-center text-center mb-4 pb-3 border-bottom">
                <div class="col-5 text-start">
                    <span class="text-muted small d-block" style="font-size:0.7rem;">DEPARTURE</span>
                    <h5 class="fw-bold mb-0 text-dark">${ticket.depCode || ticket.departurePlace || 'Origin'}</h5>
                    <span class="text-success fw-semibold"><i class="fas fa-clock me-1"></i>${depTime}</span>
                </div>
                <div class="col-2">
                    <i class="fas fa-arrow-right text-muted fs-4"></i>
                </div>
                <div class="col-5 text-end">
                    <span class="text-muted small d-block" style="font-size:0.7rem;">ARRIVAL</span>
                    <h5 class="fw-bold mb-0 text-dark">${ticket.arrCode || ticket.arrivalPlace || 'Destination'}</h5>
                    <span class="text-primary fw-semibold"><i class="fas fa-clock me-1"></i>${arrTime}</span>
                </div>
            </div>

            <!-- Details Grid -->
            <div class="row g-3 mb-3">
                <div class="col-6 col-md-3">
                    <span class="text-muted small d-block" style="font-size:0.7rem;">PASSENGER</span>
                    <span class="fw-semibold text-dark">${ticket.passengerName || 'Traveler'}</span>
                </div>
                <div class="col-6 col-md-3">
                    <span class="text-muted small d-block" style="font-size:0.7rem;">COACH / SEAT</span>
                    <span class="fw-semibold text-dark">${ticket.seatNo || '—'}</span>
                </div>
                <div class="col-6 col-md-3">
                    <span class="text-muted small d-block" style="font-size:0.7rem;">OPERATOR</span>
                    <span class="fw-semibold text-dark">${ticket.operator || 'Indian Railways'}</span>
                </div>
                <div class="col-6 col-md-3">
                    <span class="text-muted small d-block" style="font-size:0.7rem;">TICKET FARE</span>
                    <span class="fw-bold text-success">${ticket.cost !== undefined && ticket.cost !== null ? '₹' + parseFloat(ticket.cost).toLocaleString('en-IN') : 'Included'}</span>
                </div>
            </div>

            ${(ticket.isConcession || (ticket.generalFare > 0 && ticket.generalFare > ticket.cost)) ? `
            <div class="p-2.5 rounded-3 mb-3 border border-info border-opacity-50 bg-info bg-opacity-10 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                    <span class="text-info-emphasis small fw-bold d-block">
                        <i class="fas fa-wheelchair me-1"></i>Divyangjan Disability Concession (${ticket.concessionPercent || 75}%)
                    </span>
                    <span class="text-muted small" style="font-size:0.72rem;">
                        General Ticket Fare: <span class="text-decoration-line-through me-1">₹${(ticket.generalFare || 0).toLocaleString('en-IN')}</span> | Paid: <strong>₹${(ticket.cost || 0).toLocaleString('en-IN')}</strong>
                    </span>
                </div>
                <div>
                    <span class="badge bg-success text-white px-2.5 py-1 fw-bold" style="font-size:0.75rem;">
                        <i class="fas fa-piggy-bank me-1"></i>Saved ₹${(ticket.concessionSavings !== undefined ? ticket.concessionSavings : Math.max(0, (ticket.generalFare || 0) - (ticket.cost || 0))).toLocaleString('en-IN')}
                    </span>
                </div>
            </div>` : ''}

            ${ticket.notes ? `
            <div class="p-2.5 bg-light rounded-3 mb-3 border">
                <small class="text-muted d-block fw-semibold" style="font-size:0.72rem;">Notes:</small>
                <small class="text-dark">${ticket.notes}</small>
            </div>` : ''}

            <!-- Attachment / Receipt image if available -->
            ${ticket.imageUrl ? `
            <div class="text-center pt-3 border-top">
                <span class="text-muted small d-block mb-2"><i class="fas fa-file-image me-1 text-primary"></i>Uploaded Ticket Pass / QR Code Receipt</span>
                <div class="position-relative d-inline-block border rounded-3 overflow-hidden shadow-2xs bg-light p-2 mb-2" style="max-width:100%;">
                    <img src="${ticket.imageUrl}" alt="Ticket Image" class="img-fluid rounded" style="max-height: 380px; object-fit: contain;">
                </div>
                <div>
                    <a href="${ticket.imageUrl}" target="_blank" download class="btn btn-sm btn-outline-primary rounded-pill px-4">
                        <i class="fas fa-download me-1"></i>Open Full Image / Pass
                    </a>
                </div>
            </div>` : `
            <div class="text-center pt-3 border-top">
                <span class="text-muted small"><i class="fas fa-info-circle me-1"></i>No ticket image attached.</span>
            </div>`}
        </div>
    </div>`;

    try {
        if (window.bootstrap && bootstrap.Modal) {
            const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
            bsModal.show();
        } else if (typeof $ !== 'undefined') {
            $('#heroTicketViewModal').modal('show');
        } else {
            modalEl.classList.add('show');
            modalEl.style.display = 'block';
        }
    } catch (e) {
        console.error('Modal toggle error:', e);
    }
}
window.openHeroTicketModal = openHeroTicketModal;


// ── INDIAN RAIL API LIVE TRAIN RUNNING STATUS INTEGRATION ─────────────────

async function fetchAndShowLiveTrainStatus(evt, trainNumber, tripDateStr, customTrainName, originStationCode) {
    if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    }

    const modalEl = document.getElementById('liveTrainStatusModal');
    const modalBody = document.getElementById('live-train-status-modal-body');
    if (!modalEl || !modalBody) return;

    if (modalEl.parentNode !== document.body) {
        document.body.appendChild(modalEl);
    }

    // Clean train number (strip non-digits, e.g. "12788")
    const cleanTrainNo = (trainNumber || '').toString().replace(/\D/g, '');
    if (!cleanTrainNo) {
        if (typeof showToast === 'function') showToast('Please provide a valid Train Number.', 'warning');
        return;
    }

    // Format YYYYMMDD for Indian Rail API
    let dateObj = new Date();
    if (tripDateStr) {
        const parsed = new Date(tripDateStr);
        if (!isNaN(parsed.getTime())) dateObj = parsed;
    }
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const dateYYYYMMDD = `${yyyy}${mm}${dd}`;

    try {
        if (window.bootstrap && bootstrap.Modal) {
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        } else if (typeof $ !== 'undefined') {
            $('#liveTrainStatusModal').modal('show');
        } else {
            modalEl.classList.add('show');
            modalEl.style.display = 'block';
        }
    } catch (e) {
        console.error('Modal toggle error:', e);
    }

    // Render Clean In-App Live Status (ConfirmTkt & RailYatri only, actual train name & origin station)
    _renderCleanLiveTrainStatus(cleanTrainNo, dateYYYYMMDD, customTrainName, originStationCode);
}
window.fetchAndShowLiveTrainStatus = fetchAndShowLiveTrainStatus;

function resolveIndianRailwayStationCode(stnInput) {
    if (!stnInput) return '';
    const clean = stnInput.trim().toUpperCase();
    
    const codeMap = {
        'JALNA': 'J',
        'CHHATRAPATI SAMBHAJINAGAR': 'AWB',
        'AURANGABAD': 'AWB',
        'PARBHANI': 'PBN',
        'PARBHANI JN': 'PBN',
        'NANDED': 'NED',
        'HAZUR SAHIB NANDED': 'NED',
        'SECUNDERABAD': 'SC',
        'HYDERABAD': 'HYB',
        'MUMBAI': 'CSMT',
        'MUMBAI CSMT': 'CSMT',
        'CST': 'CSMT',
        'DADAR': 'DR',
        'KALYAN': 'KYN',
        'PANVEL': 'PNVL',
        'PUNE': 'PUNE',
        'NEW DELHI': 'NDLS',
        'CHENNAI': 'MAS',
        'BENGALURU': 'SBC',
        'MANMAD': 'MMR',
        'PARTUR': 'PTU',
        'SELU': 'SELU',
        'NIZAMABAD': 'NZB',
        'KACHEGUDA': 'KCG',
        'VIJAYAWADA': 'BZA'
    };

    if (codeMap[clean]) return codeMap[clean];
    const match = clean.match(/\(([A-Z]{1,5})\)/);
    if (match) return match[1];
    if (/^[A-Z]{1,5}$/.test(clean)) return clean;
    return clean;
}

function _renderCleanLiveTrainStatus(trainNo, dateYYYYMMDD, trainNameStr, originStnCode) {
    const modalBody = document.getElementById('live-train-status-modal-body');
    if (!modalBody) return;

    window._currentLiveTrainNo = trainNo;
    const rawStn = (originStnCode || '').trim();
    const resolvedCode = resolveIndianRailwayStationCode(rawStn);
    window._currentLiveOriginStn = resolvedCode || rawStn;

    let initialUrl = `https://www.confirmtkt.com/train-running-status/${trainNo}`;
    if (window._currentLiveOriginStn) {
        const stnEnc = encodeURIComponent(window._currentLiveOriginStn);
        initialUrl += `?stn=${stnEnc}&src=${stnEnc}&boardStation=${stnEnc}#${stnEnc}`;
    }

    const displayTrainTitle = trainNameStr ? `${trainNameStr} (#${trainNo})` : `Train #${trainNo}`;

    modalBody.innerHTML = `
        <div class="card border-0 shadow-sm rounded-3 overflow-hidden bg-white">
            <!-- Modal Header Banner with Saved Train Name & Origin Station -->
            <div class="p-3 text-white d-flex align-items-center justify-content-between flex-wrap gap-2" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
                <div>
                    <div class="d-flex align-items-center gap-2 mb-1">
                        <span class="badge bg-success text-white px-2.5 py-1 font-monospace" style="font-size:0.75rem;">
                            <i class="fas fa-satellite-dish me-1"></i>Live Running Status
                        </span>
                        ${window._currentLiveOriginStn ? `
                            <span class="badge bg-warning text-dark font-monospace fw-bold" style="font-size:0.75rem;">
                                <i class="fas fa-location-dot me-1"></i>Origin Station: ${window._currentLiveOriginStn} ${rawStn && rawStn !== window._currentLiveOriginStn ? `(${rawStn})` : ''}
                            </span>
                        ` : ''}
                    </div>
                    <h4 class="fw-bold mb-0 text-white"><i class="fas fa-train me-2 text-warning"></i>${displayTrainTitle}</h4>
                </div>
                <div class="text-end">
                    <span class="badge bg-secondary font-monospace" style="font-size:0.75rem;">Date: ${dateYYYYMMDD.slice(6,8)}/${dateYYYYMMDD.slice(4,6)}/${dateYYYYMMDD.slice(0,4)}</span>
                </div>
            </div>

            <!-- Toolbar Header: Provider Tabs (ConfirmTkt, RailYatri & Where Is My Train) -->
            <div class="p-3 bg-light border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <span class="fw-semibold text-secondary small me-1">Live Tracker Provider:</span>
                    <div class="btn-group btn-group-sm" role="group" id="live-train-provider-tabs">
                        <button type="button" class="btn btn-primary active" id="tab-provider-confirmtkt" onclick="switchLiveTrainIframe('confirmtkt', '${trainNo}')">
                            <i class="fas fa-train me-1"></i>ConfirmTkt Live
                        </button>
                        <button type="button" class="btn btn-outline-dark" id="tab-provider-railyatri" onclick="switchLiveTrainIframe('railyatri', '${trainNo}')">
                            <i class="fas fa-compass me-1"></i>RailYatri Live
                        </button>
                        <button type="button" class="btn btn-outline-warning text-dark fw-bold" id="tab-provider-wimt" onclick="switchLiveTrainIframe('wimt', '${trainNo}')">
                            <i class="fas fa-location-arrow me-1"></i>Where Is My Train
                        </button>
                    </div>
                </div>
                
                <div class="d-flex align-items-center gap-2">
                    <button type="button" class="btn btn-outline-primary btn-sm rounded-pill px-3 py-1" onclick="refreshLiveTrainIframe()" title="Refresh Live Data">
                        <i class="fas fa-rotate me-1"></i>Refresh
                    </button>
                    <a id="btn-open-external-live" href="${initialUrl}" target="_blank" class="btn btn-outline-success btn-sm rounded-pill px-3 py-1" title="Open in External Tab/App">
                        <i class="fas fa-external-link-alt me-1"></i>Open Full Page
                    </a>
                </div>
            </div>

            <!-- EMBEDDED INTERACTIVE LIVE MAP & RUNNING TRACKER -->
            <div class="position-relative w-100 bg-white" style="height: 68vh; min-height: 480px;">
                <iframe id="live-train-iframe" 
                        src="${initialUrl}" 
                        style="width: 100%; height: 100%; border: none;" 
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
                        referrerpolicy="no-referrer"
                        title="Live Train Running Status">
                </iframe>
            </div>
            
            <div class="p-2 px-3 bg-light border-top d-flex align-items-center justify-content-between text-muted small" style="font-size:0.75rem;">
                <span><i class="fas fa-shield-halved text-success me-1"></i>Live Running Tracker ${window._currentLiveOriginStn ? `(Origin: <strong>${window._currentLiveOriginStn}</strong>)` : ''}</span>
                <span>Switch between ConfirmTkt, RailYatri, and Where Is My Train anytime.</span>
            </div>
        </div>
    `;
}

window._passengerGpsWatchId = null;
window._lastPassengerGpsCoords = null;

window.togglePassengerOnTrainGps = function(evt) {
    if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    }
    if (window._passengerGpsWatchId !== null) {
        window.stopPassengerOnTrainGpsTracking();
    } else {
        window.startPassengerOnTrainGpsTracking();
    }
};

window.startPassengerOnTrainGpsTracking = function() {
    if (!('geolocation' in navigator)) {
        if (typeof showToast === 'function') showToast('GPS Geolocation is not supported by your browser.', 'warning');
        return;
    }

    const container = document.getElementById('on-train-gps-container');
    if (container) container.style.display = 'block';

    const placeEl = document.getElementById('dashboard-gps-place');
    const speedEl = document.getElementById('dashboard-gps-speed');
    const coordsEl = document.getElementById('dashboard-gps-coords');

    if (placeEl) placeEl.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Connecting GPS...';
    if (speedEl) speedEl.textContent = '⚡ Calc Speed...';
    if (coordsEl) coordsEl.textContent = 'Acquiring Satellites...';

    if (typeof showToast === 'function') showToast('📍 On-Train Live GPS Tracking Started!', 'success');

    function onGpsPositionUpdate(pos) {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const speedMps = pos.coords.speed || 0;
        let speedKmH = Math.round(speedMps * 3.6);

        if (speedKmH === 0 && window._lastPassengerGpsCoords && window._lastPassengerGpsCoords.time) {
            const timeDiffSec = (pos.timestamp - window._lastPassengerGpsCoords.time) / 1000;
            if (timeDiffSec > 2) {
                const distM = _calcHaversineDistanceKm(window._lastPassengerGpsCoords.lat, window._lastPassengerGpsCoords.lng, lat, lng) * 1000;
                speedKmH = Math.min(180, Math.round((distM / timeDiffSec) * 3.6));
            }
        }
        window._lastPassengerGpsCoords = { lat, lng, time: pos.timestamp };

        if (coordsEl) coordsEl.textContent = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
        if (speedEl) speedEl.textContent = `⚡ ${speedKmH} km/h`;

        fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`)
            .then(r => r.json())
            .then(data => {
                const city = data.city || data.locality || data.principalSubdivision || '';
                const placeName = city ? `${city}, ${data.principalSubdivision || 'India'}` : `${lat.toFixed(3)}° N, ${lng.toFixed(3)}° E`;
                
                if (placeEl) placeEl.innerHTML = `📍 ${placeName}`;
            })
            .catch(err => {
                console.warn('Reverse geocode error:', err);
                if (placeEl) placeEl.innerHTML = `📍 ${lat.toFixed(3)}° N, ${lng.toFixed(3)}° E`;
            });
    }

    function onGpsError(err) {
        console.error('GPS error:', err);
        if (placeEl) placeEl.innerHTML = '<span class="text-danger">⚠️ GPS Permission Required</span>';
        if (typeof showToast === 'function') showToast('Unable to get GPS position. Please check location permissions.', 'danger');
    }

    if (window._passengerGpsWatchId !== null) {
        navigator.geolocation.clearWatch(window._passengerGpsWatchId);
    }

    window._passengerGpsWatchId = navigator.geolocation.watchPosition(onGpsPositionUpdate, onGpsError, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 3000
    });
};

window.refreshPassengerGpsPosition = function() {
    if (window._passengerGpsWatchId !== null) {
        window.startPassengerOnTrainGpsTracking();
    }
};

window.stopPassengerOnTrainGpsTracking = function() {
    if (window._passengerGpsWatchId !== null) {
        navigator.geolocation.clearWatch(window._passengerGpsWatchId);
        window._passengerGpsWatchId = null;
    }
    const container = document.getElementById('on-train-gps-container');
    if (container) container.style.display = 'none';
    if (typeof showToast === 'function') showToast('GPS Tracking stopped.', 'info');
};

function _calcHaversineDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

window.updateLiveSummaryBadges = function(delayStr, locationStr) {
    const delayEl = document.getElementById('live-card-delay-status');
    const locEl = document.getElementById('live-card-current-location');

    if (delayEl) {
        if (!delayStr || delayStr.toLowerCase().includes('on time')) {
            delayEl.className = 'fs-6 d-block mt-0.5 text-success';
            delayEl.style.color = '#4ade80';
            delayEl.innerHTML = '<i class="fas fa-check-circle me-1"></i>On Time 🟢';
        } else {
            delayEl.className = 'fs-6 d-block mt-0.5 text-danger';
            delayEl.style.color = '#f87171';
            delayEl.innerHTML = `<i class="fas fa-clock me-1"></i>${delayStr}`;
        }
    }

    if (locEl && locationStr) {
        locEl.style.color = '#fde047';
        locEl.innerHTML = `📍 ${locationStr}`;
    }
};

window.switchLiveTrainIframe = function(provider, trainNo) {
    const iframe = document.getElementById('live-train-iframe');
    const extBtn = document.getElementById('btn-open-external-live');
    if (!iframe) return;

    document.querySelectorAll('#live-train-provider-tabs button').forEach(b => {
        b.classList.remove('active', 'btn-primary', 'btn-warning', 'text-dark', 'fw-bold');
        b.classList.add('btn-outline-dark');
    });

    const originStn = (window._currentLiveOriginStn || '').trim();
    const stnEnc = encodeURIComponent(originStn);
    let targetUrl = `https://www.confirmtkt.com/train-running-status/${trainNo}`;
    const activeTab = document.getElementById(`tab-provider-${provider}`);

    if (provider === 'confirmtkt') {
        targetUrl = `https://www.confirmtkt.com/train-running-status/${trainNo}`;
        if (originStn) targetUrl += `?stn=${stnEnc}&src=${stnEnc}&boardStation=${stnEnc}#${stnEnc}`;
        if (activeTab) { activeTab.classList.add('active', 'btn-primary'); activeTab.classList.remove('btn-outline-dark'); }
    } else if (provider === 'railyatri') {
        targetUrl = `https://www.railyatri.in/live-train-status/${trainNo}`;
        if (originStn) targetUrl += `?start_station=${stnEnc}`;
        if (activeTab) { activeTab.classList.add('active', 'btn-primary'); activeTab.classList.remove('btn-outline-dark'); }
    } else if (provider === 'wimt') {
        targetUrl = `https://whereismytrain.in/train/${trainNo}`;
        if (originStn) targetUrl += `?stn=${stnEnc}`;
        if (activeTab) { activeTab.classList.add('active', 'btn-warning', 'text-dark', 'fw-bold'); activeTab.classList.remove('btn-outline-dark'); }
    }

    iframe.src = targetUrl;
    if (extBtn) {
        if (provider === 'wimt') {
            extBtn.href = `intent://train/${trainNo}#Intent;scheme=wimt;package=com.whereismytrain.android;end;`;
            extBtn.innerHTML = '<i class="fas fa-mobile-screen-button me-1"></i>Open App';
        } else {
            extBtn.href = targetUrl;
            extBtn.innerHTML = '<i class="fas fa-external-link-alt me-1"></i>Open Full Page';
        }
    }
};

window.refreshLiveTrainIframe = function() {
    const iframe = document.getElementById('live-train-iframe');
    if (!iframe) return;
    const currentSrc = iframe.src;
    iframe.src = 'about:blank';
    setTimeout(() => { iframe.src = currentSrc; }, 50);
};

