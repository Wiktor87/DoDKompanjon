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
        var kp = character.kp || 0;
        var maxKp = character.maxKp || 0;
        var vp = character.vp || 0;
        var maxVp = character.maxVp || 0;
        
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
            html += '<span class="' + pipClass + '" onclick="GameModeUI.handlePipClick(\'' + character.id + '\', \'kp\', ' + i + ')">●</span>';
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
            html += '<span class="' + pipClass + '" onclick="GameModeUI.handlePipClick(\'' + character.id + '\', \'vp\', ' + i + ')">●</span>';
        }
        html += '</div>' +
            '<div class="tracker-value">' + vp + '/' + maxVp + '</div>' +
            '</div>';
        
        // Stats
        var armor = character.armor || 0;
        var damageBonus = character.damageBonus || 0;
        html += '<div class="compact-stats">' +
            '<div class="stat-item">🛡️ ' + armor + '</div>' +
            '<div class="stat-item">⚔️ ' + (damageBonus >= 0 ? '+' : '') + damageBonus + '</div>' +
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
        var html = '<div class="expanded-view">' +
            '<div class="expanded-header">' +
            '<h2>' + character.name + '</h2>' +
            '<p>' + (character.kin || '') + ' • ' + (character.profession || '') + '</p>' +
            '</div>';
        
        // Full stats
        html += '<div class="expanded-stats">';
        
        var attributes = ['STY', 'SMI', 'INT', 'KAR', 'FYS', 'PSY', 'STO'];
        attributes.forEach(function(attr) {
            var value = (character.attributes && character.attributes[attr]) || 0;
            html += '<div class="stat-box">' +
                '<div class="stat-name">' + attr + '</div>' +
                '<div class="stat-value">' + value + '</div>' +
                '</div>';
        });
        
        html += '</div>';
        
        // Conditions toggles
        html += '<div class="conditions-section">' +
            '<h3>Tillstånd</h3>' +
            '<div class="condition-toggles">';
        
        var allConditions = ['Utmattad', 'Krasslig', 'Omtöcknad', 'Arg', 'Rädd', 'Uppgiven'];
        var self = this;
        allConditions.forEach(function(cond) {
            var isActive = character[cond.toLowerCase()] === true;
            var btnClass = 'condition-toggle-btn' + (isActive ? ' active' : '');
            html += '<button class="' + btnClass + '" onclick="GameModeUI.handleConditionToggle(\'' + character.id + '\', \'' + cond.toLowerCase() + '\')">' + cond + '</button>';
        });
        
        html += '</div></div>';
        
        html += '</div>';
        
        return html;
    },
    
    // Render sidebar card
    renderSidebarCard: function(character) {
        var kp = character.kp || 0;
        var maxKp = character.maxKp || 0;
        var vp = character.vp || 0;
        var maxVp = character.maxVp || 0;
        
        var html = '<div class="sidebar-card" onclick="GameModeUI.focusCharacter(\'' + character.id + '\')">' +
            '<div class="sidebar-card-name">' + character.name + '</div>' +
            '<div class="sidebar-card-stats">' +
            '<div>KP: ' + kp + '/' + maxKp + '</div>' +
            '<div>VP: ' + vp + '/' + maxVp + '</div>' +
            '</div>' +
            '</div>';
        
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
                
                html += '<div class="' + itemClass + '">' +
                    '<span class="initiative-number">' + (index + 1) + '.</span>' +
                    '<span class="initiative-name">' + item.name + '</span>' +
                    '<span class="initiative-total">(' + item.total + ')</span>' +
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
    
    // Handle KP/VP pip clicks
    handlePipClick: function(characterId, field, newValue) {
        GameModeService.updateCharacterStat(characterId, field, newValue)
            .catch(function(error) {
                console.error('Error updating stat:', error);
                alert('Kunde inte uppdatera: ' + error.message);
            });
    },
    
    // Handle condition toggle
    handleConditionToggle: function(characterId, condition) {
        var char = this.characters.find(function(c) { return c.id === characterId; });
        if (!char) return;
        
        var newValue = !char[condition];
        GameModeService.updateCharacterStat(characterId, condition, newValue)
            .catch(function(error) {
                console.error('Error toggling condition:', error);
                alert('Kunde inte uppdatera tillstånd: ' + error.message);
            });
    },
    
    // Get active conditions for a character
    getActiveConditions: function(character) {
        var conditions = [];
        var allConds = ['utmattad', 'krasslig', 'omtöcknad', 'arg', 'rädd', 'uppgiven'];
        
        allConds.forEach(function(cond) {
            if (character[cond] === true) {
                conditions.push(cond.charAt(0).toUpperCase() + cond.slice(1));
            }
        });
        
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
        
        if (self.characters.length === 0) {
            alert('Inga karaktärer att slå initiativ för');
            return;
        }
        
        var initiative = GameModeService.rollInitiative(self.characters);
        
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
            .then(function() {
                console.log('Damage applied to all characters');
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
            .then(function() {
                console.log('Rest applied to all characters');
            })
            .catch(function(error) {
                console.error('Error applying rest:', error);
                alert('Kunde inte applicera vila: ' + error.message);
            });
    },
    
    // Open add monster modal
    openAddMonsterModal: function() {
        var name = prompt('Monsternamn:');
        if (!name) return;
        
        var hp = prompt('HP:', '10');
        hp = parseInt(hp, 10);
        if (isNaN(hp)) hp = 10;
        
        var armor = prompt('Rustning:', '0');
        armor = parseInt(armor, 10);
        if (isNaN(armor)) armor = 0;
        
        var monster = {
            name: name,
            hp: hp,
            maxHp: hp,
            armor: armor,
            notes: ''
        };
        
        GameModeService.addMonster(this.currentSession.id, monster)
            .then(function() {
                console.log('Monster added');
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
