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
- Mobile experience requires different interaction patterns
- Settings panel organization could be more intuitive
- Authentication process could provide better feedback

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

### Future Directions
- Consider adding more advanced filtering options
- Explore additional visualization modes
- Investigate performance optimizations
- Enhance mobile experience
