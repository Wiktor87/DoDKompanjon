// Game Mode UI - DM interface for real-time party tracking
var GameModeUI = {
    currentSession: null,
    currentView: 'overview', // 'overview' or 'focus'
    focusedCharacterId: null,
    characters: [],
    party: null,
    unsubscribe: null,
    
    // Initialize game mode
    init: function(partyId) {
        var self = this;
        
        // Get party data
        db.collection('parties').doc(partyId).get().then(function(doc) {
            if (!doc.exists) {
                alert('Grupp hittades inte');
                return;
            }
            
            self.party = Object.assign({ id: doc.id }, doc.data());
            
            // Check for existing active session
            GameModeService.getActiveSession(partyId).then(function(session) {
                if (session) {
                    self.currentSession = session;
                    self.startGameMode();
                } else {
                    // Create new session
                    GameModeService.startSession(partyId).then(function(newSession) {
                        self.currentSession = newSession;
                        self.startGameMode();
                    }).catch(function(error) {
                        console.error('Error starting session:', error);
                        alert('Kunde inte starta spelläge: ' + error.message);
                    });
                }
            }).catch(function(error) {
                console.error('Error checking session:', error);
                alert('Kunde inte kontrollera session: ' + error.message);
            });
        }).catch(function(error) {
            console.error('Error loading party:', error);
            alert('Kunde inte ladda grupp: ' + error.message);
        });
    },
    
    startGameMode: function() {
        var self = this;
        
        // Hide main app content
        var appContainer = document.getElementById('appContainer');
        if (appContainer) appContainer.style.display = 'none';
        
        // Create game mode container
        var container = document.createElement('div');
        container.id = 'gameModeContainer';
        container.className = 'game-mode-container';
        document.body.appendChild(container);
        
        // Listen to character updates
        if (self.party.characterIds && self.party.characterIds.length > 0) {
            self.unsubscribe = GameModeService.listenToPartyCharacters(
                self.party.characterIds,
                function(characters) {
                    self.characters = characters;
                    self.render();
                }
            );
        } else {
            self.characters = [];
            self.render();
        }
    },
    
    render: function() {
        var container = document.getElementById('gameModeContainer');
        if (!container) return;
        
        if (this.currentView === 'overview') {
            this.renderOverview();
        } else if (this.currentView === 'focus') {
            this.renderFocus(this.focusedCharacterId);
        }
    },
    
    // Render overview mode (all characters)
    renderOverview: function() {
        var self = this;
        var container = document.getElementById('gameModeContainer');
        if (!container) return;
        
        var html = '<div class="game-mode-header">' +
            '<div class="game-mode-header-left">' +
            '<h1 class="game-mode-title">🎮 ' + (self.party.name || 'Spelläge') + '</h1>' +
            '<div class="game-mode-subtitle">Översiktsläge</div>' +
            '</div>' +
            '<div class="game-mode-header-right">' +
            '<button class="btn btn-ghost" onclick="GameModeUI.exit()">✕ Avsluta</button>' +
            '</div>' +
            '</div>';
        
        // DM Toolbar
        html += this.renderDMToolbar();
        
        // Initiative Tracker
        html += this.renderInitiativeTracker();
        
        // Monsters Panel
        html += this.renderMonstersPanel();
        
        // Quick Notes
        html += this.renderQuickNotes();
        
        // Characters Grid
        html += '<div class="game-mode-content">' +
            '<div class="compact-cards-grid">';
        
        if (self.characters.length === 0) {
            html += '<div class="empty-state"><p>Inga karaktärer i gruppen</p></div>';
        } else {
            self.characters.forEach(function(char) {
                html += self.renderCompactCard(char);
            });
        }
        
        html += '</div></div>';
        
        container.innerHTML = html;
    },
    
    // Render focus mode (one expanded)
    renderFocus: function(characterId) {
        var self = this;
        var container = document.getElementById('gameModeContainer');
        if (!container) return;
        
        var focusedChar = self.characters.find(function(c) { return c.id === characterId; });
        if (!focusedChar) {
            self.currentView = 'overview';
            self.renderOverview();
            return;
        }
        
        var html = '<div class="game-mode-header">' +
            '<div class="game-mode-header-left">' +
            '<button class="btn btn-ghost" onclick="GameModeUI.switchView(\'overview\')">← Tillbaka</button>' +
            '<h1 class="game-mode-title">' + focusedChar.name + '</h1>' +
            '</div>' +
            '<div class="game-mode-header-right">' +
            '<button class="btn btn-ghost" onclick="GameModeUI.exit()">✕ Avsluta</button>' +
            '</div>' +
            '</div>';
        
        html += '<div class="focus-container">' +
            '<div class="focus-main">' +
            self.renderExpandedView(focusedChar) +
            '</div>' +
            '<div class="focus-sidebar">';
        
        self.characters.forEach(function(char) {
            if (char.id !== characterId) {
                html += self.renderSidebarCard(char);
            }
        });
        
        html += '</div></div>';
        
        container.innerHTML = html;
    },
    
    // Render compact character card
    renderCompactCard: function(character) {
        var self = this;
        var attrs = character.attributes || {};
        var maxKp = attrs.FYS || 0;
        var maxVp = attrs.PSY || 0;
        var kp = character.currentKP !== undefined ? character.currentKP : maxKp;
        var vp = character.currentVP !== undefined ? character.currentVP : maxVp;
        
        var kpPercent = maxKp > 0 ? (kp / maxKp) * 100 : 0;
        var vpPercent = maxVp > 0 ? (vp / maxVp) * 100 : 0;
        
        var isCritical = kpPercent <= 25;
        var isLowVP = vpPercent <= 25;
        
        var cardClass = 'compact-card';
        if (isCritical) cardClass += ' critical';
        
        var html = '<div class="' + cardClass + '" data-character-id="' + character.id + '">' +
            '<div class="compact-card-header">' +
            '<div class="character-avatar">' + getKinIcon(character.kin || 'default') + '</div>' +
            '<div class="character-info">' +
            '<div class="character-name">' + character.name + '</div>' +
            '<div class="character-meta">' + (character.kin || '') + ' • ' + (character.profession || '') + '</div>' +
            '</div>' +
            '</div>';
        
        // KP Tracker
        html += '<div class="pip-tracker kp-tracker">' +
            '<div class="tracker-label">KP</div>' +
            '<div class="pips">';
        for (var i = 1; i <= maxKp; i++) {
            var pipClass = 'pip';
            if (i <= kp) pipClass += ' filled';
            if (i <= kp && kpPercent <= 25) pipClass += ' critical';
            html += '<span class="' + pipClass + '" onclick="GameModeUI.handlePipClick(\'' + character.id + '\', \'currentKP\', ' + i + ')">●</span>';
        }
        html += '</div>' +
            '<div class="tracker-value">' + kp + '/' + maxKp + '</div>' +
            '</div>';
        
        // VP Tracker
        html += '<div class="pip-tracker vp-tracker">' +
            '<div class="tracker-label">VP</div>' +
            '<div class="pips">';
        for (var i = 1; i <= maxVp; i++) {
            var pipClass = 'pip';
            if (i <= vp) pipClass += ' filled';
            if (i <= vp && vpPercent <= 25) pipClass += ' low';
            html += '<span class="' + pipClass + '" onclick="GameModeUI.handlePipClick(\'' + character.id + '\', \'currentVP\', ' + i + ')">●</span>';
        }
        html += '</div>' +
            '<div class="tracker-value">' + vp + '/' + maxVp + '</div>' +
            '</div>';
        
        // Top 3 Weapon Skills
        var weaponSkills = character.weaponSkills || {};
        var topWeapons = Object.keys(weaponSkills)
            .map(function(name) {
                return { name: name, value: weaponSkills[name].value || 0 };
            })
            .filter(function(skill) { return skill.value > 0; })
            .sort(function(a, b) { return b.value - a.value; })
            .slice(0, 3);
        
        if (topWeapons.length > 0) {
            html += '<div class="compact-weapon-skills">' +
                '<span class="weapon-skills-label">🎯 Vapen:</span> ';
            topWeapons.forEach(function(weapon, index) {
                if (index > 0) html += ', ';
                html += weapon.name + ' ' + weapon.value;
            });
            html += '</div>';
        }
        
        // Stats
        var armor = character.armorProtection || 0;
        html += '<div class="compact-stats">' +
            '<div class="stat-item">🛡️ Rustning: ' + armor + '</div>' +
            '</div>';
        
        // Conditions
        var conditions = this.getActiveConditions(character);
        if (conditions.length > 0) {
            html += '<div class="condition-row">';
            conditions.forEach(function(cond) {
                html += '<span class="condition-badge active">◆ ' + cond + '</span>';
            });
            html += '</div>';
        }
        
        // Action button
        html += '<button class="btn btn-outline btn-sm" style="width: 100%; margin-top: 0.5rem;" onclick="GameModeUI.focusCharacter(\'' + character.id + '\')">Visa detaljer</button>';
        
        html += '</div>';
        
        return html;
    },
    
    // Render expanded character view
    renderExpandedView: function(character) {
        var attrs = character.attributes || {};
        var maxKp = attrs.FYS || 0;
        var maxVp = attrs.PSY || 0;
        var kp = character.currentKP !== undefined ? character.currentKP : maxKp;
        var vp = character.currentVP !== undefined ? character.currentVP : maxVp;
        
        var html = '<div class="expanded-view">';
        
        // HEADER: Basic Info
        html += '<div class="expanded-header">' +
            '<h2>' + character.name + '</h2>' +
            '<p class="char-identity">' + 
            (character.kin || '') + ' • ' + 
            (character.profession || '') + 
            (character.age ? ' • ' + character.age : '') +
            '</p>';
        
        if (character.weakness || character.memento) {
            html += '<p class="char-details">';
            if (character.weakness) html += '<span>Svaghet: ' + character.weakness + '</span>';
            if (character.weakness && character.memento) html += ' • ';
            if (character.memento) html += '<span>Minnesak: ' + character.memento + '</span>';
            html += '</p>';
        }
        
        html += '</div>';
        
        // SECTION: Attributes with Conditions
        html += '<div class="expanded-section">' +
            '<h3>🎯 Attribut & Tillstånd</h3>' +
            '<div class="attributes-grid">';
        
        var conditionMap = {
            'STY': 'Utmattad',
            'FYS': 'Krasslig',
            'SMI': 'Omtöcknad',
            'INT': 'Arg',
            'PSY': 'Rädd',
            'KAR': 'Uppgiven'
        };
        
        var charConditions = character.conditions || {};
        var attributesList = ['STY', 'FYS', 'SMI', 'INT', 'PSY', 'KAR'];
        
        attributesList.forEach(function(attr) {
            var value = attrs[attr] || 0;
            var condition = conditionMap[attr];
            var isActive = charConditions[attr] === true;
            var btnClass = 'attr-condition-btn' + (isActive ? ' active' : '');
            
            html += '<div class="attribute-card">' +
                '<div class="attr-name">' + attr + '</div>' +
                '<div class="attr-value">' + value + '</div>' +
                '<button class="' + btnClass + '" onclick="GameModeUI.handleConditionToggle(\'' + character.id + '\', \'' + attr + '\')">' +
                (isActive ? '◆' : '○') + ' ' + condition +
                '</button>' +
                '</div>';
        });
        
        html += '</div></div>';
        
        // SECTION: KP/VP and Death Saves
        html += '<div class="expanded-section">' +
            '<h3>💖 Kroppspoäng & Viljepoäng</h3>' +
            '<div class="kp-vp-container">';
        
        // KP Tracker
        html += '<div class="expanded-tracker">' +
            '<div class="tracker-header">Kroppspoäng (KP)</div>' +
            '<div class="pips large">';
        for (var i = 1; i <= maxKp; i++) {
            var pipClass = 'pip';
            if (i <= kp) pipClass += ' filled';
            html += '<span class="' + pipClass + '" onclick="GameModeUI.handlePipClick(\'' + character.id + '\', \'currentKP\', ' + i + ')">●</span>';
        }
        html += '</div>' +
            '<div class="tracker-value-large">' + kp + '/' + maxKp + '</div>' +
            '<div class="tracker-buttons">' +
            '<button class="btn-sm" onclick="GameModeUI.adjustStat(\'' + character.id + '\', \'currentKP\', -1)">− Skada</button>' +
            '<button class="btn-sm" onclick="GameModeUI.adjustStat(\'' + character.id + '\', \'currentKP\', 1)">+ Läk</button>' +
            '</div>' +
            '</div>';
        
        // VP Tracker
        html += '<div class="expanded-tracker">' +
            '<div class="tracker-header">Viljepoäng (VP)</div>' +
            '<div class="pips large">';
        for (var i = 1; i <= maxVp; i++) {
            var pipClass = 'pip';
            if (i <= vp) pipClass += ' filled vp';
            html += '<span class="' + pipClass + '" onclick="GameModeUI.handlePipClick(\'' + character.id + '\', \'currentVP\', ' + i + ')">●</span>';
        }
        html += '</div>' +
            '<div class="tracker-value-large">' + vp + '/' + maxVp + '</div>' +
            '<div class="tracker-buttons">' +
            '<button class="btn-sm" onclick="GameModeUI.adjustStat(\'' + character.id + '\', \'currentVP\', -1)">− Använd</button>' +
            '<button class="btn-sm" onclick="GameModeUI.adjustStat(\'' + character.id + '\', \'currentVP\', 1)">+ Återställ</button>' +
            '</div>' +
            '</div>';
        
        html += '</div>';
        
        // Death Saves
        var deathSaves = character.deathSaves || { successes: 0, failures: 0 };
        html += '<div class="death-saves">' +
            '<div class="death-saves-label">Dödsslag:</div>' +
            '<div class="death-saves-pips">';
        for (var i = 0; i < 3; i++) {
            html += '<span class="death-pip ' + (i < deathSaves.successes ? 'success' : '') + '">○</span>';
        }
        html += '<span class="death-label">Lyck</span>';
        for (var i = 0; i < 3; i++) {
            html += '<span class="death-pip ' + (i < deathSaves.failures ? 'fail' : '') + '">○</span>';
        }
        html += '<span class="death-label">Miss</span>';
        html += '</div></div>';
        
        html += '</div>';
        
        // SECTION: Combat Stats
        html += '<div class="expanded-section">' +
            '<h3>⚔️ Strid</h3>' +
            '<div class="combat-stats">' +
            '<div class="combat-stat"><label>Förflyttning:</label><span>' + (character.movement || 10) + '</span></div>' +
            '<div class="combat-stat"><label>Skadebonus (STY):</label><span>' + (character.damageBonusSTY || 'T4') + '</span></div>' +
            '<div class="combat-stat"><label>Skadebonus (SMI):</label><span>' + (character.damageBonusSMI || 'T6') + '</span></div>' +
            '</div>';
        
        // Armor
        var totalArmor = (character.armorProtection || 0) + (character.helmetProtection || 0);
        html += '<div class="armor-display">' +
            '<div class="armor-item">' +
            '<label>Rustning:</label>' +
            '<span>' + (character.armor || 'Ingen') + ' (🛡️ ' + (character.armorProtection || 0) + ')</span>' +
            '</div>' +
            '<div class="armor-item">' +
            '<label>Hjälm:</label>' +
            '<span>' + (character.helmet || 'Ingen') + ' (🛡️ ' + (character.helmetProtection || 0) + ')</span>' +
            '</div>' +
            '<div class="armor-total">Total rustning: 🛡️ ' + totalArmor + '</div>' +
            '</div>';
        
        html += '</div>';
        
        // SECTION: Weapons
        if (character.weapons && character.weapons.length > 0) {
            html += '<div class="expanded-section">' +
                '<h3>🗡️ Vapen</h3>' +
                '<div class="weapons-table-expanded">' +
                '<table>' +
                '<thead>' +
                '<tr>' +
                '<th>Namn</th>' +
                '<th>Grepp</th>' +
                '<th>Skada</th>' +
                '<th>Räckvidd</th>' +
                '</tr>' +
                '</thead>' +
                '<tbody>';
            
            character.weapons.forEach(function(weapon) {
                if (weapon.name) {
                    html += '<tr>' +
                        '<td>' + weapon.name + '</td>' +
                        '<td>' + (weapon.grip || '-') + '</td>' +
                        '<td>' + (weapon.damage || '-') + '</td>' +
                        '<td>' + (weapon.range || '-') + '</td>' +
                        '</tr>';
                }
            });
            
            html += '</tbody></table></div></div>';
        }
        
        // SECTION: Skills
        html += '<div class="expanded-section">' +
            '<h3>🎭 Färdigheter</h3>' +
            '<div class="skills-weapons-grid">';
        
        // Regular Skills
        html += '<div class="skills-column">' +
            '<h4>Färdigheter</h4>' +
            '<div class="skills-list">';
        
        if (character.skills) {
            for (var skillName in character.skills) {
                var skill = character.skills[skillName];
                if (skill.value > 0 || skill.isCore) {
                    var skillClass = 'skill-item' + (skill.isCore ? ' core' : '');
                    html += '<div class="' + skillClass + '">' +
                        '<span class="skill-name">' + skillName + ' (' + skill.attr + ')</span>' +
                        '<span class="skill-value">' + skill.value + '</span>' +
                        '</div>';
                }
            }
        }
        
        html += '</div></div>';
        
        // Weapon Skills
        html += '<div class="skills-column">' +
            '<h4>Vapenfärdigheter</h4>' +
            '<div class="skills-list">';
        
        if (character.weaponSkills) {
            for (var skillName in character.weaponSkills) {
                var skill = character.weaponSkills[skillName];
                if (skill.value > 0 || skill.isCore) {
                    var skillClass = 'skill-item' + (skill.isCore ? ' core' : '');
                    html += '<div class="' + skillClass + '">' +
                        '<span class="skill-name">' + skillName + ' (' + skill.attr + ')</span>' +
                        '<span class="skill-value">' + skill.value + '</span>' +
                        '</div>';
                }
            }
        }
        
        html += '</div></div>';
        
        html += '</div></div>';
        
        // SECTION: Heroic Abilities
        if (character.heroicAbility || character.kinAbility) {
            html += '<div class="expanded-section">' +
                '<h3>✨ Heroiska Förmågor</h3>' +
                '<div class="abilities-list">';
            
            if (character.heroicAbility) {
                html += '<div class="ability-card">' +
                    '<div class="ability-name">⚔️ ' + character.heroicAbility + '</div>' +
                    '</div>';
            }
            
            if (character.kinAbility) {
                html += '<div class="ability-card">' +
                    '<div class="ability-name">🌟 ' + character.kinAbility + ' (Släktförmåga)</div>' +
                    '</div>';
            }
            
            html += '</div></div>';
        }
        
        // SECTION: Equipment & Money
        html += '<div class="expanded-section">' +
            '<h3>🎒 Utrustning & Mynt</h3>';
        
        if (character.inventory && character.inventory.length > 0) {
            html += '<div class="inventory-list">' +
                character.inventory.join(', ') +
                '</div>';
        } else {
            html += '<p class="empty-text">Ingen utrustning listad</p>';
        }
        
        // Money
        var currency = character.currency || { guld: 0, silver: 0, brons: 0 };
        html += '<div class="money-display">' +
            '<span class="money-item">💰 Guld: ' + currency.guld + '</span>' +
            '<span class="money-item">⚪ Silver: ' + currency.silver + '</span>' +
            '<span class="money-item">🟤 Brons: ' + currency.brons + '</span>' +
            '</div>';
        
        html += '</div>';
        
        // SECTION: Notes
        if (character.notes) {
            html += '<div class="expanded-section">' +
                '<h3>📝 Anteckningar</h3>' +
                '<div class="notes-display">' + character.notes + '</div>' +
                '</div>';
        }
        
        html += '</div>';
        
        return html;
    },
    
    // Helper: Adjust stat by delta
    adjustStat: function(characterId, field, delta) {
        var char = this.characters.find(function(c) { return c.id === characterId; });
        if (!char) return;
        
        var attrs = char.attributes || {};
        var currentValue = char[field];
        var maxValue;
        
        if (field === 'currentKP') {
            maxValue = attrs.FYS || 0;
            currentValue = currentValue !== undefined ? currentValue : maxValue;
        } else if (field === 'currentVP') {
            maxValue = attrs.PSY || 0;
            currentValue = currentValue !== undefined ? currentValue : maxValue;
        } else {
            return;
        }
        
        var newValue = Math.max(0, Math.min(maxValue, currentValue + delta));
        
        GameModeService.updateCharacterStat(characterId, field, newValue)
            .catch(function(error) {
                console.error('Error updating stat:', error);
                alert('Kunde inte uppdatera: ' + error.message);
            });
    },
    
    // Render sidebar card
    renderSidebarCard: function(character) {
        var attrs = character.attributes || {};
        var maxKp = attrs.FYS || 0;
        var maxVp = attrs.PSY || 0;
        var kp = character.currentKP !== undefined ? character.currentKP : maxKp;
        var vp = character.currentVP !== undefined ? character.currentVP : maxVp;
        
        // Top 3 Weapon Skills
        var weaponSkills = character.weaponSkills || {};
        var topWeapons = Object.keys(weaponSkills)
            .map(function(name) {
                return { name: name, value: weaponSkills[name].value || 0 };
            })
            .filter(function(skill) { return skill.value > 0; })
            .sort(function(a, b) { return b.value - a.value; })
            .slice(0, 3);
        
        var html = '<div class="sidebar-card" onclick="GameModeUI.focusCharacter(\'' + character.id + '\')">' +
            '<div class="sidebar-card-name">' + character.name + '</div>' +
            '<div class="sidebar-card-stats">' +
            '<div>KP: ' + kp + '/' + maxKp + '</div>' +
            '<div>VP: ' + vp + '/' + maxVp + '</div>';
        
        if (topWeapons.length > 0) {
            html += '<div class="sidebar-weapons">🎯 ';
            topWeapons.forEach(function(weapon, index) {
                if (index > 0) html += ', ';
                html += weapon.name + ' ' + weapon.value;
            });
            html += '</div>';
        }
        
        html += '</div></div>';
        
        return html;
    },
    
    // Render initiative tracker
    renderInitiativeTracker: function() {
        var self = this;
        
        var html = '<div class="initiative-tracker">' +
            '<div class="initiative-header">' +
            '<h3>⚔️ Initiativ</h3>' +
            '<button class="btn btn-gold btn-sm" onclick="GameModeUI.rollInitiative()">🎲 Slå initiativ</button>' +
            '</div>';
        
        if (self.currentSession && self.currentSession.initiative && self.currentSession.initiative.length > 0) {
            html += '<div class="initiative-list">';
            
            var currentIndex = self.currentSession.currentTurnIndex || 0;
            var round = self.currentSession.round || 1;
            
            html += '<div class="initiative-round">Runda ' + round + '</div>';
            
            self.currentSession.initiative.forEach(function(item, index) {
                var itemClass = 'initiative-item';
                if (index === currentIndex) itemClass += ' current';
                
                var rollDisplay = item.roll ? ' 🎲' + item.roll : '';
                
                // Add icon based on type
                var icon = item.type === 'monster' ? '💀' : '🧝';
                
                html += '<div class="' + itemClass + '">' +
                    '<span class="initiative-number">' + (index + 1) + '.</span>' +
                    '<span class="initiative-icon">' + icon + '</span>' +
                    '<span class="initiative-name">' + item.name + '</span>' +
                    '<span class="initiative-total">' + rollDisplay + ' (' + item.total + ')</span>' +
                    '</div>';
            });
            
            html += '<button class="btn btn-outline btn-sm" style="margin-top: 0.5rem;" onclick="GameModeUI.nextTurn()">Nästa tur</button>';
            
            html += '</div>';
        } else {
            html += '<p style="color: var(--text-muted); padding: 1rem; text-align: center;">Slå initiativ för att börja</p>';
        }
        
        html += '</div>';
        
        return html;
    },
    
    // Render DM toolbar
    renderDMToolbar: function() {
        var html = '<div class="dm-toolbar">' +
            '<h3>🎲 DM-verktyg</h3>' +
            '<div class="dm-toolbar-actions">' +
            '<button class="dm-tool-btn" onclick="GameModeUI.openDamageAllModal()">💥 Skada alla</button>' +
            '<button class="dm-tool-btn" onclick="GameModeUI.openRestAllModal()">😴 Vila alla</button>' +
            '<button class="dm-tool-btn" onclick="GameModeUI.openAddMonsterModal()">➕ Lägg till monster</button>' +
            '</div>' +
            '</div>';
        
        return html;
    },
    
    // Render quick notes
    renderQuickNotes: function() {
        var notes = (this.currentSession && this.currentSession.notes) || '';
        
        var html = '<div class="quick-notes">' +
            '<h3>📝 Sessionsanteckningar</h3>' +
            '<textarea id="sessionNotes" class="session-notes-textarea" placeholder="Anteckningar för denna session...">' + notes + '</textarea>' +
            '<button class="btn btn-gold btn-sm" onclick="GameModeUI.saveSessionNotes()">💾 Spara</button>' +
            '</div>';
        
        return html;
    },
    
    // Render monsters panel
    renderMonstersPanel: function() {
        var monsters = (this.currentSession && this.currentSession.monsters) || [];
        
        var html = '<div class="monsters-panel">' +
            '<div class="monsters-header">' +
            '<h3>👹 Monster</h3>' +
            '</div>';
        
        if (monsters.length === 0) {
            html += '<p style="color: var(--text-muted); padding: 1rem; text-align: center;">Inga monster tillagda</p>';
        } else {
            html += '<div class="monsters-grid">';
            monsters.forEach(function(monster) {
                html += this.renderMonsterCard(monster);
            }.bind(this));
            html += '</div>';
        }
        
        html += '</div>';
        
        return html;
    },
    
    // Render monster card
    renderMonsterCard: function(monster) {
        return '<div class="monster-card" data-monster-id="' + monster.id + '">' +
            '<div class="monster-header">' +
            '<span class="monster-name">🐺 ' + this.escapeHtml(monster.name) + '</span>' +
            '<button class="btn-remove-monster" onclick="GameModeUI.removeMonster(\'' + monster.id + '\')">✕</button>' +
            '</div>' +
            '<div class="monster-hp">' +
            '<label>KP:</label>' +
            '<span class="monster-hp-value">' + monster.hp + '/' + monster.maxHp + '</span>' +
            '<button class="btn-sm" onclick="GameModeUI.adjustMonsterHP(\'' + monster.id + '\', -1)">−</button>' +
            '<button class="btn-sm" onclick="GameModeUI.adjustMonsterHP(\'' + monster.id + '\', 1)">+</button>' +
            '</div>' +
            '<div class="monster-stats">' +
            '<div class="monster-stat">' +
            '<span class="stat-icon">🛡️</span>' +
            '<span class="stat-value">' + monster.armor + '</span>' +
            '<span class="stat-label">Rustning</span>' +
            '</div>' +
            '<div class="monster-stat">' +
            '<span class="stat-icon">🔄</span>' +
            '<span class="stat-value">' + (monster.undvika || 0) + '</span>' +
            '<span class="stat-label">Undvika</span>' +
            '</div>' +
            '<div class="monster-stat">' +
            '<span class="stat-icon">🏃</span>' +
            '<span class="stat-value">' + (monster.movement || 10) + '</span>' +
            '<span class="stat-label">Förfl.</span>' +
            '</div>' +
            '</div>' +
            (monster.notes ? '<div class="monster-notes">' + this.escapeHtml(monster.notes) + '</div>' : '') +
            '</div>';
    },
    
    // Escape HTML to prevent XSS
    escapeHtml: function(text) {
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
    },
    
    // Remove monster
    removeMonster: function(monsterId) {
        var self = this;
        if (!confirm('Ta bort detta monster?')) return;
        
        GameModeService.removeMonster(self.currentSession.id, monsterId)
            .then(function() {
                return db.collection('gameSessions').doc(self.currentSession.id).get();
            })
            .then(function(doc) {
                if (doc.exists) {
                    self.currentSession = Object.assign({ id: doc.id }, doc.data());
                    self.render();
                }
            })
            .catch(function(error) {
                console.error('Error removing monster:', error);
                alert('Kunde inte ta bort monster: ' + error.message);
            });
    },
    
    // Adjust monster HP
    adjustMonsterHP: function(monsterId, delta) {
        var self = this;
        var monsters = (self.currentSession && self.currentSession.monsters) || [];
        var monster = monsters.find(function(m) { return m.id === monsterId; });
        if (!monster) return;
        
        var newHP = Math.max(0, Math.min(monster.maxHp, monster.hp + delta));
        
        GameModeService.updateMonster(self.currentSession.id, monsterId, { hp: newHP })
            .then(function() {
                return db.collection('gameSessions').doc(self.currentSession.id).get();
            })
            .then(function(doc) {
                if (doc.exists) {
                    self.currentSession = Object.assign({ id: doc.id }, doc.data());
                    self.render();
                }
            })
            .catch(function(error) {
                console.error('Error updating monster HP:', error);
            });
    },
    
    // Handle KP/VP pip clicks
    handlePipClick: function(characterId, field, newValue) {
        GameModeService.updateCharacterStat(characterId, field, newValue)
            .catch(function(error) {
                console.error('Error updating stat:', error);
                alert('Kunde inte uppdatera: ' + error.message);
            });
    },
    
    // Handle condition toggle
    handleConditionToggle: function(characterId, conditionAttr) {
        var char = this.characters.find(function(c) { return c.id === characterId; });
        if (!char) return;
        
        var charConditions = char.conditions || {};
        var newValue = !charConditions[conditionAttr];
        
        // Update the conditions object
        var updatedConditions = Object.assign({}, charConditions);
        updatedConditions[conditionAttr] = newValue;
        
        GameModeService.updateCharacterStat(characterId, 'conditions', updatedConditions)
            .catch(function(error) {
                console.error('Error toggling condition:', error);
                alert('Kunde inte uppdatera tillstånd: ' + error.message);
            });
    },
    
    // Get active conditions for a character
    getActiveConditions: function(character) {
        var conditions = [];
        var conditionLabels = {
            STY: 'Utmattad',
            FYS: 'Krasslig',
            SMI: 'Omtöcknad',
            INT: 'Arg',
            PSY: 'Rädd',
            KAR: 'Uppgiven'
        };
        
        var charConditions = character.conditions || {};
        for (var attr in conditionLabels) {
            if (charConditions[attr] === true) {
                conditions.push(conditionLabels[attr]);
            }
        }
        
        return conditions;
    },
    
    // Switch view mode
    switchView: function(view) {
        this.currentView = view;
        this.render();
    },
    
    // Focus on a character
    focusCharacter: function(characterId) {
        this.currentView = 'focus';
        this.focusedCharacterId = characterId;
        this.render();
    },
    
    // Roll initiative for all characters
    rollInitiative: function() {
        var self = this;
        
        if (self.characters.length === 0 && (!self.currentSession.monsters || self.currentSession.monsters.length === 0)) {
            alert('Inga karaktärer eller monster att slå initiativ för');
            return;
        }
        
        var monsters = (self.currentSession && self.currentSession.monsters) || [];
        var initiative = GameModeService.rollInitiative(self.characters, monsters);
        
        GameModeService.setInitiativeOrder(self.currentSession.id, initiative)
            .then(function() {
                // Refresh session data
                return db.collection('gameSessions').doc(self.currentSession.id).get();
            })
            .then(function(doc) {
                if (doc.exists) {
                    self.currentSession = Object.assign({ id: doc.id }, doc.data());
                    self.render();
                }
            })
            .catch(function(error) {
                console.error('Error rolling initiative:', error);
                alert('Kunde inte slå initiativ: ' + error.message);
            });
    },
    
    // Next turn in initiative
    nextTurn: function() {
        var self = this;
        
        GameModeService.nextTurn(self.currentSession.id)
            .then(function() {
                return db.collection('gameSessions').doc(self.currentSession.id).get();
            })
            .then(function(doc) {
                if (doc.exists) {
                    self.currentSession = Object.assign({ id: doc.id }, doc.data());
                    self.render();
                }
            })
            .catch(function(error) {
                console.error('Error advancing turn:', error);
                alert('Kunde inte gå till nästa tur: ' + error.message);
            });
    },
    
    // Open damage all modal
    openDamageAllModal: function() {
        var amount = prompt('Hur mycket skada ska alla ta?');
        if (amount === null) return;
        
        amount = parseInt(amount, 10);
        if (isNaN(amount) || amount < 0) {
            alert('Ogiltigt värde');
            return;
        }
        
        var characterIds = this.characters.map(function(c) { return c.id; });
        GameModeService.damageAll(characterIds, amount)
            .then(function(results) {
                var message = 'Skada applicerad!\n\n';
                if (results.updated.length > 0) {
                    message += 'Uppdaterade (' + results.updated.length + '):\n';
                    results.updated.forEach(function(char) {
                        message += '✓ ' + char.name + '\n';
                    });
                }
                if (results.skipped.length > 0) {
                    message += '\nHoppades över (' + results.skipped.length + '):\n';
                    results.skipped.forEach(function(char) {
                        message += '✗ ' + (char.name || char.id) + ' (' + char.reason + ')\n';
                    });
                }
                alert(message);
            })
            .catch(function(error) {
                console.error('Error applying damage:', error);
                alert('Kunde inte applicera skada: ' + error.message);
            });
    },
    
    // Open rest all modal
    openRestAllModal: function() {
        var restType = confirm('Välj vilotyp:\nOK = Lång vila (återställ allt)\nAvbryt = Kort vila (halvera KP)') ? 'long' : 'short';
        
        var characterIds = this.characters.map(function(c) { return c.id; });
        GameModeService.restAll(characterIds, restType)
            .then(function(results) {
                var message = 'Vila applicerad!\n\n';
                if (results.updated.length > 0) {
                    message += 'Uppdaterade (' + results.updated.length + '):\n';
                    results.updated.forEach(function(char) {
                        message += '✓ ' + char.name + '\n';
                    });
                }
                if (results.skipped.length > 0) {
                    message += '\nHoppades över (' + results.skipped.length + '):\n';
                    results.skipped.forEach(function(char) {
                        message += '✗ ' + (char.name || char.id) + ' (' + char.reason + ')\n';
                    });
                }
                alert(message);
            })
            .catch(function(error) {
                console.error('Error applying rest:', error);
                alert('Kunde inte applicera vila: ' + error.message);
            });
    },
    
    // Open add monster modal
    openAddMonsterModal: function() {
        var self = this;
        var name = prompt('Monsternamn:');
        if (!name) return;
        
        var hp = prompt('HP:', '10');
        hp = parseInt(hp, 10);
        if (isNaN(hp)) hp = 10;
        
        var armor = prompt('Rustning:', '0');
        armor = parseInt(armor, 10);
        if (isNaN(armor)) armor = 0;
        
        var undvika = prompt('Undvika:', '10');
        undvika = parseInt(undvika, 10);
        if (isNaN(undvika)) undvika = 10;
        
        var movement = prompt('Förflyttning:', '10');
        movement = parseInt(movement, 10);
        if (isNaN(movement)) movement = 10;
        
        var monster = {
            name: name,
            hp: hp,
            maxHp: hp,
            armor: armor,
            undvika: undvika,
            movement: movement,
            notes: ''
        };
        
        GameModeService.addMonster(this.currentSession.id, monster)
            .then(function() {
                console.log('Monster added');
                // Refresh session to show new monster
                return db.collection('gameSessions').doc(self.currentSession.id).get();
            })
            .then(function(doc) {
                if (doc.exists) {
                    self.currentSession = Object.assign({ id: doc.id }, doc.data());
                    self.render();
                }
            })
            .catch(function(error) {
                console.error('Error adding monster:', error);
                alert('Kunde inte lägga till monster: ' + error.message);
            });
    },
    
    // Save session notes
    saveSessionNotes: function() {
        var notes = document.getElementById('sessionNotes');
        if (!notes) return;
        
        GameModeService.updateNotes(this.currentSession.id, notes.value)
            .then(function() {
                alert('Anteckningar sparade!');
            })
            .catch(function(error) {
                console.error('Error saving notes:', error);
                alert('Kunde inte spara anteckningar: ' + error.message);
            });
    },
    
    // Exit game mode
    exit: function() {
        var self = this;
        
        if (!confirm('Är du säker på att du vill avsluta spelläget?')) {
            return;
        }
        
        // Unsubscribe from listeners
        if (self.unsubscribe) {
            self.unsubscribe();
            self.unsubscribe = null;
        }
        
        // End session
        if (self.currentSession) {
            GameModeService.endSession(self.currentSession.id)
                .catch(function(error) {
                    console.error('Error ending session:', error);
                });
        }
        
        // Remove game mode container
        var container = document.getElementById('gameModeContainer');
        if (container) {
            container.remove();
        }
        
        // Show main app again
        var appContainer = document.getElementById('appContainer');
        if (appContainer) appContainer.style.display = 'block';
        
        // Refresh party view
        if (self.party) {
            showPartyDetails(self.party.id);
        }
    }
};
