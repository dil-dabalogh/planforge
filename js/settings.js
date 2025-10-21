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
      // Store all settings including API token (for MVP - in production, use encryption)
      const settingsToStore = {
        jiraDomain: settings.jiraDomain,
        email: settings.email,
        apiToken: settings.apiToken, // Store API token for MVP
        lastTested: settings.lastTested,
        isValid: settings.isValid
      };
      console.log('💾 Saving JIRA Settings:', {
        jiraDomain: settingsToStore.jiraDomain,
        email: settingsToStore.email,
        apiToken: settingsToStore.apiToken ? '***' + settingsToStore.apiToken.slice(-4) : 'MISSING',
        lastTested: settingsToStore.lastTested,
        isValid: settingsToStore.isValid
      });
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
    try {
      const settings = getSettings();
      return settings.apiToken || null;
    } catch (error) {
      console.error('Error getting API token:', error);
      return null;
    }
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

  function isJiraConfigured() {
    const settings = getSettings();
    console.log('🔍 JIRA Configuration Check:', {
      jiraDomain: settings.jiraDomain,
      email: settings.email,
      apiToken: settings.apiToken ? '***' + settings.apiToken.slice(-4) : 'MISSING',
      configured: !!(settings.jiraDomain && settings.email && settings.apiToken)
    });
    return !!(settings.jiraDomain && settings.email && settings.apiToken);
  }

  return {
    getSettings,
    saveSettings,
    validateSettings,
    getApiToken,
    clearSettings,
    getJiraBaseUrl,
    isJiraConfigured,
    DEFAULT_SETTINGS
  };
})();
