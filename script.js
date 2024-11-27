document.addEventListener('DOMContentLoaded', function () {
        
    // Settings and variables - move these to the top
    const settings = typeof window.settings === 'object' ? window.settings : {};

    let token = null;
    let refreshToken = null;
    let imageSize = typeof settings.imageSize === 'number' ? settings.imageSize : 128;
    let launchWarning = typeof settings.launchWarning === 'boolean' ? settings.launchWarning : true;
    let magnifier = typeof settings.magnifier === 'boolean' ? settings.magnifier : true;
    let newestFirst = typeof settings.newestFirst === 'boolean' ? settings.newestFirst : false;
    let feedDelay = typeof settings.feedDelay === 'number' ? settings.feedDelay : 0;
    let feedPaused = typeof settings.feedPaused === 'boolean' ? settings.feedPaused : false;
    let pendingImages = [];
    let totalImages = 0;
    let currentGalleryImageIndex = 0;

    // Bluesky credentials
    let bsky_identifier = typeof settings.bsky_identifier === 'string' ? settings.bsky_identifier : null;
    let bsky_appPassword = typeof settings.bsky_appPassword === 'string' ? settings.bsky_appPassword : null;

    // Elements
    const header = document.getElementById('header');
    const warningModal = document.getElementById('warning-modal');
    const okButton = document.getElementById('ok-button');
    const cancelButton = document.getElementById('cancel-button');
    const galleryModal = document.getElementById('gallery-modal');
    const closeGalleryButton = document.getElementById('close-gallery-button');
    const imagesContainer = document.getElementById('images-container');
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const profileLink = document.getElementById('profile-link');
    const galleryProfileLink = document.getElementById('gallery-profile-link');
    const viewAllMediaButton = document.getElementById('view-all-media-button');
    const galleryContainer = document.querySelector('#gallery-modal .grid');
    const galleryImageModal = document.getElementById('gallery-image-modal');
    const galleryImages = Array.from(document.querySelectorAll('#gallery-modal .grid img'));
    const imageSizeSlider = document.getElementById('image-size-slider');
    const imageSizeInput = document.getElementById('image-size-input');
    const magnifierElement = document.getElementById('magnifier');

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
        warningModal.style.display = 'none';
        header.style.display = 'flex';
        setupWebSocket(); // Call WebSocket setup
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

    // Open gallery modal
    viewAllMediaButton.addEventListener('click', function () {
        modal.style.display = 'none'; // Close image modal
        fetchGalleryImages(profileLink.href); // Fetch images
        galleryModal.style.display = 'flex'; // Open gallery modal
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

    // WebSocket setup
    function setupWebSocket() {
        const socket = new WebSocket('wss://jetstream1.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post');

        socket.addEventListener('message', function (event) {
            try {
                imagesContainer.style.display = 'grid';
                const decodedMessage = JSON.parse(event.data);
                if (
                    decodedMessage.commit &&
                    decodedMessage.commit.record &&
                    decodedMessage.commit.record.embed &&
                    decodedMessage.commit.record.embed.images
                ) {
                    // Get images and profile DID
                    const images = decodedMessage.commit.record.embed.images;
                    const profileDid = decodedMessage.did;
                    const profileLinkUrl = `https://bsky.app/profile/${decodedMessage.did}`;

                    // Use imageQueue.add instead of appendImage
                    images.forEach(image => {
                        const link = image.image.ref['$link'];
                        const mimeType = image.image.mimeType.split('/')[1];
                        const imageUrl = `https://cdn.bsky.app/img/feed_thumbnail/plain/${decodedMessage.did}/${link}@${mimeType}`;
                        imageQueue.add({ imageUrl, profileLinkUrl, profileDid });
                    });
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        });

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
    function appendImageImmediate({ imageUrl, profileLinkUrl, profileDid }) {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'image-container';

        const imgElement = document.createElement('img');
        imgElement.dataset.src = imageUrl;
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
            console.log('Gallery images loaded.');
        });
    }

    // Update debug info
    function updateDebugInfo() {
        const debugInfo = document.getElementById('debug-info');
        debugInfo.textContent = `${totalImages} images loaded${imageQueue.pending.length > 0 ? ` (${imageQueue.pending.length} pending)` : ''}`;
        
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
                fullSizeButton.style.position = 'absolute';
                fullSizeButton.style.bottom = '20px';
                fullSizeButton.style.right = '20px';
                fullSizeButton.style.zIndex = '1000';
                fullSizeButton.style.padding = '10px 20px';

                fullSizeButton.addEventListener('click', () => {
                    window.open(imageUrl, '_blank'); // Open full-size image in a new tab
                });

                // Append the button to the modal
                galleryImageModal.appendChild(fullSizeButton);

                // Dynamically enable the magnifier since the button is now present
                enableMagnifier(galleryModalImage);
            } else {
                console.log('Image is displayed at full size');
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
        const imageContainers = document.querySelectorAll('.image-container'); // Select containers on each input
        imageContainers.forEach(container => {
            container.style.height = sizeInPx;
            const img = container.querySelector('img');
            if (img) {
                img.style.height = sizeInPx;
            }
        });

        // Update grid-template-columns to allow wrapping
        const imagesContainer = document.getElementById('images-container');
        imagesContainer.style.gridAutoRows = sizeInPx; // Set the height
        imagesContainer.style.gridTemplateColumns = `repeat(auto-fill, minmax(${sizeInPx}, 1fr))`;
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
                    identifier: bsky_identifier,
                    password: bsky_appPassword,
                }),
            });

            // Check if the response is successful
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Authentication failed: ${errorText}`);
            }

            // Parse and return the response as JSON
            const tokens = await response.json();
            console.log('Authentication successful. Tokens:', tokens);
            return tokens;
        } catch (error) {
            console.error('Error during session creation:', error.message);
        }
    }

    // Function to handle token creation and renewal
    async function handleAuthentication() {
        if (bsky_identifier && bsky_appPassword) {
            console.log('Starting authentication...');

            // Attempt to create a session
            const tokens = await createSession();

            if (tokens) {
                // Store tokens for use
                token = tokens.accessJwt;
                expiresIn = tokens.expiresIn;
                refreshToken = tokens.refreshJwt;

                // Show the view all media button
                viewAllMediaButton.style.display = 'block';

                console.log('Session token:', tokens.accessJwt);

                // Schedule token renewal before expiration
                scheduleTokenRenewal(tokens);
            } else {
                console.error('Failed to obtain tokens.');
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

    // Use it in event listeners
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            //ModalManager.closeAll();
        }
    });

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

});