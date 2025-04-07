# Technical Context: Ludovision

## Technologies Used

### Core Technologies
1. **HTML5**: Provides the structural foundation of the application
2. **CSS3**: Handles all styling and visual presentation
3. **JavaScript (ES6+)**: Powers all client-side functionality
4. **WebSocket API**: Enables real-time streaming from the Bluesky firehose
5. **Fetch API**: Used for authenticated requests to the Bluesky API
6. **IntersectionObserver API**: Implements lazy loading for images
7. **localStorage API**: Optional storage for authentication tokens

### External Services
1. **Bluesky Firehose API**: Source of real-time image data
2. **Bluesky Authentication API**: Used for gallery view functionality

## Development Setup
Ludovision is designed to be extremely simple to set up and run:

### Basic Setup
1. Download or clone the repository
2. Open `index.html` in a modern browser (preferably in private/incognito mode)
3. No build process, server, or installation required

### Development Environment
- Any text editor or IDE can be used for development
- No build tools, preprocessors, or transpilers are required
- Browser developer tools are sufficient for debugging

### Testing
- Manual testing across different browsers (Chrome, Firefox, Safari)
- Responsive design testing for different screen sizes
- No automated testing framework is implemented

## Technical Constraints

### Client-Side Only
- The application must run entirely in the browser
- No server-side components or backend requirements
- All processing happens on the user's device

### No External Dependencies
- No JavaScript libraries or frameworks (e.g., jQuery, React)
- No CSS frameworks or preprocessors
- No build tools or bundlers
- No analytics or tracking scripts

### Browser Compatibility
- Must work on modern browsers (Chrome, Firefox, Safari)
- No support required for legacy browsers
- Must be responsive and work on both desktop and mobile devices

### API Limitations
- Bluesky API rate limits must be respected
- Authentication tokens have expiration times that must be managed
- The firehose API provides unfiltered content that may require content warnings

## Dependencies

### Required Browser Features
- WebSocket support
- Fetch API support
- ES6+ JavaScript features
- CSS Grid and Flexbox
- IntersectionObserver API

### Optional Features
- localStorage (for saving authentication tokens)
- Touch events (for mobile interaction)

### External API Dependencies
- Bluesky Firehose API endpoint
- Bluesky Authentication API endpoint
- Bluesky User Profile API endpoint

## Configuration Options
Ludovision includes a `settings.js` file that allows customization of various features:

```javascript
// Example settings.js configuration
const settings = {
    imageSize: 128,             // Default image size (32-512px)
    launchWarning: true,        // Show content warning on launch
    magnifier: true,            // Enable image magnifier
    blurUnwanted: true,         // Blur images with unwanted labels
    newestFirst: false,         // Sort order for images
    feedDelay: 0,               // Delay between adding images to feed
    feedPaused: false,          // Start with feed paused
    useLocalStorage: false,     // Use localStorage for auth tokens
    inactivityTimeout: null,    // Auto-hide header after inactivity
    bsky_identifier: null,      // Bluesky identifier for auth
    bsky_appPassword: null      // Bluesky app password for auth
};
```

## Security Considerations
1. Authentication tokens are stored only with user permission
2. App passwords are validated for correct format
3. No tracking or analytics are implemented
4. Users are encouraged to use private/incognito mode
5. Content warnings are implemented for potentially sensitive content
6. Authentication is handled directly with Bluesky, not through a third party
