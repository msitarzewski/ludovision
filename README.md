![Ludovision Feed](samples/feed.jpg "Default feed view")

# Ludovision

**Ludovision** is a lightweight, client-side tool that streams and displays real-time images uploaded to the [Bluesky](https://bsky.app) social media platform via its firehose. Designed as a proof of concept, Ludovision highlights the fragility of privacy through obscurity and serves as a reminder of the digital footprints we leave behind online.

## 🚀 Features

- **Real-Time Streaming**: Scroll infinitely through images uploaded to Bluesky in real-time.
- **Interactive Viewer**: Click any image to view it in a larger modal with profile access.
- **Enhanced Gallery View**: Browse a user's complete image collection with automatic pagination and continuous navigation.
- **Lazy Loading**: Images load only when scrolled into view, optimizing bandwidth and performance.
- **Intelligent Navigation**: When reaching the end of loaded images, more are automatically fetched.
- **Image Deduplication**: Smart filtering prevents duplicate images from appearing in galleries.
- **Error Recovery**: User-friendly error handling with automatic retries and clear feedback.
- **No Server Required**: Runs entirely client-side for full transparency.
- **Zero Tracking**: No data collection or analytics of any kind.
- **No External Dependencies**: Self-contained with no remote code loading.

## 🛠️ How It Works

Ludovision connects directly to the Bluesky firehose API and processes public image data to display it in a simple, scrollable interface. It leverages minimal JavaScript to provide functionality without requiring any external dependencies or backend server.

### The Name
The project is named **Ludovision** as a nod to *A Clockwork Orange*'s Ludovico Technique—a scene where the protagonist is subjected to aversion therapy. Similarly, scrolling through this unfiltered firehose of images serves as a vivid reminder of how public and permanent our online actions are.

## 🌟 Purpose

Ludovision was built to:
- Demonstrate how easy it is to aggregate and parse public data.
- Raise awareness of the digital footprints we leave behind on social platforms.
- Explore the concept of privacy through obscurity and its inherent fragility.

**This project is an experiment and is not intended for production use or deployment in a live environment.**

## ⚠️ Privacy Note

Ludovision is a tool for exploring publicly available data and does not:
- Store any data locally or remotely.
- Track user activity in any form.
- Interact with any servers by default other than the Bluesky firehose
- Ludovision will accept an auth token for Gallery view. This will identify your activity with Bluesky servers when using Gallery view only. Use caution.

## 🧑‍💻 Getting Started

To use Ludovision locally, clone the repository and open the `index.html` file in your browser.
- ‼️ I **HIGHLY** recommend opening this file in Private Browsing Mode or Incognito.

### Prerequisites
- A modern browser (tested on Chrome, Firefox, and Safari).
- Access to the Bluesky firehose API.
- (Optional) A Bluesky auth pair for enabling the full gallery view.

### Installation

**QUICK START: No installation is required. Download the zip, decompress, and open index.html (preferrably in a private window). That's it.**

1. Clone this repository:
   ```bash
   git clone https://github.com/msitarzewski/ludovision.git
   ```
2. Open the project folder:
   ```bash
   cd ludovision
   ```
3. Launch the tool by opening `index.html` in your browser:
   ```bash
   open index.html
   ```
4. Optional:
   ```bash
   cp settings-dist.js settings.js
   ```
   Modify default image size, token, etc.

### Setting Up the Full Gallery View

To enable the full gallery view of an image owner's account:
1. Locate the `bsky_identifier` and `bsky_appPassword` variables in the settings.js file (see above).
2. Replace null with your Bluesky identifier and App Password.
   ```javascript
   const bsky_identifier = null;
   const bsky_appPassword = null;
   ```
   > *Note: see https://bsky.app/settings/app-passwords for more details*

3. Save the changes and reload the file in your browser.

## Content Warning Modal
<img src="samples/warning.jpg" alt="The content warning modal" title="Warning" width="450">
`OK` to load the feed<br>
`CANCEL` to be redirected to Bluesky<br>
Note: You can override this warning in settings.js

## The Feed
<img src="samples/feed.jpg" alt="Screen shot of the basic feed" title="The Feed" width="450">
<img src="samples/feed-large.jpg" alt="Screen shot of the basic feed with a larger image size" title="The Feed Large" width="450">
The feed begins to load automatically after either the Warning modal is acknowledged, or the pages is freshed when overridden.

Images stream in in real time from the firehose. We use a defer technique to show only the images you've scrolled to or that have already appeared in the viewport. This saves a ton of bandwidth and makes the gallery view snappy.

You can adjust the image preview size in the header from between 32px and 512px on the fly. You can set a default value in settings.js, otherwise it's 128px.

The header also shows status. Today that's simply the number of images that have been loaded from into the feed.

Click any image to open the Feed Image modal. 

## Feed Image Modal
<img src="samples/feed-image.jpg" alt="Screen shot of an image modal" title="The Image Modal" width="450">
The selected image is scaled to fit the current viewport.

`View Profile` to open Bluesky to the user's profile page

If Bluesky authentication is enabled, you can also click `View Gallery` to see the rest of the images in the user's profile.

> *Note: You can use the space bar to launch the Gallery View. ESC will close the current modal*

## Gallery View
<img src="samples/gallery.jpg" alt="Screen shot of a user's media gallery" title="The Gallery Modal" width="450">
All images are loaded from the current image owner's account. They're presented in 128px/128px.

Click any image to view.

`Close` (or ESC) to close the modal

`View Profile` to open Bluesky to the user's profile page

> *Note: You can use the space bar to launch the Gallery Image Modal with the first image. ESC will close the current modal.*

## Gallery Image View
<img src="samples/gallery-image.jpg" alt="Screen shot of an image from the gallery" title="The Gallery Image Modal" width="450">
<img src="samples/gallery-image-zoom.jpg" alt="Screen shot of an image from the gallery with zoom" title="The Gallery Image Modal Zoomed" width="450">
The selected Gallery image is displayed within the current viewport. Tapping space or clicking `View Full Image` will open the image in a new tab if the image is scaled. In addition, a magnifying area will follow the cursor. This can be disabled in settings.js.<br>

`L/R Arrows and W/D` keys navigate the images while in Gallery Image Mode. When you reach the end of loaded images, Ludovision automatically fetches more images from the user's profile. If no more images are available, navigation loops back to the first image.

`Close` (or ESC) to close the modal

## Enhanced Gallery Features

### Continuous Navigation
When browsing through a gallery with arrow keys, Ludovision automatically loads more images when you reach the end of the currently loaded set. If no more images are available from the user's profile, navigation will loop back to the first image.

### Lazy Loading
Images are loaded only when they're about to enter your viewport, saving bandwidth and improving performance.

### Image Deduplication
The gallery automatically filters out duplicate images, ensuring you don't see the same content multiple times.

### Improved Loading Experience
A subtle loading indicator appears when fetching more images, replacing the full-screen dimming effect for a less intrusive experience.

### Error Handling
If an error occurs while loading images, you'll see a user-friendly message with the option to retry.

## 🎯 Future Goals

- Enhance the interface for better usability.
- Add filters to categorize or exclude specific content.
- Expand support for additional social media APIs (as appropriate).
- Raise awareness about digital privacy and security through further experiments.

## 🛡️ Disclaimer

This project is intended for educational and awareness purposes only. Respect platform terms of service and user privacy when using or replicating this project. 

## 📝 License

This project is licensed under the [Unlicense](LICENSE).
