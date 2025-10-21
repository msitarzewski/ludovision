document.addEventListener('DOMContentLoaded', function () {    
        
    // Settings and variables - move these to the top
    const settings = typeof window.settings === 'object' ? window.settings : {};

    let token = null;
    let refreshToken = null;
    let imageSize = typeof settings.imageSize === 'number' ? settings.imageSize : 128;
    let launchWarning = typeof settings.launchWarning === 'boolean' ? settings.launchWarning : true;
    let magnifier = typeof settings.magnifier === 'boolean' ? settings.magnifier : true;
    let blurUnwanted = typeof settings.blurUnwanted === 'boolean' ? settings.blurUnwanted : true;
    let newestFirst = typeof settings.newestFirst === 'boolean' ? settings.newestFirst : false;
    let feedDelay = typeof settings.feedDelay === 'number' ? settings.feedDelay : 0;
    let feedPaused = typeof settings.feedPaused === 'boolean' ? settings.feedPaused : false;
    let useLocalStorage = typeof settings.useLocalStorage === 'boolean' ? settings.useLocalStorage : false;
    let inactivityTimeout = typeof settings.inactivityTimeout === 'number' ? settings.inactivityTimeout : null;
    let showImages = typeof settings.showImages === 'boolean' ? settings.showImages : true;
    let showVideos = typeof settings.showVideos === 'boolean' ? settings.showVideos : true;
    let pendingImages = [];
    let totalImages = 0;
    let currentGalleryImageIndex = 0;

    // List of unwanted labels
    const unwantedLabels = ["porn", "gore", "nudity", "graphic-media"];

    // Bluesky credentials
    let bsky_identifier = typeof settings.bsky_identifier === 'string' ? settings.bsky_identifier : null;
    let bsky_appPassword = typeof settings.bsky_appPassword === 'string' ? settings.bsky_appPassword : null;

    // Elements
    const header = document.getElementById('header');
    const warningModal = document.getElementById('warning-modal');
    const okButton = document.getElementById('ok-button');
    const launchWarningCheckbox = document.getElementById('launch-warning-checkbox');
    const cancelButton = document.getElementById('cancel-button');
    const galleryModal = document.getElementById('gallery-modal');
    const closeGalleryButton = document.getElementById('close-gallery-button');
    const imagesContainer = document.getElementById('images-container');
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const modalVideo = document.getElementById('modal-video');
    const profileLink = document.getElementById('profile-link');
    const galleryProfileLink = document.getElementById('gallery-profile-link');
    const copyPlcBtn = document.getElementById('copy-plc-btn');
    const viewAllMediaButton = document.getElementById('view-all-media-button');
    const galleryInstructionsModal = document.getElementById('instructions-modal');
    const closeInstructionsButton = document.getElementById('close-instructions-button');
    const galleryContainer = document.querySelector('#gallery-modal .grid');
    const galleryImageModal = document.getElementById('gallery-image-modal');
    const galleryModalImage = document.getElementById('gallery-modal-image');
    const galleryModalVideo = document.getElementById('gallery-modal-video');
    const galleryControls = document.querySelector('.gallery-controls');
    const galleryGrid = document.querySelector('#gallery-modal .grid');
    const gallerySizeSlider = document.getElementById('gallery-size-slider');
    const gallerySizeValue = document.getElementById('gallery-size-value');
    const imageSizeSlider = document.getElementById('image-size-slider');
    const imageSizeInput = document.getElementById('image-size-input');
    const magnifierElement = document.getElementById('magnifier');
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const settingsContainer = document.getElementById('settings-container');
    const closeSettingsButton = document.getElementById('close-settings-button');
    const sortToggle = document.getElementById('sort-toggle');
    const blurToggle = document.getElementById('blur-toggle');
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    const showImagesCheckbox = document.getElementById('show-images');
    const showVideosCheckbox = document.getElementById('show-videos');

    const identifierInput = document.getElementById('bsky-identifier');
    const appPasswordInput = document.getElementById('bsky-app-password');
    const authButton = document.getElementById('auth-button');
    const clearButton = document.getElementById('clear-button');

    // PLC reveal elements
    const plcRevealBtn = document.getElementById('plc-reveal-btn');
    const plcForm = document.getElementById('plc-form');
    const plcInput = document.getElementById('plc-input');

    if (plcRevealBtn && plcForm && plcInput) {
        plcRevealBtn.addEventListener('click', function() {
            plcRevealBtn.style.display = 'none';
            plcForm.style.display = 'inline-flex';
            plcInput.focus();
        });
        plcForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const plcValue = plcInput.value.trim();
            if (plcValue) {
                const url = new URL(window.location.href);
                url.searchParams.set('plc', plcValue);
                window.location.href = url.toString();
            }
        });
        plcInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                plcForm.style.display = 'none';
                plcRevealBtn.style.display = 'inline-block';
            }
        });

        // Add global keydown for 'G' to reveal PLC entry
        document.addEventListener('keydown', function(e) {
            // Only trigger if not focused on input/textarea, and not with modifier keys
            if (
                e.key.toLowerCase() === 'g' &&
                !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey &&
                document.activeElement &&
                ['input', 'textarea'].indexOf(document.activeElement.tagName.toLowerCase()) === -1 &&
                plcRevealBtn.style.display !== 'none'
            ) {
                e.preventDefault();
                plcRevealBtn.click();
            }
        });
    }

    // Load stored credentials and tokens if localStorage is enabled
    if (useLocalStorage) {
        identifierInput.value = localStorage.getItem('bsky_identifier') || '';
        appPasswordInput.value = localStorage.getItem('bsky_appPassword') || '';
        token = localStorage.getItem('bsky_token') || null;
        refreshToken = localStorage.getItem('bsky_refreshToken') || null;
        tokenExpirationTime = parseInt(localStorage.getItem('bsky_tokenExpirationTime')) || 0;
    }

    // Validate app password format
    function isValidAppPassword(password) {
        const regex = /^[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}$/;
        return regex.test(password);
    }

    // Save credentials and attempt authentication
    function saveCredentialsAndAuthenticate() {
        const identifier = identifierInput.value.trim();
        const appPassword = appPasswordInput.value.trim();

        //console.log('Retrieved Identifier:', identifier);
        //console.log('Retrieved App Password:', appPassword);

        if (!isValidAppPassword(appPassword)) {
            alert('Invalid app password format. Please use xxxx-xxxx-xxxx-xxxx.');
            return;
        }

        if (settings.useLocalStorage) {
            localStorage.setItem('bsky_identifier', identifier);
            localStorage.setItem('bsky_appPassword', appPassword);
        }

        settings.bsky_identifier = identifier;
        settings.bsky_appPassword = appPassword;

        handleAuthentication();
    }

    // Clear credentials and tokens
    function clearCredentials() {
        identifierInput.value = '';
        appPasswordInput.value = '';
        if (settings.useLocalStorage) {
            localStorage.removeItem('bsky_identifier');
            localStorage.removeItem('bsky_appPassword');
            localStorage.removeItem('bsky_token');
            localStorage.removeItem('bsky_refreshToken');
            localStorage.removeItem('bsky_tokenExpirationTime');
        }
        settings.bsky_identifier = null;
        settings.bsky_appPassword = null;
        token = null;
        refreshToken = null;
        tokenExpirationTime = 0;
        clearButton.style.display = 'none';
        authButton.style.display = 'inline-block';
        //console.log('Credentials and tokens cleared.');
    }

    // Add event listener to the "Auth" button
    authButton.addEventListener('click', saveCredentialsAndAuthenticate);

    // Add event listener to the "Clear" button
    clearButton.addEventListener('click', clearCredentials);

    // warning modal
    if(launchWarning) {
        warningModal.style.display = 'flex';
    } else {
        header.style.display = 'flex';
        setupWebSocket(); // Call WebSocket setup
    }

    // Set grid-template-columns
    imagesContainer.style.gridAutoRows = `${imageSize}px`; // Set the height
    imagesContainer.style.gridTemplateColumns = `repeat(auto-fill, minmax(${imageSize}px, 1fr))`;

    // Warning modal handlers
    okButton.addEventListener('click', function () {
        if(launchWarningCheckbox.checked) {
            warningModal.style.display = 'none';
            header.style.display = 'flex';
            setupWebSocket(); // Call WebSocket setup
        } else {
            alert('You must accept the disclaimer to continue.');
        }
    });

    cancelButton.addEventListener('click', function () {
        window.location.href = 'https://bsky.app'; // Redirect
    });

    // Close gallery modal
    closeGalleryButton.addEventListener('click', function () {
        galleryModal.style.display = 'none';
        galleryModal.classList.remove('show');
        galleryControls.style.display = 'none';
        isGalleryOpen = false;
        if (galleryLoadingAbortController) {
            galleryLoadingAbortController.abort();
            galleryLoadingAbortController = null;
        }
        galleryObservers.forEach(observer => observer.disconnect());
        galleryObservers = [];
    });

    // Open profile in new tab
    document.addEventListener('click', function (event) {
        if(event.target === profileLink || event.target === galleryProfileLink) {
            event.preventDefault();
            window.open(event.target.href, '_blank');
        }
    });

    // Move the ImageQueue class definition to before its first use
    class ImageQueue {
        constructor() {
            this.pending = [];
            this.paused = false;
            this.delay = 0;
            this.processing = false;
        }

        add(imageData) {
            if (this.delay > 0) {
                this.pending.push(imageData);
                if (!this.processing && !this.paused) {
                    this.processing = true;
                    this.processNext();
                }
            } else if (this.paused) {
                this.pending.push(imageData);
            } else {
                appendImageImmediate(imageData);
            }
            updateDebugInfo();
        }

        processNext() {
            if (this.pending.length === 0 || this.paused) {
                this.processing = false;
                return;
            }
            
            const imageData = this.pending[0];
            appendImageImmediate(imageData);
            this.pending.shift();
            
            if (this.pending.length > 0 && !this.paused) {
                setTimeout(() => this.processNext(), this.delay);
            } else {
                this.processing = false;
            }
        }

        clear() {
            const count = this.pending.length;
            this.pending = [];
            this.processing = false;
            return count;
        }

        setPause(paused) {
            this.paused = paused;
            if (!paused && this.pending.length > 0 && !this.processing) {
                this.processing = true;
                this.processNext();
            }
        }

        setDelay(delay) {
            this.delay = delay;
            if (!this.processing && this.pending.length > 0 && !this.paused) {
                this.processing = true;
                this.processNext();
            }
        }
    }

    // Initialize ImageQueue at the start with current settings
    const imageQueue = new ImageQueue();
    imageQueue.delay = feedDelay;
    imageQueue.paused = feedPaused;

    // Function to check labels and determine if content should be filtered
    function hasUnwantedLabel(labels, unwantedLabels) {

        if(!blurUnwanted) {
            return false;
        }

        let hasUnwanted = false;
        let hasSystemUnwanted = false;
        let hasSelfUnwanted = false;

        if(labels.length) {
            // const hasUnwanted = labels.values.some(label => unwantedLabels.includes(label.val));
            const hasUnwanted = labels.some(label => unwantedLabels.includes(label));
            if (hasUnwanted) {
                //console.log('System unwanted label:', labels.values);
                return true;
            }
        }

        // Check system labels (if labels.values exists)
        if (labels?.values?.length) {
            const hasSystemUnwanted = labels.values.some(label => unwantedLabels.includes(label.val));
            if (hasSystemUnwanted) {
                //console.log('System unwanted label:', labels.values);
                return true;
            }
        }
    
        // Check self labels (if labels.values exists inside selfLabels)
        if (labels?.selfLabels?.values?.length) {
            const hasSelfUnwanted = labels.selfLabels.values.some(label => unwantedLabels.includes(label.val));
            if (hasSelfUnwanted) {
                //console.log('Self unwanted label:', labels.selfLabels.values);
                return true;
            }
        }
    
        return hasUnwanted || hasSystemUnwanted || hasSelfUnwanted;

    }

    // WebSocket setup
    function setupWebSocket() {
        const socket = new WebSocket('wss://jetstream1.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post');
    
        // Throttle function
        function throttle(func, limit) {
            let inThrottle;
            return function (...args) {
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => (inThrottle = false), limit);
                }
            };
        }
    
        // Throttle the WebSocket message handling
        const throttledMessageHandler = throttle(function (event) {
            try {

                imagesContainer.style.display = 'grid';
                const decodedMessage = JSON.parse(event.data);
    
                // Check for unwanted labels
                const labels = decodedMessage.commit?.record?.labels || [];

                // if (hasUnwantedLabel(labels, unwantedLabels)) {
                //     console.log("Filtered message due to unwanted label:", labels);
                //     return; // Skip this message
                // }
    
                // Handle image embeds
                if (
                    showImages &&
                    decodedMessage.commit &&
                    decodedMessage.commit.record &&
                    decodedMessage.commit.record.embed &&
                    decodedMessage.commit.record.embed.images
                ) {
                    const images = decodedMessage.commit.record.embed.images;
                    const profileDid = decodedMessage.did;
                    const profileLinkUrl = `https://bsky.app/profile/${decodedMessage.did}`;

                    images.forEach(image => {

                        const link = image.image.ref['$link'];
                        const tags = image.image.tags;
                        const mimeType = image.image.mimeType.split('/')[1];
                        const imageUrl = `https://cdn.bsky.app/img/feed_thumbnail/plain/${decodedMessage.did}/${link}@${mimeType}`;

                        // Example: Blur content (optional)
                        blurred = hasUnwantedLabel(labels, unwantedLabels);

                        // console.log('labels', labels, 'blurred', blurred);
                        imageQueue.add({
                            mediaUrl: imageUrl,
                            mediaType: 'image',
                            profileLinkUrl,
                            profileDid,
                            blurred
                        });
                    });
                }

                // Handle video embeds
                if (
                    showVideos &&
                    decodedMessage.commit &&
                    decodedMessage.commit.record &&
                    decodedMessage.commit.record.embed &&
                    decodedMessage.commit.record.embed.$type === 'app.bsky.embed.video'
                ) {
                    const videoEmbed = decodedMessage.commit.record.embed;
                    const profileDid = decodedMessage.did;
                    const profileLinkUrl = `https://bsky.app/profile/${decodedMessage.did}`;

                    const link = videoEmbed.video.ref['$link'];
                    const mimeType = videoEmbed.video.mimeType;
                    const aspectRatio = videoEmbed.aspectRatio;

                    // Construct video URL - using Bluesky's video CDN
                    const videoUrl = `https://video.bsky.app/watch/${profileDid}/${link}/playlist.m3u8`;
                    const thumbnailUrl = `https://video.bsky.app/watch/${profileDid}/${link}/thumbnail.jpg`;

                    blurred = hasUnwantedLabel(labels, unwantedLabels);

                    console.log('Video detected:', { videoUrl, thumbnailUrl, aspectRatio });

                    imageQueue.add({
                        mediaUrl: videoUrl,
                        thumbnailUrl: thumbnailUrl,
                        mediaType: 'video',
                        aspectRatio: aspectRatio,
                        profileLinkUrl,
                        profileDid,
                        blurred
                    });
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        }, 0); // Adjust the limit as needed
    
        // Use the throttled handler for WebSocket messages
        socket.addEventListener('message', throttledMessageHandler);
    
        socket.addEventListener('open', function () {
            console.log('WebSocket connection established');
        });
    
        socket.addEventListener('close', function () {
            console.log('WebSocket connection closed');
        });
    }

    // Create IntersectionObserver for lazy loading (handles both images and videos)
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            const element = entry.target;

            if (entry.isIntersecting) {
                // Load media when entering viewport
                if (element.dataset.src) {
                    element.src = element.dataset.src;
                    element.style.opacity = 1;

                    // For video elements, load but don't auto-play in feed
                    if (element.tagName === 'VIDEO') {
                        element.load();
                    } else {
                        // For images, stop observing after load
                        observer.unobserve(element);
                    }
                }
            } else {
                // Pause videos when leaving viewport (performance optimization)
                if (element.tagName === 'VIDEO' && !element.paused) {
                    element.pause();
                }
            }
        });
    }, {
        root: null, // Default to the viewport
        rootMargin: "100px", // Load media when it enters the viewport
        threshold: 0.05 // Trigger when 5% is visible
    });

    // Immediate append function (handles both images and videos)
    function appendImageImmediate({ mediaUrl, mediaType = 'image', thumbnailUrl, aspectRatio, profileLinkUrl, profileDid, blurred, imageUrl }) {
        // Backwards compatibility: support old imageUrl parameter
        if (imageUrl && !mediaUrl) {
            mediaUrl = imageUrl;
            mediaType = 'image';
        }

        const mediaContainer = document.createElement('div');
        mediaContainer.className = mediaType === 'video' ? 'video-container' : 'image-container';

        let mediaElement;

        if (mediaType === 'video') {
            // Create video element with thumbnail
            mediaElement = document.createElement('video');
            mediaElement.dataset.src = mediaUrl;
            mediaElement.poster = thumbnailUrl || '';
            mediaElement.muted = true;
            mediaElement.loop = true;
            mediaElement.playsInline = true;
            mediaElement.preload = 'none'; // Lazy loading
            mediaElement.alt = 'Video post';

            // Add play button overlay
            const playOverlay = document.createElement('div');
            playOverlay.className = 'play-overlay';
            playOverlay.innerHTML = '<svg viewBox="0 0 24 24" fill="white" style="width: 100%; height: 100%;"><path d="M8 5v14l11-7z"/></svg>';
            mediaContainer.appendChild(playOverlay);
        } else {
            // Create image element (existing logic)
            mediaElement = document.createElement('img');
            mediaElement.dataset.src = mediaUrl;
            mediaElement.alt = 'No description available';
        }

        // Apply blur effect if needed
        if(blurred) {
            mediaElement.classList.add('blurred');
            mediaElement.addEventListener('mouseout', function () {
                mediaElement.classList.add('blurred');
            });
            mediaElement.addEventListener('mouseover', function () {
                mediaElement.classList.remove('blurred');
            });
        }

        // Click handler to open modal
        mediaElement.addEventListener('click', () => {
            openImageModal(mediaUrl, mediaType, profileLinkUrl, profileDid);
        });

        mediaContainer.appendChild(mediaElement);

        if (newestFirst) {
            imagesContainer.insertBefore(mediaContainer, imagesContainer.firstChild);
        } else {
            imagesContainer.appendChild(mediaContainer);
        }

        observer.observe(mediaElement);
        totalImages++;
        updateDebugInfo();
    }

    // Observe all images for lazy loading
    document.querySelectorAll('.image-container img').forEach(img => observer.observe(img));

    // Open image/video modal
    function openImageModal(mediaUrl, mediaType = 'image', profileLinkUrl, profileDid) {
        // Handle backwards compatibility (old 3-param calls)
        if (!profileDid && !mediaType) {
            // Old signature: openImageModal(imageUrl, profileLinkUrl, profileDid)
            profileDid = profileLinkUrl;
            profileLinkUrl = mediaType;
            mediaType = 'image';
        }

        if (mediaType === 'video') {
            // Show video, hide image
            modalVideo.src = mediaUrl;
            modalVideo.style.display = 'block';
            modalImage.style.display = 'none';
            // Auto-play video when modal opens
            modalVideo.play();
        } else {
            // Show image, hide video
            modalImage.src = mediaUrl;
            modalImage.style.display = 'block';
            modalVideo.style.display = 'none';
            // Pause video if it was playing
            if (!modalVideo.paused) {
                modalVideo.pause();
            }
        }

        profileLink.href = profileLinkUrl;
        profileLink.textContent = 'View Profile';
        modal.style.display = 'flex'; // Show modal
    }

    // Preprocess gallery labels
    function preprocessGalleryLabels(labels) {
        return labels.map(label => label.val);
    }

    // Global variables for gallery loading control
    let isGalleryOpen = false;
    let galleryLoadingAbortController = null;
    let galleryObservers = [];
    let isLoadingMoreGalleryImages = false;
    let currentGalleryProfileUrl = null;
    let lastGalleryCursor = null;

    // Fetch profile gallery images
    function fetchGalleryImages(profileUrl, cursor = null, retryCount = 0) {
        // If gallery is closed, don't fetch images
        if (!isGalleryOpen) {
            console.log('Gallery closed, aborting image fetch');
            return Promise.resolve(); // Return resolved promise
        }

        // Store current profile URL for potential scroll-based loading
        if (!cursor) {
            currentGalleryProfileUrl = profileUrl;
            lastGalleryCursor = null;
        }

        // Set loading flag
        isLoadingMoreGalleryImages = true;

        // Create a new abort controller for this fetch
        if (!galleryLoadingAbortController) {
            galleryLoadingAbortController = new AbortController();
        }
        const signal = galleryLoadingAbortController.signal;

        // If this is the first call (no cursor), clear the container
        if (!cursor) {
            galleryContainer.innerHTML = ''; 
            
            // Add initial loading indicator
            const loadingIndicator = document.createElement('div');
            loadingIndicator.textContent = 'Loading images...';
            loadingIndicator.style.textAlign = 'center';
            loadingIndicator.style.padding = '10px';
            loadingIndicator.style.gridColumn = '1 / -1';
            loadingIndicator.id = 'gallery-loading-indicator';
            galleryContainer.appendChild(loadingIndicator);
        }

        // Extract DID from profile URL
        const profileDid = profileUrl.split('/').pop();

        // Build URL with pagination
        let url = `https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed?actor=${profileDid}&limit=25`;
        if (cursor) {
            url += `&cursor=${cursor}`;
        }

        // Calculate delay based on retry count (exponential backoff)
        const delay = retryCount > 0 ? Math.min(2000 * Math.pow(1.5, retryCount - 1), 10000) : 0;
        
        // Return a promise that resolves when the fetch completes
        return new Promise((resolve, reject) => {
            // Set a timeout that can be cleared if gallery is closed
            const timeoutId = setTimeout(() => {
                // Check again if gallery is still open before making the fetch
                if (!isGalleryOpen) {
                    console.log('Gallery closed during delay, aborting image fetch');
                    isLoadingMoreGalleryImages = false;
                    resolve(); // Resolve the promise
                    return;
                }

                fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    signal: signal
                })
                .then(response => {
                    if (response.status === 429) {
                        throw new Error('Rate limited. Trying again with longer delay...');
                    }
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    // Check if gallery is still open
                    if (!isGalleryOpen) {
                        console.log('Gallery closed after fetch, aborting processing');
                        isLoadingMoreGalleryImages = false;
                        resolve(); // Resolve the promise
                        return;
                    }

                    // Set profile link (only on first page)
                    if (!cursor) {
                        galleryProfileLink.href = profileUrl;
                        
                        // Remove initial loading indicator
                        const initialIndicator = document.getElementById('gallery-loading-indicator');
                        if (initialIndicator) {
                            initialIndicator.remove();
                        }
                    }

                    // Create an IntersectionObserver for lazy loading
                    const galleryObserver = new IntersectionObserver((entries, observer) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                const img = entry.target;
                                const dataSrc = img.getAttribute('data-src');
                                if (dataSrc) {
                                    img.src = dataSrc;
                                    img.removeAttribute('data-src');
                                }
                                observer.unobserve(img);
                            }
                        });
                    }, {
                        root: null, // Use viewport as root for better detection
                        rootMargin: '100px 0px', // Load when image is 100px from viewport
                        threshold: 0.05 // Require just 5% of the image to be visible
                    });
                    
                    // Store the observer for cleanup
                    galleryObservers.push(galleryObserver);

                    // Track if we found any images in this batch
                    let imagesFoundInBatch = 0;
                    
                    // Create a set to track media URLs we've already added
                    const existingImageUrls = new Set();

                    // First, collect all existing media URLs to avoid duplicates
                    if (cursor) {
                        // Collect existing images
                        galleryContainer.querySelectorAll('img').forEach(img => {
                            const src = img.getAttribute('data-src') || img.src;
                            if (src && !src.includes('data:image/svg+xml')) {
                                existingImageUrls.add(src);
                            }
                        });
                        // Collect existing videos
                        galleryContainer.querySelectorAll('video').forEach(video => {
                            const src = video.getAttribute('data-src') || video.src;
                            if (src && !src.includes('data:image/svg+xml')) {
                                existingImageUrls.add(src);
                            }
                        });
                    }

                    // Append images and videos
                    data.feed.forEach(item => {
                        // Debug: Log embed types to understand what we're receiving
                        if (item.post.embed && item.post.embed.$type) {
                            console.log('Gallery embed type:', item.post.embed.$type);
                        }

                        // Process image embeds
                        if (item.post.embed && item.post.embed.images) {
                            item.post.embed.images.forEach(image => {
                                // Skip if we already have this image
                                if (image.fullsize && existingImageUrls.has(image.fullsize)) {
                                    console.log('Skipping duplicate image:', image.fullsize);
                                    return;
                                }

                                // Add to our tracking set
                                if (!image.fullsize) {
                                    console.warn('Image missing fullsize URL:', image);
                                    return;
                                }

                                existingImageUrls.add(image.fullsize);

                                imagesFoundInBatch++;
                                const imgElement = document.createElement('img');
                                // Use a placeholder initially
                                imgElement.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
                                // Store the actual image URL as a data attribute
                                imgElement.setAttribute('data-src', image.fullsize);
                                imgElement.alt = image.alt || 'User media';
                                imgElement.style.minHeight = '128px'; // Ensure placeholder takes space

                                // Preprocess gallery labels and check for unwanted labels
                                const processedLabels = preprocessGalleryLabels(item.post.labels);
                                const blurred = hasUnwantedLabel(processedLabels, unwantedLabels);
                                if(blurred) {
                                    imgElement.classList.add('blurred');
                                    imgElement.addEventListener('mouseout', function () {
                                        imgElement.classList.add('blurred');
                                    });
                                    imgElement.addEventListener('mouseover', function () {
                                        imgElement.classList.remove('blurred');
                                    });
                                }

                                imgElement.addEventListener('click', function () {
                                    // Ensure image is loaded before showing in modal
                                    if (imgElement.getAttribute('data-src')) {
                                        imgElement.src = imgElement.getAttribute('data-src');
                                        imgElement.removeAttribute('data-src');
                                    }
                                    currentGalleryImageIndex = Array.from(galleryContainer.querySelectorAll('img, video')).indexOf(imgElement);
                                    showGalleryImageInModal(imgElement.src, 'image');
                                });

                                galleryContainer.appendChild(imgElement);

                                // Observe the image for lazy loading
                                galleryObserver.observe(imgElement);
                            });
                        }

                        // Process video embeds (handle both record and view types)
                        if (showVideos && item.post.embed && (item.post.embed.$type === 'app.bsky.embed.video' || item.post.embed.$type === 'app.bsky.embed.video#view')) {
                            const videoEmbed = item.post.embed;
                            console.log('Found video embed:', videoEmbed);

                            // Construct video URL from playlist field (this comes from the View response)
                            const videoUrl = videoEmbed.playlist || '';
                            const thumbnailUrl = videoEmbed.thumbnail || '';

                            if (!videoUrl) {
                                console.warn('Video missing playlist URL:', videoEmbed);
                                return;
                            }

                            // Skip duplicates
                            if (existingImageUrls.has(videoUrl)) {
                                console.log('Skipping duplicate video:', videoUrl);
                                return;
                            }

                            existingImageUrls.add(videoUrl);
                            imagesFoundInBatch++;

                            // Create container for video with play icon
                            const videoContainer = document.createElement('div');
                            videoContainer.className = 'gallery-video-container';
                            videoContainer.style.position = 'relative';
                            videoContainer.style.width = '100%';
                            videoContainer.style.height = '100%';

                            // Create video element
                            const videoElement = document.createElement('video');
                            videoElement.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
                            videoElement.setAttribute('data-src', videoUrl);
                            videoElement.poster = thumbnailUrl;
                            videoElement.preload = 'none';
                            videoElement.muted = true;
                            videoElement.playsInline = true;
                            videoElement.alt = 'User video';
                            videoElement.style.width = '100%';
                            videoElement.style.height = '100%';
                            videoElement.style.objectFit = 'cover';
                            videoElement.style.minHeight = '128px';

                            // Add play icon overlay
                            const playIcon = document.createElement('div');
                            playIcon.className = 'gallery-play-icon';
                            playIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="white" style="width: 100%; height: 100%;"><path d="M8 5v14l11-7z"/></svg>';

                            // Preprocess gallery labels and check for unwanted labels
                            const processedLabels = preprocessGalleryLabels(item.post.labels);
                            const blurred = hasUnwantedLabel(processedLabels, unwantedLabels);
                            if(blurred) {
                                videoElement.classList.add('blurred');
                                videoElement.addEventListener('mouseout', function () {
                                    videoElement.classList.add('blurred');
                                });
                                videoElement.addEventListener('mouseover', function () {
                                    videoElement.classList.remove('blurred');
                                });
                            }

                            // Click handler to open video in modal
                            videoContainer.addEventListener('click', function () {
                                // Ensure video URL is set
                                const videoSrc = videoElement.getAttribute('data-src') || videoElement.src;
                                currentGalleryImageIndex = Array.from(galleryContainer.querySelectorAll('img, video')).indexOf(videoElement);
                                showGalleryImageInModal(videoSrc, 'video');
                            });

                            videoContainer.appendChild(videoElement);
                            videoContainer.appendChild(playIcon);
                            galleryContainer.appendChild(videoContainer);

                            // Observe the video for lazy loading
                            galleryObserver.observe(videoElement);
                        }
                    });

                    // Store the cursor for potential scroll-based loading
                    if (data.cursor) {
                        lastGalleryCursor = data.cursor;
                    }

                    // If there's a cursor in the response and we found images, add a scroll trigger
                    // or if we found posts but no images, continue loading immediately
                    if (data.cursor && isGalleryOpen) {
                        if (imagesFoundInBatch > 0) {
                            // Create a sentinel observer to detect when user scrolls near bottom
                            // We'll use the last media element (image or video) as our sentinel
                            const allMedia = galleryContainer.querySelectorAll('img, video');
                            const lastMedia = allMedia[allMedia.length - 1];

                            if (lastMedia) {
                                // First, disconnect any existing sentinel observers to prevent multiple triggers
                                galleryObservers = galleryObservers.filter(observer => {
                                    if (observer._isSentinelObserver) {
                                        observer.disconnect();
                                        return false;
                                    }
                                    return true;
                                });
                                
                                // Create a sentinel observer to detect when user scrolls to bottom
                                const sentinelObserver = new IntersectionObserver((entries) => {
                                    entries.forEach(entry => {
                                        if (entry.isIntersecting && !isLoadingMoreGalleryImages && isGalleryOpen) {
                                            // User has scrolled to near the bottom, load more images
                                            console.log('Scrolled to bottom, loading more images');
                                            
                                            // Show the floating loading overlay
                                            showGalleryLoadingOverlay();
                                            
                                            // Disconnect this observer to prevent multiple triggers
                                            sentinelObserver.disconnect();
                                            
                                            // Load more after a short delay
                                            setTimeout(() => {
                                                // Check if gallery is still open before loading more
                                                if (isGalleryOpen) {
                                                    // Load more images
                                                    fetchGalleryImages(profileUrl, lastGalleryCursor, 0);
                                                }
                                            }, 300);
                                        }
                                    });
                                }, {
                                    root: null,
                                    rootMargin: '200px 0px',
                                    threshold: 0.1
                                });
                                
                                // Mark this as a sentinel observer for easy filtering later
                                sentinelObserver._isSentinelObserver = true;

                                // Observe the last media element
                                sentinelObserver.observe(lastMedia);
                                galleryObservers.push(sentinelObserver);
                            }
                        } else {
                            // No images in this batch but we have posts, continue loading immediately
                            setTimeout(() => {
                                // Check if gallery is still open before loading more
                                if (isGalleryOpen) {
                                    // Show the floating loading overlay
                                    showGalleryLoadingOverlay();
                                    fetchGalleryImages(profileUrl, data.cursor, 0);
                                }
                            }, 300);
                        }
                    } else if (imagesFoundInBatch === 0 && !data.cursor && cursor) {
                        // We've reached the end and found no media in this batch
                        // Create a "no more media" indicator that doesn't break the grid
                        const endMessage = document.createElement('div');
                        endMessage.textContent = 'No more media';
                        endMessage.style.position = 'fixed';
                        endMessage.style.bottom = '10px';
                        endMessage.style.left = '50%';
                        endMessage.style.transform = 'translateX(-50%)';
                        endMessage.style.padding = '5px 10px';
                        endMessage.style.fontSize = '12px';
                        endMessage.style.color = '#888';
                        endMessage.style.background = 'rgba(255, 255, 255, 0.8)';
                        endMessage.style.borderRadius = '10px';
                        endMessage.style.zIndex = '999';
                        document.body.appendChild(endMessage);
                        
                        // Remove the message after 3 seconds
                        setTimeout(() => {
                            if (endMessage.parentNode) {
                                endMessage.parentNode.removeChild(endMessage);
                            }
                        }, 3000);
                    }
                    
                    // Hide the loading overlay if it exists
                    hideGalleryLoadingOverlay();
                    
                    // Reset loading flag
                    isLoadingMoreGalleryImages = false;
                    
                    // Resolve the promise with the data
                    resolve(data);
                })
                .catch(error => {
                    // Hide the loading overlay if it exists
                    hideGalleryLoadingOverlay();
                    
                    // Reset loading flag
                    isLoadingMoreGalleryImages = false;
                    
                    // Check if this is an abort error (gallery closed)
                    if (error.name === 'AbortError') {
                        console.log('Fetch aborted due to gallery closing');
                        resolve(); // Resolve the promise
                        return;
                    }
                    
                    console.error('Error fetching gallery images:', error);
                    
                    if (error.message.includes('Rate limited') && retryCount < 5 && isGalleryOpen) {
                        // Update loading indicator to show retry status
                        const indicator = document.getElementById('gallery-loading-indicator');
                        if (indicator) {
                            indicator.textContent = `Rate limited. Retrying in ${Math.round(delay/1000)} seconds...`;
                        } else {
                            const retryIndicator = document.createElement('div');
                            retryIndicator.textContent = `Rate limited. Retrying in ${Math.round(delay/1000)} seconds...`;
                            retryIndicator.style.textAlign = 'center';
                            retryIndicator.style.padding = '10px';
                            retryIndicator.style.gridColumn = '1 / -1';
                            retryIndicator.style.color = '#ff6b6b';
                            retryIndicator.id = 'gallery-loading-indicator';
                            galleryContainer.appendChild(retryIndicator);
                        }
                        
                        // Retry with exponential backoff
                        setTimeout(() => {
                            // Check if gallery is still open before retrying
                            if (!isGalleryOpen) {
                                console.log('Gallery closed during retry delay, aborting retry');
                                return;
                            }
                            fetchGalleryImages(profileUrl, cursor, retryCount + 1);
                        }, delay);
                    } else if (error.message.includes('Expired')) {
                        alert('Token expired. Please re-authenticate.');
                        handleAuthentication(); // Try to refresh the token
                    } else if (isGalleryOpen) {
                        // Show error message only if gallery is still open
                        // Clear any existing error messages first
                        const existingErrors = galleryContainer.querySelectorAll('.gallery-error-message');
                        existingErrors.forEach(el => el.remove());
                        
                        // Create a more user-friendly error message
                        const errorMessage = document.createElement('div');
                        errorMessage.className = 'gallery-error-message';
                        errorMessage.innerHTML = `
                            <div style="color: #ff6b6b; font-weight: bold; margin-bottom: 5px;">Error loading images</div>
                            <div style="font-size: 14px; margin-bottom: 10px;">${error.message || 'Connection failed'}</div>
                            <button id="gallery-retry-button" style="padding: 5px 15px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
                        `;
                        errorMessage.style.textAlign = 'center';
                        errorMessage.style.padding = '20px';
                        errorMessage.style.gridColumn = '1 / -1';
                        errorMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                        errorMessage.style.borderRadius = '8px';
                        errorMessage.style.margin = '20px auto';
                        errorMessage.style.maxWidth = '80%';
                        
                        // If this is the first load and there is no media yet, center the error
                        if (!cursor && galleryContainer.querySelectorAll('img, video').length === 0) {
                            errorMessage.style.position = 'absolute';
                            errorMessage.style.top = '50%';
                            errorMessage.style.left = '50%';
                            errorMessage.style.transform = 'translate(-50%, -50%)';
                            // Clear any loading indicators
                            galleryContainer.innerHTML = '';
                        }
                        
                        galleryContainer.appendChild(errorMessage);
                        
                        // Add event listener to retry button
                        setTimeout(() => {
                            const retryButton = document.getElementById('gallery-retry-button');
                            if (retryButton) {
                                retryButton.addEventListener('click', () => {
                                    if (isGalleryOpen) {
                                        // Remove the error message
                                        errorMessage.remove();
                                        // Show loading overlay
                                        showGalleryLoadingOverlay();
                                        // Try again
                                        fetchGalleryImages(profileUrl, cursor, 0);
                                    }
                                });
                            }
                        }, 0);
                    }
                    
                    // Reject the promise with the error
                    reject(error);
                });
            }, delay);

            // Store the timeout ID so it can be cleared if the gallery is closed
            return timeoutId;
        });
    }

    // Update debug info
    function updateDebugInfo() {
        const debugInfo = document.getElementById('debug-info');
        debugInfo.textContent = `${totalImages} images${imageQueue.pending.length > 0 ? ` (${imageQueue.pending.length} pending)` : ''}`;
        
        // Update skip button visibility and text when feed is active
        const skipButton = document.getElementById('skip-button');
        if (!feedPaused && imageQueue.pending.length > 0) {
            skipButton.style.display = 'block';
            skipButton.textContent = `Skip Queue (${imageQueue.pending.length})`;
        } else {
            skipButton.style.display = 'none';
        }
    }

    // Close modals with ESC key
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
            if (galleryModal.style.display === 'flex') {
                galleryModal.style.display = 'none';
                galleryControls.style.display = 'none';
                isGalleryOpen = false;
                if (galleryLoadingAbortController) {
                    galleryLoadingAbortController.abort();
                    galleryLoadingAbortController = null;
                }
                galleryObservers.forEach(observer => observer.disconnect());
                galleryObservers = [];
            }
        }
    });

    // Close modals by clicking outside
    window.addEventListener('click', function (event) {
        // Patch: Prevent gallery modal from closing if click is on the slider or its label/value
        const isGallerySlider = event.target.closest && (
            event.target.closest('#gallery-size-slider') ||
            event.target.closest('#gallery-size-value') ||
            event.target.closest('label[for="gallery-size-slider"]')
        );
        if (event.target === modal) {
            modal.style.display = 'none';
        }
        if (event.target === galleryModal && !isGallerySlider) {
            galleryModal.style.display = 'none';
            galleryModal.classList.remove('show');
            galleryControls.style.display = 'none';
            isGalleryOpen = false;
            if (galleryLoadingAbortController) {
                galleryLoadingAbortController.abort();
                galleryLoadingAbortController = null;
            }
            galleryObservers.forEach(observer => observer.disconnect());
            galleryObservers = [];
        }
    });

    // Show gallery image/video in modal
    function showGalleryImageInModal(mediaUrl, mediaType = 'image') {
        const galleryModal = document.getElementById('gallery-modal');

        // Remove any existing "View Full Size" button to prevent duplicates
        const existingButton = document.querySelector('.view-gallery-full-size-button');
        if (existingButton) {
            existingButton.remove();
        }

        if (mediaType === 'video') {
            // Show video, hide image
            galleryModalVideo.src = mediaUrl;
            galleryModalVideo.style.display = 'block';
            galleryModalImage.style.display = 'none';

            // Auto-play video when modal opens
            galleryModalVideo.play();
        } else {
            // Show image, hide video
            galleryModalImage.src = mediaUrl;
            galleryModalImage.style.display = 'block';
            galleryModalVideo.style.display = 'none';

            // Pause video if it was playing
            if (!galleryModalVideo.paused) {
                galleryModalVideo.pause();
            }

            // Wait for the image to load to access its natural dimensions
            galleryModalImage.onload = () => {
                const nativeWidth = galleryModalImage.naturalWidth;
                const nativeHeight = galleryModalImage.naturalHeight;
                const displayedWidth = galleryModalImage.clientWidth;
                const displayedHeight = galleryModalImage.clientHeight;

                // Check if the displayed size is smaller than the natural size
                if (displayedWidth < nativeWidth || displayedHeight < nativeHeight) {

                    // Create and display the "View Full Size" button
                    const fullSizeButton = document.createElement('button');
                    fullSizeButton.textContent = 'View Full Size';
                    fullSizeButton.className = 'view-gallery-full-size-button';

                    fullSizeButton.addEventListener('click', () => {
                        window.open(mediaUrl, '_blank'); // Open full-size image in a new tab
                    });

                    // Append the button to the modal
                    galleryImageModal.appendChild(fullSizeButton);

                    // Dynamically enable the magnifier since the button is now present
                    enableMagnifier(galleryModalImage);
                } else {
                    //console.log('Image is displayed at full size');
                }
            };
        }

        // Show the modal
        galleryImageModal.style.display = 'flex';
        galleryModal.style.display = 'none'; // Hide the gallery modal
    }

    function navigateGalleryImage(direction) {

        // Dynamically select all gallery media (images and videos)
        const galleryMediaArray = Array.from(document.querySelectorAll('#gallery-modal .grid img, #gallery-modal .grid video'));

        if (galleryMediaArray.length === 0) {
            console.error('No gallery media available.');
            return;
        }

        // Calculate the new index
        const newIndex = currentGalleryImageIndex + direction;

        // Check if we're at the end and need to load more media
        if (direction > 0 && newIndex >= galleryMediaArray.length && lastGalleryCursor && isGalleryOpen && !isLoadingMoreGalleryImages) {
            // We're at the end and there are more items to load
            console.log('Reached end of loaded media, loading more...');

            // Show loading indicator
            showGalleryLoadingOverlay();

            // Set a flag to remember we need to navigate forward after loading
            const pendingNavigationDirection = direction;

            // Load more items
            isLoadingMoreGalleryImages = true;
            fetchGalleryImages(currentGalleryProfileUrl, lastGalleryCursor, 0)
                .then(() => {
                    // After loading completes, try to navigate again
                    setTimeout(() => {
                        // Hide loading indicator
                        hideGalleryLoadingOverlay();

                        // Get the updated array of media
                        const updatedMediaArray = Array.from(document.querySelectorAll('#gallery-modal .grid img, #gallery-modal .grid video'));

                        // If we have new media, show the next one
                        if (updatedMediaArray.length > galleryMediaArray.length) {
                            currentGalleryImageIndex = galleryMediaArray.length;
                            const nextMedia = updatedMediaArray[currentGalleryImageIndex];
                            if (nextMedia) {
                                const mediaType = nextMedia.tagName === 'VIDEO' ? 'video' : 'image';
                                const mediaSrc = nextMedia.getAttribute('data-src') || nextMedia.src;
                                showGalleryImageInModal(mediaSrc, mediaType);
                            }
                        } else {
                            // No new media loaded, wrap around to the beginning
                            currentGalleryImageIndex = 0;
                            const firstMedia = updatedMediaArray[0];
                            if (firstMedia) {
                                const mediaType = firstMedia.tagName === 'VIDEO' ? 'video' : 'image';
                                const mediaSrc = firstMedia.getAttribute('data-src') || firstMedia.src;
                                showGalleryImageInModal(mediaSrc, mediaType);
                            }
                        }
                    }, 300);
                });
            return;
        }

        // Normal navigation with wrapping
        currentGalleryImageIndex = (newIndex + galleryMediaArray.length) % galleryMediaArray.length;

        // Show the selected media in the gallery modal
        const selectedMedia = galleryMediaArray[currentGalleryImageIndex];
        if (selectedMedia) {
            // Ensure media is loaded before showing in modal
            if (selectedMedia.getAttribute('data-src')) {
                selectedMedia.src = selectedMedia.getAttribute('data-src');
                selectedMedia.removeAttribute('data-src');
            }

            // Determine media type
            const mediaType = selectedMedia.tagName === 'VIDEO' ? 'video' : 'image';
            showGalleryImageInModal(selectedMedia.src, mediaType);
        } else {
            console.error('Selected media not found.');
        }
    }

    function closeGalleryImageModal() {
        galleryImageModal.style.display = 'none';
        galleryModal.style.display = 'flex'; // Show gallery modal again
        galleryControls.style.display = 'flex';
    }

    // Close gallery image modal with click outside
    window.addEventListener('click', function (event) {
        if (event.target === galleryImageModal) {
            closeGalleryImageModal();
        }
    });

    document.addEventListener('keydown', function (event) {

        // Close all modals
        if (event.key === '`') {
            ModalManager.closeAll();
        }

        // Restart feed
        if (event.key.toLowerCase() === 'r') {
            restartFeed();
        }

        // view full size image
        if(event.key === 'f' || event.key === ' ') {
            if (galleryImageModal.style.display === 'flex') {
                const fullSizeButton = document.querySelector('.view-gallery-full-size-button');
                if (fullSizeButton) {
                    fullSizeButton.click();
                }
            }
        }

        // Navigate gallery images with arrow keys or WASD
        if (galleryImageModal.style.display === 'flex') {
            if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
                navigateGalleryImage(1);
            } else if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
                navigateGalleryImage(-1);
            } else if (event.key === 'Escape') {
                closeGalleryImageModal();
            }
        }

        // Check if the Enter/Return or Space bar is pressed
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault(); // Prevent default action like scrolling

            // Check if the gallery modal is already open
            if (galleryModal.style.display !== 'flex') {
                // Launch the gallery if there's a token
                if (token !== null) {
                    viewAllMediaButton.click(); // Simulate click to open gallery
                }
            } else {
                // Launch the gallery viewer if the gallery is open
                const selectedMedia = galleryContainer.querySelector('img, video');
                if (selectedMedia) {
                    selectedMedia.click(); // Simulate click to open media viewer
                }
            }
        }

    });

    // Set default for image sizes (on page load)
    imageSizeSlider.value = imageSize;
    imageSizeInput.value = imageSize;
    
    // Set values for all other form elements from settings (on page load)
    sortToggle.checked = newestFirst;
    blurToggle.checked = blurUnwanted;
    speedSlider.value = feedDelay;
    speedValue.textContent = feedDelay;
    showImagesCheckbox.checked = showImages;
    showVideosCheckbox.checked = showVideos;

    // Set Bluesky credentials in the form (on page load)
    if (bsky_identifier) {
        identifierInput.value = bsky_identifier;
    }
    if (bsky_appPassword) {
        appPasswordInput.value = bsky_appPassword;
    }
    
    // Display appropriate button (Auth or Clear) based on token availability (on page load)
    if (token || (bsky_identifier && bsky_appPassword)) {
        clearButton.style.display = 'inline-block';
        authButton.style.display = 'none';
    } else {
        clearButton.style.display = 'none';
        authButton.style.display = 'inline-block';
    }

    // Scale images with slider values
    updateImageSize(imageSize);

    function updateImageSize(newSize) {
        const sizeInPx = `${newSize}px`;
        const imageContainers = document.querySelectorAll('.image-container');
        imageContainers.forEach(container => {
            container.style.height = sizeInPx;
            const img = container.querySelector('img');
            if (img) {
                img.style.height = sizeInPx;
            }
        });

        requestAnimationFrame(() => {
            imagesContainer.style.gridAutoRows = sizeInPx;
            imagesContainer.style.gridTemplateColumns = `repeat(auto-fill, minmax(${sizeInPx}, 1fr))`;
        });
    }

    imageSizeSlider.addEventListener('input', function () {
        const newSize = this.value;
        imageSizeInput.value = newSize; // Sync input field
        updateImageSize(newSize);
    });

    imageSizeInput.addEventListener('input', function () {
        const newSize = this.value;
        imageSizeSlider.value = newSize; // Sync slider
        updateImageSize(newSize);
    });

    function enableMagnifier(imageElement) {

        // Check if the "View Full Size" button is present and visible
        const fullSizeButton = document.querySelector('.view-gallery-full-size-button');
        if (magnifierElement && magnifier && (!fullSizeButton || fullSizeButton.style.display === 'none')) {
            magnifierElement.style.display = 'none'; // Ensure magnifier is hidden
            return; // Exit if the button is not shown
        }

        // Remove previous event listeners to avoid duplication
        imageElement.onmouseenter = null;
        imageElement.onmouseleave = null;
        imageElement.onmousemove = null;

        // Show the magnifier when the mouse enters the image only if it is scaled
        imageElement.onmouseenter = () => {
            const isScaledDown =
                imageElement.clientWidth < imageElement.naturalWidth ||
                imageElement.clientHeight < imageElement.naturalHeight;

            if (isScaledDown) {
                magnifierElement.style.display = 'block';
                const nativeWidth = imageElement.naturalWidth;
                const nativeHeight = imageElement.naturalHeight;

                magnifierElement.style.backgroundImage = `url('${imageElement.src}')`;
                magnifierElement.style.backgroundSize = `${nativeWidth}px ${nativeHeight}px`;
            } else {
                magnifierElement.style.display = 'none'; // Ensure magnifier remains hidden
            }
        };

        // Hide the magnifier when the mouse leaves the image
        imageElement.onmouseleave = () => {
            magnifierElement.style.display = 'none';
        };

        // Update magnifier position and background on mouse move only if scaled
        imageElement.onmousemove = (event) => {
            const isScaledDown =
                imageElement.clientWidth < imageElement.naturalWidth ||
                imageElement.clientHeight < imageElement.naturalHeight;

            if (!isScaledDown) {
                magnifierElement.style.display = 'none';
                return; // Exit if the image is not scaled down
            }

            const rect = imageElement.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            const scaleX = imageElement.naturalWidth / imageElement.clientWidth;
            const scaleY = imageElement.naturalHeight / imageElement.clientHeight;

            const nativeX = mouseX * scaleX;
            const nativeY = mouseY * scaleY;

            magnifierElement.style.backgroundPosition = `-${nativeX - 256}px -${nativeY - 256}px`;
            magnifierElement.style.left = `${event.clientX - 256}px`;
            magnifierElement.style.top = `${event.clientY - 256}px`;
        };
    }

    // Call the function on your modal image
    // galleryModalImage is already declared at the top of the file
    galleryModalImage.addEventListener('load', () => {
        enableMagnifier(galleryModalImage);
    });


    // Login to Bluesky
    // Define the service URL (update this if required)
    const serviceUrl = 'https://bsky.social';

    // Function to create a new session token
    async function createSession() {
        try {
            // Make a POST request to the server
            const response = await fetch(`${serviceUrl}/xrpc/com.atproto.server.createSession`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identifier: settings.bsky_identifier,
                    password: settings.bsky_appPassword,
                }),
            });

            // Check if the response is successful
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Authentication failed: ${errorText}`);
            }

            // Parse and return the response as JSON
            const tokens = await response.json();
            //console.log('Authentication successful. Tokens:', tokens);
            return tokens;
        } catch (error) {
            console.error('Error during session creation:', error.message);
        }
    }

    // Function to handle token creation and renewal
    async function handleAuthentication() {
        if (settings.manualToken !== null && typeof settings.manualToken !== 'undefined') {
            console.log('Using manually specified token.');
            token = settings.manualToken;
            viewAllMediaButton.style.display = 'block';
            clearButton.style.display = 'none';
            authButton.style.display = 'none';
        } else if (token && Date.now() < tokenExpirationTime) {
            console.log('Using stored token.');
            viewAllMediaButton.style.display = 'block';
            clearButton.style.display = 'inline-block';
            authButton.style.display = 'none';
        } else if (settings.bsky_identifier && settings.bsky_appPassword) {
            console.log('Starting authentication with Bluesky credentials:', settings.bsky_identifier, settings.bsky_appPassword);

            if (!token || Date.now() >= tokenExpirationTime) {
                console.log('Token expired or not available, creating a new session...');
                const tokens = await createSession();

                if (tokens) {
                    token = tokens.accessJwt;
                    expiresIn = tokens.expiresIn;
                    refreshToken = tokens.refreshJwt;

                    tokenExpirationTime = Date.now() + (expiresIn * 1000);

                    if (settings.useLocalStorage) {
                        localStorage.setItem('bsky_token', token);
                        localStorage.setItem('bsky_refreshToken', refreshToken);
                        localStorage.setItem('bsky_tokenExpirationTime', tokenExpirationTime.toString());
                    }

                    viewAllMediaButton.style.display = 'block';
                    clearButton.style.display = 'inline-block';
                    authButton.style.display = 'none';
                    //console.log('Session token:', tokens.accessJwt);

                    scheduleTokenRenewal(tokens);
                } else {
                    console.error('Failed to obtain tokens.');
                }
            } else {
                console.log('Token is still valid.');
                clearButton.style.display = 'inline-block';
                authButton.style.display = 'none';
            }
        } else {
            console.warn('No credentials provided. Authentication skipped.');
        }
        
        // Check URL parameters after authentication is complete
        checkUrlParamsForGallery();
    }

    // Function to schedule token renewal
    function scheduleTokenRenewal(tokens) {
        if (!tokens.expiresIn) {
            console.warn('Token expiration information not available. Renewal skipped.');
            return;
        }

        // Calculate when to renew the token (e.g., 90% of its lifespan)
        const renewalTime = tokens.expiresIn * 0.9 * 1000; // Convert seconds to milliseconds
        console.log(`Token renewal scheduled in ${renewalTime / 1000} seconds.`);

        setTimeout(async () => {
            console.log('Renewing token...');
            await handleAuthentication(); // Re-authenticate to refresh tokens
        }, renewalTime);
    }

    // Function to check URL parameters and open gallery if needed
    function checkUrlParamsForGallery() {
        const urlParams = new URLSearchParams(window.location.search);
        const actorId = urlParams.get('plc');
        
        if (actorId) {
            console.log('Opening gallery for actor:', actorId);
            // Format the profile URL correctly
            const profileUrl = `https://bsky.app/profile/did:plc:${actorId}`;
            
            // Open the gallery
            isGalleryOpen = true;
            fetchGalleryImages(profileUrl);
            galleryModal.style.display = 'flex';
            galleryControls.style.display = 'flex';
        }
    }

    // If you're using stored credentials, also check URL params
    if (localStorage.getItem('bsky_token') && 
        localStorage.getItem('bsky_tokenExpirationTime') && 
        new Date(localStorage.getItem('bsky_tokenExpirationTime')) > new Date()) {
        // This runs when using stored credentials
        setTimeout(checkUrlParamsForGallery, 500);
    }

    // Start the authentication process
    handleAuthentication();

    // Already declared at the top. Removed duplicate declaration.
    sortToggle.checked = newestFirst;

    // Add event listener for the toggle
    sortToggle.addEventListener('change', function(e) {
        newestFirst = e.target.checked;
        
        // Reverse the order of existing images
        const images = Array.from(imagesContainer.children);
        images.reverse().forEach(img => imagesContainer.appendChild(img));
    });

    // Now we can safely get the elements and add the event listener
    // Already declared at the top. Removed duplicate declaration.
    // Already declared at the top. Removed duplicate declaration.
    speedSlider.value = speedValue.textContent = feedDelay;

    speedSlider.addEventListener('input', function(e) {
        feedDelay = parseInt(e.target.value);
        speedValue.textContent = feedDelay;
        imageQueue.setDelay(feedDelay);
    });

    // Add pause button event listener
    const pauseButton = document.getElementById('pause-button');

    pauseButton.addEventListener('click', function() {
        feedPaused = !feedPaused;
        pauseButton.textContent = feedPaused ? 'Resume Feed' : 'Pause Feed';
        imageQueue.setPause(feedPaused);
        
        // Update skip button visibility
        skipButton.style.display = !feedPaused && imageQueue.pending.length > 0 ? 'block' : 'none';
    });

    // Add skip button functionality
    const skipButton = document.getElementById('skip-button');

    const NotificationService = {
        show(message, duration = 3000) {
            const notification = document.createElement('div');
            notification.textContent = message;
            notification.className = 'notification';
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), duration);
        }
    };

    skipButton.addEventListener('click', function() {
        const skippedCount = imageQueue.clear();
        updateDebugInfo();
        skipButton.style.display = 'none';
        NotificationService.show(`Skipped ${skippedCount} images`);
    });

    class ModalManager {

        static closeAll() {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => modal.style.display = 'none');
        }

        static show(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                this.closeAll();
                modal.style.display = 'flex';
            }
        }

        static hide(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
            }
        }

    }

    document.addEventListener('keyup', function(event) {
        // Ensure modals is a NodeList
        const modals = document.querySelectorAll('.modal');
        
        // Convert NodeList to an array to use array methods
        const modalIsShowing = Array.from(modals).some(modal => modal.style.display !== 'none');
        
        if (!modalIsShowing) {
            const imageSizeSlider = document.getElementById('image-size-slider');
            const imageSizeInput = document.getElementById('image-size-input');
            let newSize = parseInt(imageSizeSlider.value);

            if (event.key === 'ArrowRight') { // arrow right
                newSize = Math.min(newSize + 32, 512); // Increase size, max 512
            } else if (event.key === 'ArrowLeft') { // arrow left
                newSize = Math.max(newSize - 32, 32); // Decrease size, min 32
            }

            imageSizeSlider.value = newSize;
            imageSizeInput.value = newSize;
            updateImageSize(newSize);
        }
    });

    const restartButton = document.getElementById('restart-button');

    restartButton.addEventListener('click', function() {
        restartFeed();
    });

    function restartFeed() {

        // Clear images
        imagesContainer.innerHTML = '';
        totalImages = 0;
        updateDebugInfo();

        // Close existing WebSocket connection if needed
        if (socket) {
            socket.close();
        }

        // Re-establish WebSocket connection
        setupWebSocket();
        
    }

    // Toggle settings menu
    hamburgerMenu.addEventListener('click', function () {
        const isVisible = settingsContainer.style.display === 'flex';
        settingsContainer.style.display = isVisible ? 'none' : 'flex';
        if (!isVisible) {
            // Re-populate all modal fields from the current settings
            imageSizeSlider.value = typeof settings.imageSize === 'number' ? settings.imageSize : 128;
            imageSizeInput.value = typeof settings.imageSize === 'number' ? settings.imageSize : 128;
            sortToggle.checked = typeof settings.newestFirst === 'boolean' ? settings.newestFirst : false;
            blurToggle.checked = typeof settings.blurUnwanted === 'boolean' ? settings.blurUnwanted : true;
            speedSlider.value = typeof settings.feedDelay === 'number' ? settings.feedDelay : 0;
            speedValue.textContent = typeof settings.feedDelay === 'number' ? settings.feedDelay : 0;
            identifierInput.value = typeof settings.bsky_identifier === 'string' ? settings.bsky_identifier : '';
            appPasswordInput.value = typeof settings.bsky_appPassword === 'string' ? settings.bsky_appPassword : '';
            // Display appropriate button (Auth or Clear) based on token availability
            if (token || (settings.bsky_identifier && settings.bsky_appPassword)) {
                clearButton.style.display = 'inline-block';
                authButton.style.display = 'none';
            } else {
                clearButton.style.display = 'none';
                authButton.style.display = 'inline-block';
            }
        }
    });

    closeSettingsButton.addEventListener('click', function () {
        settingsContainer.style.display = 'none';
    });

    // Already declared at the top. Removed duplicate declaration.
    blurToggle.checked = blurUnwanted;

    blurToggle.addEventListener('change', function(e) {
        blurUnwanted = e.target.checked;
    });

    // Media type filter event listeners
    showImagesCheckbox.addEventListener('change', function(e) {
        showImages = e.target.checked;
    });

    showVideosCheckbox.addEventListener('change', function(e) {
        showVideos = e.target.checked;
    });

    // Add touch event listener for images
    document.querySelectorAll('.image-container img').forEach(img => {
        img.addEventListener('touchstart', () => {
            openImageModal(img.dataset.src, img.dataset.profileLinkUrl, img.dataset.profileDid);
        }, { passive: true });
    });

    // Add touch event listener for the images container
    imagesContainer.addEventListener('touchstart', (event) => {
        const img = event.target.closest('img');
        if (img) {
            openImageModal(img.dataset.src, img.dataset.profileLinkUrl, img.dataset.profileDid);
        }
    });

    // Function to check if the device is mobile
    function isMobileDevice() {
        // Detect mobile device with viewport width
        return window.innerWidth < 768;
    }

    // Function to handle header visibility based on mouse movement and scrolling
    function handleHeaderVisibility() {

        if(window.innerWidth < 768) {
            showHeader();
            return;
        }

        let mouseStillTimer;
        let lastMousePosition = { x: 0, y: 0 };

        // Show header when mouse is still
        function showHeader() {
            header.style.display = 'flex';
        }

        // Hide header when mouse is moving or scrolling
        function hideHeader() {
            header.style.display = 'none';
        }

        // Detect scrolling and wheel events
        const hideOnScrollOrWheel = () => {
            if (!isMobileDevice()) {
                hideHeader();
                clearTimeout(mouseStillTimer);
                mouseStillTimer = setTimeout(showHeader, 500); // Show header after 1 second of stillness
            }
        };

        document.addEventListener('scroll', hideOnScrollOrWheel);
        document.addEventListener('wheel', hideOnScrollOrWheel);

    }

    // Initialize header visibility handling
    handleHeaderVisibility();

    // Gallery image size slider logic
    if (gallerySizeSlider && gallerySizeValue && galleryGrid) {
        // Set initial value
        gallerySizeValue.textContent = gallerySizeSlider.value + 'px';
        function updateGalleryGridSize(size) {
            // Set grid-template-columns and rows for perfect squares
            galleryGrid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${size}px, 1fr))`;
            galleryGrid.style.gridAutoRows = size + 'px';
            galleryGrid.style.minWidth = '32px';
            galleryGrid.style.minHeight = '32px';
            // Make all images perfect squares and cropped, set min size
            const imgs = galleryGrid.querySelectorAll('img');
            imgs.forEach(img => {
                img.style.width = size + 'px';
                img.style.height = size + 'px';
                img.style.minWidth = '32px';
                img.style.minHeight = '32px';
                img.style.objectFit = 'cover';
            });
        }
        // Only allow discrete values
        const allowedSizes = [32, 64, 128, 256, 384, 512, 1024];
        gallerySizeSlider.addEventListener('input', function() {
            // Snap to closest allowed value
            let size = parseInt(gallerySizeSlider.value, 10);
            let closest = allowedSizes.reduce((prev, curr) => Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev);
            gallerySizeSlider.value = closest;
            gallerySizeValue.textContent = closest + 'px';
            updateGalleryGridSize(closest);
        });
        // Set initial size on load (in case images are already present)
        updateGalleryGridSize(gallerySizeSlider.value);
        // If images are dynamically added, update their size
        const observer = new MutationObserver(() => updateGalleryGridSize(gallerySizeSlider.value));
        observer.observe(galleryGrid, { childList: true, subtree: true });
    }

    // Copy PLC button logic
    if (copyPlcBtn) {
        copyPlcBtn.addEventListener('click', function() {
            // Try to get PLC from the query string first
            let plc = null;
            try {
                const url = new URL(window.location.href);
                plc = url.searchParams.get('plc');
            } catch (e) {}
            // If not in query string, try to get from galleryProfileLink href (if DID is present)
            if (!plc && galleryProfileLink && galleryProfileLink.href) {
                // Try to extract DID from the profile link (e.g., https://bsky.app/profile/did:plc:xxx)
                const match = galleryProfileLink.href.match(/did:plc:([\w\d]+)/);
                plc = match ? match[1] : null;
            }
            // Remove 'did:plc:' prefix if present
            if (plc && plc.startsWith('did:plc:')) {
                plc = plc.substring(8);
            }
            if (plc) {
                navigator.clipboard.writeText(plc).then(function() {
                    copyPlcBtn.textContent = 'Copied!';
                    setTimeout(() => { copyPlcBtn.textContent = 'Copy PLC'; }, 1500);
                }, function() {
                    copyPlcBtn.textContent = 'Error';
                    setTimeout(() => { copyPlcBtn.textContent = 'Copy PLC'; }, 1500);
                });
            } else {
                copyPlcBtn.textContent = 'Not Found';
                setTimeout(() => { copyPlcBtn.textContent = 'Copy PLC'; }, 1500);
            }
        });
    }


    // Add event listener for the window resize event
    window.addEventListener('resize', handleHeaderVisibility);

    // Event listener for the "View Gallery" button
    viewAllMediaButton.addEventListener('click', function () {
        // Hide the image modal
        modal.style.display = 'none';

        if (token === null) {
            // Show the instructions modal
            galleryInstructionsModal.style.display = 'flex';
        } else {
            // Show the gallery
            isGalleryOpen = true; // Set flag to true BEFORE fetching images
            fetchGalleryImages(profileLink.href); // Fetch images
            galleryModal.style.display = 'flex'; // Show the gallery modal
            galleryModal.classList.add('show');
            galleryControls.style.display = 'flex';
        }
    });

    // Event listener to close the instructions modal
    closeInstructionsButton.addEventListener('click', function () {
        galleryInstructionsModal.style.display = 'none';
        modal.style.display = 'flex'; // Show the image modal
    });

    // Function to show the gallery loading overlay
    function showGalleryLoadingOverlay() {
        // Add the CSS animation if it doesn't exist
        if (!document.getElementById('spinner-animation')) {
            const style = document.createElement('style');
            style.id = 'spinner-animation';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        const loadingOverlay = document.getElementById('gallery-loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        } else {
            const overlay = document.createElement('div');
            overlay.id = 'gallery-loading-overlay';
            overlay.style.position = 'fixed';
            overlay.style.bottom = '20px';
            overlay.style.right = '20px';
            overlay.style.width = '40px';
            overlay.style.height = '40px';
            overlay.style.background = 'transparent';
            overlay.style.display = 'flex';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.zIndex = '1000';
            const spinner = document.createElement('div');
            spinner.style.border = '4px solid rgba(255, 255, 255, 0.3)';
            spinner.style.borderTop = '4px solid #3498db';
            spinner.style.borderRadius = '50%';
            spinner.style.width = '30px';
            spinner.style.height = '30px';
            spinner.style.animation = 'spin 1s linear infinite';
            overlay.appendChild(spinner);
            document.body.appendChild(overlay);
        }
    }

    // Function to hide the gallery loading overlay
    function hideGalleryLoadingOverlay() {
        const loadingOverlay = document.getElementById('gallery-loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
});