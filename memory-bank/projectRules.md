# Project Rules: Ludovision

## Project Patterns & Preferences

### Code Organization
- **Vanilla JavaScript**: The project uses pure JavaScript without frameworks or libraries
- **Single JS File**: All JavaScript is contained in `script.js` for transparency
- **Settings Separation**: Configuration options are kept in a separate `settings.js` file
- **Modal-Based UI**: Interactive elements use modal dialogs for detailed views

### Naming Conventions
- **camelCase**: Variables and functions use camelCase naming
- **Descriptive Names**: Element IDs and variable names are descriptive of their purpose
- **Prefix Conventions**: Modal elements are prefixed with their type (e.g., `gallery-modal`)

### UI/UX Patterns
- **Minimalist Design**: Interface should remain clean and focused on content
- **Content Warnings**: Potentially sensitive content should have appropriate warnings
- **User Control**: Users should have control over their experience (image size, content filtering)
- **Keyboard Navigation**: Support keyboard shortcuts for common actions
- **Auto-Hide Controls**: Controls should fade out to maximize viewing area but remain accessible
- **Mobile-First Interactions**: Touch interactions must be optimized for single-tap responsiveness

### Privacy Principles
- **No Tracking**: The application must never implement tracking or analytics
- **Transparency**: All functionality should be transparent to users
- **Data Minimization**: Only collect/store data essential for functionality
- **User Consent**: Always get explicit consent before storing any user data

## Critical Implementation Paths

### Image Loading Flow
1. WebSocket connection receives image data from Bluesky firehose
2. Image data is processed for content warnings and added to the queue
3. Images are rendered to the DOM when they enter the viewport
4. Lazy loading prevents unnecessary bandwidth usage

### Authentication Flow
1. User provides Bluesky identifier and app password
2. Credentials are validated and tokens are requested
3. Tokens are stored (with permission) and renewed automatically
4. Authentication status determines available features

### Gallery View Process
1. User clicks "View Gallery" on an image modal
2. System checks for valid authentication
3. If authenticated, user's media is fetched and displayed in grid
4. Gallery navigation allows viewing all user's images

## User Preferences

### Content Display
- Default image size is 128px but can be customized
- Content warnings are enabled by default but can be disabled
- Potentially unwanted content is blurred by default
- Images load newest-first by default but can be toggled

### Authentication
- Authentication tokens are not stored by default
- Users can opt-in to localStorage for convenience
- App passwords must follow the correct format (xxxx-xxxx-xxxx-xxxx)

### Performance
- Feed can be paused to manage resource usage
- Image loading can be delayed to control flow rate
- Header auto-hides during inactivity for more viewing space

## Mobile Touch Interaction Patterns

### Critical Rules for Mobile Responsiveness
1. **Use `touchend` instead of `click` for buttons**: Mobile `click` events have 300ms delay and can be unreliable when element states are changing
2. **Never use `pointer-events: none` on hidden interactive elements**: Prevents single-tap interactions; use opacity transitions instead
3. **Distinguish taps from scrolls**: Track touchstart/touchend positions - if movement > 10px, it's a scroll, not a tap
4. **Use passive listeners for scroll compatibility**: `{ passive: true }` allows smooth scrolling without interference
5. **Minimum 44px tap targets**: Follow mobile accessibility guidelines for adequate touch target size
6. **Prevent ghost clicks**: Use `preventDefault()` on touchend events to avoid duplicate click events 300ms later

### Auto-Hide Control Timing
- **Timer Duration**: 5 seconds provides good balance between immersion and usability on mobile
- **Pause on Interaction**: Clear timer when hovering/touching controls to prevent premature hiding
- **Visual Feedback**: Fade transitions (0.3s) provide smooth UX

### Event Handler Patterns
```javascript
// Good: Reliable mobile button
button.addEventListener('touchend', (e) => {
  e.preventDefault();
  handleAction();
}, { passive: false });

// Also support desktop
button.addEventListener('click', (e) => {
  if (e.detail !== 0) { // Avoid double-firing
    handleAction();
  }
});

// Good: Tap vs scroll detection
let startX, startY;
element.addEventListener('touchstart', (e) => {
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
}, { passive: true });

element.addEventListener('touchend', (e) => {
  const deltaX = Math.abs(e.changedTouches[0].clientX - startX);
  const deltaY = Math.abs(e.changedTouches[0].clientY - startY);
  if (deltaX < 10 && deltaY < 10) {
    // It's a tap
  }
}, { passive: true });
```

## Known Challenges

### Technical Limitations
- WebSocket connections may be interrupted and require reconnection
- Long sessions may lead to memory usage concerns
- Browser limitations affect some features (e.g., magnifier on mobile)

### Content Considerations
- Bluesky firehose is unfiltered and may contain sensitive content
- Content warning labels are limited to what Bluesky provides
- No way to predict or pre-filter incoming content

### User Experience
- Settings panel organization could be more intuitive
- Authentication process could provide better feedback
- Some edge cases in mobile touch interactions may need further refinement

## Tool Usage Patterns

### Browser Developer Tools
- Console logging is used sparingly and only for critical information
- Most debugging should be done through browser developer tools
- Performance monitoring is important for long sessions

### Code Editing
- Maintain the separation between HTML structure, CSS styling, and JS logic
- Keep the codebase simple and readable
- Document any complex logic with clear comments

### Testing
- Test across multiple browsers (Chrome, Firefox, Safari)
- Test on both desktop and mobile devices
- Verify authentication flow security

## Project Evolution

### Version History
- Initial proof of concept focused on basic streaming
- Added modal views and profile links
- Implemented gallery view with authentication
- Added user customization options
- Created Memory Bank documentation system
- Implemented comprehensive video support
- Added full-screen modal controls with auto-hide
- Optimized mobile touch interactions for single-tap responsiveness

### Future Directions
- Consider adding more advanced filtering options
- Explore additional visualization modes
- Investigate performance optimizations for long sessions
- Continue refining mobile touch interactions based on user feedback
