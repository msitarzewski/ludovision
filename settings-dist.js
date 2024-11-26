// Bluesky credentials from Account Settings
// see https://bsky.app/settings/app-passwords
const bsky_identifier = null;
const bsky_appPassword = null;

// Default feed image size
const imageSize = 128;

// Launch warning display on load/refresh
const launchWarning = true;

// Magnifier in Gallery view
const magnifier = true;

// Settings object
const settings = {
    imageSize: imageSize,
    launchWarning: launchWarning,
    magnifier: magnifier,
    bsky_identifier: bsky_identifier,
    bsky_appPassword: bsky_appPassword,
}
    
window.settings = settings;