/* Entry point: wires UI, storage, model, and timeline */
(function() {
  const state = window.PlanForgeModel.createInitialState();
  const ui = window.PlanForgeUI.createUI(state);
  const timeline = window.PlanForgeTimeline.create(state, document.getElementById('timeline-canvas'));

  function renderAll() {
    ui.renderHierarchy();
    ui.renderDetails();
    timeline.render();
  }

  // UI event bindings
  ui.onScenarioClone(() => {
    window.PlanForgeModel.cloneActiveScenario(state);
    renderAll();
    window.dispatchEvent(new Event('pf-refresh'));
  });

  // Timeline interactions
  timeline.onSelect((selection) => { 
    state.selection = selection; 
    
    // If selecting a scenario, also update the active scenario
    if (selection.type === 'scenario') {
      state.activeScenarioId = selection.id;
    }
    
    // If selecting an initiative, expand tree to show it
    if (selection.type === 'initiative') {
      window.PlanForgeModel.expandToShowItem(state, selection.id);
    }
    
    ui.renderHierarchy(); // Update sidebar highlighting
    ui.renderDetails(); 
    window.dispatchEvent(new Event('pf-refresh')); 
    window.dispatchEvent(new Event('pf-selection-change')); 
  });
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


  // Right sidebar toggle functionality
  const rightSidebar = document.getElementById('right-sidebar');
  const toggleButton = document.getElementById('toggle-right-panel');
  const toggleIcon = toggleButton.querySelector('.material-symbols-outlined');
  const appMain = document.querySelector('.app-main');
  
  let isRightSidebarCollapsed = false;
  
  toggleButton.addEventListener('click', () => {
    isRightSidebarCollapsed = !isRightSidebarCollapsed;
    
    if (isRightSidebarCollapsed) {
      rightSidebar.classList.add('collapsed');
      appMain.classList.add('right-sidebar-collapsed');
      toggleIcon.textContent = 'keyboard_double_arrow_right';
      toggleButton.title = 'Expand Details Panel';
    } else {
      rightSidebar.classList.remove('collapsed');
      appMain.classList.remove('right-sidebar-collapsed');
      toggleIcon.textContent = 'keyboard_double_arrow_left';
      toggleButton.title = 'Collapse Details Panel';
    }
  });

  // Initial render without demo data
  renderAll();
})();


