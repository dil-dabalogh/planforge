window.PlanForgeUI = (function() {
  function el(id){ return document.getElementById(id); }
  function createUI(state){
    const bindings = { scenarioClone: [], scenarioChange: [], scenarioRename: [], exportJSON: [], importJSON: [], exportScenario: [], exportMermaid: [], jiraSettings: [], bulkSync: [] };
    el('btn-scenario-clone').addEventListener('click', () => bindings.scenarioClone.forEach(cb => cb()));
    el('scenario-select').addEventListener('change', (e) => bindings.scenarioChange.forEach(cb => cb(e.target.value)));
    el('btn-scenario-rename').addEventListener('click', () => bindings.scenarioRename.forEach(cb => cb()));
    el('btn-export-json').addEventListener('click', () => bindings.exportJSON.forEach(cb => cb()));
    el('btn-import-json').addEventListener('click', () => bindings.importJSON.forEach(cb => cb()));
    el('btn-export-scenario').addEventListener('click', () => bindings.exportScenario.forEach(cb => cb()));
    el('btn-export-mermaid').addEventListener('click', () => bindings.exportMermaid.forEach(cb => cb()));
    el('btn-settings').addEventListener('click', () => bindings.jiraSettings.forEach(cb => cb()));
    el('btn-bulk-sync').addEventListener('click', () => bindings.bulkSync.forEach(cb => cb()));

    function renderScenarios(){
      const sel = el('scenario-select');
      sel.innerHTML = '';
      state.scenarios.forEach(s => {
        const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; if (s.id === state.activeScenarioId) o.selected = true; sel.appendChild(o);
      });
    }
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
          row.style.backgroundColor = 'rgba(106,164,255,0.15)';
          row.style.borderColor = '#6aa4ff';
          row.style.borderWidth = '2px';
        }
        const left = document.createElement('div'); left.style.paddingLeft = '12px'; left.style.display = 'flex'; left.style.alignItems = 'center'; left.style.gap = '8px';
        const toggle = document.createElement('button'); toggle.innerHTML = s.visible ? '<span class="material-icons">visibility</span>' : '<span class="material-icons">visibility_off</span>'; toggle.style.width = '24px'; toggle.style.height = '20px'; toggle.style.padding = '0'; toggle.style.fontSize = '18px'; toggle.style.color = s.visible ? '#6aa4ff' : '#9aa4c3'; toggle.style.display = 'flex'; toggle.style.alignItems = 'center'; toggle.style.justifyContent = 'center';
        toggle.addEventListener('click', (e)=>{ e.stopPropagation(); s.visible = !s.visible; renderHierarchy(); window.dispatchEvent(new Event('pf-refresh')); });
        const name = document.createElement('span'); name.textContent = s.name; name.className = 'link';
        if (s.id === state.activeScenarioId) { name.style.color = '#6aa4ff'; name.style.fontWeight = '600'; }
        name.addEventListener('click', ()=>{ state.activeScenarioId = s.id; state.selection = { type: 'scenario', id: s.id }; renderScenarios(); renderHierarchy(); renderDetails(); window.dispatchEvent(new Event('pf-refresh')); window.dispatchEvent(new Event('pf-selection-change')); });
        left.appendChild(toggle); left.appendChild(name);
        
        const right = document.createElement('div'); right.className = 'row-actions';
        const addInitiative = document.createElement('button'); addInitiative.innerHTML = '<span class="material-symbols-outlined">add</span>'; addInitiative.title = 'Add Initiative';
        addInitiative.addEventListener('click', () => {
          const id = window.PlanForgeModel.addInitiative(state, { name: 'New Initiative', start: window.PlanForgeModel.today(), end: window.PlanForgeModel.addDays(window.PlanForgeModel.today(), 7), level: 'Initiative', size: 'M' });
          state.selection = { type: 'initiative', id };
          renderHierarchy();
          renderDetails();
          window.dispatchEvent(new Event('pf-refresh'));
          window.dispatchEvent(new Event('pf-selection-change'));
        });
        right.appendChild(addInitiative);
        
        row.appendChild(left); row.appendChild(right);
        container.appendChild(row);
      });
      // initiatives
      const data = window.PlanForgeModel.getActiveData(state);
      const top = data.initiatives.filter(i => !i.parentId && i.scenarioId === state.activeScenarioId);
      top.forEach(i => container.appendChild(row(i, 0)));
      function row(item, depth){
        const d = document.createElement('div'); d.className = 'tree-item';
        const left = document.createElement('div'); left.style.paddingLeft = (depth*12)+'px'; left.className = 'link'; left.style.display = 'flex'; left.style.alignItems = 'center'; left.style.gap = '6px';
        
        // Add dependency indicator if this item has dependencies
        const hasDeps = data.dependencies.some(d => d.fromId === item.id || d.toId === item.id);
        if (hasDeps) {
          const depIcon = document.createElement('span'); depIcon.textContent = '↗'; depIcon.title = 'Has dependencies'; depIcon.style.color = '#8bd7a0'; depIcon.style.fontSize = '12px';
          left.appendChild(depIcon);
        }
        
        const nameSpan = document.createElement('span'); nameSpan.textContent = item.name; left.appendChild(nameSpan);
        left.addEventListener('click', () => { state.selection = { type: 'initiative', id: item.id }; renderDetails(); window.dispatchEvent(new Event('pf-refresh')); window.dispatchEvent(new Event('pf-selection-change')); });
        const right = document.createElement('div'); right.className = 'row-actions';
        if (item.level !== 'Story') {
          const addEpic = document.createElement('button'); addEpic.innerHTML = '<span class="material-symbols-outlined">add</span>'; addEpic.title = 'Add child';
          addEpic.addEventListener('click', () => {
            const nextLevel = item.level==='Initiative'?'Epic':'Story';
            const id = window.PlanForgeModel.addInitiative(state, { name: nextLevel, start: item.start, end: item.end, parentId: item.id, level: nextLevel, size: 'M' });
            renderHierarchy();
            // re-render timeline and details so child appears immediately
            window.dispatchEvent(new Event('pf-refresh'));
          });
          right.appendChild(addEpic);
        }
        const delBtn = document.createElement('button'); delBtn.innerHTML = '<span class="material-symbols-outlined">remove</span>'; delBtn.title = 'Delete';
        delBtn.addEventListener('click', () => {
          if (confirm('Delete this work item and its children?')) {
            window.PlanForgeModel.deleteInitiative(state, item.id);
            renderHierarchy();
            renderDetails(); window.dispatchEvent(new Event('pf-refresh'));
            window.dispatchEvent(new Event('pf-refresh'));
          }
        });
        right.appendChild(delBtn);
        d.appendChild(left); d.appendChild(right);
        const wrap = document.createElement('div'); wrap.appendChild(d);
        const children = data.initiatives.filter(i => i.parentId === item.id);
        children.forEach(c => wrap.appendChild(row(c, depth+1)));
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
        
        // JIRA Integration Section
        const jiraWrap = document.createElement('div'); jiraWrap.className = 'details-field';
        const jiraLabel = document.createElement('label'); jiraLabel.textContent = 'JIRA Integration'; jiraWrap.appendChild(jiraLabel);
        
        if (item.jiraKey) {
          // Show JIRA link status
          const jiraStatus = document.createElement('div'); jiraStatus.className = 'jira-link-status';
          jiraStatus.innerHTML = `
            <span class="material-icons">link</span>
            <span>Linked to JIRA: ${item.jiraKey}</span>
          `;
          jiraWrap.appendChild(jiraStatus);
          
          // Sync status and last synced time
          if (item.lastSynced) {
            const syncStatus = document.createElement('div');
            syncStatus.style.marginTop = '8px';
            syncStatus.style.fontSize = '12px';
            syncStatus.style.color = '#9aa4c3';
            syncStatus.innerHTML = `
              <span class="material-icons" style="font-size: 14px;">sync</span>
              Last synced: ${new Date(item.lastSynced).toLocaleString()}
            `;
            jiraWrap.appendChild(syncStatus);
          }
          
          // Sync buttons container
          const syncButtons = document.createElement('div');
          syncButtons.style.display = 'flex';
          syncButtons.style.gap = '8px';
          syncButtons.style.marginTop = '8px';
          
          // Sync to JIRA button
          const syncToJiraBtn = document.createElement('button');
          syncToJiraBtn.textContent = 'Sync to JIRA';
          syncToJiraBtn.className = 'jira-link-button';
          syncToJiraBtn.addEventListener('click', async () => {
            syncToJiraBtn.disabled = true;
            syncToJiraBtn.textContent = 'Syncing...';
            
            try {
              const result = await window.PlanForgeJIRA.syncPlanForgeToJira(item);
              if (result.success) {
                // Update last synced time
                item.lastSynced = result.lastSynced;
                renderDetails();
                alert(result.message);
              } else {
                alert('Sync failed: ' + result.error);
              }
            } catch (error) {
              alert('Sync failed: ' + error.message);
            } finally {
              syncToJiraBtn.disabled = false;
              syncToJiraBtn.textContent = 'Sync to JIRA';
            }
          });
          
          // Sync from JIRA button
          const syncFromJiraBtn = document.createElement('button');
          syncFromJiraBtn.textContent = 'Sync from JIRA';
          syncFromJiraBtn.className = 'jira-link-button';
          syncFromJiraBtn.addEventListener('click', async () => {
            syncFromJiraBtn.disabled = true;
            syncFromJiraBtn.textContent = 'Syncing...';
            
            try {
              const result = await window.PlanForgeJIRA.syncJiraToPlanForge(item.jiraKey);
              if (result.success) {
                // Update element with JIRA data
                const success = window.PlanForgeModel.updateJiraLinkedElement(state, item.id, result.data);
                if (success) {
                  renderDetails();
                  renderHierarchy();
                  window.dispatchEvent(new Event('pf-refresh'));
                  alert(result.message);
                } else {
                  alert('Failed to update element with JIRA data');
                }
              } else {
                alert('Sync failed: ' + result.error);
              }
            } catch (error) {
              alert('Sync failed: ' + error.message);
            } finally {
              syncFromJiraBtn.disabled = false;
              syncFromJiraBtn.textContent = 'Sync from JIRA';
            }
          });
          
          syncButtons.appendChild(syncToJiraBtn);
          syncButtons.appendChild(syncFromJiraBtn);
          jiraWrap.appendChild(syncButtons);
          
          // Unlink button
          const unlinkBtn = document.createElement('button'); 
          unlinkBtn.textContent = 'Unlink from JIRA'; 
          unlinkBtn.className = 'jira-link-button';
          unlinkBtn.style.marginTop = '8px';
          unlinkBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to unlink this element from JIRA?')) {
              const success = window.PlanForgeModel.unlinkJiraElement(state, item.id);
              if (success) {
                renderDetails();
                window.dispatchEvent(new Event('pf-refresh'));
              } else {
                alert('Failed to unlink element from JIRA');
              }
            }
          });
          jiraWrap.appendChild(unlinkBtn);
        } else {
          // Link to JIRA button
          const linkBtn = document.createElement('button'); 
          linkBtn.textContent = 'Link to JIRA'; 
          linkBtn.className = 'jira-link-button';
          linkBtn.addEventListener('click', () => {
            // Check if JIRA is configured
            if (!window.PlanForgeSettings.isJiraConfigured()) {
              alert('Please configure JIRA settings first by clicking the JIRA Settings button in the header.');
              return;
            }
            
            // Show search dialog
            showJiraSearchDialog(item.level, item.id);
          });
          jiraWrap.appendChild(linkBtn);
        }
        
        panel.appendChild(jiraWrap);
      }
      if (sel.type === 'scenario'){
        const s = state.scenarios.find(x => x.id === sel.id); if (!s) return;
        panel.appendChild(field('Scenario Name', s.name, (v)=>{ s.name=v; renderScenarios(); renderHierarchy(); window.dispatchEvent(new Event('pf-refresh')); }));
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

    function showJiraSettingsDialog() {
      const dialog = el('jira-settings-dialog');
      const settings = window.PlanForgeSettings.getSettings();
      
      // Populate form with current settings
      el('jira-domain').value = settings.jiraDomain || '';
      el('jira-email').value = settings.email || '';
      el('jira-token').value = ''; // Don't show stored token for security
      
      dialog.style.display = 'flex';
      
      // Close dialog handlers
      el('close-jira-settings-dialog').addEventListener('click', () => {
        dialog.style.display = 'none';
      });
      
      // Close on overlay click
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          dialog.style.display = 'none';
        }
      });
      
      // Test connection handler
      el('test-jira-connection').addEventListener('click', async () => {
        const domain = el('jira-domain').value.trim();
        const email = el('jira-email').value.trim();
        const token = el('jira-token').value.trim();
        
        if (!domain || !email || !token) {
          showConnectionStatus('error', 'Please fill in all fields before testing connection.');
          return;
        }
        
        const testSettings = { jiraDomain: domain, email: email, apiToken: token };
        const validation = window.PlanForgeSettings.validateSettings(testSettings);
        
        if (!validation.isValid) {
          showConnectionStatus('error', validation.errors.join(', '));
          return;
        }
        
        showConnectionStatus('info', 'Testing connection...');
        
        // Initialize JIRA service with test settings
        window.PlanForgeJIRA.initialize(testSettings);
        
        try {
          const result = await window.PlanForgeJIRA.testConnection();
          if (result.success) {
            showConnectionStatus('success', result.message);
          } else {
            // Check if it's a CORS error and provide helpful guidance
            if (result.error.includes('CORS Error')) {
              showConnectionStatus('error', result.error + '\n\nTo resolve this:\n1. Use a local development server (e.g., Live Server extension in VS Code)\n2. Or deploy the application to a web hosting service\n3. Or use a browser with disabled CORS (not recommended for production)');
            } else {
              showConnectionStatus('error', result.error);
            }
          }
        } catch (error) {
          showConnectionStatus('error', 'Connection test failed: ' + error.message);
        }
      });
      
      // Save settings handler
      el('save-jira-settings').addEventListener('click', () => {
        const domain = el('jira-domain').value.trim();
        const email = el('jira-email').value.trim();
        const token = el('jira-token').value.trim();
        
        const newSettings = { 
          jiraDomain: domain, 
          email: email, 
          apiToken: token,
          lastTested: new Date().toISOString(),
          isValid: false
        };
        
        const validation = window.PlanForgeSettings.validateSettings(newSettings);
        
        if (!validation.isValid) {
          showConnectionStatus('error', validation.errors.join(', '));
          return;
        }
        
        if (window.PlanForgeSettings.saveSettings(newSettings)) {
          // Initialize JIRA service with saved settings
          window.PlanForgeJIRA.initialize(newSettings);
          showConnectionStatus('success', 'Settings saved successfully!');
          
          // Close dialog after a short delay
          setTimeout(() => {
            dialog.style.display = 'none';
          }, 1500);
        } else {
          showConnectionStatus('error', 'Failed to save settings.');
        }
      });
    }
    
    function showConnectionStatus(type, message) {
      const statusDiv = el('jira-connection-status');
      const messageDiv = statusDiv.querySelector('.status-message');
      
      statusDiv.className = `connection-status ${type}`;
      messageDiv.textContent = message;
      statusDiv.style.display = 'block';
    }

    function showBulkSyncDialog() {
      // Check if JIRA is configured first
      if (!window.PlanForgeSettings.isJiraConfigured()) {
        alert('Please configure JIRA settings first by clicking the JIRA Settings button in the header.');
        return;
      }
      
      const dialog = el('bulk-sync-dialog');
      const targetsList = el('sync-targets-list');
      const progressDiv = el('bulk-sync-progress');
      const resultsDiv = el('sync-results');
      
      // Clear previous state
      targetsList.innerHTML = '';
      progressDiv.style.display = 'none';
      resultsDiv.innerHTML = '';
      
      // Get all JIRA-linked elements
      const linkedElements = window.PlanForgeModel.getJiraLinkedElements(state);
      
      if (linkedElements.length === 0) {
        targetsList.innerHTML = '<div style="padding: 16px; color: #9aa4c3; text-align: center;">No JIRA-linked elements found</div>';
        return;
      }
      
      // Populate targets list
      linkedElements.forEach(element => {
        const targetItem = document.createElement('div');
        targetItem.className = 'sync-target-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.id = `target-${element.id}`;
        
        const info = document.createElement('div');
        info.className = 'sync-target-info';
        
        const name = document.createElement('div');
        name.className = 'sync-target-name';
        name.textContent = element.name;
        
        const meta = document.createElement('div');
        meta.className = 'sync-target-meta';
        meta.textContent = `${element.level} • ${element.jiraKey} • Last synced: ${element.lastSynced ? new Date(element.lastSynced).toLocaleString() : 'Never'}`;
        
        info.appendChild(name);
        info.appendChild(meta);
        
        targetItem.appendChild(checkbox);
        targetItem.appendChild(info);
        targetsList.appendChild(targetItem);
      });
      
      dialog.style.display = 'flex';
      
      // Close dialog handlers
      el('close-bulk-sync-dialog').addEventListener('click', () => {
        dialog.style.display = 'none';
      });
      
      el('cancel-bulk-sync').addEventListener('click', () => {
        dialog.style.display = 'none';
      });
      
      // Close on overlay click
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          dialog.style.display = 'none';
        }
      });
      
      // Start sync handler
      el('start-bulk-sync').addEventListener('click', async () => {
        const syncDirection = document.querySelector('input[name="sync-direction"]:checked').value;
        const selectedTargets = Array.from(document.querySelectorAll('#sync-targets-list input[type="checkbox"]:checked'))
          .map(cb => cb.id.replace('target-', ''))
          .map(id => linkedElements.find(el => el.id === id))
          .filter(el => el);
        
        if (selectedTargets.length === 0) {
          alert('Please select at least one element to sync');
          return;
        }
        
        await performBulkSync(syncDirection, selectedTargets, progressDiv, resultsDiv);
      });
    }
    
    async function performBulkSync(direction, targets, progressDiv, resultsDiv) {
      progressDiv.style.display = 'block';
      resultsDiv.innerHTML = '';
      
      const progressFill = progressDiv.querySelector('.progress-fill');
      const progressText = progressDiv.querySelector('.progress-text');
      
      let results = [];
      
      try {
        if (direction === 'to-jira') {
          // Sync PlanForge → JIRA
          progressText.textContent = 'Syncing PlanForge data to JIRA...';
          results = await window.PlanForgeJIRA.bulkSyncToJira(targets);
        } else {
          // Sync JIRA → PlanForge
          progressText.textContent = 'Syncing JIRA data to PlanForge...';
          const jiraKeys = targets.map(t => t.jiraKey);
          results = await window.PlanForgeJIRA.bulkSyncFromJira(jiraKeys);
          
          // Update PlanForge elements with JIRA data
          for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.success) {
              const target = targets.find(t => t.jiraKey === result.jiraKey);
              if (target) {
                window.PlanForgeModel.updateJiraLinkedElement(state, target.id, result.data);
              }
            }
            
            // Update progress
            const progress = ((i + 1) / results.length) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Syncing ${i + 1}/${results.length}...`;
          }
        }
        
        // Display results
        results.forEach(result => {
          const resultItem = document.createElement('div');
          resultItem.className = `sync-result-item ${result.success ? 'success' : 'error'}`;
          
          if (direction === 'to-jira') {
            resultItem.textContent = `${result.elementName} (${result.jiraKey}): ${result.message}`;
          } else {
            resultItem.textContent = `${result.jiraKey}: ${result.message}`;
          }
          
          resultsDiv.appendChild(resultItem);
        });
        
        // Update UI
        renderDetails();
        renderHierarchy();
        window.dispatchEvent(new Event('pf-refresh'));
        
        progressText.textContent = 'Sync completed';
        
      } catch (error) {
        const errorItem = document.createElement('div');
        errorItem.className = 'sync-result-item error';
        errorItem.textContent = `Sync failed: ${error.message}`;
        resultsDiv.appendChild(errorItem);
        
        progressText.textContent = 'Sync failed';
      }
    }

    function showJiraSearchDialog(elementType, elementId) {
      const dialog = el('jira-search-dialog');
      const searchInput = el('jira-search-input');
      const resultsContainer = el('jira-search-results');
      const loadingDiv = el('jira-search-loading');
      
      // Clear previous results
      resultsContainer.innerHTML = '';
      searchInput.value = '';
      
      dialog.style.display = 'flex';
      
      // Close dialog handlers
      el('close-jira-search-dialog').addEventListener('click', () => {
        dialog.style.display = 'none';
      });
      
      el('cancel-jira-search').addEventListener('click', () => {
        dialog.style.display = 'none';
      });
      
      // Close on overlay click
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          dialog.style.display = 'none';
        }
      });
      
      // Search functionality with debouncing
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // Clear previous timeout
        if (searchTimeout) {
          clearTimeout(searchTimeout);
        }
        
        if (query.length < 2) {
          resultsContainer.innerHTML = '';
          return;
        }
        
        // Debounce search by 300ms
        searchTimeout = setTimeout(async () => {
          await performJiraSearch(query, elementType, resultsContainer, loadingDiv);
        }, 300);
      });
      
      // Focus on search input
      setTimeout(() => {
        searchInput.focus();
      }, 100);
    }
    
    async function performJiraSearch(query, elementType, resultsContainer, loadingDiv) {
      try {
        loadingDiv.style.display = 'flex';
        resultsContainer.innerHTML = '';
        
        // Map PlanForge element types to JIRA issue types
        let jiraIssueType = null;
        if (elementType === 'Initiative') {
          jiraIssueType = 'Epic'; // or 'Initiative' if available
        } else if (elementType === 'Epic') {
          jiraIssueType = 'Epic';
        } else if (elementType === 'Story') {
          jiraIssueType = 'Story';
        }
        
        const result = await window.PlanForgeJIRA.searchIssues(query, jiraIssueType, 20);
        
        loadingDiv.style.display = 'none';
        
        if (!result.success) {
          resultsContainer.innerHTML = `<div style="padding: 16px; color: #ef4444; text-align: center;">Error: ${result.error}</div>`;
          return;
        }
        
        if (result.issues.length === 0) {
          resultsContainer.innerHTML = `<div style="padding: 16px; color: #9aa4c3; text-align: center;">No issues found matching "${query}"</div>`;
          return;
        }
        
        // Display search results
        result.issues.forEach(issue => {
          const resultItem = createSearchResultItem(issue);
          resultsContainer.appendChild(resultItem);
        });
        
      } catch (error) {
        loadingDiv.style.display = 'none';
        resultsContainer.innerHTML = `<div style="padding: 16px; color: #ef4444; text-align: center;">Search failed: ${error.message}</div>`;
      }
    }
    
    function createSearchResultItem(issue) {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      
      const info = document.createElement('div');
      info.className = 'search-result-info';
      
      const key = document.createElement('div');
      key.className = 'search-result-key';
      key.textContent = issue.key;
      
      const summary = document.createElement('div');
      summary.className = 'search-result-summary';
      summary.textContent = issue.summary;
      
      const meta = document.createElement('div');
      meta.className = 'search-result-meta';
      meta.innerHTML = `
        <span>${issue.assignee}</span>
        <span>${issue.issueType}</span>
        <span>Updated: ${new Date(issue.updated).toLocaleDateString()}</span>
      `;
      
      info.appendChild(key);
      info.appendChild(summary);
      info.appendChild(meta);
      
      const status = document.createElement('div');
      status.className = 'search-result-status';
      status.textContent = issue.status;
      
      item.appendChild(info);
      item.appendChild(status);
      
      // Add click handler to select this issue
      item.addEventListener('click', async () => {
        await selectJiraIssue(issue);
      });
      
      return item;
    }
    
    async function selectJiraIssue(issue) {
      try {
        // Get full issue details
        const result = await window.PlanForgeJIRA.getIssue(issue.key);
        
        if (!result.success) {
          alert('Failed to get issue details: ' + result.error);
          return;
        }
        
        // Close the search dialog
        el('jira-search-dialog').style.display = 'none';
        
        // Map JIRA issue to PlanForge element
        const mappedData = window.PlanForgeJIRA.mapJiraToPlanForge(result.issue);
        
        // Find the current element and update it
        const data = window.PlanForgeModel.getActiveData(state);
        const element = data.initiatives.find(i => i.id === state.selection.id);
        
        if (element) {
          // Update element with JIRA data using model function
          const success = window.PlanForgeModel.updateJiraLinkedElement(state, element.id, mappedData);
          
          if (success) {
            // Re-render UI to show updated data
            renderDetails();
            renderHierarchy();
            window.dispatchEvent(new Event('pf-refresh'));
            
            // Show success message
            alert(`Successfully linked to JIRA issue ${issue.key}: ${issue.summary}`);
          } else {
            alert('Failed to update element with JIRA data');
          }
        }
        
      } catch (error) {
        alert('Failed to link JIRA issue: ' + error.message);
      }
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
            // Check if it's a single day task (milestone) or multi-day task
            const startDate = new Date(initiative.start);
            const endDate = new Date(initiative.end);
            const isSameDay = startDate.getTime() === endDate.getTime();
            
            if (isSameDay) {
              // Single day task - use milestone syntax
              mermaid += `        ${safeName} :milestone, ${initiative.start}\n`;
            } else {
              // Multi-day task - use task syntax
              mermaid += `        ${safeName} :${initiative.start}, ${initiative.end}\n`;
            }
          });
          mermaid += '\n';
        }
      });
      
      mermaid += '```';
      return mermaid;
    }

    return {
      renderHierarchy, renderDetails, renderScenarios,
      showMermaidDialog, generateMermaidGantt, showJiraSettingsDialog, showJiraSearchDialog, showBulkSyncDialog,
      onScenarioClone: (cb)=>bindings.scenarioClone.push(cb),
      onScenarioChange: (cb)=>bindings.scenarioChange.push(cb),
      onScenarioRename: (cb)=>bindings.scenarioRename.push(cb),
      onExportJSON: (cb)=>bindings.exportJSON.push(cb),
      onImportJSON: (cb)=>bindings.importJSON.push(cb),
      onExportScenario: (cb)=>bindings.exportScenario.push(cb),
      onExportMermaid: (cb)=>bindings.exportMermaid.push(cb),
      onJiraSettings: (cb)=>bindings.jiraSettings.push(cb),
      onBulkSync: (cb)=>bindings.bulkSync.push(cb)
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


