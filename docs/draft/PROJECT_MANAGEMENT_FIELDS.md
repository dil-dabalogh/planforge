# Project Management Fields Implementation

## Overview

This document describes the project management fields that have been added to WHAT IF delivered to enhance JIRA compatibility and provide advanced project management capabilities.

## New Fields

### 1. Status

**Type:** Dropdown (configurable values)  
**Default Value:** "To Do"  
**Location:** Details Panel > Project Management section

**Description:**  
Indicates the current state of an initiative in the workflow. Status values are configurable via Settings.

**Default Options:**
- To Do
- In Progress
- Done
- Blocked
- On Hold

**Usage:**
- Select from configured status values in the dropdown
- Status is stored with each initiative
- Exported to JIRA JSON as the `status` field
- Exported to CSV as the "Status" column

**Configuration:**  
Status values can be customized in Settings. See [Settings Documentation](SETTINGS.md) for details.

---

### 2. Completion

**Type:** Dual input (slider + numeric)  
**Range:** 0-100%  
**Default Value:** 0  
**Location:** Details Panel > Project Management section

**Description:**  
Indicates the percentage of work completed for an initiative. Provides both a visual slider and numeric input for precise control.

**Usage:**
- Drag the slider or type a number (0-100)
- Both inputs are synchronized
- Values outside 0-100 are automatically clamped
- Stored as an integer percentage
- Exported to JIRA JSON as the `completion` field
- Exported to CSV as the "Completion %" column

**Visual Feedback:**  
The slider provides immediate visual feedback of completion status.

---

### 3. Priority

**Type:** Dropdown (configurable values)  
**Default Value:** "Medium"  
**Location:** Details Panel > Project Management section

**Description:**  
Indicates the relative importance or urgency of an initiative. Priority values are configurable via Settings.

**Default Options:**
- Lowest
- Low
- Medium
- High
- Highest

**Usage:**
- Select from configured priority values in the dropdown
- Priority is stored with each initiative
- Exported to JIRA JSON as `fields.priority.name`
- Exported to CSV as the "Priority" column
- Maps to JIRA's native priority field

**Configuration:**  
Priority values can be customized in Settings. See [Settings Documentation](SETTINGS.md) for details.

---

### 4. Assignee

**Type:** Text input  
**Default Value:** Empty string  
**Location:** Details Panel > Project Management section

**Description:**  
Identifies the person or team responsible for an initiative.

**Usage:**
- Free-form text input
- Can be a person's name, username, or team name
- Exported to JIRA JSON as `fields.assignee.name`
- Exported to CSV as the "Assignee" column
- Supports any naming convention your team uses

**Best Practices:**
- Use consistent naming (e.g., always use "John Doe" not "J. Doe" or "jdoe")
- Consider using email addresses or usernames for JIRA compatibility
- For team assignments, use team names (e.g., "Backend Team")

---

### 5. Labels

**Type:** Text input (comma-separated tags)  
**Default Value:** Empty array  
**Location:** Details Panel > Project Management section

**Description:**  
Provides flexible categorization through free-form tags. Multiple labels can be assigned to each initiative.

**Usage:**
- Enter labels separated by commas
- Example: `backend, urgent, v2.0`
- Labels are automatically trimmed and empty labels are removed
- Stored as an array of strings
- Exported to JIRA JSON as `fields.labels[]`
- Exported to CSV as comma-separated text in the "Labels" column

**Suggested Labels:**  
You can configure suggested labels in Settings to speed up data entry. See [Settings Documentation](SETTINGS.md) for details.

**Common Label Patterns:**
- **Component:** backend, frontend, mobile, api
- **Type:** bug, feature, improvement, task
- **Release:** v1.0, v2.0, Q1, Q2
- **Team:** team-alpha, team-beta
- **Sprint:** sprint-1, sprint-2
- **Status qualifiers:** blocked, urgent, needs-review

---

## Data Model

### Initiative Object Structure

Each initiative now includes these additional fields:

```javascript
{
  id: "itm_abc123",
  name: "Feature Implementation",
  // ... existing fields ...
  
  // New project management fields
  status: "In Progress",        // string
  completion: 50,                // number (0-100)
  priority: "High",              // string
  assignee: "John Doe",          // string
  labels: ["backend", "urgent"]  // array of strings
}
```

### Workspace State

The application state now includes project configuration:

```javascript
{
  scenarios: [...],
  activeScenarioId: "...",
  levelNames: {...},
  
  // New project configuration
  projectConfig: {
    statuses: ["To Do", "In Progress", "Done", "Blocked", "On Hold"],
    priorities: ["Lowest", "Low", "Medium", "High", "Highest"],
    suggestedLabels: ["backend", "frontend", "bug", "feature"]
  }
}
```

---

## Export Formats

### Workspace JSON Export

All fields are included in the workspace export:

```json
{
  "metadata": {...},
  "workspace": {
    "activeScenarioId": "...",
    "levelNames": {...},
    "projectConfig": {
      "statuses": ["To Do", "In Progress", "Done"],
      "priorities": ["Low", "Medium", "High"],
      "suggestedLabels": ["backend", "frontend"]
    }
  },
  "scenarios": [
    {
      "id": "...",
      "name": "...",
      "data": {
        "initiatives": [
          {
            "id": "...",
            "name": "...",
            "status": "In Progress",
            "completion": 50,
            "priority": "High",
            "assignee": "John Doe",
            "labels": ["backend", "urgent"]
          }
        ]
      }
    }
  ]
}
```

### JIRA v3 JSON Export

Fields are mapped to JIRA's native fields:

```json
{
  "issues": [
    {
      "fields": {
        "summary": "Feature Implementation",
        "priority": {
          "name": "High"
        },
        "assignee": {
          "name": "John Doe"
        },
        "labels": ["backend", "urgent"]
      },
      "status": "In Progress",
      "completion": 50
    }
  ]
}
```

### CSV Export

All fields are included as columns:

```csv
Summary,Issue Type,Priority,Status,Completion %,Due Date,Start Date,Description,Assignee,Labels,Parent,Story Points
Feature Implementation,Story,High,In Progress,50,2025-11-15,2025-11-01,"Implement new feature",John Doe,"backend, urgent",Epic Name,8
```

---

## Import Behavior

### Workspace JSON Import

- All fields are restored exactly as exported
- `projectConfig` is loaded and overwrites current configuration
- Maintains full fidelity for round-trip exports/imports

### JIRA v3 JSON Import

When importing JIRA JSON:

1. **Field Mapping:**
   - `status` → `initiative.status`
   - `completion` → `initiative.completion`
   - `fields.priority.name` → `initiative.priority`
   - `fields.assignee.name` → `initiative.assignee`
   - `fields.labels[]` → `initiative.labels[]`

2. **Configuration Extraction:**
   - All unique status values are extracted from imported issues
   - All unique priority values are extracted from imported issues
   - All labels are collected and deduplicated
   - Extracted values **overwrite** current `projectConfig`
   - User is prompted with confirmation before overwrite

3. **Default Values:**
   - Missing status defaults to "To Do"
   - Missing completion defaults to 0
   - Missing priority defaults to "Medium"
   - Missing assignee defaults to empty string
   - Missing labels defaults to empty array

### Legacy Format Import

- Legacy formats without these fields will use default values
- `projectConfig` will be initialized with defaults if missing

---

## UI Integration

### Details Panel Layout

The Project Management section is displayed in the details panel when an initiative is selected:

```
┌─ Project Management ──────────────────┐
│                                        │
│  Status: [Dropdown: In Progress    ▼] │
│  Priority: [Dropdown: High         ▼] │
│                                        │
│  Completion:                           │
│  [████████░░░░░░] 50 [number input]    │
│                                        │
│  Assignee: [John Doe              ]   │
│                                        │
│  Labels: [backend, urgent         ]   │
│                                        │
└────────────────────────────────────────┘
```

### Dynamic Dropdown Population

Status and Priority dropdowns are populated from `state.projectConfig`:

- Dropdowns reflect current configuration
- If an item has a value not in the configured list, it appears as disabled option with "(not in configured list)" suffix
- Users can change to any configured value

---

## Settings Integration

All configurable values are managed through the Settings dialog:

1. **Access:** Click Settings button (⚙️) in toolbar
2. **Configure:** Add/remove status, priority, and label values
3. **Reset:** Reset to default values with one click
4. **Persist:** Configuration is saved with workspace exports

See [Settings Documentation](SETTINGS.md) for full details.

---

## Impact on Application Logic

### Current Scope

As of initial implementation, these fields are:
- **Stored** with each initiative
- **Displayed** in the UI for viewing and editing
- **Exported** to all export formats (JSON, JIRA, CSV)
- **Imported** from all import formats

These fields do **NOT** currently affect:
- Timeline rendering
- Dependency calculations
- Scenario comparisons
- Gantt chart display

### Future Enhancements

Potential future uses for these fields:

1. **Filtering & Search:**
   - Filter timeline by status (e.g., show only "In Progress" items)
   - Filter by priority, assignee, or labels
   - Search by label

2. **Visual Indicators:**
   - Color-code timeline bars by status or priority
   - Show completion percentage on timeline bars
   - Display assignee avatars on timeline

3. **Reporting:**
   - Status distribution charts
   - Completion summaries by status
   - Workload by assignee
   - Progress tracking over time

4. **Workflow Automation:**
   - Auto-advance status based on dates
   - Validation rules (e.g., can't mark "Done" with completion < 100%)
   - Status-based dependency rules

---

## API Reference

### Model Functions

#### `addInitiative(state, options)`

Creates a new initiative with project management fields.

**New Parameters:**
- `status` (string, default: "To Do"): Initial status
- `completion` (number, default: 0): Initial completion percentage (0-100)
- `priority` (string, default: "Medium"): Initial priority
- `assignee` (string, default: ""): Initial assignee
- `labels` (array, default: []): Initial labels

**Example:**
```javascript
addInitiative(state, {
  name: "Feature Implementation",
  start: "2025-11-01",
  end: "2025-11-15",
  status: "In Progress",
  completion: 50,
  priority: "High",
  assignee: "John Doe",
  labels: ["backend", "urgent"]
});
```

#### `updateProjectConfig(state, config)`

Updates project configuration.

**Parameters:**
- `statuses` (array, optional): New status values
- `priorities` (array, optional): New priority values
- `suggestedLabels` (array, optional): New suggested labels

**Validation:**
- At least one status required (defaults to ["To Do"] if empty)
- At least one priority required (defaults to ["Medium"] if empty)
- Labels can be empty

**Example:**
```javascript
updateProjectConfig(state, {
  statuses: ["Todo", "Doing", "Done"],
  priorities: ["Low", "High"],
  suggestedLabels: ["v1", "v2"]
});
```

#### `resetProjectConfig(state)`

Resets project configuration to default values.

---

## Testing Checklist

- [x] Status dropdown populated from projectConfig
- [x] Priority dropdown populated from projectConfig
- [x] Completion slider syncs with number input
- [x] Values outside 0-100 are clamped
- [x] Assignee text input works
- [x] Labels input accepts comma-separated values
- [x] Settings dialog opens and displays current configuration
- [x] Adding status/priority/label works
- [x] Removing status/priority/label works
- [x] Cannot remove last status/priority (validation)
- [x] Reset to defaults works
- [x] Workspace export includes projectConfig
- [x] Workspace import loads projectConfig
- [x] JIRA export includes all fields correctly mapped
- [x] JIRA import extracts configuration values
- [x] JIRA import confirmation dialog mentions configuration overwrite
- [x] CSV export includes all fields
- [x] Legacy import handles missing fields gracefully
- [x] Items with non-configured values show disabled option
- [x] No linter errors
- [x] Changes trigger UI refresh

---

## Migration Notes

### Upgrading from Previous Versions

Existing initiatives will automatically receive default values:
- `status`: "To Do"
- `completion`: 0
- `priority`: "Medium"
- `assignee`: ""
- `labels`: []

No manual migration is required.

### Data Compatibility

- **Forward compatible:** Old versions can't read new fields (ignored)
- **Backward compatible:** New version reads old data (adds defaults)
- **Round-trip safe:** Export and import preserve all data

---

## Troubleshooting

### Fields Not Saving

**Symptoms:** Changes to status/priority/etc. don't persist

**Solutions:**
1. Check browser console for errors
2. Verify `pf-refresh` event is firing
3. Ensure `renderHierarchy()` is called after changes
4. Check that state object has `projectConfig` property

### Dropdowns Empty

**Symptoms:** Status or priority dropdowns have no options

**Solutions:**
1. Verify `state.projectConfig` exists and is properly initialized
2. Check Settings dialog to confirm values are configured
3. Try resetting to defaults in Settings
4. Check browser console for initialization errors

### Import Doesn't Update Configuration

**Symptoms:** JIRA import doesn't update status/priority values

**Solutions:**
1. Verify the imported file is actually JIRA v3 format
2. Check that issues have status/priority values set
3. Look for error messages in import dialog
4. Manually check Settings after import

---

## Related Documentation

- [Settings Documentation](SETTINGS.md) - How to configure status, priority, and label values
- [CSV Export](../README.md#csv-export) - CSV format and JIRA import instructions
- [JIRA Integration](../README.md#jira-integration) - JIRA v3 JSON format details
