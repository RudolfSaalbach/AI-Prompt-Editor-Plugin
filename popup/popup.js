(function() {
  'use strict';

  // === GLOBAL STATE ===
  let storage;
  let currentData = {
    prompts: [],
    categories: [],
    tags: [],
    drafts: [],
    templates: []
  };
  
  let currentView = 'prompts'; // Start with Prompts, not Canvas
  let currentDraft = null;
  let editingPromptId = null;
  let editingCategoryId = null;
  let editingTagId = null;
  let editingIsProfile = false;
  let importedData = null;
  
  // Add Part Modal State
  let selectedPartType = 'prompt';
  let selectedPromptId = null;
  let selectedTemplateKey = null;

  // === NOTIFICATIONS (MUSS GANZ OBEN SEIN) ===
  window.showNotification = function(message, type = 'info') {
    let container = document.getElementById('notification-container');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
      document.body.appendChild(container);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  };

  // Alias für globalen Zugriff
  const showNotification = window.showNotification;

  // === INITIALIZATION ===
  
  async function init() {
    console.log('[AI Prompt Manager] Initialisierung...');
    
    storage = new StorageManager();
    await loadData();
    
    // Init Slice 5 Features (if available)
    if (typeof initUsabilityFeatures !== 'undefined') {
      await initUsabilityFeatures();
    }
    
    initEventListeners();
    
    // Start mit Prompts View
    switchTab('prompts');
    
    console.log('[AI Prompt Manager] ✅ Ready');
  }

  async function loadData() {
    try {
      currentData = await storage.load();
      
      // Ensure arrays exist
      if (!currentData.prompts) currentData.prompts = [];
      if (!currentData.categories) currentData.categories = [];
      if (!currentData.tags) currentData.tags = [];
      if (!currentData.drafts) currentData.drafts = [];
      if (!currentData.templates) currentData.templates = [];
      
      console.log('[AI Prompt Manager] Data loaded:', currentData);
    } catch (error) {
      console.error('[AI Prompt Manager] Load error:', error);
      showNotification('Error loading data', 'error');
    }
  }

  function initEventListeners() {
    // Tab Navigation
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.view));
    });

    // Subtabs
    document.querySelectorAll('.subtab').forEach(subtab => {
      subtab.addEventListener('click', () => switchSubtab(subtab.dataset.subtab));
    });

    // Modal Close
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => closeAllModals());
    });

    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAllModals();
      });
    });

    // === CANVAS EVENTS ===
    safeAddListener('btn-new-draft', 'click', createNewDraft);
    safeAddListener('btn-load-draft', 'click', openLoadDraftModal);
    safeAddListener('btn-save-draft', 'click', saveCurrentDraft);
    safeAddListener('btn-copy-canvas', 'click', copyCanvasToClipboard);
    safeAddListener('btn-add-part', 'click', openAddPartModal);
    safeAddListener('btn-copy-canvas-minify', 'click', copyCanvasMinified);
    
    // Canvas Editor Live Update
    const canvasEditor = document.getElementById('canvas-editor');
    if (canvasEditor) {
      canvasEditor.addEventListener('input', () => {
        updateCanvasStats();
        enableSaveButton();
      });
    }

    // === PROMPTS EVENTS ===
    safeAddListener('btn-add-prompt', 'click', () => openPromptModal());
    safeAddListener('btn-empty-create-prompt', 'click', () => openPromptModal());
    safeAddListener('form-prompt', 'submit', handlePromptSubmit);
    safeAddListener('search-prompts', 'input', debounce(handleSearchPrompts, 200));

    // === CATEGORIES EVENTS ===
    safeAddListener('btn-add-category', 'click', () => openCategoryModal());
    safeAddListener('form-category', 'submit', handleCategorySubmit);

    // === TAGS EVENTS ===
    safeAddListener('btn-add-tag', 'click', () => openTagModal(false));
    safeAddListener('btn-add-profile', 'click', () => openTagModal(true));
    safeAddListener('form-tag', 'submit', handleTagSubmit);

    // === SETTINGS EVENTS ===
    safeAddListener('btn-settings', 'click', openSettingsModal);
    safeAddListener('btn-export-all', 'click', exportAllData);
    safeAddListener('btn-import-file', 'click', () => {
      document.getElementById('file-import')?.click();
    });
    safeAddListener('file-import', 'change', handleFileImport);
    safeAddListener('btn-delete-all-data', 'click', deleteAllData);

    // === DRAFTS EVENTS ===
    safeAddListener('btn-create-draft-from-view', 'click', createNewDraft);
    safeAddListener('btn-empty-create-draft', 'click', createNewDraft);

    // === TEMPLATES EVENTS ===
    document.querySelectorAll('.btn-use-template').forEach(btn => {
      btn.addEventListener('click', () => openTemplateModal(btn.dataset.framework));
    });
    safeAddListener('form-template-vars', 'submit', handleTemplateSubmit);
    safeAddListener('btn-add-custom-template', 'click', () => {
      showNotification('Custom templates coming soon', 'info');
    });

    // === ADD PART MODAL ===
    document.querySelectorAll('.part-type-btn').forEach(btn => {
      btn.addEventListener('click', () => switchPartType(btn.dataset.type));
    });
    safeAddListener('btn-confirm-add-part', 'click', handleAddPartSubmit);
    safeAddListener('part-prompt-search', 'input', debounce(filterPartPrompts, 200));
  }

  function safeAddListener(id, event, handler) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener(event, handler);
    }
  }

  function enableSaveButton() {
    const saveBtn = document.getElementById('btn-save-draft');
    if (saveBtn && currentDraft) {
      saveBtn.disabled = false;
    }
  }

  function disableSaveButton() {
    const saveBtn = document.getElementById('btn-save-draft');
    if (saveBtn) {
      saveBtn.disabled = true;
    }
  }

  // === VIEW MANAGEMENT ===

  function switchTab(viewName) {
    currentView = viewName;
    
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === viewName);
    });
    
    document.querySelectorAll('.view').forEach(view => {
      view.classList.toggle('active', view.id === `view-${viewName}`);
    });
    
    if (viewName === 'canvas') renderCanvas();
    if (viewName === 'prompts') renderPrompts();
    if (viewName === 'categories') renderCategories();
    if (viewName === 'tags') renderTags();
    if (viewName === 'drafts') renderDrafts();
    if (viewName === 'templates') renderTemplates();
  }

  function switchSubtab(subtabName) {
    document.querySelectorAll('.subtab').forEach(subtab => {
      subtab.classList.toggle('active', subtab.dataset.subtab === subtabName);
    });
    
    const tagList = document.getElementById('tag-list');
    const profileList = document.getElementById('profile-list');
    
    if (subtabName === 'tags') {
      if (tagList) tagList.style.display = 'flex';
      if (profileList) profileList.style.display = 'none';
    } else if (subtabName === 'profiles') {
      if (tagList) tagList.style.display = 'none';
      if (profileList) profileList.style.display = 'flex';
    }
  }

  function renderAll() {
    if (currentView === 'canvas') renderCanvas();
    if (currentView === 'prompts') renderPrompts();
    if (currentView === 'categories') renderCategories();
    if (currentView === 'tags') renderTags();
    if (currentView === 'drafts') renderDrafts();
    if (currentView === 'templates') renderTemplates();
  }

  // === CANVAS VIEW ===

  function renderCanvas() {
    if (!currentDraft) {
      createNewDraft();
    } else {
      renderCanvasParts();
      updateCanvasEditor();
    }
  }

  function createNewDraft() {
    currentDraft = MegadraftManager.createDraft('Untitled Draft');
    switchTab('canvas');
    renderCanvasParts();
    updateCanvasEditor();
    enableSaveButton();
    showNotification('New draft created', 'success');
  }

  function renderCanvasParts() {
    const container = document.getElementById('canvas-parts-list');
    if (!container) return;

    if (!currentDraft || currentDraft.parts.length === 0) {
      container.innerHTML = `
        <div class="empty-state-small">
          <p>No parts yet</p>
          <button class="btn-secondary-sm" id="btn-add-first-part">Add Prompt</button>
        </div>
      `;
      const btn = document.getElementById('btn-add-first-part');
      if (btn) btn.addEventListener('click', openAddPartModal);
      disableSaveButton();
      return;
    }

    container.innerHTML = currentDraft.parts.map((part, index) => `
      <div class="canvas-part-item" data-part-id="${part.id}">
        <span class="part-drag-handle">⋮⋮</span>
        <span class="part-number">${index + 1}</span>
        <div class="part-info">
          <div class="part-title">${escapeHtml(part.title || 'Untitled')}</div>
          <div class="part-type">${part.type || 'prompt'}</div>
        </div>
        <div class="part-actions">
          <button class="delete-part" data-part-id="${part.id}" title="Delete">×</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.delete-part').forEach(btn => {
      btn.addEventListener('click', () => deletePart(btn.dataset.partId));
    });
    
    enableSaveButton();
  }

  function updateCanvasEditor() {
    const editor = document.getElementById('canvas-editor');
    if (!editor || !currentDraft) return;

    const composed = MegapromptBuilder.buildFromDraft(currentDraft, {
      includeHeaders: true,
      headerStyle: 'markdown',
      numbering: true
    });

    editor.value = composed;
    updateCanvasStats();
  }

  function updateCanvasStats() {
    if (!currentDraft) return;
    
    const stats = MegadraftManager.getStats(currentDraft);

    const charEl = document.getElementById('canvas-char-count');
    const wordEl = document.getElementById('canvas-word-count');
    const partEl = document.getElementById('canvas-part-count');
    const tokenEl = document.getElementById('canvas-token-estimate');

    if (charEl) charEl.textContent = `${stats.characters} characters`;
    if (wordEl) wordEl.textContent = `${stats.words} words`;
    if (partEl) partEl.textContent = `${stats.parts} parts`;
    if (tokenEl) tokenEl.textContent = `~${stats.tokens} tokens`;
  }

  async function copyCanvasToClipboard() {
    const editor = document.getElementById('canvas-editor');
    if (!editor || !editor.value) {
      showNotification('Canvas is empty', 'info');
      return;
    }

    try {
      await navigator.clipboard.writeText(editor.value);
      if (currentDraft) {
        MegadraftManager.markCopied(currentDraft);
      }
      showNotification('Copied to clipboard', 'success');
    } catch (error) {
      console.error('[Canvas] Copy error:', error);
      showNotification('Failed to copy', 'error');
    }
  }

  async function copyCanvasMinified() {
    const editor = document.getElementById('canvas-editor');
    if (!editor || !editor.value) {
      showNotification('Canvas is empty', 'info');
      return;
    }

    try {
      if (typeof copyWithMinifiedWhitespace !== 'undefined') {
        await copyWithMinifiedWhitespace(editor.value);
      } else {
        // Fallback: Simple minify
        const minified = editor.value
          .split('\n')
          .map(line => line.trim())
          .join('\n')
          .replace(/\n{3,}/g, '\n\n')
          .replace(/ {2,}/g, ' ')
          .trim();
        
        await navigator.clipboard.writeText(minified);
        showNotification('Copied (minified)', 'success');
      }
    } catch (error) {
      console.error('[CopyMinify] Error:', error);
      showNotification('Failed to copy', 'error');
    }
  }
  
  // === ADD PART MODAL FORTSETZUNG ===

  function openAddPartModal() {
    const modal = document.getElementById('modal-add-part');
    if (!modal) return;

    selectedPartType = 'prompt';
    selectedPromptId = null;
    selectedTemplateKey = null;

    switchPartType('prompt');
    renderPartPromptList();
    renderPartTemplateList();

    modal.classList.add('active');
  }

  function switchPartType(type) {
    selectedPartType = type;

    document.querySelectorAll('.part-type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });

    document.querySelectorAll('.part-content').forEach(content => {
      content.classList.toggle('active', content.id === `part-content-${type}`);
    });
  }

  function renderPartPromptList() {
    const container = document.getElementById('part-prompt-list');
    if (!container) return;

    const searchTerm = document.getElementById('part-prompt-search')?.value.toLowerCase() || '';
    const filtered = currentData.prompts.filter(p => 
      p.title.toLowerCase().includes(searchTerm) ||
      (p.description && p.description.toLowerCase().includes(searchTerm))
    );

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state-small"><p>No prompts found</p></div>';
      return;
    }

    container.innerHTML = filtered.map(prompt => `
      <div class="part-selection-item ${selectedPromptId === prompt.id ? 'selected' : ''}" data-id="${prompt.id}">
        <input type="radio" name="part-prompt" value="${prompt.id}" ${selectedPromptId === prompt.id ? 'checked' : ''}>
        <div class="part-selection-info">
          <div class="part-selection-title">${escapeHtml(prompt.title)}</div>
          ${prompt.description ? `<div class="part-selection-meta">${escapeHtml(prompt.description)}</div>` : ''}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.part-selection-item').forEach(item => {
      item.addEventListener('click', () => {
        selectedPromptId = item.dataset.id;
        renderPartPromptList();
      });
    });
  }

  function renderPartTemplateList() {
    const container = document.getElementById('part-template-list');
    if (!container) return;

    const frameworks = Object.values(TemplateManager.FRAMEWORKS);

    container.innerHTML = frameworks.map(fw => `
      <div class="part-selection-item ${selectedTemplateKey === fw.id ? 'selected' : ''}" data-key="${fw.id}">
        <input type="radio" name="part-template" value="${fw.id}" ${selectedTemplateKey === fw.id ? 'checked' : ''}>
        <div class="part-selection-info">
          <div class="part-selection-title">${escapeHtml(fw.name)}</div>
          <div class="part-selection-meta">${escapeHtml(fw.description)}</div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.part-selection-item').forEach(item => {
      item.addEventListener('click', () => {
        selectedTemplateKey = item.dataset.key;
        renderPartTemplateList();
      });
    });
  }

  function filterPartPrompts() {
    renderPartPromptList();
  }

  async function handleAddPartSubmit() {
    if (selectedPartType === 'prompt' && selectedPromptId) {
      const prompt = currentData.prompts.find(p => p.id === selectedPromptId);
      if (!prompt) return;

      MegadraftManager.addPart(currentDraft, {
        type: 'prompt',
        refId: prompt.id,
        title: prompt.title,
        content: prompt.content,
        separator: '\n\n'
      });

      renderCanvasParts();
      updateCanvasEditor();
      closeAllModals();
      showNotification('Prompt added to canvas', 'success');

    } else if (selectedPartType === 'template' && selectedTemplateKey) {
      closeAllModals();
      openTemplateModal(selectedTemplateKey);

    } else if (selectedPartType === 'free') {
      const title = document.getElementById('part-free-title')?.value.trim() || 'Free Text';
      const content = document.getElementById('part-free-content')?.value.trim();

      if (!content) {
        showNotification('Content is required', 'error');
        return;
      }

      MegadraftManager.addPart(currentDraft, {
        type: 'free',
        title: title,
        content: content,
        separator: '\n\n'
      });

      renderCanvasParts();
      updateCanvasEditor();
      closeAllModals();
      showNotification('Free text added to canvas', 'success');
    } else {
      showNotification('Please select an item', 'warning');
    }
  }

  function deletePart(partId) {
    if (!currentDraft) return;
    MegadraftManager.removePart(currentDraft, partId);
    renderCanvasParts();
    updateCanvasEditor();
    showNotification('Part removed', 'success');
  }

  async function saveCurrentDraft() {
    if (!currentDraft) return;
    
    try {
      await storage.saveDraft(currentDraft);
      disableSaveButton();
      showNotification('Draft saved', 'success');
    } catch (error) {
      console.error('[Draft] Save error:', error);
      showNotification('Failed to save draft', 'error');
    }
  }

  async function openLoadDraftModal() {
    try {
      const drafts = await storage.loadAllDrafts();
      
      if (drafts.length === 0) {
        showNotification('No drafts saved', 'info');
        return;
      }

      const choice = confirm(`Load most recent draft?\n\n"${drafts[0].title || 'Untitled'}"\n${drafts[0].parts.length} parts`);
      if (choice && drafts[0]) {
        currentDraft = drafts[0];
        renderCanvas();
        showNotification('Draft loaded', 'success');
      }
    } catch (error) {
      console.error('[Draft] Load error:', error);
      showNotification('Failed to load drafts', 'error');
    }
  }

  // === TEMPLATES ===

  function renderTemplates() {
    // Templates are pre-rendered in HTML
    // Just ensure event listeners are attached
    document.querySelectorAll('.btn-use-template').forEach(btn => {
      btn.removeEventListener('click', handleTemplateClick);
      btn.addEventListener('click', handleTemplateClick);
    });
  }

  function handleTemplateClick(e) {
    const framework = e.target.dataset.framework;
    if (framework) {
      openTemplateModal(framework);
    }
  }

  function openTemplateModal(frameworkKey) {
    const modal = document.getElementById('modal-template-vars');
    const title = document.getElementById('modal-template-vars-title');
    const container = document.getElementById('template-vars-container');
    
    if (!modal || !title || !container) return;

    const framework = TemplateManager.FRAMEWORKS[frameworkKey];
    if (!framework) return;

    title.textContent = `Fill ${framework.name} Variables`;
    
    container.innerHTML = framework.variables.map(v => `
      <div class="var-input-group">
        <label>
          <code>${v.name}</code>
          ${v.required ? '<span class="var-required">*</span>' : ''}
          ${v.description ? `<span class="var-description">${escapeHtml(v.description)}</span>` : ''}
        </label>
        <textarea 
          id="var-${v.name}" 
          rows="3" 
          ${v.required ? 'required' : ''}
          placeholder="Enter ${v.name}..."
        ></textarea>
      </div>
    `).join('');

    modal.dataset.framework = frameworkKey;
    modal.classList.add('active');

    // Live preview
    container.querySelectorAll('textarea').forEach(ta => {
      ta.addEventListener('input', updateTemplatePreview);
    });
    updateTemplatePreview();
  }

  function updateTemplatePreview() {
    const modal = document.getElementById('modal-template-vars');
    const preview = document.getElementById('template-preview-text');
    if (!modal || !preview) return;

    const frameworkKey = modal.dataset.framework;
    const framework = TemplateManager.FRAMEWORKS[frameworkKey];
    if (!framework) return;

    const values = {};
    framework.variables.forEach(v => {
      const input = document.getElementById(`var-${v.name}`);
      if (input) values[v.name] = input.value;
    });

    const resolved = TemplateManager.resolveTemplate(framework.template, values);
    preview.value = resolved;
  }

  async function handleTemplateSubmit(e) {
    e.preventDefault();

    const modal = document.getElementById('modal-template-vars');
    const frameworkKey = modal.dataset.framework;
    const framework = TemplateManager.FRAMEWORKS[frameworkKey];
    
    if (!framework) return;

    const values = {};
    framework.variables.forEach(v => {
      const input = document.getElementById(`var-${v.name}`);
      if (input) values[v.name] = input.value;
    });

    const validation = TemplateManager.validateVariables(framework.variables, values);
    if (!validation.valid) {
      showNotification(`Missing required fields: ${validation.missing.join(', ')}`, 'error');
      return;
    }

    const content = TemplateManager.resolveTemplate(framework.template, values);

    if (!currentDraft) {
      currentDraft = MegadraftManager.createDraft('Untitled Draft');
    }

    MegadraftManager.addPart(currentDraft, {
      type: 'template',
      refId: frameworkKey,
      title: framework.name,
      content: content,
      separator: '\n\n'
    });

    switchTab('canvas');
    renderCanvasParts();
    updateCanvasEditor();
    closeAllModals();
    showNotification('Template added to canvas', 'success');
  }

  // === PROMPTS VIEW ===

  function renderPrompts() {
    const container = document.getElementById('prompt-list');
    const emptyState = document.getElementById('empty-prompts');
    if (!container || !emptyState) return;

    if (currentData.prompts.length === 0) {
      container.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    container.style.display = 'flex';
    emptyState.style.display = 'none';

    container.innerHTML = currentData.prompts.map(prompt => {
      const category = currentData.categories.find(c => c.id === prompt.categoryId);
      const tags = (prompt.tagIds || [])
        .map(tid => currentData.tags.find(t => t.id === tid))
        .filter(Boolean);

      return `
        <div class="item-card" data-id="${prompt.id}">
          <div class="item-header">
            <h3 class="item-title">${escapeHtml(prompt.title)}</h3>
            <div class="item-actions">
              <button class="btn-clipboard-sm" data-id="${prompt.id}" title="Copy">
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
              ${tags.map(tag => `
                <span class="tag-badge ${tag.isProfile ? 'profile-tag' : ''}" style="background: ${tag.color}">
                  ${escapeHtml(tag.name)}
                </span>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-clipboard-sm').forEach(btn => {
      btn.addEventListener('click', () => copyPromptToClipboard(btn.dataset.id));
    });

    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openPromptModal(btn.dataset.id));
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deletePrompt(btn.dataset.id));
    });
  }

  async function copyPromptToClipboard(promptId) {
    const prompt = currentData.prompts.find(p => p.id === promptId);
    if (!prompt) return;

    try {
      await navigator.clipboard.writeText(prompt.content);
      showNotification('Copied to clipboard', 'success');
    } catch (error) {
      console.error('[Prompt] Copy error:', error);
      showNotification('Failed to copy', 'error');
    }
  }

  function handleSearchPrompts() {
    renderPrompts();
  }

  function openPromptModal(promptId = null) {
    const modal = document.getElementById('modal-prompt');
    const form = document.getElementById('form-prompt');
    const title = document.getElementById('modal-prompt-title');
    if (!modal || !form || !title) return;

    editingPromptId = promptId;

    if (promptId) {
      const prompt = currentData.prompts.find(p => p.id === promptId);
      if (!prompt) return;

      title.textContent = 'Edit Prompt';
      document.getElementById('prompt-title').value = prompt.title;
      document.getElementById('prompt-description').value = prompt.description || '';
      document.getElementById('prompt-content').value = prompt.content;
      
      const categorySelect = document.getElementById('prompt-category');
      if (categorySelect) categorySelect.value = prompt.categoryId || '';

      setTimeout(() => {
        (prompt.tagIds || []).forEach(tagId => {
          const checkbox = document.getElementById(`tag-${tagId}`) || document.getElementById(`profile-${tagId}`);
          if (checkbox) checkbox.checked = true;
        });
      }, 50);
    } else {
      title.textContent = 'New Prompt';
      form.reset();
    }

    renderCategoryOptions();
    renderTagSelectors();
    modal.classList.add('active');
    
    setTimeout(() => document.getElementById('prompt-title')?.focus(), 100);
  }

  function renderCategoryOptions() {
    const select = document.getElementById('prompt-category');
    if (!select) return;

    select.innerHTML = '<option value="">No Category</option>' +
      currentData.categories.map(cat => 
        `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`
      ).join('');
  }

  function renderTagSelectors() {
    const tagsContainer = document.getElementById('prompt-tags');
    const profilesContainer = document.getElementById('prompt-profiles');
    if (!tagsContainer || !profilesContainer) return;

    const tags = currentData.tags.filter(t => !t.isProfile);
    const profiles = currentData.tags.filter(t => t.isProfile);

    tagsContainer.innerHTML = tags.map(tag => `
      <input type="checkbox" id="tag-${tag.id}" class="tag-checkbox" value="${tag.id}">
      <label for="tag-${tag.id}" style="background: ${tag.color}">${escapeHtml(tag.name)}</label>
    `).join('');

    profilesContainer.innerHTML = profiles.map(profile => `
      <input type="checkbox" id="profile-${profile.id}" class="tag-checkbox" value="${profile.id}">
      <label for="profile-${profile.id}" style="background: ${profile.color}">${escapeHtml(profile.name)}</label>
    `).join('');
  }

  async function handlePromptSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('prompt-title')?.value.trim();
    const description = document.getElementById('prompt-description')?.value.trim();
    const content = document.getElementById('prompt-content')?.value.trim();
    const categoryId = document.getElementById('prompt-category')?.value;

    const tagIds = Array.from(document.querySelectorAll('#prompt-tags .tag-checkbox:checked'))
      .map(cb => cb.value);
    const profileIds = Array.from(document.querySelectorAll('#prompt-profiles .tag-checkbox:checked'))
      .map(cb => cb.value);
    const allTagIds = [...tagIds, ...profileIds];

    if (!title || !content) {
      showNotification('Title and content are required', 'error');
      return;
    }

    try {
      if (editingPromptId) {
        await storage.updatePrompt(editingPromptId, {
          title,
          description,
          content,
          categoryId: categoryId || null,
          tagIds: allTagIds
        });
        showNotification('Prompt updated', 'success');
      } else {
        await storage.addPrompt({
          title,
          description,
          content,
          categoryId: categoryId || null,
          tagIds: allTagIds
        });
        showNotification('Prompt created', 'success');
      }

      await loadData();
      renderAll();
      closeAllModals();
    } catch (error) {
      console.error('[Prompt] Save error:', error);
      showNotification(error.message || 'Failed to save prompt', 'error');
    }
  }

  async function deletePrompt(promptId) {
    if (!confirm('Delete this prompt?')) return;

    try {
      await storage.deletePrompt(promptId);
      await loadData();
      renderAll();
      showNotification('Prompt deleted', 'success');
    } catch (error) {
      console.error('[Prompt] Delete error:', error);
      showNotification('Failed to delete prompt', 'error');
    }
  }

  // === CATEGORIES VIEW ===

  function renderCategories() {
    const container = document.getElementById('category-list');
    const emptyState = document.getElementById('empty-categories');
    if (!container || !emptyState) return;

    if (currentData.categories.length === 0) {
      container.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    container.style.display = 'flex';
    emptyState.style.display = 'none';

    container.innerHTML = currentData.categories.map(category => {
      const count = currentData.prompts.filter(p => p.categoryId === category.id).length;
      
      return `
        <div class="category-item" data-id="${category.id}">
          <div class="category-name">
            <span class="color-indicator" style="background: ${category.color}"></span>
            ${escapeHtml(category.name)}
            <span class="category-count">${count} prompt${count !== 1 ? 's' : ''}</span>
          </div>
          <div class="item-actions">
            <button class="edit-btn" data-id="${category.id}">✏️</button>
            <button class="delete-btn" data-id="${category.id}">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openCategoryModal(btn.dataset.id));
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteCategory(btn.dataset.id));
    });
  }

  function openCategoryModal(categoryId = null) {
    const modal = document.getElementById('modal-category');
    const form = document.getElementById('form-category');
    const title = document.getElementById('modal-category-title');
    if (!modal || !form || !title) return;

    editingCategoryId = categoryId;

    if (categoryId) {
      const category = currentData.categories.find(c => c.id === categoryId);
      if (!category) return;

      title.textContent = 'Edit Category';
      document.getElementById('category-name').value = category.name;
      document.getElementById('category-color').value = category.color;
    } else {
      title.textContent = 'New Category';
      form.reset();
      document.getElementById('category-color').value = '#3B82F6';
    }

    modal.classList.add('active');
    setTimeout(() => document.getElementById('category-name')?.focus(), 100);
  }

  async function handleCategorySubmit(e) {
    e.preventDefault();

    const name = document.getElementById('category-name')?.value.trim();
    const color = document.getElementById('category-color')?.value;

    if (!name) {
      showNotification('Category name is required', 'error');
      return;
    }

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
      console.error('[Category] Save error:', error);
      showNotification(error.message || 'Failed to save category', 'error');
    }
  }

  async function deleteCategory(categoryId) {
    const count = currentData.prompts.filter(p => p.categoryId === categoryId).length;
    const message = count > 0 
      ? `This category is used by ${count} prompt(s). Delete anyway?`
      : 'Delete this category?';
    
    if (!confirm(message)) return;

    try {
      await storage.deleteCategory(categoryId);
      await loadData();
      renderAll();
      showNotification('Category deleted', 'success');
    } catch (error) {
      console.error('[Category] Delete error:', error);
      showNotification('Failed to delete category', 'error');
    }
  }

  // === TAGS VIEW ===

  function renderTags() {
    const tagList = document.getElementById('tag-list');
    const profileList = document.getElementById('profile-list');
    const emptyTags = document.getElementById('empty-tags');
    const emptyProfiles = document.getElementById('empty-profiles');

    if (!tagList || !profileList) return;

    const tags = currentData.tags.filter(t => !t.isProfile);
    const profiles = currentData.tags.filter(t => t.isProfile);

    // Render Tags
    if (tags.length === 0) {
      tagList.style.display = 'none';
      if (emptyTags) emptyTags.style.display = 'flex';
    } else {
      tagList.style.display = 'flex';
      if (emptyTags) emptyTags.style.display = 'none';

      tagList.innerHTML = tags.map(tag => {
        const count = currentData.prompts.filter(p => (p.tagIds || []).includes(tag.id)).length;
        
        return `
          <div class="tag-item" data-id="${tag.id}">
            <div class="tag-name">
              <span class="color-indicator" style="background: ${tag.color}"></span>
              ${escapeHtml(tag.name)}
              <span class="tag-count">${count} prompt${count !== 1 ? 's' : ''}</span>
            </div>
            <div class="item-actions">
              <button class="edit-btn" data-id="${tag.id}">✏️</button>
              <button class="delete-btn" data-id="${tag.id}">🗑️</button>
            </div>
          </div>
        `;
      }).join('');
    }

    // Render Profiles
    if (profiles.length === 0) {
      profileList.style.display = 'none';
      if (emptyProfiles) emptyProfiles.style.display = 'flex';
    } else {
      profileList.style.display = 'flex';
      if (emptyProfiles) emptyProfiles.style.display = 'none';

      profileList.innerHTML = profiles.map(profile => {
        const count = currentData.prompts.filter(p => (p.tagIds || []).includes(profile.id)).length;
        
        return `
          <div class="tag-item is-profile" data-id="${profile.id}">
            <div class="tag-name">
              <span class="color-indicator" style="background: ${profile.color}"></span>
              ${escapeHtml(profile.name)}
              <span class="tag-count">${count} prompt${count !== 1 ? 's' : ''}</span>
            </div>
            <div class="item-actions">
              <button class="edit-btn" data-id="${profile.id}">✏️</button>
              <button class="delete-btn" data-id="${profile.id}">🗑️</button>
            </div>
          </div>
        `;
      }).join('');
    }

    // Event Listeners
    document.querySelectorAll('.tag-item .edit-btn, .tag-item .delete-btn').forEach(btn => {
      const tagId = btn.dataset.id;
      const tag = currentData.tags.find(t => t.id === tagId);
      
      if (btn.classList.contains('edit-btn')) {
        btn.addEventListener('click', () => openTagModal(tag?.isProfile || false, tagId));
      } else {
        btn.addEventListener('click', () => deleteTag(tagId));
      }
    });
  }

  function openTagModal(isProfile = false, tagId = null) {
    const modal = document.getElementById('modal-tag');
    const form = document.getElementById('form-tag');
    const title = document.getElementById('modal-tag-title');
    if (!modal || !form || !title) return;

    editingTagId = tagId;
    editingIsProfile = isProfile;

    if (tagId) {
      const tag = currentData.tags.find(t => t.id === tagId);
      if (!tag) return;

      title.textContent = tag.isProfile ? 'Edit Profile' : 'Edit Tag';
      document.getElementById('tag-name').value = tag.name;
      document.getElementById('tag-color').value = tag.color;
      document.getElementById('tag-is-profile').checked = tag.isProfile;
    } else {
      title.textContent = isProfile ? 'New Profile' : 'New Tag';
      form.reset();
      document.getElementById('tag-color').value = isProfile ? '#10B981' : '#8B5CF6';
      document.getElementById('tag-is-profile').checked = isProfile;
    }

    modal.classList.add('active');
    setTimeout(() => document.getElementById('tag-name')?.focus(), 100);
  }

  async function handleTagSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('tag-name')?.value.trim();
    const color = document.getElementById('tag-color')?.value;
    const isProfile = document.getElementById('tag-is-profile')?.checked;

    if (!name) {
      showNotification('Tag name is required', 'error');
      return;
    }

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
      console.error('[Tag] Save error:', error);
      showNotification(error.message || 'Failed to save tag', 'error');
    }
  }

  async function deleteTag(tagId) {
    const tag = currentData.tags.find(t => t.id === tagId);
    const count = currentData.prompts.filter(p => (p.tagIds || []).includes(tagId)).length;
    const message = count > 0
      ? `This ${tag?.isProfile ? 'profile' : 'tag'} is used by ${count} prompt(s). Delete anyway?`
      : `Delete this ${tag?.isProfile ? 'profile' : 'tag'}?`;
    
    if (!confirm(message)) return;

    try {
      await storage.deleteTag(tagId);
      await loadData();
      renderAll();
      showNotification(tag?.isProfile ? 'Profile deleted' : 'Tag deleted', 'success');
    } catch (error) {
      console.error('[Tag] Delete error:', error);
      showNotification('Failed to delete tag', 'error');
    }
  }

  // === DRAFTS VIEW ===

  function renderDrafts() {
    const container = document.getElementById('drafts-list');
    const emptyState = document.getElementById('empty-drafts');
    if (!container || !emptyState) return;

    if (!currentData.drafts || currentData.drafts.length === 0) {
      container.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    container.style.display = 'flex';
    emptyState.style.display = 'none';

    container.innerHTML = currentData.drafts.map(draft => {
      const stats = MegadraftManager.getStats(draft);
      
      return `
        <div class="draft-card" data-id="${draft.id}">
          <div class="draft-header">
            <h3 class="draft-title">${escapeHtml(draft.title || 'Untitled Draft')}</h3>
            <div class="draft-actions">
              <button class="load-draft-btn" data-id="${draft.id}" title="Load">📂</button>
              <button class="duplicate-draft-btn" data-id="${draft.id}" title="Duplicate">📋</button>
              <button class="delete-draft-btn" data-id="${draft.id}" title="Delete">🗑️</button>
            </div>
          </div>
          <div class="draft-stats">
            <span>📝 ${stats.parts} parts</span>
            <span>📊 ${stats.characters} chars</span>
            <span>🔤 ${stats.words} words</span>
          </div>
          <div class="draft-meta">
            Modified: ${new Date(draft.modified).toLocaleString()}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.load-draft-btn').forEach(btn => {
      btn.addEventListener('click', () => loadDraft(btn.dataset.id));
    });

    container.querySelectorAll('.duplicate-draft-btn').forEach(btn => {
      btn.addEventListener('click', () => duplicateDraft(btn.dataset.id));
    });

    container.querySelectorAll('.delete-draft-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteDraft(btn.dataset.id));
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
      switchTab('canvas');
      renderCanvas();
      showNotification('Draft loaded', 'success');
    } catch (error) {
      console.error('[Draft] Load error:', error);
      showNotification('Failed to load draft', 'error');
    }
  }

  async function duplicateDraft(draftId) {
    try {
      const draft = await storage.loadDraft(draftId);
      if (!draft) {
        showNotification('Draft not found', 'error');
        return;
      }

      const duplicated = MegadraftManager.duplicate(draft);
      await storage.saveDraft(duplicated);
      await loadData();
      renderDrafts();
      showNotification('Draft duplicated', 'success');
    } catch (error) {
      console.error('[Draft] Duplicate error:', error);
      showNotification('Failed to duplicate draft', 'error');
    }
  }

  async function deleteDraft(draftId) {
    if (!confirm('Delete this draft?')) return;

    try {
      await storage.deleteDraft(draftId);
      await loadData();
      renderDrafts();
      showNotification('Draft deleted', 'success');
    } catch (error) {
      console.error('[Draft] Delete error:', error);
      showNotification('Failed to delete draft', 'error');
    }
  }

  // === SETTINGS ===

  function openSettingsModal() {
    const modal = document.getElementById('modal-settings');
    if (!modal) return;

    renderBackupList();
    modal.classList.add('active');
  }

  async function renderBackupList() {
    const container = document.getElementById('backup-list');
    const emptyState = document.getElementById('backup-list-empty');
    if (!container) return;

    try {
      const backups = await storage.loadBackups();
      
      if (!backups || backups.length === 0) {
        container.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      container.style.display = 'flex';
      if (emptyState) emptyState.style.display = 'none';

      container.innerHTML = backups.map(backup => `
        <div class="backup-item">
          <div class="backup-info">
            <div class="backup-date">${new Date(backup.timestamp).toLocaleString()}</div>
            <div class="backup-size">${formatFileSize(backup.size || 0)}</div>
          </div>
          <div class="backup-actions">
            <button class="restore-backup-btn" data-key="${backup.key}">Restore</button>
            <button class="delete-backup-btn" data-key="${backup.key}">Delete</button>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.restore-backup-btn').forEach(btn => {
        btn.addEventListener('click', () => restoreBackup(btn.dataset.key));
      });

      container.querySelectorAll('.delete-backup-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteBackup(btn.dataset.key));
      });

    } catch (error) {
      console.error('[Backup] Load error:', error);
      if (container) container.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
    }
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async function restoreBackup(backupKey) {
    if (!confirm('Restore this backup? Current data will be replaced.')) return;

    try {
      const data = await ExportImportManager.restoreBackup(backupKey);
      await storage.save(data);
      await loadData();
      renderAll();
      showNotification('Backup restored', 'success');
      closeAllModals();
    } catch (error) {
      console.error('[Backup] Restore error:', error);
      showNotification('Failed to restore backup', 'error');
    }
  }

  async function deleteBackup(backupKey) {
    if (!confirm('Delete this backup?')) return;

    try {
      const storageAPI = (typeof browser !== 'undefined' ? browser : chrome).storage.local;
      await storageAPI.remove(backupKey);
      renderBackupList();
      showNotification('Backup deleted', 'success');
    } catch (error) {
      console.error('[Backup] Delete error:', error);
      showNotification('Failed to delete backup', 'error');
    }
  }

  async function exportAllData() {
    try {
      ExportImportManager.exportToJSON(currentData);
      showNotification('Data exported', 'success');
    } catch (error) {
      console.error('[Export] Error:', error);
      showNotification('Failed to export data', 'error');
    }
  }

  async function handleFileImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importData = await ExportImportManager.importFromJSON(file);
      
      // Create backup before import
      ExportImportManager.createAutoBackup(currentData);
      
      // Merge strategy: MERGE (skip duplicates, add new)
      const result = ExportImportManager.mergeData(
        currentData,
        importData,
        ExportImportManager.MERGE_STRATEGIES.MERGE
      );
      
      await storage.save(result.data);
      await loadData();
      renderAll();
      
      const stats = result.stats;
      const message = `Imported: ${stats.prompts.added} prompts, ${stats.categories.added} categories, ${stats.tags.added} tags`;
      showNotification(message, 'success');
      
      closeAllModals();
    } catch (error) {
      console.error('[Import] Error:', error);
      showNotification(error.message || 'Failed to import data', 'error');
    }
    
    e.target.value = '';
  }

  async function deleteAllData() {
    const confirmation = prompt('Type "DELETE" to confirm deleting all data:');
    if (confirmation !== 'DELETE') return;

    try {
      // Create final backup
      ExportImportManager.createAutoBackup(currentData);
      
      await storage.save({
        prompts: [],
        categories: [],
        tags: [],
        drafts: [],
        templates: []
      });
      
      await loadData();
      renderAll();
      showNotification('All data deleted', 'success');
      closeAllModals();
    } catch (error) {
      console.error('[Delete] Error:', error);
      showNotification('Failed to delete data', 'error');
    }
  }

  // === MODALS ===

  function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.remove('active');
    });

    editingPromptId = null;
    editingCategoryId = null;
    editingTagId = null;
    editingIsProfile = false;
    importedData = null;
    selectedPartType = 'prompt';
    selectedPromptId = null;
    selectedTemplateKey = null;

    document.querySelectorAll('form').forEach(form => form.reset());
  }

  // === UTILITY FUNCTIONS ===

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

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

  // === GLOBAL EXPORTS FOR COMMAND PALETTE ===
  
  window.switchTab = switchTab;
  window.openPromptModal = openPromptModal;
  window.openCategoryModal = openCategoryModal;
  window.openTagModal = openTagModal;
  window.openSettingsModal = openSettingsModal;
  window.copyMegaprompt = copyCanvasToClipboard;

  // === START ===

  document.addEventListener('DOMContentLoaded', init);

})();