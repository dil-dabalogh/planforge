window.WhatIfDeliveredTimeline = (function() {
  // Helper function to get CSS custom properties
  function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  
  // Cache commonly used color variables
  function getColors() {
    return {
      bg: getCSSVar('--color-bg'),
      panel: getCSSVar('--color-panel'),
      text: getCSSVar('--color-text'),
      textMuted: getCSSVar('--color-text-muted'),
      primary: getCSSVar('--color-primary'),
      accent: getCSSVar('--color-accent'),
      highlight: getCSSVar('--color-highlight'),
      danger: getCSSVar('--color-danger'),
      border: getCSSVar('--color-border'),
      grid: getCSSVar('--color-grid'),
      scenario: getCSSVar('--color-content-scenario'),
      initiative: getCSSVar('--color-content-initiative'),
      milestone: getCSSVar('--color-content-milestone'),
      epic: getCSSVar('--color-content-epic'),
      story: getCSSVar('--color-content-story'),
      selectionBg: getCSSVar('--color-selection-bg')
    };
  }
  
  function create(state, canvas) {
    const ctx = canvas.getContext('2d');
    const layout = { rowHeight: 28, rowGap: 6, header: 88, leftPad: 280 };
    const colors = getColors(); // Get cached colors
    
    // Timeline configuration
    let timelineConfig = {
      start: window.WhatIfDeliveredModel.addDays(window.WhatIfDeliveredModel.today(), -180), // 6 months ago
      end: window.WhatIfDeliveredModel.addDays(window.WhatIfDeliveredModel.today(), 180), // 6 months from now
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
      
      // Calculate height based on number of rows
      const rows = getRows();
      const contentHeight = layout.header + rows.length * (layout.rowHeight + layout.rowGap) + layout.rowGap;
      const minHeight = Math.max(400, rect.height);
      const finalHeight = Math.max(minHeight, contentHeight);
      
      canvas.style.width = finalWidth + 'px';
      canvas.style.height = finalHeight + 'px';
      canvas.width = finalWidth * dpr;
      canvas.height = finalHeight * dpr;
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
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0,0,width,height);
      
      // header background
      ctx.fillStyle = colors.panel;
      ctx.fillRect(0, 0, width, layout.header);
      
      // left panel separator
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      ctx.beginPath(); 
      ctx.moveTo(layout.leftPad, 0); 
      ctx.lineTo(layout.leftPad, height); 
      ctx.stroke();
      
      // Draw today indicator line
      renderTodayIndicator();
      
      renderHeaderLabels();
      
      // Draw separator line between header and content
      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, layout.header);
      ctx.lineTo(width, layout.header);
      ctx.stroke();
      
      renderVerticalLines();
    }
    
    function renderVerticalLines() {
      const { width, height } = canvas;
      const currentZoom = getCurrentZoomLevel();
      
      if (currentZoom.granularity === 'year') {
        // Major lines for years
        ctx.strokeStyle = '#999999';
        ctx.lineWidth = 1;
        const current = new Date(timelineConfig.start + 'T00:00:00Z');
        current.setUTCMonth(0, 1);
        while (current <= new Date(timelineConfig.end + 'T00:00:00Z')) {
          const x = dateToX(current.toISOString().slice(0,10));
          if (x >= layout.leftPad && x <= width) {
            ctx.beginPath();
            ctx.moveTo(x, layout.header);
            ctx.lineTo(x, height);
            ctx.stroke();
          }
          current.setUTCFullYear(current.getUTCFullYear() + 1);
        }
      } else if (currentZoom.granularity === 'quarter') {
        // Major lines for quarters
        ctx.strokeStyle = '#999999';
        ctx.lineWidth = 1;
        const current = new Date(timelineConfig.start + 'T00:00:00Z');
        const quarterStart = Math.floor(current.getUTCMonth() / 3) * 3;
        current.setUTCMonth(quarterStart, 1);
        while (current <= new Date(timelineConfig.end + 'T00:00:00Z')) {
          const x = dateToX(current.toISOString().slice(0,10));
          if (x >= layout.leftPad && x <= width) {
            ctx.beginPath();
            ctx.moveTo(x, layout.header);
            ctx.lineTo(x, height);
            ctx.stroke();
          }
          current.setUTCMonth(current.getUTCMonth() + 3);
        }
      } else if (currentZoom.granularity === 'month') {
        // Major lines for months
        ctx.strokeStyle = '#999999';
        ctx.lineWidth = 1;
        const current = new Date(timelineConfig.start + 'T00:00:00Z');
        current.setUTCDate(1);
        while (current <= new Date(timelineConfig.end + 'T00:00:00Z')) {
          const x = dateToX(current.toISOString().slice(0,10));
          if (x >= layout.leftPad && x <= width) {
            ctx.beginPath();
            ctx.moveTo(x, layout.header);
            ctx.lineTo(x, height);
            ctx.stroke();
          }
          current.setUTCMonth(current.getUTCMonth() + 1);
        }
      } else if (currentZoom.granularity === 'week') {
        // Major lines for weeks
        ctx.strokeStyle = '#d0d0d0';
        ctx.lineWidth = 1;
        const current = new Date(timelineConfig.start + 'T00:00:00Z');
        const dayOfWeek = current.getUTCDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        current.setUTCDate(current.getUTCDate() - daysToMonday);
        while (current <= new Date(timelineConfig.end + 'T00:00:00Z')) {
          const x = dateToX(current.toISOString().slice(0,10));
          if (x >= layout.leftPad && x <= width) {
            ctx.beginPath();
            ctx.moveTo(x, layout.header);
            ctx.lineTo(x, height);
            ctx.stroke();
          }
          current.setUTCDate(current.getUTCDate() + 7);
        }
      } else if (currentZoom.granularity === 'day') {
        // Weekend emphasis lines are already drawn in renderDayLabels
        // This section is intentionally empty to avoid double-drawing
      }
    }

    function renderTodayIndicator() {
      const { width, height } = canvas;
      const today = window.WhatIfDeliveredModel.today();
      const timelineStart = new Date(timelineConfig.start + 'T00:00:00Z');
      const timelineEnd = new Date(timelineConfig.end + 'T00:00:00Z');
      
      // Only draw today indicator if today is within the visible timeline range
      if (today >= timelineConfig.start && today <= timelineConfig.end) {
        const todayX = dateToX(today);
        
        // Draw thin vertical line for today
        ctx.strokeStyle = '#ff5555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(todayX, 0);
        ctx.lineTo(todayX, height);
        ctx.stroke();
        
        // Add a small "Today" label at the top
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw a small background for better visibility
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(todayX - 22, 0, 44, 14);
        
        // Draw border for the background
        ctx.strokeStyle = '#ff5555';
        ctx.lineWidth = 1;
        ctx.strokeRect(todayX - 22, 0, 44, 14);
        
        // Draw text
        ctx.fillStyle = '#ff5555';
        ctx.font = 'bold 10px system-ui';
        ctx.fillText('Today', todayX, 7);
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
      const yearFont = 'bold 16px system-ui';
      const yearColor = '#4a4a4a';
      const bgColor = '#f5f5f5';
      
      ctx.font = yearFont;
      
      const current = new Date(start);
      current.setUTCMonth(0, 1);
      
      const intervals = [];
      while (current <= end) {
        const x = dateToX(current.toISOString().slice(0,10));
        intervals.push({ x, year: current.getUTCFullYear() });
        current.setUTCFullYear(current.getUTCFullYear() + 1);
      }
      
      // Draw background blocks for each year (ensure full coverage from left edge)
      for (let i = 0; i < intervals.length; i++) {
        const startX = intervals[i].x;
        const endX = i < intervals.length - 1 ? intervals[i+1].x : width;
        // Start from left edge of canvas for first interval, not from startX
        const bgStartX = i === 0 ? 0 : startX;
        if (endX > layout.leftPad && bgStartX < width) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(bgStartX, 0, endX - bgStartX, 16);
          
          // Draw year text only if within visible area
          if (startX >= layout.leftPad) {
            ctx.fillStyle = yearColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(intervals[i].year.toString(), startX + 8, 2);
          }
        }
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    }

    function renderQuarterLabels(start, end, width) {
      const current = new Date(start);
      const quarterStart = Math.floor(current.getUTCMonth() / 3) * 3;
      current.setUTCMonth(quarterStart, 1);
      
      const intervals = [];
      while (current <= end) {
        const x = dateToX(current.toISOString().slice(0,10));
        if (x >= layout.leftPad && x <= width) {
          const quarter = Math.floor(current.getUTCMonth() / 3) + 1;
          intervals.push({ x, quarter, year: current.getUTCFullYear() });
        }
        current.setUTCMonth(current.getUTCMonth() + 3);
      }
      
      ctx.fillStyle = '#6b6b6b';
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      for (let i = 0; i < intervals.length; i++) {
        const startX = intervals[i].x;
        const endX = i < intervals.length - 1 ? intervals[i+1].x : width;
        
        // Start from left edge for first interval to ensure full coverage
        const bgStartX = i === 0 ? 0 : startX;
        
        // Draw quarter background (consistent with year)
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(bgStartX, 16, endX - bgStartX, 16);
        
        // Draw separator line (only draw if startX is visible)
        if (startX >= layout.leftPad) {
          ctx.strokeStyle = '#d0d0d0';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(startX, 16);
          ctx.lineTo(startX, 32);
          ctx.stroke();
        }
        
        // Draw text (only if visible)
        if (startX >= layout.leftPad) {
          ctx.fillStyle = '#4a4a4a';
          ctx.fillText(`Q${intervals[i].quarter}`, startX + 8, 19);
        }
      }
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    }

    function renderMonthLabels(start, end, width) {
      const current = new Date(start);
      current.setUTCDate(1);
      
      const intervals = [];
      while (current <= end) {
        const x = dateToX(current.toISOString().slice(0,10));
        if (x >= layout.leftPad && x <= width) {
          const monthName = current.toLocaleDateString('en', { month: 'short' });
          const monthNum = current.getUTCMonth() + 1;
          intervals.push({ x, monthName, monthNum });
        }
        current.setUTCMonth(current.getUTCMonth() + 1);
      }
      
      ctx.fillStyle = '#5a5a5a';
      ctx.font = '600 12px system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      for (let i = 0; i < intervals.length; i++) {
        const startX = intervals[i].x;
        const endX = i < intervals.length - 1 ? intervals[i+1].x : width;
        
        // Start from left edge for first interval to ensure full coverage
        const bgStartX = i === 0 ? 0 : startX;
        
        // Draw month background (consistent color for all months)
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(bgStartX, 32, endX - bgStartX, 16);
        
        // Draw separator line (only draw if startX is visible)
        if (startX >= layout.leftPad) {
          ctx.strokeStyle = '#d8d8d8';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(startX, 32);
          ctx.lineTo(startX, 48);
          ctx.stroke();
        }
        
        // Draw text (only if visible)
        if (startX >= layout.leftPad) {
          ctx.fillStyle = '#3a3a3a';
          ctx.fillText(intervals[i].monthName, startX + 6, 35);
        }
      }
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    }

    function renderWeekLabels(start, end, width) {
      const current = new Date(start);
      const dayOfWeek = current.getUTCDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      current.setUTCDate(current.getUTCDate() - daysToMonday);
      
      const intervals = [];
      while (current <= end) {
        const x = dateToX(current.toISOString().slice(0,10));
        if (x >= layout.leftPad && x <= width) {
          const weekNum = getWeekNumber(current);
          const dayOfWeek = current.getUTCDay();
          intervals.push({ x, weekNum, dayOfWeek });
        }
        current.setUTCDate(current.getUTCDate() + 7);
      }
      
      ctx.fillStyle = '#4a4a4a';
      ctx.font = '500 10px system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      for (let i = 0; i < intervals.length; i++) {
        const startX = intervals[i].x;
        const endX = i < intervals.length - 1 ? intervals[i+1].x : width;
        
        // Start from left edge for first interval to ensure full coverage
        const bgStartX = i === 0 ? 0 : startX;
        
        // Draw week background
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(bgStartX, 48, endX - bgStartX, 20);
        
        // Draw week separator (subtle) - only if visible
        if (startX >= layout.leftPad) {
          ctx.strokeStyle = '#d8d8d8';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(startX, 48);
          ctx.lineTo(startX, layout.header);
          ctx.stroke();
          
          // Draw week number (centered in the week)
          if (intervals[i].weekNum) {
            ctx.fillStyle = '#6a6a6a';
            ctx.font = '600 10px system-ui';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`W${intervals[i].weekNum}`, startX + 6, 52);
          }
        }
      }
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    }

    function renderDayLabels(start, end, width) {
      const current = new Date(start);
      
      // First pass: draw alternating day backgrounds and separators
      let dayIndex = 0;
      const currentBg = new Date(start);
      const pixelWidth = getPixelsPerUnit() / getDaysPerUnit();
      
      while (currentBg <= end) {
        const x = dateToX(currentBg.toISOString().slice(0,10));
        if (x >= layout.leftPad && x <= width) {
          const dayOfWeek = currentBg.getUTCDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const dayWidth = pixelWidth;
          
          // Draw alternating background
          ctx.fillStyle = isWeekend ? '#fafafa' : (dayIndex % 2 === 0 ? '#ffffff' : '#f8f8f8');
          ctx.fillRect(x, 68, dayWidth, 20);
          
          // Draw day separator with better visibility (extend through entire canvas)
          ctx.strokeStyle = isWeekend ? '#c8c8c8' : '#909090';
          ctx.lineWidth = isWeekend ? 2 : 1.5;
          ctx.beginPath();
          ctx.moveTo(x, 68);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        currentBg.setUTCDate(currentBg.getUTCDate() + 1);
        dayIndex++;
      }
      
      // Second pass: draw day numbers and names
      while (current <= end) {
        const x = dateToX(current.toISOString().slice(0,10));
        if (x >= layout.leftPad && x <= width) {
          const day = current.getUTCDate();
          const dayOfWeek = current.getUTCDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          
          // Draw day number
          ctx.fillStyle = isWeekend ? '#999999' : '#4a4a4a';
          ctx.font = 'bold 12px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(day.toString(), x, 78);
          
          // Draw day of week label (Mon, Tue, etc.) at the top
          ctx.fillStyle = '#7a7a7a';
          ctx.font = '500 9px system-ui';
          const dayName = current.toLocaleDateString('en', { weekday: 'short' });
          ctx.fillText(dayName, x, 71);
        }
        current.setUTCDate(current.getUTCDate() + 1);
      }
      
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
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
      
      // Reset text alignment state at start to ensure proper rendering
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      ctx.font = '14px system-ui';
      rows.forEach(({ item, depth, scenarioId, isScenario }, idx) => {
        const y = layout.header + idx * (layout.rowHeight + layout.rowGap);
        
        // Simplified approach: no glass boxes, just clean text with colored indicators
        const startX = 20; // Minimal left padding from canvas edge
        
        // Draw colored indent bar based on item type (matching timeline bar colors)
        const levelColors = {
          'Initiative': colors.initiative,      // Red
          'Epic': colors.epic,                   // Lavender
          'Story': colors.story,                 // Light blue
          'Milestone': colors.milestone,        // Dark blue
          'Scenario': colors.scenario            // Purple-grey
        };
        const itemColor = item.isMilestone ? colors.milestone : (levelColors[item.level] || colors.initiative);
        ctx.fillStyle = itemColor + '40'; // More subtle transparency
        const indentWidth = 3;
        const indentX = startX + (depth * 20); // Direct indentation based on depth
        ctx.fillRect(indentX, y - 2, indentWidth, layout.rowHeight);
        
        // row label - show text for all items including milestones
        // Set font for measuring
        ctx.font = 'bold 14px system-ui';
        ctx.textBaseline = 'middle';
        const textY = y + layout.rowHeight / 2;
        // Minimal padding after indent bar
        const textX = indentX + 8;
        
        // Calculate available width for text (use most of the available space)
        const maxTextWidth = layout.leftPad - textX - 20; // Only 20px padding on right
        
        // Measure and truncate text if needed
        const fullText = item.name;
        const textWidth = ctx.measureText(fullText).width;
        let displayText = fullText;
        
        if (textWidth > maxTextWidth) {
          // Truncate text to fit with ellipsis
          let truncated = fullText;
          while (ctx.measureText(truncated + '...').width > maxTextWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
          }
          displayText = truncated + '...';
        }
        
        // Draw text with strong color
        ctx.fillStyle = '#2c1f1f';
        ctx.fillText(displayText, textX, textY);
        // bar
        const x1 = dateToX(item.start);
        const x2 = dateToX(item.end);
        const w = Math.max(10, x2 - x1);
        
        // Check if this item is currently selected (active element) - same logic as renderDetails()
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
        
        // Draw selection highlight background if selected
        if (isSelected) {
          ctx.fillStyle = colors.selectionBg;
          ctx.fillRect(x1 - 2, y + 2, w + 4, barHeight + 4);
        }
        
        ctx.fillStyle = barColor(item.level, scenarioId, isScenario, item.isMilestone);
        
        // Draw rhombus shape for milestones, rectangle for regular items
        if (item.isMilestone) {
          // Make milestones bigger and more prominent
          const milestoneWidth = Math.max(w * 0.6, 15);
          const milestoneHeight = barHeight * 0.7;
          drawRhombus(ctx, x1 + w/2, y + 4 + barHeight/2, milestoneWidth, milestoneHeight);
        } else {
          ctx.fillRect(x1, y + 4, w, barHeight);
        }
        
        // handles (only for non-scenario, non-milestone items) - draw first
        if (!isScenario && !item.isMilestone) {
          ctx.fillStyle = colors.primary;
          ctx.fillRect(x1 - 2, y + 4, 4, barHeight);
          ctx.fillRect(x1 + w - 2, y + 4, 4, barHeight);
        }
        
        // Draw colored borders - left red, right green (drawn last to be visible)
        if (!isScenario && !item.isMilestone) {
          // Left border (red) - very thick and visible
          ctx.strokeStyle = colors.primary;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x1, y + 4);
          ctx.lineTo(x1, y + 4 + barHeight);
          ctx.stroke();
          
          // Right border - very thick and visible
          ctx.strokeStyle = colors.accent;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x1 + w, y + 4);
          ctx.lineTo(x1 + w, y + 4 + barHeight);
          ctx.stroke();
          
          // Draw selection border if selected
          if (isSelected) {
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 3;
            ctx.strokeRect(x1 - 1, y + 3, w + 2, barHeight + 2);
          }
        } else if (item.isMilestone) {
          // For milestones, draw a simple border around the rhombus with bigger size
          const milestoneWidth = Math.max(w * 0.6, 15);
          const milestoneHeight = barHeight * 0.7;
          
          ctx.strokeStyle = colors.milestone;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1 + w/2, y + 4 + barHeight/2 - milestoneHeight);
          ctx.lineTo(x1 + w/2 + milestoneWidth, y + 4 + barHeight/2);
          ctx.lineTo(x1 + w/2, y + 4 + barHeight/2 + milestoneHeight);
          ctx.lineTo(x1 + w/2 - milestoneWidth, y + 4 + barHeight/2);
          ctx.closePath();
          ctx.stroke();
          
          // Draw selection border if selected
          if (isSelected) {
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x1 + w/2, y + 4 + barHeight/2 - milestoneHeight - 1);
            ctx.lineTo(x1 + w/2 + milestoneWidth + 1, y + 4 + barHeight/2);
            ctx.lineTo(x1 + w/2, y + 4 + barHeight/2 + milestoneHeight + 1);
            ctx.lineTo(x1 + w/2 - milestoneWidth - 1, y + 4 + barHeight/2);
            ctx.closePath();
            ctx.stroke();
          }
        } else {
          // For scenarios, use default border or selection border
          if (isSelected) {
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 3;
            ctx.strokeRect(x1 - 1, y + 3, w + 2, barHeight + 2);
          } else {
            ctx.strokeStyle = colors.grid;
            ctx.lineWidth = 1;
            ctx.strokeRect(x1, y + 4, w, barHeight);
          }
        }
        // name on bar - don't show text for milestones
        if (!item.isMilestone) {
          // Save context state
          ctx.save();
          
          // Configure text rendering
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.font = '11px system-ui';
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
          
          // Restore context state
          ctx.restore();
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
          
          // Calculate angle and distance for elegant dependency
          const dx = x2 - x1;
          const dy = y2 - y1;
          const angle = Math.atan2(dy, dx);
          const length = Math.sqrt(dx * dx + dy * dy);
          
          // Only draw if dependency is visible and meaningful
          if (length < 10) return;
          
          // Draw elegant dependency line with refined styling
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#8B78CC'; // Refined purple tone
          ctx.setLineDash([10, 6]); // Refined dash pattern
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.bezierCurveTo((x1+x2)/2, y1, (x1+x2)/2, y2, x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Draw elegant arrowhead
          const arrowSize = 7;
          const arrowWidth = 3.5;
          
          ctx.save();
          ctx.translate(x2, y2);
          ctx.rotate(angle);
          
          // Main arrow shape
          ctx.fillStyle = '#7A65B8';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-arrowSize, -arrowWidth);
          ctx.lineTo(-arrowSize, arrowWidth);
          ctx.closePath();
          ctx.fill();
          
          // Inner highlight for depth
          ctx.fillStyle = '#9D88D8';
          ctx.beginPath();
          ctx.moveTo(-0.5, 0);
          ctx.lineTo(-arrowSize + 1, -arrowWidth + 0.8);
          ctx.lineTo(-arrowSize + 1, arrowWidth - 0.8);
          ctx.closePath();
          ctx.fill();
          
          ctx.restore();
          
          // Draw connection points with elegant rings
          ctx.strokeStyle = '#B7A3E3';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x1, y1, 4, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.fillStyle = '#F5F0FF';
          ctx.beginPath();
          ctx.arc(x1, y1, 3.2, 0, 2 * Math.PI);
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(x2, y2, 4, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.fillStyle = '#F5F0FF';
          ctx.beginPath();
          ctx.arc(x2, y2, 3.2, 0, 2 * Math.PI);
          ctx.fill();
        });
      });
    }

    function barColor(level, scenarioId, isScenario, isMilestone = false) {
      if (isScenario) return colors.scenario;
      if (isMilestone) return colors.milestone;
      if (level === 'Initiative') return colors.initiative;
      if (level === 'Epic') return colors.epic;
      if (level === 'Story') return colors.story;
      return colors.primary;
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
        // Expanded hit area for milestones to match bigger diamond
        const hitTestHeight = item.isMilestone ? barHeight + 4 : barHeight;
        const hitTestPadding = item.isMilestone ? 10 : 4;
        
        if (py >= y+4 && py <= y+4+hitTestHeight && px >= x1-hitTestPadding && px <= x1+w+hitTestPadding) {
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
          const data = window.WhatIfDeliveredModel.getActiveData(state);
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
            const newInitiativeStart = window.WhatIfDeliveredModel.addDays(initiative.start, incremental);
            const newInitiativeEnd = window.WhatIfDeliveredModel.addDays(initiative.end, incremental);
            initiative.start = newInitiativeStart;
            initiative.end = newInitiativeEnd;
            initiative.length = Math.max(1, Math.round((new Date(newInitiativeEnd) - new Date(newInitiativeStart)) / 86400000));
          });
          dragging.appliedDelta += incremental;
        }
      } else {
        // Regular initiative movement
        const data = window.WhatIfDeliveredModel.getActiveData(state);
        const item = data.initiatives.find(i => i.id === dragging.id);
        if (!item) return;
        
        if (dragging.mode === 'move') {
          const newStart = xToDate(constrainedPx - dragging.offsetX);
          const wantedDelta = Math.round((new Date(newStart) - new Date(dragging.startDateAtDown)) / 86400000);
          const incremental = wantedDelta - dragging.appliedDelta;
          if (incremental !== 0) {
            // move subtree by incremental delta; model clamps as needed
            const appliedInc = window.WhatIfDeliveredModel.moveSubtree(state, item.id, incremental);
            dragging.appliedDelta += appliedInc;
            if (appliedInc !== incremental) {
              // adjust offset so pointer stays anchored to bar start after clamping
              const correctedStart = window.WhatIfDeliveredModel.addDays(dragging.startDateAtDown, dragging.appliedDelta);
              const correctedX = dateToX(correctedStart);
              dragging.offsetX = constrainedPx - correctedX;
            }
          }
        } else if (dragging.mode === 'start') {
          const newStart = xToDate(constrainedPx);
          window.WhatIfDeliveredModel.moveItem(state, item.id, { start: newStart, end: item.end });
        } else if (dragging.mode === 'end') {
          const newEnd = xToDate(constrainedPx);
          window.WhatIfDeliveredModel.moveItem(state, item.id, { start: item.start, end: newEnd });
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
        
        // Ensure minimum timeline span is maintained for current zoom level
        ensureMinimumTimelineSpan();
        
        // Update the UI inputs to reflect the change (after ensureMinimumTimelineSpan)
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
      onChange,
      zoomToContent
    };
  }

  return { create };
})();



