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
            // User is signed in, redirect to dashboard
            navigateTo('dashboard.html');
        }
    });
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        // Redirect will happen in auth state listener
    } catch (error) {
        showAuthMessage(error.message, 'danger');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    
    if (password !== confirmPassword) {
        showAuthMessage("Passwords don't match", 'danger');
        return;
    }
    
    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        await result.user.updateProfile({
            displayName: name
        });
        
        // Create user document in Firestore
        await db.collection('users').doc(result.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
    } catch (error) {
        showAuthMessage(error.message, 'danger');
    }
}

async function handleResetPassword(e) {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    
    try {
        await auth.sendPasswordResetEmail(email);
        showAuthMessage('Password reset email sent!', 'success');
    } catch (error) {
        showAuthMessage(error.message, 'danger');
    }
}

async function handleGoogleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        // Check if user exists in Firestore, if not create a new document
        await db.collection('users').doc(user.uid).set({
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
    } catch (error) {
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
