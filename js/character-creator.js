// Character Creator
var creatorData = {
    step: 1,
    name: '',
    kin: null,
    profession: null,
    age: null,
    attributes: { STY: 10, FYS: 10, SMI: 10, INT: 10, PSY: 10, KAR: 10 },
    kinAbility: '',
    heroicAbility: '',
    equipment: [],
    portraitType: 'icon',
    portraitUrl: 'icons/NewCharacter.gif'
};

// Skills with attributes (from JSX specifications)
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

// Weapon skills with attributes (from JSX specifications)
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

var KIN_DATA = {
    'Människa': { ability: 'Anpassningsbar', description: 'Du får en extra hjälteförmåga vid start.', stats: {} },
    'Alv': { ability: 'Mörkerseende', description: 'Du kan se i mörker som om det vore skymning.', stats: { INT: 2, STY: -2 } },
    'Dvärg': { ability: 'Härdad', description: 'Du får +2 på alla räddningskast mot gift.', stats: { FYS: 2, SMI: -2 } },
    'Halvling': { ability: 'Tur', description: 'En gång per dag kan du slå om ett misslyckat tärningsslag.', stats: { SMI: 2, STY: -2 } },
    'Anka': { ability: 'Simfötter', description: 'Du simmar dubbelt så snabbt och kan hålla andan dubbelt så länge.', stats: { PSY: 2, FYS: -2 } },
    'Vargfolk': { ability: 'Väderkorn', description: 'Du har +2 på alla slag för att upptäcka saker med luktsinnet.', stats: { STY: 2, INT: -2 } }
};

var PROFESSION_DATA = {
    'Bard': { ability: 'Inspirera', skills: { 'Uppträda': 10, 'Övertala': 10, 'Språk': 10 } },
    'Hantverkare': { ability: 'Mästerverk', skills: { 'Hantverk': 10, 'Bildning': 10, 'Styrkeprov': 10 } },
    'Jägare': { ability: 'Spårare', skills: { 'Djur & Natur': 10, 'Smyga': 10, 'Upptäcka': 10 } },
    'Krigare': { ability: 'Vapenmästare', skills: { 'Närkamp': 10, 'Styrkeprov': 10, 'Simma & Dyka': 10 } },
    'Lärd': { ability: 'Kunskapsbank', skills: { 'Bildning': 10, 'Språk': 10, 'Läkekonst': 10 } },
    'Magiker': { ability: 'Trollkonst', skills: { 'Bildning': 10, 'Upptäcka': 10, 'Genomskåda': 10 } },
    'Nasare': { ability: 'Lönnmord', skills: { 'Smyga': 10, 'Fingerfärdighet': 10, 'Undvika': 10 } },
    'Riddare': { ability: 'Beskyddare', skills: { 'Närkamp': 10, 'Rida': 10, 'Övertala': 10 } },
    'Sjöfarare': { ability: 'Sjöben', skills: { 'Simma & Dyka': 10, 'Styrkeprov': 10, 'Hantverk': 10 } },
    'Tjuv': { ability: 'Smidig', skills: { 'Fingerfärdighet': 10, 'Smyga': 10, 'Undvika': 10 } }
};

var AGE_DATA = {
    'Ung': { mod: { base: -1 }, resources: 'D6' },
    'Medelålders': { mod: {}, resources: 'D10' },
    'Gammal': { mod: { base: 1 }, resources: 'D8' }
};

function showCharacterCreator() {
    creatorData = {
        step: 1, name: '', kin: null, profession: null, age: null,
        attributes: { STY: 10, FYS: 10, SMI: 10, INT: 10, PSY: 10, KAR: 10 },
        kinAbility: '', heroicAbility: '', equipment: [],
        portraitType: 'icon', portraitUrl: 'icons/NewCharacter.gif'
    };
    renderCreatorStep();
}

function renderCreatorStep() {
    var container = document.getElementById('creatorContent');
    if (!container) return;
    
    var html = '';
    switch(creatorData.step) {
        case 1: html = renderStep1Name(); break;
        case 2: html = renderStep2Kin(); break;
        case 3: html = renderStep3Profession(); break;
        case 4: html = renderStep4Age(); break;
        case 5: html = renderStep5Attributes(); break;
        case 6: html = renderStep6Portrait(); break;
        case 7: html = renderStep7Summary(); break;
    }
    container.innerHTML = html;
    updateCreatorProgress();
}

function updateCreatorProgress() {
    for (var i = 1; i <= 7; i++) {
        var dot = document.getElementById('step' + i);
        if (dot) {
            dot.classList.remove('active', 'completed');
            if (i < creatorData.step) dot.classList.add('completed');
            else if (i === creatorData.step) dot.classList.add('active');
        }
    }
}

function renderStep1Name() {
    return '<div class="creator-step"><h2>Vad heter din karaktär?</h2>' +
        '<input type="text" id="charName" class="creator-input" placeholder="Ange namn" value="' + (creatorData.name || '') + '">' +
        '<div class="creator-nav"><button class="btn btn-gold" onclick="nextStep()">Nästa →</button></div></div>';
}

function renderStep2Kin() {
    var html = '<div class="creator-step"><h2>Välj släkte</h2><div class="kin-grid">';
    Object.keys(KIN_DATA).forEach(function(kin) {
        var data = KIN_DATA[kin];
        var selected = creatorData.kin === kin ? ' selected' : '';
        html += '<div class="kin-card' + selected + '" onclick="selectKin(\'' + kin + '\')">' +
            '<div class="kin-name">' + kin + '</div>' +
            '<div class="kin-ability">' + data.ability + '</div></div>';
    });
    html += '</div><div class="creator-nav"><button class="btn btn-outline" onclick="prevStep()">← Tillbaka</button>' +
        '<button class="btn btn-gold" onclick="nextStep()" ' + (creatorData.kin ? '' : 'disabled') + '>Nästa →</button></div></div>';
    return html;
}

function renderStep3Profession() {
    var html = '<div class="creator-step"><h2>Välj yrke</h2><div class="profession-grid">';
    Object.keys(PROFESSION_DATA).forEach(function(prof) {
        var data = PROFESSION_DATA[prof];
        var selected = creatorData.profession === prof ? ' selected' : '';
        html += '<div class="profession-card' + selected + '" onclick="selectProfession(\'' + prof + '\')">' +
            '<div class="prof-name">' + prof + '</div>' +
            '<div class="prof-ability">' + data.ability + '</div></div>';
    });
    html += '</div><div class="creator-nav"><button class="btn btn-outline" onclick="prevStep()">← Tillbaka</button>' +
        '<button class="btn btn-gold" onclick="nextStep()" ' + (creatorData.profession ? '' : 'disabled') + '>Nästa →</button></div></div>';
    return html;
}

function renderStep4Age() {
    var html = '<div class="creator-step"><h2>Välj ålder</h2><div class="age-grid">';
    Object.keys(AGE_DATA).forEach(function(age) {
        var selected = creatorData.age === age ? ' selected' : '';
        html += '<div class="age-card' + selected + '" onclick="selectAge(\'' + age + '\')">' +
            '<div class="age-name">' + age + '</div></div>';
    });
    html += '</div><div class="creator-nav"><button class="btn btn-outline" onclick="prevStep()">← Tillbaka</button>' +
        '<button class="btn btn-gold" onclick="nextStep()" ' + (creatorData.age ? '' : 'disabled') + '>Nästa →</button></div></div>';
    return html;
}

function renderStep5Attributes() {
    var attrs = creatorData.attributes;
    var html = '<div class="creator-step"><h2>Grundegenskaper</h2>' +
        '<p>Klicka på "Slå 4T6" för att slå fram dina egenskaper.</p>' +
        '<div class="attrs-roll-grid">';
    ['STY', 'FYS', 'SMI', 'INT', 'PSY', 'KAR'].forEach(function(attr) {
        html += '<div class="attr-roll-item"><span class="attr-label">' + attr + '</span>' +
            '<span class="attr-value" id="attr' + attr + '">' + attrs[attr] + '</span>' +
            '<button class="btn btn-sm btn-outline" onclick="rollAttribute(\'' + attr + '\')">Slå 4T6</button></div>';
    });
    html += '</div><button class="btn btn-gold" onclick="rollAllAttributes()">Slå alla</button>' +
        '<div class="creator-nav"><button class="btn btn-outline" onclick="prevStep()">← Tillbaka</button>' +
        '<button class="btn btn-gold" onclick="nextStep()">Nästa →</button></div></div>';
    return html;
}

function renderStep6Portrait() {
    var availableIcons = [
        'icons/NewCharacter.gif',
        'icons/Manniska.gif',
        'icons/Alv.gif',
        'icons/Dvarg.gif',
        'icons/Anka.gif',
        'icons/Varg.gif',
        'icons/CombatAction.gif',
        'icons/Magic.gif',
        'icons/Scroll.gif',
        'icons/Enemy.gif'
    ];
    
    var html = '<div class="creator-step"><h2>Välj porträtt</h2>';
    html += '<div class="portrait-selector">';
    html += '<div class="current-portrait">';
    html += '<img src="' + creatorData.portraitUrl + '" alt="Current portrait" style="width: 128px; height: 128px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent-gold);">';
    html += '</div>';
    html += '<div class="portrait-options">';
    html += '<h3>Bläddra bland ikoner</h3>';
    html += '<div class="icon-grid">';
    
    availableIcons.forEach(function(icon) {
        var selected = creatorData.portraitUrl === icon ? ' selected' : '';
        html += '<div class="creation-icon-option icon-option' + selected + '" onclick="selectCreationIcon(\'' + icon + '\')">';
        html += '<img src="' + icon + '" alt="Icon" style="width: 64px; height: 64px;">';
        html += '</div>';
    });
    
    html += '</div>';
    html += '<p class="form-help-text" style="margin-top: 1rem;">Custom upload kommer snart!</p>';
    html += '</div>';
    html += '</div>';
    html += '<div class="creator-nav">';
    html += '<button class="btn btn-outline" onclick="prevStep()">← Tillbaka</button>';
    html += '<button class="btn btn-outline" onclick="skipIconSelection()">Hoppa över</button>';
    html += '<button class="btn btn-gold" onclick="nextStep()">Nästa →</button>';
    html += '</div></div>';
    return html;
}

function renderStep7Summary() {
    var html = '<div class="creator-step"><h2>Sammanfattning</h2>' +
        '<div class="summary-card">' +
        '<p><strong>Namn:</strong> ' + creatorData.name + '</p>' +
        '<p><strong>Släkte:</strong> ' + creatorData.kin + '</p>' +
        '<p><strong>Yrke:</strong> ' + creatorData.profession + '</p>' +
        '<p><strong>Ålder:</strong> ' + creatorData.age + '</p>' +
        '<p><strong>Egenskaper:</strong> STY ' + creatorData.attributes.STY + 
        ', FYS ' + creatorData.attributes.FYS + 
        ', SMI ' + creatorData.attributes.SMI + 
        ', INT ' + creatorData.attributes.INT + 
        ', PSY ' + creatorData.attributes.PSY + 
        ', KAR ' + creatorData.attributes.KAR + '</p></div>' +
        '<div class="creator-nav"><button class="btn btn-outline" onclick="prevStep()">← Tillbaka</button>' +
        '<button class="btn btn-gold" onclick="createCharacter()">✨ Skapa karaktär</button></div></div>';
    return html;
}

function selectCreationIcon(iconPath) {
    creatorData.portraitType = 'icon';
    creatorData.portraitUrl = iconPath;
    renderCreatorStep();
}

function skipIconSelection() {
    // Use default icon based on kin if available, otherwise use generic
    var defaultIcons = {
        'Människa': 'icons/Manniska.gif',
        'Alv': 'icons/Alv.gif',
        'Dvärg': 'icons/Dvarg.gif',
        'Halvling': 'icons/NewCharacter.gif',
        'Anka': 'icons/Anka.gif',
        'Vargfolk': 'icons/Varg.gif'
    };
    
    if (creatorData.kin && defaultIcons[creatorData.kin]) {
        creatorData.portraitUrl = defaultIcons[creatorData.kin];
    } else {
        creatorData.portraitUrl = 'icons/NewCharacter.gif';
    }
    
    creatorData.portraitType = 'icon';
    nextStep();
}

function selectKin(kin) {
    creatorData.kin = kin;
    creatorData.kinAbility = KIN_DATA[kin].ability;
    renderCreatorStep();
}

function selectProfession(prof) {
    creatorData.profession = prof;
    creatorData.heroicAbility = PROFESSION_DATA[prof].ability;
    renderCreatorStep();
}

function selectAge(age) {
    creatorData.age = age;
    renderCreatorStep();
}

function rollAttribute(attr) {
    var rolls = [];
    for (var i = 0; i < 4; i++) rolls.push(Math.floor(Math.random() * 6) + 1);
    rolls.sort(function(a, b) { return b - a; });
    var total = rolls[0] + rolls[1] + rolls[2];
    creatorData.attributes[attr] = total;
    var el = document.getElementById('attr' + attr);
    if (el) el.textContent = total;
}

function rollAllAttributes() {
    ['STY', 'FYS', 'SMI', 'INT', 'PSY', 'KAR'].forEach(rollAttribute);
}

function nextStep() {
    if (creatorData.step === 1) {
        var input = document.getElementById('charName');
        if (input) creatorData.name = input.value;
        if (!creatorData.name.trim()) {
            alert('Ange ett namn');
            return;
        }
    }
    if (creatorData.step < 7) {
        creatorData.step++;
        renderCreatorStep();
    }
}

function prevStep() {
    if (creatorData.step > 1) {
        creatorData.step--;
        renderCreatorStep();
    }
}

function createCharacter() {
    // Initialize skills with isCore property
    var skills = {};
    Object.keys(SKILLS).forEach(function(skillName) {
        skills[skillName] = {
            value: 0,
            isCore: false,
            attr: SKILLS[skillName].attr
        };
    });
    
    // Initialize weapon skills with isCore property
    var weaponSkills = {};
    Object.keys(WEAPON_SKILLS_V2).forEach(function(skillName) {
        weaponSkills[skillName] = {
            value: 0,
            isCore: false,
            attr: WEAPON_SKILLS_V2[skillName].attr
        };
    });
    
    // Initialize condition tracking for attributes
    var conditions = {
        STY: false,  // Utmattad
        FYS: false,  // Krasslig
        SMI: false,  // Omtöcknad
        INT: false,  // Arg
        PSY: false,  // Rädd
        KAR: false   // Uppgiven
    };
    
    // Initialize death saves
    var deathSaves = {
        successes: 0,
        failures: 0
    };
    
    var charData = {
        name: creatorData.name,
        kin: creatorData.kin,
        profession: creatorData.profession,
        age: creatorData.age,
        attributes: creatorData.attributes,
        conditions: conditions,
        kinAbility: creatorData.kinAbility,
        heroicAbility: creatorData.heroicAbility,
        skills: skills,
        weaponSkills: weaponSkills,
        inventory: [],
        weapons: [],
        currency: { guld: 0, silver: 0, brons: 0 },
        currentKP: creatorData.attributes.FYS,
        currentVP: creatorData.attributes.PSY,
        deathSaves: deathSaves,
        movement: 10,
        damageBonusSTY: 'T4',  // Text field for die notation
        damageBonusSMI: 'T6',  // Text field for die notation
        armor: '',
        armorProtection: 0,
        helmet: '',
        helmetProtection: 0,
        carry: 0,  // Bär (carrying capacity)
        notes: '',
        playerName: '',
        weakness: '',
        memento: '',
        portraitType: creatorData.portraitType,
        portraitUrl: creatorData.portraitUrl,
        backgroundImage: null,
        portraitUrl:  creatorData.portraitUrl || getDefaultIconForKin(creatorData.kin),
        portraitType: creatorData. portraitType || 'icon',
    };
    
    CharacterService.createCharacter(charData).then(function() {
        closeCharacterCreator();
        loadDashboard();
        if (typeof loadCharactersList === 'function') loadCharactersList();
        showToast('Karaktär skapad!', 'success');
    }).catch(function(err) {
        alert('Fel: ' + err.message);
    });
}

console.log('✅ Character Creator loaded');
