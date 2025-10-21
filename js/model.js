window.PlanForgeModel = (function() {
  function today() { return new Date().toISOString().slice(0,10); }
  function addDays(isoDate, days) {
    const d = new Date(isoDate + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0,10);
  }
  function clampDate(iso) { return iso; }

  function createInitialState() {
    return {
      scenarios: [{ id: 'default', name: 'Baseline', description: '', visible: true, data: emptyData() }],
      activeScenarioId: 'default',
      selection: null
    };
  }
  function emptyData() {
    return { initiatives: [], dependencies: [], calendars: { holidays: [] } };
  }
  function getActiveData(state) {
    return state.scenarios.find(s => s.id === state.activeScenarioId).data;
  }
  function setActiveScenario(state, id) { state.activeScenarioId = id; }
  function renameActiveScenario(state, name) {
    const s = state.scenarios.find(x => x.id === state.activeScenarioId);
    if (s && name && name.trim()) s.name = name.trim();
  }
  function cloneActiveScenario(state) {
    const current = state.scenarios.find(s => s.id === state.activeScenarioId);
    const clone = JSON.parse(JSON.stringify(current));
    clone.id = 'scn_' + Math.random().toString(36).slice(2,8);
    clone.name = current.name + ' Copy';
    clone.visible = true;
    
    console.log('=== CLONING SCENARIO ===');
    console.log('Original scenario:', {
      id: current.id,
      name: current.name,
      initiatives: current.data.initiatives.map(i => ({id: i.id, name: i.name, scenarioId: i.scenarioId})),
      dependencies: current.data.dependencies
    });
    
    // Create mapping of old IDs to new IDs for initiatives
    const idMapping = new Map();
    
    // Generate new unique IDs for all initiatives and update scenarioId
    clone.data.initiatives.forEach(initiative => {
      const oldId = initiative.id;
      const newId = 'itm_' + Math.random().toString(36).slice(2,8);
      initiative.id = newId;
      initiative.scenarioId = clone.id;
      idMapping.set(oldId, newId);
    });
    
    console.log('ID mapping:', Array.from(idMapping.entries()));
    
    // Update parentId references to use new IDs
    clone.data.initiatives.forEach(initiative => {
      if (initiative.parentId && idMapping.has(initiative.parentId)) {
        initiative.parentId = idMapping.get(initiative.parentId);
      }
    });
    
    // Update dependencies to use new IDs and ensure they're scoped to the new scenario
    console.log('Original dependencies:', clone.data.dependencies);
    console.log('ID mapping keys:', Array.from(idMapping.keys()));
    
    clone.data.dependencies = clone.data.dependencies
      .filter(dep => {
        // Only keep dependencies where both fromId and toId exist in the mapping
        const fromIdExists = idMapping.has(dep.fromId);
        const toIdExists = idMapping.has(dep.toId);
        console.log(`Filtering dependency ${dep.fromId} → ${dep.toId}: fromIdExists=${fromIdExists}, toIdExists=${toIdExists}`);
        return fromIdExists && toIdExists;
      })
      .map(dep => {
        const newFromId = idMapping.get(dep.fromId);
        const newToId = idMapping.get(dep.toId);
        
        console.log(`Mapping dependency ${dep.fromId} → ${dep.toId} to ${newFromId} → ${newToId}`);
        
        return {
          fromId: newFromId,
          toId: newToId,
          type: dep.type
        };
      });
    
    console.log('Cloned dependencies:', clone.data.dependencies);
    console.log('Cloned initiatives:', clone.data.initiatives.map(i => ({id: i.id, name: i.name, scenarioId: i.scenarioId})));
    
    state.scenarios.push(clone);
    state.activeScenarioId = clone.id;
    
    console.log('=== CLONING COMPLETE ===');
    console.log('New active scenario ID:', state.activeScenarioId);
    console.log('Total scenarios:', state.scenarios.length);
  }
  function addInitiative(state, { name, start, end, parentId = null, level = 'Initiative', size = 'M', description = '', jiraKey = null, jiraId = null, lastSynced = null }) {
    const data = getActiveData(state);
    const id = 'itm_' + Math.random().toString(36).slice(2,8);
    // prevent children under Story level
    if (parentId) {
      const parent = data.initiatives.find(i => i.id === parentId);
      if (parent && parent.level === 'Story') parentId = parent.id; // keep, but UI should prevent; no deeper levels created
      // enforce child within parent date range
      if (parent) {
        if (start < parent.start) start = parent.start;
        if (end > parent.end) end = parent.end;
        if (end < start) end = start;
      }
    }
    const length = Math.max(1, Math.round((new Date(end) - new Date(start)) / 86400000));
    data.initiatives.push({ 
      id, name, start, end, parentId, level, size, description, 
      scenarioId: state.activeScenarioId, length,
      jiraKey, jiraId, lastSynced
    });
    return id;
  }
  function linkDependency(state, fromId, toId) {
    const data = getActiveData(state);
    if (fromId === toId) return;
    
    // Ensure both items exist in the active scenario
    const fromItem = data.initiatives.find(i => i.id === fromId);
    const toItem = data.initiatives.find(i => i.id === toId);
    
    if (!fromItem || !toItem) return;
    
    // Ensure both items belong to the active scenario
    if (fromItem.scenarioId !== state.activeScenarioId || toItem.scenarioId !== state.activeScenarioId) return;
    
    if (!data.dependencies.some(d => d.fromId === fromId && d.toId === toId)) {
      data.dependencies.push({ fromId, toId, type: 'FS' });
    }
  }
  function unlinkDependency(state, fromId, toId) {
    const data = getActiveData(state);
    
    // Ensure both items exist in the active scenario
    const fromItem = data.initiatives.find(i => i.id === fromId);
    const toItem = data.initiatives.find(i => i.id === toId);
    
    if (!fromItem || !toItem) return;
    
    // Ensure both items belong to the active scenario
    if (fromItem.scenarioId !== state.activeScenarioId || toItem.scenarioId !== state.activeScenarioId) return;
    
    data.dependencies = data.dependencies.filter(d => !(d.fromId === fromId && d.toId === toId));
  }
  function moveItem(state, id, { start, end }) {
    const data = getActiveData(state);
    const item = data.initiatives.find(i => i.id === id);
    if (!item) return;
    // enforce child stays within parent range
    const parent = item.parentId ? data.initiatives.find(i => i.id === item.parentId) : null;
    let newStart = clampDate(start);
    let newEnd = clampDate(end);
    if (parent) {
      if (newStart < parent.start) newStart = parent.start;
      if (newEnd > parent.end) newEnd = parent.end;
      if (newEnd < newStart) newEnd = newStart;
    }
    // enforce parent cannot violate children ranges
    const children = data.initiatives.filter(i => i.parentId === item.id);
    if (children.length) {
      const minChildStart = children.reduce((min, c) => c.start < min ? c.start : min, children[0].start);
      const maxChildEnd = children.reduce((max, c) => c.end > max ? c.end : max, children[0].end);
      if (newStart > minChildStart) newStart = minChildStart;
      if (newEnd < maxChildEnd) newEnd = maxChildEnd;
      if (newEnd < newStart) newEnd = newStart;
    }
    item.start = newStart;
    item.end = newEnd;
    item.length = Math.max(1, Math.round((new Date(newEnd) - new Date(newStart)) / 86400000));
  }

  function moveSubtree(state, rootId, deltaDays) {
    const data = getActiveData(state);
    const root = data.initiatives.find(i => i.id === rootId);
    if (!root || !Number.isFinite(deltaDays) || deltaDays === 0) return 0;
    // collect subtree
    const subtree = [];
    function walk(id){
      const node = data.initiatives.find(i => i.id === id);
      if (!node) return;
      subtree.push(node);
      data.initiatives.filter(i => i.parentId === id).forEach(c => walk(c.id));
    }
    walk(rootId);
    // bounds of subtree
    const minStart = subtree.reduce((min, n) => n.start < min ? n.start : min, subtree[0].start);
    const maxEnd = subtree.reduce((max, n) => n.end > max ? n.end : max, subtree[0].end);
    // clamp delta to ancestor bounds (root's parent)
    const parent = root.parentId ? data.initiatives.find(i => i.id === root.parentId) : null;
    let applied = deltaDays;
    if (parent) {
      // allowed delta so subtree remains within parent after shift
      // lower: parent.start - subtree.minStart, upper: parent.end - subtree.maxEnd
      const minDelta = daysBetween(minStart, parent.start);
      const maxDelta = daysBetween(maxEnd, parent.end);
      if (applied < minDelta) applied = minDelta;
      if (applied > maxDelta) applied = maxDelta;
    }
    // apply shift
    subtree.forEach(n => {
      n.start = addDays(n.start, applied);
      n.end = addDays(n.end, applied);
      n.length = Math.max(1, Math.round((new Date(n.end) - new Date(n.start)) / 86400000));
    });
    return applied;
  }

  function daysBetween(aIso, bIso) {
    const a = new Date(aIso + 'T00:00:00Z');
    const b = new Date(bIso + 'T00:00:00Z');
    return Math.round((b - a) / 86400000);
  }

  function deleteInitiative(state, id) {
    const data = getActiveData(state);
    // delete children first (DFS)
    const children = data.initiatives.filter(i => i.parentId === id);
    children.forEach(c => deleteInitiative(state, c.id));
    // remove dependencies involving this id
    data.dependencies = data.dependencies.filter(d => d.fromId !== id && d.toId !== id);
    // remove the initiative itself
    data.initiatives = data.initiatives.filter(i => i.id !== id);
    // clear selection if needed
    if (state.selection && state.selection.type === 'initiative' && state.selection.id === id) state.selection = null;
  }

  function loadState(state, next) {
    state.scenarios = next.scenarios;
    state.activeScenarioId = next.activeScenarioId;
    state.selection = null;
  }

  function updateJiraLinkedElement(state, elementId, jiraData) {
    const data = getActiveData(state);
    const element = data.initiatives.find(i => i.id === elementId);
    if (!element) return false;
    
    // Update element with JIRA data
    element.name = jiraData.name || element.name;
    element.description = jiraData.description || element.description;
    element.jiraKey = jiraData.jiraKey;
    element.jiraId = jiraData.jiraId;
    element.lastSynced = new Date().toISOString();
    
    return true;
  }

  function unlinkJiraElement(state, elementId) {
    const data = getActiveData(state);
    const element = data.initiatives.find(i => i.id === elementId);
    if (!element) return false;
    
    // Remove JIRA fields
    delete element.jiraKey;
    delete element.jiraId;
    delete element.lastSynced;
    
    return true;
  }

  function getJiraLinkedElements(state) {
    const data = getActiveData(state);
    return data.initiatives.filter(i => i.jiraKey);
  }

  function seedDemo(state) {
    const now = today();
    const d = getActiveData(state);
    const i1 = addInitiative(state, { name: 'Initiative A', start: now, end: addDays(now, 10), level: 'Initiative', size: 'L' });
    const e1 = addInitiative(state, { name: 'Epic A1', start: addDays(now, 1), end: addDays(now, 6), parentId: i1, level: 'Epic', size: 'M' });
    const s1 = addInitiative(state, { name: 'Story A1-1', start: addDays(now, 2), end: addDays(now, 4), parentId: e1, level: 'Story', size: 'S' });
    linkDependency(state, s1, e1);
  }

  return {
    today, addDays,
    createInitialState, emptyData, getActiveData,
    setActiveScenario, cloneActiveScenario, renameActiveScenario,
    addInitiative, linkDependency, unlinkDependency, moveItem, moveSubtree, deleteInitiative,
    loadState, seedDemo,
    updateJiraLinkedElement, unlinkJiraElement, getJiraLinkedElements
  };
})();


