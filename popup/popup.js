/**
 * Popup UI Logic - Slice 4 COMPLETE
 * Canvas Editor, Templates, Drafts
 * 
 * IMPORTANT: Combine Part 1 + Part 2 into one popup.js file
 */

(function() {
  'use strict';

  // === GLOBAL INSTANCES ===
  const storage = new StorageManager();
  const bulkOps = new BulkOperationsManager();
  const autoFilter = new AutoFilterManager();
  const shortcuts = new KeyboardShortcuts();
  
  let currentData = null;
  let currentDraft = null;
  let currentTemplate = null;
  let editingPromptId = null;
  let editingCategoryId = null;
  let editingTagId = null;
  let selectMode = false;
  let pendingImportData = null;
  let currentSubtab = 'tags';
  let draggedPartId = null;

  /**
   * Initialization
   */
  document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    await initDefaultProfiles();
    await initAutoFilter();
    initKeyboardShortcuts();
    initEventListeners();
    
    // Initialize empty draft for canvas
    currentDraft = MegadraftManager.createDraft('Untitled Draft');
    
    renderAll();
    ExportImportManager.createAutoBackup(currentData);
  });

  /**
   * Load data from storage
   */
  async function loadData() {
    try {
      currentData = await storage.load();
      console.log('[AI Prompt Manager] Data loaded:', currentData);
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('Error loading data', 'error');
    }
  }

  /**
   * Initialize default AI profiles
   */
  async function initDefaultProfiles() {
    try {
      // Merge default profiles with user profiles
      currentData.tags = DefaultProfiles.mergeWithUserProfiles(currentData.tags);
      await storage.save(currentData);
    } catch (error) {
      console.error('Error initializing default profiles:', error);
    }
  }

  /**
   * Initialize auto-filter
   */
  async function initAutoFilter() {
    try {
      const url = await AutoFilterManager.getCurrentTabUrl();
      autoFilter.setCurrentUrl(url);
      autoFilter.setEnabled(false); // Default OFF
    } catch (error) {
      console.error('Error initializing auto-filter:', error);
    }
  }

  /**
   * Initialize keyboard shortcuts
   */
  function initKeyboardShortcuts() {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    shortcuts.register('c', {
      ctrl: !isMac,
      cmd: isMac,
      description: 'Copy to clipboard',
      handler: () => handleGlobalCopyShortcut()
    });

    shortcuts.register('f', {
      ctrl: !isMac,
      cmd: isMac,
      description: 'Focus search',
      handler: () => focusSearch()
    });

    shortcuts.register('Escape', {
      description: 'Close modal / Clear search',
      handler: (e) => handleEscape(e)
    });

    shortcuts.init();
  }

  /**
   * Initialize event listeners
   */
  function initEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.view));
    });

    // Subtabs
    document.querySelectorAll('.subtab').forEach(subtab => {
      subtab.addEventListener('click', () => switchSubtab(subtab.dataset.subtab));
    });

    // Modal close
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => closeAllModals());
    });

    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAllModals();
      });
    });

    // === CANVAS EVENTS ===
    document.getElementById('btn-new-draft').addEventListener('click', createNewDraft);
    document.getElementById('btn-load-draft').addEventListener('click', openLoadDraftModal);
    document.getElementById('btn-save-draft').addEventListener('click', saveDraft);
    document.getElementById('btn-copy-canvas').addEventListener('click', copyCanvas);
    document.getElementById('btn-add-part').addEventListener('click', openAddPartModal);
    document.getElementById('btn-add-first-part').addEventListener('click', openAddPartModal);
    document.getElementById('canvas-editor').addEventListener('input', handleCanvasEdit);

    // === TEMPLATE EVENTS ===
    document.querySelectorAll('.btn-use-template').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const framework = e.target.dataset.framework;
        openTemplateVarsModal(framework);
      });
    });

    document.getElementById('form-template-vars').addEventListener('submit', handleTemplateSubmit);

    // === PART MODAL EVENTS ===
    document.querySelectorAll('.part-type-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        switchPartType(e.currentTarget.dataset.type);
      });
    });

    document.getElementById('btn-confirm-add-part').addEventListener('click', confirmAddPart);
    document.getElementById('part-prompt-search').addEventListener('input', debounce(handlePartPromptSearch, 200));

    // === PROMPTS EVENTS ===
    document.getElementById('btn-add-prompt').addEventListener('click', () => openPromptModal());
    document.getElementById('btn-empty-create-prompt').addEventListener('click', () => openPromptModal());
    document.getElementById('form-prompt').addEventListener('submit', handlePromptSubmit);
    document.getElementById('search-prompts').addEventListener('input', debounce(handleSearchPrompts, 200));
    document.getElementById('filter-category').addEventListener('change', renderPrompts);
    document.getElementById('auto-filter-toggle-prompts').addEventListener('change', toggleAutoFilterPrompts);

    // === CATEGORIES EVENTS ===
    document.getElementById('btn-add-category').addEventListener('click', () => openCategoryModal());
    document.getElementById('form-category').addEventListener('submit', handleCategorySubmit);

    // === TAGS EVENTS ===
    document.getElementById('btn-add-tag').addEventListener('click', () => openTagModal(false));
    document.getElementById('btn-add-profile').addEventListener('click', () => openTagModal(true));
    document.getElementById('form-tag').addEventListener('submit', handleTagSubmit);

    // === SETTINGS EVENTS ===
    document.getElementById('btn-settings').addEventListener('click', openSettingsModal);
    document.getElementById('btn-export-all').addEventListener('click', exportAllData);
    document.getElementById('btn-import-file').addEventListener('click', () => {
      document.getElementById('file-import').click();
    });
    document.getElementById('file-import').addEventListener('change', handleFileImport);
    document.getElementById('btn-delete-all-data').addEventListener('click', deleteAllData);
    document.getElementById('btn-show-shortcuts').addEventListener('click', () => shortcuts.toggleOverlay());

    // === DRAFTS EVENTS ===
    document.getElementById('btn-create-draft-from-view').addEventListener('click', createNewDraft);
    document.getElementById('btn-empty-create-draft').addEventListener('click', createNewDraft);
  }

  // === UTILITY FUNCTIONS ===

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showNotification(message, type = 'info') {
    const colors = {
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6'
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${colors[type]};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      animation: slideIn 0.3s ease-out;
      max-width: 300px;
      white-space: pre-line;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // === TAB SWITCHING ===

  function switchTab(viewName) {
    if (selectMode) toggleSelectMode();

    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === viewName);
    });

    document.querySelectorAll('.view').forEach(view => {
      view.classList.toggle('active', view.id === `view-${viewName}`);
    });

    if (viewName === 'canvas') {
      renderCanvas();
    } else if (viewName === 'prompts') {
      renderPrompts();
      syncAutoFilterState('prompts');
    } else if (viewName === 'templates') {
      renderTemplates();
    } else if (viewName === 'drafts') {
      renderDrafts();
    } else if (viewName === 'categories') {
      renderCategories();
    } else if (viewName === 'tags') {
      renderTagsAndProfiles();
    }
  }

  function switchSubtab(subtabName) {
    currentSubtab = subtabName;

    document.querySelectorAll('.subtab').forEach(subtab => {
      subtab.classList.toggle('active', subtab.dataset.subtab === subtabName);
    });

    if (subtabName === 'tags') {
      document.getElementById('tag-list').style.display = 'flex';
      document.getElementById('profile-list').style.display = 'none';
      document.getElementById('btn-add-tag').style.display = 'inline-flex';
      document.getElementById('btn-add-profile').style.display = 'none';
    } else {
      document.getElementById('tag-list').style.display = 'none';
      document.getElementById('profile-list').style.display = 'flex';
      document.getElementById('btn-add-tag').style.display = 'none';
      document.getElementById('btn-add-profile').style.display = 'inline-flex';
    }

    renderTagsAndProfiles();
  }

  function renderAll() {
    renderCanvas();
    renderPrompts();
    renderTemplates();
    renderDrafts();
    renderCategories();
    renderTagsAndProfiles();
    updateCategorySelects();
  }

  // === KEYBOARD SHORTCUTS HANDLERS ===

  function handleGlobalCopyShortcut() {
    const activeView = document.querySelector('.view.active');
    
    if (activeView.id === 'view-canvas') {
      copyCanvas();
    }
  }

  function focusSearch() {
    const activeView = document.querySelector('.view.active');
    
    if (activeView.id === 'view-prompts') {
      document.getElementById('search-prompts').focus();
    }
  }

  function handleEscape(e) {
    const openModal = document.querySelector('.modal.active');
    
    if (openModal) {
      closeAllModals();
    } else {
      const activeView = document.querySelector('.view.active');
      if (activeView.id === 'view-prompts') {
        const search = document.getElementById('search-prompts');
        if (search.value) {
          search.value = '';
          handleSearchPrompts();
        }
      }
    }
  }

  // === CANVAS FUNCTIONS ===

  function createNewDraft() {
    if (currentDraft && currentDraft.parts.length > 0) {
      if (!confirm('Create new draft? Unsaved changes will be lost.')) {
        return;
      }
    }

    currentDraft = MegadraftManager.createDraft('Untitled Draft');
    renderCanvas();
    showNotification('New draft created', 'success');
    switchTab('canvas');
  }

  async function saveDraft() {
    if (!currentDraft) return;

    try {
      const title = prompt('Draft title:', currentDraft.title);
      if (!title) return;

      currentDraft.title = title;
      
      // Update content from canvas
      const canvasText = document.getElementById('canvas-editor').value;
      if (canvasText && currentDraft.parts.length > 0) {
        currentDraft.parts = MegadraftManager.parseCanvas(canvasText, currentDraft.parts);
      }

      await storage.saveDraft(currentDraft);
      showNotification('Draft saved', 'success');
      renderDrafts();
    } catch (error) {
      showNotification('Error saving draft', 'error');
    }
  }

  async function copyCanvas() {
    const canvas = document.getElementById('canvas-editor');
    const btn = document.getElementById('btn-copy-canvas');

    if (!canvas.value || canvas.value.trim().length === 0) {
      showNotification('Canvas is empty', 'warning');
      return;
    }

    try {
      btn.classList.add('loading');
      await navigator.clipboard.writeText(canvas.value);
      
      if (currentDraft) {
        MegadraftManager.markCopied(currentDraft);
      }

      btn.classList.remove('loading');
      btn.classList.add('success');
      showNotification('Copied to clipboard', 'success');
      
      setTimeout(() => {
        btn.classList.remove('success');
      }, 800);
    } catch (error) {
      btn.classList.remove('loading');
      showNotification('Error copying to clipboard', 'error');
    }
  }

  function handleCanvasEdit() {
    updateCanvasStats();
    checkCanvasLimits();
  }

  function updateCanvasStats() {
    const canvas = document.getElementById('canvas-editor').value;
    const stats = {
      characters: canvas.length,
      words: canvas.split(/\s+/).filter(Boolean).length,
      lines: canvas.split('\n').length,
      tokens: Math.ceil(canvas.length / 4)
    };

    document.getElementById('canvas-char-count').textContent = `${stats.characters.toLocaleString()} characters`;
    document.getElementById('canvas-word-count').textContent = `${stats.words.toLocaleString()} words`;
    document.getElementById('canvas-part-count').textContent = `${currentDraft ? currentDraft.parts.length : 0} parts`;
    document.getElementById('canvas-token-estimate').textContent = `~${stats.tokens.toLocaleString()} tokens`;
  }

  function checkCanvasLimits() {
    if (!currentDraft) return;

    const limits = MegadraftManager.checkLimits(currentDraft);
    const warningsDiv = document.getElementById('canvas-warnings');

    if (limits.percentage > 80) {
      warningsDiv.style.display
      warningsDiv.style.display = 'block';
      warningsDiv.innerHTML = `
        <div class="canvas-warning-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>Draft size: ${limits.percentage}% of maximum (${limits.size.toLocaleString()} / ${limits.maxSize.toLocaleString()} chars)</span>
        </div>
      `;
    } else {
      warningsDiv.style.display = 'none';
    }
  }

  function renderCanvas() {
    if (!currentDraft) {
      currentDraft = MegadraftManager.createDraft('Untitled Draft');
    }

    // Render parts sidebar
    renderCanvasParts();

    // Compose and render canvas
    const canvasText = MegadraftManager.composeCanvas(currentDraft, {
      includeHeaders: true,
      headerStyle: 'markdown'
    });

    document.getElementById('canvas-editor').value = canvasText;
    updateCanvasStats();
    checkCanvasLimits();

    // Enable/disable save button
    const saveBtn = document.getElementById('btn-save-draft');
    saveBtn.disabled = currentDraft.parts.length === 0;
  }

  function renderCanvasParts() {
    const container = document.getElementById('canvas-parts-list');

    if (!currentDraft || currentDraft.parts.length === 0) {
      container.innerHTML = `
        <div class="empty-state-small">
          <p>No parts yet</p>
          <button class="btn-secondary-sm" id="btn-add-first-part">Add Prompt</button>
        </div>
      `;
      document.getElementById('btn-add-first-part').addEventListener('click', openAddPartModal);
      return;
    }

    container.innerHTML = currentDraft.parts.map((part, index) => `
      <div class="canvas-part-item" data-part-id="${part.id}" draggable="true">
        <span class="part-drag-handle">⋮⋮</span>
        <span class="part-number">${index + 1}</span>
        <div class="part-info">
          <div class="part-title">${escapeHtml(part.title)}</div>
          <div class="part-type">${part.type}</div>
        </div>
        <div class="part-actions">
          <button class="edit-part" data-part-id="${part.id}" title="Edit">✏️</button>
          <button class="delete-part" data-part-id="${part.id}" title="Delete">🗑️</button>
        </div>
      </div>
    `).join('');

    // Event listeners
    container.querySelectorAll('.canvas-part-item').forEach(item => {
      item.addEventListener('dragstart', handlePartDragStart);
      item.addEventListener('dragover', handlePartDragOver);
      item.addEventListener('drop', handlePartDrop);
      item.addEventListener('dragend', handlePartDragEnd);
    });

    container.querySelectorAll('.edit-part').forEach(btn => {
      btn.addEventListener('click', (e) => editPart(e.target.dataset.partId));
    });

    container.querySelectorAll('.delete-part').forEach(btn => {
      btn.addEventListener('click', (e) => deletePart(e.target.dataset.partId));
    });
  }

  function handlePartDragStart(e) {
    draggedPartId = e.currentTarget.dataset.partId;
    e.currentTarget.classList.add('dragging');
  }

  function handlePartDragOver(e) {
    e.preventDefault();
    const draggingItem = document.querySelector('.dragging');
    const items = [...document.querySelectorAll('.canvas-part-item:not(.dragging)')];
    
    const nextItem = items.find(item => {
      const box = item.getBoundingClientRect();
      return e.clientY < box.top + box.height / 2;
    });

    const container = document.getElementById('canvas-parts-list');
    
    if (nextItem) {
      container.insertBefore(draggingItem, nextItem);
    } else {
      container.appendChild(draggingItem);
    }
  }

  function handlePartDrop(e) {
    e.preventDefault();
  }

  function handlePartDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    
    // Update order in draft
    const newOrder = [...document.querySelectorAll('.canvas-part-item')].map(
      item => item.dataset.partId
    );
    
    MegadraftManager.reorderParts(currentDraft, newOrder);
    renderCanvas();
  }

  function editPart(partId) {
    const part = currentDraft.parts.find(p => p.id === partId);
    if (!part) return;

    if (part.type === 'prompt' && part.refId) {
      openPromptModal(part.refId);
    } else if (part.type === 'free') {
      // Open edit modal for free text
      const newContent = prompt('Edit part content:', part.content);
      if (newContent !== null) {
        MegadraftManager.updatePart(currentDraft, partId, { content: newContent });
        renderCanvas();
      }
    }
  }

  function deletePart(partId) {
    if (!confirm('Remove this part from canvas?')) return;

    MegadraftManager.removePart(currentDraft, partId);
    renderCanvas();
    showNotification('Part removed', 'success');
  }

  // === ADD PART MODAL ===

  function openAddPartModal() {
    const modal = document.getElementById('modal-add-part');
    switchPartType('prompt');
    renderPartPromptList();
    modal.classList.add('active');
  }

  function switchPartType(type) {
    document.querySelectorAll('.part-type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });

    document.querySelectorAll('.part-content').forEach(content => {
      content.classList.toggle('active', content.id === `part-content-${type}`);
    });

    if (type === 'prompt') {
      renderPartPromptList();
    } else if (type === 'template') {
      renderPartTemplateList();
    }
  }

  function renderPartPromptList() {
    const container = document.getElementById('part-prompt-list');
    const searchTerm = document.getElementById('part-prompt-search').value.toLowerCase();

    let prompts = currentData.prompts;

    if (searchTerm) {
      prompts = prompts.filter(p =>
        p.title.toLowerCase().includes(searchTerm) ||
        p.content.toLowerCase().includes(searchTerm)
      );
    }

    if (prompts.length === 0) {
      container.innerHTML = '<p style="text-align:center;padding:20px;color:var(--color-text-muted);">No prompts found</p>';
      return;
    }

    container.innerHTML = prompts.map(prompt => {
      const category = currentData.categories.find(c => c.id === prompt.categoryId);
      return `
        <div class="part-selection-item" data-prompt-id="${prompt.id}">
          <input type="radio" name="part-prompt" value="${prompt.id}" id="part-prompt-${prompt.id}">
          <label for="part-prompt-${prompt.id}" class="part-selection-info">
            <div class="part-selection-title">${escapeHtml(prompt.title)}</div>
            <div class="part-selection-meta">
              ${category ? `<span style="color: ${category.color}">${escapeHtml(category.name)}</span>` : ''}
              ${prompt.content.length} chars
            </div>
          </label>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.part-selection-item').forEach(item => {
      item.addEventListener('click', () => {
        const radio = item.querySelector('input[type="radio"]');
        radio.checked = true;
      });
    });
  }

  function renderPartTemplateList() {
    const container = document.getElementById('part-template-list');

    const frameworks = ['CRISE', 'CRAFT', 'TAG'];

    container.innerHTML = frameworks.map(fw => {
      const template = TemplateManager.FRAMEWORKS[fw];
      return `
        <div class="part-selection-item" data-framework="${fw}">
          <input type="radio" name="part-template" value="${fw}" id="part-template-${fw}">
          <label for="part-template-${fw}" class="part-selection-info">
            <div class="part-selection-title">${template.name}</div>
            <div class="part-selection-meta">${template.description}</div>
          </label>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.part-selection-item').forEach(item => {
      item.addEventListener('click', () => {
        const radio = item.querySelector('input[type="radio"]');
        radio.checked = true;
      });
    });
  }

  function handlePartPromptSearch() {
    renderPartPromptList();
  }

  function confirmAddPart() {
    const activeType = document.querySelector('.part-type-btn.active').dataset.type;

    if (activeType === 'prompt') {
      const selected = document.querySelector('input[name="part-prompt"]:checked');
      if (!selected) {
        showNotification('Please select a prompt', 'warning');
        return;
      }

      const prompt = currentData.prompts.find(p => p.id === selected.value);
      if (prompt) {
        MegadraftManager.addPart(currentDraft, {
          type: 'prompt',
          refId: prompt.id,
          title: prompt.title,
          content: prompt.content
        });
        
        renderCanvas();
        closeAllModals();
        showNotification('Prompt added to canvas', 'success');
      }
    } else if (activeType === 'template') {
      const selected = document.querySelector('input[name="part-template"]:checked');
      if (!selected) {
        showNotification('Please select a template', 'warning');
        return;
      }

      closeAllModals();
      openTemplateVarsModal(selected.value);
    } else if (activeType === 'free') {
      const title = document.getElementById('part-free-title').value || 'Free Text';
      const content = document.getElementById('part-free-content').value;

      if (!content || content.trim().length === 0) {
        showNotification('Please enter content', 'warning');
        return;
      }

      MegadraftManager.addPart(currentDraft, {
        type: 'free',
        title: title,
        content: content
      });

      renderCanvas();
      closeAllModals();
      showNotification('Free text added to canvas', 'success');
    }
  }

  // === TEMPLATE FUNCTIONS ===

  function openTemplateVarsModal(frameworkKey) {
    const modal = document.getElementById('modal-template-vars');
    const template = TemplateManager.createFromFramework(frameworkKey);
    currentTemplate = template;

    document.getElementById('modal-template-vars-title').textContent = `Fill ${template.name} Variables`;

    const container = document.getElementById('template-vars-container');
    container.innerHTML = template.variables.map(v => `
      <div class="var-input-group">
        <label>
          <code>{{${v.name}}}</code>
          ${v.required ? '<span class="var-required">* required</span>' : ''}
        </label>
        <p class="var-description">${v.description}</p>
        ${v.name === 'samples' || v.name === 'evaluation' || v.name === 'cut' || v.name === 'test' ?
          `<textarea id="var-${v.name}" rows="3" ${v.required ? 'required' : ''}></textarea>` :
          `<input type="text" id="var-${v.name}" ${v.required ? 'required' : ''}>`
        }
      </div>
    `).join('');

    // Live preview
    container.querySelectorAll('input, textarea').forEach(input => {
      input.addEventListener('input', updateTemplatePreview);
    });

    updateTemplatePreview();
    modal.classList.add('active');
  }

  function updateTemplatePreview() {
    if (!currentTemplate) return;

    const values = {};
    currentTemplate.variables.forEach(v => {
      const input = document.getElementById(`var-${v.name}`);
      if (input && input.value) {
        values[v.name] = input.value;
      }
    });

    currentTemplate.values = values;
    const preview = TemplateManager.getPreview(currentTemplate);
    document.getElementById('template-preview-text').value = preview;
  }

  function handleTemplateSubmit(e) {
    e.preventDefault();

    const values = {};
    currentTemplate.variables.forEach(v => {
      const input = document.getElementById(`var-${v.name}`);
      if (input) {
        values[v.name] = input.value;
      }
    });

    // Validate required
    const validation = TemplateManager.validateVariables(currentTemplate.variables, values);
    if (!validation.valid) {
      showNotification(`Missing required fields: ${validation.missing.join(', ')}`, 'warning');
      return;
    }

    currentTemplate.values = values;
    const resolved = TemplateManager.getPreview(currentTemplate);

    MegadraftManager.addPart(currentDraft, {
      type: 'template',
      refId: currentTemplate.frameworkId,
      title: currentTemplate.name,
      content: resolved
    });

    renderCanvas();
    closeAllModals();
    showNotification('Template added to canvas', 'success');
  }

  function renderTemplates() {
    // Built-in templates already in HTML
    // Custom templates would go here
  }

  // === DRAFTS FUNCTIONS ===

  function renderDrafts() {
    storage.loadAllDrafts().then(drafts => {
      const container = document.getElementById('drafts-list');
      const emptyState = document.getElementById('empty-drafts');

      if (drafts.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
      }

      container.style.display = 'flex';
      emptyState.style.display = 'none';

      drafts.sort((a, b) => new Date(b.modified) - new Date(a.modified));

      container.innerHTML = drafts.map(draft => {
        const stats = MegadraftManager.getStats(draft);
        const modified = new Date(draft.modified).toLocaleString();

        return `
          <div class="draft-card">
            <div class="draft-header">
              <h3 class="draft-title">${escapeHtml(draft.title)}</h3>
              <div class="draft-actions">
                <button class="load-draft-btn" data-draft-id="${draft.id}">Load</button>
                <button class="duplicate-draft-btn" data-draft-id="${draft.id}">Duplicate</button>
                <button class="delete-draft-btn" data-draft-id="${draft.id}">Delete</button>
              </div>
            </div>
            <div class="draft-stats">
              <span>${stats.parts} parts</span>
              <span>${stats.characters.toLocaleString()} chars</span>
              <span>${stats.words.toLocaleString()} words</span>
              <span>~${stats.tokens.toLocaleString()} tokens</span>
            </div>
            <div class="draft-meta">
              Last modified: ${modified}
            </div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.load-draft-btn').forEach(btn => {
        btn.addEventListener('click', () => loadDraft(btn.dataset.draftId));
      });

      container.querySelectorAll('.duplicate-draft-btn').forEach(btn => {
        btn.addEventListener('click', () => duplicateDraft(btn.dataset.draftId));
      });

      container.querySelectorAll('.delete-draft-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteDraftPermanent(btn.dataset.draftId));
      });
    });
  }

  async function loadDraft(draftId) {
    try {
      const draft = await storage.loadDraft(draftId);
      if (!draft) {
        showNotification('Draft not found', 'error');
        return;
      }

      currentDraft = draft;
      renderCanvas();
      switchTab('canvas');
      showNotification(`Loaded draft: ${draft.title}`, 'success');
    } catch (error) {
      showNotification('Error loading draft', 'error');
    }
  }

  async function duplicateDraft(draftId) {
    try {
      const draft = await storage.loadDraft(draftId);
      if (!draft) return;

      const duplicate = MegadraftManager.duplicate(draft);
      await storage.saveDraft(duplicate);
      
      renderDrafts();
      showNotification('Draft duplicated', 'success');
    } catch (error) {
      showNotification('Error duplicating draft', 'error');
    }
  }

  async function deleteDraftPermanent(draftId) {
    if (!confirm('Delete this draft permanently?')) return;

    try {
      await storage.deleteDraft(draftId);
      renderDrafts();
      showNotification('Draft deleted', 'success');
    } catch (error) {
      showNotification('Error deleting draft', 'error');
    }
  }

  function openLoadDraftModal() {
    // Simple implementation: just switch to drafts view
    switchTab('drafts');
  }

  // === PROMPTS, CATEGORIES, TAGS (Existing from Slice 3) ===
  // All existing functions from Slice 3 remain unchanged
  // Including: renderPrompts, renderCategories, renderTagsAndProfiles, etc.

  function renderPrompts() {
    const container = document.getElementById('prompt-list');
    const emptyState = document.getElementById('empty-prompts');
    const searchTerm = document.getElementById('search-prompts').value.toLowerCase();
    const filterCategory = document.getElementById('filter-category').value;

    let prompts = autoFilter.isEnabled() 
      ? autoFilter.filterPrompts(currentData.prompts, currentData.tags)
      : currentData.prompts;

    prompts = prompts.filter(p => {
      const matchesSearch = !searchTerm || 
        p.title.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm) ||
        p.content.toLowerCase().includes(searchTerm);
      
      const matchesCategory = !filterCategory || p.categoryId === filterCategory;

      return matchesSearch && matchesCategory;
    });

    prompts.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    if (prompts.length === 0) {
      container.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    container.style.display = 'flex';
    emptyState.style.display = 'none';

    container.innerHTML = prompts.map(prompt => {
      const category = currentData.categories.find(c => c.id === prompt.categoryId);
      const tags = prompt.tagIds
        .map(tid => currentData.tags.find(t => t.id === tid))
        .filter(Boolean);

      return `
        <div class="item-card" data-id="${prompt.id}">
          <div class="item-header">
            <h3 class="item-title">${escapeHtml(prompt.title)}</h3>
            <div class="item-actions">
              <button class="btn-clipboard-sm" data-id="${prompt.id}" title="Copy to clipboard">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                </svg>
              </button>
              <button class="edit-btn" data-id="${prompt.id}" title="Edit">✏️</button>
              <button class="delete-btn" data-id="${prompt.id}" title="Delete">🗑️</button>
            </div>
          </div>
          ${prompt.description ? `<p class="item-description">${escapeHtml(prompt.description)}</p>` : ''}
          <div class="item-meta">
            ${category ? `<span class="category-badge" style="background: ${category.color}">${escapeHtml(category.name)}</span>` : ''}
            <div class="item-tags">
              ${tags.map(tag => {
                const profileClass = tag.isProfile ? 'profile-tag' : '';
                return `<span class="tag-badge ${profileClass}" style="background: ${tag.color}">${escapeHtml(tag.name)}</span>`;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-clipboard-sm').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await copyPromptToClipboard(btn.dataset.id, btn);
      });
    });
    
    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openPromptModal(btn.dataset.id);
      });
    });
    
    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deletePrompt(btn.dataset.id);
      });
    });
  }

  async function copyPromptToClipboard(promptId, btn) {
    const prompt = currentData.prompts.find(p => p.id === promptId);
    if (!prompt) return;

    try {
      btn.classList.add('loading');
      await navigator.clipboard.writeText(prompt.content);
      
      btn.classList.remove('loading');
      btn.classList.add('success');
      showNotification('Prompt copied', 'success');
      
      setTimeout(() => {
        btn.classList.remove('success');
      }, 800);
    } catch (error) {
      btn.classList.remove('loading');
      showNotification('Error copying', 'error');
    }
  }

  function handleSearchPrompts() {
    renderPrompts();
  }

  function toggleAutoFilterPrompts(e) {
    const enabled = e.target.checked;
    autoFilter.setEnabled(enabled);
    
    if (enabled) {
      renderProfileChips('profile-chips-prompts');
    } else {
      document.getElementById('profile-chips-prompts').style.display = 'none';
    }

    renderPrompts();
  }

  function syncAutoFilterState(view) {
    const enabled = autoFilter.isEnabled();
    
    if (view === 'prompts') {
      document.getElementById('auto-filter-toggle-prompts').checked = enabled;
      if (enabled) {
        renderProfileChips('profile-chips-prompts');
      }
    }
  }

  function renderProfileChips(containerId) {
    const container = document.getElementById(containerId);
    const matchedProfiles = autoFilter.getMatchedProfileTags(currentData.tags);

    if (matchedProfiles.length === 0) {
      container.innerHTML = '<span class="profile-chip">No profile detected</span>';
    } else {
      container.innerHTML = matchedProfiles.map(profile => `
        <span class="profile-chip active" style="background: ${profile.color}">
          ${escapeHtml(profile.name)}
        </span>
      `).join('');
    }

    container.style.display = 'flex';
  }

  function openPromptModal(promptId = null) {
    const modal = document.getElementById('modal-prompt');
    const form = document.getElementById('form-prompt');
    const title = document.getElementById('modal-prompt-title');

    editingPromptId = promptId;

    if (promptId) {
      const prompt = currentData.prompts.find(p => p.id === promptId);
      if (!prompt) return;

      title.textContent = 'Edit Category';
      document.getElementById('category-name').value = category.name;
      document.getElementById('category-color').value = category.color;
    } else {
      title.textContent = 'New Category';
      form.reset();
      document.getElementById('category-color').value = '#3B82F6';
    }

    modal.classList.add('active');
  }

  async function handleCategorySubmit(e) {
    e.preventDefault();

    const name = document.getElementById('category-name').value;
    const color = document.getElementById('category-color').value;

    try {
      if (editingCategoryId) {
        await storage.updateCategory(editingCategoryId, { name, color });
        showNotification('Category updated', 'success');
      } else {
        await storage.addCategory(name, color);
        showNotification('Category created', 'success');
      }

      await loadData();
      renderAll();
      closeAllModals();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }

  async function deleteCategory(categoryId) {
    const promptCount = currentData.prompts.filter(p => p.categoryId === categoryId).length;
    const message = promptCount > 0
      ? `This category is used by ${promptCount} prompt(s). Prompts will not be deleted but category assignment will be removed. Continue?`
      : 'Delete this category?';

    if (!confirm(message)) return;

    try {
      await storage.deleteCategory(categoryId);
      await loadData();
      renderAll();
      showNotification('Category deleted', 'success');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }

  function renderTagsAndProfiles() {
    const normalTags = DataModel.getNormalTags(currentData.tags);
    const profiles = DataModel.getProfiles(currentData.tags);

    // Render tags
    const tagContainer = document.getElementById('tag-list');
    const emptyTags = document.getElementById('empty-tags');

    if (normalTags.length === 0) {
      tagContainer.style.display = 'none';
      emptyTags.style.display = 'flex';
    } else {
      tagContainer.style.display = 'flex';
      emptyTags.style.display = 'none';

      tagContainer.innerHTML = normalTags.map(tag => {
        const promptCount = currentData.prompts.filter(p => p.tagIds.includes(tag.id)).length;
        return `
          <div class="tag-item">
            <div class="tag-name">
              <div class="color-indicator" style="background: ${tag.color}"></div>
              <span>${escapeHtml(tag.name)}</span>
              <span style="color: var(--color-text-muted); font-size: 12px;">(${promptCount} prompts)</span>
            </div>
            <div class="item-actions">
              <button class="edit-btn" data-id="${tag.id}">✏️ Edit</button>
              <button class="delete-btn" data-id="${tag.id}">🗑️ Delete</button>
            </div>
          </div>
        `;
      }).join('');

      tagContainer.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openTagModal(false, btn.dataset.id));
      });
      tagContainer.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteTag(btn.dataset.id));
      });
    }

    // Render profiles
    const profileContainer = document.getElementById('profile-list');
    const emptyProfiles = document.getElementById('empty-profiles');

    if (profiles.length === 0) {
      profileContainer.style.display = 'none';
      emptyProfiles.style.display = 'flex';
    } else {
      profileContainer.style.display = 'flex';
      emptyProfiles.style.display = 'none';

      profileContainer.innerHTML = profiles.map(tag => {
        const promptCount = currentData.prompts.filter(p => p.tagIds.includes(tag.id)).length;
        const isDefault = tag.isDefault ? ' (Default)' : '';
        return `
          <div class="tag-item">
            <div class="tag-name">
              <div class="color-indicator" style="background: ${tag.color}"></div>
              <span>${escapeHtml(tag.name)}${isDefault} ◆</span>
              <span style="color: var(--color-text-muted); font-size: 12px;">(${promptCount} prompts)</span>
            </div>
            <div class="item-actions">
              <button class="edit-btn" data-id="${tag.id}">✏️ Edit</button>
              <button class="delete-btn" data-id="${tag.id}">🗑️ Delete</button>
            </div>
          </div>
        `;
      }).join('');

      profileContainer.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openTagModal(true, btn.dataset.id));
      });
      profileContainer.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteTag(btn.dataset.id));
      });
    }
  }

  function openTagModal(isProfile = false, tagId = null) {
    const modal = document.getElementById('modal-tag');
    const form = document.getElementById('form-tag');
    const title = document.getElementById('modal-tag-title');
    const isProfileCheckbox = document.getElementById('tag-is-profile');

    editingTagId = tagId;

    if (tagId) {
      const tag = currentData.tags.find(t => t.id === tagId);
      if (!tag) return;

      title.textContent = tag.isProfile ? 'Edit Profile' : 'Edit Tag';
      document.getElementById('tag-name').value = tag.name;
      document.getElementById('tag-color').value = tag.color;
      isProfileCheckbox.checked = tag.isProfile || false;
    } else {
      title.textContent = isProfile ? 'New Profile' : 'New Tag';
      form.reset();
      document.getElementById('tag-color').value = '#8B5CF6';
      isProfileCheckbox.checked = isProfile;
    }

    modal.classList.add('active');
  }

  async function handleTagSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('tag-name').value;
    const color = document.getElementById('tag-color').value;
    const isProfile = document.getElementById('tag-is-profile').checked;

    try {
      if (editingTagId) {
        await storage.updateTag(editingTagId, { name, color, isProfile });
        showNotification(isProfile ? 'Profile updated' : 'Tag updated', 'success');
      } else {
        await storage.addTag(name, color, isProfile);
        showNotification(isProfile ? 'Profile created' : 'Tag created', 'success');
      }

      await loadData();
      renderAll();
      closeAllModals();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }

  async function deleteTag(tagId) {
    const tag = currentData.tags.find(t => t.id === tagId);
    const promptCount = currentData.prompts.filter(p => p.tagIds.includes(tagId)).length;
    const itemType = tag?.isProfile ? 'Profile' : 'Tag';
    
    const message = promptCount > 0
      ? `This ${itemType} is used by ${promptCount} prompt(s). Prompts will not be deleted but the ${itemType} will be removed. Continue?`
      : `Delete this ${itemType}?`;

    if (!confirm(message)) return;

    try {
      await storage.deleteTag(tagId);
      await loadData();
      renderAll();
      showNotification(`${itemType} deleted`, 'success');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }

  // === SETTINGS & EXPORT/IMPORT ===

  async function openSettingsModal() {
    const modal = document.getElementById('modal-settings');
    await renderBackupList();
    modal.classList.add('active');
  }

  async function renderBackupList() {
    const container = document.getElementById('backup-list');
    
    try {
      const backups = await ExportImportManager.listBackups();
      
      if (backups.length === 0) {
        container.innerHTML = '<div class="backup-list-empty">No backups available</div>';
        return;
      }

      container.innerHTML = backups.map(backup => {
        const date = new Date(backup.date).toLocaleString('en-US');
        const size = (backup.size / 1024).toFixed(1);

        return `
          <div class="backup-item">
            <div class="backup-info">
              <div class="backup-date">${date}</div>
              <div class="backup-size">${size} KB</div>
            </div>
            <div class="backup-actions">
              <button class="restore-backup-btn" data-key="${backup.key}">Restore</button>
            </div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.restore-backup-btn').forEach(btn => {
        btn.addEventListener('click', () => restoreBackup(btn.dataset.key));
      });
    } catch (error) {
      console.error('Error loading backups:', error);
      container.innerHTML = '<div class="backup-list-empty">Error loading backups</div>';
    }
  }

  async function restoreBackup(backupKey) {
    if (!confirm('Restore this backup? Your current data will be overwritten.')) {
      return;
    }

    try {
      const restoredData = await ExportImportManager.restoreBackup(backupKey);
      ExportImportManager.createAutoBackup(currentData);
      
      await storage.save(restoredData);
      await loadData();
      renderAll();

      showNotification('Backup restored successfully', 'success');
      closeAllModals();
    } catch (error) {
      showNotification('Error restoring backup', 'error');
    }
  }

  function exportAllData() {
    try {
      const filename = ExportImportManager.exportToJSON(currentData);
      showNotification(`Export successful: ${filename}`, 'success');
      ExportImportManager.createAutoBackup(currentData);
    } catch (error) {
      showNotification('Error exporting data', 'error');
    }
  }

  async function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      pendingImportData = await ExportImportManager.importFromJSON(file);
      openImportStrategyModal();
    } catch (error) {
      showNotification(error.message, 'error');
    }

    e.target.value = '';
  }

  function openImportStrategyModal() {
    const modal = document.getElementById('modal-import-strategy');
    modal.classList.add('active');
  }

  async function confirmImport() {
    if (!pendingImportData) return;

    const strategy = document.querySelector('input[name="import-strategy"]:checked').value;

    try {
      const result = ExportImportManager.mergeData(
        currentData,
        pendingImportData,
        strategy
      );

      await storage.save(result.data);
      await loadData();
      renderAll();

      const stats = result.stats;
      const message = `Import successful!\n` +
        `Categories: ${stats.categories.added} new, ${stats.categories.updated} updated, ${stats.categories.skipped} skipped\n` +
        `Tags: ${stats.tags.added} new, ${stats.tags.updated} updated, ${stats.tags.skipped} skipped\n` +
        `Prompts: ${stats.prompts.added} new, ${stats.prompts.updated} updated, ${stats.prompts.skipped} skipped`;

      showNotification(message, 'success');
      ExportImportManager.createAutoBackup(currentData);

      closeAllModals();
      pendingImportData = null;
    } catch (error) {
      showNotification('Error importing data', 'error');
    }
  }

  async function deleteAllData() {
    const confirmation = prompt(
      'WARNING: All data will be deleted!\n\n' +
      'This cannot be undone.\n\n' +
      'Type "DELETE" to confirm:'
    );

    if (confirmation !== 'DELETE') return;

    try {
      ExportImportManager.createAutoBackup(currentData);
      await storage.clear();
      await loadData();
      renderAll();
      showNotification('All data deleted', 'success');
      closeAllModals();
    } catch (error) {
      showNotification('Error deleting data', 'error');
    }
  }

  // === UTILITY FUNCTIONS ===

  function updateCategorySelects() {
    const selects = [
      document.getElementById('filter-category'),
      document.getElementById('prompt-category')
    ];

    selects.forEach(select => {
      const currentValue = select.value;
      const options = select.id === 'filter-category'
        ? '<option value="">All Categories</option>'
        : '<option value="">No Category</option>';

      select.innerHTML = options + currentData.categories.map(cat => 
        `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`
      ).join('');

      select.value = currentValue;
    });
  }

  function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.remove('active');
    });
    editingPromptId = null;
    editingCategoryId = null;
    editingTagId = null;
    currentTemplate = null;
  }

  // Expose some functions for debugging
  window.debugCanvas = () => {
    console.log('Current Draft:', currentDraft);
    console.log('Stats:', MegadraftManager.getStats(currentDraft));
  };

})(); // End IIFE

// === END SLICE 4 COMPLETE === 