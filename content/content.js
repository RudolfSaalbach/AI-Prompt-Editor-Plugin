/**
 * Content Script für claude.ai
 * DOM-Interaktion zum Einfügen von Prompts
 */

(function() {
  'use strict';

  /**
   * Findet das Haupt-Textarea-Element auf claude.ai
   */
  function findClaudeTextarea() {
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
   */
  function insertText(text) {
    const textarea = findClaudeTextarea();
    
    if (!textarea) {
      return false;
    }

    try {
      if (textarea.contentEditable === 'true') {
        textarea.focus();
        
        if (textarea.textContent.trim().length === 0) {
          textarea.textContent = text;
        } else {
          textarea.textContent += '\n\n' + text;
        }

        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }

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

    return true;
  });

  console.log('[AI Prompt Manager] Content Script geladen');
})();