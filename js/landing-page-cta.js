// Landing Page CTA Video Carousel with Synced Content
(function() {
    'use strict';
    
    var TRANSITION_DURATION_MS = 1000; // Fade transition duration
    var PROGRESS_UPDATE_INTERVAL = 50; // How often to update progress bar (ms)
    
    var VideoCarousel = {
        // Slide data: each slide has video + CTA content
        slides: [
            {
                video: 'Website_Animation_For_Drakar_och_Demoner.mp4',
                titleMain: 'Ditt Äventyr',
                titleSub: 'Börjar Här',
                description: 'Skapa karaktärer, organisera kampanjer och dela äventyr med dina vänner.',
                primaryBtn: {
                    text: '⚔️ Börja Äventyra',
                    action: 'signup'
                },
                secondaryBtn: {
                    text: 'Utforska funktioner',
                    action: 'scrollToFeatures'
                }
            },
            {
                video: 'Skapa_Drakar_Demoner_Bakgrundsvideo.mp4',
                titleMain: 'Hemmabryggt',
                titleSub: 'Din Fantasi, Dina Regler',
                description: 'Skapa egna monster, föremål, besvärjelser och bakgrunder. Dela med communityn eller håll dem privata.',
                primaryBtn: {
                    text: '🧪 Utforska Hemmabryggt',
                    action: 'homebrew'
                },
                secondaryBtn: {
                    text: 'Skapa eget innehåll',
                    action: 'homebrewCreate'
                }
            }
        ],
        currentIndex: 0,
        videoElements: [],
        isTransitioning: false,
        heroContentEl: null,
        progressInterval: null,
        progressBarEl: null,
        
        init: function() {
            var container = document.querySelector('.bg-video-carousel');
            if (!container) {
                return; // Silently fail if container not found
            }
            
            this.heroContentEl = document.querySelector('.hero-content');
            this.videoElements = [];
            
            // Create video elements for each slide
            this.slides.forEach(function(slide, index) {
                var video = document.createElement('video');
                video.className = 'bg-video';
                video.muted = true;
                video.loop = false;
                video.playsinline = true;
                video.preload = 'auto';
                
                var source = document.createElement('source');
                source.src = slide.video;
                source.type = 'video/mp4';
                video.appendChild(source);
                
                // Set initial visibility
                if (index === 0) {
                    video.classList.add('active');
                } else {
                    video.classList.add('hidden');
                }
                
                container.appendChild(video);
                this.videoElements.push(video);
            }.bind(this));
            
            // Update CTA content to initial slide
            this.updateCTAContent(0, false);
            
            // Create carousel controls (nav arrows, indicators, progress)
            this.createCarouselControls();
            
            // Start playing the first video
            if (this.videoElements.length > 0) {
                this.playVideo(0);
                this.startProgressTracking();
            }
            
            // Set up event listeners for video end
            this.videoElements.forEach(function(video, index) {
                video.addEventListener('ended', function() {
                    this.transitionToNext();
                }.bind(this));
            }.bind(this));
        },
        
        createCarouselControls: function() {
            var heroSection = document.querySelector('.landing-header');
            if (!heroSection) return;
            
            // Create controls container
            var controlsContainer = document.createElement('div');
            controlsContainer.className = 'carousel-controls';
            
            // Previous button
            var prevBtn = document.createElement('button');
            prevBtn.className = 'carousel-nav carousel-prev';
            prevBtn.setAttribute('aria-label', 'Föregående slide');
            prevBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>';
            prevBtn.onclick = function() {
                this.transitionToPrev();
            }.bind(this);
            controlsContainer.appendChild(prevBtn);
            
            // Center section (indicators + progress)
            var centerSection = document.createElement('div');
            centerSection.className = 'carousel-center';
            
            // Indicators
            var indicatorContainer = document.createElement('div');
            indicatorContainer.className = 'carousel-indicators';
            
            this.slides.forEach(function(slide, index) {
                var dot = document.createElement('button');
                dot.className = 'carousel-dot' + (index === 0 ? ' active' : '');
                dot.setAttribute('aria-label', 'Gå till slide ' + (index + 1));
                dot.onclick = function() {
                    if (!this.isTransitioning && index !== this.currentIndex) {
                        this.transitionToSlide(index);
                    }
                }.bind(this);
                indicatorContainer.appendChild(dot);
            }.bind(this));
            
            centerSection.appendChild(indicatorContainer);
            
            // Progress bar
            var progressContainer = document.createElement('div');
            progressContainer.className = 'carousel-progress';
            var progressBar = document.createElement('div');
            progressBar.className = 'carousel-progress-bar';
            progressContainer.appendChild(progressBar);
            this.progressBarEl = progressBar;
            
            centerSection.appendChild(progressContainer);
            controlsContainer.appendChild(centerSection);
            
            // Next button
            var nextBtn = document.createElement('button');
            nextBtn.className = 'carousel-nav carousel-next';
            nextBtn.setAttribute('aria-label', 'Nästa slide');
            nextBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
            nextBtn.onclick = function() {
                this.transitionToNext();
            }.bind(this);
            controlsContainer.appendChild(nextBtn);
            
            heroSection.appendChild(controlsContainer);
        },
        
        startProgressTracking: function() {
            var self = this;
            
            // Clear any existing interval
            if (this.progressInterval) {
                clearInterval(this.progressInterval);
            }
            
            this.progressInterval = setInterval(function() {
                self.updateProgress();
            }, PROGRESS_UPDATE_INTERVAL);
        },
        
        updateProgress: function() {
            if (!this.progressBarEl) return;
            if (this.isTransitioning) return;
            
            var currentVideo = this.videoElements[this.currentIndex];
            if (!currentVideo || !currentVideo.duration) return;
            
            var progress = (currentVideo.currentTime / currentVideo.duration) * 100;
            this.progressBarEl.style.width = progress + '%';
        },
        
        resetProgress: function() {
            if (this.progressBarEl) {
                this.progressBarEl.style.width = '0%';
            }
        },
        
        updateIndicators: function(index) {
            var dots = document.querySelectorAll('.carousel-dot');
            dots.forEach(function(dot, i) {
                dot.classList.toggle('active', i === index);
            });
        },
        
        updateCTAContent: function(index, animate) {
            if (!this.heroContentEl) return;
            
            var slide = this.slides[index];
            var self = this;
            
            if (animate) {
                // Fade out
                this.heroContentEl.classList.add('cta-fade-out');
                
                setTimeout(function() {
                    self.setCTAHTML(slide);
                    self.heroContentEl.classList.remove('cta-fade-out');
                    self.heroContentEl.classList.add('cta-fade-in');
                    
                    setTimeout(function() {
                        self.heroContentEl.classList.remove('cta-fade-in');
                    }, TRANSITION_DURATION_MS);
                }, TRANSITION_DURATION_MS / 2);
            } else {
                this.setCTAHTML(slide);
            }
        },
        
        setCTAHTML: function(slide) {
            if (!this.heroContentEl) return;
            
            this.heroContentEl.innerHTML = 
                '<h1 class="hero-title">' +
                    '<span class="hero-title-main">' + slide.titleMain + '</span>' +
                    '<span class="hero-title-sub">' + slide.titleSub + '</span>' +
                '</h1>' +
                '<p class="hero-description">' + slide.description + '</p>' +
                '<div class="hero-cta">' +
                    '<button class="btn btn-gold btn-xl" data-cta-action="' + slide.primaryBtn.action + '">' + slide.primaryBtn.text + '</button>' +
                    '<button class="btn btn-outline btn-xl" data-cta-action="' + slide.secondaryBtn.action + '">' + slide.secondaryBtn.text + '</button>' +
                '</div>';
            
            // Bind button actions
            this.bindCTAButtons();
        },
        
        bindCTAButtons: function() {
            var buttons = this.heroContentEl.querySelectorAll('[data-cta-action]');
            buttons.forEach(function(btn) {
                btn.onclick = function() {
                    var action = btn.getAttribute('data-cta-action');
                    this.handleCTAAction(action);
                }.bind(this);
            }.bind(this));
        },
        
        handleCTAAction: function(action) {
            switch(action) {
                case 'signup':
                    if (typeof showAuthModal === 'function') {
                        showAuthModal('register');
                    }
                    break;
                case 'scrollToFeatures':
                    if (typeof scrollToFeatures === 'function') {
                        scrollToFeatures();
                    }
                    break;
                case 'homebrew':
                    // If logged in, go to homebrew section; otherwise show signup
                    if (typeof currentUser !== 'undefined' && currentUser) {
                        if (typeof showSection === 'function') {
                            showSection('homebrew');
                        }
                    } else {
                        if (typeof showAuthModal === 'function') {
                            showAuthModal('register');
                        }
                    }
                    break;
                case 'homebrewCreate':
                    // If logged in, go to homebrew create; otherwise show signup
                    if (typeof currentUser !== 'undefined' && currentUser) {
                        if (typeof showSection === 'function') {
                            showSection('homebrew');
                            // Trigger create modal after a short delay
                            setTimeout(function() {
                                var createBtn = document.querySelector('[onclick*="openHomebrewCreator"]');
                                if (createBtn) createBtn.click();
                            }, 300);
                        }
                    } else {
                        if (typeof showAuthModal === 'function') {
                            showAuthModal('register');
                        }
                    }
                    break;
            }
        },
        
        playVideo: function(index) {
            if (index >= 0 && index < this.videoElements.length) {
                var video = this.videoElements[index];
                video.play().catch(function(error) {
                    console.error('Error playing video:', error);
                });
            }
        },
        
        transitionToSlide: function(targetIndex) {
            if (this.isTransitioning) return;
            if (targetIndex === this.currentIndex) return;
            
            this.isTransitioning = true;
            this.resetProgress();
            
            var currentVideo = this.videoElements[this.currentIndex];
            var nextVideo = this.videoElements[targetIndex];
            
            // Update CTA content with animation
            this.updateCTAContent(targetIndex, true);
            
            // Update indicators
            this.updateIndicators(targetIndex);
            
            // Fade out current video
            currentVideo.classList.add('fade-out');
            
            // Wait for fade out, then switch
            setTimeout(function() {
                currentVideo.classList.remove('active', 'fade-out');
                currentVideo.classList.add('hidden');
                currentVideo.pause();
                currentVideo.currentTime = 0;
                
                // Fade in next video
                nextVideo.classList.remove('hidden');
                nextVideo.classList.add('active', 'fade-in');
                this.playVideo(targetIndex);
                
                // Remove fade-in class after animation
                setTimeout(function() {
                    nextVideo.classList.remove('fade-in');
                    this.isTransitioning = false;
                }.bind(this), TRANSITION_DURATION_MS);
                
                this.currentIndex = targetIndex;
            }.bind(this), TRANSITION_DURATION_MS);
        },
        
        transitionToNext: function() {
            var nextIndex = (this.currentIndex + 1) % this.slides.length;
            this.transitionToSlide(nextIndex);
        },
        
        transitionToPrev: function() {
            var prevIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
            this.transitionToSlide(prevIndex);
        }
    };
    
    // Initialize carousel when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            VideoCarousel.init();
        });
    } else {
        VideoCarousel.init();
    }
    
    // Expose for debugging
    window.VideoCarousel = VideoCarousel;
})();
