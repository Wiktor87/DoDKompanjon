// DoD Companion - Main App
console.log('🚀 app.js loaded');

var currentCharacter = null;

// Use emoji fallbacks if icons.js not loaded, otherwise will be replaced
function getKinIcon(kin) {
    if (typeof getIconSVG !== 'undefined') {
        return getIconSVG('kin', kin) || getIconSVG('kin', 'default');
    }
    var fallback = {
        'Människa': '👤', 'Alv': '🧝', 'Dvärg': '🧔',
        'Halvling': '🧒', 'Anka': '🦆', 'Vargfolk': '🐺', 'default': '⚔️'
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

// Navigation
function showSection(sectionId) {
    console.log('📍 showSection:', sectionId);
    document.querySelectorAll('.nav-tab').forEach(function(t) { t.classList.remove('active'); });
    var tab = document.querySelector('.nav-tab[data-section="' + sectionId + '"]');
    if (tab) tab.classList.add('active');
    document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
    var section = document.getElementById(sectionId);
    if (section) section.classList.add('active');
    if (sectionId === 'characters') loadCharactersList();
}

function goToLanding() {
    console.log('🏠 goToLanding');
    // Don't logout - just go to home section if logged in
    if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
        showSection('home');
    } else {
        document.getElementById('app').classList.add('hidden');
        document.getElementById('landingPage').classList.remove('hidden');
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

function openCreateCampaign() {
    showToast('Kampanjfunktionen kommer snart!', 'info');
}

// Dashboard
function loadDashboard() {
    console.log('📊 loadDashboard');
    if (typeof getCurrentUser === 'function') {
        var user = getCurrentUser();
        if (user) {
            var name = user.displayName || user.email.split('@')[0];
            var el = document.getElementById('welcomeName');
            if (el) el.textContent = name;
        }
    }
    var container = document.getElementById('homeCharacters');
    if (!container) return;
    
    if (typeof CharacterService === 'undefined') {
        container.innerHTML = '<div class="activity-empty"><p>Laddar...</p></div>';
        return;
    }
    
    CharacterService.getUserCharacters().then(function(characters) {
        console.log('Got characters:', characters.length);
        if (characters.length === 0) {
            container.innerHTML = '<div class="activity-empty"><p>Inga karaktärer ännu.</p><button class="btn btn-gold btn-sm" onclick="openCharacterCreator()">Skapa din första</button></div>';
        } else {
            container.innerHTML = characters.slice(0, 4).map(renderCharacterCardCompact).join('');
        }
    }).catch(function(err) {
        console.error('Error:', err);
        container.innerHTML = '<div class="activity-empty"><p>Fel: ' + err.message + '</p></div>';
    });
}

function renderCharacterCardCompact(char) {
    var icon = getKinIcon(char.kin);
    var subtitle = [char.kin, char.profession].filter(Boolean).join(' ');
    var kp = char.currentKP || (char.attributes && char.attributes.FYS) || '?';
    var vp = char.currentVP || (char.attributes && char.attributes.PSY) || '?';
    return '<div class="character-card" onclick="viewCharacter(\'' + char.id + '\')">' +
        '<div class="char-portrait">' + icon + '</div>' +
        '<div class="char-info"><div class="char-name">' + (char.name || 'Namnlös') + '</div>' +
        '<div class="char-subtitle">' + (subtitle || 'Okänd') + '</div>' +
        '<div class="char-stats">' +
        '<div class="char-stat"><span>❤️</span><span>' + kp + '</span><span>KP</span></div>' +
        '<div class="char-stat"><span>💜</span><span>' + vp + '</span><span>VP</span></div>' +
        '</div></div></div>';
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
            container.innerHTML = characters.map(renderCharacterCardFull).join('');
        }
    }).catch(function(err) {
        container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>Fel</h3><p>' + err.message + '</p></div>';
    });
}

function renderCharacterCardFull(char) {
    var icon = getKinIcon(char.kin);
    var profIcon = PROFESSION_ICONS[char.profession] || PROFESSION_ICONS.default;
    var attrs = char.attributes || {};
    return '<div class="character-card-full" onclick="viewCharacter(\'' + char.id + '\')">' +
        '<div class="card-header"><div class="card-portrait">' + icon + '</div>' +
        '<div class="card-identity"><div class="card-name">' + (char.name || 'Namnlös') + '</div>' +
        '<div class="card-subtitle">' + [char.kin, char.profession].filter(Boolean).join(' ') + '</div></div></div>' +
        '<div class="card-body"><div class="card-stats-grid">' +
        ['STY','FYS','SMI','INT','PSY'].map(function(a) {
            return '<div class="stat-box"><div class="stat-name">' + a + '</div><div class="stat-value">' + (attrs[a] || '—') + '</div></div>';
        }).join('') + '</div>' +
        '<div class="card-derived">' +
        '<div class="derived-stat"><div class="derived-label">KP</div><div class="derived-value hp">' + (attrs.FYS || '?') + '</div></div>' +
        '<div class="derived-stat"><div class="derived-label">VP</div><div class="derived-value wp">' + (attrs.PSY || '?') + '</div></div>' +
        '<div class="derived-stat"><div class="derived-label">Förfl.</div><div class="derived-value mv">10</div></div>' +
        '</div></div>' +
        '<div class="card-footer"><span>' + profIcon + ' ' + (char.heroicAbility || '—') + '</span>' +
        '<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();deleteCharacter(\'' + char.id + '\')">🗑️</button></div></div>';
}

// View Character
function viewCharacter(id) {
    console.log('👁️ viewCharacter:', id);
    var modal = document.getElementById('characterSheetModal');
    var container = document.getElementById('characterSheetContainer');
    if (!modal || !container) return;
    
    modal.classList.add('active');
    container.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div><p>Laddar...</p></div>';
    
    CharacterService.getCharacter(id).then(function(char) {
        currentCharacter = char;
        container.innerHTML = renderFullCharacterSheet(char);
    }).catch(function(err) {
        container.innerHTML = '<div class="empty-state"><h3>Fel</h3><p>' + err.message + '</p><button class="btn btn-outline" onclick="closeModal(\'characterSheetModal\')">Stäng</button></div>';
    });
}

function renderFullCharacterSheet(char) {
    var icon = getKinIcon(char.kin);
    var attrs = char.attributes || {};
    var skills = char.skills || {};
    var weaponSkills = char.weaponSkills || {};
    var inventory = char.inventory || [];
    var currency = char.currency || { guld: 0, silver: 0, brons: 0 };
    var maxKp = attrs.FYS || 0;
    var maxVp = attrs.PSY || 0;
    var currentKp = char.currentKP || maxKp;
    var currentVp = char.currentVP || maxVp;
    var kpPercent = maxKp > 0 ? (currentKp / maxKp * 100) : 0;
    var vpPercent = maxVp > 0 ? (currentVp / maxVp * 100) : 0;
    
    // Calculate secondary attributes
    var movement = char.movement || 10;
    var damageBonus = Math.floor((attrs.STY || 10) / 5) - 2;
    
    return '<div class="character-sheet-full">' +
        '<div class="sheet-header-full">' +
        '<div class="sheet-portrait-large">' + icon + '</div>' +
        '<div class="sheet-header-info">' +
        '<input type="text" class="sheet-name-input" value="' + (char.name || '') + '" data-field="name">' +
        '<div class="sheet-subtitle-row">' + [char.kin, char.profession, char.age].filter(Boolean).join(' • ') + '</div>' +
        '<div class="sheet-hp-vp-bar">' +
        '<div class="hp-vp-progress-bar">' +
        '<div class="progress-label"><span class="progress-label-text">❤️ Kroppspoäng (KP)</span>' +
        '<div class="progress-bar-input-group">' +
        '<input type="number" class="progress-bar-input" value="' + currentKp + '" data-field="currentKP" onchange="updateProgressBar(this, ' + maxKp + ')"> / ' + maxKp +
        '</div></div>' +
        '<div class="progress-bar-track"><div class="progress-bar-fill hp" style="width: ' + kpPercent + '%"></div></div>' +
        '</div>' +
        '<div class="hp-vp-progress-bar">' +
        '<div class="progress-label"><span class="progress-label-text">💜 Viljepoenäng (VP)</span>' +
        '<div class="progress-bar-input-group">' +
        '<input type="number" class="progress-bar-input" value="' + currentVp + '" data-field="currentVP" onchange="updateProgressBar(this, ' + maxVp + ')"> / ' + maxVp +
        '</div></div>' +
        '<div class="progress-bar-track"><div class="progress-bar-fill vp" style="width: ' + vpPercent + '%"></div></div>' +
        '</div>' +
        '</div></div>' +
        '<div class="sheet-header-actions"><button class="btn btn-gold" onclick="saveCharacter()">💾 Spara</button></div></div>' +
        '<div class="sheet-tabs">' +
        '<button class="sheet-tab active" onclick="switchSheetTab(this, \'overview\')">Översikt</button>' +
        '<button class="sheet-tab" onclick="switchSheetTab(this, \'abilities\')">Egenskaper</button>' +
        '<button class="sheet-tab" onclick="switchSheetTab(this, \'skills\')">Färdigheter</button>' +
        '<button class="sheet-tab" onclick="switchSheetTab(this, \'combat\')">Strid</button>' +
        '<button class="sheet-tab" onclick="switchSheetTab(this, \'equipment\')">Utrustning</button>' +
        '<button class="sheet-tab" onclick="switchSheetTab(this, \'personal\')">Personligt</button>' +
        '<button class="sheet-tab" onclick="switchSheetTab(this, \'notes\')">Anteckningar</button>' +
        '</div>' +
        '<div class="sheet-tab-content active" id="tab-overview">' +
        '<div class="sheet-body-grid">' +
        '<div class="sheet-column">' +
        '<div class="sheet-panel"><h3 class="panel-title">Grundegenskaper</h3><div class="attrs-grid">' +
        ['STY','FYS','SMI','INT','PSY','KAR'].map(function(a) {
            return '<div class="attr-item"><span class="attr-label">' + a + '</span><input type="number" class="attr-input" value="' + (attrs[a] || 10) + '" data-attr="' + a + '"></div>';
        }).join('') + '</div></div>' +
        '<div class="sheet-panel"><h3 class="panel-title">Sekundära Egenskaper</h3>' +
        '<div style="padding: 0.5rem;">' +
        '<div class="skill-row"><span class="skill-name">Förflyttning (FÖR)</span><input type="number" class="skill-input" value="' + movement + '" data-field="movement"></div>' +
        '<div class="skill-row"><span class="skill-name">Skadebonus</span><input type="text" class="skill-input" value="' + (damageBonus >= 0 ? '+' + damageBonus : damageBonus) + '" readonly></div>' +
        '</div></div>' +
        '<div class="sheet-panel"><h3 class="panel-title">Poäng</h3>' +
        '<div style="padding: 0.5rem;">' +
        '<div class="skill-row"><span class="skill-name">Erfarenhetspoäng (EP)</span><input type="number" class="skill-input" value="' + (char.experiencePoints || 0) + '" data-field="experiencePoints"></div>' +
        '<div class="skill-row"><span class="skill-name">Hjältepoäng</span><input type="number" class="skill-input" value="' + (char.heroPoints || 0) + '" data-field="heroPoints"></div>' +
        '</div></div>' +
        '<div class="sheet-panel"><h3 class="panel-title">Specialförmågor</h3>' +
        '<div style="padding: 0.5rem;"><p><strong>Hjälteförmåga:</strong> ' + (char.heroicAbility || '—') + '</p></div>' +
        '</div></div>' +
        '<div class="sheet-column">' +
        '<div class="sheet-panel"><h3 class="panel-title">Rustning & Skydd</h3>' +
        '<div style="padding: 0.5rem;">' +
        '<div class="skill-row"><span class="skill-name">Rustning</span><input type="text" class="item-name-input" value="' + (char.armor || '') + '" data-field="armor"></div>' +
        '<div class="skill-row"><span class="skill-name">Hjälm</span><input type="text" class="item-name-input" value="' + (char.helmet || '') + '" data-field="helmet"></div>' +
        '</div></div>' +
        '<div class="sheet-panel"><h3 class="panel-title">Mynt</h3><div class="currency-grid">' +
        '<div class="currency-item"><span>🥇 Guldmynt (GM)</span><input type="number" class="currency-input" value="' + (currency.guld || 0) + '" data-currency="guld"></div>' +
        '<div class="currency-item"><span>🥈 Silvermynt (SM)</span><input type="number" class="currency-input" value="' + (currency.silver || 0) + '" data-currency="silver"></div>' +
        '<div class="currency-item"><span>🥉 Kopparmynt (KM)</span><input type="number" class="currency-input" value="' + (currency.brons || 0) + '" data-currency="brons"></div>' +
        '</div></div>' +
        '</div></div></div>' +
        '<div class="sheet-tab-content" id="tab-abilities">' +
        '<div class="sheet-body-grid"><div class="sheet-column" style="grid-column: 1/-1;">' +
        '<div class="sheet-panel"><h3 class="panel-title">Grundegenskaper</h3><div class="attrs-grid">' +
        ['STY','FYS','SMI','INT','PSY','KAR'].map(function(a) {
            return '<div class="attr-item"><span class="attr-label">' + a + '</span><input type="number" class="attr-input" value="' + (attrs[a] || 10) + '" data-attr="' + a + '"></div>';
        }).join('') + '</div></div></div></div></div>' +
        '<div class="sheet-tab-content" id="tab-skills">' +
        '<div class="sheet-body-grid"><div class="sheet-column" style="grid-column: 1/-1;">' +
        '<div class="sheet-panel"><h3 class="panel-title">Färdigheter</h3>' +
        Object.keys(ALL_SKILLS).map(function(attr) {
            return '<div class="skill-group"><div class="skill-group-header">' + attr + '-baserade</div>' +
                ALL_SKILLS[attr].map(function(skill) {
                    return '<div class="skill-row"><span class="skill-name">' + skill + '</span><input type="number" class="skill-input" value="' + (skills[skill] || 0) + '" data-skill="' + skill + '"></div>';
                }).join('') + '</div>';
        }).join('') + '</div></div></div></div>' +
        '<div class="sheet-tab-content" id="tab-combat">' +
        '<div class="sheet-body-grid"><div class="sheet-column" style="grid-column: 1/-1;">' +
        '<div class="sheet-panel"><h3 class="panel-title">Vapenfärdigheter</h3>' +
        WEAPON_SKILLS.map(function(skill) {
            return '<div class="skill-row"><span class="skill-name">' + skill + '</span><input type="number" class="skill-input" value="' + (weaponSkills[skill] || 0) + '" data-weapon-skill="' + skill + '"></div>';
        }).join('') + '</div></div></div></div>' +
        '<div class="sheet-tab-content" id="tab-equipment">' +
        '<div class="sheet-body-grid"><div class="sheet-column" style="grid-column: 1/-1;">' +
        '<div class="sheet-panel"><h3 class="panel-title">Utrustning <button class="btn btn-ghost btn-xs" onclick="addInventoryItem()">+ Lägg till</button></h3>' +
        '<div id="inventoryList">' + (inventory.length === 0 ? '<div class="empty-inventory">Ingen utrustning ännu. Klicka "+ Lägg till" för att lägga till föremål.</div>' : 
            inventory.map(function(item, i) {
                var name = typeof item === 'string' ? item : (item.name || '');
                return '<div class="inventory-item"><input type="text" class="item-name-input" value="' + name + '" placeholder="Föremålsnamn"><button class="btn-icon-sm" onclick="this.parentElement.remove()">×</button></div>';
            }).join('')) + '</div></div></div></div></div>' +
        '<div class="sheet-tab-content" id="tab-personal">' +
        '<div class="sheet-body-grid">' +
        '<div class="sheet-column">' +
        '<div class="sheet-panel"><h3 class="panel-title">Personliga Uppgifter</h3>' +
        '<div style="padding: 0.5rem;">' +
        '<div class="skill-row"><span class="skill-name">Spelarens namn</span><input type="text" class="item-name-input" value="' + (char.playerName || '') + '" data-field="playerName" placeholder="Ditt namn"></div>' +
        '<div class="skill-row"><span class="skill-name">Ålder</span><input type="text" class="item-name-input" value="' + (char.characterAge || '') + '" data-field="characterAge" placeholder="t.ex. 25 år"></div>' +
        '<div class="skill-row"><span class="skill-name">Kön</span><input type="text" class="item-name-input" value="' + (char.gender || '') + '" data-field="gender"></div>' +
        '<div class="skill-row"><span class="skill-name">Längd</span><input type="text" class="item-name-input" value="' + (char.height || '') + '" data-field="height" placeholder="t.ex. 180 cm"></div>' +
        '<div class="skill-row"><span class="skill-name">Vikt</span><input type="text" class="item-name-input" value="' + (char.weight || '') + '" data-field="weight" placeholder="t.ex. 75 kg"></div>' +
        '</div></div>' +
        '</div>' +
        '<div class="sheet-column">' +
        '<div class="sheet-panel"><h3 class="panel-title">Utseende</h3>' +
        '<textarea class="bio-textarea" data-field="appearance" placeholder="Beskriv karaktärens utseende...">' + (char.appearance || '') + '</textarea></div>' +
        '<div class="sheet-panel"><h3 class="panel-title">Nackdelar</h3>' +
        '<textarea class="bio-textarea" data-field="disadvantages" placeholder="Lista karaktärens nackdelar...">' + (char.disadvantages || '') + '</textarea></div>' +
        '</div></div></div>' +
        '<div class="sheet-tab-content" id="tab-notes">' +
        '<div class="sheet-body-grid"><div class="sheet-column" style="grid-column: 1/-1;">' +
        '<div class="sheet-panel"><h3 class="panel-title">Bakgrund</h3><textarea class="bio-textarea" data-field="background" placeholder="Beskriv karaktärens bakgrund...">' + (char.background || '') + '</textarea></div>' +
        '<div class="sheet-panel"><h3 class="panel-title">Anteckningar</h3><textarea class="bio-textarea" data-field="notes" placeholder="Allmänna anteckningar...">' + (char.notes || '') + '</textarea></div>' +
        '</div></div></div>' +
        '</div>';
}

// Inventory
function addInventoryItem() {
    var list = document.getElementById('inventoryList');
    if (!list) return;
    var empty = list.querySelector('.empty-inventory');
    if (empty) empty.remove();
    var div = document.createElement('div');
    div.className = 'inventory-item';
    div.innerHTML = '<input type="text" class="item-name-input" placeholder="Nytt föremål"><button class="btn-icon-sm" onclick="this.parentElement.remove()">×</button>';
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
        name: (document.querySelector('[data-field="name"]') || {}).value || '',
        currentKP: parseInt((document.querySelector('[data-field="currentKP"]') || {}).value) || 0,
        currentVP: parseInt((document.querySelector('[data-field="currentVP"]') || {}).value) || 0,
        movement: parseInt((document.querySelector('[data-field="movement"]') || {}).value) || 10,
        experiencePoints: parseInt((document.querySelector('[data-field="experiencePoints"]') || {}).value) || 0,
        heroPoints: parseInt((document.querySelector('[data-field="heroPoints"]') || {}).value) || 0,
        armor: (document.querySelector('[data-field="armor"]') || {}).value || '',
        helmet: (document.querySelector('[data-field="helmet"]') || {}).value || '',
        playerName: (document.querySelector('[data-field="playerName"]') || {}).value || '',
        characterAge: (document.querySelector('[data-field="characterAge"]') || {}).value || '',
        gender: (document.querySelector('[data-field="gender"]') || {}).value || '',
        height: (document.querySelector('[data-field="height"]') || {}).value || '',
        weight: (document.querySelector('[data-field="weight"]') || {}).value || '',
        appearance: (document.querySelector('[data-field="appearance"]') || {}).value || '',
        disadvantages: (document.querySelector('[data-field="disadvantages"]') || {}).value || '',
        background: (document.querySelector('[data-field="background"]') || {}).value || '',
        notes: (document.querySelector('[data-field="notes"]') || {}).value || ''
    };
    updates.attributes = {};
    document.querySelectorAll('[data-attr]').forEach(function(el) {
        updates.attributes[el.dataset.attr] = parseInt(el.value) || 10;
    });
    updates.skills = {};
    document.querySelectorAll('[data-skill]').forEach(function(el) {
        var v = parseInt(el.value) || 0;
        if (v > 0) updates.skills[el.dataset.skill] = v;
    });
    updates.weaponSkills = {};
    document.querySelectorAll('[data-weapon-skill]').forEach(function(el) {
        var v = parseInt(el.value) || 0;
        if (v > 0) updates.weaponSkills[el.dataset.weaponSkill] = v;
    });
    updates.inventory = [];
    document.querySelectorAll('.inventory-item .item-name-input').forEach(function(el) {
        if (el.value.trim()) updates.inventory.push({ name: el.value.trim() });
    });
    updates.currency = {
        guld: parseInt((document.querySelector('[data-currency="guld"]') || {}).value) || 0,
        silver: parseInt((document.querySelector('[data-currency="silver"]') || {}).value) || 0,
        brons: parseInt((document.querySelector('[data-currency="brons"]') || {}).value) || 0
    };
    CharacterService.updateCharacter(currentCharacter.id, updates).then(function() {
        showToast('Sparad!', 'success');
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

// Init
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM ready');
    document.querySelectorAll('.nav-tab').forEach(function(tab) {
        tab.onclick = function(e) {
            e.preventDefault();
            showSection(this.getAttribute('data-section'));
        };
    });
    document.querySelectorAll('.modal').forEach(function(modal) {
        modal.onclick = function(e) {
            if (e.target === this) this.classList.remove('active');
        };
    });
    console.log('✅ Init complete');
});

console.log('✅ app.js finished');
