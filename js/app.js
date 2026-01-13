// DoD Companion - Main App
console.log('🚀 app.js loaded');

var currentCharacter = null;

// Game constants
var DAMAGE_BONUS_DIVISOR = 5;
var DAMAGE_BONUS_BASE = -2;

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
    if (sectionId === 'parties') loadPartiesList();
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
    return '<div class="character-card">' +
        '<div class="char-portrait" onclick="viewCharacter(\'' + char.id + '\')">' + icon + '</div>' +
        '<div class="char-info" onclick="viewCharacter(\'' + char.id + '\')" style="flex: 1; cursor: pointer;"><div class="char-name">' + (char.name || 'Namnlös') + '</div>' +
        '<div class="char-subtitle">' + (subtitle || 'Okänd') + '</div>' +
        '<div class="char-stats">' +
        '<div class="char-stat"><span>❤️</span><span>' + kp + '</span><span>KP</span></div>' +
        '<div class="char-stat"><span>💜</span><span>' + vp + '</span><span>VP</span></div>' +
        '</div></div>' +
        '<button class="btn btn-ghost btn-xs" onclick="event.stopPropagation();openAddToGroupModal(\'' + char.id + '\')">👥</button>' +
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
        '<div class="card-footer" style="cursor: default;"><span>' + profIcon + ' ' + (char.heroicAbility || '—') + '</span>' +
        '<div style="display: flex; gap: 0.5rem;">' +
        '<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openAddToGroupModal(\'' + char.id + '\')">👥 Lägg till i grupp</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();deleteCharacter(\'' + char.id + '\')">🗑️</button>' +
        '</div></div></div>';
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
    }).catch(function(err) {
        console.error('Failed to load character:', err);
        container.innerHTML = '<div class="empty-state"><h3>Fel</h3><p>Kunde inte ladda karaktären. Försök igen.</p><button class="btn btn-outline" onclick="closeCharacterSheet()">Stäng</button></div>';
    });
}

function closeCharacterSheet() {
    showSection('characters');
    currentCharacter = null;
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
    var damageBonus = Math.floor((attrs.STY || 10) / DAMAGE_BONUS_DIVISOR) + DAMAGE_BONUS_BASE;
    
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
        '<div class="progress-label"><span class="progress-label-text">💜 Viljepoäng (VP)</span>' +
        '<div class="progress-bar-input-group">' +
        '<input type="number" class="progress-bar-input" value="' + currentVp + '" data-field="currentVP" onchange="updateProgressBar(this, ' + maxVp + ')"> / ' + maxVp +
        '</div></div>' +
        '<div class="progress-bar-track"><div class="progress-bar-fill vp" style="width: ' + vpPercent + '%"></div></div>' +
        '</div>' +
        '</div></div>' +
        '<div class="sheet-header-actions">' +
        '<button class="btn btn-ghost" onclick="openAddToGroupModal(\'' + char.id + '\')">👥 Lägg till i grupp</button>' +
        '<button class="btn btn-gold" onclick="saveCharacter()">💾 Spara</button>' +
        '</div></div>' +
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
        '<div class="skill-row"><span class="skill-name">Rustning (Typ)</span><input type="text" class="item-name-input" value="' + (char.armor || '') + '" data-field="armor" placeholder="t.ex. Läderharnesk"></div>' +
        '<div class="skill-row"><span class="skill-name">Skyddsvärde</span><input type="number" class="skill-input" value="' + (char.armorProtection || 0) + '" data-field="armorProtection"></div>' +
        '<div class="skill-row"><span class="skill-name">Rustning Nackdelar</span><input type="text" class="item-name-input" value="' + (char.armorDisadvantages || '') + '" data-field="armorDisadvantages" placeholder="t.ex. -1 SMI"></div>' +
        '<div class="skill-row"><span class="skill-name">Hjälm (Typ)</span><input type="text" class="item-name-input" value="' + (char.helmet || '') + '" data-field="helmet" placeholder="t.ex. Järnhjälm"></div>' +
        '<div class="skill-row"><span class="skill-name">Hjälm Skyddsvärde</span><input type="number" class="skill-input" value="' + (char.helmetProtection || 0) + '" data-field="helmetProtection"></div>' +
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
        '<div class="sheet-panel"><h3 class="panel-title">Utrustning <button class="btn btn-ghost btn-xs" onclick="addInventoryItem()" aria-label="Lägg till nytt föremål i utrustning">+ Lägg till</button></h3>' +
        '<div id="inventoryList">' + (inventory.length === 0 ? '<div class="empty-inventory">Ingen utrustning ännu. Klicka "+ Lägg till" för att lägga till föremål.</div>' : 
            inventory.map(function(item, i) {
                var itemData = typeof item === 'string' ? { name: item, type: '', weight: '', notes: '' } : item;
                return '<div class="inventory-item-full">' +
                    '<div class="inv-row"><label>Namn:</label><input type="text" class="inv-input" value="' + (itemData.name || '') + '" placeholder="Föremålsnamn" data-inv-field="name"></div>' +
                    '<div class="inv-row"><label>Typ:</label><select class="inv-select" data-inv-field="type">' +
                    '<option value="" ' + (!itemData.type ? 'selected' : '') + '>Välj typ</option>' +
                    '<option value="Vapen" ' + (itemData.type === 'Vapen' ? 'selected' : '') + '>Vapen</option>' +
                    '<option value="Rustning" ' + (itemData.type === 'Rustning' ? 'selected' : '') + '>Rustning</option>' +
                    '<option value="Övrigt" ' + (itemData.type === 'Övrigt' ? 'selected' : '') + '>Övrigt</option>' +
                    '</select></div>' +
                    '<div class="inv-row"><label>Vikt:</label><input type="text" class="inv-input-sm" value="' + (itemData.weight || '') + '" placeholder="t.ex. 2 kg" data-inv-field="weight"></div>' +
                    '<div class="inv-row"><label>Anteckningar:</label><input type="text" class="inv-input" value="' + (itemData.notes || '') + '" placeholder="Beskrivning" data-inv-field="notes"></div>' +
                    '<button class="btn-icon-sm btn-delete" onclick="this.parentElement.remove()">🗑️</button>' +
                    '</div>';
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
        name: (document.querySelector('[data-field="name"]') || {}).value || '',
        currentKP: parseInt((document.querySelector('[data-field="currentKP"]') || {}).value) || 0,
        currentVP: parseInt((document.querySelector('[data-field="currentVP"]') || {}).value) || 0,
        movement: parseInt((document.querySelector('[data-field="movement"]') || {}).value) || 10,
        experiencePoints: parseInt((document.querySelector('[data-field="experiencePoints"]') || {}).value) || 0,
        heroPoints: parseInt((document.querySelector('[data-field="heroPoints"]') || {}).value) || 0,
        armor: (document.querySelector('[data-field="armor"]') || {}).value || '',
        armorProtection: parseInt((document.querySelector('[data-field="armorProtection"]') || {}).value) || 0,
        armorDisadvantages: (document.querySelector('[data-field="armorDisadvantages"]') || {}).value || '',
        helmet: (document.querySelector('[data-field="helmet"]') || {}).value || '',
        helmetProtection: parseInt((document.querySelector('[data-field="helmetProtection"]') || {}).value) || 0,
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
    document.querySelectorAll('.inventory-item-full').forEach(function(el) {
        var item = {
            name: (el.querySelector('[data-inv-field="name"]') || {}).value || '',
            type: (el.querySelector('[data-inv-field="type"]') || {}).value || '',
            weight: (el.querySelector('[data-inv-field="weight"]') || {}).value || '',
            notes: (el.querySelector('[data-inv-field="notes"]') || {}).value || ''
        };
        if (item.name.trim()) updates.inventory.push(item);
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
            container.innerHTML = parties.map(renderPartyCard).join('');
        }
    }).catch(function(err) {
        container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>Fel</h3><p>' + err.message + '</p></div>';
    });
}

function renderPartyCard(party) {
    var memberCount = (party.memberIds || []).length;
    var charCount = (party.characterIds || []).length;
    
    return '<div class="character-card-full" onclick="viewParty(\'' + party.id + '\')">' +
        '<div class="card-header">' +
        '<div class="card-portrait">👥</div>' +
        '<div class="card-identity">' +
        '<div class="card-name">' + (party.name || 'Namnlös grupp') + '</div>' +
        '<div class="card-subtitle">Ägare: ' + (party.ownerName || 'Okänd') + '</div>' +
        '</div></div>' +
        '<div class="card-body">' +
        '<p style="color: var(--text-secondary); margin-bottom: 0.5rem;">' + (party.description || 'Ingen beskrivning') + '</p>' +
        '<div style="display: flex; gap: 1rem; font-size: 0.875rem; color: var(--text-muted);">' +
        '<span>👤 ' + memberCount + ' medlem' + (memberCount !== 1 ? 'mar' : '') + '</span>' +
        '<span>🎭 ' + charCount + ' karaktär' + (charCount !== 1 ? 'er' : '') + '</span>' +
        '</div></div>' +
        '<div class="card-footer">' +
        '<span></span>' +
        '<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();deleteParty(\'' + party.id + '\')">🗑️</button>' +
        '</div></div>';
}

function viewParty(id) {
    console.log('👁️ viewParty:', id);
    var container = document.getElementById('partyViewContainer');
    if (!container) return;
    
    // Switch to party view section
    showSection('partyView');
    container.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div><p>Laddar...</p></div>';
    
    var user = getCurrentUser();
    var isOwner = false;
    
    PartyService.getParty(id).then(function(party) {
        isOwner = user && party.ownerId === user.uid;
        
        var promises = [
            Promise.resolve(party),
            CharacterService.getUserCharacters()
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
            promises.push(Promise.resolve([]));
        }
        
        // Load messages
        promises.push(PartyService.getMessages(id));
        
        return Promise.all(promises);
    }).then(function(results) {
        var party = results[0];
        var allChars = results[1];
        var joinRequests = results[2] || [];
        var messages = results[3] || [];
        
        // Filter characters that are in this party
        var partyChars = allChars.filter(function(char) {
            return (party.characterIds || []).indexOf(char.id) !== -1;
        });
        
        // Characters not in party
        var availableChars = allChars.filter(function(char) {
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
        container.innerHTML = '<div class="empty-state"><h3>Fel</h3><p>' + err.message + '</p></div>';
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
        '<div>' +
        '<h1 style="font-family: var(--font-display); margin-bottom: 0.5rem;">' + party.name + '</h1>' +
        '<p style="color: var(--text-secondary); margin-bottom: 0.5rem;">' + (party.description || 'Ingen beskrivning') + '</p>' +
        '</div>' +
        '<div style="text-align: right;">' +
        '<div style="background: var(--bg-elevated); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 2px solid var(--accent-gold); margin-bottom: 0.5rem;">' +
        '<div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem; text-transform: uppercase;">Inbjudningskod</div>' +
        '<div style="display: flex; align-items: center; gap: 0.5rem;">' +
        '<code style="font-size: 1.25rem; font-weight: 700; color: var(--accent-gold); letter-spacing: 0.1em;">' + (party.inviteCode || '------') + '</code>' +
        '<button class="btn btn-ghost btn-xs" onclick="copyInviteCode(\'' + (party.inviteCode || '') + '\')">📋 Kopiera</button>' +
        '</div></div>' +
        '</div></div>';
    
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
    // Add character to party
    PartyService.addCharacterToParty(partyId, characterId).then(function() {
        // Update request status
        return db.collection('joinRequests').doc(requestId).update({
            status: 'accepted',
            processedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }).then(function() {
        showToast('Karaktär godkänd och tillagd!', 'success');
        viewParty(partyId); // Refresh view
    }).catch(function(err) {
        showToast('Fel: ' + err.message, 'error');
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
    var code = document.getElementById('groupInviteCode').value;
    var container = document.getElementById('foundGroupContainer');
    
    if (!code || !code.trim()) {
        showToast('Ange en inbjudningskod', 'error');
        return;
    }
    
    container.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div><p>Söker...</p></div>';
    
    PartyService.searchPartyByCode(code).then(function(party) {
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

console.log('✅ app.js finished');
