/**
 * SLICE 5 - LOW-HANGING FRUIT FEATURES
 * Copy+Minify, Density Mode, Wide Mode, Quick Sets
 * 
 * INTEGRATION: In popup.js integrieren oder als core/usabilityFeatures.js
 */

// ============================================================================
// FEATURE 1: COPY + MINIFY WHITESPACE
// ============================================================================

/**
 * Kopiert Text mit minimiertem Whitespace
 * Original-Text bleibt unverändert
 */
async function copyWithMinifiedWhitespace(text) {
  try {
    // Whitespace normalisieren:
    // - Multiple Spaces → Single Space
    // - Multiple Newlines → Max 2 Newlines
    // - Trailing/Leading Whitespace pro Zeile entfernen
    const minified = text
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')  // Max 2 Newlines
      .replace(/ {2,}/g, ' ')      // Multiple Spaces → Single
      .trim();

    await navigator.clipboard.writeText(minified);
    
    // Statistik anzeigen
    const originalSize = text.length;
    const minifiedSize = minified.length;
    const saved = originalSize - minifiedSize;
    const percentage = ((saved / originalSize) * 100).toFixed(1);
    
    showNotification(
      `Copied (minified) · Saved ${saved} chars (${percentage}%)`, 
      'success'
    );
    
    return true;
  } catch (error) {
    console.error('[CopyMinify] Error:', error);
    showNotification('Failed to copy', 'error');
    return false;
  }
}

/**
 * Megaprompt mit Minify kopieren
 */
async function copyMegapromptMinified() {
  const preview = document.getElementById('mp-preview');
  if (!preview) return;
  
  const text = preview.value;
  if (!text) {
    showNotification('Canvas is empty', 'info');
    return;
  }
  
  await copyWithMinifiedWhitespace(text);
}

/**
 * Single Prompt mit Minify kopieren
 */
async function copyPromptMinified(promptId) {
  const prompt = currentData.prompts.find(p => p.id === promptId);
  if (!prompt) return;
  
  await copyWithMinifiedWhitespace(prompt.content);
}

// ============================================================================
// FEATURE 2: DENSITY MODE (Comfort / Compact)
// ============================================================================

class DensityMode {
  constructor() {
    this.currentDensity = 'comfort'; // 'comfort' | 'compact'
    this.storageKey = 'ai_prompt_manager_density';
  }

  /**
   * Initialisierung
   */
  async init() {
    // Gespeicherten Wert laden
    const stored = await this.load();
    if (stored) {
      this.currentDensity = stored;
    }
    
    // CSS-Klasse anwenden
    this.apply();
    
    // UI-Toggle aktualisieren
    this.updateToggle();
  }

  /**
   * Density umschalten
   */
  async toggle() {
    this.currentDensity = this.currentDensity === 'comfort' ? 'compact' : 'comfort';
    await this.save();
    this.apply();
    this.updateToggle();
    
    showNotification(
      `Density: ${this.currentDensity === 'comfort' ? 'Comfort' : 'Compact'}`,
      'info'
    );
  }

  /**
   * CSS-Klasse anwenden
   */
  apply() {
    document.body.classList.remove('density-comfort', 'density-compact');
    document.body.classList.add(`density-${this.currentDensity}`);
  }

  /**
   * Toggle-Button aktualisieren
   */
  updateToggle() {
    const toggle = document.getElementById('density-toggle');
    if (toggle) {
      toggle.textContent = this.currentDensity === 'comfort' ? '📐 Compact' : '📐 Comfort';
      toggle.setAttribute('aria-label', `Switch to ${this.currentDensity === 'comfort' ? 'compact' : 'comfort'} mode`);
    }
  }

  /**
   * Speichern
   */
  async save() {
    return chrome.storage.local.set({ [this.storageKey]: this.currentDensity });
  }

  /**
   * Laden
   */
  async load() {
    const result = await chrome.storage.local.get(this.storageKey);
    return result[this.storageKey];
  }

  /**
   * Getter
   */
  get() {
    return this.currentDensity;
  }
}

// Global instance
const densityMode = new DensityMode();

// Wrapper function für Command Palette
function toggleDensity() {
  densityMode.toggle();
}

// ============================================================================
// FEATURE 3: WIDE MODE
// ============================================================================

class WideMode {
  constructor() {
    this.isWide = false;
    this.storageKey = 'ai_prompt_manager_wide_mode';
  }

  /**
   * Initialisierung
   */
  async init() {
    // Gespeicherten Wert laden
    const stored = await this.load();
    if (stored !== null) {
      this.isWide = stored;
    }
    
    // CSS-Klasse anwenden
    this.apply();
    
    // UI-Toggle aktualisieren
    this.updateToggle();
  }

  /**
   * Wide Mode umschalten
   */
  async toggle() {
    this.isWide = !this.isWide;
    await this.save();
    this.apply();
    this.updateToggle();
    
    showNotification(
      `Wide Mode: ${this.isWide ? 'ON' : 'OFF'}`,
      'info'
    );
  }

  /**
   * CSS-Klasse anwenden
   */
  apply() {
    document.body.classList.toggle('wide-mode', this.isWide);
  }

  /**
   * Toggle-Button aktualisieren
   */
  updateToggle() {
    const toggle = document.getElementById('wide-mode-toggle');
    if (toggle) {
      toggle.textContent = this.isWide ? '↔️ Normal' : '↔️ Wide';
      toggle.setAttribute('aria-label', `Switch to ${this.isWide ? 'normal' : 'wide'} mode`);
    }
  }

  /**
   * Speichern
   */
  async save() {
    return chrome.storage.local.set({ [this.storageKey]: this.isWide });
  }

  /**
   * Laden
   */
  async load() {
    const result = await chrome.storage.local.get(this.storageKey);
    return result[this.storageKey];
  }

  /**
   * Getter
   */
  get() {
    return this.isWide;
  }
}

// Global instance
const wideMode = new WideMode();

// Wrapper function für Command Palette
function toggleWideMode() {
  wideMode.toggle();
}

// ============================================================================
// FEATURE 4: QUICK SETS
// ============================================================================

/**
 * Quick Sets - Speichere aktuelle Canvas-Konfiguration
 * (Parts + Reihenfolge) als wiederverwendbares Set
 */
class QuickSets {
  constructor() {
    this.sets = [];
    this.storageKey = 'ai_prompt_manager_quick_sets';
  }

  /**
   * Initialisierung
   */
  async init() {
    await this.load();
  }

  /**
   * Aktuelles Canvas als Quick Set speichern
   */
  async saveCurrentCanvas(name, description = '') {
    if (!currentDraft || !currentDraft.parts || currentDraft.parts.length === 0) {
      showNotification('Canvas is empty', 'error');
      return null;
    }

    // Validierung
    if (!name || name.trim().length === 0) {
      showNotification('Quick Set name is required', 'error');
      return null;
    }

    // Duplikat-Check
    if (this.sets.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      showNotification('Quick Set with this name already exists', 'error');
      return null;
    }

    const quickSet = {
      id: `qs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description.trim(),
      parts: currentDraft.parts.map(part => ({
        promptId: part.promptId,
        type: part.type,
        title: part.title
      })),
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };

    this.sets.push(quickSet);
    await this.save();
    
    showNotification(`Quick Set "${name}" saved`, 'success');
    return quickSet;
  }

  /**
   * Quick Set anwenden (auf aktuellen Canvas)
   */
  async applyQuickSet(quickSetId) {
    const quickSet = this.sets.find(s => s.id === quickSetId);
    if (!quickSet) {
      showNotification('Quick Set not found', 'error');
      return false;
    }

    // Prüfen, ob alle Prompts noch existieren
    const missingPrompts = [];
    const validParts = [];

    for (const part of quickSet.parts) {
      const prompt = currentData.prompts.find(p => p.id === part.promptId);
      if (prompt) {
        validParts.push({
          id: `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          promptId: part.promptId,
          type: part.type,
          title: part.title || prompt.title
        });
      } else {
        missingPrompts.push(part.title);
      }
    }

    // Konflikt-Warnung, wenn Prompts fehlen
    if (missingPrompts.length > 0) {
      const proceed = confirm(
        `${missingPrompts.length} prompt(s) from this Quick Set are missing:\n\n` +
        missingPrompts.join('\n') +
        `\n\nProceed with available prompts?`
      );
      
      if (!proceed) {
        return false;
      }
    }

    if (validParts.length === 0) {
      showNotification('No valid prompts in this Quick Set', 'error');
      return false;
    }

    // Canvas zurücksetzen und neue Parts hinzufügen
    if (!currentDraft) {
      currentDraft = {
        id: `draft_${Date.now()}`,
        parts: [],
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      };
    }

    currentDraft.parts = validParts;
    currentDraft.modified = new Date().toISOString();

    // Speichern und UI aktualisieren
    await storage.saveDraft(currentDraft);
    renderCanvasParts();
    updateMegapromptPreview();

    const message = missingPrompts.length > 0
      ? `Quick Set applied (${missingPrompts.length} missing)`
      : `Quick Set "${quickSet.name}" applied`;
    
    showNotification(message, 'success');
    return true;
  }

  /**
   * Quick Set löschen
   */
  async deleteQuickSet(quickSetId) {
    const index = this.sets.findIndex(s => s.id === quickSetId);
    if (index === -1) {
      showNotification('Quick Set not found', 'error');
      return false;
    }

    const quickSet = this.sets[index];
    const confirmed = confirm(`Delete Quick Set "${quickSet.name}"?`);
    
    if (!confirmed) return false;

    this.sets.splice(index, 1);
    await this.save();
    
    showNotification(`Quick Set "${quickSet.name}" deleted`, 'success');
    return true;
  }

  /**
   * Quick Set umbenennen
   */
  async renameQuickSet(quickSetId, newName) {
    const quickSet = this.sets.find(s => s.id === quickSetId);
    if (!quickSet) {
      showNotification('Quick Set not found', 'error');
      return false;
    }

    if (!newName || newName.trim().length === 0) {
      showNotification('Name cannot be empty', 'error');
      return false;
    }

    // Duplikat-Check
    if (this.sets.some(s => s.id !== quickSetId && s.name.toLowerCase() === newName.toLowerCase())) {
      showNotification('Quick Set with this name already exists', 'error');
      return false;
    }

    quickSet.name = newName.trim();
    quickSet.modified = new Date().toISOString();
    
    await this.save();
    showNotification('Quick Set renamed', 'success');
    return true;
  }

  /**
   * Alle Quick Sets abrufen
   */
  getAll() {
    return [...this.sets].sort((a, b) => 
      new Date(b.modified) - new Date(a.modified)
    );
  }

  /**
   * Speichern
   */
  async save() {
    return chrome.storage.local.set({ [this.storageKey]: this.sets });
  }

  /**
   * Laden
   */
  async load() {
    const result = await chrome.storage.local.get(this.storageKey);
    this.sets = result[this.storageKey] || [];
    return this.sets;
  }
}

// Global instance
const quickSets = new QuickSets();

// ============================================================================
// UI FUNCTIONS für Quick Sets
// ============================================================================

/**
 * Quick Set Modal öffnen (Save)
 */
function openSaveQuickSetModal() {
  if (!currentDraft || !currentDraft.parts || currentDraft.parts.length === 0) {
    showNotification('Canvas is empty - add prompts first', 'info');
    return;
  }

  const modal = document.getElementById('modal-quick-set-save');
  if (!modal) {
    console.error('[QuickSets] Save modal not found');
    return;
  }

  // Form zurücksetzen
  document.getElementById('quick-set-name').value = '';
  document.getElementById('quick-set-description').value = '';
  
  // Parts-Info anzeigen
  document.getElementById('quick-set-parts-count').textContent = currentDraft.parts.length;

  modal.classList.add('active');
  
  setTimeout(() => {
    document.getElementById('quick-set-name').focus();
  }, 100);
}

/**
 * Quick Set speichern (Submit Handler)
 */
async function handleSaveQuickSet(e) {
  e.preventDefault();

  const name = document.getElementById('quick-set-name').value.trim();
  const description = document.getElementById('quick-set-description').value.trim();

  const saved = await quickSets.saveCurrentCanvas(name, description);
  
  if (saved) {
    closeAllModals();
    renderQuickSetsList();
  }
}

/**
 * Quick Sets Liste Modal öffnen (Load)
 */
function openQuickSetsListModal() {
  const modal = document.getElementById('modal-quick-sets-list');
  if (!modal) {
    console.error('[QuickSets] List modal not found');
    return;
  }

  renderQuickSetsList();
  modal.classList.add('active');
}

/**
 * Quick Sets Liste rendern
 */
function renderQuickSetsList() {
  const container = document.getElementById('quick-sets-list');
  if (!container) return;

  const sets = quickSets.getAll();

  if (sets.length === 0) {
    container.innerHTML = `
      <div class="empty-state-small">
        <p>No Quick Sets saved yet</p>
        <p class="text-muted">Save your current canvas configuration for quick reuse</p>
      </div>
    `;
    return;
  }

  container.innerHTML = sets.map(set => `
    <div class="quick-set-item" data-id="${set.id}">
      <div class="quick-set-info">
        <div class="quick-set-name">${escapeHtml(set.name)}</div>
        ${set.description ? `<div class="quick-set-desc">${escapeHtml(set.description)}</div>` : ''}
        <div class="quick-set-meta">
          ${set.parts.length} prompt${set.parts.length !== 1 ? 's' : ''} · 
          ${new Date(set.modified).toLocaleDateString('de-DE')}
        </div>
      </div>
      <div class="quick-set-actions">
        <button class="btn-secondary-sm apply-quick-set" data-id="${set.id}" title="Apply to Canvas">
          Apply
        </button>
        <button class="icon-btn edit-quick-set" data-id="${set.id}" title="Rename">
          ✏️
        </button>
        <button class="icon-btn delete-quick-set" data-id="${set.id}" title="Delete">
          🗑️
        </button>
      </div>
    </div>
  `).join('');

  // Event Listeners
  container.querySelectorAll('.apply-quick-set').forEach(btn => {
    btn.addEventListener('click', async () => {
      const success = await quickSets.applyQuickSet(btn.dataset.id);
      if (success) {
        closeAllModals();
        switchTab('megaprompt');
      }
    });
  });

  container.querySelectorAll('.edit-quick-set').forEach(btn => {
    btn.addEventListener('click', () => editQuickSet(btn.dataset.id));
  });

  container.querySelectorAll('.delete-quick-set').forEach(btn => {
    btn.addEventListener('click', async () => {
      const deleted = await quickSets.deleteQuickSet(btn.dataset.id);
      if (deleted) {
        renderQuickSetsList();
      }
    });
  });
}

/**
 * Quick Set bearbeiten (Rename)
 */
function editQuickSet(quickSetId) {
  const set = quickSets.sets.find(s => s.id === quickSetId);
  if (!set) return;

  const newName = prompt('Rename Quick Set:', set.name);
  if (newName && newName !== set.name) {
    quickSets.renameQuickSet(quickSetId, newName).then(success => {
      if (success) {
        renderQuickSetsList();
      }
    });
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Alle Usability Features initialisieren
 */
async function initUsabilityFeatures() {
  // Density Mode
  await densityMode.init();
  
  // Wide Mode
  await wideMode.init();
  
  // Quick Sets
  await quickSets.init();
  
  console.log('[UsabilityFeatures] Initialized');
}

// ============================================================================
// EXPORT
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    copyWithMinifiedWhitespace,
    copyMegapromptMinified,
    copyPromptMinified,
    DensityMode,
    WideMode,
    QuickSets,
    initUsabilityFeatures,
    densityMode,
    wideMode,
    quickSets
  };
}