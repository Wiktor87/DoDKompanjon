// Game Mode UI - DM interface for real-time party tracking
// New Design Implementation with 3-column grid, initiative tracker, combat log
var GameModeUI = {
    currentSession: null,
    characters: [],
    monsters: [],
    party: null,
    unsubscribe: null,
    combatLog: [],
    
    // Helper: Safely get combat log from session data
    safeCombatLog: function(sessionData) {
        return Array.isArray(sessionData.combatLog) ? sessionData.combatLog : [];
    },
    
    // Helper: Check if entity is dead
    isEntityDead: function(entityType, entityId) {
        if (entityType === 'character') {
            var char = this.characters.find(function(c) { return c.id === entityId; });
            if (char) {
                var maxKp = (char.attributes && char.attributes.FYS) || 0;
                var kp = char.currentKP !== undefined ? char.currentKP : maxKp;
                return kp <= 0;
            }
        } else if (entityType === 'monster') {
            var monster = this.monsters.find(function(m) { return m.id === entityId; });
            if (monster) {
                return monster.hp <= 0;
            }
        }
        return false;
    },
    
    // Helper: Get top 2-3 weapon skills for a character
    getTopWeaponSkills: function(character) {
        var weaponSkills = character.weaponSkills || {};
        return Object.keys(weaponSkills)
            .map(function(name) {
                return { name: name, value: weaponSkills[name].value || 0 };
            })
            .filter(function(skill) { return skill.value > 0; })
            .sort(function(a, b) { return b.value - a.value; })
            .slice(0, 3);
    },
    
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
                    // Validate combatLog is an array
                    self.combatLog = Array.isArray(session.combatLog) ? session.combatLog : [];
                    self.startGameMode();
                } else {
                    // Create new session
                    GameModeService.startSession(partyId).then(function(newSession) {
                        self.currentSession = newSession;
                        self.combatLog = [];
                        self.addLogEntry('Spelläge startat', 'system');
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
        
        var self = this;
        this.monsters = (this.currentSession && this.currentSession.monsters) || [];
        
        var html = '';
        
        // Header Bar
        html += this.renderHeaderBar();
        
        // Initiative Bar
        html += this.renderInitiativeBar();
        
        // Main 3-Column Grid
        html += '<div class="gm-main-grid">';
        
        // Column 1: Heroes
        html += this.renderHeroesColumn();
        
        // Column 2: Monsters
        html += this.renderMonstersColumn();
        
        // Column 3: Sidebar (Combat Log + Notes)
        html += this.renderSidebar();
        
        html += '</div>'; // end gm-main-grid
        
        container.innerHTML = html;
        
        // Auto-scroll combat log to bottom
        setTimeout(function() {
            var logEntries = document.querySelector('.gm-log-entries');
            if (logEntries) {
                logEntries.scrollTop = logEntries.scrollHeight;
            }
        }, 100);
    },
    
    // Render Header Bar
    renderHeaderBar: function() {
        var round = (this.currentSession && this.currentSession.round) || 1;
        
        return '<div class="gm-header-bar">' +
            '<div class="gm-header-left">' +
            '<div class="gm-title">⚔️ SPELLÄGE | ' + (this.party.name || 'Grupp') + '</div>' +
            '<div class="gm-round-display">Runda ' + round + '</div>' +
            '</div>' +
            '<div class="gm-header-actions">' +
            '<button class="gm-btn-primary" onclick="GameModeUI.drawInitiativeCards()">🎴 Dra kort</button>' +
            '<button class="gm-btn-success" onclick="GameModeUI.nextTurn()">▶ Nästa</button>' +
            '<button class="btn btn-ghost" onclick="GameModeUI.exit()">🚪 Avsluta</button>' +
            '</div>' +
            '</div>';
    },
    
    // Render Initiative Bar
    renderInitiativeBar: function() {
        var self = this;
        var html = '<div class="gm-initiative-bar">';
        
        if (this.currentSession && this.currentSession.initiative && this.currentSession.initiative.length > 0) {
            var initiative = this.currentSession.initiative;
            var currentIndex = this.currentSession.currentTurnIndex || 0;
            
            html += '<div class="gm-init-label">INITIATIV:</div>';
            html += '<div class="gm-initiative-tokens">';
            
            var renderedCount = 0;
            initiative.forEach(function(item, index) {
                // Skip dead entities (hp <= 0)
                var isDead = self.isEntityDead(item.type, item.ownerId);
                
                if (isDead) return; // Skip dead entities
                
                // Add arrow between tokens (except before first)
                if (renderedCount > 0) {
                    html += '<span class="gm-initiative-arrow">→</span>';
                }
                renderedCount++;
                
                var tokenClass = 'gm-init-token';
                if (index === currentIndex) {
                    tokenClass += ' active';
                }
                
                var icon = item.type === 'monster' ? '💀' : '🧝';
                var cardNumber = item.initiativeCard || 0;
                
                html += '<div class="' + tokenClass + '" data-index="' + index + '">';
                
                // Add golden frame corners for current turn
                if (index === currentIndex) {
                    html += '<span class="corner-bl"></span><span class="corner-br"></span>';
                }
                
                // Initiative card number badge (only if card was drawn)
                if (cardNumber > 0) {
                    html += '<div class="gm-init-card-badge">' + cardNumber + '</div>';
                }
                
                html += '<div class="gm-init-token-icon">' + icon + '</div>' +
                    '<div class="gm-init-token-name">' + item.name + '</div>' +
                    '</div>';
            });
            
            html += '</div>';
        } else {
            html += '<div style="display: flex; gap: 1rem; align-items: center;">' +
                '<span style="color: var(--text-muted);">Ingen initiativ-ordning ännu</span>' +
                '<button class="gm-btn-primary" onclick="GameModeUI.rollInitiative()">🎲 Slå initiativ</button>' +
                '</div>';
        }
        
        html += '</div>';
        return html;
    },
    
    // Render Heroes Column
    renderHeroesColumn: function() {
        var self = this;
        var currentTurnEntityId = this.getCurrentTurnEntityId();
        
        var html = '<div class="gm-heroes-column">';
        html += '<div class="gm-heroes-grid">';
        
        if (this.characters.length === 0) {
            html += '<div style="padding: 2rem; text-align: center; color: var(--text-muted); grid-column: 1/-1;">Inga hjältar i gruppen</div>';
        } else {
            this.characters.forEach(function(char) {
                html += self.renderHeroCard(char, currentTurnEntityId);
            });
        }
        
        html += '</div></div>';
        return html;
    },
    
    // Render Hero Card
    renderHeroCard: function(character, currentTurnEntityId) {
        var attrs = character.attributes || {};
        var maxKp = attrs.FYS || 0;
        var maxVp = attrs.PSY || 0;
        var kp = character.currentKP !== undefined ? character.currentKP : maxKp;
        var vp = character.currentVP !== undefined ? character.currentVP : maxVp;
        
        var isDead = kp <= 0;
        var isCurrentTurn = currentTurnEntityId === character.id;
        
        var cardClass = 'gm-hero-card';
        if (isDead) cardClass += ' dead';
        if (isCurrentTurn) cardClass += ' active';
        
        var html = '<div class="' + cardClass + '" data-character-id="' + character.id + '">';
        
        // Golden frame corners for current turn
        if (isCurrentTurn) {
            html += '<span class="corner-bl"></span><span class="corner-br"></span>';
        }
        
        // Initiative card badge (find in initiative order)
        var initiativeCard = 0;
        if (this.currentSession && this.currentSession.initiative) {
            var initItem = this.currentSession.initiative.find(function(item) {
                return item.type === 'character' && item.ownerId === character.id;
            });
            if (initItem) {
                initiativeCard = initItem.initiativeCard || 0;
            }
        }
        
        if (initiativeCard > 0) {
            html += '<div class="gm-hero-initiative-badge">' + initiativeCard + '</div>';
        }
        
        // Header
        html += '<div class="gm-card-header">' +
            '<div>' + getKinIcon(character.kin || 'default') + '</div>' +
            '<div style="flex: 1;">' +
            '<div class="gm-card-name">' + character.name.toUpperCase() + '</div>' +
            '<div class="gm-card-meta">' + (character.kin || '') + ' • ' + (character.profession || '') + '</div>';
        
        if (isDead) {
            html += '<div class="gm-death-badge">💀 DÖD</div>';
        }
        
        html += '</div></div>';
        
        // KP/VP Row with pips
        html += '<div class="gm-hp-vp-row">';
        
        // KP Box
        html += '<div class="gm-stat-box">' +
            '<div class="gm-stat-label">KP</div>' +
            '<div class="gm-stat-pips">';
        for (var i = 1; i <= maxKp; i++) {
            var pipClass = 'gm-pip';
            if (i <= kp) pipClass += ' filled-kp';
            html += '<span class="' + pipClass + '" onclick="GameModeUI.handlePipClick(\'' + character.id + '\', \'currentKP\', ' + i + ')">●</span>';
        }
        html += '</div>' +
            '<div class="gm-stat-value">' + kp + '/' + maxKp + '</div>' +
            '<div class="gm-stat-buttons">' +
            '<button class="gm-stat-btn gm-btn-decrease" onclick="GameModeUI.adjustStat(\'' + character.id + '\', \'currentKP\', -1)">−</button>' +
            '<button class="gm-stat-btn gm-btn-increase" onclick="GameModeUI.adjustStat(\'' + character.id + '\', \'currentKP\', 1)">+</button>' +
            '</div>' +
            '</div>';
        
        // VP Box
        html += '<div class="gm-stat-box">' +
            '<div class="gm-stat-label">VP</div>' +
            '<div class="gm-stat-pips">';
        for (var i = 1; i <= maxVp; i++) {
            var pipClass = 'gm-pip';
            if (i <= vp) pipClass += ' filled-vp';
            html += '<span class="' + pipClass + '" onclick="GameModeUI.handlePipClick(\'' + character.id + '\', \'currentVP\', ' + i + ')">●</span>';
        }
        html += '</div>' +
            '<div class="gm-stat-value">' + vp + '/' + maxVp + '</div>' +
            '<div class="gm-stat-buttons">' +
            '<button class="gm-stat-btn gm-btn-decrease" onclick="GameModeUI.adjustStat(\'' + character.id + '\', \'currentVP\', -1)">−</button>' +
            '<button class="gm-stat-btn gm-btn-increase" onclick="GameModeUI.adjustStat(\'' + character.id + '\', \'currentVP\', 1)">+</button>' +
            '</div>' +
            '</div>';
        
        html += '</div>'; // end gm-hp-vp-row
        
        // Combat Stats Row (Skadebonus, Movement, etc.)
        html += '<div class="gm-combat-row">';
        
        html += '<div class="gm-combat-stat">' +
            '<span class="gm-combat-stat-label">SKADEBONUS (STY):</span>' +
            '<span class="gm-combat-stat-value">' + (character.damageBonusSTY || 'T4') + '</span>' +
            '</div>';
        
        html += '<div class="gm-combat-stat">' +
            '<span class="gm-combat-stat-label">SKADEBONUS (SMI):</span>' +
            '<span class="gm-combat-stat-value">' + (character.damageBonusSMI || 'T6') + '</span>' +
            '</div>';
        
        html += '</div>'; // end gm-combat-row
        
        // Additional combat stats
        html += '<div class="gm-combat-row">';
        
        html += '<div class="gm-combat-stat">' +
            '<span class="gm-combat-stat-label">🏃:</span>' +
            '<span class="gm-combat-stat-value">' + (character.movement || 10) + '</span>' +
            '</div>';
        
        var totalArmor = (character.armorProtection || 0) + (character.helmetProtection || 0);
        html += '<div class="gm-combat-stat">' +
            '<span class="gm-combat-stat-label">🛡️:</span>' +
            '<span class="gm-combat-stat-value">' + totalArmor + '</span>' +
            '</div>';
        
        html += '</div>'; // end gm-combat-row
        
        // Top 2-3 Weapons
        var topWeapons = this.getTopWeaponSkills(character);
        if (topWeapons.length > 0 || (character.weapons && character.weapons.length > 0)) {
            html += '<div class="gm-weapons-list">' +
                '<div class="gm-weapons-title">⚔️ VAPEN</div>';
            
            if (character.weapons && character.weapons.length > 0) {
                character.weapons.slice(0, 3).forEach(function(weapon) {
                    if (weapon.name) {
                        html += '<div class="gm-weapon-item">' +
                            '<span class="gm-weapon-name">' + weapon.name + '</span>' +
                            '<span class="gm-weapon-dmg">' + (weapon.damage || '-') + '</span>' +
                            '</div>';
                    }
                });
            } else if (topWeapons.length > 0) {
                topWeapons.forEach(function(weapon) {
                    html += '<div class="gm-weapon-item">' +
                        '<span class="gm-weapon-name">' + weapon.name + '</span>' +
                        '<span class="gm-weapon-dmg">' + weapon.value + '</span>' +
                        '</div>';
                });
            }
            
            html += '</div>';
        }
        
        // Conditions
        var conditions = this.getActiveConditions(character);
        if (conditions.length > 0) {
            html += '<div class="gm-conditions">';
            conditions.forEach(function(cond) {
                html += '<span class="gm-condition-badge">◆ ' + cond + '</span>';
            });
            html += '</div>';
        }
        
        // Actions
        html += '<div class="gm-card-actions">' +
            '<button class="gm-btn-info" onclick="GameModeUI.openExpandedCharacterModal(\'' + character.id + '\')">📋 Fullständig info</button>' +
            '</div>';
        
        html += '</div>';
        return html;
    },
    
    // Render Monsters Column
    renderMonstersColumn: function() {
        var self = this;
        var currentTurnEntityId = this.getCurrentTurnEntityId();
        
        var html = '<div class="gm-monsters-column">';
        
        html += '<div class="gm-monsters-header">' +
            '<div class="gm-monsters-title">👹 Monster</div>' +
            '<button class="gm-btn-add-monster" onclick="GameModeUI.openAddMonsterModal()">+ Lägg till</button>' +
            '</div>';
        
        if (this.monsters.length === 0) {
            html += '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Inga monster tillagda</div>';
        } else {
            this.monsters.forEach(function(monster) {
                html += self.renderMonsterCard(monster, currentTurnEntityId);
            });
        }
        
        html += '</div>';
        return html;
    },
    
    // Render Monster Card
    renderMonsterCard: function(monster, currentTurnEntityId) {
        var isDead = monster.hp <= 0;
        var isCurrentTurn = currentTurnEntityId === monster.id;
        
        var cardClass = 'gm-monster-card';
        if (isDead) cardClass += ' dead';
        if (isCurrentTurn) cardClass += ' active';
        
        var html = '<div class="' + cardClass + '" data-monster-id="' + monster.id + '">';
        
        // Golden frame corners for current turn
        if (isCurrentTurn) {
            html += '<span class="corner-bl"></span><span class="corner-br"></span>';
        }
        
        // Header
        html += '<div class="gm-monster-header">' +
            '<div class="gm-monster-name">💀 ' + this.escapeHtml(monster.name) + '</div>' +
            '<button class="gm-btn-remove" onclick="GameModeUI.removeMonster(\'' + monster.id + '\')">✕</button>' +
            '</div>';
        
        if (isDead) {
            html += '<div class="gm-death-badge">💀 DÖD</div>';
        }
        
        // HP with pips
        html += '<div class="gm-monster-hp">' +
            '<div class="gm-stat-label">KP</div>' +
            '<div class="gm-stat-pips">';
        for (var i = 1; i <= monster.maxHp; i++) {
            var pipClass = 'gm-pip';
            if (i <= monster.hp) pipClass += ' filled-kp';
            html += '<span class="' + pipClass + '" onclick="GameModeUI.setMonsterHP(\'' + monster.id + '\', ' + i + ')">●</span>';
        }
        html += '</div>' +
            '<div class="gm-stat-value">' + monster.hp + '/' + monster.maxHp + '</div>' +
            '<div class="gm-stat-buttons">' +
            '<button class="gm-stat-btn gm-btn-decrease" onclick="GameModeUI.adjustMonsterHP(\'' + monster.id + '\', -1)">−</button>' +
            '<button class="gm-stat-btn gm-btn-increase" onclick="GameModeUI.adjustMonsterHP(\'' + monster.id + '\', 1)">+</button>' +
            '</div>' +
            '</div>';
        
        // Stats Grid
        html += '<div class="gm-monster-stats-grid">' +
            '<div class="gm-monster-stat">' +
            '<div class="gm-monster-stat-icon">🛡️</div>' +
            '<div class="gm-monster-stat-value">' + (monster.armor || 0) + '</div>' +
            '<div class="gm-monster-stat-label">Rustning</div>' +
            '</div>' +
            '<div class="gm-monster-stat">' +
            '<div class="gm-monster-stat-icon">🔄</div>' +
            '<div class="gm-monster-stat-value">' + (monster.undvika || 10) + '</div>' +
            '<div class="gm-monster-stat-label">Undvika</div>' +
            '</div>' +
            '<div class="gm-monster-stat">' +
            '<div class="gm-monster-stat-icon">🏃</div>' +
            '<div class="gm-monster-stat-value">' + (monster.movement || 10) + '</div>' +
            '<div class="gm-monster-stat-label">Förfl.</div>' +
            '</div>' +
            '</div>';
        
        // Attacks
        if (monster.attacks && monster.attacks.length > 0) {
            html += '<div class="gm-monster-attacks">' +
                '<div class="gm-monster-attack-title">⚔️ Attacker</div>';
            
            monster.attacks.forEach(function(attack) {
                html += '<div class="gm-monster-attack">' +
                    '<span class="gm-monster-attack-name">' + attack.name + '</span>' +
                    '<span class="gm-monster-attack-dmg">' + attack.damage + '</span>' +
                    '</div>';
            });
            
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    },
    
    // Render Sidebar (Combat Log + Notes)
    renderSidebar: function() {
        var html = '<div class="gm-sidebar">';
        
        // Stats Panel - HJÄLTAR/MONSTER counts
        var aliveHeroes = this.characters.filter(function(char) {
            var attrs = char.attributes || {};
            var maxKp = attrs.FYS || 0;
            var kp = char.currentKP !== undefined ? char.currentKP : maxKp;
            return kp > 0;
        }).length;
        
        var aliveMonsters = this.monsters.filter(function(monster) {
            return monster.hp > 0;
        }).length;
        
        html += '<div class="gm-stats-panel">' +
            '<div class="gm-stats-row">' +
            '<div class="gm-stat-item">' +
            '<div class="gm-stat-item-label">HJÄLTAR</div>' +
            '<div class="gm-stat-item-value heroes">' + aliveHeroes + '</div>' +
            '</div>' +
            '<div class="gm-stat-item">' +
            '<div class="gm-stat-item-label">MONSTER</div>' +
            '<div class="gm-stat-item-value monsters">' + aliveMonsters + '</div>' +
            '</div>' +
            '</div>' +
            '</div>';
        
        // Notes
        var notes = (this.currentSession && this.currentSession.notes) || '';
        html += '<div class="gm-sidebar-panel gm-notes">' +
            '<div class="gm-sidebar-title">📝 ANTECKNINGAR</div>' +
            '<textarea id="gmNotesTextarea" class="gm-notes-textarea" placeholder="Anteckningar för denna session...">' + notes + '</textarea>' +
            '<button class="btn btn-gold btn-sm" style="margin-top: 0.5rem; width: 100%;" onclick="GameModeUI.saveNotes(event)">💾 Spara</button>' +
            '</div>';
        
        // Combat Log
        html += '<div class="gm-sidebar-panel gm-combat-log">' +
            '<div class="gm-sidebar-title">📜 HÄNDELSER</div>' +
            '<div class="gm-log-entries">';
        
        if (this.combatLog.length === 0) {
            html += '<div class="gm-log-entry system">Ingen aktivitet ännu...</div>';
        } else {
            this.combatLog.forEach(function(entry) {
                var entryClass = 'gm-log-entry ' + (entry.type || 'system');
                html += '<div class="' + entryClass + '">' +
                    '<span class="gm-log-time">' + entry.time + '</span> ' +
                    entry.message +
                    '</div>';
            });
        }
        
        html += '</div></div>'; // end combat log
        
        html += '</div>'; // end gm-sidebar
        return html;
    },
    
    // Get current turn entity ID
    getCurrentTurnEntityId: function() {
        if (!this.currentSession || !this.currentSession.initiative || this.currentSession.initiative.length === 0) {
            return null;
        }
        var currentIndex = this.currentSession.currentTurnIndex || 0;
        var currentItem = this.currentSession.initiative[currentIndex];
        return currentItem ? currentItem.ownerId : null;
    },
    
    // Add log entry
    addLogEntry: function(message, type) {
        var time = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
        this.combatLog.push({ message: message, type: type || 'system', time: time });
        
        // Keep only last 100 entries
        if (this.combatLog.length > 100) {
            this.combatLog = this.combatLog.slice(-100);
        }
        
        // Save to session
        if (this.currentSession) {
            db.collection('gameSessions').doc(this.currentSession.id).update({
                combatLog: this.combatLog
            }).catch(function(error) {
                console.error('Error saving combat log:', error);
            });
        }
    },
    
    // Adjust stat by delta
    adjustStat: function(characterId, field, delta) {
        var self = this;
        var char = this.characters.find(function(c) { return c.id === characterId; });
        if (!char) return;
        
        var attrs = char.attributes || {};
        var currentValue = char[field];
        var maxValue;
        var statLabel = '';
        
        if (field === 'currentKP') {
            maxValue = attrs.FYS || 0;
            currentValue = currentValue !== undefined ? currentValue : maxValue;
            statLabel = 'KP';
        } else if (field === 'currentVP') {
            maxValue = attrs.PSY || 0;
            currentValue = currentValue !== undefined ? currentValue : maxValue;
            statLabel = 'VP';
        } else {
            return;
        }
        
        var oldValue = currentValue;
        var newValue = Math.max(0, Math.min(maxValue, currentValue + delta));
        
        GameModeService.updateCharacterStat(characterId, field, newValue)
            .then(function() {
                // Log the change
                if (delta < 0) {
                    self.addLogEntry(char.name + ' tog ' + Math.abs(delta) + ' skada (' + statLabel + ': ' + oldValue + ' → ' + newValue + ')', 'hero');
                    if (newValue === 0) {
                        self.addLogEntry('💀 ' + char.name + ' föll medvetslös!', 'death');
                    }
                } else if (delta > 0 && field === 'currentKP') {
                    self.addLogEntry(char.name + ' helade ' + delta + ' ' + statLabel + ' (' + oldValue + ' → ' + newValue + ')', 'hero');
                }
            })
            .catch(function(error) {
                console.error('Error updating stat:', error);
                alert('Kunde inte uppdatera: ' + error.message);
            });
    },
    
    // Handle KP/VP pip clicks
    handlePipClick: function(characterId, field, newValue) {
        var self = this;
        var char = this.characters.find(function(c) { return c.id === characterId; });
        if (!char) return;
        
        var attrs = char.attributes || {};
        var oldValue = char[field];
        var maxValue;
        var statLabel = '';
        
        if (field === 'currentKP') {
            maxValue = attrs.FYS || 0;
            oldValue = oldValue !== undefined ? oldValue : maxValue;
            statLabel = 'KP';
        } else if (field === 'currentVP') {
            maxValue = attrs.PSY || 0;
            oldValue = oldValue !== undefined ? oldValue : maxValue;
            statLabel = 'VP';
        }
        
        var delta = newValue - oldValue;
        
        GameModeService.updateCharacterStat(characterId, field, newValue)
            .then(function() {
                // Log the change
                if (delta < 0) {
                    self.addLogEntry(char.name + ' tog ' + Math.abs(delta) + ' skada (' + statLabel + ': ' + oldValue + ' → ' + newValue + ')', 'hero');
                    if (newValue === 0) {
                        self.addLogEntry('💀 ' + char.name + ' föll medvetslös!', 'death');
                    }
                } else if (delta > 0 && field === 'currentKP') {
                    self.addLogEntry(char.name + ' helade ' + delta + ' ' + statLabel + ' (' + oldValue + ' → ' + newValue + ')', 'hero');
                }
            })
            .catch(function(error) {
                console.error('Error updating stat:', error);
                alert('Kunde inte uppdatera: ' + error.message);
            });
    },
    
    // Adjust monster HP
    adjustMonsterHP: function(monsterId, delta) {
        var self = this;
        var monster = this.monsters.find(function(m) { return m.id === monsterId; });
        if (!monster) return;
        
        var oldHP = monster.hp;
        var newHP = Math.max(0, Math.min(monster.maxHp, oldHP + delta));
        
        GameModeService.updateMonster(this.currentSession.id, monsterId, { hp: newHP })
            .then(function() {
                return db.collection('gameSessions').doc(self.currentSession.id).get();
            })
            .then(function(doc) {
                if (doc.exists) {
                    self.currentSession = Object.assign({ id: doc.id }, doc.data());
                    self.combatLog = self.safeCombatLog(doc.data());
                    
                    // Log the change
                    if (delta < 0) {
                        self.addLogEntry(monster.name + ' tog ' + Math.abs(delta) + ' skada (KP: ' + oldHP + ' → ' + newHP + ')', 'monster');
                        if (newHP === 0) {
                            self.addLogEntry('💀 ' + monster.name + ' föll i strid!', 'death');
                        }
                    } else if (delta > 0) {
                        self.addLogEntry(monster.name + ' helade ' + delta + ' KP (' + oldHP + ' → ' + newHP + ')', 'monster');
                    }
                    
                    self.render();
                }
            })
            .catch(function(error) {
                console.error('Error updating monster HP:', error);
            });
    },
    
    // Set monster HP via pip click
    setMonsterHP: function(monsterId, newHP) {
        var self = this;
        var monster = this.monsters.find(function(m) { return m.id === monsterId; });
        if (!monster) return;
        
        var oldHP = monster.hp;
        var delta = newHP - oldHP;
        
        GameModeService.updateMonster(this.currentSession.id, monsterId, { hp: newHP })
            .then(function() {
                return db.collection('gameSessions').doc(self.currentSession.id).get();
            })
            .then(function(doc) {
                if (doc.exists) {
                    self.currentSession = Object.assign({ id: doc.id }, doc.data());
                    self.combatLog = self.safeCombatLog(doc.data());
                    
                    // Log the change
                    if (delta < 0) {
                        self.addLogEntry(monster.name + ' tog ' + Math.abs(delta) + ' skada (KP: ' + oldHP + ' → ' + newHP + ')', 'monster');
                        if (newHP === 0) {
                            self.addLogEntry('💀 ' + monster.name + ' föll i strid!', 'death');
                        }
                    } else if (delta > 0) {
                        self.addLogEntry(monster.name + ' helade ' + delta + ' KP (' + oldHP + ' → ' + newHP + ')', 'monster');
                    }
                    
                    self.render();
                }
            })
            .catch(function(error) {
                console.error('Error updating monster HP:', error);
            });
    },
    
    // Roll initiative for all characters and monsters
    rollInitiative: function() {
        var self = this;
        
        // Skip dead entities
        var aliveCharacters = this.characters.filter(function(char) {
            var attrs = char.attributes || {};
            var maxKp = attrs.FYS || 0;
            var kp = char.currentKP !== undefined ? char.currentKP : maxKp;
            return kp > 0;
        });
        
        var aliveMonsters = this.monsters.filter(function(monster) {
            return monster.hp > 0;
        });
        
        if (aliveCharacters.length === 0 && aliveMonsters.length === 0) {
            alert('Inga levande karaktärer eller monster att slå initiativ för');
            return;
        }
        
        var initiative = GameModeService.rollInitiative(aliveCharacters, aliveMonsters);
        
        GameModeService.setInitiativeOrder(this.currentSession.id, initiative)
            .then(function() {
                return db.collection('gameSessions').doc(self.currentSession.id).get();
            })
            .then(function(doc) {
                if (doc.exists) {
                    self.currentSession = Object.assign({ id: doc.id }, doc.data());
                    self.combatLog = self.safeCombatLog(doc.data());
                    self.addLogEntry('🎲 Initiativ slaget! Strid börjar.', 'system');
                    self.addLogEntry('--- Runda 1 ---', 'round');
                    if (initiative.length > 0) {
                        self.addLogEntry('Ny tur: ' + initiative[0].name, 'turn');
                    }
                    self.render();
                }
            })
            .catch(function(error) {
                console.error('Error rolling initiative:', error);
                alert('Kunde inte slå initiativ: ' + error.message);
            });
    },
    
    // Draw initiative cards (1-10) for all living entities
    drawInitiativeCards: function() {
        var self = this;
        
        // Skip dead entities
        var aliveCharacters = this.characters.filter(function(char) {
            var attrs = char.attributes || {};
            var maxKp = attrs.FYS || 0;
            var kp = char.currentKP !== undefined ? char.currentKP : maxKp;
            return kp > 0;
        });
        
        var aliveMonsters = this.monsters.filter(function(monster) {
            return monster.hp > 0;
        });
        
        if (aliveCharacters.length === 0 && aliveMonsters.length === 0) {
            alert('Inga levande karaktärer eller monster att dra kort för');
            return;
        }
        
        // Create a deck of cards 1-10 and draw randomly
        var allEntities = [];
        
        aliveCharacters.forEach(function(char) {
            allEntities.push({
                ownerId: char.id,
                type: 'character',
                name: char.name,
                smi: (char.attributes && char.attributes.SMI) || 10
            });
        });
        
        aliveMonsters.forEach(function(monster) {
            allEntities.push({
                ownerId: monster.id,
                type: 'monster',
                name: monster.name,
                smi: monster.undvika || monster.smi || 10
            });
        });
        
        // Draw random initiative cards (1-10)
        var usedCards = [];
        var initiative = allEntities.map(function(entity) {
            var card;
            // If we have more entities than cards (>10), allow duplicates
            if (usedCards.length >= 10) {
                card = Math.floor(Math.random() * 10) + 1;
            } else {
                // Try to get a unique card
                do {
                    card = Math.floor(Math.random() * 10) + 1;
                } while (usedCards.includes(card));
                usedCards.push(card);
            }
            
            return {
                ownerId: entity.ownerId,
                type: entity.type,
                name: entity.name,
                smi: entity.smi,
                initiativeCard: card,
                roll: card,
                total: entity.smi + card
            };
        });
        
        // Sort by total (SMI + card)
        initiative.sort(function(a, b) {
            return b.total - a.total;
        });
        
        GameModeService.setInitiativeOrder(this.currentSession.id, initiative)
            .then(function() {
                return db.collection('gameSessions').doc(self.currentSession.id).get();
            })
            .then(function(doc) {
                if (doc.exists) {
                    self.currentSession = Object.assign({ id: doc.id }, doc.data());
                    self.combatLog = self.safeCombatLog(doc.data());
                    self.addLogEntry('🎴 Initiativkort dragna!', 'system');
                    self.addLogEntry('--- Runda 1 ---', 'round');
                    if (initiative.length > 0) {
                        self.addLogEntry('Ny tur: ' + initiative[0].name, 'turn');
                    }
                    self.render();
                }
            })
            .catch(function(error) {
                console.error('Error drawing initiative cards:', error);
                alert('Kunde inte dra initiativkort: ' + error.message);
            });
    },
    
    // Next turn in initiative
    nextTurn: function() {
        var self = this;
        
        var currentIndex = this.currentSession.currentTurnIndex || 0;
        var currentRound = this.currentSession.round || 1;
        var initiative = this.currentSession.initiative || [];
        
        GameModeService.nextTurn(this.currentSession.id)
            .then(function() {
                return db.collection('gameSessions').doc(self.currentSession.id).get();
            })
            .then(function(doc) {
                if (doc.exists) {
                    self.currentSession = Object.assign({ id: doc.id }, doc.data());
                    self.combatLog = self.safeCombatLog(doc.data());
                    
                    var newIndex = self.currentSession.currentTurnIndex || 0;
                    var newRound = self.currentSession.round || 1;
                    
                    // Log round change
                    if (newRound > currentRound) {
                        self.addLogEntry('--- Runda ' + newRound + ' ---', 'round');
                    }
                    
                    // Log turn change
                    if (initiative[newIndex]) {
                        self.addLogEntry('Ny tur: ' + initiative[newIndex].name, 'turn');
                    }
                    
                    self.render();
                }
            })
            .catch(function(error) {
                console.error('Error advancing turn:', error);
                alert('Kunde inte gå till nästa tur: ' + error.message);
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
    
    // Open Add Monster Modal
    openAddMonsterModal: function() {
        var self = this;
        
        // Create modal overlay
        var overlay = document.createElement('div');
        overlay.className = 'gm-modal-overlay';
        overlay.id = 'addMonsterModalOverlay';
        
        var modalHTML = '<div class="gm-modal-content" style="max-width: 600px;">' +
            '<button class="gm-modal-close" onclick="GameModeUI.closeModal(\'addMonsterModalOverlay\')">✕</button>' +
            '<h2 style="margin-bottom: 1.5rem;">Lägg till Monster</h2>' +
            
            // Quick Add Section
            '<div style="margin-bottom: 2rem;">' +
            '<h3 style="margin-bottom: 1rem;">Snabbval</h3>' +
            '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">' +
            '<button class="btn btn-outline" onclick="GameModeUI.addPresetMonster(\'Skuggvarg\', 8, 2, 12, 10, [{name: \'Bett\', damage: \'1T10\'}])">🐺 Skuggvarg</button>' +
            '<button class="btn btn-outline" onclick="GameModeUI.addPresetMonster(\'Skelettkrigar\', 6, 3, 10, 8, [{name: \'Svärd\', damage: \'1T8\'}])">💀 Skelettkrigar</button>' +
            '<button class="btn btn-outline" onclick="GameModeUI.addPresetMonster(\'Goblin\', 5, 1, 11, 10, [{name: \'Kort svärd\', damage: \'1T6\'}])">👹 Goblin</button>' +
            '<button class="btn btn-outline" onclick="GameModeUI.addPresetMonster(\'Orch\', 12, 4, 9, 8, [{name: \'Yxa\', damage: \'1T10+2\'}])">👺 Orch</button>' +
            '</div>' +
            '</div>' +
            
            // Custom Form Section
            '<div>' +
            '<h3 style="margin-bottom: 1rem;">Anpassat Monster</h3>' +
            '<div style="display: flex; flex-direction: column; gap: 1rem;">' +
            
            '<div>' +
            '<label style="display: block; margin-bottom: 0.25rem; font-size: 0.875rem;">Namn</label>' +
            '<input type="text" id="monsterNameInput" class="input-field" placeholder="Monsternamn" style="width: 100%;">' +
            '</div>' +
            
            '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">' +
            '<div>' +
            '<label style="display: block; margin-bottom: 0.25rem; font-size: 0.875rem;">KP (max)</label>' +
            '<input type="number" id="monsterHPInput" class="input-field" value="10" min="1" style="width: 100%;">' +
            '</div>' +
            '<div>' +
            '<label style="display: block; margin-bottom: 0.25rem; font-size: 0.875rem;">Rustning</label>' +
            '<input type="number" id="monsterArmorInput" class="input-field" value="0" min="0" style="width: 100%;">' +
            '</div>' +
            '</div>' +
            
            '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">' +
            '<div>' +
            '<label style="display: block; margin-bottom: 0.25rem; font-size: 0.875rem;">Undvika</label>' +
            '<input type="number" id="monsterUndvikaInput" class="input-field" value="10" min="1" style="width: 100%;">' +
            '</div>' +
            '<div>' +
            '<label style="display: block; margin-bottom: 0.25rem; font-size: 0.875rem;">Förflyttning</label>' +
            '<input type="number" id="monsterMovementInput" class="input-field" value="10" min="1" style="width: 100%;">' +
            '</div>' +
            '</div>' +
            
            '<div>' +
            '<label style="display: block; margin-bottom: 0.25rem; font-size: 0.875rem;">Initiativkort (1-10)</label>' +
            '<input type="number" id="monsterInitInput" class="input-field" value="5" min="1" max="10" style="width: 100%;">' +
            '</div>' +
            
            '<div>' +
            '<label style="display: block; margin-bottom: 0.25rem; font-size: 0.875rem;">Attacker (JSON: [{name: "Bett", damage: "1T8"}])</label>' +
            '<textarea id="monsterAttacksInput" class="input-field" rows="3" placeholder=\'[{"name": "Bett", "damage": "1T8"}]\' style="width: 100%; font-family: monospace; font-size: 0.875rem;"></textarea>' +
            '</div>' +
            
            '</div>' +
            
            '<div style="display: flex; gap: 1rem; margin-top: 1.5rem;">' +
            '<button class="btn btn-outline" style="flex: 1;" onclick="GameModeUI.closeModal(\'addMonsterModalOverlay\')">Avbryt</button>' +
            '<button class="btn btn-gold" style="flex: 1;" onclick="GameModeUI.submitCustomMonster()">Lägg till</button>' +
            '</div>' +
            
            '</div>' +
            '</div>';
        
        overlay.innerHTML = modalHTML;
        document.body.appendChild(overlay);
        
        // Focus first input
        setTimeout(function() {
            var input = document.getElementById('monsterNameInput');
            if (input) input.focus();
        }, 100);
    },
    
    // Add preset monster
    addPresetMonster: function(name, hp, armor, undvika, movement, attacks) {
        var self = this;
        
        var monster = {
            name: name,
            hp: hp,
            maxHp: hp,
            armor: armor,
            undvika: undvika,
            movement: movement,
            attacks: attacks || [],
            initiativkort: Math.floor(Math.random() * 10) + 1
        };
        
        GameModeService.addMonster(this.currentSession.id, monster)
            .then(function() {
                return db.collection('gameSessions').doc(self.currentSession.id).get();
            })
            .then(function(doc) {
                if (doc.exists) {
                    self.currentSession = Object.assign({ id: doc.id }, doc.data());
                    self.combatLog = self.safeCombatLog(doc.data());
                    self.addLogEntry('Monster tillagt: ' + name, 'system');
                    self.render();
                    self.closeModal('addMonsterModalOverlay');
                }
            })
            .catch(function(error) {
                console.error('Error adding monster:', error);
                alert('Kunde inte lägga till monster: ' + error.message);
            });
    },
    
    // Submit custom monster
    submitCustomMonster: function() {
        var name = document.getElementById('monsterNameInput').value.trim();
        var hp = parseInt(document.getElementById('monsterHPInput').value, 10);
        var armor = parseInt(document.getElementById('monsterArmorInput').value, 10);
        var undvika = parseInt(document.getElementById('monsterUndvikaInput').value, 10);
        var movement = parseInt(document.getElementById('monsterMovementInput').value, 10);
        var initCard = parseInt(document.getElementById('monsterInitInput').value, 10);
        var attacksText = document.getElementById('monsterAttacksInput').value.trim();
        
        if (!name) {
            alert('Monsternamn krävs');
            return;
        }
        
        var attacks = [];
        if (attacksText) {
            try {
                attacks = JSON.parse(attacksText);
            } catch (e) {
                alert('Ogiltigt JSON-format för attacker. Exempel: [{"name": "Bett", "damage": "1T8"}]');
                return;
            }
        }
        
        var self = this;
        var monster = {
            name: name,
            hp: hp,
            maxHp: hp,
            armor: armor,
            undvika: undvika,
            movement: movement,
            attacks: attacks,
            initiativkort: initCard
        };
        
        GameModeService.addMonster(this.currentSession.id, monster)
            .then(function() {
                return db.collection('gameSessions').doc(self.currentSession.id).get();
            })
            .then(function(doc) {
                if (doc.exists) {
                    self.currentSession = Object.assign({ id: doc.id }, doc.data());
                    self.combatLog = self.safeCombatLog(doc.data());
                    self.addLogEntry('Monster tillagt: ' + name, 'system');
                    self.render();
                    self.closeModal('addMonsterModalOverlay');
                }
            })
            .catch(function(error) {
                console.error('Error adding monster:', error);
                alert('Kunde inte lägga till monster: ' + error.message);
            });
    },
    
    // Remove monster
    removeMonster: function(monsterId) {
        var self = this;
        var monster = this.monsters.find(function(m) { return m.id === monsterId; });
        if (!monster) return;
        
        if (!confirm('Ta bort ' + monster.name + '?')) return;
        
        GameModeService.removeMonster(this.currentSession.id, monsterId)
            .then(function() {
                return db.collection('gameSessions').doc(self.currentSession.id).get();
            })
            .then(function(doc) {
                if (doc.exists) {
                    self.currentSession = Object.assign({ id: doc.id }, doc.data());
                    self.combatLog = self.safeCombatLog(doc.data());
                    self.addLogEntry('Monster borttaget: ' + monster.name, 'system');
                    self.render();
                }
            })
            .catch(function(error) {
                console.error('Error removing monster:', error);
                alert('Kunde inte ta bort monster: ' + error.message);
            });
    },
    
    // Open Expanded Character Modal
    openExpandedCharacterModal: function(characterId) {
        var char = this.characters.find(function(c) { return c.id === characterId; });
        if (!char) return;
        
        var overlay = document.createElement('div');
        overlay.className = 'gm-modal-overlay';
        overlay.id = 'expandedCharModalOverlay';
        
        var attrs = char.attributes || {};
        var maxKp = attrs.FYS || 0;
        var maxVp = attrs.PSY || 0;
        var kp = char.currentKP !== undefined ? char.currentKP : maxKp;
        var vp = char.currentVP !== undefined ? char.currentVP : maxVp;
        
        var modalHTML = '<div class="gm-modal-content golden-frame" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">' +
            '<span class="gm-frame-bl"></span><span class="gm-frame-br"></span>' +
            '<button class="gm-modal-close" onclick="GameModeUI.closeModal(\'expandedCharModalOverlay\')">✕</button>' +
            
            '<div style="text-align: center; margin-bottom: 2rem;">' +
            '<div style="font-size: 3rem; margin-bottom: 0.5rem;">' + getKinIcon(char.kin || 'default') + '</div>' +
            '<h1 style="margin-bottom: 0.5rem;">' + char.name + '</h1>' +
            '<div style="color: var(--text-muted);">' + (char.kin || '') + ' • ' + (char.profession || '') + '</div>' +
            '</div>' +
            
            // Attributes Grid
            '<div style="margin-bottom: 2rem;">' +
            '<h3 style="margin-bottom: 1rem;">Attribut</h3>' +
            '<div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 1rem;">';
        
        ['STY', 'FYS', 'SMI', 'INT', 'PSY', 'KAR'].forEach(function(attr) {
            var value = attrs[attr] || 0;
            modalHTML += '<div style="text-align: center; padding: 1rem; background: var(--card-bg); border-radius: 8px;">' +
                '<div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.25rem;">' + attr + '</div>' +
                '<div style="font-size: 1.5rem; font-weight: bold;">' + value + '</div>' +
                '</div>';
        });
        
        modalHTML += '</div></div>';
        
        // KP/VP with clickable pips
        modalHTML += '<div style="margin-bottom: 2rem;">' +
            '<h3 style="margin-bottom: 1rem;">Kroppspoäng & Viljepoäng</h3>' +
            '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">' +
            
            '<div style="padding: 1rem; background: var(--card-bg); border-radius: 8px;">' +
            '<div style="font-weight: bold; margin-bottom: 0.5rem;">KP: ' + kp + '/' + maxKp + '</div>' +
            '<div style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.5rem;">';
        
        for (var i = 1; i <= maxKp; i++) {
            var pipClass = 'gm-pip';
            if (i <= kp) pipClass += ' filled-kp';
            modalHTML += '<span class="' + pipClass + '" onclick="GameModeUI.handlePipClick(\'' + characterId + '\', \'currentKP\', ' + i + ')" style="cursor: pointer;">●</span>';
        }
        
        modalHTML += '</div></div>' +
            
            '<div style="padding: 1rem; background: var(--card-bg); border-radius: 8px;">' +
            '<div style="font-weight: bold; margin-bottom: 0.5rem;">VP: ' + vp + '/' + maxVp + '</div>' +
            '<div style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.5rem;">';
        
        for (var i = 1; i <= maxVp; i++) {
            var pipClass = 'gm-pip';
            if (i <= vp) pipClass += ' filled-vp';
            modalHTML += '<span class="' + pipClass + '" onclick="GameModeUI.handlePipClick(\'' + characterId + '\', \'currentVP\', ' + i + ')" style="cursor: pointer;">●</span>';
        }
        
        modalHTML += '</div></div>' +
            
            '</div></div>';
        
        // Skills & Weapon Skills
        modalHTML += '<div style="margin-bottom: 2rem;">' +
            '<h3 style="margin-bottom: 1rem;">Färdigheter & Vapenfärdigheter</h3>' +
            '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">' +
            
            '<div>' +
            '<h4 style="margin-bottom: 0.5rem;">Färdigheter</h4>' +
            '<div style="display: flex; flex-direction: column; gap: 0.25rem;">';
        
        if (char.skills) {
            for (var skillName in char.skills) {
                var skill = char.skills[skillName];
                if (skill.value > 0 || skill.isCore) {
                    modalHTML += '<div style="display: flex; justify-content: space-between; padding: 0.25rem 0.5rem; background: var(--card-bg); border-radius: 4px;">' +
                        '<span>' + skillName + ' (' + skill.attr + ')</span>' +
                        '<span>' + skill.value + '</span>' +
                        '</div>';
                }
            }
        }
        
        modalHTML += '</div></div>' +
            
            '<div>' +
            '<h4 style="margin-bottom: 0.5rem;">Vapenfärdigheter</h4>' +
            '<div style="display: flex; flex-direction: column; gap: 0.25rem;">';
        
        if (char.weaponSkills) {
            for (var skillName in char.weaponSkills) {
                var skill = char.weaponSkills[skillName];
                if (skill.value > 0 || skill.isCore) {
                    modalHTML += '<div style="display: flex; justify-content: space-between; padding: 0.25rem 0.5rem; background: var(--card-bg); border-radius: 4px;">' +
                        '<span>' + skillName + ' (' + skill.attr + ')</span>' +
                        '<span>' + skill.value + '</span>' +
                        '</div>';
                }
            }
        }
        
        modalHTML += '</div></div>' +
            
            '</div></div>';
        
        // Weapons
        if (char.weapons && char.weapons.length > 0) {
            modalHTML += '<div style="margin-bottom: 2rem;">' +
                '<h3 style="margin-bottom: 1rem;">⚔️ Vapen</h3>' +
                '<table style="width: 100%; border-collapse: collapse;">' +
                '<thead>' +
                '<tr style="background: var(--card-bg);">' +
                '<th style="padding: 0.5rem; text-align: left;">Namn</th>' +
                '<th style="padding: 0.5rem; text-align: left;">Grepp</th>' +
                '<th style="padding: 0.5rem; text-align: left;">Skada</th>' +
                '<th style="padding: 0.5rem; text-align: left;">Räckvidd</th>' +
                '</tr>' +
                '</thead>' +
                '<tbody>';
            
            char.weapons.forEach(function(weapon) {
                if (weapon.name) {
                    modalHTML += '<tr>' +
                        '<td style="padding: 0.5rem;">' + weapon.name + '</td>' +
                        '<td style="padding: 0.5rem;">' + (weapon.grip || '-') + '</td>' +
                        '<td style="padding: 0.5rem;">' + (weapon.damage || '-') + '</td>' +
                        '<td style="padding: 0.5rem;">' + (weapon.range || '-') + '</td>' +
                        '</tr>';
                }
            });
            
            modalHTML += '</tbody></table></div>';
        }
        
        // Equipment & Currency
        modalHTML += '<div style="margin-bottom: 2rem;">' +
            '<h3 style="margin-bottom: 1rem;">🎒 Utrustning & Mynt</h3>';
        
        if (char.inventory && char.inventory.length > 0) {
            modalHTML += '<div style="margin-bottom: 1rem;">' + char.inventory.join(', ') + '</div>';
        }
        
        var currency = char.currency || { guld: 0, silver: 0, brons: 0 };
        modalHTML += '<div style="display: flex; gap: 1rem;">' +
            '<span>💰 Guld: ' + currency.guld + '</span>' +
            '<span>⚪ Silver: ' + currency.silver + '</span>' +
            '<span>🟤 Brons: ' + currency.brons + '</span>' +
            '</div>';
        
        modalHTML += '</div>';
        
        modalHTML += '</div>';
        
        overlay.innerHTML = modalHTML;
        document.body.appendChild(overlay);
    },
    
    // Close modal
    closeModal: function(overlayId) {
        var overlay = document.getElementById(overlayId);
        if (overlay) {
            overlay.remove();
        }
    },
    
    // Save notes
    saveNotes: function(event) {
        var textarea = document.getElementById('gmNotesTextarea');
        if (!textarea) return;
        
        GameModeService.updateNotes(this.currentSession.id, textarea.value)
            .then(function() {
                // Show brief success indicator
                var btn = event ? event.target : null;
                if (btn) {
                    var originalText = btn.textContent;
                    btn.textContent = '✓ Sparat!';
                    setTimeout(function() {
                        btn.textContent = originalText;
                    }, 1500);
                }
            })
            .catch(function(error) {
                console.error('Error saving notes:', error);
                alert('Kunde inte spara anteckningar: ' + error.message);
            });
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
