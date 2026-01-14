// Authentication Module
var currentUser = null;

if (typeof auth !== 'undefined' && auth) {
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
} else {
    console.warn('Firebase Auth not available - showing landing page');
    // Still show landing page even if Firebase is not available
    document.addEventListener('DOMContentLoaded', function() {
        showLandingPage();
    });
}

function showLandingPage() {
    var landing = document.getElementById('landingPage');
    var app = document.getElementById('app');
    var modal = document.getElementById('authModal');
    
    if (landing) landing.classList.remove('hidden');
    if (app) app.classList.add('hidden');
    if (modal) modal.classList.remove('active');
    document.body.classList.remove('app-active');
    
    // Update the landing header based on auth state
    updateLandingHeader();
}

function updateLandingHeader() {
    var landing = document.getElementById('landingPage');
    if (!landing) return;
    
    var navActions = landing.querySelector('.nav-actions');
    if (!navActions) return;
    
    if (currentUser) {
        // User is logged in - show user menu
        var userName = currentUser.displayName || currentUser.email.split('@')[0];
        navActions.innerHTML = '<span class="user-name">' + userName + '</span>' +
            '<button id="landingLogoutBtn" class="btn btn-ghost btn-sm">Logga ut</button>';
        
        // Add logout handler
        var logoutBtn = document.getElementById('landingLogoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = function() {
                auth.signOut();
            };
        }
    } else {
        // User is not logged in - show login/signup buttons
        navActions.innerHTML = '<button id="loginBtn" class="btn btn-ghost">Logga in</button>' +
            '<button id="signupBtn" class="btn btn-primary">Skapa konto</button>';
        
        // Re-attach handlers
        var loginBtn = document.getElementById('loginBtn');
        var signupBtn = document.getElementById('signupBtn');
        if (loginBtn) loginBtn.onclick = function() { showAuthModal('login'); };
        if (signupBtn) signupBtn.onclick = function() { showAuthModal('register'); };
    }
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
    
    // Update landing header if on landing page
    updateLandingHeader();
    
    // Re-setup navigation handlers
    setupNavigationHandlers();
    
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
    
    // Setup navigation handlers after DOM is ready
    // Use requestAnimationFrame to ensure all elements are rendered
    if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(function() {
            setupNavigationHandlers();
        });
    } else {
        // Fallback for older browsers
        setTimeout(function() {
            setupNavigationHandlers();
        }, 0);
    }
});

function setupNavigationHandlers() {
    var navTabs = document.querySelectorAll('.nav-tab');
    if (navTabs.length === 0) {
        console.warn('No navigation tabs found - handlers not set up');
        return;
    }
    
    navTabs.forEach(function(tab) {
        // Remove any existing onclick to avoid duplicates
        tab.onclick = null;
        
        tab.onclick = function(e) {
            e.preventDefault();
            var section = this.getAttribute('data-section');
            var requireAuth = this.getAttribute('data-require-auth') === 'true';
            
            if (!section) {
                console.warn('Navigation tab missing data-section attribute');
                return;
            }
            
            // If auth is required and user is not logged in, show auth modal
            if (requireAuth && !currentUser) {
                if (typeof showAuthModal === 'function') {
                    showAuthModal('login');
                } else {
                    console.error('showAuthModal function not available');
                }
                return;
            }
            
            // If on landing page and logged in, switch to app
            var landing = document.getElementById('landingPage');
            if (landing && !landing.classList.contains('hidden')) {
                if (typeof showApp === 'function') {
                    showApp();
                } else {
                    console.error('showApp function not available');
                }
            }
            
            // Navigate to section
            if (typeof showSection === 'function') {
                showSection(section);
            } else {
                console.error('showSection function not available');
            }
        };
    });
    
    console.log('Navigation handlers set up for ' + navTabs.length + ' tabs');
}

// Login form
document.addEventListener('DOMContentLoaded', function() {
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.onsubmit = function(e) {
            e.preventDefault();
            hideAuthError();
            var email = document.getElementById('loginEmail').value;
            var password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                showAuthError('Fyll i både e-post och lösenord.');
                return;
            }
            
            console.log('Login attempt');
            auth.signInWithEmailAndPassword(email, password).then(function(result) {
                console.log('Login success');
                currentUser = result.user;
                onUserLoggedIn(result.user);
            }).catch(function(err) {
                console.error('Login error:', err);
                console.error('Error code:', err.code);
                console.error('Error message:', err.message);
                showAuthError(getErrorMessage(err.code));
            });
        };
    }
    
    var registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.onsubmit = function(e) {
            e.preventDefault();
            hideAuthError();
            var username = document.getElementById('registerUsername').value;
            var email = document.getElementById('registerEmail').value;
            var password = document.getElementById('registerPassword').value;
            
            if (!username || !email || !password) {
                showAuthError('Fyll i alla fält.');
                return;
            }
            
            if (password.length < 6) {
                showAuthError('Lösenordet måste vara minst 6 tecken.');
                return;
            }
            
            console.log('Register attempt');
            auth.createUserWithEmailAndPassword(email, password).then(function(result) {
                return result.user.updateProfile({ displayName: username }).then(function() {
                    console.log('Register success');
                    currentUser = result.user;
                    onUserLoggedIn(result.user);
                });
            }).catch(function(err) {
                console.error('Register error:', err);
                console.error('Error code:', err.code);
                console.error('Error message:', err.message);
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
    
    // Forgot password link
    var forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.onclick = function(e) {
            e.preventDefault();
            handleForgotPassword();
        };
    }
});

function showAuthError(message) {
    var el = document.getElementById('authError');
    if (el) {
        el.classList.remove('auth-success');
        el.classList.add('auth-error');
        el.textContent = message;
        el.classList.add('active');
    }
}

function hideAuthError() {
    var el = document.getElementById('authError');
    if (el) {
        el.classList.remove('active', 'auth-success');
        if (!el.classList.contains('auth-error')) {
            el.classList.add('auth-error');
        }
    }
}

function getErrorMessage(code) {
    var messages = {
        'auth/email-already-in-use': 'E-postadressen används redan.',
        'auth/invalid-email': 'Ogiltig e-postadress.',
        'auth/weak-password': 'Lösenordet är för svagt. Använd minst 6 tecken.',
        'auth/user-not-found': 'Ogiltiga inloggningsuppgifter. Kontrollera e-post och lösenord.',
        'auth/wrong-password': 'Ogiltiga inloggningsuppgifter. Kontrollera e-post och lösenord.',
        'auth/invalid-credential': 'Ogiltiga inloggningsuppgifter. Kontrollera e-post och lösenord.',
        'auth/invalid-login-credentials': 'Ogiltiga inloggningsuppgifter. Kontrollera e-post och lösenord.',
        'auth/too-many-requests': 'För många försök. Vänta en stund.',
        'auth/popup-closed-by-user': 'Fönstret stängdes.',
        'auth/network-request-failed': 'Nätverksfel. Kontrollera din internetanslutning.',
        'auth/operation-not-allowed': 'Denna inloggningsmetod är inte aktiverad.'
    };
    return messages[code] || 'Ett fel uppstod: ' + (code || 'okänt fel');
}

function getCurrentUser() {
    return currentUser;
}

function isUserLoggedIn() {
    return currentUser !== null;
}

function handleForgotPassword() {
    var email = document.getElementById('loginEmail').value;
    
    if (!email || !email.trim()) {
        showAuthError('Vänligen ange din e-postadress först.');
        // Focus on email field
        var emailField = document.getElementById('loginEmail');
        if (emailField) emailField.focus();
        return;
    }
    
    email = email.trim();
    console.log('Password reset requested');
    
    auth.sendPasswordResetEmail(email)
        .then(function() {
            hideAuthError();
            // Show success message (generic for security)
            var authError = document.getElementById('authError');
            if (authError) {
                authError.textContent = '✓ Ett e-postmeddelande för återställning av lösenord har skickats. Kontrollera din inkorg.';
                authError.classList.remove('auth-error');
                authError.classList.add('auth-success');
                authError.classList.add('active');
            }
            console.log('Password reset email sent successfully');
        })
        .catch(function(error) {
            console.error('Password reset error:', error);
            var errorMessage = getErrorMessage(error.code) || 'Kunde inte skicka återställnings-e-post. Kontrollera e-postadressen.';
            showAuthError(errorMessage);
        });
}
