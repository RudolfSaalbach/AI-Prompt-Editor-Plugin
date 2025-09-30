/**
 * Megadraft Manager for Slice 4
 * Canvas persistence, chunking for large content (200k+ chars)
 */

class MegadraftManager {
  static CHUNK_SIZE = 50000; // 50k chars per chunk
  static MAX_DRAFT_SIZE = 500000; // 500k chars total

  /**
   * Create new draft
   */
  static createDraft(title = 'Untitled Draft') {
    return {
      id: DataModel.generateId('draft'),
      title: title,
      parts: [], // Array of {id, type, refId, title, content, separator}
      metadata: {
        charCount: 0,
        partCount: 0,
        lastEdited: new Date().toISOString(),
        lastCopied: null
      },
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };
  }

  /**
   * Add part to draft (prompt, template, or free text)
   */
  static addPart(draft, part) {
    const newPart = {
      id: DataModel.generateId('part'),
      type: part.type || 'prompt', // prompt | template | free
      refId: part.refId || null,
      title: part.title || 'Untitled',
      content: part.content || '',
      separator: part.separator || '\n\n',
      order: draft.parts.length
    };

    draft.parts.push(newPart);
    this.updateMetadata(draft);
    draft.modified = new Date().toISOString();

    return draft;
  }

  /**
   * Reorder parts
   */
  static reorderParts(draft, newOrder) {
    // newOrder is array of part IDs in desired order
    const partMap = new Map(draft.parts.map(p => [p.id, p]));
    
    draft.parts = newOrder
      .map(id => partMap.get(id))
      .filter(Boolean)
      .map((part, index) => ({ ...part, order: index }));

    draft.modified = new Date().toISOString();
    return draft;
  }

  /**
   * Update part content
   */
  static updatePart(draft, partId, updates) {
    const part = draft.parts.find(p => p.id === partId);
    if (!part) return draft;

    Object.assign(part, updates);
    this.updateMetadata(draft);
    draft.modified = new Date().toISOString();

    return draft;
  }

  /**
   * Remove part
   */
  static removePart(draft, partId) {
    draft.parts = draft.parts.filter(p => p.id !== partId);
    this.updateMetadata(draft);
    draft.modified = new Date().toISOString();

    return draft;
  }

  /**
   * Compose full canvas text from parts
   */
  static composeCanvas(draft, options = {}) {
    const {
      includeHeaders = true,
      headerStyle = 'markdown' // markdown | comment | none
    } = options;

    let canvas = '';

    draft.parts.forEach((part, index) => {
      // Add header
      if (includeHeaders && headerStyle !== 'none') {
        const headerPrefix = headerStyle === 'markdown' 
          ? `### ${index + 1}. ` 
          : `// ${index + 1}. `;
        
        canvas += `${headerPrefix}${part.title}\n\n`;
      }

      // Add content
      canvas += part.content;

      // Add separator (except for last part)
      if (index < draft.parts.length - 1) {
        canvas += part.separator;
      }
    });

    return canvas;
  }

  /**
   * Parse canvas back into parts (for "save as new" workflow)
   */
  static parseCanvas(canvasText, existingParts) {
    // Simple implementation: preserve part boundaries by separator
    // More sophisticated parsing can detect header changes
    
    const parts = [];
    let currentContent = canvasText;

    existingParts.forEach((part, index) => {
      const isLast = index === existingParts.length - 1;
      
      if (isLast) {
        // Last part gets remaining content
        parts.push({
          ...part,
          content: currentContent.trim()
        });
      } else {
        // Split by separator
        const separatorIndex = currentContent.indexOf(part.separator);
        
        if (separatorIndex !== -1) {
          const content = currentContent.substring(0, separatorIndex).trim();
          parts.push({
            ...part,
            content: content
          });
          currentContent = currentContent.substring(separatorIndex + part.separator.length);
        } else {
          // Separator not found, use remaining
          parts.push({
            ...part,
            content: currentContent.trim()
          });
          currentContent = '';
        }
      }
    });

    return parts;
  }

  /**
   * Update metadata stats
   */
  static updateMetadata(draft) {
    const canvas = this.composeCanvas(draft, { includeHeaders: false });
    
    draft.metadata.charCount = canvas.length;
    draft.metadata.partCount = draft.parts.length;
    draft.metadata.lastEdited = new Date().toISOString();

    return draft;
  }

  /**
   * Mark draft as copied
   */
  static markCopied(draft) {
    draft.metadata.lastCopied = new Date().toISOString();
    return draft;
  }

  /**
   * Chunk large content for storage
   */
  static chunkContent(content) {
    if (content.length <= this.CHUNK_SIZE) {
      return [content];
    }

    const chunks = [];
    let offset = 0;

    while (offset < content.length) {
      chunks.push(content.substring(offset, offset + this.CHUNK_SIZE));
      offset += this.CHUNK_SIZE;
    }

    return chunks;
  }

  /**
   * Reassemble chunks
   */
  static reassembleChunks(chunks) {
    return chunks.join('');
  }

  /**
   * Check if content exceeds limits
   */
  static checkLimits(draft) {
    const canvas = this.composeCanvas(draft, { includeHeaders: false });
    
    return {
      size: canvas.length,
      maxSize: this.MAX_DRAFT_SIZE,
      exceeds: canvas.length > this.MAX_DRAFT_SIZE,
      percentage: Math.round((canvas.length / this.MAX_DRAFT_SIZE) * 100)
    };
  }

  /**
   * Get stats for display
   */
  static getStats(draft) {
    const canvas = this.composeCanvas(draft, { includeHeaders: false });
    
    return {
      characters: canvas.length,
      words: canvas.split(/\s+/).filter(Boolean).length,
      lines: canvas.split('\n').length,
      parts: draft.parts.length,
      tokens: Math.ceil(canvas.length / 4), // Approximation
      lastEdited: draft.metadata.lastEdited,
      lastCopied: draft.metadata.lastCopied
    };
  }

  /**
   * Validate draft
   */
  static validate(draft) {
    const errors = [];

    if (!draft.title || draft.title.trim().length === 0) {
      errors.push('Draft title is required');
    }

    if (!Array.isArray(draft.parts)) {
      errors.push('Draft parts must be an array');
    }

    const limits = this.checkLimits(draft);
    if (limits.exceeds) {
      errors.push(`Draft size (${limits.size} chars) exceeds maximum (${limits.maxSize})`);
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Duplicate draft
   */
  static duplicate(draft, newTitle = null) {
    const now = new Date().toISOString();
    
    return {
      ...draft,
      id: DataModel.generateId('draft'),
      title: newTitle || `${draft.title} (Copy)`,
      parts: draft.parts.map(part => ({
        ...part,
        id: DataModel.generateId('part')
      })),
      created: now,
      modified: now
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MegadraftManager;
}
