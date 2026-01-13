// Party Service
var PartyService = {
    generateInviteCode: function() {
        // Excluding confusing chars: I, L, O, 0, 1
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var code = '';
        for (var i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },
    
    ensureUniqueInviteCode: function(retryCount) {
        retryCount = retryCount || 0;
        var maxRetries = 10;
        
        if (retryCount >= maxRetries) {
            return Promise.reject(new Error('Kunde inte generera en unik inbjudningskod efter ' + maxRetries + ' försök'));
        }
        
        var self = this;
        var code = this.generateInviteCode();
        
        // Check if code exists
        return db.collection('parties')
            .where('inviteCode', '==', code)
            .limit(1)
            .get()
            .then(function(snapshot) {
                if (snapshot.empty) {
                    return code;
                } else {
                    // Code exists, try again
                    return self.ensureUniqueInviteCode(retryCount + 1);
                }
            });
    },
    
    createParty: function(data) {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error('Inte inloggad'));
        
        var self = this;
        
        return this.ensureUniqueInviteCode().then(function(inviteCode) {
            var party = Object.assign({}, data, {
                ownerId: user.uid,
                ownerName: user.displayName || user.email,
                memberIds: [user.uid],
                characterIds: [],
                inviteCode: inviteCode,
                notes: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return db.collection('parties').add(party).then(function(ref) {
                return Object.assign({ id: ref.id }, party);
            });
        });
    },
    
    searchPartyByCode: function(code) {
        if (!code || !code.trim()) {
            return Promise.reject(new Error('Inbjudningskod krävs'));
        }
        
        return db.collection('parties')
            .where('inviteCode', '==', code.toUpperCase().trim())
            .limit(1)
            .get()
            .then(function(snapshot) {
                if (snapshot.empty) {
                    throw new Error('Ingen grupp hittades med den koden');
                }
                var doc = snapshot.docs[0];
                return Object.assign({ id: doc.id }, doc.data());
            });
    },
    
    sendMessage: function(partyId, message) {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error('Inte inloggad'));
        
        var msg = {
            partyId: partyId,
            userId: user.uid,
            userName: user.displayName || user.email,
            message: message,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        return db.collection('parties').doc(partyId)
            .collection('messages').add(msg);
    },
    
    getMessages: function(partyId, limit) {
        limit = limit || 50;
        return db.collection('parties').doc(partyId)
            .collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get()
            .then(function(snapshot) {
                var messages = [];
                snapshot.forEach(function(doc) {
                    messages.push(Object.assign({ id: doc.id }, doc.data()));
                });
                return messages.reverse(); // Show oldest first
            });
    },
    
    listenToMessages: function(partyId, callback) {
        return db.collection('parties').doc(partyId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot(function(snapshot) {
                var messages = [];
                snapshot.forEach(function(doc) {
                    messages.push(Object.assign({ id: doc.id }, doc.data()));
                });
                callback(messages);
            });
    },
    
    getUserParties: function() {
        var user = getCurrentUser();
        if (!user) {
            return Promise.resolve([]);
        }
        
        return db.collection('parties')
            .where('memberIds', 'array-contains', user.uid)
            .get()
            .then(function(snapshot) {
                var parties = [];
                snapshot.forEach(function(doc) {
                    parties.push(Object.assign({ id: doc.id }, doc.data()));
                });
                parties.sort(function(a, b) {
                    var aTime = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
                    var bTime = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
                    return bTime - aTime;
                });
                return parties;
            });
    },
    
    getParty: function(id) {
        return db.collection('parties').doc(id).get().then(function(doc) {
            if (!doc.exists) throw new Error('Grupp inte hittad');
            return Object.assign({ id: doc.id }, doc.data());
        });
    },
    
    updateParty: function(id, updates) {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error('Inte inloggad'));
        
        updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        return db.collection('parties').doc(id).update(updates);
    },
    
    deleteParty: function(id) {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error('Inte inloggad'));
        return db.collection('parties').doc(id).delete();
    },
    
    addCharacterToParty: function(partyId, characterId) {
        return db.collection('parties').doc(partyId).update({
            characterIds: firebase.firestore.FieldValue.arrayUnion(characterId),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },
    
    removeCharacterFromParty: function(partyId, characterId) {
        return db.collection('parties').doc(partyId).update({
            characterIds: firebase.firestore.FieldValue.arrayRemove(characterId),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
};

console.log('✅ PartyService loaded');
