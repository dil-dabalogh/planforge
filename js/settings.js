window.PlanForgeSettings = (function() {
  const STORAGE_KEY = 'planforge_jira_settings';
  const DEFAULT_SETTINGS = {
    jiraDomain: '',
    email: '',
    apiToken: '',
    lastTested: null,
    isValid: false
  };

  function getSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  function saveSettings(settings) {
    try {
      // Don't store the API token in plain text for security
      const settingsToStore = {
        jiraDomain: settings.jiraDomain,
        email: settings.email,
        lastTested: settings.lastTested,
        isValid: settings.isValid
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToStore));
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  function validateSettings(settings) {
    const errors = [];
    
    if (!settings.jiraDomain || !settings.jiraDomain.trim()) {
      errors.push('JIRA domain is required');
    } else if (!isValidDomain(settings.jiraDomain)) {
      errors.push('JIRA domain must be a valid domain (e.g., yourcompany.atlassian.net)');
    }
    
    if (!settings.email || !settings.email.trim()) {
      errors.push('Email is required');
    } else if (!isValidEmail(settings.email)) {
      errors.push('Email must be a valid email address');
    }
    
    if (!settings.apiToken || !settings.apiToken.trim()) {
      errors.push('API token is required');
    } else if (settings.apiToken.length < 10) {
      errors.push('API token appears to be too short');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  function isValidDomain(domain) {
    // Basic domain validation - should be *.atlassian.net or custom domain
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.(atlassian\.net|[a-zA-Z]{2,})$/;
    return domainRegex.test(domain.trim());
  }

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  function getApiToken() {
    // In a real implementation, this would be retrieved securely
    // For now, we'll prompt the user to re-enter it when needed
    return null;
  }

  function clearSettings() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing settings:', error);
      return false;
    }
  }

  function getJiraBaseUrl(domain) {
    if (!domain) return null;
    const cleanDomain = domain.trim();
    if (cleanDomain.startsWith('http://') || cleanDomain.startsWith('https://')) {
      return cleanDomain;
    }
    return `https://${cleanDomain}`;
  }

  return {
    getSettings,
    saveSettings,
    validateSettings,
    getApiToken,
    clearSettings,
    getJiraBaseUrl,
    DEFAULT_SETTINGS
  };
})();
