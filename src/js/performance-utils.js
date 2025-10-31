/**
 * Performance utilities for optimizing INP and perceived performance
 * Includes polyfills for cross-browser compatibility
 */

window.WhatIfDeliveredPerformance = (function() {
  
  // ============================================================================
  // requestIdleCallback Polyfill for Safari and older browsers
  // ============================================================================
  // Wrap to maintain proper 'this' binding
  const requestIdleCallback = window.requestIdleCallback 
    ? function(callback, options) {
        return window.requestIdleCallback(callback, options);
      }
    : function(callback, options) {
        const start = Date.now();
        return setTimeout(function() {
          callback({
            didTimeout: false,
            timeRemaining: function() {
              return Math.max(0, 50 - (Date.now() - start));
            }
          });
        }, 1);
      };

  const cancelIdleCallback = window.cancelIdleCallback 
    ? function(id) {
        return window.cancelIdleCallback(id);
      }
    : function(id) {
        clearTimeout(id);
      };

  // ============================================================================
  // Throttle function for limiting frequent calls
  // ============================================================================
  function throttle(func, limit) {
    let inThrottle;
    let lastResult;
    
    return function(...args) {
      if (!inThrottle) {
        inThrottle = true;
        lastResult = func.apply(this, args);
        setTimeout(() => inThrottle = false, limit);
      }
      return lastResult;
    };
  }

  // ============================================================================
  // Debounce function for delaying execution until after calls stop
  // ============================================================================
  function debounce(func, wait) {
    let timeout;
    
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // ============================================================================
  // Schedule work during idle time with fallback
  // ============================================================================
  function scheduleIdleWork(callback, options = {}) {
    const { timeout = 2000 } = options;
    
    return requestIdleCallback(callback, { timeout });
  }

  // ============================================================================
  // Run work in chunks to avoid blocking main thread
  // ============================================================================
  function runInChunks(items, processItem, options = {}) {
    const { 
      chunkSize = 10, 
      onProgress = null, 
      onComplete = null 
    } = options;
    
    let index = 0;
    
    function processChunk(deadline) {
      while (index < items.length && deadline.timeRemaining() > 0) {
        processItem(items[index], index);
        index++;
        
        if (onProgress && index % chunkSize === 0) {
          onProgress(index, items.length);
        }
      }
      
      if (index < items.length) {
        // More work to do
        requestIdleCallback(processChunk, { timeout: 1000 });
      } else {
        // All done
        if (onComplete) onComplete();
      }
    }
    
    requestIdleCallback(processChunk, { timeout: 1000 });
  }

  // ============================================================================
  // Cache for expensive calculations
  // ============================================================================
  function createCache(maxSize = 100) {
    const cache = new Map();
    const keys = [];
    
    return {
      get(key) {
        return cache.get(key);
      },
      
      set(key, value) {
        if (cache.has(key)) {
          // Move to end (most recently used)
          const index = keys.indexOf(key);
          keys.splice(index, 1);
          keys.push(key);
        } else {
          keys.push(key);
          
          // Evict oldest if over size limit
          if (keys.length > maxSize) {
            const oldestKey = keys.shift();
            cache.delete(oldestKey);
          }
        }
        
        cache.set(key, value);
      },
      
      has(key) {
        return cache.has(key);
      },
      
      clear() {
        cache.clear();
        keys.length = 0;
      },
      
      size() {
        return cache.size;
      }
    };
  }

  // ============================================================================
  // Performance marking utilities
  // ============================================================================
  function markPerformance(name) {
    if (window.performance && window.performance.mark) {
      performance.mark(name);
    }
  }

  function measurePerformance(name, startMark, endMark) {
    if (window.performance && window.performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name)[0];
        return measure ? measure.duration : null;
      } catch (e) {
        console.warn('Performance measurement failed:', e);
        return null;
      }
    }
    return null;
  }

  // ============================================================================
  // Skeleton/Loading state helpers
  // ============================================================================
  function showSkeletonInElement(element, type = 'tree') {
    if (!element) return;
    
    const skeletonHTML = {
      tree: `
        <div class="skeleton-tree-item"></div>
        <div class="skeleton-tree-item" style="width: 90%; margin-left: 20px;"></div>
        <div class="skeleton-tree-item" style="width: 85%; margin-left: 20px;"></div>
        <div class="skeleton-tree-item" style="width: 95%;"></div>
        <div class="skeleton-tree-item" style="width: 88%; margin-left: 20px;"></div>
      `,
      details: `
        <div class="skeleton-details">
          <div class="skeleton-details-line"></div>
          <div class="skeleton-details-line"></div>
          <div class="skeleton-details-line"></div>
          <div class="skeleton-details-line"></div>
        </div>
      `,
      canvas: `
        <div class="skeleton-canvas">
          <div>Loading timeline...</div>
        </div>
      `
    };
    
    element.innerHTML = skeletonHTML[type] || skeletonHTML.tree;
  }

  // ============================================================================
  // Auto-save manager with idle callback
  // ============================================================================
  function createAutoSaver(saveFunction, options = {}) {
    const { debounceMs = 1000, idleTimeout = 5000 } = options;
    let saveTimeout;
    let idleCallbackId;
    
    function scheduleSave(data) {
      // Clear existing timers
      clearTimeout(saveTimeout);
      if (idleCallbackId) {
        cancelIdleCallback(idleCallbackId);
      }
      
      // Debounce: Wait for user to stop making changes
      saveTimeout = setTimeout(() => {
        // Then save during idle time
        idleCallbackId = scheduleIdleWork(() => {
          try {
            saveFunction(data);
          } catch (error) {
            console.error('Auto-save failed:', error);
          }
        }, { timeout: idleTimeout });
      }, debounceMs);
    }
    
    function saveNow(data) {
      clearTimeout(saveTimeout);
      if (idleCallbackId) {
        cancelIdleCallback(idleCallbackId);
      }
      saveFunction(data);
    }
    
    return { scheduleSave, saveNow };
  }

  // ============================================================================
  // Public API
  // ============================================================================
  return {
    requestIdleCallback,
    cancelIdleCallback,
    throttle,
    debounce,
    scheduleIdleWork,
    runInChunks,
    createCache,
    markPerformance,
    measurePerformance,
    showSkeletonInElement,
    createAutoSaver
  };
})();

