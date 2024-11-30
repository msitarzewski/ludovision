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
    const profileLink = document.getElementById('profile-link');
    const galleryProfileLink = document.getElementById('gallery-profile-link');
    const viewAllMediaButton = document.getElementById('view-all-media-button');
    const galleryInstructionsModal = document.getElementById('instructions-modal');
    const closeInstructionsButton = document.getElementById('close-instructions-button');
    const galleryContainer = document.querySelector('#gallery-modal .grid');
    const galleryImageModal = document.getElementById('gallery-image-modal');
    const galleryImages = Array.from(document.querySelectorAll('#gallery-modal .grid img'));
    const imageSizeSlider = document.getElementById('image-size-slider');
    const imageSizeInput = document.getElementById('image-size-input');
    const magnifierElement = document.getElementById('magnifier');
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const settingsContainer = document.getElementById('settings-container');
    const closeSettingsButton = document.getElementById('close-settings-button');

    const identifierInput = document.getElementById('bsky-identifier');
    const appPasswordInput = document.getElementById('bsky-app-password');
    const authButton = document.getElementById('auth-button');
    const clearButton = document.getElementById('clear-button');

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
    
                if (
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
                        imageQueue.add({ imageUrl, profileLinkUrl, profileDid, blurred });
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

    // Create IntersectionObserver for lazy loading
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src; // Set the real image source
                    img.style.opacity = 1; // Make the image visible
                    observer.unobserve(img); // Stop observing the image
                }
            }
        });
    }, {
        root: null, // Default to the viewport
        rootMargin: "0px", // Load the image when it enters the viewport
        threshold: 0.1 // Trigger when 10% of the image is visible
    });

    // Immediate append function (original appendImage logic)
    function appendImageImmediate({ imageUrl, profileLinkUrl, profileDid, blurred }) {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'image-container';

        const imgElement = document.createElement('img');
        imgElement.dataset.src = imageUrl;
        if(blurred) {
            //console.log('blurred');
            imgElement.classList.add('blurred');
            imgElement.addEventListener('mouseout', function () {
                imgElement.classList.add('blurred');
            });
            imgElement.addEventListener('mouseover', function () {
                imgElement.classList.remove('blurred');
            });
        }
        imgElement.alt = 'No description available';

        imgElement.addEventListener('click', () => {
            openImageModal(imageUrl, profileLinkUrl, profileDid);
        });

        imageDiv.appendChild(imgElement);
        
        if (newestFirst) {
            imagesContainer.insertBefore(imageDiv, imagesContainer.firstChild);
        } else {
            imagesContainer.appendChild(imageDiv);
        }

        observer.observe(imgElement);
        totalImages++;
        updateDebugInfo();
    }

    // Observe all images for lazy loading
    document.querySelectorAll('.image-container img').forEach(img => observer.observe(img));

    // Open image modal
    function openImageModal(imageUrl, profileLinkUrl, profileDid) {
        modalImage.src = imageUrl;
        profileLink.href = profileLinkUrl;
        profileLink.textContent = 'View Profile';
        modal.style.display = 'flex'; // Show modal
    }

    // Preprocess gallery labels
    function preprocessGalleryLabels(labels) {
        return labels.map(label => label.val);
    }

    // Fetch profile gallery images
    function fetchGalleryImages(profileUrl) {

        // Clear previous content
        galleryContainer.innerHTML = ''; 

        // Extract DID from profile URL
        const profileDid = profileUrl.split('/').pop();

        fetch(`https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed?actor=${profileDid}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {

            // Set profile link
            galleryProfileLink.href = profileUrl;

            // Append images
            data.feed.forEach(item => {
                if (item.post.embed && item.post.embed.images) {
                    item.post.embed.images.forEach(image => {
                        const imgElement = document.createElement('img');
                        imgElement.src = image.fullsize; // Use image.fullsize for full-size images
                        imgElement.alt = image.alt || 'User media';
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
                            currentGalleryImageIndex = Array.from(galleryContainer.querySelectorAll('img')).indexOf(imgElement);
                            showGalleryImageInModal(imgElement.src);
                        });
                        galleryContainer.appendChild(imgElement);
                    });
                }
            });
        })

        // catch expired token
        .catch(error => {  
            if(error.message.includes('Expired')) {
                alert('Token expired.');
            } else {
                console.error('Error fetching gallery images:', error);
            }
        })
        .finally(() => {
            //log('Gallery images loaded.');
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
            }
        }
    });

    // Close modals by clicking outside
    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
        if (event.target === galleryModal) {
            galleryModal.style.display = 'none';
        }
    });

    // Show gallery image in modal
    function showGalleryImageInModal(imageUrl) {
        const galleryModalImage = document.getElementById('gallery-modal-image');
        const galleryImageModal = document.getElementById('gallery-image-modal');
        const galleryModal = document.getElementById('gallery-modal');

        // Remove any existing "View Full Size" button to prevent duplicates
        const existingButton = document.querySelector('.view-gallery-full-size-button');
        if (existingButton) {
            existingButton.remove();
        }

        // Set the image source
        galleryModalImage.src = imageUrl;

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
                    window.open(imageUrl, '_blank'); // Open full-size image in a new tab
                });

                // Append the button to the modal
                galleryImageModal.appendChild(fullSizeButton);

                // Dynamically enable the magnifier since the button is now present
                enableMagnifier(galleryModalImage);
            } else {
                //console.log('Image is displayed at full size');
            }
        };

        // Show the modal
        galleryImageModal.style.display = 'flex';
        galleryModal.style.display = 'none'; // Hide the gallery modal
    }

    function navigateGalleryImage(direction) {

        // Dynamically select all gallery images
        const galleryImagesArray = Array.from(document.querySelectorAll('#gallery-modal .grid img'));
        
        if (galleryImagesArray.length === 0) {
            console.error('No gallery images available.');
            return;
        }

        // Update the current index with wrapping logic
        currentGalleryImageIndex = (currentGalleryImageIndex + direction + galleryImagesArray.length) % galleryImagesArray.length;

        // Show the selected image in the gallery modal
        const selectedImage = galleryImagesArray[currentGalleryImageIndex];
        if (selectedImage) {
            showGalleryImageInModal(selectedImage.src);
        } else {
            console.error('Selected image not found.');
        }
    }

    function closeGalleryImageModal() {
        galleryImageModal.style.display = 'none';
        galleryModal.style.display = 'flex'; // Show gallery modal again
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
                // Launch the gallery-image-viewer if the gallery is open
                const selectedImage = galleryContainer.querySelector('img');
                if (selectedImage) {
                    selectedImage.click(); // Simulate click to open image viewer
                }
            }
        }

    });

    // Set default for image sizes
    imageSizeSlider.value = imageSize;
    imageSizeInput.value = imageSize;

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
    const galleryModalImage = document.getElementById('gallery-modal-image');
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

    // Start the authentication process
    handleAuthentication();

    const sortToggle = document.getElementById('sort-toggle');
    sortToggle.checked = newestFirst;

    // Add event listener for the toggle
    sortToggle.addEventListener('change', function(e) {
        newestFirst = e.target.checked;
        
        // Reverse the order of existing images
        const images = Array.from(imagesContainer.children);
        images.reverse().forEach(img => imagesContainer.appendChild(img));
    });

    // Now we can safely get the elements and add the event listener
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
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
            settingsContainer.style.display = 'flex';
        }
    });

    closeSettingsButton.addEventListener('click', function () {
        settingsContainer.style.display = 'none';
    });

    const blurToggle = document.getElementById('blur-toggle');
    blurToggle.checked = blurUnwanted;

    blurToggle.addEventListener('change', function(e) {
        blurUnwanted = e.target.checked;
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
            fetchGalleryImages(profileLink.href); // Fetch images
            galleryModal.style.display = 'flex'; // Show the gallery modal
        }
    });

    // Event listener to close the instructions modal
    closeInstructionsButton.addEventListener('click', function () {
        galleryInstructionsModal.style.display = 'none';
        modal.style.display = 'flex'; // Show the image modal
    });

});