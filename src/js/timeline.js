window.PlanForgeTimeline = (function() {
  function create(state, canvas) {
    const ctx = canvas.getContext('2d');
    const layout = { rowHeight: 28, rowGap: 8, header: 60, leftPad: 120 };
    
    // Timeline configuration
    let timelineConfig = {
      start: window.PlanForgeModel.addDays(window.PlanForgeModel.today(), -180), // 6 months ago
      end: window.PlanForgeModel.addDays(window.PlanForgeModel.today(), 180), // 6 months from now
      zoomLevel: 2 // 0=Year, 1=Quarter, 2=Month, 3=Week, 4=Day
    };

    // Zoom level mapping
    const zoomLevels = [
      { name: 'Year', granularity: 'year', pixelsPerUnit: 200, daysPerUnit: 365 },
      { name: 'Quarter', granularity: 'quarter', pixelsPerUnit: 150, daysPerUnit: 90 },
      { name: 'Month', granularity: 'month', pixelsPerUnit: 100, daysPerUnit: 30 },
      { name: 'Week', granularity: 'week', pixelsPerUnit: 80, daysPerUnit: 7 },
      { name: 'Day', granularity: 'day', pixelsPerUnit: 40, daysPerUnit: 1 }
    ];

    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const container = canvas.parentElement;
      const rect = container.getBoundingClientRect();
      
      // Calculate canvas width based on timeline span and granularity
      // Ensure minimum timeline span to prevent empty space
      const userDaysSpan = Math.round((new Date(timelineConfig.end) - new Date(timelineConfig.start)) / 86400000);
      const minDaysSpan = getMinimumTimelineSpan();
      const daysSpan = Math.max(minDaysSpan, userDaysSpan);
      
      const pixelsPerUnit = getPixelsPerUnit();
      const contentWidthCss = layout.leftPad + (daysSpan / getDaysPerUnit()) * pixelsPerUnit + 200;
      
      // Ensure canvas fills the container width, but not less than content width
      const containerWidth = rect.width;
      const finalWidth = Math.max(contentWidthCss, containerWidth);
      
      canvas.style.width = finalWidth + 'px';
      canvas.style.height = Math.max(400, rect.height) + 'px';
      canvas.width = finalWidth * dpr;
      canvas.height = Math.max(400, rect.height) * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    
    function getMinimumTimelineSpan() {
      // Define minimum timeline span based on zoom level to ensure meaningful content
      const currentZoom = getCurrentZoomLevel();
      switch (currentZoom.granularity) {
        case 'year': return 365; // At least 1 year
        case 'quarter': return 90; // At least 1 quarter
        case 'month': return 60; // At least 2 months
        case 'week': return 28; // At least 4 weeks
        case 'day': return 14; // At least 2 weeks
        default: return 60; // Default to 2 months
      }
    }
    
    function ensureMinimumTimelineSpan() {
      const userDaysSpan = Math.round((new Date(timelineConfig.end) - new Date(timelineConfig.start)) / 86400000);
      const minDaysSpan = getMinimumTimelineSpan();
      
      if (userDaysSpan < minDaysSpan) {
        // Extend the end date to meet minimum span
        const newEndDate = new Date(timelineConfig.start);
        newEndDate.setUTCDate(newEndDate.getUTCDate() + minDaysSpan);
        timelineConfig.end = newEndDate.toISOString().slice(0, 10);
        
        // Update the UI input to reflect the change
        const endInput = document.getElementById('timeline-end');
        if (endInput) {
          endInput.value = timelineConfig.end;
        }
      }
    }

    function getCurrentZoomLevel() {
      return zoomLevels[timelineConfig.zoomLevel];
    }

    function getPixelsPerUnit() {
      return getCurrentZoomLevel().pixelsPerUnit;
    }

    function getDaysPerUnit() {
      return getCurrentZoomLevel().daysPerUnit;
    }

    function dateToX(iso) {
      const d = new Date(iso + 'T00:00:00Z');
      const timelineStart = new Date(timelineConfig.start + 'T00:00:00Z');
      const diffDays = Math.floor((d - timelineStart) / 86400000);
      const pixelsPerUnit = getPixelsPerUnit();
      const daysPerUnit = getDaysPerUnit();
      return layout.leftPad + (diffDays / daysPerUnit) * pixelsPerUnit;
    }
    function xToDate(x) {
      const timelineStart = new Date(timelineConfig.start + 'T00:00:00Z');
      const pixelsPerUnit = getPixelsPerUnit();
      const daysPerUnit = getDaysPerUnit();
      const units = (x - layout.leftPad) / pixelsPerUnit;
      const days = Math.round(units * daysPerUnit);
      const d = new Date(timelineStart);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0,10);
    }

    function renderGrid() {
      const { width, height } = canvas;
      ctx.clearRect(0,0,width,height);
      ctx.fillStyle = '#0e1326';
      ctx.fillRect(0,0,width,height);
      
      // Render timeline units based on granularity
      const pixelsPerUnit = getPixelsPerUnit();
      const timelineStart = new Date(timelineConfig.start + 'T00:00:00Z');
      const timelineEnd = new Date(timelineConfig.end + 'T00:00:00Z');
      
      ctx.strokeStyle = '#2a3154';
      ctx.lineWidth = 1;
      
      // Draw vertical grid lines across the full canvas width
      for (let x = layout.leftPad; x < width; x += pixelsPerUnit) {
        ctx.beginPath(); 
        ctx.moveTo(x, 0); 
        ctx.lineTo(x, height); 
        ctx.stroke();
      }
      
      // header background
      ctx.fillStyle = '#11162c';
      ctx.fillRect(0, 0, width, layout.header);
      
      // left panel separator
      ctx.strokeStyle = '#2a3154';
      ctx.beginPath(); 
      ctx.moveTo(layout.leftPad, 0); 
      ctx.lineTo(layout.leftPad, height); 
      ctx.stroke();
      
      // Draw today indicator line
      renderTodayIndicator();
      
      renderHeaderLabels();
    }

    function renderTodayIndicator() {
      const { width, height } = canvas;
      const today = window.PlanForgeModel.today();
      const timelineStart = new Date(timelineConfig.start + 'T00:00:00Z');
      const timelineEnd = new Date(timelineConfig.end + 'T00:00:00Z');
      
      // Only draw today indicator if today is within the visible timeline range
      if (today >= timelineConfig.start && today <= timelineConfig.end) {
        const todayX = dateToX(today);
        
        // Draw thin red vertical line for today
        ctx.strokeStyle = '#ef4444'; // Red color
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(todayX, 0);
        ctx.lineTo(todayX, height);
        ctx.stroke();
        
        // Add a small "Today" label at the top
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Today', todayX, 8);
      }
    }

    function renderHeaderLabels() {
      const { width } = canvas;
      const timelineStart = new Date(timelineConfig.start + 'T00:00:00Z');
      const timelineEnd = new Date(timelineConfig.end + 'T00:00:00Z');
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Render hierarchical time labels based on zoom level
      const currentZoom = getCurrentZoomLevel();
      
      // Always show years (top level)
      renderYearLabels(timelineStart, timelineEnd, width);
      
      // Show quarters if zoomed in enough
      if (timelineConfig.zoomLevel >= 1) {
        renderQuarterLabels(timelineStart, timelineEnd, width);
      }
      
      // Show months if zoomed in enough
      if (timelineConfig.zoomLevel >= 2) {
        renderMonthLabels(timelineStart, timelineEnd, width);
      }
      
      // Show weeks if zoomed in enough
      if (timelineConfig.zoomLevel >= 3) {
        renderWeekLabels(timelineStart, timelineEnd, width);
      }
      
      // Show days if zoomed in enough
      if (timelineConfig.zoomLevel >= 4) {
        renderDayLabels(timelineStart, timelineEnd, width);
      }
    }

    function renderYearLabels(start, end, width) {
      ctx.fillStyle = '#6aa4ff';
      ctx.font = 'bold 13px system-ui';
      
      const current = new Date(start);
      current.setUTCMonth(0, 1); // Start of year
      
      while (current <= end) {
        const x = dateToX(current.toISOString().slice(0,10));
        if (x >= layout.leftPad && x <= width) {
          const year = current.getUTCFullYear();
          ctx.fillText(year.toString(), x, 12);
          
          // Draw year separator line
          ctx.strokeStyle = '#6aa4ff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, layout.header);
          ctx.stroke();
        }
        current.setUTCFullYear(current.getUTCFullYear() + 1);
      }
    }

    function renderQuarterLabels(start, end, width) {
      ctx.fillStyle = '#8bd7a0';
      ctx.font = '12px system-ui';
      
      const current = new Date(start);
      // Align to quarter start
      const quarterStart = Math.floor(current.getUTCMonth() / 3) * 3;
      current.setUTCMonth(quarterStart, 1);
      
      while (current <= end) {
        const x = dateToX(current.toISOString().slice(0,10));
        if (x >= layout.leftPad && x <= width) {
          const quarter = Math.floor(current.getUTCMonth() / 3) + 1;
          ctx.fillText(`Q${quarter}`, x, 25);
          
          // Draw quarter separator line
          ctx.strokeStyle = '#8bd7a0';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, 18);
          ctx.lineTo(x, layout.header);
          ctx.stroke();
        }
        current.setUTCMonth(current.getUTCMonth() + 3);
      }
    }

    function renderMonthLabels(start, end, width) {
      ctx.fillStyle = '#ffb86c';
      ctx.font = '11px system-ui';
      
      const current = new Date(start);
      current.setUTCDate(1); // Start of month
      
      while (current <= end) {
        const x = dateToX(current.toISOString().slice(0,10));
        if (x >= layout.leftPad && x <= width) {
          const monthName = current.toLocaleDateString('en', { month: 'short' });
          ctx.fillText(monthName, x, 38);
          
          // Draw month separator line
          ctx.strokeStyle = '#ffb86c';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, 30);
          ctx.lineTo(x, layout.header);
          ctx.stroke();
        }
        current.setUTCMonth(current.getUTCMonth() + 1);
      }
    }

    function renderWeekLabels(start, end, width) {
      ctx.fillStyle = '#ff79c6';
      ctx.font = '10px system-ui';
      
      const current = new Date(start);
      // Align to week start (Monday)
      const dayOfWeek = current.getUTCDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      current.setUTCDate(current.getUTCDate() - daysToMonday);
      
      while (current <= end) {
        const x = dateToX(current.toISOString().slice(0,10));
        if (x >= layout.leftPad && x <= width) {
          const weekNum = getWeekNumber(current);
          ctx.fillText(`W${weekNum}`, x, 51);
          
          // Draw week separator line
          ctx.strokeStyle = '#ff79c6';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(x, 43);
          ctx.lineTo(x, layout.header);
          ctx.stroke();
        }
        current.setUTCDate(current.getUTCDate() + 7);
      }
    }

    function renderDayLabels(start, end, width) {
      ctx.fillStyle = '#9aa4c3';
      ctx.font = '9px system-ui';
      
      const current = new Date(start);
      
      while (current <= end) {
        const x = dateToX(current.toISOString().slice(0,10));
        if (x >= layout.leftPad && x <= width) {
          const day = current.getUTCDate();
          ctx.fillText(day.toString(), x, 58);
          
          // Draw day separator line
          ctx.strokeStyle = '#9aa4c3';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(x, 50);
          ctx.lineTo(x, layout.header);
          ctx.stroke();
        }
        current.setUTCDate(current.getUTCDate() + 1);
      }
    }


    function getWeekNumber(date) {
      const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    }

    function getRows() {
      const rows = [];
      state.scenarios.filter(s => s.visible).forEach(scenario => {
        const data = scenario.data;
        const roots = data.initiatives.filter(i => !i.parentId && i.scenarioId === scenario.id);
        
        // Add scenario row first
        if (roots.length > 0) {
          const scenarioStart = roots.reduce((min, r) => r.start < min ? r.start : min, roots[0].start);
          const scenarioEnd = roots.reduce((max, r) => r.end > max ? r.end : max, roots[0].end);
          // Find all children to get full date range
          const allItems = data.initiatives.filter(i => i.scenarioId === scenario.id);
          const fullStart = allItems.reduce((min, i) => i.start < min ? i.start : min, allItems[0].start);
          const fullEnd = allItems.reduce((max, i) => i.end > max ? i.end : max, allItems[0].end);
          
          rows.push({ 
            item: { 
              id: scenario.id, 
              name: scenario.name, 
              start: fullStart, 
              end: fullEnd, 
              level: 'Scenario',
              scenarioId: scenario.id 
            }, 
            depth: 0, 
            scenarioId: scenario.id,
            isScenario: true 
          });
        }
        
        // Add work items with increased depth
        function walk(item, depth){ 
          rows.push({ item, depth: depth + 1, scenarioId: scenario.id, isScenario: false }); 
          data.initiatives.filter(c => c.parentId === item.id).forEach(c => walk(c, depth+2)); 
        }
        roots.forEach(r => walk(r, 0));
      });
      return rows;
    }

    function drawRhombus(ctx, centerX, centerY, width, height) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - height); // top
      ctx.lineTo(centerX + width, centerY);   // right
      ctx.lineTo(centerX, centerY + height); // bottom
      ctx.lineTo(centerX - width, centerY);  // left
      ctx.closePath();
      ctx.fill();
    }

    function renderItems() {
      const rows = getRows();
      const barHeight = 18;
      ctx.font = '12px system-ui';
      rows.forEach(({ item, depth, scenarioId, isScenario }, idx) => {
        const y = layout.header + idx * (layout.rowHeight + layout.rowGap);
        // row label - don't show text for milestones
        if (!item.isMilestone) {
          ctx.fillStyle = '#9aa4c3';
          ctx.fillText(''.padStart(depth*2, ' ') + item.name, 8, y + 14);
        }
        // bar
        const x1 = dateToX(item.start);
        const x2 = dateToX(item.end);
        const w = Math.max(10, x2 - x1);
        
        // Check if this item is currently selected (active element) - same logic as renderDetails()
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
        
        // Draw selection highlight background if selected
        if (isSelected) {
          ctx.fillStyle = 'rgba(106,164,255,0.15)';
          ctx.fillRect(x1 - 2, y + 2, w + 4, barHeight + 4);
        }
        
        ctx.fillStyle = barColor(item.level, scenarioId, isScenario, item.isMilestone);
        
        // Draw rhombus shape for milestones, rectangle for regular items
        if (item.isMilestone) {
          drawRhombus(ctx, x1 + w/2, y + 4 + barHeight/2, w/2, barHeight/2);
        } else {
          ctx.fillRect(x1, y + 4, w, barHeight);
        }
        
        // handles (only for non-scenario, non-milestone items) - draw first
        if (!isScenario && !item.isMilestone) {
          ctx.fillStyle = '#d2e3ff';
          ctx.fillRect(x1 - 2, y + 4, 4, barHeight);
          ctx.fillRect(x1 + w - 2, y + 4, 4, barHeight);
        }
        
        // Draw colored borders - left red, right green (drawn last to be visible)
        if (!isScenario && !item.isMilestone) {
          // Left border (red) - very thick and visible
          ctx.strokeStyle = '#ff6a6a';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x1, y + 4);
          ctx.lineTo(x1, y + 4 + barHeight);
          ctx.stroke();
          
          // Right border (green) - very thick and visible
          ctx.strokeStyle = '#8bd7a0';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x1 + w, y + 4);
          ctx.lineTo(x1 + w, y + 4 + barHeight);
          ctx.stroke();
          
          // Draw selection border if selected
          if (isSelected) {
            ctx.strokeStyle = '#6aa4ff';
            ctx.lineWidth = 3;
            ctx.strokeRect(x1 - 1, y + 3, w + 2, barHeight + 2);
          }
        } else if (item.isMilestone) {
          // For milestones, draw a simple border around the rhombus
          ctx.strokeStyle = '#f59e0b'; // Darker yellow for border
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1 + w/2, y + 4);
          ctx.lineTo(x1 + w, y + 4 + barHeight/2);
          ctx.lineTo(x1 + w/2, y + 4 + barHeight);
          ctx.lineTo(x1, y + 4 + barHeight/2);
          ctx.closePath();
          ctx.stroke();
          
          // Draw selection border if selected
          if (isSelected) {
            ctx.strokeStyle = '#6aa4ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x1 + w/2, y + 3);
            ctx.lineTo(x1 + w + 1, y + 3 + barHeight/2);
            ctx.lineTo(x1 + w/2, y + 3 + barHeight + 2);
            ctx.lineTo(x1 - 1, y + 3 + barHeight/2);
            ctx.closePath();
            ctx.stroke();
          }
        } else {
          // For scenarios, use default border or selection border
          if (isSelected) {
            ctx.strokeStyle = '#6aa4ff';
            ctx.lineWidth = 3;
            ctx.strokeRect(x1 - 1, y + 3, w + 2, barHeight + 2);
          } else {
            ctx.strokeStyle = '#2a3154';
            ctx.lineWidth = 1;
            ctx.strokeRect(x1, y + 4, w, barHeight);
          }
        }
        // name on bar - don't show text for milestones
        if (!item.isMilestone) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '11px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const name = item.name;
          const textWidth = ctx.measureText(name).width;
          if (textWidth <= w - 8) {
            ctx.fillText(name, x1 + w/2, y + 4 + barHeight/2);
          } else {
            const ellipsis = '...';
            const ellipsisWidth = ctx.measureText(ellipsis).width;
            let truncated = name;
            while (ctx.measureText(truncated).width > w - 8 - ellipsisWidth && truncated.length > 0) {
              truncated = truncated.slice(0, -1);
            }
            ctx.fillText(truncated + ellipsis, x1 + w/2, y + 4 + barHeight/2);
          }
          ctx.textAlign = 'left';
        }
      });
    }

    function renderDependencies() {
      const rows = getRows();
      const byId = new Map(rows.map((r, idx) => [r.item.id, idx]));
      
      // Render dependencies for each visible scenario separately
      state.scenarios.filter(s => s.visible).forEach(scenario => {
        const scenarioData = scenario.data;
        
        scenarioData.dependencies.forEach(dep => {
          // Only render dependencies within the same scenario
          const fromItem = scenarioData.initiatives.find(i => i.id === dep.fromId);
          const toItem = scenarioData.initiatives.find(i => i.id === dep.toId);
          
          if (!fromItem || !toItem || !byId.has(dep.fromId) || !byId.has(dep.toId)) return;
          
          const from = rows[byId.get(dep.fromId)].item;
          const to = rows[byId.get(dep.toId)].item;
          
          // Double-check that both items belong to the same scenario
          if (from.scenarioId !== scenario.id || to.scenarioId !== scenario.id) return;
          
          const y1 = layout.header + byId.get(dep.fromId) * (layout.rowHeight + layout.rowGap) + 4 + 9;
          const y2 = layout.header + byId.get(dep.toId) * (layout.rowHeight + layout.rowGap) + 4 + 9;
          const x1 = dateToX(from.end);
          const x2 = dateToX(to.start);
          
          // Draw dependency line with enhanced styling
          ctx.strokeStyle = '#8bd7a0';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 3]); // Dashed line for better visibility
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.bezierCurveTo((x1+x2)/2, y1, (x1+x2)/2, y2, x2, y2);
          ctx.stroke();
          ctx.setLineDash([]); // Reset line dash
          
          // Draw arrowhead at the end
          const arrowSize = 6;
          const angle = Math.atan2(y2 - y1, x2 - x1);
          ctx.fillStyle = '#8bd7a0';
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - arrowSize * Math.cos(angle - Math.PI / 6), y2 - arrowSize * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(x2 - arrowSize * Math.cos(angle + Math.PI / 6), y2 - arrowSize * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();
          
          // Draw connection points
          ctx.fillStyle = '#8bd7a0';
          ctx.beginPath();
          ctx.arc(x1, y1, 3, 0, 2 * Math.PI);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x2, y2, 3, 0, 2 * Math.PI);
          ctx.fill();
        });
      });
    }

    function barColor(level, scenarioId, isScenario, isMilestone = false) {
      if (isScenario) return '#9aa4c3'; // grey for scenarios
      if (isMilestone) return '#fbbf24'; // yellow for milestones
      if (level === 'Initiative') return '#6aa4ff'; // blue
      if (level === 'Epic') return '#a06aff'; // purple
      if (level === 'Story') return '#67d38a'; // green
      return '#6aa4ff';
    }

    function render() {
      resizeCanvas();
      renderGrid();
      renderScenarioBar();
      renderItems();
      renderDependencies();
      renderDragConstraints();
      updateZoomToContentButton();
    }
    
    function renderDragConstraints() {
      if (!dragging || !dragging.isConstrained) return;
      
      const { width, height } = canvas;
      
      // Draw constraint indicators
      ctx.strokeStyle = '#ff6a6a';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      // Draw constraint boundaries
      if (dragging.isConstrained) {
        // Left boundary
        ctx.beginPath();
        ctx.moveTo(layout.leftPad, 0);
        ctx.lineTo(layout.leftPad, height);
        ctx.stroke();
        
        // Right boundary
        ctx.beginPath();
        ctx.moveTo(width, 0);
        ctx.lineTo(width, height);
        ctx.stroke();
        
        // Top boundary
        ctx.beginPath();
        ctx.moveTo(0, layout.header);
        ctx.lineTo(width, layout.header);
        ctx.stroke();
        
        // Bottom boundary
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(width, height);
        ctx.stroke();
      }
      
      ctx.setLineDash([]); // Reset line dash
    }
    
    // Ensure timeline highlighting is always synchronized with details panel
    function syncSelectionHighlight() {
      // Force a rerender to ensure highlighting matches current selection
      render();
    }

    function renderScenarioBar() {
      // removed - scenarios now render as boxes in main timeline
    }

    // interactions
    let dragging = null; // { id, mode: 'move'|'start'|'end', offsetX, startDateAtDown, endDateAtDown, appliedDelta }
    let autoScrollInterval = null;

    function autoScrollTimeline(mouseX, containerWidth) {
      if (!dragging) return;
      
      const scrollThreshold = 80; // pixels from edge to trigger scroll
      const scrollSpeed = 12; // pixels per scroll step
      const container = canvas.parentElement;
      
      // Clear existing interval
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
      }
      
      // Check if mouse is near left edge (but not in the left panel area)
      if (mouseX < scrollThreshold && mouseX > layout.leftPad) {
        autoScrollInterval = setInterval(() => {
          const currentScroll = container.scrollLeft;
          if (currentScroll > 0) {
            container.scrollLeft = Math.max(0, currentScroll - scrollSpeed);
            // Re-render to update the visual position
            render();
          }
        }, 16); // ~60fps
      }
      // Check if mouse is near right edge
      else if (mouseX > containerWidth - scrollThreshold) {
        autoScrollInterval = setInterval(() => {
          const currentScroll = container.scrollLeft;
          const maxScroll = container.scrollWidth - container.clientWidth;
          if (currentScroll < maxScroll) {
            container.scrollLeft = Math.min(maxScroll, currentScroll + scrollSpeed);
            // Re-render to update the visual position
            render();
          }
        }, 16); // ~60fps
      }
    }

    function constrainDragToTimeline(px, py) {
      if (!dragging) return { x: px, y: py };
      
      const container = canvas.parentElement;
      const containerRect = container.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      
      // Calculate the visible timeline area (excluding the left panel)
      const timelineStartX = layout.leftPad;
      const timelineEndX = canvas.width;
      
      // Constrain X to timeline bounds
      let constrainedX = px;
      let isConstrainedX = false;
      if (px < timelineStartX) {
        constrainedX = timelineStartX;
        isConstrainedX = true;
      } else if (px > timelineEndX) {
        constrainedX = timelineEndX;
        isConstrainedX = true;
      }
      
      // Constrain Y to canvas bounds
      let constrainedY = py;
      let isConstrainedY = false;
      if (py < layout.header) {
        constrainedY = layout.header;
        isConstrainedY = true;
      } else if (py > canvas.height) {
        constrainedY = canvas.height;
        isConstrainedY = true;
      }
      
      // Store constraint info for visual feedback
      dragging.isConstrained = isConstrainedX || isConstrainedY;
      
      return { x: constrainedX, y: constrainedY };
    }

    function stopAutoScroll() {
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
      }
    }
    function hitTestBars(px, py) {
      const rows = getRows();
      const barHeight = 18;
      for (let idx = 0; idx < rows.length; idx++) {
        const item = rows[idx].item;
        const isScenario = rows[idx].isScenario;
        const y = layout.header + idx * (layout.rowHeight + layout.rowGap);
        const x1 = dateToX(item.start);
        const x2 = dateToX(item.end);
        const w = Math.max(10, x2 - x1);
        if (py >= y+4 && py <= y+4+barHeight && px >= x1-4 && px <= x1+w+4) {
          // Scenarios and milestones can only be moved (no resize handles)
          if (isScenario || item.isMilestone) {
            return { id: item.id, mode: 'move', y, x1, w };
          }
          const nearStart = Math.abs(px - x1) <= 6;
          const nearEnd = Math.abs(px - (x1+w)) <= 6;
          const mode = nearStart ? 'start' : nearEnd ? 'end' : 'move';
          return { id: item.id, mode, y, x1, w };
        }
      }
      return null;
    }

    function onPointerDown(ev) {
      const rect = canvas.getBoundingClientRect();
      const px = ev.clientX - rect.left;
      const py = ev.clientY - rect.top;
      const hit = hitTestBars(px, py);
      if (hit) {
        const rows = getRows();
        const hitRow = rows.find(r => r.item.id === hit.id);
        const isScenario = hitRow ? hitRow.isScenario : false;
        
        if (isScenario) {
          // For scenarios, find the scenario object
          const scenario = state.scenarios.find(s => s.id === hit.id);
          dragging = { id: hit.id, mode: 'move', offsetX: px - hit.x1, startDateAtDown: scenario ? scenario.data.initiatives.reduce((min, i) => i.start < min ? i.start : min, scenario.data.initiatives[0].start) : hit.startDateAtDown, endDateAtDown: scenario ? scenario.data.initiatives.reduce((max, i) => i.end > max ? i.end : max, scenario.data.initiatives[0].end) : hit.endDateAtDown, appliedDelta: 0, isScenario: true };
          emitSelect({ type: 'scenario', id: hit.id });
        } else {
          const data = window.PlanForgeModel.getActiveData(state);
          const item = data.initiatives.find(i => i.id === hit.id);
          dragging = { id: hit.id, mode: hit.mode, offsetX: px - hit.x1, startDateAtDown: item.start, endDateAtDown: item.end, appliedDelta: 0, isScenario: false };
          emitSelect({ type: 'initiative', id: hit.id });
        }
      }
    }
    function onPointerMove(ev) {
      if (!dragging) return;
      const rect = canvas.getBoundingClientRect();
      const px = ev.clientX - rect.left;
      const py = ev.clientY - rect.top;
      
      // Constrain dragging to timeline bounds
      const constrained = constrainDragToTimeline(px, py);
      const constrainedPx = constrained.x;
      const constrainedPy = constrained.y;
      
      // Auto-scroll timeline when dragging near edges
      autoScrollTimeline(constrainedPx, rect.width);
      
      if (dragging.isScenario) {
        // Move entire scenario subtree
        const scenario = state.scenarios.find(s => s.id === dragging.id);
        if (!scenario) return;
        
        const newStart = xToDate(constrainedPx - dragging.offsetX);
        const delta = Math.round((new Date(newStart) - new Date(dragging.startDateAtDown)) / 86400000);
        const incremental = delta - dragging.appliedDelta;
        
        if (incremental !== 0) {
          // Move all initiatives in this scenario
          scenario.data.initiatives.forEach(initiative => {
            const newInitiativeStart = window.PlanForgeModel.addDays(initiative.start, incremental);
            const newInitiativeEnd = window.PlanForgeModel.addDays(initiative.end, incremental);
            initiative.start = newInitiativeStart;
            initiative.end = newInitiativeEnd;
            initiative.length = Math.max(1, Math.round((new Date(newInitiativeEnd) - new Date(newInitiativeStart)) / 86400000));
          });
          dragging.appliedDelta += incremental;
        }
      } else {
        // Regular initiative movement
        const data = window.PlanForgeModel.getActiveData(state);
        const item = data.initiatives.find(i => i.id === dragging.id);
        if (!item) return;
        
        if (dragging.mode === 'move') {
          const newStart = xToDate(constrainedPx - dragging.offsetX);
          const wantedDelta = Math.round((new Date(newStart) - new Date(dragging.startDateAtDown)) / 86400000);
          const incremental = wantedDelta - dragging.appliedDelta;
          if (incremental !== 0) {
            // move subtree by incremental delta; model clamps as needed
            const appliedInc = window.PlanForgeModel.moveSubtree(state, item.id, incremental);
            dragging.appliedDelta += appliedInc;
            if (appliedInc !== incremental) {
              // adjust offset so pointer stays anchored to bar start after clamping
              const correctedStart = window.PlanForgeModel.addDays(dragging.startDateAtDown, dragging.appliedDelta);
              const correctedX = dateToX(correctedStart);
              dragging.offsetX = constrainedPx - correctedX;
            }
          }
        } else if (dragging.mode === 'start') {
          const newStart = xToDate(constrainedPx);
          window.PlanForgeModel.moveItem(state, item.id, { start: newStart, end: item.end });
        } else if (dragging.mode === 'end') {
          const newEnd = xToDate(constrainedPx);
          window.PlanForgeModel.moveItem(state, item.id, { start: item.start, end: newEnd });
        }
      }
      render();
      emitChange();
    }
    function onPointerUp() { 
      stopAutoScroll();
      dragging = null; 
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pf-refresh', () => {
      render();
      updateZoomToContentButton();
    });
    
    // Listen for selection changes to ensure highlighting stays synchronized
    window.addEventListener('pf-selection-change', syncSelectionHighlight);

    // public api
    const listeners = { select: [], change: [] };
    function onSelect(cb){ listeners.select.push(cb); }
    function onChange(cb){ listeners.change.push(cb); }
    function emitSelect(sel){ listeners.select.forEach(cb => cb(sel)); }
    function emitChange(){ listeners.change.forEach(cb => cb()); }
    // Timeline configuration controls
    function setupTimelineControls() {
      const startInput = document.getElementById('timeline-start');
      const endInput = document.getElementById('timeline-end');
      const zoomSlider = document.getElementById('zoom-slider');
      const zoomLevel = document.getElementById('zoom-level');
      const zoomPresets = {
        year: document.getElementById('zoom-year'),
        quarter: document.getElementById('zoom-quarter'),
        month: document.getElementById('zoom-month'),
        day: document.getElementById('zoom-day')
      };
      
      // Initialize with current config
      startInput.value = timelineConfig.start;
      endInput.value = timelineConfig.end;
      zoomSlider.value = timelineConfig.zoomLevel;
      updateZoomLevelDisplay();
      updateZoomPresetButtons();
      
      // Event listeners
      startInput.addEventListener('change', (e) => {
        timelineConfig.start = e.target.value;
        ensureMinimumTimelineSpan();
        render();
      });
      
      endInput.addEventListener('change', (e) => {
        timelineConfig.end = e.target.value;
        ensureMinimumTimelineSpan();
        render();
      });
      
      zoomSlider.addEventListener('input', (e) => {
        timelineConfig.zoomLevel = parseInt(e.target.value);
        ensureMinimumTimelineSpan();
        updateZoomLevelDisplay();
        updateZoomPresetButtons();
        render();
      });
      
      // Zoom preset buttons
      zoomPresets.year.addEventListener('click', () => {
        timelineConfig.zoomLevel = 0;
        zoomSlider.value = 0;
        ensureMinimumTimelineSpan();
        updateZoomLevelDisplay();
        updateZoomPresetButtons();
        render();
      });
      
      zoomPresets.quarter.addEventListener('click', () => {
        timelineConfig.zoomLevel = 1;
        zoomSlider.value = 1;
        ensureMinimumTimelineSpan();
        updateZoomLevelDisplay();
        updateZoomPresetButtons();
        render();
      });
      
      zoomPresets.month.addEventListener('click', () => {
        timelineConfig.zoomLevel = 2;
        zoomSlider.value = 2;
        ensureMinimumTimelineSpan();
        updateZoomLevelDisplay();
        updateZoomPresetButtons();
        render();
      });
      
      zoomPresets.day.addEventListener('click', () => {
        timelineConfig.zoomLevel = 4;
        zoomSlider.value = 4;
        ensureMinimumTimelineSpan();
        updateZoomLevelDisplay();
        updateZoomPresetButtons();
        render();
      });
      
      // Zoom to content button
      const zoomToContentBtn = document.getElementById('zoom-to-content');
      if (zoomToContentBtn) {
        zoomToContentBtn.addEventListener('click', () => {
          zoomToContent();
        });
      }
    }

    function updateZoomLevelDisplay() {
      const zoomLevelElement = document.getElementById('zoom-level');
      const currentZoom = getCurrentZoomLevel();
      zoomLevelElement.textContent = currentZoom.name;
    }

    function updateZoomPresetButtons() {
      const zoomPresets = {
        year: document.getElementById('zoom-year'),
        quarter: document.getElementById('zoom-quarter'),
        month: document.getElementById('zoom-month'),
        day: document.getElementById('zoom-day')
      };
      
      // Remove active class from all buttons
      Object.values(zoomPresets).forEach(btn => btn.classList.remove('active'));
      
      // Add active class to current zoom level
      const currentZoom = getCurrentZoomLevel();
      switch(currentZoom.granularity) {
        case 'year':
          zoomPresets.year.classList.add('active');
          break;
        case 'quarter':
          zoomPresets.quarter.classList.add('active');
          break;
        case 'month':
          zoomPresets.month.classList.add('active');
          break;
        case 'day':
          zoomPresets.day.classList.add('active');
          break;
      }
    }

    function zoomToContent() {
      const rows = getRows();
      
      // Check if timeline is empty
      if (rows.length === 0) {
        return;
      }
      
      // Find earliest start date and latest end date from all visible elements
      let earliestStart = null;
      let latestEnd = null;
      
      rows.forEach(({ item }) => {
        if (!earliestStart || item.start < earliestStart) {
          earliestStart = item.start;
        }
        if (!latestEnd || item.end > latestEnd) {
          latestEnd = item.end;
        }
      });
      
      // Update timeline configuration
      if (earliestStart && latestEnd) {
        timelineConfig.start = earliestStart;
        timelineConfig.end = latestEnd;
        
        // Update the UI inputs to reflect the change
        const startInput = document.getElementById('timeline-start');
        const endInput = document.getElementById('timeline-end');
        if (startInput) {
          startInput.value = timelineConfig.start;
        }
        if (endInput) {
          endInput.value = timelineConfig.end;
        }
        
        // Re-render the timeline
        render();
      }
    }

    function updateZoomToContentButton() {
      const button = document.getElementById('zoom-to-content');
      const rows = getRows();
      
      // Enable/disable button based on whether timeline has content
      if (button) {
        button.disabled = rows.length === 0;
      }
    }

    // Initialize timeline controls
    setupTimelineControls();

    // Return public API
    return {
      render,
      onSelect,
      onChange
    };
  }

  return { create };
})();


