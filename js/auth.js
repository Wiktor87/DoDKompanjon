// Authentication Module
var currentUser = null;

auth.onAuthStateChanged(function(user) {
    console.log('Auth state:', user ? user.email : 'No user');
    if (user) {
        currentUser = user;
        onUserLoggedIn(user);
    } else {
        currentUser = null;
        showLandingPage();
    }
});

function showLandingPage() {
    var landing = document.getElementById('landingPage');
    var app = document.getElementById('app');
    var modal = document.getElementById('authModal');
    if (landing) landing.classList.remove('hidden');
    if (app) app.classList.add('hidden');
    if (modal) modal.classList.remove('active');
    document.body.classList.remove('app-active');
}

function showApp() {
    var landing = document.getElementById('landingPage');
    var app = document.getElementById('app');
    var modal = document.getElementById('authModal');
    if (landing) landing.classList.add('hidden');
    if (app) app.classList.remove('hidden');
    if (modal) modal.classList.remove('active');
    document.body.classList.add('app-active');
}

function onUserLoggedIn(user) {
    console.log('User logged in:', user.email);
    var userName = user.displayName || user.email.split('@')[0];
    var el = document.getElementById('userName');
    if (el) el.textContent = userName;
    
    db.collection('users').doc(user.uid).get().then(function(doc) {
        if (!doc.exists) {
            return db.collection('users').doc(user.uid).set({
                email: user.email,
                displayName: userName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }).catch(function(err) {
        console.error('User doc error:', err);
    });
    
    showApp();
    if (typeof loadDashboard === 'function') {
        loadDashboard();
    }
}

// Auth tabs
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.auth-tab').forEach(function(btn) {
        btn.onclick = function() {
            var tab = this.getAttribute('data-tab');
            document.querySelectorAll('.auth-tab').forEach(function(t) { t.classList.remove('active'); });
            this.classList.add('active');
            document.querySelectorAll('.auth-form').forEach(function(f) { f.classList.remove('active'); });
            if (tab === 'login') {
                document.getElementById('loginForm').classList.add('active');
            } else {
                document.getElementById('registerForm').classList.add('active');
            }
            hideAuthError();
        };
    });
});

// Login form
document.addEventListener('DOMContentLoaded', function() {
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.onsubmit = function(e) {
            e.preventDefault();
            var email = document.getElementById('loginEmail').value;
            var password = document.getElementById('loginPassword').value;
            console.log('Login attempt:', email);
            auth.signInWithEmailAndPassword(email, password).then(function(result) {
                console.log('Login success:', result.user.email);
                currentUser = result.user;
                onUserLoggedIn(result.user);
            }).catch(function(err) {
                console.error('Login error:', err);
                showAuthError(getErrorMessage(err.code));
            });
        };
    }
    
    var registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.onsubmit = function(e) {
            e.preventDefault();
            var username = document.getElementById('registerUsername').value;
            var email = document.getElementById('registerEmail').value;
            var password = document.getElementById('registerPassword').value;
            console.log('Register attempt:', email);
            auth.createUserWithEmailAndPassword(email, password).then(function(result) {
                return result.user.updateProfile({ displayName: username }).then(function() {
                    console.log('Register success:', result.user.email);
                    currentUser = result.user;
                    onUserLoggedIn(result.user);
                });
            }).catch(function(err) {
                console.error('Register error:', err);
                showAuthError(getErrorMessage(err.code));
            });
        };
    }
});

// Google Sign-In
function handleGoogleSignIn() {
    console.log('Google sign-in');
    auth.signInWithPopup(googleProvider).then(function(result) {
        console.log('Google success, user:', result.user.email);
        // Manuellt trigga inloggning eftersom onAuthStateChanged kanske inte triggas
        currentUser = result.user;
        onUserLoggedIn(result.user);
    }).catch(function(err) {
        console.error('Google error:', err);
        if (err.code !== 'auth/popup-closed-by-user') {
            showAuthError(getErrorMessage(err.code));
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    var googleLoginBtn = document.getElementById('googleLoginBtn');
    var googleSignupBtn = document.getElementById('googleSignupBtn');
    if (googleLoginBtn) googleLoginBtn.onclick = handleGoogleSignIn;
    if (googleSignupBtn) googleSignupBtn.onclick = handleGoogleSignIn;
    
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = function() {
            auth.signOut();
        };
    }
});

function showAuthError(message) {
    var el = document.getElementById('authError');
    if (el) {
        el.textContent = message;
        el.classList.add('active');
    }
}

function hideAuthError() {
    var el = document.getElementById('authError');
    if (el) el.classList.remove('active');
}

function getErrorMessage(code) {
    var messages = {
        'auth/email-already-in-use': 'E-postadressen används redan.',
        'auth/invalid-email': 'Ogiltig e-postadress.',
        'auth/weak-password': 'Lösenordet är för svagt.',
        'auth/user-not-found': 'Användaren hittades inte.',
        'auth/wrong-password': 'Fel lösenord.',
        'auth/too-many-requests': 'För många försök. Vänta en stund.',
        'auth/popup-closed-by-user': 'Fönstret stängdes.'
    };
    return messages[code] || 'Ett fel uppstod.';
}

function getCurrentUser() {
    return currentUser;
}

function isUserLoggedIn() {
    return currentUser !== null;
}
