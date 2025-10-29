window.WhatIfDeliveredStorage = (function() {
  // ============================================================================
  // WORKSPACE EXPORT (Full Save/Load) - Standardized Format
  // ============================================================================
  function serializeJSON(state){
    const now = new Date().toISOString();
    const formatVersion = '1.0';
    
    // Build standardized workspace export
    const exportData = {
      $schema: 'https://json-schema.org/draft/2020-12/schema#',
      metadata: {
        formatVersion: formatVersion,
        exportDate: now,
        exportedBy: 'WHAT IF delivered',
        applicationVersion: '1.0' // Could be read from package.json if available
      },
      workspace: {
        activeScenarioId: state.activeScenarioId,
        levelNames: state.levelNames || {
          'Initiative': 'Initiative',
          'Epic': 'Epic',
          'Story': 'Story'
        },
        projectConfig: state.projectConfig || {
          statuses: ['To Do', 'In Progress', 'Done', 'Blocked', 'On Hold'],
          priorities: ['Lowest', 'Low', 'Medium', 'High', 'Highest'],
          suggestedLabels: []
        }
      },
      scenarios: state.scenarios.map(scenario => ({
        id: scenario.id,
        name: scenario.name,
        description: scenario.description || '',
        visible: scenario.visible !== undefined ? scenario.visible : true,
        data: {
          initiatives: scenario.data.initiatives.map(init => ({
            id: init.id,
            name: init.name,
            description: init.description || '',
            level: init.level,
            size: init.size,
            start: init.start,
            end: init.end,
            length: init.length,
            parentId: init.parentId,
            scenarioId: init.scenarioId,
            isMilestone: init.isMilestone || false,
            status: init.status || 'To Do',
            completion: init.completion !== undefined ? init.completion : 0,
            priority: init.priority || 'Medium',
            assignee: init.assignee || '',
            labels: init.labels || []
          })),
          dependencies: scenario.data.dependencies.map(dep => ({
            fromId: dep.fromId,
            toId: dep.toId,
            type: dep.type || 'FS',
            lag: dep.lag || 0
          })),
          calendars: scenario.data.calendars || { holidays: [] }
        }
      }))
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // ============================================================================
  // JIRA API v3 JSON EXPORT (Single Scenario)
  // ============================================================================
  function serializeActiveScenario(state){
    const activeScenario = state.scenarios.find(s => s.id === state.activeScenarioId);
    if (!activeScenario) {
      throw new Error('No active scenario found');
    }
    
    const now = new Date().toISOString();
    const projectKey = activeScenario.name.replace(/[^A-Z0-9]/g, '').substring(0, 10).toUpperCase() || 'SCENARIO';
    
    // Map WHAT IF delivered levels to JIRA issue types
    const levelToIssueType = {
      'Initiative': 'Epic',
      'Epic': 'Story', 
      'Story': 'Task',
      'Milestone': 'Milestone'
    };
    
    // Map WHAT IF delivered sizes to JIRA priorities
    const sizeToPriority = {
      'XS': 'Lowest',
      'S': 'Low', 
      'M': 'Medium',
      'L': 'High',
      'XL': 'Highest',
      'XXL': 'Highest',
      'infinit': 'Highest'
    };
    
    // Build issue type mapping metadata
    const issueTypes = {
      'Initiative': 'Epic',
      'Epic': 'Story',
      'Story': 'Task',
      'Milestone': 'Milestone'
    };
    
    // Create a map of initiatives by ID for quick lookup
    const initiativesById = new Map();
    activeScenario.data.initiatives.forEach(init => {
      initiativesById.set(init.id, init);
    });
    
    // Build parent relationships
    const parentMap = new Map(); // child id -> parent name
    activeScenario.data.initiatives.forEach(init => {
      if (init.parentId) {
        const parent = initiativesById.get(init.parentId);
        if (parent) {
          parentMap.set(init.id, parent.name);
        }
      }
    });
    
    // Build dependency relationships
    const dependenciesMap = new Map(); // from id -> array of {target: toId, type: 'blocks'}
    activeScenario.data.dependencies.forEach(dep => {
      const from = initiativesById.get(dep.fromId);
      const to = initiativesById.get(dep.toId);
      if (from && to) {
        if (!dependenciesMap.has(dep.fromId)) {
          dependenciesMap.set(dep.fromId, []);
        }
        dependenciesMap.get(dep.fromId).push({
          target: to.name,
          type: 'blocks'
        });
      }
    });
    
    // Create JIRA issues in REST API v3 format
    const issues = activeScenario.data.initiatives.map(initiative => {
      const issue = {
        fields: {
        summary: initiative.name,
        description: initiative.description || `Work item: ${initiative.name}`,
          issuetype: {
            name: levelToIssueType[initiative.level] || 'Task'
          },
          priority: {
            name: initiative.priority || sizeToPriority[initiative.size] || 'Medium'
          },
          project: {
            key: projectKey
          },
          duedate: initiative.end,
          assignee: initiative.assignee ? { name: initiative.assignee } : null,
          labels: initiative.labels || []
        },
        status: initiative.status || 'To Do',
        completion: initiative.completion !== undefined ? initiative.completion : 0,
        relationships: {},
        whatIfDelivered: {
          id: initiative.id,
          level: initiative.level,
          size: initiative.size,
          start: initiative.start,
          end: initiative.end,
          isMilestone: initiative.isMilestone || false
        }
      };
      
      // Add parent relationship if exists
      if (parentMap.has(initiative.id)) {
        issue.relationships.parent = parentMap.get(initiative.id);
      }
      
      // Add dependencies if exist
      if (dependenciesMap.has(initiative.id)) {
        issue.relationships.dependencies = dependenciesMap.get(initiative.id);
      }
      
      return issue;
    });
    
    // Create JIRA REST API v3 compatible JSON structure
    const jiraData = {
      $schema: 'https://json-schema.org/draft/2020-12/schema#',
      metadata: {
      exportDate: now,
      exportedBy: 'WHAT IF delivered',
        version: '1.0',
        jiraProjectKey: projectKey,
        jiraProjectName: activeScenario.name
      },
      project: {
        key: projectKey,
        name: activeScenario.name,
        projectTypeKey: 'software'
      },
      issueTypes: issueTypes,
      issues: issues
    };
    
    return JSON.stringify(jiraData, null, 2);
  }

  // ============================================================================
  // CSV EXPORT (Single Scenario)
  // ============================================================================
  function serializeActiveScenarioToCSV(state){
    const activeScenario = state.scenarios.find(s => s.id === state.activeScenarioId);
    if (!activeScenario) {
      throw new Error('No active scenario found');
    }
    
    // Map WHAT IF delivered levels to JIRA issue types
    const levelToIssueType = {
      'Initiative': 'Epic',
      'Epic': 'Story', 
      'Story': 'Task',
      'Milestone': 'Milestone'
    };
    
    // Map WHAT IF delivered sizes to JIRA priorities
    const sizeToPriority = {
      'XS': 'Lowest',
      'S': 'Low', 
      'M': 'Medium',
      'L': 'High',
      'XL': 'Highest',
      'XXL': 'Highest',
      'infinit': 'Highest'
    };
    
    // CSV columns - JIRA CSV import compatible
    const columns = [
      'Summary',
      'Issue Type',
      'Priority',
      'Status',
      'Completion %',
      'Due Date',
      'Start Date',
      'Description',
      'Assignee',
      'Labels',
      'Parent',
      'Story Points'
    ];
    
    // Build parent map
    const parentMap = new Map();
    activeScenario.data.initiatives.forEach(init => {
      if (init.parentId) {
        const parent = activeScenario.data.initiatives.find(i => i.id === init.parentId);
        if (parent) {
          parentMap.set(init.id, parent.name);
        }
      }
    });
    
    // Build rows
    const rows = activeScenario.data.initiatives.map(initiative => {
      const row = {
        'Summary': escapeCSV(initiative.name),
        'Issue Type': levelToIssueType[initiative.level] || 'Task',
        'Priority': initiative.priority || sizeToPriority[initiative.size] || 'Medium',
        'Status': initiative.status || 'To Do',
        'Completion %': String(initiative.completion !== undefined ? initiative.completion : 0),
        'Due Date': initiative.end,
        'Start Date': initiative.start,
        'Description': escapeCSV(initiative.description || ''),
        'Assignee': escapeCSV(initiative.assignee || ''),
        'Labels': escapeCSV((initiative.labels || []).join(', ')),
        'Parent': escapeCSV(parentMap.get(initiative.id) || ''),
        'Story Points': String(initiative.length || 1)
      };
      return columns.map(col => row[col] || '');
    });
    
    // Build CSV string
    let csv = columns.map(escapeCSV).join(',') + '\n';
    rows.forEach(row => {
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }
  
  function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Escape quotes by doubling them, wrap in quotes if contains comma, quote, or newline
    if (str.indexOf('"') >= 0 || str.indexOf(',') >= 0 || str.indexOf('\n') >= 0) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  // ============================================================================
  // JSON IMPORT (Workspace Format + JIRA v3 Format Detection)
  // ============================================================================
  function parseJSON(text){
    const obj = JSON.parse(text);
    
    // Detect format type
    if (isWorkspaceFormat(obj)) {
      return parseWorkspaceFormat(obj);
    } else if (isJiraV3Format(obj)) {
      return parseJiraV3Format(obj);
    } else if (isLegacyFormat(obj)) {
      return parseLegacyFormat(obj);
    } else {
      throw new Error('Unknown JSON format. Expected workspace export, JIRA v3, or legacy format.');
    }
  }
  
  function isWorkspaceFormat(obj) {
    return obj && obj.metadata && obj.metadata.formatVersion && obj.workspace && Array.isArray(obj.scenarios);
  }
  
  function isJiraV3Format(obj) {
    return obj && obj.metadata && obj.metadata.jiraProjectKey && obj.project && Array.isArray(obj.issues);
  }
  
  function isLegacyFormat(obj) {
    return obj && Array.isArray(obj.scenarios) && !obj.metadata;
  }
  
  function parseWorkspaceFormat(obj) {
    // Validate workspace format
    if (!obj.scenarios || !Array.isArray(obj.scenarios)) {
      throw new Error('Invalid workspace format: scenarios array missing');
    }
    
    obj.scenarios.forEach(s => {
      if (!s.id || !s.name || !s.data) throw new Error('Invalid scenario in workspace format');
      const d = s.data;
      if (!Array.isArray(d.initiatives) || !Array.isArray(d.dependencies)) {
        throw new Error('Invalid data arrays in scenario');
      }
    });
    
    // Return in model-compatible format
    return {
      scenarios: obj.scenarios.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description || '',
        visible: s.visible !== undefined ? s.visible : true,
        data: {
          initiatives: s.data.initiatives,
          dependencies: s.data.dependencies,
          calendars: s.data.calendars || { holidays: [] }
        }
      })),
      activeScenarioId: obj.workspace.activeScenarioId,
      levelNames: obj.workspace.levelNames || null,
      projectConfig: obj.workspace.projectConfig || {
        statuses: ['To Do', 'In Progress', 'Done', 'Blocked', 'On Hold'],
        priorities: ['Lowest', 'Low', 'Medium', 'High', 'Highest'],
        suggestedLabels: []
      }
    };
  }
  
  function parseJiraV3Format(obj) {
    // Convert JIRA v3 format to workspace format
    // Import as a single "Baseline" scenario
    const baselineScenarioId = 'default';
    const baselineScenarioName = 'Baseline';
    
    // Build a map of issue names to IDs for parent relationships
    const nameToIdMap = new Map();
    
    // Map JIRA issue types to WHAT IF delivered levels
    const reverseLevelMap = {
      'Epic': 'Initiative',
      'Story': 'Epic',
      'Task': 'Story',
      'Milestone': 'Milestone'
    };
    
    // Filter and map issues to initiatives (only first 3 levels)
    const validIssueTypes = new Set(['Epic', 'Story', 'Task', 'Milestone']);
    const validIssues = obj.issues.filter(issue => {
      const issueType = issue.fields && issue.fields.issuetype && issue.fields.issuetype.name;
      return validIssueTypes.has(issueType);
    });
    
    // First pass: create all initiatives without parent relationships
    const initiatives = [];
    const addedSummaries = new Set();
    const issueParentMap = new Map(); // issue summary -> parent summary
    
    validIssues.forEach((issue, idx) => {
      const summary = issue.fields.summary;
      if (addedSummaries.has(summary)) return; // Skip duplicates
      
      const issueTypeName = issue.fields.issuetype.name;
      const level = reverseLevelMap[issueTypeName] || 'Story';
      
      // Determine if this is a milestone
      const isMilestone = issueTypeName === 'Milestone' || (issue.whatIfDelivered && issue.whatIfDelivered.isMilestone);
      
      // Get dates - check whatIfDelivered metadata first, then duedate
      let start = (issue.whatIfDelivered && issue.whatIfDelivered.start) || issue.fields.duedate;
      let end = (issue.whatIfDelivered && issue.whatIfDelivered.end) || issue.fields.duedate;
      
      // If no dates, use today
      if (!start) start = window.WhatIfDeliveredModel.today();
      if (!end) end = start;
      
      // For milestones, start and end should be the same
      if (isMilestone) {
        end = start;
      }
      
      const length = isMilestone ? 1 : Math.max(1, Math.round((new Date(end) - new Date(start)) / 86400000));
      
      // Create initiative ID
      const id = 'itm_' + Math.random().toString(36).slice(2, 8);
      
      // Store parent relationship for second pass
      if (issue.relationships && issue.relationships.parent) {
        issueParentMap.set(summary, issue.relationships.parent);
      }
      
      // Get size from original metadata or default
      const size = (issue.whatIfDelivered && issue.whatIfDelivered.size) || 'M';
      
      // Get project management fields
      const status = issue.status || 'To Do';
      const completion = issue.completion !== undefined ? issue.completion : 0;
      const priority = (issue.fields.priority && issue.fields.priority.name) || 'Medium';
      const assignee = (issue.fields.assignee && issue.fields.assignee.name) || '';
      const labels = issue.fields.labels || [];
      
      const initiative = {
        id: id,
        name: summary,
        description: issue.fields.description || '',
        level: level,
        size: size,
        start: start,
        end: end,
        length: length,
        parentId: null, // Will be resolved in second pass
        scenarioId: baselineScenarioId,
        isMilestone: isMilestone,
        status: status,
        completion: completion,
        priority: priority,
        assignee: assignee,
        labels: labels
      };
      
      initiatives.push(initiative);
      addedSummaries.add(summary);
      nameToIdMap.set(summary, id);
    });
    
    // Second pass: resolve parent relationships
    initiatives.forEach(initiative => {
      const parentSummary = issueParentMap.get(initiative.name);
      if (parentSummary) {
        const parent = initiatives.find(i => i.name === parentSummary);
        if (parent) {
          initiative.parentId = parent.id;
        }
      }
    });
    
    // Build dependencies from relationships
    const dependencies = [];
    validIssues.forEach(issue => {
      if (issue.relationships && issue.relationships.dependencies) {
        const fromSummary = issue.fields.summary;
        const fromId = nameToIdMap.get(fromSummary);
        
        if (fromId) {
          issue.relationships.dependencies.forEach(dep => {
            const toId = nameToIdMap.get(dep.target);
            if (toId && fromId !== toId) {
              // Check if dependency already exists
              if (!dependencies.some(d => d.fromId === fromId && d.toId === toId)) {
                dependencies.push({
                  fromId: fromId,
                  toId: toId,
                  type: dep.type === 'blocks' ? 'FS' : 'FS',
                  lag: 0
                });
              }
            }
          });
        }
      }
    });
    
    // Filter initiatives to only include up to 3 levels depth
    // Build hierarchy tree
    const rootItems = initiatives.filter(i => !i.parentId);
    const filteredInitiatives = [];
    const processedIds = new Set();
    
    function addItem(item, depth) {
      if (depth > 3) return; // Only import 3 levels
      if (processedIds.has(item.id)) return;
      
      // Adjust level based on depth to match hierarchy
      if (depth === 0) item.level = 'Initiative';
      else if (depth === 1) item.level = 'Epic';
      else if (depth === 2) item.level = 'Story';
      
      filteredInitiatives.push(item);
      processedIds.add(item.id);
      
      // Add children
      const children = initiatives.filter(i => i.parentId === item.id);
      children.forEach(child => addItem(child, depth + 1));
    }
    
    rootItems.forEach(root => addItem(root, 0));
    
    // Filter dependencies to only include items in filteredInitiatives
    const filteredDependencies = dependencies.filter(dep => {
      const fromExists = filteredInitiatives.some(i => i.id === dep.fromId);
      const toExists = filteredInitiatives.some(i => i.id === dep.toId);
      return fromExists && toExists;
    });
    
    // Extract unique statuses, priorities, and labels from imported issues
    const extractedStatuses = new Set();
    const extractedPriorities = new Set();
    const extractedLabels = new Set();
    
    filteredInitiatives.forEach(init => {
      if (init.status) extractedStatuses.add(init.status);
      if (init.priority) extractedPriorities.add(init.priority);
      if (init.labels && Array.isArray(init.labels)) {
        init.labels.forEach(label => {
          if (label) extractedLabels.add(label);
        });
      }
    });
    
    // Convert sets to sorted arrays
    const projectConfig = {
      statuses: Array.from(extractedStatuses).sort(),
      priorities: Array.from(extractedPriorities).sort(),
      suggestedLabels: Array.from(extractedLabels).sort()
    };
    
    // Ensure at least one status and priority if nothing was extracted
    if (projectConfig.statuses.length === 0) {
      projectConfig.statuses = ['To Do', 'In Progress', 'Done'];
    }
    if (projectConfig.priorities.length === 0) {
      projectConfig.priorities = ['Low', 'Medium', 'High'];
    }
    
    return {
      scenarios: [{
        id: baselineScenarioId,
        name: baselineScenarioName,
        description: `Imported from JIRA project: ${obj.project.name}`,
        visible: true,
        data: {
          initiatives: filteredInitiatives,
          dependencies: filteredDependencies,
          calendars: { holidays: [] }
        }
      }],
      activeScenarioId: baselineScenarioId,
      levelNames: {
        'Initiative': 'Initiative',
        'Epic': 'Epic',
        'Story': 'Story'
      },
      projectConfig: projectConfig
    };
  }
  
  function parseLegacyFormat(obj) {
    // Handle old format (backward compatibility)
    validateLegacy(obj);
    return {
      scenarios: obj.scenarios,
      activeScenarioId: obj.activeScenarioId,
      levelNames: obj.levelNames || null,
      projectConfig: null // Legacy format doesn't have projectConfig, will use defaults
    };
  }
  
  function validateLegacy(obj) {
    if (!obj || !Array.isArray(obj.scenarios)) {
      throw new Error('Invalid schema: scenarios[] missing');
    }
    obj.scenarios.forEach(s => {
      if (!s.id || !s.name || !s.data) {
        throw new Error('Invalid scenario');
      }
      const d = s.data;
      if (!Array.isArray(d.initiatives) || !Array.isArray(d.dependencies)) {
        throw new Error('Invalid data arrays');
      }
    });
  }
  
  function validate(obj) {
    // Try to validate - this is called for legacy format
    validateLegacy(obj);
  }
  
  function downloadText(text, filename, mime){
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = filename; 
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  
  return { 
    serializeJSON, 
    serializeActiveScenario, 
    serializeActiveScenarioToCSV,
    parseJSON, 
    validate, 
    downloadText 
  };
})();


