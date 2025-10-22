# PlanForge MVP

A lightweight project planning tool for visualizing initiatives, dependencies, and resource allocation with interactive timeline management.

## Project Structure

```
planforge/
├── src/                    # Application source code
│   ├── index.html         # Main application entry point
│   ├── styles.css         # Application styles
│   ├── js/                # JavaScript modules
│   │   ├── app.js         # Application entry point
│   │   ├── model.js       # Data model and business logic
│   │   ├── storage.js     # Data persistence layer
│   │   ├── timeline.js     # Timeline visualization
│   │   └── ui.js          # User interface components
│   ├── assets/            # Local assets (fonts, images, etc.)
│   │   └── fonts/         # Material Icons fonts
│   │       ├── css/       # Font CSS files (simplified)
│   │       └── woff2/     # Font files (minimal set)
│   ├── data/              # Sample data files
│   │   └── planforge-Baseline_Copy.json
│   ├── proxy-server.js    # CORS proxy server
│   └── start-server.sh    # Development server script
├── test/                  # Test files and debugging tools
│   ├── *.html             # Various test HTML files
│   ├── debug-settings.js  # Debug configuration
│   └── JIRA_test.json     # Test data
├── docs/                  # Documentation
│   ├── README.md          # Detailed documentation
│   └── wbs.md            # Work breakdown structure docs
├── package.json           # Node.js dependencies and scripts
└── node_modules/         # Dependencies (auto-generated)
```

## Quick Start

### Option 1: Local Development Server
**Run:** Use the provided start scripts to serve the application:

```bash
# Unix/Linux/macOS (starts both app server and CORS proxy)
./src/start-server.sh

# Or using npm (starts both servers)
npm run start-with-proxy
```

This resolves CORS issues while keeping all data local and secure - no external services are used.

### Option 2: Direct File Access
**Run:** Open `src/index.html` in a modern browser.

## Development

- **Source Code**: All application code is in the `/src` directory
- **Tests**: All test files are in the `/test` directory
- **Documentation**: All documentation is in the `/docs` directory
- **Dependencies**: Managed via `package.json` and installed in `node_modules/`

## Features

### **Project Management**
- **Hierarchical Structure**: Initiative → Epic → Story organization
- **Interactive Timeline**: Drag, resize, and move work items with visual feedback
- **Scenario Management**: Clone, switch, and compare different planning scenarios
- **Resource Assignment**: Assign team members to work items with role-based filtering

### **Dependency Management**
- **Visual Dependencies**: Green dashed lines with arrows showing task relationships
- **UI Controls**: Add/remove dependencies through intuitive dropdown interface
- **Visual Indicators**: Dependency icons in hierarchy tree and enhanced timeline rendering
- **Smart Validation**: Prevents circular dependencies and invalid relationships

### **Timeline Visualization**
- **Multi-level Zoom**: Year, Quarter, Month, Week, Day views with smooth transitions
- **Auto-scrolling**: Automatic timeline scrolling during drag operations
- **Color-coded Levels**: Distinct colors for Initiatives (blue), Epics (purple), Stories (green)
- **Real-time Updates**: Instant visual feedback for all changes

### **Data Management**
- **JSON Export/Import**: Full project data persistence and sharing
- **Local Storage**: Browser-based data persistence
- **Schema Validation**: Robust data integrity checks

## Technical Notes

- **Dates**: ISO format (YYYY-MM-DD) in UTC
- **Storage**: Local browser storage (no server required)
- **Performance**: Optimized for 100-200 work items
- **Browser**: Modern browsers with Canvas support
- **Dependencies**: Finish-to-Start (FS) relationships only
- **Assets**: All fonts and icons are stored locally (no external CDN dependencies)

## Architecture

- **Frontend**: Vanilla JavaScript with Canvas API
- **Data Layer**: In-memory state management with localStorage persistence
- **Rendering**: Custom timeline renderer with dependency visualization
- **UI**: Modular component-based interface

For detailed documentation, see `/docs/README.md`.
