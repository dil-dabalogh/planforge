window.PlanForgeJIRA = (function() {
  let currentSettings = null;

  function initialize(settings) {
    currentSettings = settings;
  }

  function getAuthHeaders() {
    if (!currentSettings || !currentSettings.email || !currentSettings.apiToken) {
      throw new Error('JIRA settings not configured');
    }
    
    const credentials = btoa(`${currentSettings.email}:${currentSettings.apiToken}`);
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  function getApiUrl(endpoint) {
    if (!currentSettings || !currentSettings.jiraDomain) {
      throw new Error('JIRA domain not configured');
    }
    
    const baseUrl = window.PlanForgeSettings.getJiraBaseUrl(currentSettings.jiraDomain);
    return `${baseUrl}/rest/api/3${endpoint}`;
  }

  function isCorsBlocked() {
    return window.location.protocol === 'file:' || 
           window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname === '';
  }

  async function makeJiraRequest(url, options = {}) {
    const isLocal = isCorsBlocked();
    
    if (isLocal) {
      // For local development, we'll use a different approach
      // Try to make the request and catch CORS errors
      try {
        const response = await fetch(url, options);
        return { response, isProxy: false };
      } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('CORS')) {
          // CORS blocked - provide helpful error message
          throw new Error('CORS Error: JIRA API calls are blocked from local files. Please serve the application from a web server (e.g., using a local development server like Live Server, or deploy to a web hosting service).');
        }
        throw error;
      }
    } else {
      // Normal request for deployed applications
      const response = await fetch(url, options);
      return { response, isProxy: false };
    }
  }

  async function testConnection() {
    try {
      const url = getApiUrl('/myself');
      const { response } = await makeJiraRequest(url, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please check your email and API token.');
        } else if (response.status === 403) {
          throw new Error('Access forbidden. Please check your JIRA permissions.');
        } else if (response.status === 404) {
          throw new Error('JIRA domain not found. Please check your domain URL.');
        } else {
          throw new Error(`Connection failed: ${response.status} ${response.statusText}`);
        }
      }

      const user = await response.json();
      return {
        success: true,
        user: user,
        message: `Connected as ${user.displayName} (${user.emailAddress})`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async function searchIssues(query, issueType = null, maxResults = 50) {
    try {
      let jql = `text ~ "${query}"`;
      
      if (issueType) {
        jql += ` AND issuetype = "${issueType}"`;
      }
      
      jql += ' ORDER BY updated DESC';
      
      const url = getApiUrl(`/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=id,key,summary,status,assignee,created,updated,issuetype`);
      
      const { response } = await makeJiraRequest(url, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        issues: data.issues.map(issue => ({
          id: issue.id,
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status.name,
          assignee: issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned',
          created: issue.fields.created,
          updated: issue.fields.updated,
          issueType: issue.fields.issuetype.name
        })),
        total: data.total
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async function getIssue(issueKey) {
    try {
      const url = getApiUrl(`/issue/${issueKey}?fields=id,key,summary,description,status,assignee,created,updated,issuetype,duedate,priority`);
      
      const { response } = await makeJiraRequest(url, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get issue: ${response.status} ${response.statusText}`);
      }

      const issue = await response.json();
      
      return {
        success: true,
        issue: {
          id: issue.id,
          key: issue.key,
          summary: issue.fields.summary,
          description: issue.fields.description || '',
          status: issue.fields.status.name,
          assignee: issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned',
          created: issue.fields.created,
          updated: issue.fields.updated,
          issueType: issue.fields.issuetype.name,
          dueDate: issue.fields.duedate,
          priority: issue.fields.priority ? issue.fields.priority.name : 'None'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async function updateIssue(issueKey, fields) {
    try {
      const url = getApiUrl(`/issue/${issueKey}`);
      
      const { response } = await makeJiraRequest(url, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fields: fields
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update issue: ${response.status} ${response.statusText}`);
      }

      return {
        success: true,
        message: 'Issue updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  function mapPlanForgeToJira(planForgeElement) {
    const fields = {};
    
    if (planForgeElement.name) {
      fields.summary = planForgeElement.name;
    }
    
    if (planForgeElement.description) {
      fields.description = planForgeElement.description;
    }
    
    // Map PlanForge levels to JIRA issue types
    let issueType = 'Task';
    if (planForgeElement.level === 'Initiative') {
      issueType = 'Epic'; // or 'Initiative' if available
    } else if (planForgeElement.level === 'Epic') {
      issueType = 'Epic';
    } else if (planForgeElement.level === 'Story') {
      issueType = 'Story';
    }
    
    return {
      fields: fields,
      issueType: issueType
    };
  }

  function mapJiraToPlanForge(jiraIssue) {
    return {
      name: jiraIssue.summary,
      description: jiraIssue.description || '',
      jiraKey: jiraIssue.key,
      jiraId: jiraIssue.id,
      lastSynced: new Date().toISOString()
    };
  }

  async function syncPlanForgeToJira(planForgeElement) {
    if (!planForgeElement.jiraKey) {
      throw new Error('Element is not linked to JIRA');
    }

    try {
      const mappedData = mapPlanForgeToJira(planForgeElement);
      const result = await updateIssue(planForgeElement.jiraKey, mappedData.fields);
      
      if (result.success) {
        return {
          success: true,
          message: `Successfully synced ${planForgeElement.name} to JIRA`,
          lastSynced: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async function syncJiraToPlanForge(jiraKey) {
    try {
      const result = await getIssue(jiraKey);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      const mappedData = mapJiraToPlanForge(result.issue);
      
      return {
        success: true,
        data: mappedData,
        message: `Successfully synced JIRA issue ${jiraKey}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async function bulkSyncToJira(planForgeElements) {
    const results = [];
    
    for (const element of planForgeElements) {
      if (element.jiraKey) {
        const result = await syncPlanForgeToJira(element);
        results.push({
          elementId: element.id,
          elementName: element.name,
          jiraKey: element.jiraKey,
          success: result.success,
          message: result.success ? result.message : result.error
        });
      }
    }
    
    return results;
  }

  async function bulkSyncFromJira(jiraKeys) {
    const results = [];
    
    for (const jiraKey of jiraKeys) {
      const result = await syncJiraToPlanForge(jiraKey);
      results.push({
        jiraKey: jiraKey,
        success: result.success,
        data: result.data,
        message: result.success ? result.message : result.error
      });
    }
    
    return results;
  }

  return {
    initialize,
    testConnection,
    searchIssues,
    getIssue,
    updateIssue,
    mapPlanForgeToJira,
    mapJiraToPlanForge,
    syncPlanForgeToJira,
    syncJiraToPlanForge,
    bulkSyncToJira,
    bulkSyncFromJira
  };
})();
