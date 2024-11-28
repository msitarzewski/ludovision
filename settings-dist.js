// Bluesky credentials from Account Settings
// see https://bsky.app/settings/app-passwords
const bsky_identifier = null;
const bsky_appPassword = null;

// Manually specified token
const manualToken = null;

// Default feed image size
const imageSize = 128;

// Launch warning display on load/refresh
const launchWarning = true;

// Magnifier in Gallery view
const magnifier = true;

// Feed speed in milliseconds (1000 = 1 second delay)
const feedDelay = 0;

// Inactivity timeout in milliseconds (0 = no timeout)
const inactivityTimeout = 10000;

// Feed starts in running state
const feedPaused = false;

// Feed order
const newestFirst = false;

// Use local storage for settings
const useLocalStorage = false;

// Settings object
const settings = {
    imageSize: imageSize,
    launchWarning: launchWarning,
    magnifier: magnifier,
    bsky_identifier: bsky_identifier,
    bsky_appPassword: bsky_appPassword,
    manualToken: manualToken,
    newestFirst: newestFirst,
    feedDelay: feedDelay,
    feedPaused: feedPaused,
    useLocalStorage: useLocalStorage,
    inactivityTimeout: inactivityTimeout
}
    
window.settings = settings;