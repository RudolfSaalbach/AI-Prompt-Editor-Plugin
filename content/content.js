/**
 * Content Script für claude.ai
 * DOM-Interaktion zum Einfügen von Prompts
 */

(function() {
  'use strict';

  /**
   * Findet das Haupt-Textarea-Element auf claude.ai
   * ACHTUNG: Dieser Selektor muss getestet und ggf. angepasst werden
   * @returns {HTMLElement|null} Textarea-Element
   */
  function findClaudeTextarea() {
    // Mögliche Selektoren (von spezifisch zu generisch)
    const selectors = [
      'div[contenteditable="true"][data-placeholder]',
      'div[contenteditable="true"]',
      'textarea[placeholder*="Talk"]',
      'textarea[placeholder*="Message"]',
      '[role="textbox"]',
      '.ProseMirror'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('[AI Prompt Manager] Textarea gefunden:', selector);
        return element;
      }
    }

    console.warn('[AI Prompt Manager] Kein Textarea-Element gefunden');
    return null;
  }

  /**
   * Fügt Text in das Textarea ein
   * @param {string} text - Einzufügender Text
   * @returns {boolean} Erfolg
   */
  function insertText(text) {
    const textarea = findClaudeTextarea();
    
    if (!textarea) {
      return false;
    }

    try {
      // Methode 1: ContentEditable (z.B. ProseMirror)
      if (textarea.contentEditable === 'true') {
        textarea.focus();
        
        // Bestehenden Inhalt ersetzen oder anhängen
        if (textarea.textContent.trim().length === 0) {
          textarea.textContent = text;
        } else {
          textarea.textContent += '\n\n' + text;
        }

        // Input-Event triggern für Reaktivität
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }

      // Methode 2: Standard Textarea
      if (textarea.tagName === 'TEXTAREA') {
        textarea.focus();
        textarea.value = textarea.value ? textarea.value + '\n\n' + text : text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }

      return false;
    } catch (error) {
      console.error('[AI Prompt Manager] Fehler beim Einfügen:', error);
      return false;
    }
  }

  /**
   * Message-Listener für Kommunikation mit Popup
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'insertPrompt') {
      const success = insertText(message.text);
      sendResponse({ success: success });
    }

    if (message.action === 'checkAvailability') {
      const available = findClaudeTextarea() !== null;
      sendResponse({ available: available });
    }

    return true; // Async Response
  });

  console.log('[AI Prompt Manager] Content Script geladen');
})();