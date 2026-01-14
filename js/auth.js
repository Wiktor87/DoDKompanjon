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
    
    // Check if user is logged in
    if (currentUser) {
        // User is logged in - show landing with logged-in state
        if (landing) {
            landing.classList.remove('hidden');
            // Hide login/signup buttons, show user menu
            var loginBtn = document.getElementById('loginBtn');
            var signupBtn = document.getElementById('signupBtn');
            var landingNav = landing.querySelector('.nav-actions');
            if (loginBtn) loginBtn.style.display = 'none';
            if (signupBtn) signupBtn.style.display = 'none';
            
            // Add logged-in user menu to landing page
            if (landingNav && !landingNav.querySelector('.landing-user-menu')) {
                var userMenu = document.createElement('div');
                userMenu.className = 'landing-user-menu';
                userMenu.style.cssText = 'display: flex; align-items: center; gap: 0.75rem;';
                var userName = currentUser.displayName || currentUser.email.split('@')[0];
                userMenu.innerHTML = '<span style="font-size: 0.875rem; color: var(--text-secondary);">' + userName + '</span>' +
                    '<button id="landingLogoutBtn" class="btn btn-ghost" style="padding: 0.5rem 1rem;">Logga ut</button>';
                landingNav.innerHTML = '';
                landingNav.appendChild(userMenu);
                
                // Add logout handler
                var logoutBtn = document.getElementById('landingLogoutBtn');
                if (logoutBtn) {
                    logoutBtn.onclick = function() {
                        auth.signOut();
                    };
                }
            }
            
            // Show submenu/nav on landing page
            var headerSub = app.querySelector('.header-sub');
            if (headerSub && !landing.querySelector('.landing-submenu')) {
                var submenuClone = headerSub.cloneNode(true);
                submenuClone.className = 'landing-submenu';
                submenuClone.style.cssText = 'background: var(--bg-secondary); border-bottom: 1px solid var(--border-default); padding: 0;';
                
                // Update the nav to work on landing page
                var navTabs = submenuClone.querySelectorAll('.nav-tab');
                navTabs.forEach(function(tab) {
                    tab.onclick = function(e) {
                        e.preventDefault();
                        // Switch back to app and show section
                        showApp();
                        var section = this.getAttribute('data-section');
                        if (section && typeof showSection === 'function') {
                            showSection(section);
                        }
                    };
                });
                
                var landingHeader = landing.querySelector('.landing-header');
                if (landingHeader) {
                    landingHeader.appendChild(submenuClone);
                }
            }
        }
    } else {
        // User is not logged in - show normal landing
        if (landing) {
            landing.classList.remove('hidden');
            // Show login/signup buttons
            var loginBtn = document.getElementById('loginBtn');
            var signupBtn = document.getElementById('signupBtn');
            if (loginBtn) loginBtn.style.display = '';
            if (signupBtn) signupBtn.style.display = '';
            
            // Remove logged-in elements
            var landingNav = landing.querySelector('.nav-actions');
            if (landingNav) {
                landingNav.innerHTML = '<button id="loginBtn" class="btn btn-ghost">Logga in</button>' +
                    '<button id="signupBtn" class="btn btn-primary">Skapa konto</button>';
                // Re-attach handlers
                document.getElementById('loginBtn').onclick = function() { showAuthModal('login'); };
                document.getElementById('signupBtn').onclick = function() { showAuthModal('register'); };
            }
            
            // Remove submenu if present
            var submenu = landing.querySelector('.landing-submenu');
            if (submenu) submenu.remove();
        }
    }
    
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
            hideAuthError();
            var email = document.getElementById('loginEmail').value;
            var password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                showAuthError('Fyll i både e-post och lösenord.');
                return;
            }
            
            console.log('Login attempt:', email);
            auth.signInWithEmailAndPassword(email, password).then(function(result) {
                console.log('Login success:', result.user.email);
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
            
            console.log('Register attempt:', email);
            auth.createUserWithEmailAndPassword(email, password).then(function(result) {
                return result.user.updateProfile({ displayName: username }).then(function() {
                    console.log('Register success:', result.user.email);
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
