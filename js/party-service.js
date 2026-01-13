// Party Service
var PartyService = {
    createParty: function(data) {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error('Inte inloggad'));
        
        var party = Object.assign({}, data, {
            ownerId: user.uid,
            ownerName: user.displayName || user.email,
            memberIds: [user.uid],
            characterIds: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return db.collection('parties').add(party).then(function(ref) {
            return Object.assign({ id: ref.id }, party);
        });
    },
    
    getUserParties: function() {
        var user = getCurrentUser();
        if (!user) {
            console.log('[PartyService] No user');
            return Promise.resolve([]);
        }
        
        console.log('[PartyService] Fetching parties for:', user.uid);
        
        return db.collection('parties')
            .where('memberIds', 'array-contains', user.uid)
            .get()
            .then(function(snapshot) {
                console.log('[PartyService] Found:', snapshot.size);
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
