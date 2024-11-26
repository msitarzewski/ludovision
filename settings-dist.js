// Bluesky credentials from Account Settings
// see https://bsky.app/settings/app-passwords
const bsky_identifier = "dotscott.co";
const bsky_appPassword = "vivxEb-mopxyp-6qycny";

// Default feed image size
const imageSize = 128;

// Launch warning display on load/refresh
const launchWarning = true;

// Magnifier in Gallery view
const magnifier = true;

// Feed speed in milliseconds (1000 = 1 second delay)
const feedDelay = 0;

// Feed starts in running state
const feedPaused = false;

// Settings object
const settings = {
    imageSize: imageSize,
    launchWarning: launchWarning,
    magnifier: magnifier,
    bsky_identifier: bsky_identifier,
    bsky_appPassword: bsky_appPassword,
    newestFirst: true,
    feedDelay: feedDelay,
    feedPaused: feedPaused,
}
    
window.settings = settings;