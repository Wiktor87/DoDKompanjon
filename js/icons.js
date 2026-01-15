// Icon System for DoD Companion
var ICONS = {
    // Character Kin Icons (GIF or SVG fallback)
    kin: {
        'Människa': '<img src="icons/Manniska.gif" alt="Människa" width="32" height="32" style="display: block;">',
        'Alv': '<img src="icons/Alv.gif" alt="Alv" width="32" height="32" style="display: block;">',
        'Dvärg': '<img src="icons/Dvarg.gif" alt="Dvärg" width="32" height="32" style="display: block;">',
        'Halvling': '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="11" r="4" fill="currentColor"/><path d="M9 26c0-3.866 3.134-7 7-7s7 3.134 7 7v2H9v-2z" fill="currentColor"/></svg>',
        'Anka': '<img src="icons/Anka.gif" alt="Anka" width="32" height="32" style="display: block;">',
        'Vargfolk': '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 6l-3 6h6l-3-6z" fill="currentColor"/><path d="M23 6l-2 6h4l-2-6z" fill="currentColor"/><circle cx="16" cy="13" r="6" fill="currentColor"/><path d="M8 26c0-4.418 3.582-8 8-8s8 3.582 8 8v2H8v-2z" fill="currentColor"/></svg>',
        'default': '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="10" r="5" fill="currentColor"/><path d="M8 25c0-4.418 3.582-8 8-8s8 3.582 8 8v2H8v-2z" fill="currentColor"/></svg>'
    },
    
    // Equipment Icons
    equipment: {
        sword: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 20l16-16M6 18l-2 2M18 6l2-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="5" y="17" width="2" height="2" fill="currentColor"/></svg>',
        shield: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
        bow: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 4v16M19 4c-3 0-5 2-7 6-2-4-4-6-7-6M19 20c-3 0-5-2-7-6-2 4-4 6-7 6M5 4v16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        armor: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" fill="currentColor"/></svg>',
        potion: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 3h6v3H9V3z" fill="currentColor"/><path d="M8 6h8l2 12a2 2 0 01-2 2H8a2 2 0 01-2-2L8 6z" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
        backpack: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="8" width="12" height="13" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M9 8V6a3 3 0 116 0v2" stroke="currentColor" stroke-width="2"/><rect x="9" y="12" width="6" height="3" rx="1" fill="currentColor"/></svg>',
        coin: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 7v10M9 9h5a2 2 0 010 4H9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    },
    
    // UI Icons
    ui: {
        heart: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z" fill="currentColor"/></svg>',
        brain: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.5 2a2.5 2.5 0 015 0v1a4 4 0 014 4 4 4 0 01-1 2.646V11a4 4 0 01-3 3.874V17a2 2 0 01-4 0v-2.126A4 4 0 017.5 11V9.646A4 4 0 016.5 7a4 4 0 014-4V2z" fill="currentColor"/></svg>',
        dice: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/></svg>',
        plus: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        edit: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
        trash: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
        save: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M7 3v5h8" stroke="currentColor" stroke-width="2"/><rect x="9" y="13" width="6" height="8" fill="currentColor"/></svg>'
    }
};

// Helper to get inline SVG icon
function getIconSVG(category, name) {
    return (ICONS[category] && ICONS[category][name]) || (ICONS[category] && ICONS[category]['default']) || '';
}

// Migration function to update existing characters with GIF icons
function migrateCharacterIcons() {
    console.log('🔄 Starting character icon migration...');
    
    // Check if Firebase is available
    if (typeof db === 'undefined' || typeof firebase === 'undefined') {
        console.log('⚠️ Firebase not available, skipping migration');
        return Promise.resolve();
    }
    
    // Check if user is logged in
    var user = firebase.auth().currentUser;
    if (!user) {
        console.log('⚠️ No user logged in, skipping migration');
        return Promise.resolve();
    }
    
    // Get all user's characters
    return db.collection('characters')
        .where('userId', '==', user.uid)
        .get()
        .then(function(snapshot) {
            if (snapshot.empty) {
                console.log('✅ No characters to migrate');
                return Promise.resolve();
            }
            
            var batch = db.batch();
            var updateCount = 0;
            
            snapshot.forEach(function(doc) {
                var char = doc.data();
                var needsUpdate = false;
                var updates = {};
                
                // Check if character has a kin but no icon set or has old icon
                if (char.kin && (!char.icon || !char.icon.includes('.gif'))) {
                    // Map kin to GIF icon path
                    var iconPath = null;
                    switch(char.kin) {
                        case 'Människa':
                            iconPath = '/icons/manniska.gif';
                            break;
                        case 'Alv':
                            iconPath = '/icons/alv.gif';
                            break;
                        case 'Dvärg':
                            iconPath = '/icons/dvarg.gif';
                            break;
                        case 'Halvling':
                            iconPath = '/icons/halvling.gif'; // Will use SVG fallback if not exists
                            break;
                        case 'Anka':
                            iconPath = '/icons/anka.gif';
                            break;
                        case 'Vargfolk':
                            iconPath = '/icons/vargfolk.gif'; // Will use SVG fallback if not exists
                            break;
                    }
                    
                    if (iconPath) {
                        updates.icon = iconPath;
                        needsUpdate = true;
                    }
                }
                
                // If updates are needed, add to batch
                if (needsUpdate) {
                    batch.update(doc.ref, updates);
                    updateCount++;
                    console.log('📝 Queuing update for character: ' + (char.name || 'Unnamed') + ' (' + char.kin + ')');
                }
            });
            
            // Commit the batch if there are updates
            if (updateCount > 0) {
                console.log('💾 Updating ' + updateCount + ' character(s)...');
                return batch.commit().then(function() {
                    console.log('✅ Successfully migrated ' + updateCount + ' character icon(s)');
                });
            } else {
                console.log('✅ All characters already have correct icons');
                return Promise.resolve();
            }
        })
        .catch(function(error) {
            console.error('❌ Error during icon migration:', error);
            // Don't throw - just log the error and continue
            return Promise.resolve();
        });
}

// Auto-run migration on auth state change (when user logs in)
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // Small delay to ensure everything is loaded
            setTimeout(function() {
                migrateCharacterIcons();
            }, 1000);
        }
    });
}

console.log('✅ Icons loaded');

