# PlanForge MVP

A lightweight project planning tool for visualizing initiatives, dependencies, and resource allocation with interactive timeline management and JIRA integration.

## Quick Start

### Option 1: Local Development Server with CORS Proxy (Recommended for JIRA Integration)
**Run:** Use the provided start scripts to serve the application with a local CORS proxy:

```bash
# Unix/Linux/macOS (starts both app server and CORS proxy)
./start-server.sh

# Windows (starts both app server and CORS proxy)
start-server.bat

# Or using npm (starts both servers)
npm run start-with-proxy
```

This resolves CORS issues while keeping all data local and secure - no external services are used.

### Option 2: Direct File Access
**Run:** Open `index.html` in a modern browser. Note: JIRA integration will not work due to CORS restrictions.

## Features

### **Project Management**
- **Hierarchical Structure**: Initiative → Epic → Story organization
- **Interactive Timeline**: Drag, resize, and move work items with visual feedback
- **Scenario Management**: Clone, switch, and compare different planning scenarios
- **Resource Assignment**: Assign team members to work items with role-based filtering

### **JIRA Integration** 🆕
- **Direct JIRA Connection**: Connect using Atlassian API token
- **Fuzzy Search**: Find JIRA issues by ID and title
- **Automatic Population**: Populate PlanForge elements from JIRA data
- **Bidirectional Sync**: Sync changes between PlanForge and JIRA
- **Bulk Operations**: Sync multiple elements at once
- **Visual Indicators**: Link status and sync timestamps

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
- **JIRA Integration**: Export scenarios for JIRA import
- **Local Storage**: Browser-based data persistence
- **Schema Validation**: Robust data integrity checks

## Data Schema

```json
{
  "scenarios": [
    {
      "id": "scenario_id",
      "name": "Scenario Name",
      "description": "Optional description",
      "visible": true,
      "data": {
        "initiatives": [
          {
            "id": "item_id",
            "name": "Item Name",
            "start": "2024-01-01",
            "end": "2024-01-15",
            "parentId": "parent_id",
            "level": "Initiative|Epic|Story",
            "size": "XS|S|M|L|XL|XXL|infinit",
            "description": "Optional description",
            "resourceIds": ["resource_id"],
            "scenarioId": "scenario_id",
            "length": 14
          }
        ],
        "dependencies": [
          {
            "fromId": "source_item_id",
            "toId": "target_item_id",
            "type": "FS"
          }
        ],
        "resources": [
          {
            "id": "resource_id",
            "name": "Resource Name",
            "role": "Engineer|QA|PM",
            "availability": 1.0,
            "description": "Optional description"
          }
        ],
        "calendars": {
          "holidays": []
        }
      }
    }
  ],
  "activeScenarioId": "scenario_id",
  "selection": null
}
```

## Usage Guide

### JIRA Integration Setup
1. **Start Local Server with Proxy**: Use `./start-server.sh` or `npm run start-with-proxy` to serve the application with CORS proxy
2. **Configure JIRA**: Click "JIRA Settings" button in the toolbar
3. **Enter Credentials**:
   - JIRA Domain: Your Atlassian domain (e.g., `yourcompany.atlassian.net`)
   - Email: Your Atlassian account email
   - API Token: Generate from [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
4. **Test Connection**: Click "Test Connection" to verify settings
5. **Save Settings**: Click "Save Settings" to store configuration

**Security Note**: All JIRA API calls are proxied through a local server (localhost:3001) - no data is sent to external services.

### Linking PlanForge Elements to JIRA
1. **Select Element**: Click any Initiative, Epic, or Story in the hierarchy
2. **Link to JIRA**: Click "Link to JIRA" button in the Details panel
3. **Search Issues**: Use the fuzzy search to find JIRA issues by ID or title
4. **Select Issue**: Click on a search result to link and populate the element
5. **Sync Changes**: Use "Sync to JIRA" or "Sync from JIRA" buttons as needed

### Creating Dependencies
1. Select any initiative in the hierarchy tree or timeline
2. Scroll to "Dependencies" section in the Details panel
3. Choose from dropdown and click "Add Dependency"
4. Remove dependencies using the "×" button

### Timeline Navigation
- **Zoom**: Use slider or preset buttons (Year/Quarter/Month/Day)
- **Pan**: Drag timeline or use auto-scroll during item movement
- **Resize**: Drag handles on work item edges
- **Move**: Drag work items to new dates

### Scenario Management
- **Clone**: Create copies of scenarios for "what-if" planning
- **Switch**: Toggle between different scenarios
- **Rename**: Update scenario names and descriptions

## Technical Notes

- **Dates**: ISO format (YYYY-MM-DD) in UTC
- **Storage**: Local browser storage (no server required)
- **Performance**: Optimized for 100-200 work items
- **Browser**: Modern browsers with Canvas support
- **Dependencies**: Finish-to-Start (FS) relationships only

## Architecture

- **Frontend**: Vanilla JavaScript with Canvas API
- **Data Layer**: In-memory state management with localStorage persistence
- **Rendering**: Custom timeline renderer with dependency visualization
- **UI**: Modular component-based interface

