/**
 * Megaprompt-Logik
 * Kombiniert mehrere Prompts zu einem Gesamt-Prompt
 */

class MegapromptBuilder {
  /**
   * Kombiniert ausgewählte Prompts
   * @param {Array} prompts - Array von Prompt-Objekten
   * @param {Object} options - Optionen (separator, numbering)
   * @returns {string} Kombinierter Prompt-Text
   */
  static build(prompts, options = {}) {
    const {
      separator = '\n\n---\n\n',
      includeTitle = true,
      numbering = true
    } = options;

    if (!Array.isArray(prompts) || prompts.length === 0) {
      throw new Error('Keine Prompts ausgewählt');
    }

    let combined = '';

    prompts.forEach((prompt, index) => {
      let section = '';

      // Nummerierung und Titel
      if (includeTitle) {
        const prefix = numbering ? `${index + 1}. ` : '';
        section += `${prefix}${prompt.title}\n\n`;
      }

      // Prompt-Inhalt
      section += prompt.content;

      combined += section;

      // Separator (außer beim letzten Prompt)
      if (index < prompts.length - 1) {
        combined += separator;
      }
    });

    return combined;
  }

  /**
   * Generiert eine Vorschau des Megaprompts
   * @param {Array} prompts - Prompt-Objekte
   * @param {number} maxLength - Maximale Vorschaulänge
   * @returns {string} Gekürzte Vorschau
   */
  static preview(prompts, maxLength = 500) {
    const full = this.build(prompts, { separator: '\n\n---\n\n' });
    
    if (full.length <= maxLength) {
      return full;
    }

    return full.substring(0, maxLength) + '\n\n[... ' + (full.length - maxLength) + ' weitere Zeichen ...]';
  }

  /**
   * Zählt Tokens (approximativ, 1 Token ≈ 4 Zeichen)
   * @param {string} text - Zu analysierender Text
   * @returns {Object} Token-Statistik
   */
  static analyzeTokens(text) {
    const chars = text.length;
    const tokens = Math.ceil(chars / 4);
    const words = text.split(/\s+/).length;

    return {
      characters: chars,
      tokens: tokens,
      words: words
    };
  }
  
  /**
   * SLICE 4: Build from draft parts
   */
  static buildFromDraft(draft, options = {}) {
    const {
      includeHeaders = true,
      headerStyle = 'markdown',
      numbering = true
    } = options;
  
    let result = '';
  
    draft.parts.forEach((part, index) => {
      // Add header
      if (includeHeaders && headerStyle !== 'none') {
        const number = numbering ? `${index + 1}. ` : '';
        const headerPrefix = headerStyle === 'markdown' 
          ? `### ${number}` 
          : `// ${number}`;
  
        result += `${headerPrefix}${part.title}\n\n`;
      }
  
      // Add content
      result += part.content;
  
      // Add separator (except last)
      if (index < draft.parts.length - 1) {
        result += part.separator || '\n\n';
      }
    });
  
    return result;
  }  
  
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MegapromptBuilder;
}