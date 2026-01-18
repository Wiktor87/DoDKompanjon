// Homebrew Service - CRUD operations for homebrew content
var HomebrewService = {
    // Category definitions
    CATEGORIES: {
        abilities: { 
            label: 'Heroiska Förmågor', 
            // icon: '⚔️',
			icon: '<img src="icons/CombatAction.gif" height="32" width="32" class="custom-icon-img" alt="Abilities">',
            fields: ['name', 'requirement', 'wp', 'abilityType', 'description']
        },
        monsters: { 
            label: 'Monster & Varelser', 
            // icon: '🐉',
			icon: '<img src="icons/Enemy.gif" height="32" width="32" class="custom-icon-img" alt="Monsters">',
            fields: ['name', 'attributes', 'currentKP', 'maxKP', 'currentVP', 'maxVP', 'equipment', 'abilities', 'weapons', 'armor', 'skills', 'movement', 'size', 'description']
        },
        kin: { 
            label: 'Släkten', 
            // icon: '👥',
			icon: '<img src="icons/NewCharacter.gif" height="32" width="32" class="custom-icon-img" alt="Kin">',
            fields: ['name', 'ability', 'statModifiers', 'description']
        },
        professions: { 
            label: 'Yrken', 
            // icon: '🎭',
			icon: '<img src="icons/Quill.gif" height="32" width="32" class="custom-icon-img" alt="Professions">',
            fields: ['name', 'skills', 'abilities', 'equipment', 'description']
        },
        spells: { 
            label: 'Besvärjelser', 
            // icon: '✨',
			icon: '<img src="icons/Scroll.gif" height="32" width="32" class="custom-icon-img" alt="Spells">',
            fields: ['name', 'school', 'wp', 'range', 'duration', 'effect', 'description']
        },
        items: { 
            label: 'Magiska Föremål', 
            // icon: '💎',
			icon: '<img src="icons/Magic.gif" height="32" width="32" class="custom-icon-img" alt="Magic Items">',
            fields: ['name', 'itemType', 'rarity', 'effect', 'value', 'description']
        },
        equipment: {
            label: 'Utrustning',
            // icon: '⚔️',
            icon: '<img src="icons/Treasure.gif" height="32" width="32" class="custom-icon-img" alt="Equipment">',
            fields: ['name', 'equipmentType', 'weight', 'cost', 'description']
        }
    },

    // Create a new homebrew item
    createHomebrew: function(type, data, visibility, groupId, availableForCharacters) {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error('Inte inloggad'));
        
        // Validate input lengths for common fields
        var validatedData = validateFields(data, {
            name: INPUT_LIMITS.name,
            description: INPUT_LIMITS.description,
            requirement: INPUT_LIMITS.shortText,
            abilityType: INPUT_LIMITS.shortText,
            school: INPUT_LIMITS.shortText,
            itemType: INPUT_LIMITS.shortText,
            equipmentType: INPUT_LIMITS.shortText,
            rarity: INPUT_LIMITS.shortText,
            range: INPUT_LIMITS.shortText,
            duration: INPUT_LIMITS.shortText,
            effect: INPUT_LIMITS.description,
            size: INPUT_LIMITS.shortText,
            movement: INPUT_LIMITS.shortText
        });
        
        var homebrew = {
            type: type,
            name: validatedData.name || '',
            description: validatedData.description || '',
            authorId: user.uid,
            authorName: user.displayName || user.email,
            rating: 0,
            ratingCount: 0,
            downloads: 0,
            visibility: visibility || 'private',
            groupId: groupId || null,
            availableForCharacters: availableForCharacters || false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            data: validatedData
        };
        
        return db.collection('homebrew').add(homebrew).then(function(ref) {
            return Object.assign({ id: ref.id }, homebrew);
        });
    },

    // Get public homebrew items (for browse view)
    getPublicHomebrew: function(filters) {
        filters = filters || {};
        var query = db.collection('homebrew').where('visibility', '==', 'public');
        
        if (filters.type) {
            query = query.where('type', '==', filters.type);
        }
        
        // Add ordering
        if (filters.sortBy === 'downloads') {
            query = query.orderBy('downloads', 'desc');
        } else if (filters.sortBy === 'rating') {
            query = query.orderBy('rating', 'desc');
        } else {
            query = query.orderBy('createdAt', 'desc');
        }
        
        query = query.limit(filters.limit || 50);
        
        return query.get().then(function(snapshot) {
            var items = [];
            snapshot.forEach(function(doc) {
                items.push(Object.assign({ id: doc.id }, doc.data()));
            });
            return items;
        });
    },

    // Search homebrew
    searchHomebrew: function(searchTerm, filters) {
        filters = filters || {};
        var query = db.collection('homebrew').where('visibility', '==', 'public');
        
        if (filters.type) {
            query = query.where('type', '==', filters.type);
        }
        
        return query.get().then(function(snapshot) {
            var items = [];
            var searchLower = searchTerm.toLowerCase();
            
            snapshot.forEach(function(doc) {
                var data = doc.data();
                var name = (data.name || '').toLowerCase();
                var description = (data.description || '').toLowerCase();
                
                if (name.includes(searchLower) || description.includes(searchLower)) {
                    items.push(Object.assign({ id: doc.id }, data));
                }
            });
            
            return items;
        });
    },

    // Get user's own homebrew creations
    getUserHomebrew: function(userId) {
        if (!userId) {
            var currentUser = getCurrentUser();
            userId = currentUser ? currentUser.uid : null;
        }
        if (!userId) return Promise.resolve([]);
        
        return db.collection('homebrew')
            .where('authorId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get()
            .then(function(snapshot) {
                var items = [];
                snapshot.forEach(function(doc) {
                    items.push(Object.assign({ id: doc.id }, doc.data()));
                });
                return items;
            });
    },

    // Get saved homebrew (user's collection)
    getSavedHomebrew: function() {
        var user = getCurrentUser();
        if (!user) return Promise.resolve([]);
        
        return db.collection('homebrewCollections')
            .where('userId', '==', user.uid)
            .orderBy('savedAt', 'desc')
            .get()
            .then(function(snapshot) {
                var homebrewIds = [];
                snapshot.forEach(function(doc) {
                    homebrewIds.push(doc.data().homebrewId);
                });
                
                if (homebrewIds.length === 0) return [];
                
                // Fetch homebrew items in batches (Firestore 'in' limit is 10)
                var batches = [];
                for (var i = 0; i < homebrewIds.length; i += 10) {
                    var batch = homebrewIds.slice(i, i + 10);
                    batches.push(
                        db.collection('homebrew')
                            .where(firebase.firestore.FieldPath.documentId(), 'in', batch)
                            .get()
                            .then(function(snapshot) {
                                var items = [];
                                snapshot.forEach(function(doc) {
                                    items.push(Object.assign({ id: doc.id }, doc.data()));
                                });
                                return items;
                            })
                    );
                }
                
                return Promise.all(batches).then(function(results) {
                    return results.reduce(function(acc, curr) {
                        return acc.concat(curr);
                    }, []);
                });
            });
    },

    // Save homebrew to collection
    saveToCollection: function(homebrewId) {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error('Inte inloggad'));
        
        return db.collection('homebrewCollections').add({
            userId: user.uid,
            homebrewId: homebrewId,
            savedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
            // Increment download count
            return db.collection('homebrew').doc(homebrewId).update({
                downloads: firebase.firestore.FieldValue.increment(1)
            });
        });
    },

    // Remove from collection
    removeFromCollection: function(homebrewId) {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error('Inte inloggad'));
        
        return db.collection('homebrewCollections')
            .where('userId', '==', user.uid)
            .where('homebrewId', '==', homebrewId)
            .get()
            .then(function(snapshot) {
                var deletePromises = [];
                snapshot.forEach(function(doc) {
                    deletePromises.push(doc.ref.delete());
                });
                return Promise.all(deletePromises);
            });
    },

    // Get single homebrew item
    getHomebrew: function(id) {
        return db.collection('homebrew').doc(id).get().then(function(doc) {
            if (!doc.exists) throw new Error('Homebrew inte hittad');
            return Object.assign({ id: doc.id }, doc.data());
        });
    },

    // Update homebrew
    updateHomebrew: function(id, updates) {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error('Inte inloggad'));
        
        // Validate input lengths if data field is being updated
        if (updates.data) {
            updates.data = validateFields(updates.data, {
                name: INPUT_LIMITS.name,
                description: INPUT_LIMITS.description,
                requirement: INPUT_LIMITS.shortText,
                abilityType: INPUT_LIMITS.shortText,
                school: INPUT_LIMITS.shortText,
                itemType: INPUT_LIMITS.shortText,
                equipmentType: INPUT_LIMITS.shortText,
                rarity: INPUT_LIMITS.shortText,
                range: INPUT_LIMITS.shortText,
                duration: INPUT_LIMITS.shortText,
                effect: INPUT_LIMITS.description,
                size: INPUT_LIMITS.shortText,
                movement: INPUT_LIMITS.shortText
            });
        }
        
        // Validate top-level fields
        var validatedUpdates = validateFields(updates, {
            name: INPUT_LIMITS.name,
            description: INPUT_LIMITS.description
        });
        
        validatedUpdates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        return db.collection('homebrew').doc(id).update(validatedUpdates);
    },

    // Delete homebrew
    deleteHomebrew: function(id) {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error('Inte inloggad'));
        return db.collection('homebrew').doc(id).delete();
    },

    // Rate homebrew
    rateHomebrew: function(homebrewId, rating, review) {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error('Inte inloggad'));
        
        if (rating < 1 || rating > 5) {
            return Promise.reject(new Error('Betyg måste vara mellan 1 och 5'));
        }
        
        // TODO: There's a typo here - 'oderId' should be 'userId'
        // This requires a data migration to fix properly:
        // 1. Query all homebrewRatings documents
        // 2. Copy 'oderId' value to new 'userId' field
        // 3. Update code to use 'userId'
        // 4. Remove old 'oderId' field
        // For now, keeping 'oderId' to maintain compatibility with existing data
        
        // Check if user already rated this
        return db.collection('homebrewRatings')
            .where('homebrewId', '==', homebrewId)
            .where('oderId', '==', user.uid)
            .get()
            .then(function(snapshot) {
                if (!snapshot.empty) {
                    // Update existing rating
                    return snapshot.docs[0].ref.update({
                        rating: rating,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    // Create new rating
                    return db.collection('homebrewRatings').add({
                        homebrewId: homebrewId,
                        oderId: user.uid,
                        authorName: user.displayName || user.email,
                        rating: rating,
                        review: review || '',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }).then(function() {
                // Update homebrew average rating
                return HomebrewService.updateHomebrewRating(homebrewId);
            });
    },
    
    // Add comment (as part of rating)
    addComment: function(homebrewId, comment) {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error('Inte inloggad'));
        
        // TODO: There's a typo here - 'oderId' should be 'userId'
        // See rateHomebrew function for migration details
        
        // Check if user already has a rating
        return db.collection('homebrewRatings')
            .where('homebrewId', '==', homebrewId)
            .where('oderId', '==', user.uid)
            .get()
            .then(function(snapshot) {
                if (!snapshot.empty) {
                    // Update existing with comment
                    return snapshot.docs[0].ref.update({
                        review: comment,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    // Create new with comment (default rating 0)
                    return db.collection('homebrewRatings').add({
                        homebrewId: homebrewId,
                        oderId: user.uid,
                        authorName: user.displayName || user.email,
                        rating: 0,
                        review: comment,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            });
    },
    
    // Update homebrew average rating
    updateHomebrewRating: function(homebrewId) {
        return db.collection('homebrewRatings')
            .where('homebrewId', '==', homebrewId)
            .where('rating', '>', 0)
            .get()
            .then(function(snapshot) {
                var ratings = [];
                snapshot.forEach(function(doc) {
                    ratings.push(doc.data().rating);
                });
                
                var avg = ratings.length > 0 
                    ? ratings.reduce(function(a, b) { return a + b; }, 0) / ratings.length 
                    : 0;
                
                return db.collection('homebrew').doc(homebrewId).update({
                    rating: avg,
                    ratingCount: ratings.length
                });
            });
    },
    
    // Get ratings for a homebrew (alias for consistency)
    getHomebrewRatings: function(homebrewId) {
        return db.collection('homebrewRatings')
            .where('homebrewId', '==', homebrewId)
            .orderBy('createdAt', 'desc')
            .get()
            .then(function(snapshot) {
                var ratings = [];
                snapshot.forEach(function(doc) {
                    ratings.push(Object.assign({ id: doc.id }, doc.data()));
                });
                return ratings;
            });
    },

    
    // Get homebrew count
    getHomebrewCount: function(filters) {
        filters = filters || {};
        var query = db.collection('homebrew').where('visibility', '==', 'public');
        
        if (filters.type) {
            query = query.where('type', '==', filters.type);
        }
        
        return query.get().then(function(snapshot) {
            return snapshot.size;
        });
    },
    
    // Get available homebrew for character creator (from user's collection)
    getAvailableForCharacters: function() {
        var user = getCurrentUser();
        if (!user) return Promise.resolve([]);
        
        return this.getSavedHomebrew().then(function(items) {
            // Filter for items marked as available for characters
            return items.filter(function(item) {
                return item.availableForCharacters === true;
            });
        });
    }
};

console.log('✅ HomebrewService loaded');
