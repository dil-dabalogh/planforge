/* Entry point: wires UI, storage, model, and timeline */
(function() {
  const state = window.PlanForgeModel.createInitialState();
  const ui = window.PlanForgeUI.createUI(state);
  const timeline = window.PlanForgeTimeline.create(state, document.getElementById('timeline-canvas'));

  function renderAll() {
    ui.renderHierarchy();
    ui.renderDetails();
    ui.renderScenarios();
    timeline.render();
  }

  // UI event bindings
  ui.onScenarioClone(() => {
    window.PlanForgeModel.cloneActiveScenario(state);
    renderAll();
    window.dispatchEvent(new Event('pf-refresh'));
  });
  ui.onScenarioRename(() => {
    const current = state.scenarios.find(s => s.id === state.activeScenarioId);
    const name = prompt('Scenario name:', current ? current.name : '');
    if (name != null) {
      window.PlanForgeModel.renameActiveScenario(state, name);
      ui.renderScenarios();
      ui.renderDetails();
      window.dispatchEvent(new Event('pf-refresh'));
    }
  });

  ui.onScenarioChange((scenarioId) => {
    window.PlanForgeModel.setActiveScenario(state, scenarioId);
    renderAll();
    window.dispatchEvent(new Event('pf-refresh'));
  });

  // Timeline interactions
  timeline.onSelect((selection) => { state.selection = selection; ui.renderDetails(); window.dispatchEvent(new Event('pf-refresh')); window.dispatchEvent(new Event('pf-selection-change')); });
  timeline.onChange(() => { ui.renderDetails(); renderAll(); });

  // Import/Export
  ui.onExportJSON(() => {
    const json = window.PlanForgeStorage.serializeJSON(state);
    const activeScenario = state.scenarios.find(s => s.id === state.activeScenarioId);
    const defaultFilename = activeScenario ? `planforge-${activeScenario.name.replace(/[^a-zA-Z0-9]/g, '_')}.json` : 'planforge.json';
    window.PlanForgeUI.saveFile(json, defaultFilename, 'application/json');
  });
  
  ui.onImportJSON(async () => {
    const text = await window.PlanForgeUI.pickFile(['.json','application/json']);
    if (!text) return;
    
    // Confirm overwrite if there's existing data
    const hasData = state.scenarios.some(s => s.data.initiatives.length > 0);
    if (hasData) {
      const confirmOverwrite = confirm('This will overwrite your current data. Continue?');
      if (!confirmOverwrite) return;
    }
    
    try {
      const next = window.PlanForgeStorage.parseJSON(text);
      window.PlanForgeModel.loadState(state, next);
      renderAll();
      window.dispatchEvent(new Event('pf-refresh'));
    } catch (error) {
      alert('Error importing file: ' + error.message);
    }
  });
  
  ui.onExportScenario(() => {
    try {
      const scenarioJson = window.PlanForgeStorage.serializeActiveScenario(state);
      const activeScenario = state.scenarios.find(s => s.id === state.activeScenarioId);
      const defaultFilename = activeScenario ? `scenario-${activeScenario.name.replace(/[^a-zA-Z0-9]/g, '_')}.json` : 'scenario.json';
      window.PlanForgeUI.saveFile(scenarioJson, defaultFilename, 'application/json');
    } catch (error) {
      alert('Error exporting scenario: ' + error.message);
    }
  });

  ui.onExportMermaid(() => {
    try {
      const mermaidCode = ui.generateMermaidGantt(state);
      ui.showMermaidDialog(mermaidCode);
    } catch (error) {
      alert('Error generating MermaidJS: ' + error.message);
    }
  });

  ui.onJiraSettings(() => {
    ui.showJiraSettingsDialog();
  });

  ui.onBulkSync(() => {
    ui.showBulkSyncDialog();
  });

  // Initialize JIRA service with saved settings
  const jiraSettings = window.PlanForgeSettings.getSettings();
  if (jiraSettings.jiraDomain && jiraSettings.email && jiraSettings.apiToken) {
    window.PlanForgeJIRA.initialize(jiraSettings);
  }

  // Initial render without demo data
  renderAll();
})();


