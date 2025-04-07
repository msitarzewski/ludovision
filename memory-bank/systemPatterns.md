# System Patterns: Ludovision

## System Architecture
Ludovision employs a simple, client-side only architecture that prioritizes transparency and minimal dependencies:

```
┌─────────────────────────────────────────────────────────┐
│                      Client Browser                      │
│                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │    HTML     │    │ JavaScript  │    │     CSS     │  │
│  │  Structure  │◄──►│   Logic     │◄──►│   Styling   │  │
│  └─────────────┘    └──────┬──────┘    └─────────────┘  │
│                            │                            │
│                     ┌──────▼──────┐                     │
│                     │  WebSocket  │                     │
│                     │ Connection  │                     │
│                     └──────┬──────┘                     │
└───────────────────────────┼─────────────────────────────┘
                            │
                  ┌─────────▼─────────┐
                  │  Bluesky Firehose │
                  │        API        │
                  └───────────────────┘
```

## Key Technical Decisions

### 1. Client-Side Only Implementation
- **Decision**: Implement the entire application client-side without a server component
- **Rationale**: Maximizes transparency, simplifies deployment, and emphasizes that even client-side tools can aggregate public data effectively
- **Implementation**: Pure HTML, CSS, and JavaScript that runs entirely in the browser

### 2. WebSocket Connection
- **Decision**: Use WebSocket connection to Bluesky's firehose API
- **Rationale**: Enables real-time streaming of images without polling
- **Implementation**: Native WebSocket API in JavaScript

### 3. Lazy Loading
- **Decision**: Implement lazy loading for images
- **Rationale**: Improves performance and reduces bandwidth usage
- **Implementation**: IntersectionObserver API to load images only when they enter the viewport

### 4. Modal-Based UI
- **Decision**: Use modal dialogs for detailed views
- **Rationale**: Keeps the main interface clean while allowing for detailed exploration
- **Implementation**: CSS-based modals with JavaScript control

### 5. Local Authentication Storage
- **Decision**: Optional local storage for authentication tokens
- **Rationale**: Improves user experience for those who want to use gallery view regularly
- **Implementation**: Browser's localStorage API with user opt-in

### 6. No External Dependencies
- **Decision**: Use only native browser APIs without external libraries
- **Rationale**: Maximizes transparency and minimizes security concerns
- **Implementation**: Vanilla JavaScript for all functionality

## Design Patterns

### 1. Observer Pattern
- **Implementation**: Used with the IntersectionObserver for lazy loading images
- **Benefit**: Efficiently manages resources by loading content only when needed

### 2. Queue Pattern
- **Implementation**: ImageQueue class for managing the flow of incoming images
- **Benefit**: Provides control over the rate of image display and allows for pausing/resuming

### 3. Module Pattern
- **Implementation**: Organized code into logical function groups
- **Benefit**: Improves code organization and maintainability

### 4. Event-Driven Architecture
- **Implementation**: Extensive use of event listeners for user interactions
- **Benefit**: Creates a responsive UI that reacts to user actions

### 5. Singleton Pattern
- **Implementation**: ModalManager class for controlling modal dialogs
- **Benefit**: Centralizes modal control logic

## Component Relationships

### Core Components
1. **WebSocket Handler**: Connects to Bluesky firehose and processes incoming data
2. **Image Queue**: Manages the flow of images into the document
3. **Modal System**: Handles the display of detailed views
4. **Gallery View**: Manages the retrieval and display of user galleries
5. **Authentication Manager**: Handles Bluesky authentication for gallery access
6. **Settings Manager**: Controls user preferences

### Data Flow
1. Images stream in from Bluesky via WebSocket
2. Each image is processed for content warnings and added to the queue
3. Images are rendered to the DOM when they enter the viewport
4. User interactions trigger modal displays for detailed views
5. Gallery requests trigger authenticated API calls when credentials are available

## Technical Constraints & Considerations
1. **Browser Compatibility**: Must work on modern browsers (Chrome, Firefox, Safari)
2. **Performance**: Must handle continuous streaming of images without degrading performance
3. **Privacy**: Must not track users or store unnecessary data
4. **Security**: Must handle authentication securely
5. **Accessibility**: Should support keyboard navigation and screen readers where possible
