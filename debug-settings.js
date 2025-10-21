// Debug script to check JIRA settings
console.log('=== JIRA Settings Debug ===');
console.log('localStorage key:', 'planforge_jira_settings');
console.log('Raw localStorage:', localStorage.getItem('planforge_jira_settings'));

const settings = window.PlanForgeSettings.getSettings();
console.log('Parsed settings:', settings);
console.log('jiraDomain:', settings.jiraDomain);
console.log('email:', settings.email);
console.log('apiToken:', settings.apiToken ? '***' + settings.apiToken.slice(-4) : 'MISSING');
console.log('isJiraConfigured():', window.PlanForgeSettings.isJiraConfigured());
console.log('========================');
