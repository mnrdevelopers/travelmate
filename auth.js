// Authentication functionality
document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    setupAuthEventListeners();
});

function setupAuthEventListeners() {
    // Form toggles
    document.getElementById('show-signup').addEventListener('click', showSignupForm);
    document.getElementById('show-login').addEventListener('click', showLoginForm);
    document.getElementById('forgot-password').addEventListener('click', showResetPasswordForm);
    document.getElementById('back-to-login').addEventListener('click', showLoginForm);
    
    // Form submissions
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('signup-form').addEventListener('submit', handleSignup);
    document.getElementById('reset-password-form').addEventListener('submit', handleResetPassword);
    document.getElementById('google-signin-btn').addEventListener('click', handleGoogleSignIn);
}

function checkAuthState() {
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in, ensure user profile exists
            ensureUserProfile(user);
        }
    });
}

async function ensureUserProfile(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        const userData = {
            email: user.email,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add name and photoURL if available
        if (user.displayName) {
            userData.name = user.displayName;
        }
        if (user.photoURL) {
            userData.photoURL = user.photoURL;
        }
        
        if (!userDoc.exists) {
            // Create new user profile
            userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('users').doc(user.uid).set(userData);
            console.log('New user profile created:', user.uid);
        } else {
            // Update existing user profile
            await db.collection('users').doc(user.uid).update(userData);
            console.log('User profile updated:', user.uid);
        }
        
        // Redirect to dashboard after profile is ensured
        navigateTo('dashboard.html');
        
    } catch (error) {
        console.error('Error ensuring user profile:', error);
        // Still redirect to dashboard even if profile creation fails
        navigateTo('dashboard.html');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showAuthMessage('Please enter both email and password', 'warning');
        return;
    }
    
    try {
        showAuthMessage('Logging in...', 'info');
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        // Profile creation and redirect will happen in ensureUserProfile
    } catch (error) {
        console.error('Login error:', error);
        showAuthMessage(error.message, 'danger');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    
    if (!name || !email || !password || !confirmPassword) {
        showAuthMessage('Please fill in all fields', 'warning');
        return;
    }
    
    if (password !== confirmPassword) {
        showAuthMessage("Passwords don't match", 'danger');
        return;
    }
    
    if (password.length < 6) {
        showAuthMessage("Password must be at least 6 characters", 'danger');
        return;
    }
    
    try {
        showAuthMessage('Creating account...', 'info');
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update profile with name
        await user.updateProfile({
            displayName: name
        });
        
        // Force refresh user data
        await user.reload();
        
        // Profile creation will happen in ensureUserProfile
        showAuthMessage('Account created successfully! Redirecting...', 'success');
        
    } catch (error) {
        console.error('Signup error:', error);
        showAuthMessage(error.message, 'danger');
    }
}

async function handleResetPassword(e) {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    
    if (!email) {
        showAuthMessage('Please enter your email address', 'warning');
        return;
    }
    
    try {
        showAuthMessage('Sending reset email...', 'info');
        await auth.sendPasswordResetEmail(email);
        showAuthMessage('Password reset email sent! Check your inbox.', 'success');
    } catch (error) {
        console.error('Password reset error:', error);
        showAuthMessage(error.message, 'danger');
    }
}

async function handleGoogleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    try {
        const result = await auth.signInWithPopup(provider);
        // Profile creation and redirect will happen in ensureUserProfile
    } catch (error) {
        console.error('Google sign-in error:', error);
        showAuthMessage(error.message, 'danger');
    }
}

function showAuthMessage(message, type) {
    const messageEl = document.getElementById('auth-message');
    messageEl.textContent = message;
    messageEl.className = `alert alert-${type} mt-3`;
    messageEl.classList.remove('d-none');
}

function showLoginForm(e) {
    e.preventDefault();
    document.getElementById('login-form').classList.remove('d-none');
    document.getElementById('signup-form').classList.add('d-none');
    document.getElementById('reset-password-form').classList.add('d-none');
    document.getElementById('auth-message').classList.add('d-none');
}

function showSignupForm(e) {
    e.preventDefault();
    document.getElementById('login-form').classList.add('d-none');
    document.getElementById('signup-form').classList.remove('d-none');
    document.getElementById('reset-password-form').classList.add('d-none');
    document.getElementById('auth-message').classList.add('d-none');
}

function showResetPasswordForm(e) {
    e.preventDefault();
    document.getElementById('login-form').classList.add('d-none');
    document.getElementById('signup-form').classList.add('d-none');
    document.getElementById('reset-password-form').classList.remove('d-none');
    document.getElementById('auth-message').classList.add('d-none');
}
