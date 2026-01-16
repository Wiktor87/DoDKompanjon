// Homebrew UI - UI rendering functions for homebrew feature
var HomebrewUI = {
    currentView: 'browse', // browse, collection, create
    currentCategory: 'all',
    currentSort: 'newest',
    searchTerm: '',
    homebrewItems: [],
    currentSlide: 0,
    cardsPerView: 4, // Default, will be adjusted based on screen width
    CARD_GAP: 24, // Gap between cards in pixels (1.5rem = 24px, matches CSS)
    
    // Initialize homebrew section
    init: function() {
        console.log('🎨 HomebrewUI initializing...');
        this.renderBrowseView();
        this.attachEventListeners();
        this.updateCardsPerView();
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
            
            // Edit homebrew
            if (e.target.matches('[data-edit-homebrew]')) {
                var homebrewId = e.target.getAttribute('data-edit-homebrew');
                self.editHomebrew(homebrewId);
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
            '<div class="homebrew-carousel">' +
                '<button class="carousel-arrow left" onclick="HomebrewUI.scrollHomebrew(-1)" id="homebrewCarouselLeft">' +
                    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>' +
                '</button>' +
                '<div class="homebrew-cards-container">' +
                    '<div class="homebrew-cards-track" id="homebrewGrid"></div>' +
                '</div>' +
                '<button class="carousel-arrow right" onclick="HomebrewUI.scrollHomebrew(1)" id="homebrewCarouselRight">' +
                    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>' +
                '</button>' +
            '</div>' +
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
        
        // Check if current user is owner
        var currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        var isOwner = currentUser && item.authorId === currentUser.uid;
        
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
        
        // Card header with type badge and action buttons
        html += '<div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">';
        html += '<div class="fantasy-homebrew-type-badge ' + typeClass + '">' + category.label + '</div>';
        
        // Owner action buttons
        if (isOwner) {
            html += '<div class="homebrew-card-actions">' +
                '<button class="homebrew-btn-edit" onclick="event.stopPropagation();HomebrewUI.editHomebrew(\'' + item.id + '\')">✏️</button>' +
                '<button class="homebrew-btn-delete" onclick="event.stopPropagation();HomebrewUI.deleteHomebrew(\'' + item.id + '\')">🗑️</button>' +
                '</div>';
        }
        
        html += '</div>';
        
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
        var actions = '';
        
        if (isOwner) {
            actions = '<button class="collection-action-btn" data-edit-homebrew="' + item.id + '">✏️ Redigera</button>' +
                '<button class="collection-action-btn" data-delete-homebrew="' + item.id + '">🗑️ Ta bort</button>';
        } else {
            actions = '<button class="collection-action-btn">Använd på karaktär</button>';
        }
        
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
    showCreateForm: function(type, existingData) {
        var container = document.getElementById('homebrewContent');
        if (!container) return;
        
        var category = HomebrewService.CATEGORIES[type];
        var isEdit = !!existingData;
        container.innerHTML = this.getCreateFormHTML(type, category, isEdit, existingData);
        
        // Attach form submit
        var form = document.getElementById('homebrewCreateForm');
        if (form) {
            if (isEdit) {
                form.addEventListener('submit', this.handleEditSubmit.bind(this, existingData.id, type));
            } else {
                form.addEventListener('submit', this.handleFormSubmit.bind(this, type));
            }
        }
    },
    
    // Get create form HTML
    getCreateFormHTML: function(type, category, isEdit, existingData) {
        existingData = existingData || {};
        var buttonText = isEdit ? 'Spara ändringar' : 'Skapa homebrew';
        var headerText = isEdit ? 'Redigera ' + category.label : 'Skapa ' + category.label;
        
        return '<div class="homebrew-create-form">' +
            '<div class="form-header">' +
                '<button class="btn-back" data-homebrew-view="create">← Tillbaka</button>' +
                '<h2>' + category.icon + ' ' + headerText + '</h2>' +
            '</div>' +
            '<form id="homebrewCreateForm">' +
                this.getFormFieldsHTML(type, existingData) +
                '<div class="form-visibility">' +
                    '<h3>Synlighet</h3>' +
                    '<div class="visibility-options">' +
                        '<label class="visibility-option ' + ((!existingData.visibility || existingData.visibility === 'private') ? 'active' : '') + '">' +
                            '<input type="radio" name="visibility" value="private" ' + ((!existingData.visibility || existingData.visibility === 'private') ? 'checked' : '') + '>' +
                            '<span>🔒 Privat</span>' +
                        '</label>' +
                        '<label class="visibility-option ' + (existingData.visibility === 'group' ? 'active' : '') + '">' +
                            '<input type="radio" name="visibility" value="group" ' + (existingData.visibility === 'group' ? 'checked' : '') + '>' +
                            '<span>👥 Grupp</span>' +
                        '</label>' +
                        '<label class="visibility-option ' + (existingData.visibility === 'public' ? 'active' : '') + '">' +
                            '<input type="radio" name="visibility" value="public" ' + (existingData.visibility === 'public' ? 'checked' : '') + '>' +
                            '<span>🌍 Publik</span>' +
                        '</label>' +
                    '</div>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="checkbox-label">' +
                        '<input type="checkbox" name="availableForCharacters" ' + (existingData.availableForCharacters ? 'checked' : '') + '>' +
                        '<span>Tillgänglig för karaktärer?</span>' +
                    '</label>' +
                    '<p class="form-help-text">När aktiverat kommer detta att vara tillgängligt i karaktärsskaparen (kräver att det finns i "Min Samling")</p>' +
                '</div>' +
                '<div class="form-actions">' +
                    '<button type="submit" class="btn btn-gold">' + buttonText + '</button>' +
                '</div>' +
            '</form>' +
        '</div>';
    },
    
    // Get form fields HTML based on type
    getFormFieldsHTML: function(type, existingData) {
        existingData = existingData || {};
        var data = existingData.data || {};
        
        var commonFields = '<div class="form-group">' +
            '<label>Namn *</label>' +
            '<input type="text" name="name" class="form-input" value="' + this.escapeHtml(data.name || '') + '" required>' +
        '</div>' +
        '<div class="form-group">' +
            '<label>Beskrivning *</label>' +
            '<textarea name="description" class="form-textarea" rows="4" required>' + this.escapeHtml(data.description || '') + '</textarea>' +
        '</div>';
        
        var specificFields = '';
        
        if (type === 'abilities') {
            specificFields = '<div class="form-group">' +
                '<label>Krav</label>' +
                '<input type="text" name="requirement" class="form-input" placeholder="t.ex. Smyga 14" value="' + this.escapeHtml(data.requirement || '') + '">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>VV-kostnad</label>' +
                '<input type="number" name="wp" class="form-input" min="0" value="' + (data.wp || '') + '">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Typ</label>' +
                '<select name="abilityType" class="form-select">' +
                    '<option value="action"' + (data.abilityType === 'action' ? ' selected' : '') + '>Handling</option>' +
                    '<option value="reaction"' + (data.abilityType === 'reaction' ? ' selected' : '') + '>Reaktion</option>' +
                    '<option value="passive"' + (data.abilityType === 'passive' ? ' selected' : '') + '>Passiv</option>' +
                '</select>' +
            '</div>';
        } else if (type === 'monsters') {
            specificFields = '<h3 style="margin-top: 1.5rem;">Attribut</h3>' +
            '<div class="form-row">' +
                '<div class="form-group"><label>STY</label><input type="number" name="attributes_STY" class="form-input" value="' + ((data.attributes && data.attributes.STY) || '10') + '"></div>' +
                '<div class="form-group"><label>FYS</label><input type="number" name="attributes_FYS" class="form-input" value="' + ((data.attributes && data.attributes.FYS) || '10') + '"></div>' +
                '<div class="form-group"><label>SMI</label><input type="number" name="attributes_SMI" class="form-input" value="' + ((data.attributes && data.attributes.SMI) || '10') + '"></div>' +
            '</div>' +
            '<div class="form-row">' +
                '<div class="form-group"><label>INT</label><input type="number" name="attributes_INT" class="form-input" value="' + ((data.attributes && data.attributes.INT) || '10') + '"></div>' +
                '<div class="form-group"><label>PSY</label><input type="number" name="attributes_PSY" class="form-input" value="' + ((data.attributes && data.attributes.PSY) || '10') + '"></div>' +
                '<div class="form-group"><label>KAR</label><input type="number" name="attributes_KAR" class="form-input" value="' + ((data.attributes && data.attributes.KAR) || '10') + '"></div>' +
            '</div>' +
            '<h3 style="margin-top: 1.5rem;">Hälsa & Viljekraft</h3>' +
            '<div class="form-row">' +
                '<div class="form-group"><label>Max KP</label><input type="number" name="maxKP" class="form-input" value="' + (data.maxKP || '') + '"></div>' +
                '<div class="form-group"><label>Nuvarande KP</label><input type="number" name="currentKP" class="form-input" value="' + (data.currentKP || data.maxKP || '') + '"></div>' +
            '</div>' +
            '<div class="form-row">' +
                '<div class="form-group"><label>Max VP</label><input type="number" name="maxVP" class="form-input" value="' + (data.maxVP || '') + '"></div>' +
                '<div class="form-group"><label>Nuvarande VP</label><input type="number" name="currentVP" class="form-input" value="' + (data.currentVP || data.maxVP || '') + '"></div>' +
            '</div>' +
            '<h3 style="margin-top: 1.5rem;">Övriga egenskaper</h3>' +
            '<div class="form-group">' +
                '<label>Förflyttning</label>' +
                '<input type="text" name="movement" class="form-input" placeholder="t.ex. 10 meter" value="' + this.escapeHtml(data.movement || '') + '">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Storlek</label>' +
                '<input type="text" name="size" class="form-input" placeholder="t.ex. Medel, Stor" value="' + this.escapeHtml(data.size || '') + '">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Rustning</label>' +
                '<input type="text" name="armor" class="form-input" placeholder="t.ex. Läder (2)" value="' + this.escapeHtml(data.armor || '') + '">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Vapen</label>' +
                '<textarea name="weapons" class="form-textarea" rows="3" placeholder="Lista vapen med skada, ett per rad">' + this.escapeHtml(data.weapons || '') + '</textarea>' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Utrustning</label>' +
                '<textarea name="equipment" class="form-textarea" rows="3" placeholder="Lista utrustning, ett per rad">' + this.escapeHtml(data.equipment || '') + '</textarea>' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Förmågor</label>' +
                '<textarea name="abilities" class="form-textarea" rows="4" placeholder="Lista förmågor">' + this.escapeHtml(data.abilities || '') + '</textarea>' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Färdigheter</label>' +
                '<textarea name="skills" class="form-textarea" rows="3" placeholder="Lista färdigheter med värden">' + this.escapeHtml(data.skills || '') + '</textarea>' +
            '</div>';
        } else if (type === 'spells') {
            specificFields = '<div class="form-group">' +
                '<label>Skola</label>' +
                '<input type="text" name="school" class="form-input" value="' + this.escapeHtml(data.school || '') + '">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>VV-kostnad</label>' +
                '<input type="number" name="wp" class="form-input" min="0" value="' + (data.wp || '') + '">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Räckvidd</label>' +
                '<input type="text" name="range" class="form-input" value="' + this.escapeHtml(data.range || '') + '">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Varaktighet</label>' +
                '<input type="text" name="duration" class="form-input" value="' + this.escapeHtml(data.duration || '') + '">' +
            '</div>';
        } else if (type === 'items') {
            specificFields = '<div class="form-group">' +
                '<label>Typ</label>' +
                '<input type="text" name="itemType" class="form-input" value="' + this.escapeHtml(data.itemType || '') + '">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Sällsynthet</label>' +
                '<select name="rarity" class="form-select">' +
                    '<option value="common"' + (data.rarity === 'common' ? ' selected' : '') + '>Vanlig</option>' +
                    '<option value="uncommon"' + (data.rarity === 'uncommon' ? ' selected' : '') + '>Ovanlig</option>' +
                    '<option value="rare"' + (data.rarity === 'rare' ? ' selected' : '') + '>Sällsynt</option>' +
                    '<option value="legendary"' + (data.rarity === 'legendary' ? ' selected' : '') + '>Legendarisk</option>' +
                '</select>' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Värde</label>' +
                '<input type="text" name="value" class="form-input" value="' + this.escapeHtml(data.value || '') + '">' +
            '</div>';
        } else if (type === 'equipment') {
            specificFields = '<div class="form-group">' +
                '<label>Typ</label>' +
                '<input type="text" name="equipmentType" class="form-input" placeholder="t.ex. Vapen, Rustning, Verktyg" value="' + this.escapeHtml(data.equipmentType || '') + '">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Vikt</label>' +
                '<input type="text" name="weight" class="form-input" placeholder="t.ex. 2 kg" value="' + this.escapeHtml(data.weight || '') + '">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Kostnad</label>' +
                '<input type="text" name="cost" class="form-input" placeholder="t.ex. 50 silver" value="' + this.escapeHtml(data.cost || '') + '">' +
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
            if (key !== 'visibility' && key !== 'availableForCharacters') {
                // Handle nested attributes for monsters
                if (key.startsWith('attributes_')) {
                    if (!data.attributes) data.attributes = {};
                    var attrName = key.replace('attributes_', '');
                    data.attributes[attrName] = parseInt(value) || 10;
                } else {
                    data[key] = value;
                }
            }
        });
        
        var visibility = formData.get('visibility');
        var availableForCharacters = formData.get('availableForCharacters') === 'on';
        
        HomebrewService.createHomebrew(type, data, visibility, null, availableForCharacters).then(function(homebrew) {
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
    
    // Handle edit submit
    handleEditSubmit: function(homebrewId, type, e) {
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
            if (key !== 'visibility' && key !== 'availableForCharacters') {
                // Handle nested attributes for monsters
                if (key.startsWith('attributes_')) {
                    if (!data.attributes) data.attributes = {};
                    var attrName = key.replace('attributes_', '');
                    data.attributes[attrName] = parseInt(value) || 10;
                } else {
                    data[key] = value;
                }
            }
        });
        
        var visibility = formData.get('visibility');
        var availableForCharacters = formData.get('availableForCharacters') === 'on';
        
        var updates = {
            data: data,
            visibility: visibility,
            availableForCharacters: availableForCharacters
        };
        
        HomebrewService.updateHomebrew(homebrewId, updates).then(function() {
            if (typeof showToast !== 'undefined') {
                showToast('Homebrew uppdaterad!', 'success');
            }
            self.switchView('collection');
        }).catch(function(err) {
            console.error('Error updating homebrew:', err);
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
    
    // Edit homebrew
    editHomebrew: function(homebrewId) {
        var self = this;
        
        HomebrewService.getHomebrew(homebrewId).then(function(homebrew) {
            self.showCreateForm(homebrew.type, homebrew);
        }).catch(function(err) {
            console.error('Error loading homebrew for editing:', err);
            if (typeof showToast !== 'undefined') {
                showToast('Kunde inte ladda homebrew', 'error');
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
    },
    
    // Update cards per view based on screen width
    updateCardsPerView: function() {
        var width = window.innerWidth;
        if (width < 768) {
            this.cardsPerView = 1;
        } else if (width < 1024) {
            this.cardsPerView = 2;
        } else if (width < 1400) {
            this.cardsPerView = 3;
        } else {
            this.cardsPerView = 4;
        }
    },
    
    // Scroll homebrew carousel
    scrollHomebrew: function(direction) {
        var track = document.querySelector('.homebrew-cards-track');
        if (!track) return;
        
        var cards = track.children;
        if (cards.length === 0) return;
        
        this.updateCardsPerView();
        var maxSlide = Math.max(0, cards.length - this.cardsPerView);
        
        this.currentSlide = Math.max(0, Math.min(maxSlide, this.currentSlide + direction));
        
        var cardWidth = cards[0].offsetWidth + this.CARD_GAP;
        track.style.transform = 'translateX(-' + (this.currentSlide * cardWidth) + 'px)';
        
        // Update arrow states
        var leftArrow = document.getElementById('homebrewCarouselLeft');
        var rightArrow = document.getElementById('homebrewCarouselRight');
        
        if (leftArrow) {
            leftArrow.disabled = this.currentSlide === 0;
            leftArrow.style.opacity = this.currentSlide === 0 ? '0.3' : '1';
            leftArrow.style.cursor = this.currentSlide === 0 ? 'not-allowed' : 'pointer';
        }
        
        if (rightArrow) {
            rightArrow.disabled = this.currentSlide >= maxSlide;
            rightArrow.style.opacity = this.currentSlide >= maxSlide ? '0.3' : '1';
            rightArrow.style.cursor = this.currentSlide >= maxSlide ? 'not-allowed' : 'pointer';
        }
    }
};

console.log('✅ HomebrewUI loaded');
