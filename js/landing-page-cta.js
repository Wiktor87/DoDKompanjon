// Landing Page CTA Video Carousel
(function() {
    'use strict';
    
    var VideoCarousel = {
        videos: [
            'Website_Animation_For_Drakar_och_Demoner.mp4',
            'Skapa_Drakar_Demoner_Bakgrundsvideo.mp4'
        ],
        currentIndex: 0,
        videoElements: [],
        isTransitioning: false,
        
        init: function() {
            var container = document.querySelector('.bg-video-carousel');
            if (!container) {
                console.warn('Video carousel container not found');
                return;
            }
            
            this.videoElements = [];
            
            // Create video elements for each video
            this.videos.forEach(function(videoSrc, index) {
                var video = document.createElement('video');
                video.className = 'bg-video';
                video.muted = true;
                video.loop = false;
                video.playsinline = true;
                video.preload = 'auto';
                
                var source = document.createElement('source');
                source.src = videoSrc;
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
            
            // Start playing the first video
            if (this.videoElements.length > 0) {
                this.playVideo(0);
            }
            
            // Set up event listeners for video end
            this.videoElements.forEach(function(video, index) {
                video.addEventListener('ended', function() {
                    this.transitionToNext();
                }.bind(this));
            }.bind(this));
        },
        
        playVideo: function(index) {
            if (index >= 0 && index < this.videoElements.length) {
                var video = this.videoElements[index];
                video.play().catch(function(error) {
                    console.error('Error playing video:', error);
                });
            }
        },
        
        transitionToNext: function() {
            if (this.isTransitioning) return;
            this.isTransitioning = true;
            
            var currentVideo = this.videoElements[this.currentIndex];
            var nextIndex = (this.currentIndex + 1) % this.videos.length;
            var nextVideo = this.videoElements[nextIndex];
            
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
                this.playVideo(nextIndex);
                
                // Remove fade-in class after animation
                setTimeout(function() {
                    nextVideo.classList.remove('fade-in');
                    this.isTransitioning = false;
                }.bind(this), 1000);
                
                this.currentIndex = nextIndex;
            }.bind(this), 1000);
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
})();

console.log('✅ Landing page CTA carousel loaded');