/**
 * Megaprompt Builder with Variable Resolution
 */

class MegapromptBuilder {
  static build(prompts, options = {}) {
    const {
      separator = '\n\n---\n\n',
      includeTitle = true,
      numbering = true
    } = options;

    if (!Array.isArray(prompts) || prompts.length === 0) {
      throw new Error('No prompts selected');
    }

    let combined = '';

    prompts.forEach((prompt, index) => {
      let section = '';

      if (includeTitle) {
        const prefix = numbering ? `${index + 1}. ` : '';
        section += `${prefix}${prompt.title}\n\n`;
      }

      section += prompt.content;
      combined += section;

      if (index < prompts.length - 1) {
        combined += separator;
      }
    });

    return combined;
  }

  static preview(prompts, maxLength = 500) {
    const full = this.build(prompts, { separator: '\n\n---\n\n' });
    
    if (full.length <= maxLength) {
      return full;
    }

    return full.substring(0, maxLength) + '\n\n[... ' + (full.length - maxLength) + ' more characters ...]';
  }

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
  
  static buildFromDraft(draft, options = {}) {
    const {
      includeHeaders = true,
      headerStyle = 'markdown',
      numbering = true,
      separator = '\n\n'
    } = options;

    let result = '';

    draft.parts.forEach((part, index) => {
      if (includeHeaders && headerStyle !== 'none') {
        const number = numbering ? `${index + 1}. ` : '';
        const headerPrefix = headerStyle === 'markdown' 
          ? `### ${number}` 
          : `// ${number}`;

        result += `${headerPrefix}${part.title}\n\n`;
      }

      result += part.content;

      if (index < draft.parts.length - 1) {
        result += part.separator || separator;
      }
    });

    return result;
  }

  /**
   * Extract variables from text
   */
  static extractVariables(text) {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables = new Set();
    let match;

    while ((match = regex.exec(text)) !== null) {
      variables.add(match[1].trim());
    }

    return Array.from(variables);
  }

  /**
   * Resolve variables in text
   */
  static async resolveVariables(text, variableEngine) {
    if (!variableEngine) return text;
    return await variableEngine.resolve(text);
  }

  /**
   * Build with variable resolution
   */
  static async buildResolved(draft, options = {}, variableEngine = null) {
    const raw = this.buildFromDraft(draft, options);
    
    if (!variableEngine) return raw;
    
    return await this.resolveVariables(raw, variableEngine);
  }

  /**
   * Get unresolved variables from draft
   */
  static getUnresolvedVariables(draft, variableEngine = null) {
    const text = this.buildFromDraft(draft, { includeHeaders: false });
    
    if (!variableEngine) {
      return this.extractVariables(text);
    }
    
    return variableEngine.getUnresolved(text);
  }

  /**
   * Highlight variables in text for UI
   */
  static highlightVariables(text) {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      return `<span class="variable-highlight" data-var="${varName.trim()}">${match}</span>`;
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MegapromptBuilder;
}