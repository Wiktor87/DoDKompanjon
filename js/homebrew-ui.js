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
            
            // Author click
            if (e.target.matches('[data-author-id]')) {
                var authorId = e.target.getAttribute('data-author-id');
                self.showAuthorProfile(authorId);
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
        
        grid.innerHTML = html;
    },
    
    // Get homebrew card HTML
    getHomebrewCardHTML: function(item) {
        var category = HomebrewService.CATEGORIES[item.type] || { label: item.type, icon: '📜' };
        var rating = item.rating > 0 ? '★ ' + item.rating.toFixed(1) : 'Ej betygsatt';
        var description = this.escapeHtml(item.description);
        var truncatedDesc = description.length > 120 ? description.substring(0, 120) + '...' : description;
        
        return '<div class="homebrew-card" data-type="' + item.type + '">' +
            '<div class="homebrew-card-header">' +
                '<span class="homebrew-type-badge">' + category.icon + ' ' + category.label + '</span>' +
                '<span class="homebrew-rating">' + rating + '</span>' +
            '</div>' +
            '<h3 class="homebrew-card-title">' + this.escapeHtml(item.name) + '</h3>' +
            '<p class="homebrew-card-description">' + truncatedDesc + '</p>' +
            '<div class="homebrew-card-footer">' +
                '<div class="homebrew-author" data-author-id="' + item.authorId + '">' +
                    '<div class="author-avatar">' + this.getInitials(item.authorName) + '</div>' +
                    '<span class="author-name">' + this.escapeHtml(item.authorName) + '</span>' +
                '</div>' +
                '<div class="homebrew-stats">' +
                    '<span class="stat-item">⬇️ ' + item.downloads + '</span>' +
                '</div>' +
            '</div>' +
            '<button class="homebrew-add-btn" data-save-homebrew="' + item.id + '">+ Lägg till</button>' +
        '</div>';
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
