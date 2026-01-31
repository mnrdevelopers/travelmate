// Authentication functionality - Google Sign-In Only
document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    checkAuthStateAndRedirect();
    setupAuthEventListeners();
});

function setupAuthEventListeners() {
    // Only Google Sign-In button
    document.getElementById('google-signin-btn').addEventListener('click', handleGoogleSignIn);
    
    // Email Auth Forms (if present)
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    if (loginForm) loginForm.addEventListener('submit', handleEmailLogin);
    if (signupForm) signupForm.addEventListener('submit', handleEmailSignup);
    
    // Setup password toggles
    setupPasswordToggles();
    
    // Forgot Password
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }
}

// Add this function to auth.js
function checkAuthStateAndRedirect() {
    // Check if we've already processed redirects in this session
    if (hasAuthRedirectBeenChecked()) {
        return;
    }
    
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in, set flag and redirect to dashboard
            setAuthRedirectFlag();
            console.log('User already logged in, redirecting to dashboard');
            
            // Small delay to ensure everything is loaded
            setTimeout(() => {
                navigateTo('dashboard.html');
            }, 500);
        }
        // If user is not signed in, DO NOT redirect - stay on current page
        // This allows public dashboard to remain visible
    }, error => {
        console.error('Auth state error:', error);
        showAuthMessage('Authentication error. Please refresh the page.', 'danger');
    });
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
            userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            userData.firstLogin = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('users').doc(user.uid).set(userData);
            console.log('New user profile created:', user.uid, user.displayName);
        } else {
            await db.collection('users').doc(user.uid).update(userData);
            console.log('User profile updated:', user.uid, user.displayName);
        }
        
        showAuthMessage('Welcome to TravelMate! Redirecting...', 'success');
        setTimeout(() => {
            navigateTo('dashboard.html'); // Always go to dashboard after login
        }, 1500);
        
    } catch (error) {
        console.error('Error ensuring user profile:', error);
        showAuthMessage('Welcome! Redirecting to dashboard...', 'info');
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

         // ADD THIS LINE - Set flag to show welcome message
        sessionStorage.setItem('justLoggedIn', 'true');
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

async function handleEmailLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = e.target.querySelector('button[type="submit"]');
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing In...';
        
        await auth.signInWithEmailAndPassword(email, password);
        // Redirect handled by onAuthStateChanged
        
    } catch (error) {
        console.error('Login error:', error);
        showAuthMessage(error.message, 'danger');
        btn.disabled = false;
        btn.innerHTML = 'Sign In';
    }
}

async function handleEmailSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const btn = e.target.querySelector('button[type="submit"]');
    
    // Password Complexity Validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        showAuthMessage('Password must be at least 8 characters long and include uppercase, lowercase, number, and special character (@$!%*?&).', 'warning');
        return;
    }

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating Account...';
        
        const result = await auth.createUserWithEmailAndPassword(email, password);
        const user = result.user;
        
        await user.updateProfile({
            displayName: name
        });
        
        // Create user document
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            provider: 'password'
        });
        
        // Redirect handled by onAuthStateChanged
        
    } catch (error) {
        console.error('Signup error:', error);
        showAuthMessage(error.message, 'danger');
        btn.disabled = false;
        btn.innerHTML = 'Create Account';
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

function setupPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            const btn = e.currentTarget;
            const inputGroup = btn.closest('.input-group');
            const input = inputGroup.querySelector('input');
            const icon = btn.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const emailInput = document.getElementById('login-email');
    const email = emailInput ? emailInput.value.trim() : '';
    
    if (!email) {
        showAuthMessage('Please enter your email address first to reset password.', 'warning');
        if (emailInput) emailInput.focus();
        return;
    }
    
    try {
        await auth.sendPasswordResetEmail(email);
        showAuthMessage('Password reset email sent! Please check your inbox.', 'success');
    } catch (error) {
        console.error('Reset password error:', error);
        let errorMessage = error.message;
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email address.';
        }
        showAuthMessage(errorMessage, 'danger');
    }
}
