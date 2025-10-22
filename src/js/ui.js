window.PlanForgeUI = (function() {
  function el(id){ return document.getElementById(id); }
  function createUI(state){
    const bindings = { scenarioClone: [], exportJSON: [], importJSON: [], exportScenario: [], exportMermaid: [] };
    el('btn-export-json').addEventListener('click', () => bindings.exportJSON.forEach(cb => cb()));
    el('btn-import-json').addEventListener('click', () => bindings.importJSON.forEach(cb => cb()));
    el('btn-export-scenario').addEventListener('click', () => bindings.exportScenario.forEach(cb => cb()));
    el('btn-export-mermaid').addEventListener('click', () => bindings.exportMermaid.forEach(cb => cb()));

    function renderHierarchy(){
      const container = el('hierarchy-tree'); container.innerHTML = '';
      // scenarios header
      const scWrap = document.createElement('div'); scWrap.className = 'tree-item';
      const scLeft = document.createElement('div'); scLeft.textContent = 'Scenarios'; scLeft.style.fontWeight = '600';
      scWrap.appendChild(scLeft); scWrap.appendChild(document.createElement('div'));
      container.appendChild(scWrap);
      state.scenarios.forEach(s => {
        const row = document.createElement('div'); row.className = 'tree-item';
        if (s.id === state.activeScenarioId) {
          row.style.backgroundColor = 'rgba(245,158,11,0.15)';
          row.style.borderColor = '#f59e0b';
          row.style.borderWidth = '2px';
        }
        const left = document.createElement('div'); left.style.paddingLeft = '12px'; left.style.display = 'flex'; left.style.alignItems = 'center'; left.style.gap = '8px';
        const toggle = document.createElement('button'); 
        toggle.innerHTML = s.visible ? '<span class="material-icons">visibility</span>' : '<span class="material-icons">visibility_off</span>'; 
        toggle.style.width = '24px'; 
        toggle.style.height = '20px'; 
        toggle.style.padding = '0'; 
        toggle.style.fontSize = '18px'; 
        toggle.style.color = s.visible ? '#f59e0b' : '#94a3b8'; 
        toggle.style.display = 'flex'; 
        toggle.style.alignItems = 'center'; 
        toggle.style.justifyContent = 'center';
        
        // Visibility toggle is always enabled for all scenarios
        toggle.disabled = false;
        
        toggle.addEventListener('click', (e)=>{ 
          e.stopPropagation(); 
          s.visible = !s.visible; 
          renderHierarchy(); 
          window.dispatchEvent(new Event('pf-refresh')); 
        });
        const name = document.createElement('span'); name.textContent = s.name; name.className = 'link';
        if (s.id === state.activeScenarioId) { name.style.color = '#f59e0b'; name.style.fontWeight = '600'; }
        
        // Check if this is the active scenario for button states
        const isActiveScenario = s.id === state.activeScenarioId;
        
        // Make scenario name editable
        name.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          const input = document.createElement('input');
          input.type = 'text';
          input.value = s.name;
          input.style.background = '#1a2040';
          input.style.color = '#f59e0b';
          input.style.border = '1px solid #f59e0b';
          input.style.padding = '2px 4px';
          input.style.fontSize = 'inherit';
          input.style.fontWeight = 'inherit';
          input.style.width = '100%';
          
          const saveEdit = () => {
            if (input.value.trim()) {
              s.name = input.value.trim();
              renderHierarchy();
              renderDetails();
              window.dispatchEvent(new Event('pf-refresh'));
            }
          };
          
          input.addEventListener('blur', saveEdit);
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              saveEdit();
            } else if (e.key === 'Escape') {
              renderHierarchy();
            }
          });
          
          name.replaceWith(input);
          input.focus();
          input.select();
        });
        
        name.addEventListener('click', ()=>{ 
          state.activeScenarioId = s.id; 
          state.selection = { type: 'scenario', id: s.id }; 
          renderHierarchy(); // Re-render to update highlighting
          renderDetails(); 
          window.dispatchEvent(new Event('pf-refresh')); 
          window.dispatchEvent(new Event('pf-selection-change')); 
        });
        left.appendChild(toggle); left.appendChild(name);
        
        const right = document.createElement('div'); right.className = 'row-actions';
        
        // Add clone button (only enabled for active scenario)
        const cloneScenario = document.createElement('button'); 
        cloneScenario.innerHTML = '<span class="material-symbols-outlined">content_copy</span>'; 
        cloneScenario.title = 'Clone Scenario';
        cloneScenario.disabled = !isActiveScenario;
        if (!isActiveScenario) {
          cloneScenario.style.opacity = '0.5';
          cloneScenario.style.cursor = 'not-allowed';
        }
        cloneScenario.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isActiveScenario) {
            bindings.scenarioClone.forEach(cb => cb());
          }
        });
        right.appendChild(cloneScenario);
        
        // Add initiative button (only enabled for active scenario)
        const addInitiative = document.createElement('button'); 
        addInitiative.innerHTML = '<span class="material-symbols-outlined">add</span>'; 
        addInitiative.title = 'Add Initiative';
        addInitiative.disabled = !isActiveScenario;
        if (!isActiveScenario) {
          addInitiative.style.opacity = '0.5';
          addInitiative.style.cursor = 'not-allowed';
        }
        addInitiative.addEventListener('click', () => {
          if (isActiveScenario) {
            const id = window.PlanForgeModel.addInitiative(state, { name: 'New Initiative', start: window.PlanForgeModel.today(), end: window.PlanForgeModel.addDays(window.PlanForgeModel.today(), 7), level: 'Initiative', size: 'M' });
            state.selection = { type: 'initiative', id };
            renderHierarchy();
            renderDetails();
            window.dispatchEvent(new Event('pf-refresh'));
            window.dispatchEvent(new Event('pf-selection-change'));
          }
        });
        right.appendChild(addInitiative);
        
        // Add delete scenario button (only show if there's more than one scenario)
        if (state.scenarios.length > 1) {
          const deleteScenario = document.createElement('button'); 
          deleteScenario.innerHTML = '<span class="material-symbols-outlined">remove</span>'; 
          deleteScenario.title = 'Delete Scenario';
          deleteScenario.addEventListener('click', (e) => {
            e.stopPropagation();
            try {
              window.PlanForgeModel.deleteScenario(state, s.id);
              renderHierarchy();
              renderDetails();
              window.dispatchEvent(new Event('pf-refresh'));
              window.dispatchEvent(new Event('pf-selection-change'));
            } catch (error) {
              alert(error.message);
            }
          });
          right.appendChild(deleteScenario);
        }
        
        row.appendChild(left); row.appendChild(right);
        container.appendChild(row);
      });
      // initiatives
      const data = window.PlanForgeModel.getActiveData(state);
      const top = data.initiatives.filter(i => !i.parentId && i.scenarioId === state.activeScenarioId);
      top.forEach(i => container.appendChild(row(i, 0)));
      function row(item, depth){
        const d = document.createElement('div'); d.className = 'tree-item';
        
        // Check if this item is currently selected (active element)
        let isSelected = false;
        if (state.selection) {
          if (state.selection.type === 'initiative') {
            const data = window.PlanForgeModel.getActiveData(state);
            const selectedItem = data.initiatives.find(i => i.id === state.selection.id);
            isSelected = selectedItem && selectedItem.id === item.id;
          } else if (state.selection.type === 'scenario') {
            const selectedScenario = state.scenarios.find(s => s.id === state.selection.id);
            isSelected = selectedScenario && selectedScenario.id === item.id;
          }
        }
        
        // Apply highlighting for selected element
        if (isSelected) {
          d.style.backgroundColor = 'rgba(106,164,255,0.15)';
          d.style.borderColor = '#6aa4ff';
          d.style.borderWidth = '2px';
        }
        
        const left = document.createElement('div'); left.style.paddingLeft = (depth*12)+'px'; left.className = 'link'; left.style.display = 'flex'; left.style.alignItems = 'center'; left.style.gap = '6px';
        
        // Add expand/collapse button if item has children
        const children = data.initiatives.filter(i => i.parentId === item.id);
        if (children.length > 0) {
          const expandBtn = document.createElement('button');
          expandBtn.style.width = '20px';
          expandBtn.style.height = '20px';
          expandBtn.style.padding = '0';
          expandBtn.style.border = 'none';
          expandBtn.style.background = 'none';
          expandBtn.style.cursor = 'pointer';
          expandBtn.style.display = 'flex';
          expandBtn.style.alignItems = 'center';
          expandBtn.style.justifyContent = 'center';
          expandBtn.style.color = 'var(--muted)';
          expandBtn.style.fontSize = '16px';
          
          const isExpanded = window.PlanForgeModel.isExpanded(state, item.id);
          expandBtn.innerHTML = isExpanded ? '<span class="material-symbols-outlined">expand_circle_up</span>' : '<span class="material-symbols-outlined">expand_circle_down</span>';
          expandBtn.title = isExpanded ? 'Collapse' : 'Expand';
          
          expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.PlanForgeModel.toggleExpanded(state, item.id);
            renderHierarchy();
          });
          
          left.appendChild(expandBtn);
        } else {
          // Add spacer for items without children to maintain alignment
          const spacer = document.createElement('div');
          spacer.style.width = '20px';
          spacer.style.height = '20px';
          left.appendChild(spacer);
        }
        
        // Add dependency indicator if this item has dependencies
        const hasDeps = data.dependencies.some(d => d.fromId === item.id || d.toId === item.id);
        if (hasDeps) {
          const depIcon = document.createElement('span'); depIcon.textContent = '↗'; depIcon.title = 'Has dependencies'; depIcon.style.color = '#10b981'; depIcon.style.fontSize = '12px';
          left.appendChild(depIcon);
        }
        
        const nameSpan = document.createElement('span'); nameSpan.textContent = item.name; left.appendChild(nameSpan);
        left.addEventListener('click', () => { 
          state.selection = { type: 'initiative', id: item.id }; 
          renderHierarchy(); // Re-render to update highlighting
          renderDetails(); 
          window.dispatchEvent(new Event('pf-refresh')); 
          window.dispatchEvent(new Event('pf-selection-change')); 
        });
        const right = document.createElement('div'); right.className = 'row-actions';
        
        // Check if this initiative belongs to the active scenario
        const isActiveScenario = item.scenarioId === state.activeScenarioId;
        
        if (item.level !== 'Story') {
          const addEpic = document.createElement('button'); 
          addEpic.innerHTML = '<span class="material-symbols-outlined">add</span>'; 
          addEpic.title = 'Add child';
          addEpic.disabled = !isActiveScenario;
          if (!isActiveScenario) {
            addEpic.style.opacity = '0.5';
            addEpic.style.cursor = 'not-allowed';
          }
          addEpic.addEventListener('click', () => {
            if (isActiveScenario) {
              const nextLevel = item.level==='Initiative'?'Epic':'Story';
              const id = window.PlanForgeModel.addInitiative(state, { name: nextLevel, start: item.start, end: item.end, parentId: item.id, level: nextLevel, size: 'M' });
              renderHierarchy();
              // re-render timeline and details so child appears immediately
              window.dispatchEvent(new Event('pf-refresh'));
            }
          });
          right.appendChild(addEpic);
        }
        
        const delBtn = document.createElement('button'); 
        delBtn.innerHTML = '<span class="material-symbols-outlined">remove</span>'; 
        delBtn.title = 'Delete';
        delBtn.disabled = !isActiveScenario;
        if (!isActiveScenario) {
          delBtn.style.opacity = '0.5';
          delBtn.style.cursor = 'not-allowed';
        }
        delBtn.addEventListener('click', () => {
          if (isActiveScenario) {
            window.PlanForgeModel.deleteInitiative(state, item.id);
            renderHierarchy();
            renderDetails(); window.dispatchEvent(new Event('pf-refresh'));
            window.dispatchEvent(new Event('pf-refresh'));
          }
        });
        right.appendChild(delBtn);
        d.appendChild(left); d.appendChild(right);
        const wrap = document.createElement('div'); wrap.appendChild(d);
        
        // Only render children if the item is expanded
        const isExpanded = window.PlanForgeModel.isExpanded(state, item.id);
        if (isExpanded) {
          const children = data.initiatives.filter(i => i.parentId === item.id);
          children.forEach(c => wrap.appendChild(row(c, depth+1)));
        }
        return wrap;
      }
    }
    function renderDetails(){
      const panel = el('details'); panel.innerHTML = '';
      const sel = state.selection; if (!sel) { panel.textContent = 'Select an item…'; return; }
      if (sel.type === 'initiative'){
        const data = window.PlanForgeModel.getActiveData(state);
        const item = data.initiatives.find(i => i.id === sel.id); if (!item) return;
        panel.appendChild(field('Name', item.name, (v)=>{ item.name=v; renderHierarchy(); window.dispatchEvent(new Event('pf-refresh')); }));
        panel.appendChild(field('Start', item.start, (v)=>{ window.PlanForgeModel.moveItem(state, item.id, { start: v, end: item.end }); window.dispatchEvent(new Event('pf-refresh')); } ,'date'));
        panel.appendChild(field('End', item.end, (v)=>{ window.PlanForgeModel.moveItem(state, item.id, { start: item.start, end: v }); window.dispatchEvent(new Event('pf-refresh')); } ,'date'));
        panel.appendChild(field('Length (days)', item.length || '', ()=>{}, 'number', true));
        panel.appendChild(field('Description', item.description||'', (v)=>{ item.description=v; window.dispatchEvent(new Event('pf-refresh')); }));
        // size dropdown
        const sizeWrap = document.createElement('div'); sizeWrap.className = 'details-field';
        const sizeLabel = document.createElement('label'); sizeLabel.textContent = 'T-Shirt Size';
        const sizeSel = document.createElement('select');
        ;['XS','S','M','L','XL','XXL','infinit'].forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; if (item.size===s) o.selected=true; sizeSel.appendChild(o); });
        sizeSel.addEventListener('change', ()=>{ item.size=sizeSel.value; window.dispatchEvent(new Event('pf-refresh')); });
        sizeWrap.appendChild(sizeLabel); sizeWrap.appendChild(sizeSel); panel.appendChild(sizeWrap);
        // add child buttons
        const nextLevel = item.level === 'Initiative' ? 'Epic' : item.level === 'Epic' ? 'Story' : null;
        const childWrap = document.createElement('div'); childWrap.className = 'details-field';
        const addChildBtn = document.createElement('button'); addChildBtn.textContent = nextLevel?('Add Child '+nextLevel):'No child level'; addChildBtn.disabled = !nextLevel;
        addChildBtn.addEventListener('click', () => {
          if (!nextLevel) return;
          const id = window.PlanForgeModel.addInitiative(state, { name: nextLevel, start: item.start, end: item.end, parentId: item.id, level: nextLevel, size: 'M' });
          state.selection = { type: 'initiative', id };
          renderHierarchy(); renderDetails(); window.dispatchEvent(new Event('pf-refresh')); window.dispatchEvent(new Event('pf-selection-change'));
        });
        childWrap.appendChild(addChildBtn); panel.appendChild(childWrap);
        
        // dependencies section
        const depWrap = document.createElement('div'); depWrap.className = 'details-field';
        const depLabel = document.createElement('label'); depLabel.textContent = 'Dependencies'; depWrap.appendChild(depLabel);
        
        // existing dependencies
        const existingDeps = data.dependencies.filter(d => d.fromId === item.id || d.toId === item.id);
        if (existingDeps.length > 0) {
          const existingList = document.createElement('div'); existingList.style.marginBottom = '12px';
          existingDeps.forEach(dep => {
            const depRow = document.createElement('div'); depRow.style.display = 'flex'; depRow.style.alignItems = 'center'; depRow.style.justifyContent = 'space-between'; depRow.style.padding = '4px 0'; depRow.style.borderBottom = '1px solid #2a3154';
            const depItem = data.initiatives.find(i => i.id === (dep.fromId === item.id ? dep.toId : dep.fromId));
            const depText = document.createElement('span'); depText.textContent = `${dep.fromId === item.id ? '→' : '←'} ${depItem ? depItem.name : 'Unknown'}`; depText.style.color = '#8bd7a0';
            const removeBtn = document.createElement('button'); removeBtn.innerHTML = '<span class="material-symbols-outlined">remove</span>'; removeBtn.title = 'Remove dependency'; removeBtn.style.width = '20px'; removeBtn.style.height = '20px'; removeBtn.style.fontSize = '12px';
            removeBtn.addEventListener('click', () => {
              window.PlanForgeModel.unlinkDependency(state, dep.fromId, dep.toId);
              window.dispatchEvent(new Event('pf-refresh'));
              renderDetails(); window.dispatchEvent(new Event('pf-refresh'));
            });
            depRow.appendChild(depText); depRow.appendChild(removeBtn); existingList.appendChild(depRow);
          });
          depWrap.appendChild(existingList);
        }
        
        // add new dependency
        const addDepWrap = document.createElement('div'); addDepWrap.style.display = 'flex'; addDepWrap.style.gap = '8px'; addDepWrap.style.alignItems = 'center';
        const depSelect = document.createElement('select'); depSelect.style.flex = '1';
        const depOption = document.createElement('option'); depOption.value = ''; depOption.textContent = 'Depends on...'; depSelect.appendChild(depOption);
        
        // Add all other initiatives as options (excluding self and children)
        const allItems = data.initiatives.filter(i => i.id !== item.id && i.scenarioId === state.activeScenarioId);
        const children = data.initiatives.filter(i => i.parentId === item.id);
        const availableItems = allItems.filter(i => !children.some(c => c.id === i.id));
        
        availableItems.forEach(otherItem => {
          const option = document.createElement('option'); option.value = otherItem.id; option.textContent = otherItem.name; depSelect.appendChild(option);
        });
        
        const addDepBtn = document.createElement('button'); addDepBtn.textContent = 'Add Dependency'; addDepBtn.disabled = true;
        addDepBtn.addEventListener('click', () => {
          if (depSelect.value) {
            window.PlanForgeModel.linkDependency(state, item.id, depSelect.value);
            window.dispatchEvent(new Event('pf-refresh'));
            renderDetails(); window.dispatchEvent(new Event('pf-refresh'));
          }
        });
        
        depSelect.addEventListener('change', () => {
          addDepBtn.disabled = !depSelect.value;
        });
        
        addDepWrap.appendChild(depSelect); addDepWrap.appendChild(addDepBtn); depWrap.appendChild(addDepWrap); panel.appendChild(depWrap);
        
      }
      if (sel.type === 'scenario'){
        const s = state.scenarios.find(x => x.id === sel.id); if (!s) return;
        panel.appendChild(field('Scenario Name', s.name, (v)=>{ s.name=v; renderHierarchy(); window.dispatchEvent(new Event('pf-refresh')); }));
        panel.appendChild(field('Description', s.description||'', (v)=>{ s.description=v; window.dispatchEvent(new Event('pf-refresh')); }));
        // Calculate scenario length from its initiatives
        const data = s.data;
        if (data.initiatives.length > 0) {
          const start = data.initiatives.reduce((min, i) => i.start < min ? i.start : min, data.initiatives[0].start);
          const end = data.initiatives.reduce((max, i) => i.end > max ? i.end : max, data.initiatives[0].end);
          const length = Math.max(1, Math.round((new Date(end) - new Date(start)) / 86400000));
          panel.appendChild(field('Length (days)', length, ()=>{}, 'number', true));
        }
      }
      function field(label, value, onChange, type='text', disabled=false){
        const wrap = document.createElement('div'); wrap.className = 'details-field';
        const l = document.createElement('label'); l.textContent = label;
        const input = document.createElement('input'); input.type = type; input.value = value; 
        if (disabled) {
          input.disabled = true;
          input.style.backgroundColor = '#1a2040';
          input.style.color = '#9aa4c3';
        } else {
          input.addEventListener('input', ()=>onChange(input.value));
        }
        wrap.appendChild(l); wrap.appendChild(input);
        return wrap;
      }
    }

    function showMermaidDialog(mermaidCode) {
      const dialog = el('mermaid-dialog');
      const codeTextarea = el('mermaid-code');
      codeTextarea.value = mermaidCode;
      dialog.style.display = 'flex';
      
      // Close dialog handlers
      el('close-mermaid-dialog').addEventListener('click', () => {
        dialog.style.display = 'none';
      });
      
      // Close on overlay click
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          dialog.style.display = 'none';
        }
      });
      
      // Copy to clipboard handler
      el('copy-mermaid-code').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(mermaidCode);
          const btn = el('copy-mermaid-code');
          const originalText = btn.innerHTML;
          btn.innerHTML = '<span class="material-icons">check</span>Copied!';
          setTimeout(() => {
            btn.innerHTML = originalText;
          }, 2000);
        } catch (err) {
          console.error('Failed to copy: ', err);
        }
      });
    }




    function generateMermaidGantt(state) {
      const data = window.PlanForgeModel.getActiveData(state);
      const activeScenario = state.scenarios.find(s => s.id === state.activeScenarioId);
      
      if (!data.initiatives.length) {
        return '```mermaid\ngantt\n    title Empty Timeline\n    dateFormat YYYY-MM-DD\n```';
      }
      
      // Get all initiatives and sort by start date
      const initiatives = data.initiatives
        .filter(i => i.scenarioId === state.activeScenarioId)
        .sort((a, b) => new Date(a.start) - new Date(b.start));
      
      let mermaid = '```mermaid\ngantt\n';
      mermaid += `    title ${activeScenario ? activeScenario.name : 'Timeline'}\n`;
      mermaid += '    dateFormat YYYY-MM-DD\n';
      mermaid += `    axisFormat %m/%d\n\n`;
      
      // Create a map of initiative IDs to their safe names for dependency references
      const initiativeIdMap = new Map();
      initiatives.forEach(initiative => {
        const safeName = initiative.name.replace(/[":]/g, '');
        initiativeIdMap.set(initiative.id, safeName);
      });
      
      // Group initiatives by level for better organization
      const initiativesByLevel = {
        'Initiative': initiatives.filter(i => i.level === 'Initiative'),
        'Epic': initiatives.filter(i => i.level === 'Epic'),
        'Story': initiatives.filter(i => i.level === 'Story')
      };
      
      // Add sections for each level
      Object.keys(initiativesByLevel).forEach(level => {
        const levelInitiatives = initiativesByLevel[level];
        if (levelInitiatives.length > 0) {
          mermaid += `    section ${level}s\n`;
          levelInitiatives.forEach(initiative => {
            // Escape special characters in names and ensure proper syntax
            const safeName = initiative.name.replace(/[":]/g, '');
            
            // Check for dependencies - find tasks that this initiative depends on
            const dependencies = data.dependencies.filter(dep => dep.toId === initiative.id);
            
            // Check if it's a single day task (milestone) or multi-day task
            const startDate = new Date(initiative.start);
            const endDate = new Date(initiative.end);
            const isSameDay = startDate.getTime() === endDate.getTime();
            
            if (dependencies.length > 0) {
              // Task has dependencies - use after syntax
              const dependencyNames = dependencies.map(dep => {
                const depName = initiativeIdMap.get(dep.fromId);
                return depName || 'unknown';
              });
              
              if (isSameDay) {
                // Single day task with dependencies - use milestone syntax
                mermaid += `        ${safeName} :milestone, after ${dependencyNames.join(',')}, 0d\n`;
              } else {
                // Multi-day task with dependencies - use task syntax
                const duration = Math.max(1, Math.round((endDate - startDate) / 86400000));
                mermaid += `        ${safeName} :after ${dependencyNames.join(',')}, ${duration}d\n`;
              }
            } else {
              // Task has no dependencies - use original date-based syntax
              if (isSameDay) {
                // Single day task - use milestone syntax
                mermaid += `        ${safeName} :milestone, ${initiative.start}\n`;
              } else {
                // Multi-day task - use task syntax
                mermaid += `        ${safeName} :${initiative.start}, ${initiative.end}\n`;
              }
            }
          });
          mermaid += '\n';
        }
      });
      
      mermaid += '```';
      return mermaid;
    }

    return {
      renderHierarchy, renderDetails,
      showMermaidDialog, generateMermaidGantt,
      onScenarioClone: (cb)=>bindings.scenarioClone.push(cb),
      onExportJSON: (cb)=>bindings.exportJSON.push(cb),
      onImportJSON: (cb)=>bindings.importJSON.push(cb),
      onExportScenario: (cb)=>bindings.exportScenario.push(cb),
      onExportMermaid: (cb)=>bindings.exportMermaid.push(cb)
    };
  }

  async function pickFile(accept){
    return new Promise((resolve) => {
      const input = document.getElementById('file-input');
      input.accept = accept.join(',');
      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return resolve(null);
        const text = await file.text();
        input.value = '';
        resolve(text);
      };
      input.click();
    });
  }

  function saveFile(content, defaultFilename, mimeType = 'application/json') {
    // Create a filename dialog
    const filename = prompt('Enter filename:', defaultFilename);
    if (!filename) return; // User cancelled
    
    // Create and download the file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return { createUI, pickFile, saveFile };
})();


