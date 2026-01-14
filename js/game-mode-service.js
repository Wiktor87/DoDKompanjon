// Game Mode Service - Manages DM game sessions with real-time tracking
var GameModeService = {
    // Start a new game session
    startSession: function(partyId) {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error('Inte inloggad'));
        
        var session = {
            partyId: partyId,
            ownerId: user.uid,
            startedAt: firebase.firestore.FieldValue.serverTimestamp(),
            endedAt: null,
            active: true,
            initiative: [],
            currentTurnIndex: 0,
            round: 1,
            notes: '',
            monsters: []
        };
        
        return db.collection('gameSessions').add(session).then(function(ref) {
            return Object.assign({ id: ref.id }, session);
        });
    },
    
    // End current session
    endSession: function(sessionId) {
        return db.collection('gameSessions').doc(sessionId).update({
            active: false,
            endedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },
    
    // Get active session for party
    getActiveSession: function(partyId) {
        return db.collection('gameSessions')
            .where('partyId', '==', partyId)
            .where('active', '==', true)
            .limit(1)
            .get()
            .then(function(snapshot) {
                if (snapshot.empty) return null;
                var doc = snapshot.docs[0];
                return Object.assign({ id: doc.id }, doc.data());
            });
    },
    
    // Update character stats (KP, VP, conditions)
    updateCharacterStat: function(characterId, field, value) {
        var update = {};
        update[field] = value;
        update.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        return db.collection('characters').doc(characterId).update(update);
    },
    
    // Listen to real-time character updates
    listenToPartyCharacters: function(characterIds, callback) {
        if (!characterIds || characterIds.length === 0) {
            callback([]);
            return function() {};
        }
        
        // Firestore 'in' queries are limited to 10 items
        // If more than 10 characters, we'll need to batch
        if (characterIds.length <= 10) {
            return db.collection('characters')
                .where(firebase.firestore.FieldPath.documentId(), 'in', characterIds)
                .onSnapshot(function(snapshot) {
                    var characters = [];
                    snapshot.forEach(function(doc) {
                        characters.push(Object.assign({ id: doc.id }, doc.data()));
                    });
                    callback(characters);
                });
        } else {
            // For more than 10 characters, listen to each individually
            var unsubscribes = [];
            var allCharacters = [];
            var loadedCount = 0;
            
            characterIds.forEach(function(charId, index) {
                var unsub = db.collection('characters').doc(charId)
                    .onSnapshot(function(doc) {
                        if (doc.exists) {
                            allCharacters[index] = Object.assign({ id: doc.id }, doc.data());
                            loadedCount++;
                            if (loadedCount === characterIds.length) {
                                callback(allCharacters.filter(function(c) { return c; }));
                            }
                        }
                    });
                unsubscribes.push(unsub);
            });
            
            return function() {
                unsubscribes.forEach(function(unsub) { unsub(); });
            };
        }
    },
    
    // Initiative management - roll for all characters based on SMI
    rollInitiative: function(characters) {
        return characters.map(function(char) {
            var smi = (char.attributes && char.attributes.SMI) || 10;
            var roll = Math.floor(Math.random() * 10) + 1; // 1d10 (range 1-10)
            return {
                oderId: char.id,
                type: 'character',
                name: char.name,
                smi: smi,
                roll: roll,
                total: smi + roll
            };
        }).sort(function(a, b) {
            return b.total - a.total; // Highest first
        });
    },
    
    // Set initiative order
    setInitiativeOrder: function(sessionId, order) {
        return db.collection('gameSessions').doc(sessionId).update({
            initiative: order,
            currentTurnIndex: 0,
            round: 1
        });
    },
    
    // Next turn in initiative
    nextTurn: function(sessionId) {
        return db.collection('gameSessions').doc(sessionId).get().then(function(doc) {
            if (!doc.exists) throw new Error('Session not found');
            
            var session = doc.data();
            var initiative = session.initiative || [];
            var currentIndex = session.currentTurnIndex || 0;
            var round = session.round || 1;
            
            var nextIndex = currentIndex + 1;
            if (nextIndex >= initiative.length) {
                nextIndex = 0;
                round++;
            }
            
            return db.collection('gameSessions').doc(sessionId).update({
                currentTurnIndex: nextIndex,
                round: round
            });
        });
    },
    
    // Mass actions - damage all characters
    damageAll: function(characterIds, amount) {
        var results = { updated: [], skipped: [], errors: [] };
        var promises = characterIds.map(function(charId) {
            return db.collection('characters').doc(charId).get().then(function(doc) {
                if (!doc.exists) {
                    results.skipped.push({ id: charId, reason: 'not found' });
                    return;
                }
                var char = doc.data();
                var attrs = char.attributes || {};
                var maxKP = attrs.FYS || 0;
                var currentKP = char.currentKP !== undefined ? char.currentKP : maxKP;
                var newKP = Math.max(0, currentKP - amount);
                return db.collection('characters').doc(charId).update({
                    currentKP: newKP,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(function() {
                    results.updated.push({ id: charId, name: char.name });
                }).catch(function(error) {
                    results.skipped.push({ id: charId, name: char.name, reason: 'permission denied' });
                });
            });
        });
        return Promise.all(promises).then(function() {
            return results;
        });
    },
    
    // Mass actions - rest all characters
    restAll: function(characterIds, restType) {
        var results = { updated: [], skipped: [], errors: [] };
        var promises = characterIds.map(function(charId) {
            return db.collection('characters').doc(charId).get().then(function(doc) {
                if (!doc.exists) {
                    results.skipped.push({ id: charId, reason: 'not found' });
                    return;
                }
                var char = doc.data();
                var attrs = char.attributes || {};
                var maxKP = attrs.FYS || 0;
                var maxVP = attrs.PSY || 0;
                var currentKP = char.currentKP !== undefined ? char.currentKP : maxKP;
                var currentVP = char.currentVP !== undefined ? char.currentVP : maxVP;
                
                var update = {
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                if (restType === 'short') {
                    // Short rest: restore half KP
                    update.currentKP = Math.min(maxKP, currentKP + Math.floor(maxKP / 2));
                } else if (restType === 'long') {
                    // Long rest: restore all KP and VP
                    update.currentKP = maxKP;
                    update.currentVP = maxVP;
                }
                
                return db.collection('characters').doc(charId).update(update).then(function() {
                    results.updated.push({ id: charId, name: char.name });
                }).catch(function(error) {
                    results.skipped.push({ id: charId, name: char.name, reason: 'permission denied' });
                });
            });
        });
        return Promise.all(promises).then(function() {
            return results;
        });
    },
    
    // Session notes
    updateNotes: function(sessionId, notes) {
        return db.collection('gameSessions').doc(sessionId).update({
            notes: notes
        });
    },
    
    // Monster tracking
    addMonster: function(sessionId, monster) {
        return db.collection('gameSessions').doc(sessionId).get().then(function(doc) {
            if (!doc.exists) throw new Error('Session not found');
            
            var session = doc.data();
            var monsters = session.monsters || [];
            
            var newMonster = Object.assign({
                id: 'monster_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                name: 'Monster',
                hp: 10,
                maxHp: 10,
                armor: 0,
                undvika: 10,
                movement: 10,
                notes: ''
            }, monster);
            
            monsters.push(newMonster);
            
            return db.collection('gameSessions').doc(sessionId).update({
                monsters: monsters
            });
        });
    },
    
    removeMonster: function(sessionId, monsterId) {
        return db.collection('gameSessions').doc(sessionId).get().then(function(doc) {
            if (!doc.exists) throw new Error('Session not found');
            
            var session = doc.data();
            var monsters = session.monsters || [];
            var filtered = monsters.filter(function(m) { return m.id !== monsterId; });
            
            return db.collection('gameSessions').doc(sessionId).update({
                monsters: filtered
            });
        });
    },
    
    updateMonster: function(sessionId, monsterId, updates) {
        return db.collection('gameSessions').doc(sessionId).get().then(function(doc) {
            if (!doc.exists) throw new Error('Session not found');
            
            var session = doc.data();
            var monsters = session.monsters || [];
            var updated = monsters.map(function(m) {
                if (m.id === monsterId) {
                    return Object.assign({}, m, updates);
                }
                return m;
            });
            
            return db.collection('gameSessions').doc(sessionId).update({
                monsters: updated
            });
        });
    }
};
