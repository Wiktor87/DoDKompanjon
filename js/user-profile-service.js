// User Profile Service - Public user profile operations
var UserProfileService = {
    // Create or update user profile
    createOrUpdateProfile: function(profileData) {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error('Inte inloggad'));
        
        // First check if profile exists to preserve memberSince
        return db.collection('userProfiles').doc(user.uid).get()
        .then(function(doc) {
            var profile = {
                userId: user.uid,
                displayName: profileData.displayName || user.displayName || user.email,
                slug: profileData.slug || UserProfileService.generateSlug(profileData.displayName || user.displayName || user.email),
                avatarUrl: profileData.avatarUrl || '',
                bannerUrl: profileData.bannerUrl || '',
                bio: profileData.bio || '',
                location: profileData.location || '',
                website: profileData.website || '',
                lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                stats: {
                    homebrewCount: 0,
                    totalDownloads: 0,
                    totalRatings: 0,
                    averageRating: 0,
                    followersCount: 0,
                    followingCount: 0
                },
                preferences: {
                    isPublic: profileData.isPublic !== undefined ? profileData.isPublic : true,
                    showActivity: profileData.showActivity !== undefined ? profileData.showActivity : true,
                    allowMessages: profileData.allowMessages !== undefined ? profileData.allowMessages : true
                },
                badges: []
            };
            
            // Only set memberSince if this is a new profile
            if (!doc.exists) {
                profile.memberSince = firebase.firestore.FieldValue.serverTimestamp();
            }
            
            return db.collection('userProfiles').doc(user.uid).set(profile, { merge: true })
                .then(function() {
                    return profile;
                });
        });
    },

    // Generate URL-friendly slug from display name
    generateSlug: function(displayName) {
        return displayName
            .toLowerCase()
            .replace(/[åä]/g, 'a')
            .replace(/ö/g, 'o')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 30);
    },

    // Get user profile by user ID
    getProfile: function(userId) {
        return db.collection('userProfiles').doc(userId).get()
            .then(function(doc) {
                if (!doc.exists) {
                    // Return basic profile if not found
                    return {
                        userId: userId,
                        displayName: 'Användare',
                        slug: 'user',
                        avatarUrl: '',
                        stats: {
                            homebrewCount: 0,
                            totalDownloads: 0,
                            averageRating: 0
                        }
                    };
                }
                return Object.assign({ id: doc.id }, doc.data());
            });
    },

    // Get profile by slug
    getProfileBySlug: function(slug) {
        return db.collection('userProfiles')
            .where('slug', '==', slug)
            .limit(1)
            .get()
            .then(function(snapshot) {
                if (snapshot.empty) {
                    throw new Error('Profil inte hittad');
                }
                var doc = snapshot.docs[0];
                return Object.assign({ id: doc.id }, doc.data());
            });
    },

    // Update profile stats (called when homebrew is created/rated/downloaded)
    updateStats: function(userId, updates) {
        var profile = db.collection('userProfiles').doc(userId);
        
        return profile.get().then(function(doc) {
            if (!doc.exists) {
                // Create profile if doesn't exist
                return UserProfileService.createOrUpdateProfile({});
            }
        }).then(function() {
            var updateData = {};
            
            if (updates.homebrewCount !== undefined) {
                updateData['stats.homebrewCount'] = firebase.firestore.FieldValue.increment(updates.homebrewCount);
            }
            if (updates.totalDownloads !== undefined) {
                updateData['stats.totalDownloads'] = firebase.firestore.FieldValue.increment(updates.totalDownloads);
            }
            if (updates.totalRatings !== undefined) {
                updateData['stats.totalRatings'] = firebase.firestore.FieldValue.increment(updates.totalRatings);
            }
            if (updates.averageRating !== undefined) {
                updateData['stats.averageRating'] = updates.averageRating;
            }
            
            updateData.lastActive = firebase.firestore.FieldValue.serverTimestamp();
            
            return profile.update(updateData);
        });
    },

    // Recalculate user stats from scratch
    recalculateStats: function(userId) {
        // Query once and calculate all stats from the same result set
        return db.collection('homebrew').where('authorId', '==', userId).get()
        .then(function(homebrewSnapshot) {
            
            var homebrewCount = homebrewSnapshot.size;
            var totalDownloads = 0;
            var totalRating = 0;
            var ratingCount = 0;
            
            homebrewSnapshot.forEach(function(doc) {
                var data = doc.data();
                totalDownloads += data.downloads || 0;
                if (data.ratingCount > 0) {
                    totalRating += data.rating * data.ratingCount;
                    ratingCount += data.ratingCount;
                }
            });
            
            var averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
            
            return db.collection('userProfiles').doc(userId).update({
                'stats.homebrewCount': homebrewCount,
                'stats.totalDownloads': totalDownloads,
                'stats.totalRatings': ratingCount,
                'stats.averageRating': averageRating,
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
    },

    // Ensure profile exists for current user
    ensureProfile: function() {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error('Inte inloggad'));
        
        return db.collection('userProfiles').doc(user.uid).get()
            .then(function(doc) {
                if (!doc.exists) {
                    return UserProfileService.createOrUpdateProfile({
                        displayName: user.displayName || user.email
                    });
                }
                return Object.assign({ id: doc.id }, doc.data());
            });
    },

    // Get top creators
    getTopCreators: function(limit) {
        limit = limit || 10;
        return db.collection('userProfiles')
            .where('preferences.isPublic', '==', true)
            .orderBy('stats.homebrewCount', 'desc')
            .limit(limit)
            .get()
            .then(function(snapshot) {
                var profiles = [];
                snapshot.forEach(function(doc) {
                    profiles.push(Object.assign({ id: doc.id }, doc.data()));
                });
                return profiles;
            });
    }
};

console.log('✅ UserProfileService loaded');
