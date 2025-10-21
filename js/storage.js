window.PlanForgeStorage = (function() {
  function serializeJSON(state){
    return JSON.stringify({ scenarios: state.scenarios, activeScenarioId: state.activeScenarioId }, null, 2);
  }
  
  function serializeActiveScenario(state){
    const activeScenario = state.scenarios.find(s => s.id === state.activeScenarioId);
    if (!activeScenario) {
      throw new Error('No active scenario found');
    }
    
    // Create a JIRA-compatible format
    const projectKey = activeScenario.name.replace(/[^A-Z0-9]/g, '').substring(0, 10) || 'SCENARIO';
    const now = new Date().toISOString();
    
    // Map PlanForge levels to JIRA issue types
    const levelToIssueType = {
      'Initiative': 'Epic',
      'Epic': 'Story', 
      'Story': 'Task'
    };
    
    // Map PlanForge sizes to JIRA priorities
    const sizeToPriority = {
      'XS': 'Lowest',
      'S': 'Low', 
      'M': 'Medium',
      'L': 'High',
      'XL': 'Highest',
      'XXL': 'Highest',
      'infinit': 'Highest'
    };
    
    // Create JIRA issues from initiatives
    const issues = activeScenario.data.initiatives.map(initiative => {
      const issue = {
        summary: initiative.name,
        description: initiative.description || `Work item: ${initiative.name}`,
        issueType: levelToIssueType[initiative.level] || 'Task',
        priority: sizeToPriority[initiative.size] || 'Medium',
        status: 'To Do',
        reporter: 'admin', // Default reporter - should be configurable
        created: now,
        updated: now,
        customFieldValues: [
          {
            fieldName: 'Start Date',
            fieldType: 'com.atlassian.jira.plugin.system.customfieldtypes:datepicker',
            value: initiative.start
          },
          {
            fieldName: 'Due Date', 
            fieldType: 'com.atlassian.jira.plugin.system.customfieldtypes:datepicker',
            value: initiative.end
          },
          {
            fieldName: 'Story Points',
            fieldType: 'com.pyxis.greenhopper.jira:gh-story-points',
            value: initiative.length || 1
          }
        ]
      };
      
      // Add parent link for hierarchical items
      if (initiative.parentId) {
        const parentInitiative = activeScenario.data.initiatives.find(i => i.id === initiative.parentId);
        if (parentInitiative) {
          issue.customFieldValues.push({
            fieldName: 'Parent Link',
            fieldType: 'com.atlassian.jira.plugin.system.customfieldtypes:select',
            value: parentInitiative.name
          });
        }
      }
      
      return issue;
    });
    
    // Create JIRA-compatible JSON structure
    const jiraData = {
      projects: [
        {
          name: activeScenario.name,
          key: projectKey,
          type: 'software',
          issues: issues
        }
      ],
      exportDate: now,
      exportedBy: 'PlanForge',
      version: '1.0'
    };
    
    return JSON.stringify(jiraData, null, 2);
  }
  function parseJSON(text){
    const obj = JSON.parse(text);
    validate(obj);
    return obj;
  }
  function validate(obj){
    if (!obj || !Array.isArray(obj.scenarios)) throw new Error('Invalid schema: scenarios[] missing');
    obj.scenarios.forEach(s => {
      if (!s.id || !s.name || !s.data) throw new Error('Invalid scenario');
      const d = s.data;
      if (!Array.isArray(d.initiatives) || !Array.isArray(d.dependencies)) throw new Error('Invalid data arrays');
    });
  }
  function downloadText(text, filename, mime){
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 0);
  }
  return { serializeJSON, serializeActiveScenario, parseJSON, validate, downloadText };
})();


