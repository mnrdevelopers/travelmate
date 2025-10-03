// Authentication functionality - Google Sign-In Only
document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    setupAuthEventListeners();
});

function setupAuthEventListeners() {
    // Only Google Sign-In button
    document.getElementById('google-signin-btn').addEventListener('click', handleGoogleSignIn);
}

function checkAuthState() {
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in, ensure user profile exists and redirect to dashboard
            ensureUserProfile(user);
        }
        // Add else case if needed
    }, error => {
        console.error('Auth state error:', error);
        showAuthMessage('Authentication error. Please refresh the page.', 'danger');
    });
}

async function ensureUserProfile(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        const userData = {
            name: user.displayName || 'Traveler',
            email: user.email,
            photoURL: user.photoURL,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            provider: 'google'
        };
        
        if (!userDoc.exists) {
            // Create new user profile
            userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            userData.firstLogin = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('users').doc(user.uid).set(userData);
            console.log('New user profile created:', user.uid, user.displayName);
        } else {
            // Update existing user profile
            await db.collection('users').doc(user.uid).update(userData);
            console.log('User profile updated:', user.uid, user.displayName);
        }
        
        // Redirect to dashboard after profile is ensured
        showAuthMessage('Welcome to TravelMate! Redirecting...', 'success');
        setTimeout(() => {
            navigateTo('dashboard.html');
        }, 1500);
        
    } catch (error) {
        console.error('Error ensuring user profile:', error);
        showAuthMessage('Welcome! Redirecting to dashboard...', 'info');
        // Still redirect to dashboard even if profile creation fails
        setTimeout(() => {
            navigateTo('dashboard.html');
        }, 1000);
    }
}

async function handleGoogleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // Add scopes for user profile and email
    provider.addScope('profile');
    provider.addScope('email');
    
    // Optional: Custom parameters
    provider.setCustomParameters({
        prompt: 'select_account'
    });
    
    try {
        // Show loading state
        const googleBtn = document.getElementById('google-signin-btn');
        const originalText = googleBtn.innerHTML;
        googleBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';
        googleBtn.disabled = true;
        
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        console.log('Google Sign-In successful:', {
            uid: user.uid,
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL
        });
        
        // Profile creation and redirect will happen in ensureUserProfile
        
    } catch (error) {
        console.error('Google Sign-In error:', error);
        
        // Reset button state
        const googleBtn = document.getElementById('google-signin-btn');
        googleBtn.innerHTML = '<i class="fab fa-google me-2"></i>Continue with Google';
        googleBtn.disabled = false;
        
        // Handle specific errors
        let errorMessage = 'Sign-in failed. Please try again.';
        
        if (error.code === 'auth/popup-blocked') {
            errorMessage = 'Sign-in popup was blocked. Please allow popups for this site.';
        } else if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Sign-in was cancelled.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.code === 'auth/unauthorized-domain') {
            errorMessage = 'This domain is not authorized for sign-in. Please contact support.';
        }
        
        showAuthMessage(errorMessage, 'danger');
    }
}

function showAuthMessage(message, type) {
    const messageEl = document.getElementById('auth-message');
    messageEl.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${getMessageIcon(type)} me-2"></i>
            <div>${message}</div>
        </div>
    `;
    messageEl.className = `alert alert-${type} mt-3`;
    messageEl.classList.remove('d-none');
}

function getMessageIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'danger': return 'exclamation-triangle';
        case 'warning': return 'exclamation-circle';
        case 'info': return 'info-circle';
        default: return 'info-circle';
    }
}
