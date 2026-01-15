// Homebrew UI - UI rendering functions for homebrew feature
var HomebrewUI = {
    currentView: 'browse', // browse, collection, create
    currentCategory: 'all',
    currentSort: 'newest',
    searchTerm: '',
    homebrewItems: [],
    
    // Initialize homebrew section
    init: function() {
        console.log('🎨 HomebrewUI initializing...');
        this.renderBrowseView();
        this.attachEventListeners();
    },
    
    // Attach event listeners
    attachEventListeners: function() {
        var self = this;
        
        // View navigation
        document.addEventListener('click', function(e) {
            if (e.target.matches('[data-homebrew-view]')) {
                var view = e.target.getAttribute('data-homebrew-view');
                self.switchView(view);
            }
            
            // Category tabs
            if (e.target.matches('[data-category]')) {
                var category = e.target.getAttribute('data-category');
                self.filterByCategory(category);
            }
            
            // Sort dropdown
            if (e.target.matches('[data-sort]')) {
                var sort = e.target.getAttribute('data-sort');
                self.sortBy(sort);
            }
            
            // Author click - use closest to handle clicks on child elements
            if (e.target.closest('.homebrew-author[data-author-id]')) {
                // Only handle if NOT in detail modal (detail modal has its own onclick)
                if (!e.target.closest('.homebrew-detail-modal')) {
                    e.stopPropagation(); // Prevent card click
                    var authorEl = e.target.closest('.homebrew-author[data-author-id]');
                    var authorId = authorEl.getAttribute('data-author-id');
                    self.showAuthorProfile(authorId);
                }
            }
            
            // Save to collection
            if (e.target.matches('[data-save-homebrew]')) {
                var homebrewId = e.target.getAttribute('data-save-homebrew');
                self.saveToCollection(homebrewId);
            }
            
            // Delete homebrew
            if (e.target.matches('[data-delete-homebrew]')) {
                var homebrewId = e.target.getAttribute('data-delete-homebrew');
                self.deleteHomebrew(homebrewId);
            }
        });
        
        // Search input
        var searchInput = document.getElementById('homebrewSearch');
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                self.searchTerm = e.target.value;
                self.performSearch();
            });
        }
    },
    
    // Switch view
    switchView: function(view) {
        this.currentView = view;
        
        // Update navigation buttons
        document.querySelectorAll('[data-homebrew-view]').forEach(function(btn) {
            btn.classList.remove('active');
        });
        document.querySelector('[data-homebrew-view="' + view + '"]').classList.add('active');
        
        // Render appropriate view
        if (view === 'browse') {
            this.renderBrowseView();
        } else if (view === 'collection') {
            this.renderCollectionView();
        } else if (view === 'create') {
            this.renderCreateView();
        }
    },
    
    // Render browse view
    renderBrowseView: function() {
        var self = this;
        var container = document.getElementById('homebrewContent');
        if (!container) return;
        
        // Get total count
        HomebrewService.getHomebrewCount().then(function(count) {
            container.innerHTML = self.getBrowseHTML(count);
            self.loadHomebrewItems();
        });
    },
    
    // Get browse view HTML
    getBrowseHTML: function(totalCount) {
        return '<div class="homebrew-browse">' +
            '<div class="homebrew-hero">' +
                '<h1 class="homebrew-title">Homebrew Bibliotek</h1>' +
                '<div class="homebrew-search-bar">' +
                    '<input type="text" id="homebrewSearch" class="homebrew-search-input" ' +
                        'placeholder="Sök bland ' + totalCount + ' homebrew-skapelser...">' +
                '</div>' +
            '</div>' +
            '<div class="homebrew-categories">' +
                this.getCategoryTabsHTML() +
            '</div>' +
            '<div class="homebrew-filter-bar">' +
                '<select class="homebrew-sort-select" id="homebrewSort">' +
                    '<option value="newest">Nyast</option>' +
                    '<option value="popular">Populärast</option>' +
                    '<option value="rating">Högst betyg</option>' +
                '</select>' +
            '</div>' +
            '<div class="homebrew-grid" id="homebrewGrid"></div>' +
        '</div>';
    },
    
    // Get category tabs HTML
    getCategoryTabsHTML: function() {
        var self = this;
        var html = '<button class="homebrew-category-tab active" data-category="all">' +
            '<span class="category-icon">🎲</span>' +
            '<span class="category-label">Alla</span>' +
        '</button>';
        
        Object.keys(HomebrewService.CATEGORIES).forEach(function(key) {
            var cat = HomebrewService.CATEGORIES[key];
            var active = self.currentCategory === key ? ' active' : '';
            html += '<button class="homebrew-category-tab' + active + '" data-category="' + key + '">' +
                '<span class="category-icon">' + cat.icon + '</span>' +
                '<span class="category-label">' + cat.label + '</span>' +
            '</button>';
        });
        
        return html;
    },
    
    // Load homebrew items
    loadHomebrewItems: function() {
        var self = this;
        var filters = {
            type: this.currentCategory !== 'all' ? this.currentCategory : null,
            sortBy: this.currentSort === 'popular' ? 'downloads' : (this.currentSort === 'rating' ? 'rating' : 'created'),
            limit: 50
        };
        
        HomebrewService.getPublicHomebrew(filters).then(function(items) {
            self.homebrewItems = items;
            self.renderHomebrewGrid(items);
        }).catch(function(err) {
            console.error('Error loading homebrew:', err);
        });
    },
    
    // Render homebrew grid
    renderHomebrewGrid: function(items) {
        var grid = document.getElementById('homebrewGrid');
        if (!grid) return;
        
        if (items.length === 0) {
            grid.innerHTML = '<div class="homebrew-empty">' +
                '<p>Inga homebrew-skapelser hittades.</p>' +
            '</div>';
            return;
        }
        
        var html = '';
        items.forEach(function(item) {
            html += HomebrewUI.getHomebrewCardHTML(item);
        });
        
        // Add "Skapa nytt" card
        html += '<div class="fantasy-create-card" style="width: 220px; height: 120px;" onclick="HomebrewUI.switchView(\'create\')">' +
            '<div class="fantasy-create-plus">+</div>' +
            '<div class="fantasy-create-text">Skapa nytt</div>' +
        '</div>';
        
        grid.innerHTML = html;
    },
    
    // Get homebrew card HTML
    getHomebrewCardHTML: function(item) {
        var category = HomebrewService.CATEGORIES[item.type] || { label: item.type, icon: '📜' };
        var rating = item.rating > 0 ? item.rating : 0;
        var description = this.escapeHtml(item.description);
        var truncatedDesc = description.length > 120 ? description.substring(0, 120) + '...' : description;
        
        // Type colors matching JSX mockup
        var typeColorMap = {
            'monster': 'monster',
            'item': 'item',
            'spell': 'spell',
            'adventure': 'adventure'
        };
        var typeClass = typeColorMap[item.type] || 'item';
        
        var html = '<div class="fantasy-homebrew-card" data-homebrew-id="' + item.id + '" data-type="' + item.type + '" onclick="HomebrewUI.showHomebrewDetail(\'' + item.id + '\')">';
        
        // Decorative L-corners (smaller)
        html += '<svg class="decorative-corner-svg top-left" viewBox="0 0 25 25" style="width: 20px; height: 20px;"><path d="M0 0 L25 0 L25 3 L3 3 L3 25 L0 25 Z" fill="#d4af37" /></svg>';
        html += '<svg class="decorative-corner-svg top-right" viewBox="0 0 25 25" style="width: 20px; height: 20px;"><path d="M0 0 L25 0 L25 25 L22 25 L22 3 L0 3 Z" fill="#d4af37" /></svg>';
        html += '<svg class="decorative-corner-svg bottom-left" viewBox="0 0 25 25" style="width: 20px; height: 20px;"><path d="M0 0 L3 0 L3 22 L25 22 L25 25 L0 25 Z" fill="#d4af37" /></svg>';
        html += '<svg class="decorative-corner-svg bottom-right" viewBox="0 0 25 25" style="width: 20px; height: 20px;"><path d="M22 0 L25 0 L25 25 L0 25 L0 22 L22 22 Z" fill="#d4af37" /></svg>';
        
        // Type badge
        html += '<div class="fantasy-homebrew-type-badge ' + typeClass + '">' + category.label + '</div>';
        
        // Title
        html += '<h3 class="fantasy-homebrew-title">' + this.escapeHtml(item.name) + '</h3>';
        
        // Footer with author and rating
        html += '<div class="fantasy-homebrew-footer">';
        html += '<div class="fantasy-homebrew-author">av ' + this.escapeHtml(item.authorName) + '</div>';
        html += '<div class="fantasy-homebrew-rating">';
        for (var i = 1; i <= 5; i++) {
            html += i <= rating ? '★' : '☆';
        }
        html += '</div>';
        html += '</div>';
        
        html += '</div>';
        return html;
    },
    
    // Render collection view
    renderCollectionView: function() {
        var self = this;
        var container = document.getElementById('homebrewContent');
        if (!container) return;
        
        container.innerHTML = '<div class="homebrew-collection">' +
            '<h1 class="homebrew-title">Min Samling</h1>' +
            '<div class="collection-tabs">' +
                '<button class="collection-tab active" data-collection-tab="saved">Sparade</button>' +
                '<button class="collection-tab" data-collection-tab="created">Mina skapelser</button>' +
                '<button class="collection-tab" data-collection-tab="packages">Mina paket</button>' +
            '</div>' +
            '<div class="collection-content" id="collectionContent"></div>' +
        '</div>';
        
        // Load saved items by default
        this.loadSavedItems();
        
        // Attach tab listeners
        document.querySelectorAll('[data-collection-tab]').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                document.querySelectorAll('.collection-tab').forEach(function(t) {
                    t.classList.remove('active');
                });
                e.target.classList.add('active');
                
                var tab = e.target.getAttribute('data-collection-tab');
                if (tab === 'saved') {
                    self.loadSavedItems();
                } else if (tab === 'created') {
                    self.loadCreatedItems();
                } else if (tab === 'packages') {
                    self.loadPackages();
                }
            });
        });
    },
    
    // Load saved items
    loadSavedItems: function() {
        var self = this;
        var content = document.getElementById('collectionContent');
        if (!content) return;
        
        content.innerHTML = '<div class="loading">Laddar...</div>';
        
        HomebrewService.getSavedHomebrew().then(function(items) {
            if (items.length === 0) {
                content.innerHTML = '<div class="collection-empty">' +
                    '<p>Du har inga sparade homebrew-skapelser ännu.</p>' +
                    '<button class="btn btn-gold" data-homebrew-view="browse">Utforska homebrew</button>' +
                '</div>';
                return;
            }
            
            var html = '<div class="collection-list">';
            items.forEach(function(item) {
                html += self.getCollectionItemHTML(item);
            });
            html += '</div>';
            
            content.innerHTML = html;
        }).catch(function(err) {
            console.error('Error loading saved items:', err);
            content.innerHTML = '<div class="error">Ett fel uppstod vid laddning.</div>';
        });
    },
    
    // Load created items
    loadCreatedItems: function() {
        var self = this;
        var content = document.getElementById('collectionContent');
        if (!content) return;
        
        content.innerHTML = '<div class="loading">Laddar...</div>';
        
        HomebrewService.getUserHomebrew().then(function(items) {
            if (items.length === 0) {
                content.innerHTML = '<div class="collection-empty">' +
                    '<p>Du har inte skapat några homebrew-skapelser ännu.</p>' +
                    '<button class="btn btn-gold" data-homebrew-view="create">Skapa homebrew</button>' +
                '</div>';
                return;
            }
            
            var html = '<div class="collection-list">';
            items.forEach(function(item) {
                html += self.getCollectionItemHTML(item, true);
            });
            html += '</div>';
            
            content.innerHTML = html;
        }).catch(function(err) {
            console.error('Error loading created items:', err);
            content.innerHTML = '<div class="error">Ett fel uppstod vid laddning.</div>';
        });
    },
    
    // Load packages (placeholder)
    loadPackages: function() {
        var content = document.getElementById('collectionContent');
        if (!content) return;
        
        content.innerHTML = '<div class="collection-empty">' +
            '<p>Paket-funktionen kommer snart!</p>' +
        '</div>';
    },
    
    // Get collection item HTML
    getCollectionItemHTML: function(item, isOwner) {
        var category = HomebrewService.CATEGORIES[item.type] || { label: item.type, icon: '📜' };
        var actions = isOwner ?
            '<button class="collection-action-btn" data-delete-homebrew="' + item.id + '">🗑️ Ta bort</button>' :
            '<button class="collection-action-btn">Använd på karaktär</button>';
        
        return '<div class="collection-item">' +
            '<div class="collection-item-icon">' + category.icon + '</div>' +
            '<div class="collection-item-content">' +
                '<h3 class="collection-item-title">' + this.escapeHtml(item.name) + '</h3>' +
                '<p class="collection-item-type">' + category.label + '</p>' +
            '</div>' +
            '<div class="collection-item-actions">' +
                actions +
            '</div>' +
        '</div>';
    },
    
    // Render create view
    renderCreateView: function() {
        var container = document.getElementById('homebrewContent');
        if (!container) return;
        
        container.innerHTML = '<div class="homebrew-create">' +
            '<h1 class="homebrew-title">Skapa Nytt Homebrew</h1>' +
            '<div class="create-type-grid">' +
                this.getTypeSelectionHTML() +
            '</div>' +
        '</div>';
    },
    
    // Get type selection HTML
    getTypeSelectionHTML: function() {
        var html = '';
        var self = this;
        
        Object.keys(HomebrewService.CATEGORIES).forEach(function(key) {
            var cat = HomebrewService.CATEGORIES[key];
            html += '<div class="type-card" data-create-type="' + key + '">' +
                '<div class="type-icon">' + cat.icon + '</div>' +
                '<div class="type-label">' + cat.label + '</div>' +
            '</div>';
        });
        
        // Attach listeners
        setTimeout(function() {
            document.querySelectorAll('[data-create-type]').forEach(function(card) {
                card.addEventListener('click', function(e) {
                    var type = e.currentTarget.getAttribute('data-create-type');
                    self.showCreateForm(type);
                });
            });
        }, 100);
        
        return html;
    },
    
    // Show create form for specific type
    showCreateForm: function(type) {
        var container = document.getElementById('homebrewContent');
        if (!container) return;
        
        var category = HomebrewService.CATEGORIES[type];
        container.innerHTML = this.getCreateFormHTML(type, category);
        
        // Attach form submit
        var form = document.getElementById('homebrewCreateForm');
        if (form) {
            form.addEventListener('submit', this.handleFormSubmit.bind(this, type));
        }
    },
    
    // Get create form HTML
    getCreateFormHTML: function(type, category) {
        return '<div class="homebrew-create-form">' +
            '<div class="form-header">' +
                '<button class="btn-back" data-homebrew-view="create">← Tillbaka</button>' +
                '<h2>' + category.icon + ' Skapa ' + category.label + '</h2>' +
            '</div>' +
            '<form id="homebrewCreateForm">' +
                this.getFormFieldsHTML(type) +
                '<div class="form-visibility">' +
                    '<h3>Synlighet</h3>' +
                    '<div class="visibility-options">' +
                        '<label class="visibility-option active">' +
                            '<input type="radio" name="visibility" value="private" checked>' +
                            '<span>🔒 Privat</span>' +
                        '</label>' +
                        '<label class="visibility-option">' +
                            '<input type="radio" name="visibility" value="group">' +
                            '<span>👥 Grupp</span>' +
                        '</label>' +
                        '<label class="visibility-option">' +
                            '<input type="radio" name="visibility" value="public">' +
                            '<span>🌍 Publik</span>' +
                        '</label>' +
                    '</div>' +
                '</div>' +
                '<div class="form-actions">' +
                    '<button type="submit" class="btn btn-gold">Skapa homebrew</button>' +
                '</div>' +
            '</form>' +
        '</div>';
    },
    
    // Get form fields HTML based on type
    getFormFieldsHTML: function(type) {
        var commonFields = '<div class="form-group">' +
            '<label>Namn *</label>' +
            '<input type="text" name="name" class="form-input" required>' +
        '</div>' +
        '<div class="form-group">' +
            '<label>Beskrivning *</label>' +
            '<textarea name="description" class="form-textarea" rows="4" required></textarea>' +
        '</div>';
        
        var specificFields = '';
        
        if (type === 'abilities') {
            specificFields = '<div class="form-group">' +
                '<label>Krav</label>' +
                '<input type="text" name="requirement" class="form-input" placeholder="t.ex. Smyga 14">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>VV-kostnad</label>' +
                '<input type="number" name="wp" class="form-input" min="0">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Typ</label>' +
                '<select name="abilityType" class="form-select">' +
                    '<option value="action">Handling</option>' +
                    '<option value="reaction">Reaktion</option>' +
                    '<option value="passive">Passiv</option>' +
                '</select>' +
            '</div>';
        } else if (type === 'spells') {
            specificFields = '<div class="form-group">' +
                '<label>Skola</label>' +
                '<input type="text" name="school" class="form-input">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>VV-kostnad</label>' +
                '<input type="number" name="wp" class="form-input" min="0">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Räckvidd</label>' +
                '<input type="text" name="range" class="form-input">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Varaktighet</label>' +
                '<input type="text" name="duration" class="form-input">' +
            '</div>';
        } else if (type === 'items') {
            specificFields = '<div class="form-group">' +
                '<label>Typ</label>' +
                '<input type="text" name="itemType" class="form-input">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Sällsynthet</label>' +
                '<select name="rarity" class="form-select">' +
                    '<option value="common">Vanlig</option>' +
                    '<option value="uncommon">Ovanlig</option>' +
                    '<option value="rare">Sällsynt</option>' +
                    '<option value="legendary">Legendarisk</option>' +
                '</select>' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Värde</label>' +
                '<input type="text" name="value" class="form-input">' +
            '</div>';
        }
        
        return commonFields + specificFields;
    },
    
    // Handle form submit
    handleFormSubmit: function(type, e) {
        e.preventDefault();
        var self = this;
        var user = getCurrentUser();
        
        if (!user) {
            if (typeof showToast !== 'undefined') {
                showToast('Du måste vara inloggad', 'error');
            }
            return;
        }
        
        var formData = new FormData(e.target);
        var data = {};
        
        formData.forEach(function(value, key) {
            if (key !== 'visibility') {
                data[key] = value;
            }
        });
        
        var visibility = formData.get('visibility');
        
        HomebrewService.createHomebrew(type, data, visibility).then(function(homebrew) {
            if (typeof showToast !== 'undefined') {
                showToast('Homebrew skapad!', 'success');
            }
            self.switchView('collection');
            
            // Update user profile stats
            UserProfileService.updateStats(user.uid, { homebrewCount: 1 });
        }).catch(function(err) {
            console.error('Error creating homebrew:', err);
            if (typeof showToast !== 'undefined') {
                showToast('Ett fel uppstod: ' + err.message, 'error');
            }
        });
    },
    
    // Show author profile modal
    showAuthorProfile: function(authorId) {
        var self = this;
        
        Promise.all([
            UserProfileService.getProfile(authorId),
            HomebrewService.getUserHomebrew(authorId)
        ]).then(function(results) {
            var profile = results[0];
            var homebrews = results[1];
            
            self.renderAuthorModal(profile, homebrews);
        }).catch(function(err) {
            console.error('Error loading author profile:', err);
        });
    },
    
    // Show homebrew detail modal
    showHomebrewDetail: function(homebrewId) {
        var self = this;
        
        HomebrewService.getHomebrew(homebrewId).then(function(homebrew) {
            // Also get ratings for this homebrew
            return HomebrewService.getHomebrewRatings(homebrewId).then(function(ratings) {
                return { homebrew: homebrew, ratings: ratings };
            });
        }).then(function(result) {
            self.renderDetailModal(result.homebrew, result.ratings);
        }).catch(function(err) {
            console.error('Error loading homebrew:', err);
            if (typeof showToast !== 'undefined') {
                showToast('Kunde inte ladda homebrew', 'error');
            }
        });
    },
    
    // Render detail modal
    renderDetailModal: function(homebrew, ratings) {
        var self = this;
        var user = getCurrentUser();
        var category = HomebrewService.CATEGORIES[homebrew.type] || { label: homebrew.type, icon: '📜' };
        var userRating = ratings.find(function(r) { return r.oderId === (user ? user.uid : null); });
        
        // Calculate average rating
        var avgRating = 0;
        if (ratings.length > 0) {
            var sum = ratings.reduce(function(acc, r) { return acc + r.rating; }, 0);
            avgRating = sum / ratings.length;
        }
        
        var modal = document.createElement('div');
        modal.className = 'homebrew-modal homebrew-detail-modal';
        modal.innerHTML = '<div class="modal-overlay" onclick="this.parentElement.remove()"></div>' +
            '<div class="modal-content detail-modal-content">' +
                '<button class="modal-close" onclick="this.closest(\'.homebrew-modal\').remove()">✕</button>' +
                
                // Header
                '<div class="detail-header">' +
                    '<div class="detail-type-badge">' + category.icon + ' ' + category.label + '</div>' +
                    '<h2 class="detail-title">' + self.escapeHtml(homebrew.name) + '</h2>' +
                    '<div class="detail-meta">' +
                        '<span class="detail-downloads">📥 ' + (homebrew.downloads || 0) + ' nedladdningar</span>' +
                        '<span class="detail-rating">★ ' + avgRating.toFixed(1) + ' (' + ratings.length + ' omdömen)</span>' +
                    '</div>' +
                '</div>' +
                
                // Type-specific fields
                '<div class="detail-fields">' +
                    self.getDetailFieldsHTML(homebrew) +
                '</div>' +
                
                // Description
                '<div class="detail-description">' +
                    '<h3>Beskrivning</h3>' +
                    '<p>' + self.escapeHtml(homebrew.description) + '</p>' +
                '</div>' +
                
                // Author
                '<div class="detail-author" data-author-id="' + homebrew.authorId + '" onclick="HomebrewUI.showAuthorProfile(\'' + homebrew.authorId + '\'); this.closest(\'.homebrew-modal\').remove();">' +
                    '<div class="author-avatar">' + self.getInitials(homebrew.authorName) + '</div>' +
                    '<div class="author-info">' +
                        '<span class="author-name">' + self.escapeHtml(homebrew.authorName) + '</span>' +
                        '<span class="author-label">Skapare</span>' +
                    '</div>' +
                '</div>' +
                
                // Rating section
                '<div class="detail-rating-section">' +
                    '<h3>Betygsätt</h3>' +
                    '<div class="star-rating" id="starRating">' +
                        self.getStarRatingHTML(userRating ? userRating.rating : 0, homebrew.id) +
                    '</div>' +
                    (userRating ? '<p class="your-rating">Ditt betyg: ' + userRating.rating + '/5</p>' : '') +
                '</div>' +
                
                // Comments section
                '<div class="detail-comments-section">' +
                    '<h3>Kommentarer (' + ratings.filter(function(r) { return r.review; }).length + ')</h3>' +
                    '<div class="comments-list" id="commentsList">' +
                        self.getCommentsHTML(ratings.filter(function(r) { return r.review; })) +
                    '</div>' +
                    (user ? '<div class="add-comment">' +
                        '<textarea id="commentText" placeholder="Skriv en kommentar..." class="form-textarea"></textarea>' +
                        '<button class="btn btn-gold" onclick="HomebrewUI.submitComment(\'' + homebrew.id + '\')">Skicka</button>' +
                    '</div>' : '<p class="login-prompt">Logga in för att kommentera</p>') +
                '</div>' +
                
                // Actions
                '<div class="detail-actions">' +
                    '<button class="btn btn-gold" onclick="HomebrewUI.saveToCollection(\'' + homebrew.id + '\'); this.closest(\'.homebrew-modal\').remove();">+ Lägg till i samling</button>' +
                '</div>' +
            '</div>';
        
        document.body.appendChild(modal);
    },
    
    // Get detail fields HTML based on type
    getDetailFieldsHTML: function(homebrew) {
        var html = '<div class="detail-fields-grid">';
        var data = homebrew.data || homebrew;
        
        if (homebrew.type === 'abilities') {
            if (data.requirement) html += '<div class="field"><span class="field-label">Krav:</span> ' + this.escapeHtml(data.requirement) + '</div>';
            if (data.wp) html += '<div class="field"><span class="field-label">VP:</span> ' + data.wp + '</div>';
            if (data.abilityType) html += '<div class="field"><span class="field-label">Typ:</span> ' + this.escapeHtml(data.abilityType) + '</div>';
        } else if (homebrew.type === 'monsters') {
            if (data.hp) html += '<div class="field"><span class="field-label">KP:</span> ' + data.hp + '</div>';
            if (data.armor) html += '<div class="field"><span class="field-label">Rustning:</span> ' + data.armor + '</div>';
            if (data.movement) html += '<div class="field"><span class="field-label">Förflyttning:</span> ' + data.movement + '</div>';
        } else if (homebrew.type === 'spells') {
            if (data.school) html += '<div class="field"><span class="field-label">Skola:</span> ' + this.escapeHtml(data.school) + '</div>';
            if (data.wp) html += '<div class="field"><span class="field-label">VP:</span> ' + data.wp + '</div>';
            if (data.range) html += '<div class="field"><span class="field-label">Räckvidd:</span> ' + this.escapeHtml(data.range) + '</div>';
            if (data.duration) html += '<div class="field"><span class="field-label">Varaktighet:</span> ' + this.escapeHtml(data.duration) + '</div>';
        } else if (homebrew.type === 'items') {
            if (data.itemType) html += '<div class="field"><span class="field-label">Typ:</span> ' + this.escapeHtml(data.itemType) + '</div>';
            if (data.rarity) html += '<div class="field"><span class="field-label">Sällsynthet:</span> ' + this.escapeHtml(data.rarity) + '</div>';
            if (data.value) html += '<div class="field"><span class="field-label">Värde:</span> ' + this.escapeHtml(data.value) + '</div>';
        }
        
        html += '</div>';
        return html;
    },
    
    // Get star rating HTML
    getStarRatingHTML: function(currentRating, homebrewId) {
        var html = '';
        for (var i = 1; i <= 5; i++) {
            var filled = i <= currentRating ? ' filled' : '';
            html += '<span class="star' + filled + '" data-rating="' + i + '" onclick="HomebrewUI.rateHomebrew(\'' + homebrewId + '\', ' + i + ')">★</span>';
        }
        return html;
    },
    
    // Get comments HTML
    getCommentsHTML: function(comments) {
        if (!comments || comments.length === 0) {
            return '<p class="no-comments">Inga kommentarer ännu.</p>';
        }
        
        var self = this;
        var html = '';
        comments.forEach(function(comment) {
            html += '<div class="comment">' +
                '<div class="comment-header">' +
                    '<span class="comment-author">' + self.escapeHtml(comment.authorName || 'Anonym') + '</span>' +
                    '<span class="comment-rating">★ ' + comment.rating + '</span>' +
                    '<span class="comment-date">' + self.formatDate(comment.createdAt) + '</span>' +
                '</div>' +
                '<p class="comment-text">' + self.escapeHtml(comment.review) + '</p>' +
            '</div>';
        });
        return html;
    },
    
    // Rate homebrew
    rateHomebrew: function(homebrewId, rating) {
        var user = getCurrentUser();
        if (!user) {
            if (typeof showToast !== 'undefined') {
                showToast('Du måste vara inloggad för att betygsätta', 'error');
            }
            return;
        }
        
        HomebrewService.rateHomebrew(homebrewId, rating).then(function() {
            // Update stars visually
            document.querySelectorAll('#starRating .star').forEach(function(star, i) {
                if (i < rating) {
                    star.classList.add('filled');
                } else {
                    star.classList.remove('filled');
                }
            });
            
            if (typeof showToast !== 'undefined') {
                showToast('Betyg sparat!', 'success');
            }
        }).catch(function(err) {
            console.error('Error rating:', err);
            if (typeof showToast !== 'undefined') {
                showToast('Kunde inte spara betyg', 'error');
            }
        });
    },
    
    // Submit comment
    submitComment: function(homebrewId) {
        var user = getCurrentUser();
        if (!user) {
            if (typeof showToast !== 'undefined') {
                showToast('Du måste vara inloggad', 'error');
            }
            return;
        }
        
        var textarea = document.getElementById('commentText');
        var comment = textarea ? textarea.value.trim() : '';
        
        if (!comment) {
            if (typeof showToast !== 'undefined') {
                showToast('Skriv en kommentar först', 'error');
            }
            return;
        }
        
        HomebrewService.addComment(homebrewId, comment).then(function() {
            if (textarea) textarea.value = '';
            if (typeof showToast !== 'undefined') {
                showToast('Kommentar tillagd!', 'success');
            }
            // Refresh the detail modal
            HomebrewUI.showHomebrewDetail(homebrewId);
        }).catch(function(err) {
            console.error('Error commenting:', err);
            if (typeof showToast !== 'undefined') {
                showToast('Kunde inte lägga till kommentar', 'error');
            }
        });
    },
    
    // Render author profile modal
    renderAuthorModal: function(profile, homebrews) {
        var modal = document.createElement('div');
        modal.className = 'homebrew-modal';
        modal.innerHTML = '<div class="modal-content">' +
            '<div class="modal-header">' +
                '<h2>FÖRFATTARPROFIL</h2>' +
                '<button class="modal-close" onclick="this.closest(\'.homebrew-modal\').remove()">✕</button>' +
            '</div>' +
            '<div class="modal-body">' +
                '<div class="author-profile-header">' +
                    '<div class="author-avatar-large">' + this.getInitials(profile.displayName) + '</div>' +
                    '<div class="author-info">' +
                        '<h3>' + this.escapeHtml(profile.displayName) + '</h3>' +
                        '<p class="author-member-since">Medlem sedan ' + this.formatDate(profile.memberSince) + '</p>' +
                    '</div>' +
                '</div>' +
                '<div class="author-stats-row">' +
                    '<div class="stat-box">' +
                        '<div class="stat-value">' + (profile.stats.homebrewCount || 0) + '</div>' +
                        '<div class="stat-label">Skapelser</div>' +
                    '</div>' +
                    '<div class="stat-box">' +
                        '<div class="stat-value">' + (profile.stats.totalDownloads || 0) + '</div>' +
                        '<div class="stat-label">Nedladdningar</div>' +
                    '</div>' +
                    '<div class="stat-box">' +
                        '<div class="stat-value">★ ' + (profile.stats.averageRating || 0).toFixed(1) + '</div>' +
                        '<div class="stat-label">Snittbetyg</div>' +
                    '</div>' +
                '</div>' +
                (profile.bio ? '<p class="author-bio">' + this.escapeHtml(profile.bio) + '</p>' : '') +
                '<div class="author-homebrews">' +
                    '<h3>' + this.escapeHtml(profile.displayName) + 's skapelser</h3>' +
                    '<div class="homebrew-grid">' +
                        this.getAuthorHomebrewsHTML(homebrews.slice(0, 6)) +
                    '</div>' +
                    (homebrews.length > 6 ? '<button class="btn btn-outline">Visa alla →</button>' : '') +
                '</div>' +
            '</div>' +
        '</div>';
        
        document.body.appendChild(modal);
    },
    
    // Get author homebrews HTML
    getAuthorHomebrewsHTML: function(homebrews) {
        var html = '';
        var self = this;
        
        homebrews.forEach(function(item) {
            html += self.getHomebrewCardHTML(item);
        });
        
        return html || '<p>Inga skapelser att visa.</p>';
    },
    
    // Save to collection
    saveToCollection: function(homebrewId) {
        HomebrewService.saveToCollection(homebrewId).then(function() {
            if (typeof showToast !== 'undefined') {
                showToast('Tillagt i din samling!', 'success');
            }
        }).catch(function(err) {
            console.error('Error saving:', err);
            if (typeof showToast !== 'undefined') {
                showToast('Ett fel uppstod: ' + err.message, 'error');
            }
        });
    },
    
    // Delete homebrew
    deleteHomebrew: function(homebrewId) {
        if (!confirm('Är du säker på att du vill ta bort denna homebrew?')) return;
        
        var self = this;
        var user = getCurrentUser();
        
        if (!user) {
            if (typeof showToast !== 'undefined') {
                showToast('Du måste vara inloggad', 'error');
            }
            return;
        }
        
        HomebrewService.deleteHomebrew(homebrewId).then(function() {
            if (typeof showToast !== 'undefined') {
                showToast('Homebrew borttagen!', 'success');
            }
            self.loadCreatedItems();
            
            // Update user profile stats
            UserProfileService.updateStats(user.uid, { homebrewCount: -1 });
        }).catch(function(err) {
            console.error('Error deleting:', err);
            if (typeof showToast !== 'undefined') {
                showToast('Ett fel uppstod: ' + err.message, 'error');
            }
        });
    },
    
    // Filter by category
    filterByCategory: function(category) {
        this.currentCategory = category;
        
        // Update active tab
        document.querySelectorAll('.homebrew-category-tab').forEach(function(tab) {
            tab.classList.remove('active');
        });
        document.querySelector('[data-category="' + category + '"]').classList.add('active');
        
        this.loadHomebrewItems();
    },
    
    // Sort by
    sortBy: function(sort) {
        this.currentSort = sort;
        var select = document.getElementById('homebrewSort');
        if (select) select.value = sort;
        
        this.loadHomebrewItems();
    },
    
    // Perform search
    performSearch: function() {
        var self = this;
        
        if (!this.searchTerm || this.searchTerm.length < 2) {
            this.loadHomebrewItems();
            return;
        }
        
        HomebrewService.searchHomebrew(this.searchTerm, {
            type: this.currentCategory !== 'all' ? this.currentCategory : null
        }).then(function(items) {
            self.renderHomebrewGrid(items);
        }).catch(function(err) {
            console.error('Error searching:', err);
        });
    },
    
    // Utility: Escape HTML
    escapeHtml: function(text) {
        var div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    },
    
    // Utility: Get initials
    getInitials: function(name) {
        if (!name) return '?';
        return name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase().substring(0, 2);
    },
    
    // Utility: Format date
    formatDate: function(timestamp) {
        if (!timestamp) return 'okänd';
        var date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        var months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
        return months[date.getMonth()] + ' ' + date.getFullYear();
    }
};

console.log('✅ HomebrewUI loaded');
