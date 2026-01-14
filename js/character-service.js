// Character Service
var CharacterService = {
    createCharacter: function(data) {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error('Inte inloggad'));
        
        var character = Object.assign({}, data, {
            ownerId: user.uid,
            ownerName: user.displayName || user.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return db.collection('characters').add(character).then(function(ref) {
            return Object.assign({ id: ref.id }, character);
        });
    },
    
    getUserCharacters: function() {
        var user = getCurrentUser();
        if (!user) {
            console.log('[CharacterService] No user');
            return Promise.resolve([]);
        }
        
        console.log('[CharacterService] Fetching for:', user.uid);
        
        return db.collection('characters')
            .where('ownerId', '==', user.uid)
            .get()
            .then(function(snapshot) {
                console.log('[CharacterService] Found:', snapshot.size);
                var characters = [];
                snapshot.forEach(function(doc) {
                    characters.push(Object.assign({ id: doc.id }, doc.data()));
                });
                characters.sort(function(a, b) {
                    var aTime = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
                    var bTime = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
                    return bTime - aTime;
                });
                return characters;
            });
    },
    
    getCharacter: function(id) {
        return db.collection('characters').doc(id).get().then(function(doc) {
            if (!doc.exists) throw new Error('Karaktär inte hittad');
            return Object.assign({ id: doc.id }, doc.data());
        });
    },
    
    updateCharacter: function(id, updates) {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error('Inte inloggad'));
        
        updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        return db.collection('characters').doc(id).update(updates);
    },
    
    deleteCharacter: function(id) {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error('Inte inloggad'));
        return db.collection('characters').doc(id).delete();
    }
};

console.log('✅ CharacterService loaded');

    // Get multiple characters by their IDs (for party view)
    getCharactersByIds:  function(characterIds) {
        if (!characterIds || characterIds.length === 0) {
            return Promise.resolve([]);
        }
        
        // Firestore 'in' queries are limited to 10 items, so we need to batch
        var batches = [];
        for (var i = 0; i < characterIds.length; i += 10) {
            var batch = characterIds. slice(i, i + 10);
            batches.push(
                db.collection('characters')
                    .where(firebase.firestore. FieldPath.documentId(), 'in', batch)
                    .get()
                    .then(function(snapshot) {
                        var chars = [];
                        snapshot. forEach(function(doc) {
                            chars.push(Object.assign({ id: doc.id }, doc.data()));
                        });
                        return chars;
                    })
            );
        }
        
        return Promise. all(batches).then(function(results) {
            // Flatten the array of arrays
            return results.reduce(function(acc, curr) {
                return acc.concat(curr);
            }, []);
        });
    },
