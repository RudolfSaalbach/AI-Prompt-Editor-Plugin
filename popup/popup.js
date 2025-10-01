(function() {
  'use strict';

  // GLOBAL STATE
  let storage;
  let variableEngine;
  let variablePackManager;
  let commandPalette;
  
  let currentData = {
    prompts: [],
    categories: [],
    tags: [],
    drafts: [],
    templates: [],
    variablePacks: []
  };
  
  let currentView = 'canvas';
  let currentDraft = null;
  let editingPromptId = null;
  let editingCategoryId = null;
  let editingTagId = null;
  let editingPackId = null;
  let canvasSettings = {
    includeHeaders: true,
    numbering: true,
    headerStyle: 'markdown',
    separator: '\n\n'
  };

  // NOTIFICATIONS
  window.showNotification = function(message, type = 'info') {
    let container = document.getElementById('notification-container');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
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

  const showNotification = window.showNotification;

  // INITIALIZATION
  async function init() {
    console.log('[AI Prompt Manager] Init...');
    
    storage = new StorageManager();
    variableEngine = new VariableEngine();
    variablePackManager = new VariablePackManager(storage);
    
    await loadData();
    await variablePackManager.load();
    
    initEventListeners();
    initCommandPalette();
    
    switchTab('canvas');
    
    console.log('[AI Prompt Manager] Ready');
  }

  async function loadData() {
    try {
      currentData = await storage.load();
      
      if (!currentData.prompts) currentData.prompts = [];
      if (!currentData.categories) currentData.categories = [];
      if (!currentData.tags) currentData.tags = [];
      if (!currentData.drafts) currentData.drafts = [];
      if (!currentData.templates) currentData.templates = [];
      if (!currentData.variablePacks) currentData.variablePacks = [];
      
      console.log('[Data] Loaded:', currentData);
    } catch (error) {
      console.error('[Data] Load error:', error);
      showNotification('Error loading data', 'error');
    }
  }

  function initEventListeners() {
    // Tabs
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

    // ESC to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllModals();
      }
    });

    // Canvas
    safeAddListener('btn-new-draft', 'click', createNewDraft);
    safeAddListener('btn-load-draft', 'click', openLoadDraftModal);
    safeAddListener('btn-save-draft', 'click', saveCurrentDraft);
    safeAddListener('btn-canvas-settings', 'click', openCanvasSettings);
    safeAddListener('btn-copy-canvas', 'click', copyCanvasToClipboard);
    safeAddListener('btn-copy-canvas-minify', 'click', copyCanvasMinified);
    safeAddListener('btn-add-part', 'click', openAddPartModal);
    safeAddListener('btn-add-first-part', 'click', openAddPartModal);
    safeAddListener('btn-save-quick-set', 'click', saveQuickSet);
    safeAddListener('btn-load-quick-set', 'click', loadQuickSet);
    safeAddListener('btn-apply-var-pack', 'click', openApplyVariablePackModal);
    safeAddListener('btn-clear-vars', 'click', clearAllVariables);

    const canvasEditor = document.getElementById('canvas-editor');
    if (canvasEditor) {
      canvasEditor.addEventListener('input', () => {
        updateCanvasStats();
        detectAndRenderVariables();
        enableSaveButton();
      });
    }

    // Prompts
    safeAddListener('btn-add-prompt', 'click', () => openPromptModal());
    safeAddListener('btn-empty-create-prompt', 'click', () => openPromptModal());
    safeAddListener('form-prompt', 'submit', handlePromptSubmit);
    safeAddListener('search-prompts', 'input', debounce(handleSearchPrompts, 200));
    safeAddListener('filter-category', 'change', renderPrompts);

    // Categories
    safeAddListener('btn-add-category', 'click', () => openCategoryModal());
    safeAddListener('form-category', 'submit', handleCategorySubmit);

    // Tags
    safeAddListener('btn-add-tag', 'click', () => openTagModal(false));
    safeAddListener('btn-add-profile', 'click', () => openTagModal(true));
    safeAddListener('form-tag', 'submit', handleTagSubmit);

    // Templates
    document.querySelectorAll('.btn-use-template').forEach(btn => {
      btn.addEventListener('click', () => useBuiltInTemplate(btn.dataset.framework));
    });
    safeAddListener('btn-add-custom-template', 'click', () => openCustomTemplateModal());

    // Variable Packs
    safeAddListener('btn-add-pack', 'click', () => openPackModal());
    safeAddListener('btn-empty-create-pack', 'click', () => openPackModal());
    safeAddListener('btn-create-pack-from-current', 'click', createPackFromCurrentVars);
    safeAddListener('form-pack', 'submit', handlePackSubmit);
    safeAddListener('btn-add-pack-var', 'click', addPackVariableField);
    safeAddListener('search-packs', 'input', debounce(handleSearchPacks, 200));

    // Drafts
    safeAddListener('btn-create-draft', 'click', createNewDraft);

    // Settings
    safeAddListener('btn-settings', 'click', openSettingsModal);
    safeAddListener('btn-shortcuts', 'click', showKeyboardShortcuts);
    safeAddListener('btn-toggle-density', 'click', toggleDensity);
    safeAddListener('btn-toggle-wide', 'click', toggleWideMode);
    safeAddListener('btn-export', 'click', exportAllData);
    safeAddListener('btn-import', 'click', () => document.getElementById('file-import')?.click());
    safeAddListener('file-import', 'change', handleFileImport);
    safeAddListener('btn-delete-all', 'click', deleteAllData);

    // Ctrl/Cmd+F for search
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-box input:not([style*="display: none"])');
        if (searchInput) searchInput.focus();
      }
    });
  }

  function initCommandPalette() {
    commandPalette = new CommandPalette();
    
    const commands = [
      {
        id: 'nav-canvas',
        label: 'Go to Canvas',
        description: 'Switch to Canvas view',
        category: 'Navigation',
        icon: '📝',
        keywords: ['compose', 'megaprompt'],
        action: () => switchTab('canvas')
      },
      {
        id: 'nav-prompts',
        label: 'Go to Prompts',
        description: 'View all prompts',
        category: 'Navigation',
        icon: '📋',
        keywords: ['list', 'library'],
        action: () => switchTab('prompts')
      },
      {
        id: 'nav-packs',
        label: 'Go to Variable Packs',
        description: 'Manage variable packs',
        category: 'Navigation',
        icon: '📦',
        keywords: ['variables'],
        action: () => switchTab('packs')
      },
      {
        id: 'action-new-prompt',
        label: 'New Prompt',
        description: 'Create a new prompt',
        category: 'Actions',
        icon: '➕',
        shortcut: 'Ctrl+N',
        keywords: ['create', 'add'],
        action: () => openPromptModal()
      },
      {
        id: 'action-copy-canvas',
        label: 'Copy Canvas to Clipboard',
        description: 'Copy current canvas content',
        category: 'Actions',
        icon: '📋',
        shortcut: 'Ctrl+C',
        keywords: ['clipboard'],
        action: () => copyCanvasToClipboard()
      },
      {
        id: 'action-copy-minify',
        label: 'Copy Canvas (Minified)',
        description: 'Copy with reduced whitespace',
        category: 'Actions',
        icon: '📦',
        keywords: ['clipboard', 'compress'],
        action: () => copyCanvasMinified()
      },
      {
        id: 'create-category',
        label: 'New Category',
        description: 'Create a new category',
        category: 'Create',
        icon: '📁',
        keywords: ['folder', 'organize'],
        action: () => openCategoryModal()
      },
      {
        id: 'create-tag',
        label: 'New Tag',
        description: 'Create a new tag',
        category: 'Create',
        icon: '🏷️',
        keywords: ['label'],
        action: () => openTagModal(false)
      },
      {
        id: 'create-profile',
        label: 'New Profile',
        description: 'Create a new profile for auto-filter',
        category: 'Create',
        icon: '👤',
        keywords: ['auto-filter'],
        action: () => openTagModal(true)
      },
      {
        id: 'create-pack',
        label: 'New Variable Pack',
        description: 'Create a new variable pack',
        category: 'Create',
        icon: '📦',
        keywords: ['variables'],
        action: () => openPackModal()
      },
      {
        id: 'toggle-wide',
        label: 'Toggle Wide Mode',
        description: 'Switch layout width',
        category: 'Settings',
        icon: '↔️',
        keywords: ['layout', 'width'],
        action: () => toggleWideMode()
      },
      {
        id: 'toggle-density',
        label: 'Toggle Density',
        description: 'Switch spacing mode',
		category: 'Settings',
        icon: '📏',
        keywords: ['spacing', 'compact'],
        action: () => toggleDensity()
      },
      {
        id: 'open-settings',
        label: 'Open Settings',
        description: 'Settings and data management',
        category: 'Settings',
        icon: '⚙️',
        keywords: ['preferences', 'export'],
        action: () => openSettingsModal()
      }
    ];
    
    commandPalette.init(commands, (cmd) => cmd.action());
  }

  function safeAddListener(id, event, handler) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener(event, handler);
    }
  }

  function enableSaveButton() {
    const btn = document.getElementById('btn-save-draft');
    if (btn && currentDraft) btn.disabled = false;
  }

  // VIEW MANAGEMENT
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
    if (viewName === 'packs') renderPacks();
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
    } else {
      if (tagList) tagList.style.display = 'none';
      if (profileList) profileList.style.display = 'flex';
    }
  }

  // CANVAS
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
          <button class="delete-part" data-part-id="${part.id}" title="Delete">❌</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.delete-part').forEach(btn => {
      btn.addEventListener('click', () => deletePart(btn.dataset.partId));
    });
  }

  async function updateCanvasEditor() {
    const editor = document.getElementById('canvas-editor');
    if (!editor || !currentDraft) return;

    const composed = await MegapromptBuilder.buildResolved(currentDraft, canvasSettings, variableEngine);
    editor.value = composed;
    
    updateCanvasStats();
    detectAndRenderVariables();
  }

  function updateCanvasStats() {
    if (!currentDraft) return;
    
    const editor = document.getElementById('canvas-editor');
    const text = editor?.value || '';
    
    const stats = MegapromptBuilder.analyzeTokens(text);
    
    const charEl = document.getElementById('canvas-char-count');
    const wordEl = document.getElementById('canvas-word-count');
    const partEl = document.getElementById('canvas-part-count');
    const tokenEl = document.getElementById('canvas-token-estimate');
    
    if (charEl) charEl.textContent = `${stats.characters} characters`;
    if (wordEl) wordEl.textContent = `${stats.words} words`;
    if (partEl) partEl.textContent = `${currentDraft.parts.length} parts`;
    if (tokenEl) tokenEl.textContent = `~${stats.tokens} tokens`;
  }

  async function detectAndRenderVariables() {
    const editor = document.getElementById('canvas-editor');
    if (!editor) return;
    
    const text = editor.value;
    const variables = MegapromptBuilder.extractVariables(text);
    
    renderVariablesList(variables);
  }

  function renderVariablesList(variables) {
    const container = document.getElementById('variables-list');
    const badge = document.getElementById('var-count-badge');
    const clearBtn = document.getElementById('btn-clear-vars');
    
    if (!container) return;
    
    if (badge) {
      badge.textContent = variables.length;
      badge.style.display = variables.length > 0 ? 'inline-flex' : 'none';
    }
    
    if (clearBtn) {
      clearBtn.style.display = variables.length > 0 ? 'block' : 'none';
    }
    
    if (variables.length === 0) {
      container.innerHTML = '<div class="empty-state-small"><p>No variables detected</p></div>';
      return;
    }
    
    container.innerHTML = variables.map(varName => {
      const isSmart = variableEngine.isSmart(varName);
      const type = variableEngine.detectType(varName);
      const value = variableEngine.variables.get(varName) || '';
      
      return `
        <div class="variable-item ${isSmart ? 'smart' : ''}">
          <div class="variable-info">
            <div class="variable-name">{{${varName}}}</div>
            ${isSmart 
              ? `<span class="variable-type-badge">${type}</span>` 
              : `<input type="text" class="variable-input" data-var="${varName}" value="${escapeHtml(value)}" placeholder="Enter value...">`
            }
          </div>
        </div>
      `;
    }).join('');
    
    container.querySelectorAll('.variable-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const varName = e.target.dataset.var;
        const value = e.target.value;
        variableEngine.setValue(varName, value);
        updateCanvasEditor();
      });
    });
  }

  function clearAllVariables() {
    if (!confirm('Clear all custom variables?')) return;
    variableEngine.clearAll();
    detectAndRenderVariables();
    updateCanvasEditor();
    showNotification('Variables cleared', 'success');
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
      console.error('[Copy] Error:', error);
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
      const minified = editor.value
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/ {2,}/g, ' ')
        .trim();
      
      await navigator.clipboard.writeText(minified);
      
      const originalSize = editor.value.length;
      const minifiedSize = minified.length;
      const saved = originalSize - minifiedSize;
      const percentage = ((saved / originalSize) * 100).toFixed(1);
      
      showNotification(`Copied (minified) · Saved ${saved} chars (${percentage}%)`, 'success');
    } catch (error) {
      console.error('[CopyMinify] Error:', error);
      showNotification('Failed to copy', 'error');
    }
  }

  function openAddPartModal() {
    showNotification('Add Part: Use Command Palette (Cmd/Ctrl+K) to add prompts', 'info');
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
      const btn = document.getElementById('btn-save-draft');
      if (btn) btn.disabled = true;
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

  function openCanvasSettings() {
    showNotification('Canvas settings: Headers, numbering, separator', 'info');
  }

  function saveQuickSet() {
    showNotification('Quick Sets: Save current canvas configuration', 'info');
  }

  function loadQuickSet() {
    showNotification('Quick Sets: Load saved configuration', 'info');
  }

  function openApplyVariablePackModal() {
    if (variablePackManager.packs.length === 0) {
      showNotification('No variable packs available', 'info');
      return;
    }
    
    const packNames = variablePackManager.packs.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    const choice = prompt(`Select pack number:\n\n${packNames}`);
    
    if (choice) {
      const index = parseInt(choice) - 1;
      const pack = variablePackManager.packs[index];
      if (pack) {
        applyVariablePack(pack.id);
      }
    }
  }

  async function applyVariablePack(packId) {
    try {
      const result = await variablePackManager.applyPack(packId, variableEngine, 'prompt');
      
      if (result.conflicts.length > 0) {
        const overwrite = confirm(`${result.conflicts.length} variables will be overwritten. Continue?`);
        if (overwrite) {
          const resolutions = result.conflicts.map(c => ({ name: c.name, action: 'overwrite' }));
          await variablePackManager.resolveConflicts(packId, variableEngine, resolutions);
        }
      }
      
      detectAndRenderVariables();
      updateCanvasEditor();
      showNotification(`Variable pack applied (${result.applied} variables)`, 'success');
    } catch (error) {
      console.error('[Pack] Apply error:', error);
      showNotification('Failed to apply pack', 'error');
    }
  }

  // PROMPTS
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

    const filtered = filterPrompts();

    container.innerHTML = filtered.map(prompt => {
      const category = currentData.categories.find(c => c.id === prompt.categoryId);
      const tags = (prompt.tagIds || [])
        .map(tid => currentData.tags.find(t => t.id === tid))
        .filter(Boolean);

      return `
        <div class="item-card">
          <div class="item-header">
            <h3 class="item-title">${escapeHtml(prompt.title)}</h3>
            <div class="item-actions">
              <button class="copy-prompt" data-id="${prompt.id}" title="Copy">📋</button>
              <button class="edit-prompt" data-id="${prompt.id}" title="Edit">✏️</button>
              <button class="delete-prompt" data-id="${prompt.id}" title="Delete">🗑️</button>
            </div>
          </div>
          ${prompt.description ? `<p class="item-description">${escapeHtml(prompt.description)}</p>` : ''}
          <div class="item-meta">
            ${category ? `<span class="category-badge" style="background: ${category.color}">${escapeHtml(category.name)}</span>` : ''}
            <div class="item-tags">
              ${tags.map(tag => `
                <span class="tag-badge" style="background: ${tag.color}">${escapeHtml(tag.name)}</span>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.copy-prompt').forEach(btn => {
      btn.addEventListener('click', () => copyPrompt(btn.dataset.id));
    });

    container.querySelectorAll('.edit-prompt').forEach(btn => {
      btn.addEventListener('click', () => openPromptModal(btn.dataset.id));
    });

    container.querySelectorAll('.delete-prompt').forEach(btn => {
      btn.addEventListener('click', () => deletePrompt(btn.dataset.id));
    });
  }

  function filterPrompts() {
    const searchTerm = document.getElementById('search-prompts')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('filter-category')?.value || '';
    
    return currentData.prompts.filter(p => {
      const matchesSearch = !searchTerm || 
        p.title.toLowerCase().includes(searchTerm) ||
        (p.description && p.description.toLowerCase().includes(searchTerm)) ||
        (p.content && p.content.toLowerCase().includes(searchTerm));
      
      const matchesCategory = !categoryFilter || p.categoryId === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }

  function handleSearchPrompts() {
    renderPrompts();
  }

  async function copyPrompt(promptId) {
    const prompt = currentData.prompts.find(p => p.id === promptId);
    if (!prompt) return;

    try {
      await navigator.clipboard.writeText(prompt.content);
      showNotification('Prompt copied', 'success');
    } catch (error) {
      showNotification('Failed to copy', 'error');
    }
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
      renderPrompts();
      closeAllModals();
    } catch (error) {
      console.error('[Prompt] Save error:', error);
      showNotification(error.message || 'Failed to save', 'error');
    }
  }

  async function deletePrompt(promptId) {
    if (!confirm('Delete this prompt?')) return;

    try {
      await storage.deletePrompt(promptId);
      await loadData();
      renderPrompts();
      showNotification('Prompt deleted', 'success');
    } catch (error) {
      console.error('[Prompt] Delete error:', error);
      showNotification('Failed to delete', 'error');
    }
  }

  // CATEGORIES
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
        <div class="item-card">
          <div class="item-header">
            <h3 class="item-title">
              <span class="color-indicator" style="background: ${category.color}; display: inline-block; width: 16px; height: 16px; border-radius: 4px; margin-right: 8px;"></span>
              ${escapeHtml(category.name)}
            </h3>
            <div class="item-actions">
              <span style="font-size: 12px; color: var(--color-text-muted);">${count} prompts</span>
              <button class="edit-cat" data-id="${category.id}">✏️</button>
              <button class="delete-cat" data-id="${category.id}">🗑️</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.edit-cat').forEach(btn => {
      btn.addEventListener('click', () => openCategoryModal(btn.dataset.id));
    });

    container.querySelectorAll('.delete-cat').forEach(btn => {
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
      showNotification('Name is required', 'error');
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
      renderCategories();
      closeAllModals();
    } catch (error) {
      console.error('[Category] Save error:', error);
      showNotification(error.message || 'Failed to save', 'error');
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
      renderCategories();
      showNotification('Category deleted', 'success');
    } catch (error) {
      console.error('[Category] Delete error:', error);
      showNotification('Failed to delete', 'error');
    }
  }

  // TAGS
  function renderTags() {
    const tagList = document.getElementById('tag-list');
    const profileList = document.getElementById('profile-list');
    const emptyTags = document.getElementById('empty-tags');
    const emptyProfiles = document.getElementById('empty-profiles');

    if (!tagList || !profileList) return;

    const tags = currentData.tags.filter(t => !t.isProfile);
    const profiles = currentData.tags.filter(t => t.isProfile);

    if (tags.length === 0) {
      tagList.style.display = 'none';
      if (emptyTags) emptyTags.style.display = 'flex';
    } else {
      tagList.style.display = 'flex';
      if (emptyTags) emptyTags.style.display = 'none';

      tagList.innerHTML = tags.map(tag => {
        const count = currentData.prompts.filter(p => (p.tagIds || []).includes(tag.id)).length;
        
        return `
          <div class="item-card">
            <div class="item-header">
              <h3 class="item-title">
                <span class="color-indicator" style="background: ${tag.color}; display: inline-block; width: 16px; height: 16px; border-radius: 4px; margin-right: 8px;"></span>
                ${escapeHtml(tag.name)}
              </h3>
              <div class="item-actions">
                <span style="font-size: 12px; color: var(--color-text-muted);">${count} prompts</span>
                <button class="edit-tag" data-id="${tag.id}">✏️</button>
                <button class="delete-tag" data-id="${tag.id}">🗑️</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    if (profiles.length === 0) {
      profileList.style.display = 'none';
      if (emptyProfiles) emptyProfiles.style.display = 'flex';
    } else {
      profileList.style.display = 'flex';
      if (emptyProfiles) emptyProfiles.style.display = 'none';

      profileList.innerHTML = profiles.map(profile => {
        const count = currentData.prompts.filter(p => (p.tagIds || []).includes(profile.id)).length;
        
        return `
          <div class="item-card">
            <div class="item-header">
              <h3 class="item-title">
                <span class="color-indicator" style="background: ${profile.color}; display: inline-block; width: 16px; height: 16px; border-radius: 4px; margin-right: 8px;"></span>
                ${escapeHtml(profile.name)}
              </h3>
              <div class="item-actions">
                <span style="font-size: 12px; color: var(--color-text-muted);">${count} prompts</span>
                <button class="edit-tag" data-id="${profile.id}">✏️</button>
                <button class="delete-tag" data-id="${profile.id}">🗑️</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    document.querySelectorAll('.edit-tag').forEach(btn => {
      const tag = currentData.tags.find(t => t.id === btn.dataset.id);
      btn.addEventListener('click', () => openTagModal(tag?.isProfile || false, btn.dataset.id));
    });

    document.querySelectorAll('.delete-tag').forEach(btn => {
      btn.addEventListener('click', () => deleteTag(btn.dataset.id));
    });
  }

  function openTagModal(isProfile = false, tagId = null) {
    const modal = document.getElementById('modal-tag');
    const form = document.getElementById('form-tag');
    const title = document.getElementById('modal-tag-title');
    if (!modal || !form || !title) return;

    editingTagId = tagId;

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
      showNotification('Name is required', 'error');
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
      renderTags();
      closeAllModals();
    } catch (error) {
      console.error('[Tag] Save error:', error);
      showNotification(error.message || 'Failed to save', 'error');
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
      renderTags();
      showNotification(tag?.isProfile ? 'Profile deleted' : 'Tag deleted', 'success');
    } catch (error) {
      console.error('[Tag] Delete error:', error);
      showNotification('Failed to delete', 'error');
    }
  }

  // TEMPLATES
  function renderTemplates() {
    const customContainer = document.getElementById('custom-templates-list');
    if (!customContainer) return;

    const customTemplates = currentData.templates || [];
    
    if (customTemplates.length === 0) {
      customContainer.innerHTML = '';
      return;
    }
    
    customContainer.innerHTML = '<h3 style="margin: 24px 0 16px 0; font-size: 18px; font-weight: 600;">Custom Templates</h3>' +
      customTemplates.map(tpl => `
        <div class="template-card">
          <div class="template-header">
            <h3>${escapeHtml(tpl.name)}</h3>
            <span class="template-badge" style="background: #8B5CF6;">Custom</span>
          </div>
          <p class="template-description">${escapeHtml(tpl.description || 'No description')}</p>
          <div class="template-actions">
            <button class="btn-secondary use-custom-template" data-id="${tpl.id}">Use</button>
            <button class="btn-secondary edit-custom-template" data-id="${tpl.id}">Edit</button>
            <button class="btn-danger delete-custom-template" data-id="${tpl.id}">Delete</button>
          </div>
        </div>
      `).join('');
      
    customContainer.querySelectorAll('.use-custom-template').forEach(btn => {
      btn.addEventListener('click', () => showNotification('Custom template usage coming soon', 'info'));
    });
    
    customContainer.querySelectorAll('.edit-custom-template').forEach(btn => {
      btn.addEventListener('click', () => showNotification('Edit custom template', 'info'));
    });
    
    customContainer.querySelectorAll('.delete-custom-template').forEach(btn => {
      btn.addEventListener('click', () => deleteCustomTemplate(btn.dataset.id));
    });
  }

  function useBuiltInTemplate(frameworkKey) {
    showNotification(`Using ${frameworkKey} template`, 'info');
  }

  function openCustomTemplateModal() {
    showNotification('Create custom template with variables', 'info');
  }

  async function deleteCustomTemplate(templateId) {
    if (!confirm('Delete this template?')) return;
    
    try {
      await storage.deleteTemplate(templateId);
      await loadData();
      renderTemplates();
      showNotification('Template deleted', 'success');
    } catch (error) {
      console.error('[Template] Delete error:', error);
      showNotification('Failed to delete', 'error');
    }
  }

  // VARIABLE PACKS
  function renderPacks() {
    const container = document.getElementById('pack-list');
    const emptyState = document.getElementById('empty-packs');
    if (!container || !emptyState) return;

    const packs = variablePackManager.getAllPacks();

    if (packs.length === 0) {
      container.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    container.style.display = 'flex';
    emptyState.style.display = 'none';

    const filtered = filterPacks();

    container.innerHTML = filtered.map(pack => `
      <div class="item-card">
        <div class="item-header">
          <h3 class="item-title">${escapeHtml(pack.name)}</h3>
          <div class="item-actions">
            <button class="apply-pack" data-id="${pack.id}" title="Apply">✅</button>
            <button class="export-pack" data-id="${pack.id}" title="Export">📤</button>
            <button class="edit-pack" data-id="${pack.id}" title="Edit">✏️</button>
            <button class="delete-pack" data-id="${pack.id}" title="Delete">🗑️</button>
          </div>
        </div>
        ${pack.description ? `<p class="item-description">${escapeHtml(pack.description)}</p>` : ''}
        <div class="item-meta">
          <span>${pack.variables.length} variables</span>
          <span>Modified: ${new Date(pack.modified).toLocaleDateString()}</span>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.apply-pack').forEach(btn => {
      btn.addEventListener('click', () => applyVariablePack(btn.dataset.id));
    });

    container.querySelectorAll('.export-pack').forEach(btn => {
      btn.addEventListener('click', () => exportPack(btn.dataset.id));
    });

    container.querySelectorAll('.edit-pack').forEach(btn => {
      btn.addEventListener('click', () => openPackModal(btn.dataset.id));
    });

    container.querySelectorAll('.delete-pack').forEach(btn => {
      btn.addEventListener('click', () => deletePack(btn.dataset.id));
    });
  }

  function filterPacks() {
    const searchTerm = document.getElementById('search-packs')?.value.toLowerCase() || '';
    
    return variablePackManager.getAllPacks().filter(pack => {
      return !searchTerm || 
        pack.name.toLowerCase().includes(searchTerm) ||
        (pack.description && pack.description.toLowerCase().includes(searchTerm)) ||
        pack.variables.some(v => v.name.toLowerCase().includes(searchTerm));
    });
  }

  function handleSearchPacks() {
    renderPacks();
  }

  function openPackModal(packId = null) {
    const modal = document.getElementById('modal-variable-pack');
    const form = document.getElementById('form-pack');
    const title = document.getElementById('modal-pack-title');
    if (!modal || !form || !title) return;

    editingPackId = packId;

    if (packId) {
      const pack = variablePackManager.getPack(packId);
      if (!pack) return;

      title.textContent = 'Edit Variable Pack';
      document.getElementById('pack-name').value = pack.name;
      document.getElementById('pack-description').value = pack.description || '';
      
      const container = document.getElementById('pack-variables');
      container.innerHTML = pack.variables.map((v, i) => `
        <div class="pack-var-item">
          <input type="text" placeholder="Variable name" value="${escapeHtml(v.name)}" data-index="${i}" data-field="name">
          <input type="text" placeholder="Value" value="${escapeHtml(v.value)}" data-index="${i}" data-field="value">
          <button type="button" class="remove-pack-var" data-index="${i}">❌</button>
        </div>
      `).join('') + '<button type="button" id="btn-add-pack-var" class="btn-secondary-sm">+ Add Variable</button>';
      
      attachPackVarListeners();
    } else {
      title.textContent = 'New Variable Pack';
      form.reset();
      const container = document.getElementById('pack-variables');
      container.innerHTML = '<button type="button" id="btn-add-pack-var" class="btn-secondary-sm">+ Add Variable</button>';
      attachPackVarListeners();
    }

    modal.classList.add('active');
    setTimeout(() => document.getElementById('pack-name')?.focus(), 100);
  }

  function attachPackVarListeners() {
    const addBtn = document.getElementById('btn-add-pack-var');
    if (addBtn) {
      addBtn.addEventListener('click', addPackVariableField);
    }
    
    document.querySelectorAll('.remove-pack-var').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.pack-var-item').remove();
      });
    });
  }

  function addPackVariableField() {
    const container = document.getElementById('pack-variables');
    const addBtn = document.getElementById('btn-add-pack-var');
    
    const varItem = document.createElement('div');
    varItem.className = 'pack-var-item';
    varItem.innerHTML = `
      <input type="text" placeholder="Variable name" data-field="name">
      <input type="text" placeholder="Value" data-field="value">
      <button type="button" class="remove-pack-var">❌</button>
    `;
    
    container.insertBefore(varItem, addBtn);
    
    varItem.querySelector('.remove-pack-var').addEventListener('click', () => {
      varItem.remove();
    });
    
    varItem.querySelector('input[data-field="name"]').focus();
  }

  async function handlePackSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('pack-name')?.value.trim();
    const description = document.getElementById('pack-description')?.value.trim();
    
    const variables = Array.from(document.querySelectorAll('.pack-var-item')).map(item => ({
      name: item.querySelector('[data-field="name"]').value.trim(),
      value: item.querySelector('[data-field="value"]').value.trim()
    })).filter(v => v.name);

    if (!name) {
      showNotification('Pack name is required', 'error');
      return;
    }

    try {
      if (editingPackId) {
        await variablePackManager.updatePack(editingPackId, { name, description, variables });
        showNotification('Variable pack updated', 'success');
      } else {
        await variablePackManager.createPack({ name, description, variables });
        showNotification('Variable pack created', 'success');
      }

      renderPacks();
      closeAllModals();
    } catch (error) {
      console.error('[Pack] Save error:', error);
      showNotification(error.message || 'Failed to save', 'error');
    }
  }

  async function createPackFromCurrentVars() {
    const customVars = variableEngine.getAllCustom();
    
    if (customVars.length === 0) {
      showNotification('No custom variables to save', 'info');
      return;
    }
    
    const name = prompt('Enter pack name:');
    if (!name) return;
    
    try {
      await variablePackManager.createPack({
        name,
        description: 'Created from current variables',
        variables: customVars
      });
      
      renderPacks();
      showNotification(`Pack created with ${customVars.length} variables`, 'success');
    } catch (error) {
      console.error('[Pack] Create error:', error);
      showNotification('Failed to create pack', 'error');
    }
  }

  function exportPack(packId) {
    try {
      variablePackManager.exportPack(packId);
      showNotification('Pack exported', 'success');
    } catch (error) {
      console.error('[Pack] Export error:', error);
      showNotification('Failed to export', 'error');
    }
  }

  async function deletePack(packId) {
    if (!confirm('Delete this variable pack?')) return;

    try {
      await variablePackManager.deletePack(packId);
      renderPacks();
      showNotification('Pack deleted', 'success');
    } catch (error) {
      console.error('[Pack] Delete error:', error);
      showNotification('Failed to delete', 'error');
    }
  }

  // DRAFTS
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
        <div class="item-card">
          <div class="item-header">
            <h3 class="item-title">${escapeHtml(draft.title || 'Untitled Draft')}</h3>
            <div class="item-actions">
              <button class="load-draft" data-id="${draft.id}" title="Load">📂</button>
              <button class="delete-draft" data-id="${draft.id}" title="Delete">🗑️</button>
            </div>
          </div>
          <div class="item-meta">
            <span>${stats.parts} parts</span>
            <span>${stats.characters} chars</span>
            <span>Modified: ${new Date(draft.modified).toLocaleDateString()}</span>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.load-draft').forEach(btn => {
      btn.addEventListener('click', () => loadDraft(btn.dataset.id));
    });

    container.querySelectorAll('.delete-draft').forEach(btn => {
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

  async function deleteDraft(draftId) {
    if (!confirm('Delete this draft?')) return;

    try {
      await storage.deleteDraft(draftId);
      await loadData();
      renderDrafts();
      showNotification('Draft deleted', 'success');
    } catch (error) {
      console.error('[Draft] Delete error:', error);
      showNotification('Failed to delete', 'error');
    }
  }

  // SETTINGS
  function openSettingsModal() {
    const modal = document.getElementById('modal-settings');
    if (!modal) return;
    modal.classList.add('active');
  }

  function showKeyboardShortcuts() {
    const shortcuts = `
Keyboard Shortcuts:

⌘/Ctrl + K - Command Palette
⌘/Ctrl + F - Focus Search
⌘/Ctrl + N - New Prompt
ESC - Close Modal/Palette
? - Show Shortcuts
    `.trim();
    
    alert(shortcuts);
  }

  function toggleDensity() {
    document.body.classList.toggle('density-compact');
    const isCompact = document.body.classList.contains('density-compact');
    localStorage.setItem('ai_pm_density', isCompact ? 'compact' : 'comfort');
    showNotification(`Density: ${isCompact ? 'Compact' : 'Comfort'}`, 'info');
  }

  function toggleWideMode() {
    document.body.classList.toggle('wide-mode');
    const isWide = document.body.classList.contains('wide-mode');
    localStorage.setItem('ai_pm_wide_mode', isWide ? 'true' : 'false');
    showNotification(`Wide Mode: ${isWide ? 'ON' : 'OFF'}`, 'info');
  }

  async function exportAllData() {
    try {
      const exportData = {
        version: '1.0.0',
        exported: new Date().toISOString(),
        data: currentData
      };

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-prompt-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification('Data exported', 'success');
    } catch (error) {
      console.error('[Export] Error:', error);
      showNotification('Failed to export', 'error');
    }
  }

  async function handleFileImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const importData = JSON.parse(event.target.result);

          if (!importData.data || !DataModel.validate(importData.data)) {
            throw new Error('Invalid data format');
          }

          if (!confirm('Import data? This will replace all current data.')) {
            return;
          }

          await storage.save(importData.data);
          await loadData();
          
          // Render all views
          renderPrompts();
          renderCategories();
          renderTags();
          renderDrafts();
          renderTemplates();
          renderPacks();
          
          showNotification('Data imported successfully', 'success');
          closeAllModals();
        } catch (error) {
          console.error('[Import] Parse error:', error);
          showNotification('Failed to import: ' + error.message, 'error');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('[Import] Error:', error);
      showNotification('Failed to import', 'error');
    }
    
    e.target.value = '';
  }

  async function deleteAllData() {
    const confirmation = prompt('Type "DELETE" to confirm deleting all data:');
    if (confirmation !== 'DELETE') return;

    try {
      await storage.save(DataModel.createEmpty());
      await loadData();
      
      renderPrompts();
      renderCategories();
      renderTags();
      renderDrafts();
      renderTemplates();
      renderPacks();
      
      showNotification('All data deleted', 'success');
      closeAllModals();
    } catch (error) {
      console.error('[Delete] Error:', error);
      showNotification('Failed to delete data', 'error');
    }
  }

  // MODALS
  function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.remove('active');
    });

    editingPromptId = null;
    editingCategoryId = null;
    editingTagId = null;
    editingPackId = null;

    document.querySelectorAll('form').forEach(form => form.reset());
  }

  // UTILITY
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

  // GLOBAL EXPORTS
  window.switchTab = switchTab;
  window.openPromptModal = openPromptModal;
  window.openCategoryModal = openCategoryModal;
  window.openTagModal = openTagModal;
  window.openPackModal = openPackModal;
  window.openSettingsModal = openSettingsModal;
  window.copyCanvas = copyCanvasToClipboard;
  window.toggleWideMode = toggleWideMode;
  window.toggleDensity = toggleDensity;

  // INIT ON LOAD
  document.addEventListener('DOMContentLoaded', () => {
    init();
    
    // Load saved preferences
    const savedDensity = localStorage.getItem('ai_pm_density');
    if (savedDensity === 'compact') {
      document.body.classList.add('density-compact');
    }
    
    const savedWideMode = localStorage.getItem('ai_pm_wide_mode');
    if (savedWideMode === 'true') {
      document.body.classList.add('wide-mode');
    }
  });

})();	  