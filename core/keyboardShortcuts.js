/**
 * Keyboard Shortcuts Manager für Slice 3
 * Globale Tastatur-Navigation
 */

class KeyboardShortcuts {
  constructor() {
    this.shortcuts = new Map();
    this.overlayVisible = false;
  }

  /**
   * Registriert einen Shortcut
   * @param {string} key - Taste (z.B. 'c', 'f', 'Escape')
   * @param {Object} options - { ctrl, cmd, shift, alt, description, handler }
   */
  register(key, options) {
    const {
      ctrl = false,
      cmd = false,
      shift = false,
      alt = false,
      description = '',
      handler
    } = options;

    const shortcutKey = this.generateKey(key, { ctrl, cmd, shift, alt });
    
    this.shortcuts.set(shortcutKey, {
      key,
      ctrl,
      cmd,
      shift,
      alt,
      description,
      handler
    });
  }

  /**
   * Generiert eindeutigen Shortcut-Key
   */
  generateKey(key, modifiers) {
    const parts = [];
    if (modifiers.ctrl) parts.push('Ctrl');
    if (modifiers.cmd) parts.push('Cmd');
    if (modifiers.shift) parts.push('Shift');
    if (modifiers.alt) parts.push('Alt');
    parts.push(key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Event-Listener für Keyboard-Events
   */
  handleKeyDown(event) {
    // Ignoriere Events in Input-Feldern (außer Escape)
    const inInput = ['INPUT', 'TEXTAREA'].includes(event.target.tagName);
    
    if (inInput && event.key !== 'Escape') {
      return;
    }

    // Modifiers prüfen
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = event.ctrlKey;
    const cmdKey = event.metaKey;
    const shiftKey = event.shiftKey;
    const altKey = event.altKey;

    // Generiere Shortcut-Key
    const modifiers = {
      ctrl: ctrlKey && !isMac,
      cmd: cmdKey && isMac,
      shift: shiftKey,
      alt: altKey
    };

    const shortcutKey = this.generateKey(event.key, modifiers);
    const shortcut = this.shortcuts.get(shortcutKey);

    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      shortcut.handler(event);
    }

    // Spezial: '?' öffnet Shortcut-Overlay
    if (event.key === '?' && !inInput) {
      event.preventDefault();
      this.toggleOverlay();
    }
  }

  /**
   * Initialisiert Event-Listener
   */
  init() {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  /**
   * Toggle Shortcut-Overlay
   */
  toggleOverlay() {
    this.overlayVisible = !this.overlayVisible;
    
    if (this.overlayVisible) {
      this.showOverlay();
    } else {
      this.hideOverlay();
    }
  }

  /**
   * Zeigt Shortcut-Overlay
   */
  showOverlay() {
    const existing = document.getElementById('shortcuts-overlay');
    if (existing) {
      existing.style.display = 'flex';
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'shortcuts-overlay';
    overlay.className = 'shortcuts-overlay';
    
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? '⌘' : 'Ctrl';

    const shortcuts = Array.from(this.shortcuts.values());
    
    overlay.innerHTML = `
      <div class="shortcuts-modal">
        <div class="shortcuts-header">
          <h2>Tastatur-Shortcuts</h2>
          <button class="shortcuts-close">&times;</button>
        </div>
        <div class="shortcuts-body">
          ${shortcuts.map(s => `
            <div class="shortcut-item">
              <div class="shortcut-keys">
                ${s.ctrl || s.cmd ? `<kbd>${modKey}</kbd> + ` : ''}
                ${s.shift ? '<kbd>Shift</kbd> + ' : ''}
                ${s.alt ? '<kbd>Alt</kbd> + ' : ''}
                <kbd>${this.formatKey(s.key)}</kbd>
              </div>
              <div class="shortcut-description">${s.description}</div>
            </div>
          `).join('')}
          <div class="shortcut-item">
            <div class="shortcut-keys"><kbd>?</kbd></div>
            <div class="shortcut-description">Dieses Menü anzeigen</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Close-Button Handler
    overlay.querySelector('.shortcuts-close').addEventListener('click', () => {
      this.hideOverlay();
    });

    // Click außerhalb schließt
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hideOverlay();
      }
    });
  }

  /**
   * Versteckt Shortcut-Overlay
   */
  hideOverlay() {
    const overlay = document.getElementById('shortcuts-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    this.overlayVisible = false;
  }

  /**
   * Formatiert Taste für Anzeige
   */
  formatKey(key) {
    const keyMap = {
      'Escape': 'Esc',
      'Enter': '↵',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→'
    };

    return keyMap[key] || key.toUpperCase();
  }

  /**
   * Räumt auf
   */
  destroy() {
    this.shortcuts.clear();
    const overlay = document.getElementById('shortcuts-overlay');
    if (overlay) {
      overlay.remove();
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KeyboardShortcuts;
}