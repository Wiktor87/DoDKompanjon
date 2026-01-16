// DoD Companion - Main App
console.log('🚀 app.js loaded');

var currentCharacter = null;

// Helper: Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Game constants
var DAMAGE_BONUS_DIVISOR = 5;
var DAMAGE_BONUS_BASE = -2;

// Use emoji fallbacks if icons.js not loaded, otherwise will be replaced
function getKinIcon(kin) {
    if (typeof getIconSVG !== 'undefined') {
        return getIconSVG('kin', kin) || getIconSVG('kin', 'default');
    }
    var fallback = {
        'Människa': '<img src="icons/Manniska.gif" class="race-icon">', 'Alv': '<img src="icons/Alv.gif" class="race-icon">', 'Dvärg': '<img src="icons/Dvarg.gif" class="race-icon">',
        'Halvling': '<img src="icons/NewCharacter.gif" class="race-icon">', 'Anka': '<img src="icons/Anka.gif" class="race-icon">', 'Vargfolk': '<img src="icons/Varg.gif" class="race-icon">', 'default': '<img src="icons/NewCharacter.gif" class="race-icon">'
    };
    return fallback[kin] || fallback.default;
}

var PROFESSION_ICONS = {
    'Bard': '🎵', 'Hantverkare': '🔨', 'Jägare': '🏹', 'Krigare': '⚔️',
    'Lärd': '📚', 'Magiker': '✨', 'Nasare': '🗡️', 'Riddare': '🛡️',
    'Sjöfarare': '⚓', 'Tjuv': '🗝️', 'default': '⚔️'
};

var ALL_SKILLS = {
    STY: ['Styrkeprov', 'Närkamp'],
    SMI: ['Fingerfärdighet', 'Rida', 'Simfötter', 'Smyga', 'Undvika'],
    INT: ['Finna Dolda Ting', 'Första Hjälpen', 'Hantverk', 'Jakt & Fiske', 'Upptäcka Fara', 'Värdera', 'Bildning', 'Språk'],
    PSY: ['Genomskåda', 'Övertala', 'Uppträda']
};

var WEAPON_SKILLS = ['Armborst', 'Båge', 'Kastspjut', 'Sköld', 'Slagsmål', 'Svärd/Kniv', 'Yxa/Hammare', 'Stångvapen'];

// Character Sheet V2 - Skills and Weapon Skills from JSX specifications
var SKILLS = {
    'Bestiologi': { attr: 'INT' },
    'Bluffa': { attr: 'KAR' },
    'Fingerfärdighet': { attr: 'SMI' },
    'Finna dolda ting': { attr: 'INT' },
    'Främmande språk': { attr: 'INT' },
    'Hantverk': { attr: 'STY' },
    'Hoppa & klättra': { attr: 'SMI' },
    'Jakt & fiske': { attr: 'SMI' },
    'Köpslå': { attr: 'KAR' },
    'Läkekonst': { attr: 'INT' },
    'Myter & legender': { attr: 'INT' },
    'Rida': { attr: 'SMI' },
    'Simma': { attr: 'SMI' },
    'Sjökunnighet': { attr: 'INT' },
    'Smyga': { attr: 'SMI' },
    'Undvika': { attr: 'SMI' },
    'Uppträda': { attr: 'KAR' },
    'Upptäcka fara': { attr: 'INT' },
    'Vildmarksvana': { attr: 'INT' },
    'Övertala': { attr: 'KAR' }
};

var WEAPON_SKILLS_V2 = {
    'Armborst': { attr: 'SMI' },
    'Hammare': { attr: 'STY' },
    'Kniv': { attr: 'SMI' },
    'Pilbåge': { attr: 'SMI' },
    'Slagsmål': { attr: 'STY' },
    'Slunga': { attr: 'SMI' },
    'Spjut': { attr: 'STY' },
    'Stav': { attr: 'SMI' },
    'Svärd': { attr: 'STY' },
    'Yxa': { attr: 'STY' }
};


// Navigation
function showSection(sectionId) {
    console.log('📍 showSection:', sectionId);
    var navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(function(t) { 
        if (t) t.classList.remove('active'); 
    });
    var tab = document.querySelector('.nav-tab[data-section="' + sectionId + '"]');
    if (tab) tab.classList.add('active');
    
    var sections = document.querySelectorAll('.section');
    sections.forEach(function(s) { 
        if (s) s.classList.remove('active'); 
    });
    var section = document.getElementById(sectionId);
    if (section) section.classList.add('active');
    
    if (sectionId === 'characters') loadCharactersList();
    if (sectionId === 'parties') loadPartiesList();
    if (sectionId === 'upcoming-sessions') loadUpcomingSessions();
    if (sectionId === 'homebrew') {
        if (typeof HomebrewUI !== 'undefined') {
            HomebrewUI.init();
        }
    }
}

function goToLanding() {
    console.log('🏠 goToLanding');
    // Go to landing page while preserving auth state
    if (typeof showLandingPage === 'function') {
        showLandingPage();
    } else {
        document.getElementById('app').classList.add('hidden');
        document.getElementById('landingPage').classList.remove('hidden');
        document.body.classList.remove('app-active');
    }
    return false;
}

// Modals
function openCharacterCreator() {
    console.log('✨ openCharacterCreator');
    var modal = document.getElementById('characterCreatorModal');
    if (modal) {
        modal.classList.add('active');
        if (typeof showCharacterCreator === 'function') showCharacterCreator();
    }
}

function closeCharacterCreator() {
    var modal = document.getElementById('characterCreatorModal');
    if (modal) modal.classList.remove('active');
}

function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
    currentCharacter = null;
}

function openModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function openCreateCampaign() {
    showToast('Kampanjfunktionen kommer snart!', 'info');
}

// Dashboard
function loadDashboard() {
    console.log('📊 loadDashboard');
    
    // Uppdatera välkomstnamn
    if (typeof getCurrentUser === 'function') {
        var user = getCurrentUser();
        if (user) {
            var name = user.displayName || user.email.split('@')[0];
            var el = document.getElementById('welcomeName');
            if (el) el.textContent = name;
        }
    }
    
    // Ladda karaktärer
    var charContainer = document.getElementById('homeCharacters');
    if (charContainer) {
        if (typeof CharacterService === 'undefined') {
            charContainer.innerHTML = '<div class="empty-state-card" style="grid-column: 1/-1;">' +
                '<div class="empty-icon">🎭</div>' +
                '<h3>Inga karaktärer ännu</h3>' +
                '<p>Skapa din första karaktär för att börja äventyret</p>' +
                '<button class="btn btn-gold-outline" onclick="openCharacterCreator()">Skapa karaktär</button>' +
            '</div>';
        } else {
            CharacterService.getUserCharacters().then(function(characters) {
                console.log('Got characters:', characters.length);
                if (characters.length === 0) {
                    charContainer.innerHTML = '<div class="empty-state-card" style="grid-column: 1/-1;">' +
                        '<div class="empty-icon">🎭</div>' +
                        '<h3>Inga karaktärer ännu</h3>' +
                        '<p>Skapa din första karaktär för att börja äventyret</p>' +
                        '<button class="btn btn-gold-outline" onclick="openCharacterCreator()">Skapa karaktär</button>' +
                    '</div>';
                } else {
                    var html = characters.slice(0, 4).map(renderCharacterCardCompact).join('');
                    // Add "Starta en ny legend" card if less than 4 characters shown
                    if (characters.length <= 3) {
                        html += renderNewCharacterCard();
                    }
                    charContainer.innerHTML = html;
                }
            }).catch(function(err) {
                console.error('Error:', err);
                charContainer.innerHTML = '<div class="empty-state-card" style="grid-column: 1/-1;">' +
                    '<div class="empty-icon">⚠️</div>' +
                    '<h3>Fel vid laddning</h3>' +
                    '<p>' + err.message + '</p>' +
                '</div>';
            });
        }
    }
    
    // Ladda grupper
    loadDashboardParties();
}

// Ladda grupper på dashboard
function loadDashboardParties() {
    var container = document.getElementById('homeParties');
    if (!container) return;
    
    if (typeof PartyService === 'undefined') {
        container.innerHTML = '<div class="empty-state-card">' +
            '<div class="empty-icon">👥</div>' +
            '<h3>Inga grupper ännu</h3>' +
            '<p>Skapa eller gå med i en grupp för att spela tillsammans</p>' +
            '<button class="btn btn-gold-outline" onclick="openModal(\'partyModal\')">Skapa grupp</button>' +
        '</div>';
        return;
    }
    
    PartyService.getUserParties().then(function(parties) {
        if (parties.length === 0) {
            container.innerHTML = '<div class="empty-state-card">' +
                '<div class="empty-icon">👥</div>' +
                '<h3>Inga grupper ännu</h3>' +
                '<p>Skapa eller gå med i en grupp för att spela tillsammans</p>' +
                '<button class="btn btn-gold-outline" onclick="openModal(\'partyModal\')">Skapa grupp</button>' +
            '</div>';
        } else {
            // Visa första gruppen (eller den senast aktiva)
            container.innerHTML = renderPartyCardHome(parties[0]);
        }
    }).catch(function(err) {
        console.error('Error loading parties:', err);
        container.innerHTML = '<div class="empty-state-card">' +
            '<div class="empty-icon">⚠️</div>' +
            '<h3>Kunde inte ladda grupper</h3>' +
            '<p>' + err.message + '</p>' +
        '</div>';
    });
}

function renderCharacterCardCompact(char) {
    var icon = getKinIcon(char.kin);
    var attrs = char.attributes || {};
    var maxKp = attrs.FYS || 0;
    var maxVp = attrs.PSY || 0;
    var kp = char.currentKP !== undefined ? char.currentKP : maxKp;
    var vp = char.currentVP !== undefined ? char.currentVP : maxVp;
    var kpPercent = maxKp > 0 ? (kp / maxKp) * 100 : 0;
    var vpPercent = maxVp > 0 ? (vp / maxVp) * 100 : 0;
    var lastPlayed = char.lastPlayed || 'Aldrig';
    
    return '<div class="card-frame" onclick="viewCharacter(\'' + char.id + '\')">' +
        '<div class="corner-accent"></div>' +
        '<div class="character-card-new">' +
            '<div class="char-portrait-new">' + icon + '</div>' +
            '<div class="char-details">' +
                '<div class="char-name">' + (char.name || 'Namnlös') + '</div>' +
                '<div class="char-meta">' + (char.kin || 'Okänd') + ' · ' + (char.profession || 'Okänt yrke') + '</div>' +
                '<div class="char-stats-bars">' +
                    '<div class="stat-bar">' +
                        '<div class="stat-bar-header">' +
                            '<span class="stat-bar-label">KP</span>' +
                            '<span class="stat-bar-value-kp">' + kp + '/' + maxKp + '</span>' +
                        '</div>' +
                        '<div class="stat-bar-track">' +
                            '<div class="stat-bar-fill stat-bar-fill-kp" style="width: ' + kpPercent + '%"></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="stat-bar">' +
                        '<div class="stat-bar-header">' +
                            '<span class="stat-bar-label">VP</span>' +
                            '<span class="stat-bar-value-vp">' + vp + '/' + maxVp + '</span>' +
                        '</div>' +
                        '<div class="stat-bar-track">' +
                            '<div class="stat-bar-fill stat-bar-fill-vp" style="width: ' + vpPercent + '%"></div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div class="card-frame-footer">' +
            '<span class="last-played">Senast: ' + lastPlayed + '</span>' +
            '<span class="continue-link">Fortsätt →</span>' +
        '</div>' +
    '</div>';
}

// Render party card for home/overview page
function renderPartyCardHome(party) {
    var membersHtml = '';
    var members = party.members || [];
    
    // Om vi har memberIds men inte members-data, skapa placeholders
    if (members.length === 0 && party.memberIds && party.memberIds.length > 0) {
        party.memberIds.forEach(function(id, index) {
            members.push({ name: 'Medlem ' + (index + 1), kin: 'Människa', isOnline: false });
        });
    }
    
    members.forEach(function(member) {
        var icon = getKinIcon(member.kin || 'Människa');
        var onlineClass = member.isOnline ? 'online' : 'offline';
        var displayName = member.name || member.displayName || member.characterName || 'Okänd';
        membersHtml += 
            '<div class="party-member">' +
                '<div class="party-member-avatar">' + icon + '</div>' +
                '<span class="party-member-name">' + 
                    displayName +
                    '<span class="online-indicator ' + onlineClass + '"></span>' +
                '</span>' +
            '</div>';
    });
    
    var nextSessionHtml = '';
    if (party.nextSession) {
        nextSessionHtml = 
            '<div class="next-session-badge">' +
                '<div class="badge-label">Nästa session</div>' +
                '<div class="badge-value">' + party.nextSession + '</div>' +
            '</div>';
    }
    
    var memberCount = party.memberIds ? party.memberIds.length : members.length;
    
    return '<div class="card-frame" style="cursor: default;">' +
        '<div class="corner-accent"></div>' +
        '<div class="party-card-header">' +
            '<div>' +
                '<h3>' + (party.name || 'Namnlös grupp') + '</h3>' +
                '<p class="party-meta">' + memberCount + ' äventyrare</p>' +
            '</div>' +
            nextSessionHtml +
        '</div>' +
        '<div class="party-members">' + membersHtml + '</div>' +
        '<div class="party-actions">' +
            '<button class="btn btn-primary" onclick="viewParty(\'' + party.id + '\')">Öppna gruppsida</button>' +
            '<button class="btn btn-outline" onclick="copyInviteCode(\'' + (party.inviteCode || '') + '\')">Bjud in spelare</button>' +
        '</div>' +
    '</div>';
}

// Characters List
function loadCharactersList() {
    console.log('📋 loadCharactersList');
    var container = document.getElementById('charactersGrid');
    var countEl = document.getElementById('characterCount');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-placeholder" style="grid-column:1/-1"><div class="spinner"></div><p>Laddar...</p></div>';
    
    CharacterService.getUserCharacters().then(function(characters) {
        if (countEl) countEl.textContent = characters.length + ' karaktär' + (characters.length !== 1 ? 'er' : '');
        if (characters.length === 0) {
            container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🎭</div><h3>Inga karaktärer ännu</h3><button class="btn btn-gold" onclick="openCharacterCreator()">Skapa din första</button></div>';
        } else {
            var html = characters.map(renderCharacterCardFull).join('');
            // Add "Starta en ny legend" card
            html += renderNewCharacterCard();
            container.innerHTML = html;
        }
    }).catch(function(err) {
        container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>Fel</h3><p>' + err.message + '</p></div>';
    });
}

// Render "Starta en ny legend" card
function renderNewCharacterCard() {
    var html = '<div class="fantasy-new-character-card" onclick="openCharacterCreator()">';
    html += '<div class="fantasy-book-icon">';
    html += '<div class="fantasy-book-spine"></div>';
    html += '<div class="fantasy-book-plus">+</div>';
    // Elder Futhark runes: ᚠᚢᚦᚨᚱ (FUTHAR) and ᛒᛖᚱᚲᚨ (BERKA) for decorative fantasy effect
    html += '<div class="fantasy-book-rune top">ᚠᚢᚦᚨᚱ</div>';
    html += '<div class="fantasy-book-rune bottom">ᛒᛖᚱᚲᚨ</div>';
    html += '</div>';
    html += '<div class="fantasy-new-title">Starta en ny legend</div>';
    html += '<div class="fantasy-new-subtitle">Skapa ny karaktär</div>';
    html += '</div>';
    return html;
}

function renderCharacterCardFull(char) {
    var icon = getKinIcon(char.kin);
    var profIcon = PROFESSION_ICONS[char.profession] || PROFESSION_ICONS.default;
    var attrs = char.attributes || {};
    var maxKp = attrs.FYS || 0;
    var maxVp = attrs.PSY || 0;
    var currentKp = char.currentKP !== undefined ? char.currentKP : maxKp;
    var currentVp = char.currentVP !== undefined ? char.currentVP : maxVp;
    var kpPercent = maxKp > 0 ? (currentKp / maxKp) * 100 : 0;
    var vpPercent = maxVp > 0 ? (currentVp / maxVp) * 100 : 0;
    var isInGroup = char.isInGroup || false;
    
    var html = '<div class="fantasy-character-card" onclick="viewCharacter(\'' + char.id + '\')">';
    
    // Decorative L-corners
    html += '<svg class="decorative-corner-svg top-left" viewBox="0 0 25 25"><path d="M0 0 L25 0 L25 3 L3 3 L3 25 L0 25 Z" fill="#d4af37" /></svg>';
    html += '<svg class="decorative-corner-svg top-right" viewBox="0 0 25 25"><path d="M0 0 L25 0 L25 25 L22 25 L22 3 L0 3 Z" fill="#d4af37" /></svg>';
    html += '<svg class="decorative-corner-svg bottom-left" viewBox="0 0 25 25"><path d="M0 0 L3 0 L3 22 L25 22 L25 25 L0 25 Z" fill="#d4af37" /></svg>';
    html += '<svg class="decorative-corner-svg bottom-right" viewBox="0 0 25 25"><path d="M22 0 L25 0 L25 25 L0 25 L0 22 L22 22 Z" fill="#d4af37" /></svg>';
    
    // Header with portrait and name
    html += '<div class="fantasy-card-header">';
    html += '<div class="fantasy-portrait">';
    html += icon;
    // Mini corner decorations
    html += '<div class="portrait-corner-deco top-left"></div>';
    html += '<div class="portrait-corner-deco top-right"></div>';
    html += '<div class="portrait-corner-deco bottom-left"></div>';
    html += '<div class="portrait-corner-deco bottom-right"></div>';
    html += '</div>';
    html += '<div class="fantasy-card-identity">';
    html += '<h3 class="fantasy-card-name">' + (char.name || 'Namnlös') + '</h3>';
    html += '<div class="fantasy-card-subtitle"><span class="icon">⚔</span>' + (char.kin || 'Okänd') + ' • ' + (char.profession || 'Okänt yrke') + '</div>';
    html += '</div></div>';
    
    // Divider
    html += '<div class="fantasy-divider"></div>';
    
    // Attributes row
    html += '<div class="fantasy-attributes">';
    ['STY','FYS','SMI','INT','PSY','KAR'].forEach(function(attr) {
        html += '<div class="fantasy-attr-box">';
        html += '<div class="fantasy-attr-label">' + attr + '</div>';
        html += '<div class="fantasy-attr-value">' + (attrs[attr] || '—') + '</div>';
        html += '</div>';
    });
    html += '</div>';
    
    // Health bars
    html += '<div class="fantasy-health-container">';
    // KP bar
    html += '<div class="fantasy-health-bar">';
    html += '<span class="fantasy-health-icon">❤️</span>';
    html += '<div class="fantasy-health-track"><div class="fantasy-health-fill" style="width: ' + kpPercent + '%"></div></div>';
    html += '<span class="fantasy-health-value">' + currentKp + '</span>';
    html += '</div>';
    // VP bar
    html += '<div class="fantasy-health-bar">';
    html += '<span class="fantasy-health-icon">💠</span>';
    html += '<div class="fantasy-health-track vp"><div class="fantasy-health-fill vp" style="width: ' + vpPercent + '%"></div></div>';
    html += '<span class="fantasy-health-value vp">' + currentVp + '</span>';
    html += '</div>';
    html += '</div>';
    
    // Divider
    html += '<div class="fantasy-divider-light"></div>';
    
    // Action buttons
    html += '<div class="fantasy-card-buttons">';
    html += '<button class="fantasy-btn" onclick="event.stopPropagation();"><span>✨</span> ' + (char.heroicAbility || 'Förmåga') + '</button>';
    var groupBtnClass = isInGroup ? 'in-group' : 'not-in-group';
    var groupBtnText = isInGroup ? 'I grupp' : 'Lägg till';
    html += '<button class="fantasy-btn ' + groupBtnClass + '" onclick="event.stopPropagation();openAddToGroupModal(\'' + char.id + '\')"><span>👥</span> ' + groupBtnText + '</button>';
    html += '</div>';
    
    html += '</div>';
    return html;
}

// View Character
function viewCharacter(id) {
    console.log('👁️ viewCharacter:', id);
    var container = document.getElementById('characterSheetContainer');
    if (!container) return;
    
    // Switch to character sheet section
    showSection('characterSheet');
    container.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div><p>Laddar...</p></div>';
    
    CharacterService.getCharacter(id).then(function(char) {
        currentCharacter = char;
        container.innerHTML = renderFullCharacterSheet(char);
        // Setup listeners for kin/profession/age changes
        setupKinChangeListener();
        // Apply background image if set
        applyCharacterBackground(char.backgroundImage);
    }).catch(function(err) {
        console.error('Failed to load character:', err);
        container.innerHTML = '<div class="empty-state"><h3>Fel</h3><p>Kunde inte ladda karaktären. Försök igen.</p><button class="btn btn-outline" onclick="closeCharacterSheet()">Stäng</button></div>';
    });
}

function closeCharacterSheet() {
    showSection('characters');
    currentCharacter = null;
    removeCharacterBackground();
}

function applyCharacterBackground(backgroundImage) {
    // Remove any existing background
    removeCharacterBackground();
    
    if (backgroundImage && backgroundImage !== 'none') {
        var bgDiv = document.createElement('div');
        bgDiv.className = 'character-page-background';
        bgDiv.id = 'charBackground';
        bgDiv.style.backgroundImage = 'url(charbgs/' + backgroundImage + ')';
        document.body.appendChild(bgDiv);
    }
}

function removeCharacterBackground() {
    var existingBg = document.getElementById('charBackground');
    if (existingBg) {
        existingBg.remove();
    }
}

function selectCharacterBackground(backgroundImage) {
    if (!currentCharacter) return;
    
    // Update character in database
    CharacterService.updateCharacter(currentCharacter.id, {
        backgroundImage: backgroundImage
    }).then(function() {
        currentCharacter.backgroundImage = backgroundImage;
        applyCharacterBackground(backgroundImage);
        if (typeof showToast !== 'undefined') {
            showToast('Bakgrund uppdaterad!', 'success');
        }
    }).catch(function(err) {
        console.error('Error updating background:', err);
        if (typeof showToast !== 'undefined') {
            showToast('Kunde inte uppdatera bakgrund', 'error');
        }
    });
}

function renderFullCharacterSheet(char) {
    var icon = getKinIcon(char.kin);
    var attrs = char.attributes || {};
    var skills = char.skills || {};
    var weaponSkills = char.weaponSkills || {};
    var conditions = char.conditions || {};
    var deathSaves = char.deathSaves || { successes: 0, failures: 0 };
    var maxKp = attrs.FYS || 0;
    var maxVp = attrs.PSY || 0;
    var currentKp = char.currentKP !== undefined ? char.currentKP : maxKp;
    var currentVp = char.currentVP !== undefined ? char.currentVP : maxVp;
    
    // Condition labels
    var conditionLabels = {
        STY: 'Utmattad',
        FYS: 'Krasslig',
        SMI: 'Omtöcknad',
        INT: 'Arg',
        PSY: 'Rädd',
        KAR: 'Uppgiven'
    };
    
    // Build HTML
    var html = '<div class="character-sheet-v2" style="padding: 1.5rem; max-width: 1400px; margin: 0 auto;">';
    
    // Back button
    html += '<button class="btn btn-outline" onclick="closeCharacterSheet()" style="margin-bottom: 1rem;">← Tillbaka</button>';
    
    // GOLD FRAME - Character Header
    html += '<div class="gold-frame">';
    html += '<div class="gold-frame-corner top-right"></div>';
    html += '<div class="gold-frame-corner bottom-left"></div>';
    html += '<div class="gold-frame-corner bottom-right"></div>';
    
    // Character header: Portrait, Name/Info, Save button
    html += '<div class="char-header-v2">';
    html += '<div class="char-portrait-v2">' + icon + '</div>';
    html += '<div class="char-info-v2">';
    html += '<input type="text" class="char-name-input-v2" value="' + (char.name || '') + '" data-field="name" placeholder="Karaktärens namn">';
    html += '<div class="char-meta-v2">' + (char.kin || '—') + ' • ' + (char.profession || '—') + ' • ' + (char.age || '—') + '</div>';
    html += '<div class="char-details-row-v2">';
    html += '<span>Spelare: <input type="text" value="' + (char.playerName || '') + '" data-field="playerName" style="background:transparent;border:none;border-bottom:1px solid var(--border-panel);padding:2px 4px;color:var(--text-primary);width:120px;"></span>';
    html += '<span>Svaghet: <input type="text" value="' + (char.weakness || '') + '" data-field="weakness" style="background:transparent;border:none;border-bottom:1px solid var(--border-panel);padding:2px 4px;color:var(--text-primary);width:120px;"></span>';
    html += '<span>Minnesak: <input type="text" value="' + (char.memento || '') + '" data-field="memento" style="background:transparent;border:none;border-bottom:1px solid var(--border-panel);padding:2px 4px;color:var(--text-primary);width:120px;"></span>';
    html += '</div></div>';
    html += '<div class="char-actions-v2"><button class="btn btn-gold" onclick="saveCharacter()">💾 Spara</button></div>';
    html += '</div>';
    
    // Attributes grid with condition diamonds
    html += '<div class="attributes-grid-v2">';
    ['STY', 'FYS', 'SMI', 'INT', 'PSY', 'KAR'].forEach(function(attr) {
        var isActive = conditions[attr] || false;
        var activeClass = isActive ? ' condition-active' : '';
        html += '<div class="attr-box-v2' + activeClass + '">';
        html += '<div class="attr-label-v2">' + attr + '</div>';
        html += '<input type="number" class="attr-value-input-v2" value="' + (attrs[attr] || 10) + '" data-attr="' + attr + '">';
        html += '<div class="diamond-checkbox condition' + (isActive ? ' checked' : '') + '" data-condition="' + attr + '" onclick="toggleCondition(\'' + attr + '\')"></div>';
        html += '<div class="condition-label-v2">' + conditionLabels[attr] + '</div>';
        html += '</div>';
    });
    html += '</div>';
    
    // Secondary attributes row
    html += '<div class="secondary-attrs-v2">';
    html += '<div class="secondary-attr-v2">';
    html += '<label>Skadebonus (STY)</label>';
    html += '<input type="text" value="' + (char.damageBonusSTY || 'T4') + '" data-field="damageBonusSTY" placeholder="T4, T6, +1, etc.">';
    html += '</div>';
    html += '<div class="secondary-attr-v2">';
    html += '<label>Skadebonus (SMI)</label>';
    html += '<input type="text" value="' + (char.damageBonusSMI || 'T6') + '" data-field="damageBonusSMI" placeholder="T4, T6, +1, etc.">';
    html += '</div>';
    html += '<div class="secondary-attr-v2">';
    html += '<label>FÖR</label>';
    html += '<input type="number" value="' + (char.movement || 10) + '" data-field="movement">';
    html += '</div>';
    html += '<div class="secondary-attr-v2">';
    html += '<label>Bär</label>';
    html += '<input type="number" value="' + (char.carry || 0) + '" data-field="carry">';
    html += '</div>';
    html += '</div>';
    
    html += '</div>'; // Close gold-frame
    
    // Tab navigation
    html += '<div class="sheet-tabs-v2">';
    html += '<button class="sheet-tab-v2" onclick="switchSheetTabV2(this, \'overview\')">Översikt</button>';
    html += '<button class="sheet-tab-v2 active" onclick="switchSheetTabV2(this, \'skills\')">Färdigheter</button>';
    html += '<button class="sheet-tab-v2" onclick="switchSheetTabV2(this, \'combat\')">Strid</button>';
    html += '<button class="sheet-tab-v2" onclick="switchSheetTabV2(this, \'equipment\')">Utrustning</button>';
    html += '<button class="sheet-tab-v2" onclick="switchSheetTabV2(this, \'notes\')">Anteckningar</button>';
    html += '<button class="sheet-tab-v2" onclick="switchSheetTabV2(this, \'settings\')">Inställningar</button>';
    html += '</div>';
    
    // Main layout - Content + Sidebar
    html += '<div class="sheet-layout-v2">';
    
    // MAIN CONTENT AREA
    html += '<div class="sheet-main-v2">';
    
    // Tab content: Overview
    html += '<div class="sheet-tab-content-v2" id="tab-overview-v2" style="display: none;">';
    html += '<div class="sheet-panel-v2"><div class="sheet-panel-v2-header"><h3 class="sheet-panel-v2-title">Översikt</h3></div>';
    html += '<div class="sheet-panel-v2-content"><p style="color: var(--text-secondary);">Grundläggande karaktärsinformation visas här.</p></div></div>';
    html += '</div>';
    
    // Tab content: Skills
    html += '<div class="sheet-tab-content-v2 active" id="tab-skills-v2">';
    html += renderSkillsPanel(skills, SKILLS);
    html += '</div>';
    
    // Tab content: Combat
    html += '<div class="sheet-tab-content-v2" id="tab-combat-v2" style="display: none;">';
    html += renderWeaponSkillsPanel(weaponSkills, WEAPON_SKILLS_V2);
    html += renderWeaponsTable(char.weapons || []);
    html += '</div>';
    
    // Tab content: Equipment
    html += '<div class="sheet-tab-content-v2" id="tab-equipment-v2" style="display: none;">';
    html += '<div class="sheet-panel-v2"><div class="sheet-panel-v2-header"><h3 class="sheet-panel-v2-title">Utrustning</h3></div>';
    html += '<div class="sheet-panel-v2-content"><p style="color: var(--text-muted);">Utrustning kommer snart...</p></div></div>';
    html += '</div>';
    
    // Tab content: Notes
    html += '<div class="sheet-tab-content-v2" id="tab-notes-v2" style="display: none;">';
    html += '<div class="sheet-panel-v2"><div class="sheet-panel-v2-header"><h3 class="sheet-panel-v2-title">Anteckningar</h3></div>';
    html += '<div class="sheet-panel-v2-content">';
    html += '<textarea class="bio-textarea" data-field="notes" placeholder="Dina anteckningar..." style="width:100%;min-height:300px;">' + (char.notes || '') + '</textarea>';
    html += '</div></div>';
    html += '</div>';
    
    // Tab content: Settings
    html += '<div class="sheet-tab-content-v2" id="tab-settings-v2" style="display: none;">';
    html += '<div class="sheet-panel-v2"><div class="sheet-panel-v2-header"><h3 class="sheet-panel-v2-title">Inställningar</h3></div>';
    html += '<div class="sheet-panel-v2-content">';
    
    // Portrait Section
    html += '<div class="portrait-section" style="margin-bottom: 2rem;">';
    html += '<h4 style="margin-bottom: 1rem; color: var(--gold-primary);">🖼️ Porträtt</h4>';
    html += '<div class="current-portrait" style="margin-bottom: 1rem; text-align: center;">';
    html += '<div style="display: inline-block; padding: 1rem; background: var(--bg-elevated); border-radius: var(--radius-md); border: 2px solid var(--border-panel);">';
    html += icon;
    html += '</div></div>';
    html += '<div class="portrait-buttons" style="display: flex; gap: 0.5rem; justify-content: center;">';
    html += '<button class="btn btn-outline" onclick="openIconBrowser()">🎨 Välj ikon</button>';
    html += '<button class="btn btn-outline" onclick="triggerPortraitUpload()">📤 Ladda upp</button>';
    html += '</div>';
    html += '<input type="file" id="portraitUpload" hidden accept="image/*" onchange="handlePortraitUpload(event)" />';
    html += '</div>';
    
    // Background Section
    html += '<div class="background-selector">';
    html += '<h4 style="margin-bottom: 1rem; color: var(--gold-primary);">🎭 Bakgrundsbild</h4>';
    
    // Background preview
    if (char.backgroundImage && char.backgroundImage !== 'none') {
        html += '<div class="bg-preview-box" style="width: 100%; height: 150px; margin-bottom: 1rem; background-image: url(charbgs/' + char.backgroundImage + '); background-size: cover; background-position: center; border-radius: var(--radius-md); border: 2px solid var(--border-panel); position: relative; overflow: hidden;">';
        html += '<div style="position: absolute; inset: 0; background: linear-gradient(90deg, rgba(13, 13, 13, 0.9) 0%, rgba(13, 13, 13, 0) 35%, rgba(13, 13, 13, 0) 65%, rgba(13, 13, 13, 0.9) 100%);"></div>';
        html += '</div>';
    }
    
    html += '<div class="background-options" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.5rem; margin-bottom: 1rem;">';
    
    // None option
    var noneSelected = (!char.backgroundImage || char.backgroundImage === 'none') ? ' selected' : '';
    html += '<div class="bg-option' + noneSelected + '" data-bg="none" onclick="selectCharacterBackground(\'none\')" style="aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); border: 2px solid ' + (noneSelected ? 'var(--accent-gold)' : 'var(--border-panel)') + '; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.75rem; color: var(--text-secondary);">Ingen</div>';
    
    // List potential backgrounds (will be populated dynamically in real use)
    // For now, show instruction message
    html += '</div>';
    html += '<div style="text-align: center; padding: 1rem; color: var(--text-secondary); font-size: 0.875rem; background: var(--bg-elevated); border-radius: var(--radius-md); border: 1px dashed var(--border-panel);">';
    html += '📁 Lägg till bilder i mappen <code style="background: var(--bg-secondary); padding: 0.25rem 0.5rem; border-radius: 4px;">/charbgs</code> för att använda dem som bakgrund';
    html += '</div>';
    
    html += '</div>'; // Close background-selector
    
    // Delete Character Section
    html += '<div class="danger-zone" style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--border-panel);">';
    html += '<h4 style="margin-bottom: 1rem; color: var(--brand-red);">⚠️ Farlig Zon</h4>';
    html += '<p style="color: var(--text-secondary); margin-bottom: 1rem; font-size: 0.875rem;">När du raderar en karaktär kan åtgärden inte ångras. All data kommer att tas bort permanent.</p>';
    html += '<button class="btn btn-outline" style="border-color: var(--brand-red); color: var(--brand-red);" onclick="confirmDeleteCharacter(\'' + char.id + '\', ' + JSON.stringify(char.name) + ')">🗑️ Radera Karaktär</button>';
    html += '</div>';
    
    html += '</div></div>';
    html += '</div>';
    
    html += '</div>'; // Close sheet-main-v2
    
    // SIDEBAR
    html += '<div class="sheet-sidebar-v2">';
    
    // KP Tracker
    html += '<div class="sheet-panel-v2">';
    html += '<div class="sheet-panel-v2-header"><h3 class="sheet-panel-v2-title">Kroppspoäng (KP)</h3></div>';
    html += '<div class="pip-tracker-v2 kp">';
    html += '<div class="pip-tracker-label-v2"><span>KP</span><span class="current-max">' + currentKp + ' / ' + maxKp + '</span></div>';
    html += '<div class="pips-container-v2">';
    for (var i = 1; i <= maxKp; i++) {
        var filled = i <= currentKp ? ' filled' : '';
        html += '<div class="pip-v2 kp-pip' + filled + '" data-pip-index="' + i + '" onclick="toggleKP(' + i + ')"></div>';
    }
    html += '</div>';
    
    // Death saves
    html += '<div class="death-saves-v2">';
    html += '<div class="death-save-group-v2"><label>Räddning:</label><div class="death-save-pips-v2">';
    for (var s = 0; s < 3; s++) {
        var successFilled = s < deathSaves.successes ? ' filled' : '';
        html += '<div class="death-save-pip-v2 success' + successFilled + '" data-save-type="success" data-save-index="' + s + '" onclick="toggleDeathSave(\'success\', ' + s + ')"></div>';
    }
    html += '</div></div>';
    html += '<div class="death-save-group-v2"><label>Misslyckande:</label><div class="death-save-pips-v2">';
    for (var f = 0; f < 3; f++) {
        var failureFilled = f < deathSaves.failures ? ' filled' : '';
        html += '<div class="death-save-pip-v2 failure' + failureFilled + '" data-save-type="failure" data-save-index="' + f + '" onclick="toggleDeathSave(\'failure\', ' + f + ')"></div>';
    }
    html += '</div></div>';
    html += '</div>'; // Close death-saves-v2
    
    html += '</div></div>'; // Close pip-tracker and panel
    
    // VP Tracker
    html += '<div class="sheet-panel-v2">';
    html += '<div class="sheet-panel-v2-header"><h3 class="sheet-panel-v2-title">Viljepoäng (VP)</h3></div>';
    html += '<div class="pip-tracker-v2 vp">';
    html += '<div class="pip-tracker-label-v2"><span>VP</span><span class="current-max">' + currentVp + ' / ' + maxVp + '</span></div>';
    html += '<div class="pips-container-v2">';
    for (var j = 1; j <= maxVp; j++) {
        var vpFilled = j <= currentVp ? ' filled' : '';
        html += '<div class="pip-v2 vp-pip' + vpFilled + '" data-pip-index="' + j + '" onclick="toggleVP(' + j + ')"></div>';
    }
    html += '</div></div></div>';
    
    // Armor & Helmet
    html += '<div class="sheet-panel-v2">';
    html += '<div class="sheet-panel-v2-header"><h3 class="sheet-panel-v2-title">Rustning & Hjälm</h3></div>';
    html += '<div class="armor-grid-v2">';
    html += '<div class="armor-item-v2"><label>Rustning</label><input type="text" value="' + (char.armor || '') + '" data-field="armor" placeholder="Plåt"></div>';
    html += '<div class="armor-item-v2"><label>Skydd</label><input type="number" value="' + (char.armorProtection || 0) + '" data-field="armorProtection" placeholder="4"></div>';
    html += '<div class="armor-item-v2"><label>Hjälm</label><input type="text" value="' + (char.helmet || '') + '" data-field="helmet" placeholder="Full"></div>';
    html += '<div class="armor-item-v2"><label>Skydd</label><input type="number" value="' + (char.helmetProtection || 0) + '" data-field="helmetProtection" placeholder="2"></div>';
    html += '</div></div>';
    
    // Currency
    html += '<div class="sheet-panel-v2">';
    html += '<div class="sheet-panel-v2-header"><h3 class="sheet-panel-v2-title">Mynt</h3></div>';
    html += '<div class="currency-display-v2">';
    html += '<div class="currency-item-v2"><div class="icon">🥇</div><div class="label">Guld</div><input type="number" value="' + ((char.currency && char.currency.guld) || 0) + '" data-currency="guld"></div>';
    html += '<div class="currency-item-v2"><div class="icon">🥈</div><div class="label">Silver</div><input type="number" value="' + ((char.currency && char.currency.silver) || 0) + '" data-currency="silver"></div>';
    html += '<div class="currency-item-v2"><div class="icon">🥉</div><div class="label">Kopp</div><input type="number" value="' + ((char.currency && char.currency.brons) || 0) + '" data-currency="brons"></div>';
    html += '</div></div>';
    
    // Hero Ability
    html += '<div class="sheet-panel-v2">';
    html += '<div class="sheet-panel-v2-header"><h3 class="sheet-panel-v2-title">Hjälteförmåga</h3></div>';
    html += '<div class="hero-ability-v2">';
    html += '<div class="icon">⚡</div>';
    html += '<div class="name">' + (char.heroicAbility || 'Ingen vald') + '</div>';
    html += '<div class="description">' + (char.kinAbility || '') + '</div>';
    html += '</div></div>';
    
    html += '</div>'; // Close sheet-sidebar-v2
    
    html += '</div>'; // Close sheet-layout-v2
    
    html += '</div>'; // Close character-sheet-v2
    
    return html;
}

function renderSkillsPanel(skills, SKILLS) {
    var html = '<div class="sheet-panel-v2">';
    html += '<div class="sheet-panel-v2-header"><h3 class="sheet-panel-v2-title">Färdigheter</h3></div>';
    html += '<div class="sheet-panel-v2-content">';
    html += '<div class="skills-grid-v2">';
    
    Object.keys(SKILLS).forEach(function(skillName) {
        var skillData = skills[skillName] || { value: 0, isCore: false };
        var value = typeof skillData === 'object' ? skillData.value : skillData;
        var isCore = typeof skillData === 'object' ? skillData.isCore : false;
        var attr = SKILLS[skillName].attr;
        
        html += '<div class="skill-row-v2">';
        html += '<div class="diamond-checkbox small skill-core-checkbox-v2' + (isCore ? ' checked' : '') + '" data-skill="' + skillName + '" onclick="toggleSkillCore(\'' + skillName + '\')"></div>';
        html += '<input type="number" class="skill-value-v2" value="' + (value || 0) + '" data-skill-value="' + skillName + '">';
        html += '<span class="skill-name-v2">' + skillName + '</span>';
        html += '<span class="skill-attr-v2">(' + attr + ')</span>';
        html += '</div>';
    });
    
    html += '</div></div></div>';
    return html;
}

function renderWeaponSkillsPanel(weaponSkills, WEAPON_SKILLS_V2) {
    var html = '<div class="sheet-panel-v2">';
    html += '<div class="sheet-panel-v2-header"><h3 class="sheet-panel-v2-title">Vapenfärdigheter</h3></div>';
    html += '<div class="sheet-panel-v2-content">';
    html += '<div class="skills-grid-v2">';
    
    Object.keys(WEAPON_SKILLS_V2).forEach(function(skillName) {
        var skillData = weaponSkills[skillName] || { value: 0, isCore: false };
        var value = typeof skillData === 'object' ? skillData.value : skillData;
        var isCore = typeof skillData === 'object' ? skillData.isCore : false;
        var attr = WEAPON_SKILLS_V2[skillName].attr;
        
        html += '<div class="weapon-skill-row-v2">';
        html += '<div class="diamond-checkbox small' + (isCore ? ' checked' : '') + '" data-weapon-skill="' + skillName + '" onclick="toggleWeaponSkillCore(\'' + skillName + '\')"></div>';
        html += '<input type="number" class="skill-value-v2" value="' + (value || 0) + '" data-weapon-skill-value="' + skillName + '">';
        html += '<span class="skill-name-v2">' + skillName + '</span>';
        html += '<span class="skill-attr-v2">(' + attr + ')</span>';
        html += '</div>';
    });
    
    html += '</div></div></div>';
    return html;
}

function renderWeaponsTable(weapons) {
    var html = '<div class="sheet-panel-v2" style="margin-top: 1rem;">';
    html += '<div class="sheet-panel-v2-header"><h3 class="sheet-panel-v2-title">Vapen & Sköldar</h3></div>';
    html += '<div class="sheet-panel-v2-content">';
    html += '<table class="weapons-table-v2">';
    html += '<thead><tr><th>Namn</th><th>Skada</th><th>Räckvidd</th><th>Vikt</th><th></th></tr></thead>';
    html += '<tbody id="weaponsTableBody">';
    
    if (weapons.length === 0) {
        html += '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1rem;">Inga vapen ännu</td></tr>';
    } else {
        weapons.forEach(function(weapon, index) {
            html += '<tr>';
            html += '<td><input type="text" value="' + (weapon.name || '') + '" data-weapon-field="name" data-weapon-index="' + index + '"></td>';
            html += '<td><input type="text" value="' + (weapon.damage || '') + '" data-weapon-field="damage" data-weapon-index="' + index + '"></td>';
            html += '<td><input type="text" value="' + (weapon.range || '') + '" data-weapon-field="range" data-weapon-index="' + index + '"></td>';
            html += '<td><input type="text" value="' + (weapon.weight || '') + '" data-weapon-field="weight" data-weapon-index="' + index + '"></td>';
            html += '<td><button class="btn btn-ghost btn-xs" onclick="removeWeapon(' + index + ')">🗑️</button></td>';
            html += '</tr>';
        });
    }
    
    html += '</tbody></table>';
    html += '<button class="btn btn-gold btn-sm" onclick="addWeapon()" style="margin-top: 0.5rem;">+ Lägg till vapen</button>';
    html += '</div></div>';
    return html;
}

// Tab switching function
function switchSheetTabV2(btn, tabId) {
    document.querySelectorAll('.sheet-tab-v2').forEach(function(t) { t.classList.remove('active'); });
    btn.classList.add('active');
    document.querySelectorAll('.sheet-tab-content-v2').forEach(function(c) { c.style.display = 'none'; });
    var content = document.getElementById('tab-' + tabId + '-v2');
    if (content) content.style.display = 'block';
}

// Interactive functions for toggles
function toggleCondition(attr) {
    if (!currentCharacter) return;
    if (!currentCharacter.conditions) currentCharacter.conditions = {};
    currentCharacter.conditions[attr] = !currentCharacter.conditions[attr];
    
    var checkbox = document.querySelector('.diamond-checkbox[data-condition="' + attr + '"]');
    var attrBox = checkbox.closest('.attr-box-v2');
    
    if (currentCharacter.conditions[attr]) {
        checkbox.classList.add('checked');
        attrBox.classList.add('condition-active');
    } else {
        checkbox.classList.remove('checked');
        attrBox.classList.remove('condition-active');
    }
}

function toggleKP(index) {
    if (!currentCharacter) return;
    currentCharacter.currentKP = index;
    
    // Update UI
    document.querySelectorAll('.pip-v2.kp-pip').forEach(function(pip, i) {
        if (i < index) {
            pip.classList.add('filled');
        } else {
            pip.classList.remove('filled');
        }
    });
    
    // Update label
    var label = document.querySelector('.pip-tracker-v2.kp .current-max');
    if (label) label.textContent = index + ' / ' + (currentCharacter.attributes.FYS || 0);
}

function toggleVP(index) {
    if (!currentCharacter) return;
    currentCharacter.currentVP = index;
    
    // Update UI
    document.querySelectorAll('.pip-v2.vp-pip').forEach(function(pip, i) {
        if (i < index) {
            pip.classList.add('filled');
        } else {
            pip.classList.remove('filled');
        }
    });
    
    // Update label
    var label = document.querySelector('.pip-tracker-v2.vp .current-max');
    if (label) label.textContent = index + ' / ' + (currentCharacter.attributes.PSY || 0);
}

function toggleDeathSave(type, index) {
    if (!currentCharacter) return;
    if (!currentCharacter.deathSaves) currentCharacter.deathSaves = { successes: 0, failures: 0 };
    
    if (type === 'success') {
        currentCharacter.deathSaves.successes = index + 1;
        document.querySelectorAll('.death-save-pip-v2.success').forEach(function(pip, i) {
            if (i <= index) {
                pip.classList.add('filled');
            } else {
                pip.classList.remove('filled');
            }
        });
    } else {
        currentCharacter.deathSaves.failures = index + 1;
        document.querySelectorAll('.death-save-pip-v2.failure').forEach(function(pip, i) {
            if (i <= index) {
                pip.classList.add('filled');
            } else {
                pip.classList.remove('filled');
            }
        });
    }
}

function toggleSkillCore(skillName) {
    if (!currentCharacter || !currentCharacter.skills) return;
    if (!currentCharacter.skills[skillName]) {
        currentCharacter.skills[skillName] = { value: 0, isCore: false };
    }
    
    var skillData = currentCharacter.skills[skillName];
    if (typeof skillData === 'object') {
        skillData.isCore = !skillData.isCore;
    } else {
        currentCharacter.skills[skillName] = { value: skillData, isCore: true };
    }
    
    var checkbox = document.querySelector('.diamond-checkbox[data-skill="' + skillName + '"]');
    if (checkbox) {
        if (currentCharacter.skills[skillName].isCore) {
            checkbox.classList.add('checked');
        } else {
            checkbox.classList.remove('checked');
        }
    }
}

function toggleWeaponSkillCore(skillName) {
    if (!currentCharacter || !currentCharacter.weaponSkills) return;
    if (!currentCharacter.weaponSkills[skillName]) {
        currentCharacter.weaponSkills[skillName] = { value: 0, isCore: false };
    }
    
    var skillData = currentCharacter.weaponSkills[skillName];
    if (typeof skillData === 'object') {
        skillData.isCore = !skillData.isCore;
    } else {
        currentCharacter.weaponSkills[skillName] = { value: skillData, isCore: true };
    }
    
    var checkbox = document.querySelector('.diamond-checkbox[data-weapon-skill="' + skillName + '"]');
    if (checkbox) {
        if (currentCharacter.weaponSkills[skillName].isCore) {
            checkbox.classList.add('checked');
        } else {
            checkbox.classList.remove('checked');
        }
    }
}

function addWeapon() {
    if (!currentCharacter) return;
    if (!currentCharacter.weapons) currentCharacter.weapons = [];
    currentCharacter.weapons.push({ name: '', damage: '', range: '', weight: '' });
    
    // Re-render the character sheet
    viewCharacter(currentCharacter.id);
}

function removeWeapon(index) {
    if (!currentCharacter || !currentCharacter.weapons) return;
    currentCharacter.weapons.splice(index, 1);
    
    // Re-render the character sheet
    viewCharacter(currentCharacter.id);
}

// Update character portrait when kin is changed
function setupKinChangeListener() {
    var kinSelect = document.querySelector('[data-field="kin"]');
    if (kinSelect) {
        kinSelect.addEventListener('change', function() {
            var newKin = this.value;
            var portraitEl = document.querySelector('.sheet-portrait-large');
            if (portraitEl) {
                // getKinIcon returns safe HTML from ICONS object
                portraitEl.innerHTML = getKinIcon(newKin);
            }
            // Also update subtitle
            updateCharacterSubtitle();
        });
    }
    
    // Also listen to profession and age changes for subtitle update
    var professionSelect = document.querySelector('[data-field="profession"]');
    if (professionSelect) {
        professionSelect.addEventListener('change', updateCharacterSubtitle);
    }
    
    var ageSelect = document.querySelector('[data-field="ageCategory"]');
    if (ageSelect) {
        ageSelect.addEventListener('change', updateCharacterSubtitle);
    }
}

function updateCharacterSubtitle() {
    var subtitleEl = document.querySelector('.sheet-subtitle-row');
    if (!subtitleEl || !currentCharacter) return;
    
    var kinEl = document.querySelector('[data-field="kin"]');
    var professionEl = document.querySelector('[data-field="profession"]');
    var ageEl = document.querySelector('[data-field="ageCategory"]');
    
    var kin = kinEl ? kinEl.value : currentCharacter.kin;
    var profession = professionEl ? professionEl.value : currentCharacter.profession;
    var age = ageEl ? ageEl.value : currentCharacter.age;
    
    subtitleEl.textContent = [kin, profession, age].filter(Boolean).join(' • ');
}

// Inventory
function addInventoryItem() {
    var list = document.getElementById('inventoryList');
    if (!list) return;
    var empty = list.querySelector('.empty-inventory');
    if (empty) empty.remove();
    var div = document.createElement('div');
    div.className = 'inventory-item-full';
    div.innerHTML = '<div class="inv-row"><label>Namn:</label><input type="text" class="inv-input" placeholder="Föremålsnamn" data-inv-field="name"></div>' +
        '<div class="inv-row"><label>Typ:</label><select class="inv-select" data-inv-field="type">' +
        '<option value="">Välj typ</option>' +
        '<option value="Vapen">Vapen</option>' +
        '<option value="Rustning">Rustning</option>' +
        '<option value="Övrigt">Övrigt</option>' +
        '</select></div>' +
        '<div class="inv-row"><label>Vikt:</label><input type="text" class="inv-input-sm" placeholder="t.ex. 2 kg" data-inv-field="weight"></div>' +
        '<div class="inv-row"><label>Anteckningar:</label><input type="text" class="inv-input" placeholder="Beskrivning" data-inv-field="notes"></div>' +
        '<button class="btn-icon-sm btn-delete" onclick="this.parentElement.remove()">🗑️</button>';
    list.appendChild(div);
    div.querySelector('input').focus();
}

function removeInventoryItem(i) {
    var items = document.querySelectorAll('.inventory-item');
    if (items[i]) items[i].remove();
}

// Save
function saveCharacter() {
    if (!currentCharacter) return;
    
    var updates = {
        name: '',
        kin: '',
        profession: '',
        age: '',
        currentKP: 0,
        currentVP: 0,
        movement: 10,
        carry: 0,
        damageBonusSTY: '',
        damageBonusSMI: '',
        conditions: {},
        deathSaves: { successes: 0, failures: 0 },
        armor: '',
        armorProtection: 0,
        helmet: '',
        helmetProtection: 0,
        playerName: '',
        weakness: '',
        memento: '',
        notes: '',
        weapons: []
    };
    
    // Get basic fields
    var nameEl = document.querySelector('[data-field="name"]');
    if (nameEl) updates.name = nameEl.value || '';
    
    var playerNameEl = document.querySelector('[data-field="playerName"]');
    if (playerNameEl) updates.playerName = playerNameEl.value || '';
    
    var weaknessEl = document.querySelector('[data-field="weakness"]');
    if (weaknessEl) updates.weakness = weaknessEl.value || '';
    
    var mementoEl = document.querySelector('[data-field="memento"]');
    if (mementoEl) updates.memento = mementoEl.value || '';
    
    var movementEl = document.querySelector('[data-field="movement"]');
    if (movementEl) updates.movement = parseInt(movementEl.value) || 10;
    
    var carryEl = document.querySelector('[data-field="carry"]');
    if (carryEl) updates.carry = parseInt(carryEl.value) || 0;
    
    var damageBonusSTYEl = document.querySelector('[data-field="damageBonusSTY"]');
    if (damageBonusSTYEl) updates.damageBonusSTY = damageBonusSTYEl.value || 'T4';
    
    var damageBonusSMIEl = document.querySelector('[data-field="damageBonusSMI"]');
    if (damageBonusSMIEl) updates.damageBonusSMI = damageBonusSMIEl.value || 'T6';
    
    var armorEl = document.querySelector('[data-field="armor"]');
    if (armorEl) updates.armor = armorEl.value || '';
    
    var armorProtectionEl = document.querySelector('[data-field="armorProtection"]');
    if (armorProtectionEl) updates.armorProtection = parseInt(armorProtectionEl.value) || 0;
    
    var helmetEl = document.querySelector('[data-field="helmet"]');
    if (helmetEl) updates.helmet = helmetEl.value || '';
    
    var helmetProtectionEl = document.querySelector('[data-field="helmetProtection"]');
    if (helmetProtectionEl) updates.helmetProtection = parseInt(helmetProtectionEl.value) || 0;
    
    var notesEl = document.querySelector('[data-field="notes"]');
    if (notesEl) updates.notes = notesEl.value || '';
    
    // Get attributes
    updates.attributes = {};
    document.querySelectorAll('[data-attr]').forEach(function(el) {
        if (el && el.dataset && el.dataset.attr) {
            updates.attributes[el.dataset.attr] = parseInt(el.value) || 10;
        }
    });
    
    // Save from currentCharacter's tracked state
    updates.currentKP = currentCharacter.currentKP || 0;
    updates.currentVP = currentCharacter.currentVP || 0;
    updates.conditions = currentCharacter.conditions || {};
    updates.deathSaves = currentCharacter.deathSaves || { successes: 0, failures: 0 };
    
    // Get skills with isCore property
    updates.skills = {};
    Object.keys(SKILLS).forEach(function(skillName) {
        var valueEl = document.querySelector('[data-skill-value="' + skillName + '"]');
        var value = valueEl ? (parseInt(valueEl.value) || 0) : 0;
        var isCore = currentCharacter.skills && currentCharacter.skills[skillName] && currentCharacter.skills[skillName].isCore;
        
        updates.skills[skillName] = {
            value: value,
            isCore: isCore || false,
            attr: SKILLS[skillName].attr
        };
    });
    
    // Get weapon skills with isCore property
    updates.weaponSkills = {};
    Object.keys(WEAPON_SKILLS_V2).forEach(function(skillName) {
        var valueEl = document.querySelector('[data-weapon-skill-value="' + skillName + '"]');
        var value = valueEl ? (parseInt(valueEl.value) || 0) : 0;
        var isCore = currentCharacter.weaponSkills && currentCharacter.weaponSkills[skillName] && currentCharacter.weaponSkills[skillName].isCore;
        
        updates.weaponSkills[skillName] = {
            value: value,
            isCore: isCore || false,
            attr: WEAPON_SKILLS_V2[skillName].attr
        };
    });
    
    // Get weapons
    updates.weapons = [];
    document.querySelectorAll('[data-weapon-index]').forEach(function(el) {
        var index = parseInt(el.dataset.weaponIndex);
        if (!updates.weapons[index]) {
            updates.weapons[index] = { name: '', damage: '', range: '', weight: '' };
        }
        var field = el.dataset.weaponField;
        updates.weapons[index][field] = el.value || '';
    });
    updates.weapons = updates.weapons.filter(function(w) { return w.name.trim(); });
    
    // Get currency
    updates.currency = {
        guld: 0,
        silver: 0,
        brons: 0
    };
    var guldEl = document.querySelector('[data-currency="guld"]');
    if (guldEl) updates.currency.guld = parseInt(guldEl.value) || 0;
    
    var silverEl = document.querySelector('[data-currency="silver"]');
    if (silverEl) updates.currency.silver = parseInt(silverEl.value) || 0;
    
    var bronsEl = document.querySelector('[data-currency="brons"]');
    if (bronsEl) updates.currency.brons = parseInt(bronsEl.value) || 0;
    
    CharacterService.updateCharacter(currentCharacter.id, updates).then(function() {
        showToast('Sparad!', 'success');
        Object.assign(currentCharacter, updates);
        loadDashboard();
    }).catch(function(e) {
        showToast('Fel: ' + e.message, 'error');
    });
}

function deleteCharacter(id) {
    if (!confirm('Ta bort karaktären?')) return;
    CharacterService.deleteCharacter(id).then(function() {
        loadDashboard();
        loadCharactersList();
        showToast('Borttagen', 'success');
    }).catch(function() {
        showToast('Fel', 'error');
    });
}

// Toast
function showToast(msg, type) {
    var old = document.querySelector('.toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'toast toast-' + (type || 'info');
    t.innerHTML = '<span>' + msg + '</span>';
    document.body.appendChild(t);
    setTimeout(function() { t.classList.add('show'); }, 10);
    setTimeout(function() { t.remove(); }, 3000);
}

// Sheet tabs
function switchSheetTab(btn, tabId) {
    document.querySelectorAll('.sheet-tab').forEach(function(t) { t.classList.remove('active'); });
    btn.classList.add('active');
    document.querySelectorAll('.sheet-tab-content').forEach(function(c) { c.classList.remove('active'); });
    var content = document.getElementById('tab-' + tabId);
    if (content) content.classList.add('active');
}

// Progress bar update
function updateProgressBar(input, max) {
    var current = parseInt(input.value) || 0;
    var percent = Math.min(100, max > 0 ? (current / max * 100) : 0);
    var bar = input.closest('.hp-vp-progress-bar').querySelector('.progress-bar-fill');
    if (bar) bar.style.width = percent + '%';
}

// Party functions
function openCreateParty() {
    var modal = document.getElementById('partyModal');
    if (modal) {
        document.getElementById('partyName').value = '';
        document.getElementById('partyDescription').value = '';
        modal.classList.add('active');
    }
}

function createParty() {
    var name = document.getElementById('partyName').value;
    var description = document.getElementById('partyDescription').value;
    
    if (!name.trim()) {
        showToast('Ange ett gruppnamn', 'error');
        return;
    }
    
    var partyData = {
        name: name.trim(),
        description: description.trim()
    };
    
    if (typeof PartyService === 'undefined') {
        showToast('PartyService inte laddat', 'error');
        return;
    }
    
    PartyService.createParty(partyData).then(function() {
        closeModal('partyModal');
        loadPartiesList();
        showToast('Grupp skapad!', 'success');
    }).catch(function(err) {
        showToast('Fel: ' + err.message, 'error');
    });
}

function loadPartiesList() {
    console.log('📋 loadPartiesList');
    var container = document.getElementById('partiesGrid');
    var countEl = document.getElementById('partyCount');
    if (!container) return;
    
    if (typeof PartyService === 'undefined') {
        container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>Laddar...</h3></div>';
        return;
    }
    
    container.innerHTML = '<div class="loading-placeholder" style="grid-column:1/-1"><div class="spinner"></div><p>Laddar...</p></div>';
    
    PartyService.getUserParties().then(function(parties) {
        if (countEl) countEl.textContent = parties.length + ' grupp' + (parties.length !== 1 ? 'er' : '');
        if (parties.length === 0) {
            container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">👥</div><h3>Inga grupper ännu</h3><p>Skapa en grupp för att samla dina karaktärer och dela med andra spelare.</p><button class="btn btn-gold" onclick="openCreateParty()">Skapa grupp</button></div>';
        } else {
            var html = parties.map(renderPartyCard).join('');
            // Add "Skapa ny grupp" card
            html += renderNewGroupCard();
            container.innerHTML = html;
        }
    }).catch(function(err) {
        container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>Fel</h3><p>' + err.message + '</p></div>';
    });
}

function renderPartyCard(party) {
    var memberCount = (party.memberIds || []).length;
    var charCount = (party.characterIds || []).length;
    var user = getCurrentUser && getCurrentUser();
    var isOwner = user && party.ownerId === user.uid;
    var isActive = party.isActive || false;
    
    var html = '<div class="fantasy-group-card" onclick="viewParty(\'' + party.id + '\')">';
    
    // Decorative L-corners
    html += '<svg class="decorative-corner-svg top-left" viewBox="0 0 25 25"><path d="M0 0 L25 0 L25 3 L3 3 L3 25 L0 25 Z" fill="#d4af37" /></svg>';
    html += '<svg class="decorative-corner-svg top-right" viewBox="0 0 25 25"><path d="M0 0 L25 0 L25 25 L22 25 L22 3 L0 3 Z" fill="#d4af37" /></svg>';
    html += '<svg class="decorative-corner-svg bottom-left" viewBox="0 0 25 25"><path d="M0 0 L3 0 L3 22 L25 22 L25 25 L0 25 Z" fill="#d4af37" /></svg>';
    html += '<svg class="decorative-corner-svg bottom-right" viewBox="0 0 25 25"><path d="M22 0 L25 0 L25 25 L0 25 L0 22 L22 22 Z" fill="#d4af37" /></svg>';
    
    // Header
    html += '<div class="fantasy-group-header">';
    html += '<div>';
    html += '<h3 class="fantasy-group-title">' + (party.name || 'Namnlös grupp') + '</h3>';
    html += '<div class="fantasy-group-meta">' + memberCount + ' medlemmar' + (isOwner ? ' • Skapad av dig' : '') + '</div>';
    html += '</div>';
    if (isActive) {
        html += '<div class="fantasy-group-badge-active">Aktiv</div>';
    }
    html += '</div>';
    
    // Member avatars (show up to 4)
    html += '<div class="fantasy-group-avatars">';
    var avatars = ['👤', '🧔', '🧝', '🧙'];
    for (var i = 0; i < Math.min(memberCount, 4); i++) {
        html += '<div class="fantasy-group-avatar" style="z-index: ' + (4 - i) + '">' + avatars[i % avatars.length] + '</div>';
    }
    html += '</div>';
    
    // Button
    html += '<button class="fantasy-group-button" onclick="event.stopPropagation();viewParty(\'' + party.id + '\')">🎮 Starta Spelläge</button>';
    
    html += '</div>';
    return html;
}

// Render "Skapa ny grupp" card
function renderNewGroupCard() {
    var html = '<div class="fantasy-create-card" style="width: 300px; height: 155px;" onclick="openCreateParty()">';
    html += '<div class="fantasy-create-plus">+</div>';
    html += '<div class="fantasy-create-text">Skapa ny grupp</div>';
    html += '</div>';
    return html;
}

function loadUpcomingSessions() {
    console.log('📅 loadUpcomingSessions');
    var container = document.getElementById('upcomingSessionsGrid');
    var countEl = document.getElementById('sessionsCount');
    if (!container) return;
    
    if (typeof PartyService === 'undefined') {
        container.innerHTML = '<div class="empty-state"><h3>Laddar...</h3></div>';
        return;
    }
    
    container.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div><p>Laddar...</p></div>';
    
    PartyService.getUpcomingSessions().then(function(sessions) {
        if (countEl) countEl.textContent = sessions.length + ' session' + (sessions.length !== 1 ? 'er' : '') + ' planerade';
        
        if (sessions.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><h3>Inga kommande sessioner</h3><p>Planera en session för din grupp för att se den här.</p></div>';
        } else {
            var html = sessions.map(renderSessionCard).join('');
            container.innerHTML = html;
        }
    }).catch(function(err) {
        console.error('Error loading sessions:', err);
        container.innerHTML = '<div class="empty-state"><h3>Fel</h3><p>' + err.message + '</p></div>';
    });
}

function renderSessionCard(session) {
    var html = '<div class="session-card" onclick="viewParty(\'' + session.partyId + '\')">';
    
    html += '<div class="session-date">📅 ' + session.date + '</div>';
    html += '<div class="session-party-name">' + session.partyName + '</div>';
    
    if (session.location) {
        html += '<div class="session-location">📍 ' + session.location + '</div>';
    }
    
    if (session.attendees && session.attendees.length > 0) {
        html += '<div class="session-attendees">';
        html += '<div class="session-attendees-title">Deltagare</div>';
        
        var attending = session.attendees.filter(function(a) { return a.status === 'attending'; });
        var maybe = session.attendees.filter(function(a) { return a.status === 'maybe'; });
        var notAttending = session.attendees.filter(function(a) { return a.status === 'not_attending'; });
        
        if (attending.length > 0) {
            html += '<span class="attendee-status attending">✓ ' + attending.length + ' deltar</span>';
        }
        if (maybe.length > 0) {
            html += '<span class="attendee-status maybe">? ' + maybe.length + ' kanske</span>';
        }
        if (notAttending.length > 0) {
            html += '<span class="attendee-status not-attending">✗ ' + notAttending.length + ' deltar inte</span>';
        }
        
        html += '</div>';
    }
    
    html += '</div>';
    return html;
}

function viewParty(id) {
    console.log('👁️ viewParty:', id);
    var container = document.getElementById('partyViewContainer');
    if (!container) return;
    
    // Switch to party view section
    showSection('partyView');
    container.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div><p>Laddar... </p></div>';
    
    var user = getCurrentUser();
    var isOwner = false;
    
    PartyService.getParty(id).then(function(party) {
        isOwner = user && party.ownerId === user.uid;
        
        var promises = [
            Promise.resolve(party),
            CharacterService.getUserCharacters(),  // Your characters (for "available to add")
            CharacterService.getCharactersByIds(party. characterIds || [])  // All party characters
        ];
        
        // Load join requests if owner
        if (isOwner) {
            promises.push(
                db.collection('joinRequests')
                    .where('partyId', '==', id)
                    .where('status', '==', 'pending')
                    .get()
                    .then(function(snapshot) {
                        var requests = [];
                        snapshot.forEach(function(doc) {
                            requests.push(Object.assign({ id: doc.id }, doc.data()));
                        });
                        return requests;
                    })
            );
        } else {
            promises.push(Promise. resolve([]));
        }
        
        // Load messages
        promises.push(PartyService.getMessages(id));
        
        return Promise.all(promises);
    }).then(function(results) {
        var party = results[0];
        var myChars = results[1];          // Your characters
        var partyChars = results[2] || []; // All characters in the party
        var joinRequests = results[3] || [];
        var messages = results[4] || [];
        
        // Your characters not yet in party (available to add)
        var availableChars = myChars. filter(function(char) {
            return (party.characterIds || []).indexOf(char.id) === -1;
        });
        
        container.innerHTML = renderPartyView(party, partyChars, availableChars, joinRequests, messages, isOwner);
        
        // Auto-scroll chat to bottom
        var chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // Setup message listener
        // Note: Using window.currentPartyMessageUnsubscribe for cleanup on navigation
        // This is acceptable since only one party view can be active at a time
        if (typeof window.currentPartyMessageUnsubscribe !== 'undefined' && window.currentPartyMessageUnsubscribe) {
            window.currentPartyMessageUnsubscribe();
        }
        window.currentPartyMessageUnsubscribe = PartyService.listenToMessages(id, function(newMessages) {
            var chatContainer = document.getElementById('chatMessages');
            if (chatContainer) {
                chatContainer.innerHTML = newMessages.map(renderMessage).join('');
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        });
    }).catch(function(err) {
        console.error('Error loading party:', err);
        var errorMsg = (err && err.message) || 'Kunde inte ladda gruppen';
        container.innerHTML = '<div class="empty-state"><h3>Fel</h3><p>' + errorMsg + '</p><button class="btn btn-outline" onclick="closePartyView()">Tillbaka</button></div>';
    });
}

function closePartyView() {
    // Clean up message listener
    if (typeof window.currentPartyMessageUnsubscribe !== 'undefined' && window.currentPartyMessageUnsubscribe) {
        window.currentPartyMessageUnsubscribe();
        window.currentPartyMessageUnsubscribe = null;
    }
    showSection('parties');
}

function renderPartyView(party, partyChars, availableChars, joinRequests, messages, isOwner) {
    var html = '<div style="padding: 1rem;">' +
        '<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">' +
        '<div style="flex: 1;">' +
        '<h1 style="font-family: var(--font-display); margin-bottom: 0.5rem;">' + party.name + '</h1>' +
        '<p style="color: var(--text-secondary); margin-bottom: 0.5rem;">' + (party.description || 'Ingen beskrivning') + '</p>';
    
    // Admin actions for owner
    if (isOwner) {
        var escapedName = escapeHtml(party.name);
        var escapedDesc = escapeHtml(party.description || '');
        var escapedId = escapeHtml(party.id);
        html += '<div class="group-admin-actions" style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">' +
            '<button class="btn btn-outline btn-sm" onclick="openEditGroupModal(\'' + escapedId + '\', \'' + escapedName + '\', \'' + escapedDesc + '\')">✏️ Redigera grupp</button>' +
            '<button class="btn btn-outline btn-sm" style="color: var(--red-hp); border-color: var(--red-hp);" onclick="confirmDeleteGroup(\'' + escapedId + '\', \'' + escapedName + '\')">🗑️ Radera grupp</button>' +
            '</div>';
    }
    
    html += '</div>' +
        '<div style="text-align: right;">' +
        '<div style="background: var(--bg-elevated); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 2px solid var(--accent-gold); margin-bottom: 0.5rem;">' +
        '<div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem; text-transform: uppercase;">Inbjudningskod</div>' +
        '<div style="display: flex; align-items: center; gap: 0.5rem;">' +
        '<code style="font-size: 1.25rem; font-weight: 700; color: var(--accent-gold); letter-spacing: 0.1em;">' + (party.inviteCode || '------') + '</code>' +
        '<button class="btn btn-ghost btn-xs" onclick="copyInviteCode(\'' + (party.inviteCode || '') + '\')">📋 Kopiera</button>' +
        '</div></div>' +
        '</div></div>';
    
    // Next Session section
    if (party.nextSession || isOwner) {
        html += '<div class="session-info-card" style="margin-bottom: 2rem; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1.5rem;">' +
            '<div class="session-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">' +
            '<h3 style="margin: 0; font-size: 1.125rem; font-weight: 600;">📅 Nästa Session</h3>';
        
        if (isOwner) {
            html += '<button class="btn btn-gold btn-xs" onclick="openSessionScheduler(\'' + party.id + '\')">✏️ Redigera</button>';
        }
        
        html += '</div>';
        
        if (party.nextSession) {
            html += '<div class="session-details" style="margin-bottom: 1rem;">' +
                '<div class="session-row" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">' +
                '<span class="icon" style="font-size: 1.25rem;">🗓️</span>' +
                '<span class="label" style="font-weight: 600; color: var(--text-secondary);">Datum:</span>' +
                '<span class="value" style="color: var(--text-primary);">' + party.nextSession + '</span>' +
                '</div>';
            
            // Location (if provided)
            if (party.nextSessionLocation) {
                html += '<div class="session-row" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">' +
                    '<span class="icon" style="font-size: 1.25rem;">📍</span>' +
                    '<span class="label" style="font-weight: 600; color: var(--text-secondary);">Plats:</span>' +
                    '<span class="value" style="color: var(--text-primary);">' + party.nextSessionLocation + '</span>' +
                    '</div>';
            }
            
            html += '</div>';
            
            // Participants
            var attendees = party.sessionAttendees || {};
            var user = getCurrentUser();
            var currentUserId = user ? user.uid : null;
            var currentUserStatus = currentUserId && attendees[currentUserId] ? attendees[currentUserId].status : null;
            
            html += '<div class="session-participants" style="margin-bottom: 1rem;">' +
                '<div class="label" style="font-weight: 600; margin-bottom: 0.75rem; color: var(--text-secondary);">Deltagare:</div>' +
                '<div class="participant-list" style="display: flex; flex-direction: column; gap: 0.5rem;">';
            
            var hasParticipants = false;
            Object.keys(attendees).forEach(function(userId) {
                hasParticipants = true;
                var attendee = attendees[userId];
                var statusIcon = '';
                var statusClass = '';
                var statusText = '';
                
                if (attendee.status === 'attending') {
                    statusIcon = '✓';
                    statusClass = 'attending';
                    statusText = 'Kommer';
                } else if (attendee.status === 'maybe') {
                    statusIcon = '?';
                    statusClass = 'maybe';
                    statusText = 'Kanske';
                } else if (attendee.status === 'not_attending') {
                    statusIcon = '✗';
                    statusClass = 'not-attending';
                    statusText = 'Kommer ej';
                }
                
                html += '<div class="participant ' + statusClass + '" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; background: var(--bg-secondary); border-radius: var(--radius-sm);">' +
                    '<div class="participant-avatar" style="width: 32px; height: 32px; background: var(--bg-elevated); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">👤</div>' +
                    '<span class="participant-name" style="flex: 1; font-weight: 500;">' + (attendee.name || 'Okänd') + '</span>' +
                    '<span class="status ' + statusClass + '" style="font-size: 0.875rem; padding: 0.25rem 0.5rem; border-radius: 4px;">' + statusIcon + ' ' + statusText + '</span>' +
                    '</div>';
            });
            
            if (!hasParticipants) {
                html += '<p style="color: var(--text-muted); font-size: 0.875rem;">Inga svar ännu</p>';
            }
            
            html += '</div></div>';
            
            // Admin panel for adding participants (owner only)
            if (isOwner && party.memberIds && party.memberIds.length > 0) {
                html += '<div class="session-admin-panel" style="border-top: 1px solid var(--border-default); padding-top: 1rem; margin-top: 1rem;">' +
                    '<h4 style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.75rem;">⚙️ Hantera deltagare</h4>' +
                    '<div class="add-participant" style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">' +
                    '<select id="addParticipantSelect" class="creator-input" style="flex: 1;">' +
                    '<option value="">Välj medlem...</option>';
                
                // List all group members who haven't responded yet
                party.memberIds.forEach(function(memberId) {
                    if (!attendees[memberId]) {
                        // Get member name (would need to be passed in membersList)
                        var escapedId = escapeHtml(memberId);
                        html += '<option value="' + escapedId + '">Medlem ' + escapedId.substring(0, 8) + '</option>';
                    }
                });
                
                html += '</select>' +
                    '<button class="btn btn-gold btn-sm" onclick="addParticipantToSession(\'' + party.id + '\')">+ Lägg till</button>' +
                    '</div>' +
                    '<p style="font-size: 0.75rem; color: var(--text-muted);">Lägg till gruppmedlemmar i sessionen</p>' +
                    '</div>';
            }
            
            // RSVP for current user
            if (currentUserId) {
                html += '<div class="session-rsvp" style="border-top: 1px solid var(--border-default); padding-top: 1rem; margin-top: 1rem;">' +
                    '<div style="margin-bottom: 0.75rem; font-weight: 600; color: var(--text-secondary);">Kommer du?</div>' +
                    '<div class="session-rsvp-buttons">' +
                    '<button class="rsvp-btn attending' + (currentUserStatus === 'attending' ? ' active' : '') + '" onclick="setAttendance(\'' + party.id + '\', \'attending\')">✓ Ja</button>' +
                    '<button class="rsvp-btn maybe' + (currentUserStatus === 'maybe' ? ' active' : '') + '" onclick="setAttendance(\'' + party.id + '\', \'maybe\')">? Kanske</button>' +
                    '<button class="rsvp-btn not-attending' + (currentUserStatus === 'not_attending' ? ' active' : '') + '" onclick="setAttendance(\'' + party.id + '\', \'not_attending\')">✗ Nej</button>' +
                    '</div>' +
                    '</div>';
            }
        } else {
            html += '<p style="color: var(--text-muted); margin-top: 0.5rem;">Ingen session schemalagd ännu</p>';
        }
        
        html += '</div>';
    }
    
    // Show join requests if owner and there are pending requests
    if (isOwner && joinRequests && joinRequests.length > 0) {
        html += '<div style="margin-bottom: 2rem; background: var(--bg-elevated); border: 1px solid var(--accent-gold); border-radius: var(--radius-lg); padding: 1rem;">' +
            '<h3 style="margin-bottom: 1rem;">📬 Väntande förfrågningar (' + joinRequests.length + ')</h3>';
        
        joinRequests.forEach(function(request) {
            html += '<div class="join-request-item">' +
                '<div class="join-request-info">' +
                '<div class="join-request-char">' + request.characterName + '</div>' +
                '<div class="join-request-user">Från: ' + request.requesterName + '</div>' +
                '</div>' +
                '<div class="join-request-actions">' +
                '<button class="btn btn-gold btn-xs" onclick="acceptJoinRequest(\'' + request.id + '\', \'' + party.id + '\', \'' + request.characterId + '\')">✓ Godkänn</button>' +
                '<button class="btn btn-ghost btn-xs" onclick="declineJoinRequest(\'' + request.id + '\')">✗ Neka</button>' +
                '</div>' +
                '</div>';
        });
        
        html += '</div>';
    }
    
    // Notes section (owner can edit)
    if (isOwner) {
        html += '<div style="margin-bottom: 2rem; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1rem;">' +
            '<h3 style="margin-bottom: 0.5rem; font-size: 1rem;">📝 Anteckningar (synliga för alla medlemmar)</h3>' +
            '<textarea id="partyNotes" class="bio-textarea" placeholder="Lägg till anteckningar för gruppen..." style="margin-bottom: 0.5rem;">' + (party.notes || '') + '</textarea>' +
            '<button class="btn btn-gold btn-xs" onclick="savePartyNotes(\'' + party.id + '\')">💾 Spara anteckningar</button>' +
            '</div>';
    } else if (party.notes) {
        html += '<div style="margin-bottom: 2rem; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1rem;">' +
            '<h3 style="margin-bottom: 0.5rem; font-size: 1rem;">📝 Anteckningar från ägaren</h3>' +
            '<p style="color: var(--text-secondary); white-space: pre-wrap;">' + party.notes + '</p>' +
            '</div>';
    }
    
    // Game Mode button (only for owner)
    if (isOwner && partyChars.length > 0) {
        html += '<div style="margin-bottom: 2rem; text-align: center;">' +
            '<button class="btn-start-game-mode" onclick="GameModeUI.init(\'' + party.id + '\')">' +
            '<span class="btn-icon">⚔️</span>' +
            '<span class="btn-text">Starta Spelläge</span>' +
            '<span class="btn-icon">⚔️</span>' +
            '</button>' +
            '</div>';
    }
    
    html += '<div style="margin-bottom: 2rem;">' +
        '<h3 style="margin-bottom: 1rem;">Karaktärer i gruppen (' + partyChars.length + ')</h3>' +
        '<div class="character-cards">' +
        (partyChars.length === 0 ? '<div class="empty-state"><p>Inga karaktärer i gruppen ännu</p></div>' :
            partyChars.map(function(char) {
                return renderPartyCharacterCard(char, party.id);
            }).join('')) +
        '</div></div>';
    
    if (isOwner) {
        html += '<div style="margin-bottom: 2rem;">' +
            '<h3 style="margin-bottom: 1rem;">Lägg till karaktär</h3>' +
            (availableChars.length === 0 ? '<p style="color: var(--text-muted);">Alla dina karaktärer är redan i gruppen</p>' :
                '<div class="character-cards">' +
                availableChars.map(function(char) {
                    return renderAddCharacterCard(char, party.id);
                }).join('') +
                '</div>') +
            '</div>';
    }
    
    // Chat section
    html += '<div style="background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1rem;">' +
        '<h3 style="margin-bottom: 1rem;">💬 Gruppchatt</h3>' +
        '<div id="chatMessages" style="max-height: 300px; overflow-y: auto; margin-bottom: 1rem; padding: 0.5rem; background: var(--bg-secondary); border-radius: var(--radius-md);">' +
        (messages && messages.length > 0 ? messages.map(renderMessage).join('') : '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">Inga meddelanden ännu</p>') +
        '</div>' +
        '<form onsubmit="sendChatMessage(\'' + party.id + '\'); return false;" style="display: flex; gap: 0.5rem;">' +
        '<input type="text" id="chatInput" class="creator-input" placeholder="Skriv ett meddelande..." required style="margin: 0; flex: 1;">' +
        '<button type="submit" class="btn btn-gold">Skicka</button>' +
        '</form>' +
        '</div>' +
        '</div>';
    
    return html;
}

// Helper function to format timestamps
function formatMessageTimestamp(timestamp) {
    if (!timestamp) return '';
    
    if (typeof timestamp.toDate === 'function') {
        // Firestore Timestamp object
        return timestamp.toDate().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    } else if (timestamp instanceof Date) {
        // JavaScript Date object
        return timestamp.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Fallback for pending messages
    return 'Nu';
}

function renderMessage(msg) {
    var time = formatMessageTimestamp(msg.timestamp);
    return '<div style="margin-bottom: 0.75rem; padding: 0.5rem; background: var(--bg-elevated); border-radius: var(--radius-sm);">' +
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">' +
        '<span style="font-weight: 600; font-size: 0.875rem; color: var(--accent-gold);">' + (msg.userName || 'Okänd') + '</span>' +
        '<span style="font-size: 0.75rem; color: var(--text-muted);">' + time + '</span>' +
        '</div>' +
        '<p style="color: var(--text-secondary); font-size: 0.875rem; word-wrap: break-word;">' + (msg.message || '') + '</p>' +
        '</div>';
}

function renderPartyCharacterCard(char, partyId) {
    var icon = getKinIcon(char.kin);
    var subtitle = [char.kin, char.profession].filter(Boolean).join(' ');
    var attrs = char.attributes || {};
    
    return '<div class="character-card">' +
        '<div class="char-portrait">' + icon + '</div>' +
        '<div class="char-info">' +
        '<div class="char-name">' + (char.name || 'Namnlös') + '</div>' +
        '<div class="char-subtitle">' + (subtitle || 'Okänd') + '</div>' +
        '<div class="char-stats">' +
        '<div class="char-stat">❤️ ' + (attrs.FYS || '?') + ' KP</div>' +
        '<div class="char-stat">💜 ' + (attrs.PSY || '?') + ' VP</div>' +
        '</div></div>' +
        '<button class="btn btn-ghost btn-xs" onclick="removeCharFromParty(\'' + partyId + '\', \'' + char.id + '\')">Ta bort</button>' +
        '</div>';
}

function renderAddCharacterCard(char, partyId) {
    var icon = getKinIcon(char.kin);
    var subtitle = [char.kin, char.profession].filter(Boolean).join(' ');
    
    return '<div class="character-card">' +
        '<div class="char-portrait">' + icon + '</div>' +
        '<div class="char-info">' +
        '<div class="char-name">' + (char.name || 'Namnlös') + '</div>' +
        '<div class="char-subtitle">' + (subtitle || 'Okänd') + '</div>' +
        '</div>' +
        '<button class="btn btn-gold btn-xs" onclick="addCharToParty(\'' + partyId + '\', \'' + char.id + '\')">+ Lägg till</button>' +
        '</div>';
}

function addCharToParty(partyId, charId) {
    PartyService.addCharacterToParty(partyId, charId).then(function() {
        viewParty(partyId);
        showToast('Karaktär tillagd!', 'success');
    }).catch(function(err) {
        showToast('Fel: ' + err.message, 'error');
    });
}

function removeCharFromParty(partyId, charId) {
    PartyService.removeCharacterFromParty(partyId, charId).then(function() {
        viewParty(partyId);
        showToast('Karaktär borttagen', 'success');
    }).catch(function(err) {
        showToast('Fel: ' + err.message, 'error');
    });
}

function deleteParty(id) {
    if (!confirm('Ta bort gruppen?')) return;
    PartyService.deleteParty(id).then(function() {
        loadPartiesList();
        showToast('Grupp borttagen', 'success');
    }).catch(function(err) {
        showToast('Fel: ' + err.message, 'error');
    });
}

// Add character to group
var currentAddCharacterId = null;

function openAddToGroupModal(charId) {
    currentAddCharacterId = charId;
    var modal = document.getElementById('addToGroupModal');
    var groupsList = document.getElementById('groupsList');
    
    if (!modal || !groupsList) return;
    
    var user = getCurrentUser();
    if (!user) {
        showToast('Du måste vara inloggad', 'error');
        return;
    }
    
    modal.classList.add('active');
    groupsList.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div><p>Laddar grupper...</p></div>';
    
    // Load user's parties
    PartyService.getUserParties().then(function(parties) {
        if (parties.length === 0) {
            groupsList.innerHTML = '<div class="empty-state"><p>Du har inga grupper ännu. Skapa en grupp först.</p><button class="btn btn-gold" onclick="closeModal(\'addToGroupModal\');openCreateParty()">Skapa grupp</button></div>';
            return;
        }
        
        groupsList.innerHTML = parties.map(function(party) {
            var isOwner = user && party.ownerId === user.uid;
            var hasChar = (party.characterIds || []).indexOf(charId) !== -1;
            
            if (hasChar) {
                return '<div class="group-select-item disabled">' +
                    '<div><div class="group-name">👥 ' + party.name + '</div>' +
                    '<div class="group-owner">Redan i denna grupp</div></div>' +
                    '</div>';
            }
            
            return '<div class="group-select-item" onclick="addCharToGroup(\'' + party.id + '\', \'' + charId + '\', ' + isOwner + ')">' +
                '<div><div class="group-name">👥 ' + party.name + '</div>' +
                '<div class="group-owner">' + (isOwner ? 'Din grupp' : 'Ägare: ' + party.ownerName) + '</div></div>' +
                '<button class="btn btn-ghost btn-xs">' + (isOwner ? 'Lägg till' : 'Skicka förfrågan') + ' →</button>' +
                '</div>';
        }).join('');
    }).catch(function(err) {
        groupsList.innerHTML = '<div class="empty-state"><p>Fel: ' + err.message + '</p></div>';
    });
}

function addCharToGroup(partyId, charId, isOwner) {
    closeModal('addToGroupModal');
    
    if (isOwner) {
        // Direct add for owner
        PartyService.addCharacterToParty(partyId, charId).then(function() {
            showToast('Karaktär tillagd i grupp!', 'success');
            loadCharactersList();
        }).catch(function(err) {
            showToast('Fel: ' + err.message, 'error');
        });
    } else {
        // Create join request for non-owner
        createJoinRequest(partyId, charId);
    }
}

function createJoinRequest(partyId, charId) {
    var user = getCurrentUser();
    if (!user) {
        showToast('Du måste vara inloggad', 'error');
        return;
    }
    
    // Get party and character info
    Promise.all([
        PartyService.getParty(partyId),
        CharacterService.getCharacter(charId)
    ]).then(function(results) {
        var party = results[0];
        var character = results[1];
        
        var request = {
            partyId: partyId,
            partyName: party.name,
            characterId: charId,
            characterName: character.name,
            requesterId: user.uid,
            requesterName: user.displayName || user.email,
            groupOwnerId: party.ownerId,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        return db.collection('joinRequests').add(request);
    }).then(function() {
        showToast('Förfrågan skickad!', 'success');
    }).catch(function(err) {
        console.error('Join request error:', err);
        showToast('Fel: ' + err.message, 'error');
    });
}

function acceptJoinRequest(requestId, partyId, characterId) {
    // First get the join request to find the requester's user ID
    db.collection('joinRequests').doc(requestId).get().then(function(doc) {
        if (!doc.exists) throw new Error('Förfrågan hittades inte');
        
        var requestData = doc.data();
        var requesterId = requestData.requesterId;
        
        // Add character to party AND add user to memberIds
        return db.collection('parties').doc(partyId).update({
            characterIds: firebase.firestore.FieldValue.arrayUnion(characterId),
            memberIds: firebase. firestore.FieldValue.arrayUnion(requesterId),
            updatedAt:  firebase.firestore. FieldValue.serverTimestamp()
        });
    }).then(function() {
        // Update request status
        return db.collection('joinRequests').doc(requestId).update({
            status: 'accepted',
            processedAt: firebase. firestore.FieldValue.serverTimestamp()
        });
    }).then(function() {
        showToast('Karaktär godkänd och tillagd! ', 'success');
        viewParty(partyId); // Refresh view
    }).catch(function(err) {
        console.error('Accept join request error:', err);
        showToast('Fel:  ' + err.message, 'error');
    });
}

function declineJoinRequest(requestId) {
    // Get the request to find party ID
    db.collection('joinRequests').doc(requestId).get().then(function(doc) {
        if (!doc.exists) throw new Error('Förfrågan hittades inte');
        var partyId = doc.data().partyId;
        
        return db.collection('joinRequests').doc(requestId).update({
            status: 'declined',
            processedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
            return partyId;
        });
    }).then(function(partyId) {
        showToast('Förfrågan nekad', 'success');
        viewParty(partyId); // Refresh view
    }).catch(function(err) {
        showToast('Fel: ' + err.message, 'error');
    });
}

// Join group functions
function openJoinGroupModal() {
    var modal = document.getElementById('joinGroupModal');
    if (modal) {
        document.getElementById('groupInviteCode').value = '';
        document.getElementById('foundGroupContainer').innerHTML = '';
        modal.classList.add('active');
    }
}

function searchGroupByCode() {
    var searchInput = document.getElementById('groupInviteCode').value;
    var container = document.getElementById('foundGroupContainer');
    
    if (!searchInput || !searchInput.trim()) {
        showToast('Ange en inbjudningskod eller gruppnamn', 'error');
        return;
    }
    
    container.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div><p>Söker...</p></div>';
    
    var searchTerm = searchInput.trim().toUpperCase();
    
    // Try to search by invite code first
    PartyService.searchPartyByCode(searchTerm).then(function(party) {
        displayFoundGroup(party, container);
    }).catch(function(err) {
        // If not found by code, try searching by name
        console.log('Not found by code, searching by name...');
        return searchGroupByName(searchTerm, container);
    });
}

function searchGroupByName(searchTerm, container) {
    // Search for groups where the name contains the search term (case-insensitive)
    // Note: This performs client-side filtering. For large datasets, consider
    // implementing server-side search with Firestore queries or Algolia
    var user = getCurrentUser();
    if (!user) {
        container.innerHTML = '<div style="text-align: center; padding: 1rem; color: var(--brand-red);"><p>❌ Du måste vara inloggad</p></div>';
        return;
    }
    
    return db.collection('parties')
        .get()
        .then(function(snapshot) {
            var matches = [];
            snapshot.forEach(function(doc) {
                var data = doc.data();
                var name = (data.name || '').toUpperCase();
                // Match if name contains search term
                if (name.includes(searchTerm)) {
                    matches.push(Object.assign({ id: doc.id }, data));
                }
            });
            
            if (matches.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 1rem; color: var(--brand-red);">' +
                    '<p>❌ Ingen grupp hittades med koden eller namnet "' + searchTerm + '"</p>' +
                    '</div>';
            } else if (matches.length === 1) {
                displayFoundGroup(matches[0], container);
            } else {
                // Multiple matches - show list
                displayMultipleGroups(matches, container, user);
            }
        })
        .catch(function(err) {
            container.innerHTML = '<div style="text-align: center; padding: 1rem; color: var(--brand-red);">' +
                '<p>❌ ' + err.message + '</p>' +
                '</div>';
        });
}

function displayFoundGroup(party, container) {
    var user = getCurrentUser();
    var isMember = (party.memberIds || []).indexOf(user.uid) !== -1;
    
    if (isMember) {
        container.innerHTML = '<div style="background: var(--bg-elevated); border: 1px solid var(--accent-gold); border-radius: var(--radius-lg); padding: 1rem; text-align: center;">' +
            '<h3 style="color: var(--accent-gold);">✓ Du är redan medlem</h3>' +
            '<p style="color: var(--text-secondary); margin: 0.5rem 0;">Du är redan medlem i denna grupp.</p>' +
            '<button class="btn btn-gold btn-sm" onclick="closeModal(\'joinGroupModal\');viewParty(\'' + party.id + '\')">Visa grupp</button>' +
            '</div>';
    } else {
        container.innerHTML = '<div style="background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1rem;">' +
            '<h3 style="margin-bottom: 0.5rem;">👥 ' + party.name + '</h3>' +
            '<p style="color: var(--text-secondary); margin-bottom: 0.5rem;">' + (party.description || 'Ingen beskrivning') + '</p>' +
            '<p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem;">Ägare: ' + party.ownerName + '</p>' +
            '<div id="joinCharactersList"></div>' +
            '</div>';
        
        // Load user's characters
        CharacterService.getUserCharacters().then(function(characters) {
            var charList = document.getElementById('joinCharactersList');
            if (!charList) return;
            
            if (characters.length === 0) {
                charList.innerHTML = '<p style="color: var(--text-muted); margin-bottom: 1rem;">Du har inga karaktärer att lägga till. Skapa en karaktär först.</p>';
            } else {
                charList.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem;">Välj en karaktär att skicka förfrågan med:</p>' +
                    '<div class="character-cards" style="grid-template-columns: 1fr;">' +
                    characters.map(function(char) {
                        var icon = getKinIcon(char.kin);
                        var subtitle = [char.kin, char.profession].filter(Boolean).join(' ');
                        return '<div class="character-card" onclick="requestJoinWithCharacter(\'' + party.id + '\', \'' + char.id + '\')" style="cursor: pointer;">' +
                            '<div class="char-portrait">' + icon + '</div>' +
                            '<div class="char-info">' +
                            '<div class="char-name">' + (char.name || 'Namnlös') + '</div>' +
                            '<div class="char-subtitle">' + (subtitle || 'Okänd') + '</div>' +
                            '</div>' +
                            '<button class="btn btn-gold btn-xs">Skicka förfrågan →</button>' +
                            '</div>';
                    }).join('') +
                    '</div>';
            }
        });
    }
}

function displayMultipleGroups(groups, container, user) {
    container.innerHTML = '<div style="background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1rem;">' +
        '<h3 style="margin-bottom: 1rem;">Hittade ' + groups.length + ' grupper</h3>' +
        '<p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">Välj en grupp att gå med i:</p>' +
        '<div style="max-height: 400px; overflow-y: auto;">' +
        groups.map(function(party) {
            var isMember = (party.memberIds || []).indexOf(user.uid) !== -1;
            var memberCount = (party.memberIds || []).length;
            
            return '<div class="group-select-item' + (isMember ? ' disabled' : '') + '" ' +
                (isMember ? '' : 'onclick="selectGroupFromSearch(\'' + party.id + '\')"') + '>' +
                '<div>' +
                '<div class="group-name">👥 ' + party.name + '</div>' +
                '<div class="group-owner">Ägare: ' + party.ownerName + ' • ' + memberCount + ' medlem' + (memberCount !== 1 ? 'mar' : '') + '</div>' +
                (party.description ? '<div style="font-size: 0.813rem; color: var(--text-muted); margin-top: 0.25rem;">' + party.description + '</div>' : '') +
                '</div>' +
                '<button class="btn btn-ghost btn-xs">' + (isMember ? '✓ Medlem' : 'Välj →') + '</button>' +
                '</div>';
        }).join('') +
        '</div></div>';
}

function selectGroupFromSearch(partyId) {
    var container = document.getElementById('foundGroupContainer');
    container.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div><p>Laddar...</p></div>';
    
    PartyService.getParty(partyId).then(function(party) {
        displayFoundGroup(party, container);
    }).catch(function(err) {
        container.innerHTML = '<div style="text-align: center; padding: 1rem; color: var(--brand-red);">' +
            '<p>❌ ' + err.message + '</p>' +
            '</div>';
    });
}

function requestJoinWithCharacter(partyId, charId) {
    createJoinRequest(partyId, charId);
    closeModal('joinGroupModal');
}

function copyInviteCode(code) {
    if (!code) {
        showToast('Ingen kod att kopiera', 'error');
        return;
    }
    
    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function() {
            showToast('Inbjudningskod kopierad!', 'success');
        }).catch(function() {
            showToast('Kunde inte kopiera', 'error');
        });
    } else {
        // Fallback for older browsers
        var input = document.createElement('input');
        input.value = code;
        document.body.appendChild(input);
        input.select();
        try {
            document.execCommand('copy');
            showToast('Inbjudningskod kopierad!', 'success');
        } catch (err) {
            showToast('Kunde inte kopiera', 'error');
        }
        document.body.removeChild(input);
    }
}

// Edit Group Modal
function openEditGroupModal(partyId, currentName, currentDescription) {
    var modal = document.getElementById('editGroupModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'editGroupModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = 
        '<div class="modal-content">' +
        '<div class="modal-header">' +
        '<h2>✏️ Redigera Grupp</h2>' +
        '<button class="modal-close" onclick="closeEditGroupModal()">✕</button>' +
        '</div>' +
        '<div class="modal-body">' +
        '<form id="editGroupForm" onsubmit="saveGroupEdits(\'' + escapeHtml(partyId) + '\'); return false;">' +
        '<div class="form-group">' +
        '<label for="groupName">Gruppnamn</label>' +
        '<input type="text" id="groupName" class="creator-input" required value="' + escapeHtml(currentName) + '">' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="groupDescription">Beskrivning (valfritt)</label>' +
        '<textarea id="groupDescription" class="creator-input" rows="3">' + escapeHtml(currentDescription) + '</textarea>' +
        '</div>' +
        '<div class="modal-footer">' +
        '<button type="button" class="btn btn-outline" onclick="closeEditGroupModal()">Avbryt</button>' +
        '<button type="submit" class="btn btn-gold">💾 Spara</button>' +
        '</div>' +
        '</form>' +
        '</div>' +
        '</div>';
    
    modal.style.display = 'flex';
}

function closeEditGroupModal() {
    var modal = document.getElementById('editGroupModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function saveGroupEdits(partyId) {
    var nameInput = document.getElementById('groupName');
    var descInput = document.getElementById('groupDescription');
    
    if (!nameInput) return;
    
    var name = nameInput.value.trim();
    if (!name) {
        showToast('Gruppnamn krävs', 'error');
        return;
    }
    
    var updates = {
        name: name,
        description: descInput ? descInput.value.trim() : ''
    };
    
    PartyService.updateParty(partyId, updates).then(function() {
        showToast('Grupp uppdaterad!', 'success');
        closeEditGroupModal();
        viewParty(partyId); // Refresh the party view
    }).catch(function(err) {
        showToast('Fel: ' + err.message, 'error');
    });
}

// Delete Group
function confirmDeleteGroup(partyId, groupName) {
    // Use escapeHtml for consistent escaping
    var safeName = escapeHtml(groupName);
    
    if (confirm('Är du säker på att du vill radera gruppen "' + safeName + '"? Detta kan inte ångras.')) {
        PartyService.deleteParty(partyId).then(function() {
            showToast('Grupp raderad', 'success');
            // Navigate back to groups list
            document.getElementById('groupsBtn').click();
        }).catch(function(err) {
            showToast('Fel: ' + err.message, 'error');
        });
    }
}

function sendChatMessage(partyId) {
    var input = document.getElementById('chatInput');
    if (!input) return;
    
    var message = input.value.trim();
    if (!message) return;
    
    PartyService.sendMessage(partyId, message).then(function() {
        input.value = '';
    }).catch(function(err) {
        showToast('Fel: ' + err.message, 'error');
    });
}

// Session Scheduler Modal
function openSessionScheduler(partyId) {
    // Create modal HTML
    var modal = document.getElementById('sessionSchedulerModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sessionSchedulerModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    // Get current date/time for default values
    var now = new Date();
    var dateStr = now.toISOString().split('T')[0];
    var timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    modal.innerHTML = 
        '<div class="modal-content">' +
        '<div class="modal-header">' +
        '<h2>📅 Schemalägg Session</h2>' +
        '<button class="modal-close" onclick="closeSessionScheduler()">✕</button>' +
        '</div>' +
        '<div class="modal-body">' +
        '<form id="sessionSchedulerForm" onsubmit="saveSession(\'' + partyId + '\'); return false;">' +
        '<div class="form-group">' +
        '<label for="sessionDate">Datum</label>' +
        '<input type="date" id="sessionDate" class="creator-input" required value="' + dateStr + '">' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="sessionTime">Tid</label>' +
        '<input type="time" id="sessionTime" class="creator-input" required value="' + timeStr + '">' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="sessionLocation">Plats</label>' +
        '<input type="text" id="sessionLocation" class="creator-input" placeholder="t.ex. Eriks lägenhet">' +
        '</div>' +
        '<div class="modal-footer">' +
        '<button type="button" class="btn btn-outline" onclick="closeSessionScheduler()">Avbryt</button>' +
        '<button type="submit" class="btn btn-gold">Spara</button>' +
        '</div>' +
        '</form>' +
        '</div>' +
        '</div>';
    
    modal.classList.add('active');
}

function closeSessionScheduler() {
    var modal = document.getElementById('sessionSchedulerModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function saveSession(partyId) {
    var dateInput = document.getElementById('sessionDate');
    var timeInput = document.getElementById('sessionTime');
    var locationInput = document.getElementById('sessionLocation');
    
    if (!dateInput || !timeInput) return;
    
    var dateValue = dateInput.value;
    var timeValue = timeInput.value;
    var locationValue = locationInput ? locationInput.value : '';
    
    if (!dateValue || !timeValue) {
        showToast('Fyll i både datum och tid', 'error');
        return;
    }
    
    // Combine date and time
    var dateTime = new Date(dateValue + 'T' + timeValue);
    
    // Format for display in Swedish
    var days = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
    var months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    
    var dayName = days[dateTime.getDay()];
    var day = dateTime.getDate();
    var month = months[dateTime.getMonth()];
    var hours = dateTime.getHours().toString().padStart(2, '0');
    var minutes = dateTime.getMinutes().toString().padStart(2, '0');
    
    var formattedDate = dayName + ' ' + day + ' ' + month + ', ' + hours + ':' + minutes;
    
    // Use PartyService for consistency
    PartyService.setNextSession(partyId, formattedDate, firebase.firestore.Timestamp.fromDate(dateTime), locationValue)
        .then(function() {
            showToast('Session schemalagd!', 'success');
            closeSessionScheduler();
            // Reload party view to show new session
            viewParty(partyId);
        })
        .catch(function(err) {
            showToast('Fel: ' + err.message, 'error');
        });
}

function setAttendance(partyId, status) {
    var user = getCurrentUser();
    if (!user) {
        showToast('Du måste vara inloggad', 'error');
        return;
    }
    
    var attendeeData = {};
    attendeeData['sessionAttendees.' + user.uid] = {
        status: status,
        name: user.displayName || user.email.split('@')[0],
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    db.collection('parties').doc(partyId).update(attendeeData)
        .then(function() {
            var statusText = status === 'attending' ? 'Kommer' : (status === 'maybe' ? 'Kanske' : 'Kommer ej');
            showToast('RSVP uppdaterad: ' + statusText, 'success');
            // Reload party view to show updated attendance
            viewParty(partyId);
        })
        .catch(function(err) {
            showToast('Fel: ' + err.message, 'error');
        });
}

function addParticipantToSession(partyId) {
    var select = document.getElementById('addParticipantSelect');
    if (!select || !select.value) {
        showToast('Välj en medlem först', 'error');
        return;
    }
    
    var user = getCurrentUser();
    if (!user) {
        showToast('Du måste vara inloggad', 'error');
        return;
    }
    
    var memberId = select.value;
    
    // Get member info and add as "maybe" by default
    db.collection('users').doc(memberId).get()
        .then(function(doc) {
            var memberName = 'Okänd';
            if (doc.exists) {
                var userData = doc.data();
                memberName = userData.displayName || userData.email.split('@')[0] || 'Okänd';
            }
            
            var attendeeData = {};
            attendeeData['sessionAttendees.' + memberId] = {
                status: 'maybe',
                name: memberName,
                addedBy: user.uid,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            return db.collection('parties').doc(partyId).update(attendeeData);
        })
        .then(function() {
            showToast('Deltagare tillagd!', 'success');
            viewParty(partyId);
        })
        .catch(function(err) {
            showToast('Fel: ' + err.message, 'error');
        });
}

function savePartyNotes(partyId) {
    var notes = document.getElementById('partyNotes');
    if (!notes) return;
    
    var user = getCurrentUser();
    if (!user) {
        showToast('Du måste vara inloggad', 'error');
        return;
    }
    
    // Client-side ownership check for better UX (server-side validation in Firestore rules)
    PartyService.getParty(partyId).then(function(party) {
        if (party.ownerId !== user.uid) {
            showToast('Endast ägaren kan redigera anteckningar', 'error');
            return Promise.reject(new Error('Inte ägare'));
        }
        
        return PartyService.updateParty(partyId, { notes: notes.value });
    }).then(function() {
        showToast('Anteckningar sparade!', 'success');
    }).catch(function(err) {
        if (err.message !== 'Inte ägare') {
            showToast('Fel: ' + err.message, 'error');
        }
    });
}

// Init
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM ready');
    // Note: Navigation tab handlers are set up in auth.js via setupNavigationHandlers()
    // to ensure proper auth-aware behavior
    
    document.querySelectorAll('.modal').forEach(function(modal) {
        modal.onclick = function(e) {
            if (e.target === this) this.classList.remove('active');
        };
    });
    
    // Party form handler
    var partyForm = document.getElementById('partyForm');
    if (partyForm) {
        partyForm.onsubmit = function(e) {
            e.preventDefault();
            createParty();
        };
    }
    
    // Join group form handler
    var joinGroupForm = document.getElementById('joinGroupForm');
    if (joinGroupForm) {
        joinGroupForm.onsubmit = function(e) {
            e.preventDefault();
            searchGroupByCode();
        };
    }
    
    console.log('✅ Init complete');
});

// === Character Portrait Functions ===

function openIconBrowser() {
    var modal = document.createElement('div');
    modal.id = 'iconBrowserModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    // List of available icons
    var icons = ['Alv.gif', 'Anka.gif', 'Book.gif', 'Brew.gif', 'Campfire.gif', 'CombatAction.gif', 
                 'Dice.gif', 'Dvarg.gif', 'Enemy.gif', 'Key.gif', 'Magic.gif', 'Manniska.gif', 
                 'Map.gif', 'NewCharacter.gif', 'Quill.gif', 'Scroll.gif', 'Treasure.gif', 'Varg.gif'];
    
    var html = '<div class="modal-content" style="max-width: 600px;">' +
        '<div class="modal-header">' +
        '<h2>🖼️ Välj Ikon</h2>' +
        '<button class="modal-close" onclick="closeIconBrowser()">✕</button>' +
        '</div>' +
        '<div class="modal-body">' +
        '<div class="icon-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 0.75rem; max-height: 400px; overflow-y: auto; padding: 0.5rem;">';
    
    icons.forEach(function(iconFile) {
        html += '<div class="icon-option" onclick="selectIcon(\'' + iconFile + '\')" style="aspect-ratio: 1; display: flex; align-items: center; justify-content: center; background: var(--bg-elevated); border: 2px solid var(--border-panel); border-radius: var(--radius-md); cursor: pointer; padding: 0.5rem; transition: all 0.2s;">' +
            '<img src="icons/' + iconFile + '" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="' + iconFile + '" />' +
            '</div>';
    });
    
    html += '</div></div>' +
        '<div class="modal-footer">' +
        '<button class="btn btn-outline" onclick="closeIconBrowser()">Stäng</button>' +
        '</div>' +
        '</div>';
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

function closeIconBrowser() {
    var modal = document.getElementById('iconBrowserModal');
    if (modal) {
        modal.remove();
    }
}

function selectIcon(iconFile) {
    if (!currentCharacter) return;
    
    // Build full icon path using shared utility
    var iconPath = normalizeIconPath(iconFile);
    
    // Update character in Firestore
    CharacterService.updateCharacter(currentCharacter.id, {
        portraitUrl: iconPath,
        portraitType: 'icon'
    }).then(function() {
        currentCharacter.portraitUrl = iconPath;
        currentCharacter.portraitType = 'icon';
        showToast('Porträtt uppdaterat!', 'success');
        closeIconBrowser();
        // Refresh character sheet to show new icon
        viewCharacter(currentCharacter.id);
    }).catch(function(err) {
        console.error('Error updating portrait:', err);
        showToast('Kunde inte uppdatera porträtt', 'error');
    });
}

// Utility function for normalizing icon paths
function normalizeIconPath(iconPath) {
    return iconPath.startsWith('icons/') ? iconPath : 'icons/' + iconPath;
}

function triggerPortraitUpload() {
    var input = document.getElementById('portraitUpload');
    if (input) {
        input.click();
    }
}

// Portrait upload constants
var PORTRAIT_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
var PORTRAIT_MAX_FILE_SIZE_MB = 2; // For error messages
var PORTRAIT_MAX_WIDTH = 150;
var PORTRAIT_MAX_HEIGHT = 150;
var PORTRAIT_QUALITY = 0.7;

function handlePortraitUpload(event) {
    var file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Vänligen välj en bildfil', 'error');
        return;
    }
    
    // Validate file size
    if (file.size > PORTRAIT_MAX_FILE_SIZE) {
        showToast('Bilden är för stor. Max ' + PORTRAIT_MAX_FILE_SIZE_MB + 'MB.', 'error');
        return;
    }
    
    if (!currentCharacter) {
        showToast('Ingen karaktär vald', 'error');
        return;
    }
    
    showToast('Bearbetar bild...', 'info');
    
    var base64Image;
    
    // Compress and convert to Base64
    compressAndConvertToBase64(file, {
        maxWidth: PORTRAIT_MAX_WIDTH,
        maxHeight: PORTRAIT_MAX_HEIGHT,
        quality: PORTRAIT_QUALITY
    }).then(function(result) {
        base64Image = result;
        // Save Base64 directly to Firestore (bypasses CORS)
        return CharacterService.updateCharacter(currentCharacter.id, {
            portraitUrl: base64Image,
            portraitType: 'custom'
        });
    }).then(function() {
        currentCharacter.portraitUrl = base64Image;
        showToast('Porträtt uppladdat!', 'success');
        // Refresh character sheet to show new portrait
        viewCharacter(currentCharacter.id);
    }).catch(function(err) {
        console.error('Error uploading portrait:', err);
        showToast('Kunde inte ladda upp bilden. Försök igen.', 'error');
    });
}

function compressAndConvertToBase64(file, options) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        
        reader.onload = function(e) {
            var img = new Image();
            
            img.onload = function() {
                try {
                    var canvas = document.createElement('canvas');
                    var width = img.width;
                    var height = img.height;
                    
                    // Calculate new dimensions (maintain aspect ratio)
                    if (width > height) {
                        if (width > options.maxWidth) {
                            height = Math.round((height * options.maxWidth) / width);
                            width = options.maxWidth;
                        }
                    } else {
                        if (height > options.maxHeight) {
                            width = Math.round((width * options.maxHeight) / height);
                            height = options.maxHeight;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to Base64 JPEG
                    var base64 = canvas.toDataURL('image/jpeg', options.quality);
                    resolve(base64);
                    
                } catch (err) {
                    reject(err);
                }
            };
            
            img.onerror = function() { 
                reject(new Error('Failed to load image')); 
            };
            img.src = e.target.result;
        };
        
        reader.onerror = function() { 
            reject(new Error('Failed to read file')); 
        };
        reader.readAsDataURL(file);
    });
}

// Legacy compressImage function - keeping for backward compatibility if needed elsewhere
function compressImage(file, options) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var width = img.width;
                var height = img.height;
                
                // Scale down if needed
                if (width > options.maxWidth) {
                    height = (height * options.maxWidth) / width;
                    width = options.maxWidth;
                }
                if (height > options.maxHeight) {
                    width = (width * options.maxHeight) / height;
                    height = options.maxHeight;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(function(blob) {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to compress image'));
                    }
                }, 'image/jpeg', options.quality);
            };
            img.onerror = function() {
                reject(new Error('Failed to load image'));
            };
            img.src = e.target.result;
        };
        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
    });
}

// Delete Character Function
function confirmDeleteCharacter(characterId, characterName) {
    // confirm() displays plain text, no HTML/JS escaping needed
    // characterName is already safely passed via JSON.stringify in onclick
    var confirmed = confirm('Är du säker på att du vill radera "' + characterName + '"? Detta kan inte ångras.');
    
    if (confirmed) {
        // Additional safety confirmation
        var doubleConfirm = confirm('Sista varningen! Radera "' + characterName + '" permanent?');
        
        if (doubleConfirm) {
            showToast('Raderar karaktär...', 'info');
            
            CharacterService.deleteCharacter(characterId).then(function() {
                showToast('Karaktär raderad', 'success');
                // Navigate back to characters list
                closeCharacterSheet();
                loadCharactersList();
            }).catch(function(error) {
                console.error('Error deleting character:', error);
                showToast('Kunde inte radera karaktären. Försök igen.', 'error');
            });
        }
    }
}

console.log('✅ app.js finished');
