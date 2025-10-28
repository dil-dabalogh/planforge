window.WhatIfDeliveredUI = (function() {
  // Helper function to get CSS custom properties
  function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  
  // Get color palette
  function getColors() {
    return {
      panel: getCSSVar('--color-panel'),
      text: getCSSVar('--color-text'),
      textMuted: getCSSVar('--color-text-muted'),
      primary: getCSSVar('--color-primary'),
      accent: getCSSVar('--color-accent'),
      highlight: getCSSVar('--color-highlight')
    };
  }
  
  function el(id){ return document.getElementById(id); }
  
  // Context menu functionality
  let currentContextTarget = null;
  
  function showContextMenu(event, items) {
    event.preventDefault();
    const menu = el('context-menu');
    const menuItems = el('context-menu-items');
    menuItems.setAttribute('role', 'menu');
    
    menuItems.innerHTML = '';
    
    items.forEach(item => {
      if (item === 'divider') {
        const divider = document.createElement('div');
        divider.className = 'context-menu-divider';
        menuItems.appendChild(divider);
      } else if (item && item.label) {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        menuItem.setAttribute('role', 'menuitem');
        
        // Create icon if provided
        if (item.icon) {
          const icon = document.createElement('span');
          icon.className = item.iconClass || 'material-symbols-outlined';
          icon.textContent = item.icon;
          menuItem.appendChild(icon);
        }
        
        // Add label text
        const label = document.createElement('span');
        label.textContent = item.label;
        menuItem.appendChild(label);
        
        if (item.disabled) {
          menuItem.classList.add('disabled');
        } else {
          menuItem.addEventListener('click', () => {
            hideContextMenu();
            if (item.action) item.action();
          });
        }
        
        menuItems.appendChild(menuItem);
      }
    });
    
    // Position the menu - adjust to stay on screen
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = event.pageX;
    let top = event.pageY;
    
    // Adjust horizontal position if menu would go off right edge
    if (left + 180 > viewportWidth) {
      left = viewportWidth - 200; // Position to the left with some margin
    }
    
    // Adjust vertical position if menu would go off bottom edge
    const estimatedHeight = items.length * 40; // Rough estimate of menu height
    if (top + estimatedHeight > viewportHeight) {
      top = viewportHeight - estimatedHeight - 20; // Position above with some margin
    }
    
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.classList.add('show');
    
    currentContextTarget = event.target;
    
    // Close on outside click
    const closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        hideContextMenu();
        document.removeEventListener('click', closeHandler);
        document.removeEventListener('contextmenu', closeHandler);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
      document.addEventListener('contextmenu', closeHandler);
    }, 0);
  }
  
  function hideContextMenu() {
    const menu = el('context-menu');
    menu.classList.remove('show');
    currentContextTarget = null;
  }
  
  function createUI(state){
    const colors = getColors();
    const bindings = { scenarioClone: [], exportJSON: [], importJSON: [], exportScenario: [], exportMermaid: [], erase: [] };
    
    // Wire up Erase button
    const btnErase = el('btn-erase');
    if (btnErase) {
      btnErase.addEventListener('click', () => bindings.erase.forEach(cb => cb()));
    }
    
    // Wire up Import button
    el('btn-import').addEventListener('click', () => bindings.importJSON.forEach(cb => cb()));
    
    // Wire up Export button with context menu on both left and right click
    const showExportMenu = (e) => {
      e.preventDefault();
      const items = [
        {
          label: 'Export Active Scenario',
          icon: 'link',
          action: () => bindings.exportScenario.forEach(cb => cb())
        },
        {
          label: 'Export All Scenarios',
          icon: 'save',
          action: () => bindings.exportJSON.forEach(cb => cb())
        },
        {
          label: 'Export MermaidJS',
          icon: 'timeline',
          action: () => bindings.exportMermaid.forEach(cb => cb())
        }
      ];
      showContextMenu(e, items);
    };
    
    el('btn-export').addEventListener('click', showExportMenu);
    el('btn-export').addEventListener('contextmenu', showExportMenu);
    
    // Wire up Share button with context menu
    const showShareMenu = (e) => {
      e.preventDefault();
      const shareUrl = encodeURIComponent('https://planforge.cc/');
      const shareText = encodeURIComponent('Check out WHAT IF delivered - A free, open-source Gantt chart editor that works completely offline!');
      
      const items = [
        {
          label: 'Share on Twitter',
          icon: 'share',
          action: () => {
            window.open(`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`, '_blank', 'width=550,height=420');
          }
        },
        {
          label: 'Share on Reddit',
          icon: 'forum',
          action: () => {
            window.open(`https://www.reddit.com/submit?url=${shareUrl}&title=${shareText}`, '_blank', 'width=800,height=600');
          }
        },
        {
          label: 'Share on LinkedIn',
          icon: 'work',
          action: () => {
            window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`, '_blank', 'width=600,height=700');
          }
        }
      ];
      showContextMenu(e, items);
    };
    
    el('btn-share').addEventListener('click', showShareMenu);
    el('btn-share').addEventListener('contextmenu', showShareMenu);
    
    // Wire up Info button
    el('btn-info').addEventListener('click', () => showInfoDialog());
    
    // Wire up Settings button
    el('btn-settings').addEventListener('click', () => showSettingsDialog());

    function renderHierarchy(){
      const container = el('hierarchy-tree'); container.innerHTML = '';
      // scenarios header
      const scWrap = document.createElement('div'); scWrap.className = 'tree-item';
      const scLeft = document.createElement('div'); scLeft.textContent = 'Scenarios'; scLeft.style.fontWeight = '500';
      scWrap.appendChild(scLeft); scWrap.appendChild(document.createElement('div'));
      container.appendChild(scWrap);
      state.scenarios.forEach(s => {
        const row = document.createElement('div'); row.className = 'tree-item';
        row.setAttribute('data-type', 'scenario');
        if (s.id === state.activeScenarioId) {
          row.style.backgroundColor = getCSSVar('--color-selection-bg');
          row.style.borderColor = colors.primary;
          row.style.borderWidth = '2px';
        }
        const left = document.createElement('div'); left.style.paddingLeft = '4px'; left.style.display = 'flex'; left.style.alignItems = 'center'; left.style.gap = '6px';
        
        // Add visibility indicator (clickable)
        const visibilityIndicator = document.createElement('span'); 
        visibilityIndicator.innerHTML = s.visible ? '<span class="material-icons">visibility</span>' : '<span class="material-icons">visibility_off</span>'; 
        visibilityIndicator.style.fontSize = '18px'; 
        visibilityIndicator.style.color = s.visible ? colors.primary : colors.textMuted; 
        visibilityIndicator.style.display = 'flex'; 
        visibilityIndicator.style.alignItems = 'center'; 
        visibilityIndicator.style.justifyContent = 'center';
        visibilityIndicator.style.cursor = 'pointer';
        visibilityIndicator.style.padding = '2px';
        visibilityIndicator.style.borderRadius = '4px';
        visibilityIndicator.style.transition = 'background-color 0.2s ease';
        
        // Make it clickable to toggle visibility
        visibilityIndicator.addEventListener('click', (e) => {
          e.stopPropagation();
          s.visible = !s.visible;
          renderHierarchy();
          window.dispatchEvent(new Event('pf-refresh'));
        });
        
        // Add hover effect
        visibilityIndicator.addEventListener('mouseenter', () => {
          visibilityIndicator.style.backgroundColor = 'rgba(217, 89, 89, 0.1)';
        });
        visibilityIndicator.addEventListener('mouseleave', () => {
          visibilityIndicator.style.backgroundColor = 'transparent';
        });
        
        const name = document.createElement('span'); name.textContent = s.name; name.className = 'link';
        if (s.id === state.activeScenarioId) { name.style.color = colors.primary; name.style.fontWeight = '500'; }
        
        // Check if this is the active scenario for button states
        const isActiveScenario = s.id === state.activeScenarioId;
        
        // Make scenario name editable
        name.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          const input = document.createElement('input');
          input.type = 'text';
          input.value = s.name;
          input.style.background = colors.panel;
          input.style.color = colors.primary;
          input.style.border = `1px solid ${colors.primary}`;
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
        left.appendChild(visibilityIndicator); left.appendChild(name);
        
        // Function to create scenario context menu items
        const createScenarioMenuItems = (e) => {
          const isActiveScenario = s.id === state.activeScenarioId;
          const items = [
            {
              label: s.visible ? 'Hide Timeline' : 'Show Timeline',
              icon: s.visible ? 'visibility_off' : 'visibility',
              action: () => {
                s.visible = !s.visible; 
                renderHierarchy(); 
                window.dispatchEvent(new Event('pf-refresh'));
              }
            },
            'divider',
            {
              label: 'Clone Scenario',
              icon: 'content_copy',
              action: () => bindings.scenarioClone.forEach(cb => cb()),
              disabled: !isActiveScenario
            },
            'divider',
            {
              label: `Add ${window.WhatIfDeliveredModel.getLevelName(state, 'Initiative')}`,
              icon: 'add',
              action: () => {
                const id = window.WhatIfDeliveredModel.addInitiative(state, { name: 'New ' + window.WhatIfDeliveredModel.getLevelName(state, 'Initiative'), start: window.WhatIfDeliveredModel.today(), end: window.WhatIfDeliveredModel.addDays(window.WhatIfDeliveredModel.today(), 7), level: 'Initiative', size: 'M' });
                state.selection = { type: 'initiative', id };
                renderHierarchy();
                renderDetails();
                window.dispatchEvent(new Event('pf-refresh'));
                window.dispatchEvent(new Event('pf-selection-change'));
              },
              disabled: !isActiveScenario
            },
            {
              label: 'Add Milestone',
              icon: 'flag',
              action: () => {
                const today = window.WhatIfDeliveredModel.today();
                const id = window.WhatIfDeliveredModel.addInitiative(state, { name: 'New Milestone', start: today, end: today, level: 'Initiative', size: 'M', isMilestone: true });
                state.selection = { type: 'initiative', id };
                renderHierarchy();
                renderDetails();
                window.dispatchEvent(new Event('pf-refresh'));
                window.dispatchEvent(new Event('pf-selection-change'));
              },
              disabled: !isActiveScenario
            }
          ];
          
          if (state.scenarios.length > 1) {
            items.push('divider');
            items.push({
              label: 'Delete Scenario',
              icon: 'delete',
              action: () => {
                try {
                  window.WhatIfDeliveredModel.deleteScenario(state, s.id);
                  renderHierarchy();
                  renderDetails();
                  window.dispatchEvent(new Event('pf-refresh'));
                  window.dispatchEvent(new Event('pf-selection-change'));
                } catch (error) {
                  alert(error.message);
                }
              }
            });
          }
          
          return items;
        };
        
        // Add context menu indicator (three dots icon)
        const contextMenuIndicator = document.createElement('span');
        contextMenuIndicator.className = 'context-menu-indicator material-icons';
        contextMenuIndicator.textContent = 'more_vert';
        contextMenuIndicator.title = 'Click for more options';
        
        // Add click event to indicator to open context menu
        contextMenuIndicator.addEventListener('click', (e) => {
          e.stopPropagation();
          const items = createScenarioMenuItems(e);
          showContextMenu(e, items);
        });
        
        row.appendChild(contextMenuIndicator);
        
        // Add right-click context menu for scenarios
        row.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const items = createScenarioMenuItems(e);
          showContextMenu(e, items);
        });
        
        row.appendChild(left);
        container.appendChild(row);
      });
      // initiatives
      const data = window.WhatIfDeliveredModel.getActiveData(state);
      const top = data.initiatives.filter(i => !i.parentId && i.scenarioId === state.activeScenarioId);
      top.forEach(i => container.appendChild(row(i, 0)));
      function row(item, depth){
        const d = document.createElement('div'); d.className = 'tree-item';
        // Add data-type attribute for styling
        if (item.isMilestone) {
          d.setAttribute('data-type', 'milestone');
        } else if (item.level) {
          d.setAttribute('data-type', item.level.toLowerCase());
        }
        
        // Check if this item is currently selected (active element)
        let isSelected = false;
        if (state.selection) {
          if (state.selection.type === 'initiative') {
            const data = window.WhatIfDeliveredModel.getActiveData(state);
            const selectedItem = data.initiatives.find(i => i.id === state.selection.id);
            isSelected = selectedItem && selectedItem.id === item.id;
          } else if (state.selection.type === 'scenario') {
            const selectedScenario = state.scenarios.find(s => s.id === state.selection.id);
            isSelected = selectedScenario && selectedScenario.id === item.id;
          }
        }
        
        // Apply highlighting for selected element
        if (isSelected) {
          d.style.backgroundColor = 'linear-gradient(to bottom, rgba(217, 89, 89, 0.18), rgba(217, 89, 89, 0.12))';
          d.style.borderColor = colors.primary;
          d.style.borderWidth = '2px';
          d.style.boxShadow = '0 2px 8px rgba(217, 89, 89, 0.15)';
          d.style.background = 'linear-gradient(to bottom, rgba(217, 89, 89, 0.12), rgba(217, 89, 89, 0.08))';
        }
        
        const left = document.createElement('div'); left.style.paddingLeft = (depth*12)+'px'; left.className = 'link'; left.style.display = 'flex'; left.style.alignItems = 'center'; left.style.gap = '6px';
        // Drag handle (six dots)
        const dragHandle = document.createElement('span');
        dragHandle.className = 'material-icons drag-handle';
        dragHandle.title = 'Drag to move/reparent';
        dragHandle.textContent = 'drag_indicator';
        left.appendChild(dragHandle);
        
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
          
          const isExpanded = window.WhatIfDeliveredModel.isExpanded(state, item.id);
          expandBtn.innerHTML = isExpanded ? '<span class="material-icons">remove_circle</span>' : '<span class="material-icons">add_circle</span>';
          expandBtn.title = isExpanded ? 'Collapse' : 'Expand';
          
          expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.WhatIfDeliveredModel.toggleExpanded(state, item.id);
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
        
        // Milestone indicator removed - cleaner UI without diamond symbol
        
        // Add dependency indicator if this item has dependencies
        const hasOutgoing = data.dependencies.some(d => d.fromId === item.id);
        const hasIncoming = data.dependencies.some(d => d.toId === item.id);
        
        if (hasOutgoing || hasIncoming) {
          const depIcon = document.createElement('span');
          depIcon.className = 'material-symbols-outlined';
          depIcon.style.fontSize = '18px';
          depIcon.style.color = colors.highlight;
          depIcon.style.opacity = '0.8';
          depIcon.style.marginRight = '4px';
          
          if (hasOutgoing && hasIncoming) {
            depIcon.textContent = 'share';
            depIcon.title = 'Has dependencies (both directions)';
          } else if (hasOutgoing) {
            depIcon.textContent = 'call_made';
            depIcon.title = 'Depends on other items';
          } else {
            depIcon.textContent = 'call_received';
            depIcon.title = 'Other items depend on this';
          }
          
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
        
        // Function to create initiative context menu items
        const createInitiativeMenuItems = (e) => {
          const isActiveScenario = item.scenarioId === state.activeScenarioId;
          const items = [];
          
          // Only show add child option for non-Story and non-Milestone items
          if (item.level !== 'Story' && !item.isMilestone) {
            const nextLevel = item.level === 'Initiative' ? 'Epic' : 'Story';
            const nextLevelName = window.WhatIfDeliveredModel.getLevelName(state, nextLevel);
            items.push({
              label: `Add Child ${nextLevelName}`,
              icon: 'add',
              action: () => {
                const id = window.WhatIfDeliveredModel.addInitiative(state, { name: 'New ' + nextLevelName, start: item.start, end: item.end, parentId: item.id, level: nextLevel, size: 'M' });
                renderHierarchy();
                window.dispatchEvent(new Event('pf-refresh'));
              },
              disabled: !isActiveScenario
            });
          }
          
          items.push({
            label: 'Delete',
            icon: 'remove',
            action: () => {
              window.WhatIfDeliveredModel.deleteInitiative(state, item.id);
              renderHierarchy();
              renderDetails();
              window.dispatchEvent(new Event('pf-refresh'));
            },
            disabled: !isActiveScenario
          });
          
          return items;
        };
        
        // Add right-click context menu for initiatives
        d.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const items = createInitiativeMenuItems(e);
          showContextMenu(e, items);
        });

        // Drag & Drop logic within scenario
        let dragData = null;
        dragHandle.draggable = true;
        dragHandle.addEventListener('dragstart', (ev) => {
          dragData = { id: item.id };
          ev.dataTransfer.setData('text/plain', item.id);
          ev.dataTransfer.effectAllowed = 'move';
        });
        d.addEventListener('dragover', (ev) => {
          ev.preventDefault();
          const rect = d.getBoundingClientRect();
          const y = ev.clientY - rect.top;
          const before = y < rect.height / 2; // top half: insert before; bottom half: insert after
          d.classList.add('drop-target-highlight');
          d.classList.toggle('drop-indicator-before', !ev.ctrlKey && !ev.shiftKey && !allowAsParent && before);
          d.classList.toggle('drop-indicator-after', !ev.ctrlKey && !ev.shiftKey && !allowAsParent && !before);
          ev.dataTransfer.dropEffect = 'move';
        });
        d.addEventListener('dragleave', () => { d.classList.remove('drop-target-highlight','drop-indicator-before','drop-indicator-after'); });
        d.addEventListener('drop', (ev) => {
          ev.preventDefault(); d.classList.remove('drop-target-highlight');
          d.classList.remove('drop-indicator-before','drop-indicator-after');
          const movedId = dragData ? dragData.id : ev.dataTransfer.getData('text/plain');
          if (!movedId || movedId === item.id) return;
          const moved = window.WhatIfDeliveredModel.getActiveData(state).initiatives.find(i => i.id === movedId);
          if (!moved) return;
          // only allow within same scenario
          if (moved.scenarioId !== item.scenarioId) return;
          // Decide target: half-split for precise before/after; full on parent when allowed with Ctrl key or default when over icon area
          const rect = d.getBoundingClientRect();
          const y = ev.clientY - rect.top;
          const leftPad = 28; // drag handle/indent region
          const isOverIndent = (ev.clientX - rect.left) < leftPad;
          const insertBefore = y < rect.height / 2;
          const allowAsParent = item.level !== 'Story' && !item.isMilestone;
          let success = false;
          if (allowAsParent && (ev.ctrlKey || ev.metaKey || isOverIndent)) {
            // make child if modifier pressed or cursor over indent/handle zone
            success = window.WhatIfDeliveredModel.moveInitiativeWithinScenario(state, movedId, item.id, null);
          } else {
            // reorder among siblings
            success = window.WhatIfDeliveredModel.moveInitiativeWithinScenario(state, movedId, item.parentId, insertBefore ? item.id : null);
          }
          if (success) { renderHierarchy(); window.dispatchEvent(new Event('pf-refresh')); }
        });
        
        d.appendChild(left);
        
        // Add context menu indicator (three dots icon)
        const contextMenuIndicator = document.createElement('span');
        contextMenuIndicator.className = 'context-menu-indicator material-icons';
        contextMenuIndicator.textContent = 'more_vert';
        contextMenuIndicator.title = 'Click for more options';
        
        // Add click event to indicator to open context menu
        contextMenuIndicator.addEventListener('click', (e) => {
          e.stopPropagation();
          const items = createInitiativeMenuItems(e);
          showContextMenu(e, items);
        });
        
        d.appendChild(contextMenuIndicator);
        const wrap = document.createElement('div'); wrap.appendChild(d);
        
        // Only render children if the item is expanded
        const isExpanded = window.WhatIfDeliveredModel.isExpanded(state, item.id);
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
        const data = window.WhatIfDeliveredModel.getActiveData(state);
        const item = data.initiatives.find(i => i.id === sel.id); if (!item) return;

        // helpers
        const group = (title) => { const g = document.createElement('div'); g.className = 'details-group'; if (title){ const h = document.createElement('div'); h.className = 'group-title'; h.textContent = title; g.appendChild(h);} return g; };
        const grid = () => { const wrap = document.createElement('div'); wrap.className = 'field-grid'; return wrap; };

        // Basic section
        const basic = group('Basic');
        const basicGrid = grid();
        basicGrid.appendChild(field('Name', item.name, (v)=>{ item.name=v; renderHierarchy(); window.dispatchEvent(new Event('pf-refresh')); }));
        basic.appendChild(basicGrid);

        // Type segmented and Size
        const typeSizeGrid = grid();
        const typeWrap = document.createElement('div'); typeWrap.className = 'details-field';
        const typeLabel = document.createElement('label'); typeLabel.textContent = 'Type';
        const seg = document.createElement('div'); seg.className = 'segmented';
        const btnTask = document.createElement('button'); btnTask.type = 'button'; btnTask.textContent = 'Task';
        const btnMilestone = document.createElement('button'); btnMilestone.type = 'button'; btnMilestone.textContent = 'Milestone';
        const setTypeUI = () => { btnTask.classList.toggle('active', !item.isMilestone); btnMilestone.classList.toggle('active', !!item.isMilestone); };
        setTypeUI();
        btnTask.addEventListener('click', () => { if (item.isMilestone){ item.isMilestone = false; if (item.end < item.start) item.end = item.start; window.dispatchEvent(new Event('pf-refresh')); renderDetails(); } });
        btnMilestone.addEventListener('click', () => { if (!item.isMilestone){ item.isMilestone = true; item.end = item.start; item.length = 1; window.dispatchEvent(new Event('pf-refresh')); renderDetails(); } });
        seg.appendChild(btnTask); seg.appendChild(btnMilestone);
        typeWrap.appendChild(typeLabel); typeWrap.appendChild(seg);

        const sizeWrap = document.createElement('div'); sizeWrap.className = 'details-field';
        const sizeLabel = document.createElement('label'); sizeLabel.textContent = 'Size';
        const sizeSel = document.createElement('select');
        ;['XS','S','M','L','XL','XXL','infinit'].forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; if (item.size===s) o.selected=true; sizeSel.appendChild(o); });
        sizeSel.addEventListener('change', ()=>{ item.size=sizeSel.value; window.dispatchEvent(new Event('pf-refresh')); });
        sizeWrap.appendChild(sizeLabel); sizeWrap.appendChild(sizeSel);

        typeSizeGrid.appendChild(typeWrap);
        typeSizeGrid.appendChild(sizeWrap);
        basic.appendChild(typeSizeGrid);
        panel.appendChild(basic);

        // Schedule section
        const schedule = group('Schedule');
        const scheduleGrid = grid();
        if (item.isMilestone) {
          scheduleGrid.appendChild(field('Target Date', item.start, (v)=>{ window.WhatIfDeliveredModel.moveItem(state, item.id, { start: v, end: v }); window.dispatchEvent(new Event('pf-refresh')); }, 'date'));
        } else {
          scheduleGrid.appendChild(field('Start', item.start, (v)=>{ window.WhatIfDeliveredModel.moveItem(state, item.id, { start: v, end: item.end }); window.dispatchEvent(new Event('pf-refresh')); }, 'date'));
          scheduleGrid.appendChild(field('End', item.end, (v)=>{ window.WhatIfDeliveredModel.moveItem(state, item.id, { start: item.start, end: v }); window.dispatchEvent(new Event('pf-refresh')); }, 'date'));
        }
        const lengthWrap = document.createElement('div'); lengthWrap.className = 'details-field';
        const lengthLabel = document.createElement('label'); lengthLabel.textContent = 'Length';
        lengthWrap.appendChild(lengthLabel);
        if (item.isMilestone) {
          const pill = document.createElement('div'); pill.className = 'pill'; pill.textContent = '1 day';
          lengthWrap.appendChild(pill);
        } else {
          const lengthInput = document.createElement('input'); lengthInput.type = 'text';
          lengthInput.placeholder = 'e.g., 10, 3w, 2m';
          // Display inclusive length (days) so entering N stays N
          const currentLen = Math.max(1, Math.round((new Date(item.end) - new Date(item.start)) / 86400000) + 1);
          lengthInput.value = String(currentLen);
          const note = document.createElement('div'); note.style.fontSize = '11px'; note.style.color = getCSSVar('--color-text-muted');
          note.textContent = 'Accepts days (10), weeks (3w), months (2m) — converts to days.';

          function parseDays(val) {
            if (!val) return null;
            const m = String(val).trim().match(/^(\d+)\s*([wWdDmM]?)$/);
            if (!m) return null;
            const num = parseInt(m[1], 10);
            const unit = (m[2] || 'd').toLowerCase();
            if (num <= 0) return null;
            if (unit === 'w') return num * 7;
            if (unit === 'm') return num * 28; // 4 weeks per month
            return num; // days
          }

          function applyLengthChange() {
            const days = parseDays(lengthInput.value);
            if (!days) { lengthInput.value = String(item.length || currentLen); return; }
            const newEnd = window.WhatIfDeliveredModel.addDays(item.start, days - 1);
            window.WhatIfDeliveredModel.moveItem(state, item.id, { start: item.start, end: newEnd });
            window.dispatchEvent(new Event('pf-refresh'));
            renderDetails();
          }

          lengthInput.addEventListener('change', applyLengthChange);
          lengthInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyLengthChange(); });
          lengthWrap.appendChild(lengthInput);
          lengthWrap.appendChild(note);
        }
        schedule.appendChild(scheduleGrid);
        schedule.appendChild(lengthWrap);
        panel.appendChild(schedule);

        // Structure section
        const nextLevel = item.level === 'Initiative' ? 'Epic' : item.level === 'Epic' ? 'Story' : null;
        if (!item.isMilestone && nextLevel) {
          const structure = group('Structure');
          const addChildBtn = document.createElement('button'); addChildBtn.innerHTML = '<span class="material-icons">add</span>Add Child';
          addChildBtn.addEventListener('click', () => {
            const id = window.WhatIfDeliveredModel.addInitiative(state, { name: 'New ' + window.WhatIfDeliveredModel.getLevelName(state, nextLevel), start: item.start, end: item.end, parentId: item.id, level: nextLevel, size: 'M' });
            state.selection = { type: 'initiative', id };
            renderHierarchy(); renderDetails(); window.dispatchEvent(new Event('pf-refresh')); window.dispatchEvent(new Event('pf-selection-change'));
          });
          structure.appendChild(addChildBtn);
          panel.appendChild(structure);
        }

        // Dependencies section
        const deps = group('Dependencies');
        const existingDeps = data.dependencies.filter(d => d.fromId === item.id || d.toId === item.id);
        const chipsRow = document.createElement('div'); chipsRow.className = 'chips';
        existingDeps.forEach(dep => {
          const otherId = dep.fromId === item.id ? dep.toId : dep.fromId;
          const depItem = data.initiatives.find(i => i.id === otherId);
          const chip = document.createElement('span'); chip.className = 'chip';
          const icon = document.createElement('span'); icon.className = 'material-symbols-outlined'; icon.textContent = dep.fromId === item.id ? 'call_made' : 'call_received';
          const label = document.createElement('span'); label.textContent = depItem ? depItem.name : 'Unknown';
          const remove = document.createElement('button'); remove.className = 'chip-remove'; remove.type = 'button'; remove.textContent = '×'; remove.title = 'Remove';
          remove.addEventListener('click', () => { window.WhatIfDeliveredModel.unlinkDependency(state, dep.fromId, dep.toId); window.dispatchEvent(new Event('pf-refresh')); renderDetails(); });
          chip.appendChild(icon); chip.appendChild(label); chip.appendChild(remove); chipsRow.appendChild(chip);
        });
        deps.appendChild(chipsRow);
        const addDepWrap = document.createElement('div'); addDepWrap.className = 'dep-add';
        const depSelect = document.createElement('select'); depSelect.className = 'dep-select';
        const opt0 = document.createElement('option'); opt0.value = ''; opt0.textContent = 'Depends on…'; depSelect.appendChild(opt0);
        const allItems = data.initiatives.filter(i => i.id !== item.id && i.scenarioId === state.activeScenarioId);
        const children = data.initiatives.filter(i => i.parentId === item.id);
        const availableItems = allItems.filter(i => !children.some(c => c.id === i.id));
        availableItems.forEach(otherItem => { const option = document.createElement('option'); option.value = otherItem.id; option.textContent = otherItem.name; depSelect.appendChild(option); });
        const addBtn = document.createElement('button'); addBtn.type = 'button'; addBtn.className = 'icon'; addBtn.innerHTML = '<span class="material-icons">add</span>';
        addBtn.disabled = true;
        depSelect.addEventListener('change', () => { addBtn.disabled = !depSelect.value; });
        addBtn.addEventListener('click', () => { if (depSelect.value){ window.WhatIfDeliveredModel.linkDependency(state, item.id, depSelect.value); window.dispatchEvent(new Event('pf-refresh')); renderDetails(); }});
        addDepWrap.appendChild(depSelect); addDepWrap.appendChild(addBtn); deps.appendChild(addDepWrap);
        panel.appendChild(deps);

        // More: Description (collapsed)
        const more = document.createElement('details'); more.className = 'details-collapse';
        const sum = document.createElement('summary'); sum.textContent = 'Description'; more.appendChild(sum);
        const descWrap = document.createElement('div'); descWrap.className = 'details-field';
        const descTextarea = document.createElement('textarea'); descTextarea.value = item.description || ''; descTextarea.rows = 4; descTextarea.addEventListener('input', () => { item.description = descTextarea.value; window.dispatchEvent(new Event('pf-refresh')); });
        descWrap.appendChild(descTextarea); more.appendChild(descWrap); panel.appendChild(more);
      }
      if (sel.type === 'scenario'){
        const s = state.scenarios.find(x => x.id === sel.id); if (!s) return;
        panel.appendChild(field('Scenario Name', s.name, (v)=>{ s.name=v; renderHierarchy(); window.dispatchEvent(new Event('pf-refresh')); }));
        const descWrap = document.createElement('div'); descWrap.className = 'details-field';
        const descLabel = document.createElement('label'); descLabel.textContent = 'Description'; descWrap.appendChild(descLabel);
        const descTextarea = document.createElement('textarea'); 
        descTextarea.value = s.description || '';
        descTextarea.rows = 4;
        descTextarea.addEventListener('input', () => { s.description = descTextarea.value; window.dispatchEvent(new Event('pf-refresh')); });
        descWrap.appendChild(descTextarea);
        panel.appendChild(descWrap);
        const dataS = s.data;
        if (dataS.initiatives.length > 0) {
          const start = dataS.initiatives.reduce((min, i) => i.start < min ? i.start : min, dataS.initiatives[0].start);
          const end = dataS.initiatives.reduce((max, i) => i.end > max ? i.end : max, dataS.initiatives[0].end);
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
          input.style.backgroundColor = colors.panel;
          input.style.color = colors.textMuted;
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

    function showInfoDialog() {
      const dialog = el('info-dialog');
      
      // Populate the dialog content
      const infoContent = el('info-content');
      infoContent.innerHTML = `
        <div style="line-height: 1.8;">
          <h2>About WHAT IF delivered</h2>
          <p>A free, open-source Project Planner with interactive Gantt chart editing capabilities.</p>
          
          <h3>Your Data Is Yours</h3>
          <p>Zero tracking. Zero cookies. Zero servers. WHAT IF delivered works completely offline - just save the HTML file and use it without any internet connection. Your data never leaves your device.</p>
          
          <h3>Key Features</h3>
          <ul>
            <li><strong>Easy to Use:</strong> Intuitive Gantt chart editor for project planning</li>
            <li><strong>Completely Offline:</strong> No installation required, works from a single HTML file</li>
            <li><strong>Your Data is Safe:</strong> No cookies, no 3rd or 2nd party data access, not even planforge.cc accesses your data</li>
            <li><strong>Export to MermaidJS:</strong> Perfect for integrating Gantt charts into your markdown documentation</li>
            <li><strong>Export to JSON:</strong> Easy integration with JIRA and other project management tools</li>
            <li><strong>Scenario Planning:</strong> Create multiple planning scenarios without struggling with different files</li>
            <li><strong>Free & Open Source:</strong> No subscriptions, no hidden costs</li>
          </ul>
          
          <h3>What Makes WHAT IF delivered Different?</h3>
          <p><strong>Scenario Planning:</strong> Unlike other Gantt chart tools, WHAT IF delivered makes it easy to create and switch between multiple project scenarios. No need to juggle different files or struggle with version management.</p>
          
          <h3>Export Options</h3>
          <p>Export your project data to MermaidJS format for seamless integration into your markdown documentation, or export as JSON for easy import into JIRA and other project management platforms.</p>
          
          <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--color-panel);">
            <h4 style="margin-bottom: 1rem; font-size: 14px; color: var(--color-text-muted);">Share WHAT IF delivered</h4>
            <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; margin-bottom: 1.5rem;">
              <a href="#" id="share-twitter" style="color: #1DA1F2; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; padding: 6px 12px; border: 1px solid var(--color-border); border-radius: 6px; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(29, 161, 242, 0.08)'" onmouseout="this.style.background='transparent'">
                <span class="material-symbols-outlined">share</span>
                Share on Twitter
              </a>
              <a href="#" id="share-reddit" style="color: #FF4500; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; padding: 6px 12px; border: 1px solid var(--color-border); border-radius: 6px; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255, 69, 0, 0.08)'" onmouseout="this.style.background='transparent'">
                <span class="material-symbols-outlined">forum</span>
                Share on Reddit
              </a>
              <a href="#" id="share-linkedin" style="color: #0A66C2; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; padding: 6px 12px; border: 1px solid var(--color-border); border-radius: 6px; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(10, 102, 194, 0.08)'" onmouseout="this.style.background='transparent'">
                <span class="material-symbols-outlined">work</span>
                Share on LinkedIn
              </a>
            </div>
            <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--color-panel); display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap;">
              <a href="https://github.com/dil-dabalogh/planforge" target="_blank" rel="noopener noreferrer" style="color: var(--color-primary); text-decoration: none; display: flex; align-items: center; gap: 0.5rem;">
                <span class="material-symbols-outlined">code</span>
                GitHub Repository
              </a>
              <a href="https://www.linkedin.com/in/cinegemadar/" target="_blank" rel="noopener noreferrer" style="color: var(--color-primary); text-decoration: none; display: flex; align-items: center; gap: 0.5rem;">
                <span class="material-symbols-outlined">person</span>
                LinkedIn Profile
              </a>
              <a href="https://buymeacoffee.com/cinegemadar" target="_blank" rel="noopener noreferrer" style="color: var(--color-primary); text-decoration: none; display: flex; align-items: center; gap: 0.5rem;">
                <span class="material-symbols-outlined">favorite</span>
                Buy Me a Coffee
              </a>
            </div>
          </div>
        </div>
      `;
      
      dialog.style.display = 'flex';
      
      // Close dialog handlers
      el('close-info-dialog').addEventListener('click', () => {
        dialog.style.display = 'none';
      });
      
      // Close on overlay click
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          dialog.style.display = 'none';
        }
      });
      
      // Social share handlers
      const shareUrl = encodeURIComponent('https://planforge.cc/');
      const shareText = encodeURIComponent('Check out WHAT IF delivered - A free, open-source Gantt chart editor that works completely offline!');
      
      el('share-twitter').addEventListener('click', (e) => {
        e.preventDefault();
        window.open(`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`, '_blank', 'width=550,height=420');
      });
      
      el('share-reddit').addEventListener('click', (e) => {
        e.preventDefault();
        window.open(`https://www.reddit.com/submit?url=${shareUrl}&title=${shareText}`, '_blank', 'width=800,height=600');
      });
      
      el('share-linkedin').addEventListener('click', (e) => {
        e.preventDefault();
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`, '_blank', 'width=600,height=700');
      });
    }

    function showSettingsDialog() {
      const dialog = el('settings-dialog');
      const settingsContent = el('settings-content');
      
      // Level configuration with order, color, and name
      const levels = [
        { depth: 1, color: '#b8b8d4', name: 'Scenario', canEdit: false },
        { depth: 2, color: '#ff8f8f', name: window.WhatIfDeliveredModel.getLevelName(state, 'Initiative'), canEdit: true, key: 'Initiative' },
        { depth: 3, color: '#b7a3e3', name: window.WhatIfDeliveredModel.getLevelName(state, 'Epic'), canEdit: true, key: 'Epic' },
        { depth: 4, color: '#8ad4e8', name: window.WhatIfDeliveredModel.getLevelName(state, 'Story'), canEdit: true, key: 'Story' }
      ];
      
      let html = '<div style="max-width: 600px;">';
      html += '<p style="margin-bottom: 1.5rem; color: var(--color-text-muted);">Customize the names used for each hierarchy level. Changes will be reflected throughout the application.</p>';
      html += '<div style="display: grid; gap: 0.75rem;">';
      
      levels.forEach(level => {
        html += `<div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-panel);">`;
        html += `<div style="flex: 0 0 60px; text-align: center; font-weight: 600; color: var(--color-text-muted);">${level.depth}</div>`;
        html += `<div style="flex: 0 0 40px; height: 20px; background: ${level.color}; border-radius: 4px; border: 1px solid var(--color-border);"></div>`;
        html += `<input type="text" data-level-key="${level.key || ''}" value="${level.name}" style="flex: 1; padding: 6px 10px; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; ${level.canEdit ? '' : 'opacity: 0.5; cursor: not-allowed;'}" ${level.canEdit ? '' : 'disabled'}>`;
        html += `</div>`;
      });
      
      html += '</div>';
      html += '<div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--color-border); display: flex; gap: 0.5rem; justify-content: flex-end;">';
      html += '<button id="btn-reset-names" style="padding: 8px 16px; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; cursor: pointer;">Reset to Defaults</button>';
      html += '</div>';
      html += '</div>';
      
      settingsContent.innerHTML = html;
      
      // Wire up save functionality
      const inputs = settingsContent.querySelectorAll('input[data-level-key]');
      inputs.forEach(input => {
        const levelKey = input.dataset.levelKey;
        input.addEventListener('change', (e) => {
          if (e.target.value.trim()) {
            window.WhatIfDeliveredModel.updateLevelName(state, levelKey, e.target.value);
            // Refresh the UI
            renderHierarchy();
            renderDetails();
            window.dispatchEvent(new Event('pf-refresh'));
          }
        });
      });
      
      // Reset button
      const resetBtn = settingsContent.querySelector('#btn-reset-names');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          if (confirm('Reset all level names to default values?')) {
            window.WhatIfDeliveredModel.resetLevelNames(state);
            renderHierarchy();
            renderDetails();
            window.dispatchEvent(new Event('pf-refresh'));
            // Close and reopen to show updated names
            showSettingsDialog();
          }
        });
      }
      
      dialog.style.display = 'flex';
      
      // Close dialog handlers
      el('close-settings-dialog').addEventListener('click', () => {
        dialog.style.display = 'none';
      });
      
      // Close on overlay click
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          dialog.style.display = 'none';
        }
      });
    }




    function generateMermaidGantt(state) {
      const data = window.WhatIfDeliveredModel.getActiveData(state);
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
      const nameCounts = new Map();
      
      initiatives.forEach(initiative => {
        // Create a safe name by removing special characters and spaces
        let safeName = initiative.name.replace(/[":\s]/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        
        // Handle duplicate names by adding a counter
        if (nameCounts.has(safeName)) {
          nameCounts.set(safeName, nameCounts.get(safeName) + 1);
          safeName = `${safeName}_${nameCounts.get(safeName)}`;
        } else {
          nameCounts.set(safeName, 1);
        }
        
        // Ensure the name starts with a letter (Mermaid requirement)
        if (!/^[a-zA-Z]/.test(safeName)) {
          safeName = `task_${safeName}`;
        }
        
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
          const levelName = window.WhatIfDeliveredModel.getLevelName(state, level);
          mermaid += `    section ${levelName}s\n`;
          levelInitiatives.forEach(initiative => {
            // Get the safe name from our map
            const safeName = initiativeIdMap.get(initiative.id);
            const displayName = initiative.name; // Keep original name for display
            
            // Check for dependencies - find tasks that this initiative depends on
            const dependencies = data.dependencies.filter(dep => dep.toId === initiative.id);
            
            // Check if it's a single day task (milestone) or multi-day task
            const startDate = new Date(initiative.start);
            const endDate = new Date(initiative.end);
            const isSameDay = startDate.getTime() === endDate.getTime();
            
            if (isSameDay) {
              // Milestone (single day task)
              if (dependencies.length > 0) {
                // Milestones with dependencies can't use :milestone syntax in Mermaid
                // Convert to a 1-day regular task with after syntax
                // Use only the first dependency to avoid parsing errors
                const firstDependencyName = initiativeIdMap.get(dependencies[0].fromId);
                mermaid += `        ${displayName} :${safeName}, after ${firstDependencyName || 'unknown'}, 1d\n`;
              } else {
                // Milestone without dependencies - use milestone syntax
                mermaid += `        ${displayName} :milestone, ${safeName}, ${initiative.start}, 0d\n`;
              }
            } else {
              // Multi-day task
              if (dependencies.length > 0) {
                // Task has dependencies - use after syntax
                const dependencyNames = dependencies.map(dep => {
                  const depName = initiativeIdMap.get(dep.fromId);
                  return depName || 'unknown';
                });
                const duration = Math.max(1, Math.round((endDate - startDate) / 86400000));
                
                // Use only the first dependency to avoid Mermaid parsing errors
                // with multiple dependencies
                mermaid += `        ${displayName} :${safeName}, after ${dependencyNames[0]}, ${duration}d\n`;
              } else {
                // Multi-day task without dependencies
                mermaid += `        ${displayName} :${safeName}, ${initiative.start}, ${initiative.end}\n`;
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
      showInfoDialog,
      onScenarioClone: (cb)=>bindings.scenarioClone.push(cb),
      onExportJSON: (cb)=>bindings.exportJSON.push(cb),
      onImportJSON: (cb)=>bindings.importJSON.push(cb),
      onExportScenario: (cb)=>bindings.exportScenario.push(cb),
      onExportMermaid: (cb)=>bindings.exportMermaid.push(cb),
      onErase: (cb)=>bindings.erase.push(cb)
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

  // Tiny toast helper
  function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = message;
    container.appendChild(t);
    setTimeout(() => { t.remove(); }, 2000);
  }

  return { createUI, pickFile, saveFile, showToast };
})();


