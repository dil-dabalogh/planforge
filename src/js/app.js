/* Entry point: wires UI, storage, model, and timeline */
(function() {
  const state = window.WhatIfDeliveredModel.createInitialState();
  const ui = window.WhatIfDeliveredUI.createUI(state);
  const timeline = window.WhatIfDeliveredTimeline.create(state, document.getElementById('timeline-canvas'));

  function renderAll() {
    ui.renderHierarchy();
    ui.renderDetails();
    timeline.render();
  }

  // UI event bindings
  ui.onScenarioClone(() => {
    window.WhatIfDeliveredModel.cloneActiveScenario(state);
    renderAll();
    window.dispatchEvent(new Event('pf-refresh'));
  });
  
  // Erase button handler
  ui.onErase(() => {
    const confirmed = confirm('Are you sure you want to clear all data? This action cannot be undone.');
    if (confirmed) {
      window.WhatIfDeliveredModel.clearAllData(state);
      renderAll();
      window.dispatchEvent(new Event('pf-refresh'));
    }
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
      window.WhatIfDeliveredModel.expandToShowItem(state, selection.id);
    }
    
    ui.renderHierarchy(); // Update sidebar highlighting
    ui.renderDetails(); 
    window.dispatchEvent(new Event('pf-refresh')); 
    window.dispatchEvent(new Event('pf-selection-change')); 
  });
  timeline.onChange(() => { ui.renderDetails(); renderAll(); });

  // Import/Export
  ui.onExportJSON(() => {
    const json = window.WhatIfDeliveredStorage.serializeJSON(state);
    const activeScenario = state.scenarios.find(s => s.id === state.activeScenarioId);
    const defaultFilename = activeScenario ? `whatifdelivered-${activeScenario.name.replace(/[^a-zA-Z0-9]/g, '_')}.json` : 'whatifdelivered.json';
    window.WhatIfDeliveredUI.saveFile(json, defaultFilename, 'application/json');
  });
  
  ui.onImportJSON(async () => {
    const text = await window.WhatIfDeliveredUI.pickFile(['.json','application/json']);
    if (!text) return;
    
    // Confirm overwrite if there's existing data
    const hasData = state.scenarios.some(s => s.data.initiatives.length > 0);
    if (hasData) {
      const confirmOverwrite = confirm('This will overwrite your current data. Continue?');
      if (!confirmOverwrite) return;
    }
    
    try {
      const next = window.WhatIfDeliveredStorage.parseJSON(text);
      window.WhatIfDeliveredModel.loadState(state, next);
      renderAll();
      timeline.zoomToContent(); // Fit to content after importing
      window.dispatchEvent(new Event('pf-refresh'));
    } catch (error) {
      alert('Error importing file: ' + error.message);
    }
  });
  
  ui.onExportScenario(() => {
    try {
      const scenarioJson = window.WhatIfDeliveredStorage.serializeActiveScenario(state);
      const activeScenario = state.scenarios.find(s => s.id === state.activeScenarioId);
      const defaultFilename = activeScenario ? `scenario-${activeScenario.name.replace(/[^a-zA-Z0-9]/g, '_')}.json` : 'scenario.json';
      window.WhatIfDeliveredUI.saveFile(scenarioJson, defaultFilename, 'application/json');
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


  // Left sidebar toggle functionality
  const appMain = document.querySelector('.app-main');
  const leftSidebar = document.getElementById('left-sidebar');
  const leftToggleButton = document.getElementById('toggle-left-panel');
  const leftToggleIcon = leftToggleButton.querySelector('.material-icons');
  
  let isLeftSidebarCollapsed = false;
  
  leftToggleButton.addEventListener('click', (e) => {
    e.stopPropagation();
    isLeftSidebarCollapsed = !isLeftSidebarCollapsed;
    
    if (isLeftSidebarCollapsed) {
      leftSidebar.classList.add('collapsed');
      appMain.classList.add('left-sidebar-collapsed');
      leftToggleIcon.textContent = 'chevron_right'; // Point right to expand
      leftToggleButton.title = 'Expand Hierarchy Panel';
    } else {
      leftSidebar.classList.remove('collapsed');
      appMain.classList.remove('left-sidebar-collapsed');
      leftToggleIcon.textContent = 'chevron_left'; // Point left to collapse
      leftToggleButton.title = 'Collapse Hierarchy Panel';
    }
    // Re-render timeline after panel toggle
    setTimeout(() => {
      timeline.render();
      renderAll();
    }, 100);
  });

  // Right sidebar toggle functionality
  const rightSidebar = document.getElementById('right-sidebar');
  const rightToggleButton = document.getElementById('toggle-right-panel');
  const rightToggleIcon = rightToggleButton.querySelector('.material-icons');
  
  let isRightSidebarCollapsed = false;
  
  rightToggleButton.addEventListener('click', (e) => {
    e.stopPropagation();
    isRightSidebarCollapsed = !isRightSidebarCollapsed;
    
    if (isRightSidebarCollapsed) {
      rightSidebar.classList.add('collapsed');
      appMain.classList.add('right-sidebar-collapsed');
      rightToggleIcon.textContent = 'chevron_left'; // Point left to expand
      rightToggleButton.title = 'Expand Details Panel';
    } else {
      rightSidebar.classList.remove('collapsed');
      appMain.classList.remove('right-sidebar-collapsed');
      rightToggleIcon.textContent = 'chevron_right'; // Point right to collapse
      rightToggleButton.title = 'Collapse Details Panel';
    }
    // Re-render timeline after panel toggle
    setTimeout(() => {
      timeline.render();
      renderAll();
    }, 100);
  });

  // Initial render
  renderAll();
  
  // Auto-load demo.json if available
  (async function loadDemoIfAvailable() {
    try {
      console.log('Attempting to load demo...');
      
      // First, try to load from embedded demo data
      const embeddedDemo = document.getElementById('embedded-demo-data');
      if (embeddedDemo) {
        console.log('Found embedded demo data');
        const text = embeddedDemo.textContent;
        const next = window.WhatIfDeliveredStorage.parseJSON(text);
        window.WhatIfDeliveredModel.loadState(state, next);
        console.log('Demo data loaded successfully from embedded content');
        renderAll();
        timeline.zoomToContent(); // Fit to content after loading
        window.dispatchEvent(new Event('pf-refresh'));
        return;
      }
      
      // If no embedded data, try to fetch from files
      let response = null;
      const paths = ['./demo.json', './data/demo-full-features.json', '../data/demo-full-features.json'];
      
      for (const path of paths) {
        try {
          console.log('Trying path:', path);
          response = await fetch(path);
          if (response.ok) {
            console.log('Successfully found demo at:', path);
            break;
          }
        } catch (e) {
          console.log('Failed to load from:', path);
        }
      }
      
      if (response && response.ok) {
        const text = await response.text();
        const next = window.WhatIfDeliveredStorage.parseJSON(text);
        window.WhatIfDeliveredModel.loadState(state, next);
        console.log('Demo data loaded successfully');
        renderAll();
        timeline.zoomToContent(); // Fit to content after loading
        window.dispatchEvent(new Event('pf-refresh'));
      } else {
        console.log('No demo file found in any location');
      }
    } catch (error) {
      // Demo file not found or other error - silent failure is OK
      console.log('Demo file not available:', error.message);
    }
  })();
})();


