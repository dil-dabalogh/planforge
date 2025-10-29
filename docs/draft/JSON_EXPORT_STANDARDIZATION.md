# JSON Export Standardization Proposal

## Overview

This document proposes standardized JSON formats for two export scenarios:
1. **Single Scenario Export (JIRA Import)** - Export one scenario for easy import into JIRA
2. **Full Workspace Export (Save/Load)** - Export all scenarios to save and restore the entire workspace

## 1. Single Scenario Export (JIRA Import)

### Current State
The current implementation (`serializeActiveScenario`) creates a custom JIRA format. However, JIRA's actual bulk import capabilities work better with CSV files or JSON that matches JIRA's REST API format for issue creation.

### Recommended Approach: JIRA REST API Format

JIRA's REST API v3 uses a specific JSON format for bulk issue creation. This format can be used directly with JIRA's API or imported via tools like JIRA's CSV import with field mapping.

#### Proposed Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "WHAT IF delivered - JIRA Single Scenario Export",
  "description": "JSON format for exporting a single scenario to JIRA import format",
  "type": "object",
  "properties": {
    "metadata": {
      "type": "object",
      "properties": {
        "exportDate": { "type": "string", "format": "date-time" },
        "exportedBy": { "type": "string", "default": "WHAT IF delivered" },
        "version": { "type": "string", "default": "1.0" },
        "jiraProjectKey": { "type": "string", "description": "Target JIRA project key" },
        "jiraProjectName": { "type": "string", "description": "Target JIRA project name" }
      },
      "required": ["exportDate", "jiraProjectKey", "jiraProjectName"]
    },
    "project": {
      "type": "object",
      "properties": {
        "key": { "type": "string" },
        "name": { "type": "string" },
        "projectTypeKey": { "type": "string", "default": "software" }
      },
      "required": ["key", "name"]
    },
    "issueTypes": {
      "type": "object",
      "description": "Issue type mappings from WHAT IF delivered levels to JIRA issue types",
      "properties": {
        "Initiative": { "type": "string", "default": "Epic" },
        "Epic": { "type": "string", "default": "Story" },
        "Story": { "type": "string", "default": "Task" },
        "Milestone": { "type": "string", "default": "Milestone" }
      }
    },
    "issues": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "fields": {
            "type": "object",
            "properties": {
              "summary": { "type": "string" },
              "description": { "type": "string" },
              "issuetype": {
                "type": "object",
                "properties": {
                  "name": { "type": "string" }
                },
                "required": ["name"]
              },
              "priority": {
                "type": "object",
                "properties": {
                  "name": { "type": "string" }
                }
              },
              "project": {
                "type": "object",
                "properties": {
                  "key": { "type": "string" }
                }
              },
              "customfield_10020": {
                "type": "string",
                "description": "Sprint field (if using JIRA Software)"
              },
              "duedate": { "type": "string", "format": "date" },
              "customFields": {
                "type": "object",
                "description": "Additional custom fields as key-value pairs"
              }
            },
            "required": ["summary", "issuetype", "project"]
          },
          "relationships": {
            "type": "object",
            "properties": {
              "parent": { "type": "string", "description": "Parent issue key or summary" },
              "dependencies": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "target": { "type": "string" },
                    "type": { "type": "string", "enum": ["blocks", "relates"] }
                  }
                }
              }
            }
          },
          "whatIfDelivered": {
            "type": "object",
            "description": "Original WHAT IF delivered metadata preserved for round-trip",
            "properties": {
              "id": { "type": "string" },
              "level": { "type": "string" },
              "size": { "type": "string" },
              "start": { "type": "string", "format": "date" },
              "end": { "type": "string", "format": "date" },
              "isMilestone": { "type": "boolean" }
            }
          }
        }
      }
    }
  },
  "required": ["metadata", "project", "issues"]
}
```

#### Alternative: CSV-Compatible Format

For maximum JIRA compatibility, we could also generate a CSV-friendly JSON structure that can be easily converted:

```json
{
  "metadata": {
    "format": "csv-compatible",
    "exportDate": "2025-01-15T10:00:00Z"
  },
  "columns": [
    "Summary", "Issue Type", "Priority", "Due Date", 
    "Start Date", "Description", "Parent", "Story Points"
  ],
  "rows": [
    {
      "Summary": "Initiative A",
      "Issue Type": "Epic",
      "Priority": "High",
      "Due Date": "2025-06-30",
      "Start Date": "2025-01-15",
      "Description": "...",
      "Parent": "",
      "Story Points": "167"
    }
  ]
}
```

**Recommendation**: Use the JIRA REST API format as the primary format, with an option to export as CSV-compatible JSON for users who prefer CSV import.

## 2. Full Workspace Export (Save/Load)

### Current State
The current `serializeJSON` function exports the internal state format. This works well for round-trip loading but doesn't follow a published standard.

### Recommended Approach: Hybrid Format

We should create a format that:
1. Preserves all workspace data (all scenarios, settings, etc.)
2. Can optionally reference or align with existing standards
3. Includes metadata for versioning and migration

#### Proposed Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "WHAT IF delivered - Full Workspace Export",
  "description": "JSON format for exporting and importing entire workspace state",
  "type": "object",
  "properties": {
    "metadata": {
      "type": "object",
      "properties": {
        "formatVersion": { "type": "string", "default": "1.0" },
        "exportDate": { "type": "string", "format": "date-time" },
        "exportedBy": { "type": "string", "default": "WHAT IF delivered" },
        "applicationVersion": { "type": "string" },
        "workspaceName": { "type": "string" },
        "workspaceId": { "type": "string" }
      },
      "required": ["formatVersion", "exportDate"]
    },
    "workspace": {
      "type": "object",
      "properties": {
        "activeScenarioId": { "type": "string" },
        "levelNames": {
          "type": "object",
          "description": "Custom names for hierarchy levels",
          "additionalProperties": { "type": "string" }
        },
        "settings": {
          "type": "object",
          "description": "Application settings and preferences",
          "properties": {
            "timeline": {
              "type": "object",
              "properties": {
                "start": { "type": "string", "format": "date" },
                "end": { "type": "string", "format": "date" },
                "zoomLevel": { "type": "integer" }
              }
            }
          }
        }
      },
      "required": ["activeScenarioId"]
    },
    "scenarios": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "description": { "type": "string" },
          "visible": { "type": "boolean" },
          "created": { "type": "string", "format": "date-time" },
          "updated": { "type": "string", "format": "date-time" },
          "data": {
            "type": "object",
            "properties": {
              "initiatives": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "id": { "type": "string" },
                    "name": { "type": "string" },
                    "description": { "type": "string" },
                    "level": { 
                      "type": "string", 
                      "enum": ["Initiative", "Epic", "Story"]
                    },
                    "size": {
                      "type": "string",
                      "enum": ["XS", "S", "M", "L", "XL", "XXL", "infinit"]
                    },
                    "start": { "type": "string", "format": "date" },
                    "end": { "type": "string", "format": "date" },
                    "length": { "type": "integer", "description": "Duration in days" },
                    "parentId": { "type": ["string", "null"] },
                    "scenarioId": { "type": "string" },
                    "isMilestone": { "type": "boolean" }
                  },
                  "required": ["id", "name", "level", "start", "end", "scenarioId"]
                }
              },
              "dependencies": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "fromId": { "type": "string" },
                    "toId": { "type": "string" },
                    "type": { 
                      "type": "string", 
                      "enum": ["FS", "SS", "FF", "SF"],
                      "default": "FS",
                      "description": "Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish"
                    },
                    "lag": { 
                      "type": "integer", 
                      "default": 0,
                      "description": "Lag in days"
                    }
                  },
                  "required": ["fromId", "toId"]
                }
              },
              "calendars": {
                "type": "object",
                "properties": {
                  "holidays": {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "format": "date"
                    }
                  },
                  "workingDays": {
                    "type": "array",
                    "items": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 6,
                      "description": "0=Sunday, 1=Monday, etc."
                    }
                  }
                }
              }
            },
            "required": ["initiatives", "dependencies", "calendars"]
          }
        },
        "required": ["id", "name", "data"]
      }
    }
  },
  "required": ["metadata", "workspace", "scenarios"]
}
```

### Alignment with Existing Standards

We could optionally reference or align with:

1. **JSON Gantt Chart Schema** - Similar to what's mentioned in `FEASIBILITY_STUDY.md`. However, that schema is more focused on resource management and assignments, while our format focuses on scenarios and hierarchy.

2. **Microsoft Project XML (MPX/MPP)** - Well-established but XML-based, not JSON.

3. **iCalendar (RFC 5545)** - Event-based, not well-suited for project management hierarchies.

**Recommendation**: Create a custom, well-documented schema optimized for WHAT IF delivered's use case, with clear versioning to enable future migrations.

## Implementation Strategy

### Phase 1: Enhance Existing Functions
1. Update `serializeActiveScenario` to use JIRA REST API format
2. Enhance `serializeJSON` to include metadata and follow the proposed workspace schema
3. Add JSON Schema validation files

### Phase 2: Add Format Options
1. Add CSV-compatible export option for JIRA
2. Add format version checking in import functions
3. Add migration logic for older format versions

### Phase 3: Documentation & Validation
1. Create JSON Schema files for validation
2. Add schema references (`$schema` URIs) to exported JSON
3. Update documentation with examples

## Migration Path

For backward compatibility:
1. Import functions should accept both old and new formats
2. Auto-detect format version and migrate if needed
3. Preserve any additional metadata that might be in old exports

## Benefits

1. **JIRA Integration**: Standardized format makes JIRA import reliable and well-documented
2. **Interoperability**: Other tools could potentially import our format
3. **Version Control**: Versioned formats enable safe migrations and upgrades
4. **Validation**: JSON Schema enables automatic validation of imported files
5. **Documentation**: Self-documenting with schema references

## Next Steps

1. Review and approve proposed schemas
2. Implement enhanced serialization functions
3. Create JSON Schema validation files
4. Update import functions for backward compatibility
5. Test with real JIRA instances (if possible) or JIRA API documentation
6. Update user documentation

