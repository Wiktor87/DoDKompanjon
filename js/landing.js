// Landing Page
function scrollToFeatures() {
    var el = document.getElementById('features');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function showAuthModal(tab) {
    var modal = document.getElementById('authModal');
    if (modal) modal.classList.add('active');
    
    document.querySelectorAll('.auth-tab').forEach(function(btn) {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tab) btn.classList.add('active');
    });
    
    document.querySelectorAll('.auth-form').forEach(function(f) { f.classList.remove('active'); });
    
    if (tab === 'register') {
        var form = document.getElementById('registerForm');
        if (form) form.classList.add('active');
    } else {
        var form = document.getElementById('loginForm');
        if (form) form.classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.signup-trigger').forEach(function(btn) {
        btn.onclick = function() { showAuthModal('register'); };
    });
    
    var loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.onclick = function() { showAuthModal('login'); };
    
    var signupBtn = document.getElementById('signupBtn');
    if (signupBtn) signupBtn.onclick = function() { showAuthModal('register'); };
    
    var closeBtn = document.querySelector('#authModal .close-modal');
    if (closeBtn) {
        closeBtn.onclick = function() {
            document.getElementById('authModal').classList.remove('active');
        };
    }
    
    var authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.onclick = function(e) {
            if (e.target === this) this.classList.remove('active');
        };
    }
});

console.log('✅ Landing loaded');
