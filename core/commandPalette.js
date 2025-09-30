/**
 * SLICE 5 - COMMAND PALETTE
 * Minimale, schnelle Command Palette mit ⌘K / Ctrl+K
 * 
 * INTEGRATION: Als neues Modul core/commandPalette.js speichern
 */

class CommandPalette {
  constructor() {
    this.isOpen = false;
    this.commands = [];
    this.filteredCommands = [];
    this.selectedIndex = 0;
    this.searchTerm = '';
    this.onExecute = null;
  }

  /**
   * Initialisierung - Command Palette erstellen und Shortcuts registrieren
   */
  init(commandDefinitions, onExecute) {
    this.commands = commandDefinitions;
    this.onExecute = onExecute;
    
    // HTML erstellen
    this.createPaletteHTML();
    
    // Keyboard Shortcut: Cmd/Ctrl + K
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * HTML Structure für Command Palette erstellen
   */
  createPaletteHTML() {
    const palette = document.createElement('div');
    palette.id = 'command-palette';
    palette.className = 'command-palette';
    palette.innerHTML = `
      <div class="command-palette-backdrop"></div>
      <div class="command-palette-container">
        <div class="command-palette-header">
          <svg class="command-palette-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input 
            type="text" 
            class="command-palette-input" 
            placeholder="Type a command or search..."
            aria-label="Command palette search"
          />
          <kbd class="command-palette-hint">ESC</kbd>
        </div>
        <div class="command-palette-results" role="listbox"></div>
        <div class="command-palette-footer">
          <div class="command-palette-shortcuts">
            <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Execute</span>
            <span><kbd>ESC</kbd> Close</span>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(palette);
    
    // Event Listeners
    const input = palette.querySelector('.command-palette-input');
    const backdrop = palette.querySelector('.command-palette-backdrop');
    
    input.addEventListener('input', (e) => this.handleSearch(e.target.value));
    input.addEventListener('keydown', (e) => this.handleKeydown(e));
    backdrop.addEventListener('click', () => this.close());
  }

  /**
   * Command Palette öffnen/schließen
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Command Palette öffnen
   */
  open() {
    this.isOpen = true;
    this.selectedIndex = 0;
    this.searchTerm = '';
    
    const palette = document.getElementById('command-palette');
    const input = palette.querySelector('.command-palette-input');
    
    palette.classList.add('active');
    input.value = '';
    input.focus();
    
    // Initial: alle Commands anzeigen
    this.filteredCommands = [...this.commands];
    this.renderResults();
  }

  /**
   * Command Palette schließen
   */
  close() {
    this.isOpen = false;
    const palette = document.getElementById('command-palette');
    palette.classList.remove('active');
  }

  /**
   * Suche durchführen
   */
  handleSearch(term) {
    this.searchTerm = term.toLowerCase().trim();
    this.selectedIndex = 0;
    
    if (!this.searchTerm) {
      this.filteredCommands = [...this.commands];
    } else {
      this.filteredCommands = this.commands.filter(cmd => 
        cmd.label.toLowerCase().includes(this.searchTerm) ||
        (cmd.description && cmd.description.toLowerCase().includes(this.searchTerm)) ||
        (cmd.keywords && cmd.keywords.some(k => k.toLowerCase().includes(this.searchTerm)))
      );
    }
    
    this.renderResults();
  }

  /**
   * Keyboard Navigation
   */
  handleKeydown(e) {
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1);
        this.renderResults();
        this.scrollToSelected();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.renderResults();
        this.scrollToSelected();
        break;
        
      case 'Enter':
        e.preventDefault();
        this.executeSelected();
        break;
        
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
    }
  }

  /**
   * Results rendern
   */
  renderResults() {
    const container = document.querySelector('.command-palette-results');
    
    if (this.filteredCommands.length === 0) {
      container.innerHTML = `
        <div class="command-palette-empty">
          <p>No commands found</p>
        </div>
      `;
      return;
    }
    
    // Gruppierung nach Kategorie
    const grouped = this.groupByCategory(this.filteredCommands);
    
    container.innerHTML = Object.entries(grouped).map(([category, cmds]) => `
      <div class="command-palette-group">
        ${category !== 'default' ? `<div class="command-palette-group-title">${category}</div>` : ''}
        ${cmds.map((cmd, idx) => {
          const globalIndex = this.filteredCommands.indexOf(cmd);
          const isSelected = globalIndex === this.selectedIndex;
          
          return `
            <div 
              class="command-palette-item ${isSelected ? 'selected' : ''}" 
              data-index="${globalIndex}"
              role="option"
              aria-selected="${isSelected}"
            >
              <div class="command-palette-item-icon">
                ${cmd.icon || '▸'}
              </div>
              <div class="command-palette-item-content">
                <div class="command-palette-item-label">${this.highlightMatch(cmd.label)}</div>
                ${cmd.description ? `<div class="command-palette-item-desc">${cmd.description}</div>` : ''}
              </div>
              ${cmd.shortcut ? `<kbd class="command-palette-item-shortcut">${cmd.shortcut}</kbd>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `).join('');
    
    // Click-Handler für Items
    container.querySelectorAll('.command-palette-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectedIndex = parseInt(item.dataset.index);
        this.executeSelected();
      });
    });
  }

  /**
   * Commands nach Kategorie gruppieren
   */
  groupByCategory(commands) {
    return commands.reduce((acc, cmd) => {
      const category = cmd.category || 'default';
      if (!acc[category]) acc[category] = [];
      acc[category].push(cmd);
      return acc;
    }, {});
  }

  /**
   * Highlight Suchbegriff
   */
  highlightMatch(text) {
    if (!this.searchTerm) return text;
    
    const regex = new RegExp(`(${this.searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Scroll zu ausgewähltem Item
   */
  scrollToSelected() {
    const container = document.querySelector('.command-palette-results');
    const selected = container.querySelector('.command-palette-item.selected');
    
    if (selected) {
      selected.scrollIntoView({ 
        block: 'nearest', 
        behavior: 'smooth' 
      });
    }
  }

  /**
   * Ausgewählten Command ausführen
   */
  executeSelected() {
    const cmd = this.filteredCommands[this.selectedIndex];
    if (!cmd) return;
    
    this.close();
    
    if (this.onExecute && typeof cmd.action === 'function') {
      setTimeout(() => {
        try {
          cmd.action();
        } catch (error) {
          console.error('[CommandPalette] Fehler beim Ausführen:', error);
        }
      }, 100);
    }
  }
}

// ============================================================================
// COMMAND DEFINITIONS
// ============================================================================

/**
 * Standard Commands für AI Prompt Manager
 */
const DEFAULT_COMMANDS = [
  // Navigation
  {
    id: 'nav-megaprompt',
    label: 'Go to Megaprompt',
    description: 'Switch to Megaprompt canvas',
    category: 'Navigation',
    icon: '📝',
    keywords: ['canvas', 'compose'],
    action: () => switchTab('megaprompt')
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
    id: 'nav-categories',
    label: 'Go to Categories',
    description: 'Manage categories',
    category: 'Navigation',
    icon: '📁',
    action: () => switchTab('categories')
  },
  {
    id: 'nav-tags',
    label: 'Go to Tags',
    description: 'Manage tags and profiles',
    category: 'Navigation',
    icon: '🏷️',
    action: () => switchTab('tags')
  },

  // Actions
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
    id: 'action-add-to-canvas',
    label: 'Add to Canvas',
    description: 'Add prompts to Megaprompt canvas',
    category: 'Actions',
    icon: '📝',
    keywords: ['megaprompt', 'compose'],
    action: () => {
      switchTab('megaprompt');
      // Automatisch Insert Modal öffnen
      setTimeout(() => document.getElementById('btn-insert-megaprompt')?.click(), 200);
    }
  },
  {
    id: 'action-copy-canvas',
    label: 'Copy Canvas to Clipboard',
    description: 'Copy current Megaprompt to clipboard',
    category: 'Actions',
    icon: '📋',
    shortcut: 'Ctrl+C',
    keywords: ['clipboard'],
    action: () => {
      if (currentView === 'megaprompt') {
        copyMegaprompt();
      } else {
        switchTab('megaprompt');
        setTimeout(() => copyMegaprompt(), 200);
      }
    }
  },

  // Create
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
    keywords: ['auto-filter', 'context'],
    action: () => openTagModal(true)
  },

  // Settings
  {
    id: 'toggle-auto-filter',
    label: 'Toggle Auto-Filter',
    description: 'Enable/disable profile-based filtering',
    category: 'Settings',
    icon: '🔍',
    keywords: ['profile', 'filter'],
    action: () => {
      const toggle = document.getElementById('auto-filter-toggle');
      if (toggle) {
        toggle.checked = !toggle.checked;
        toggle.dispatchEvent(new Event('change'));
      }
    }
  },
  {
    id: 'toggle-wide-mode',
    label: 'Toggle Wide Mode',
    description: 'Switch between normal and wide layout',
    category: 'Settings',
    icon: '↔️',
    keywords: ['layout', 'width'],
    action: () => toggleWideMode()
  },
  {
    id: 'toggle-density',
    label: 'Toggle Density',
    description: 'Switch between comfort and compact mode',
    category: 'Settings',
    icon: '📐',
    keywords: ['spacing', 'compact'],
    action: () => toggleDensity()
  },
  {
    id: 'open-settings',
    label: 'Open Settings',
    description: 'Open settings and data management',
    category: 'Settings',
    icon: '⚙️',
    keywords: ['preferences', 'export', 'import'],
    action: () => openSettingsModal()
  },

  // Help
  {
    id: 'show-shortcuts',
    label: 'Show Keyboard Shortcuts',
    description: 'View all keyboard shortcuts',
    category: 'Help',
    icon: '⌨️',
    shortcut: '?',
    keywords: ['help', 'keys'],
    action: () => {
      if (typeof shortcuts !== 'undefined' && shortcuts.toggleOverlay) {
        shortcuts.toggleOverlay();
      }
    }
  }
];

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CommandPalette, DEFAULT_COMMANDS };
}