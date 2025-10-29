# Settings Documentation

## Overview

The Settings feature allows you to configure project-specific values for Status, Priority, and Label fields. These settings are workspace-wide and apply to all scenarios.

## Accessing Settings

Click the **Settings** button (⚙️ icon) in the toolbar at the top of the application.

## Configuration Options

### Status Values

Configure the available status values for your initiatives.

**Default Values:**
- To Do
- In Progress
- Done
- Blocked
- On Hold

**How to Configure:**
1. Open Settings dialog
2. In the "Status Values" section, you'll see the current list of statuses
3. To add a new status: Type the status name in the input field and click the **+** button or press Enter
4. To remove a status: Click the **×** button next to the status name

**Requirements:**
- At least one status value is required
- Status names are case-sensitive
- Duplicate status names are not allowed

### Priority Values

Configure the available priority values for your initiatives.

**Default Values:**
- Lowest
- Low
- Medium
- High
- Highest

**How to Configure:**
1. Open Settings dialog
2. In the "Priority Values" section, you'll see the current list of priorities
3. To add a new priority: Type the priority name in the input field and click the **+** button or press Enter
4. To remove a priority: Click the **×** button next to the priority name

**Requirements:**
- At least one priority value is required
- Priority names are case-sensitive
- Duplicate priority names are not allowed

### Suggested Labels

Configure label suggestions that will appear when working with initiatives.

**Default:** Empty (no default labels)

**How to Configure:**
1. Open Settings dialog
2. In the "Suggested Labels" section, you'll see the current list of suggested labels
3. To add a new label: Type the label name in the input field and click the **+** button or press Enter
4. To remove a label: Click the **×** button next to the label name

**Notes:**
- Suggested labels are optional (can be empty)
- These are suggestions only - you can still type any label you want when editing an initiative
- Label names are case-sensitive
- Common label examples: "backend", "frontend", "bug", "feature", "urgent", "Q1", "v2.0"

## Impact of Configuration Changes

### On Existing Items

When you modify status or priority values:
- Existing initiatives retain their current status/priority values
- If an initiative has a value that's not in the configured list, it will appear in the dropdown with "(not in configured list)" appended and will be disabled
- You can change the value to any configured option

### On New Items

New initiatives will only be able to select from the configured status and priority values.

## JIRA Import Behavior

When importing a JIRA v3 JSON file:
1. The application will **automatically extract** unique status, priority, and label values from all imported issues
2. Your current configuration will be **overwritten** with the extracted values
3. You'll be prompted with a confirmation dialog before the import proceeds, explaining that configuration will be overwritten

This ensures that when you import from JIRA, the application immediately reflects your JIRA project's actual values.

## Resetting to Defaults

To reset all configuration values to their defaults:
1. Open Settings dialog
2. Click the **Reset to Defaults** button at the bottom
3. Confirm the action

This will restore:
- Status values: To Do, In Progress, Done, Blocked, On Hold
- Priority values: Lowest, Low, Medium, High, Highest
- Suggested labels: Empty list

## Persistence

Your configuration settings are:
- Saved automatically when you export your workspace (Export All Scenarios)
- Restored when you import a workspace file
- Overwritten when importing JIRA v3 JSON files (with extracted values from JIRA)
- Preserved in your browser's local storage (if using the application offline)

## Best Practices

1. **Configure before creating items**: Set up your status and priority values before creating initiatives to avoid having values "not in configured list"

2. **Match your JIRA project**: If you plan to export to JIRA, configure your values to match your JIRA project's workflow

3. **Keep it simple**: Don't add too many status or priority values - it makes selection difficult

4. **Use consistent naming**: Use the same naming conventions as your team (e.g., "In Progress" vs "In-Progress" vs "InProgress")

5. **Labels for categorization**: Use labels to categorize work by team, component, release, or any other dimension that matters to your project

## Examples

### Agile Team Configuration

**Status Values:**
- Backlog
- Ready
- In Progress
- In Review
- Done

**Priority Values:**
- Critical
- High
- Medium
- Low

**Suggested Labels:**
- sprint-1, sprint-2, sprint-3
- backend, frontend, mobile
- bug, feature, improvement

### Waterfall Project Configuration

**Status Values:**
- Planned
- Requirements
- Design
- Development
- Testing
- Deployed

**Priority Values:**
- P0 - Critical
- P1 - High
- P2 - Medium
- P3 - Low

**Suggested Labels:**
- phase-1, phase-2, phase-3
- requirements, design, development, testing

## Troubleshooting

### "At least one status/priority value is required" Error

This error appears when you try to remove the last status or priority value. At least one value must be configured at all times.

**Solution:** Add a new value before removing the last one.

### Values Not Appearing in Dropdowns

If configured values aren't showing up:
1. Close and reopen the details panel
2. Refresh the page
3. Check that you clicked the **+** button or pressed Enter after typing the value

### JIRA Import Didn't Update Configuration

If configuration wasn't updated after JIRA import:
1. Verify the imported file is actually JIRA v3 format
2. Check that the JIRA issues have status/priority values set
3. The import may have failed - check for error messages

## Related Documentation

- [Project Management Fields](PROJECT_MANAGEMENT_FIELDS.md) - Details about status, completion, priority, assignee, and labels fields
- [JSON Export Standardization](../README.md) - Information about import/export formats

