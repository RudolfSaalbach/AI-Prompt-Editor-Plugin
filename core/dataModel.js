/**
 * Datenmodell & Validierung - Slice 3 (mit Profilen)
 * Zentrale Definitionen für Kategorien, Tags, Prompts und Profile
 */

class DataModel {
  /**
   * Generiert eine eindeutige ID mit Präfix
   * @param {string} prefix - Präfix (cat, tag, prompt, profile)
   * @returns {string} Eindeutige ID
   */
  static generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Erstellt eine neue Kategorie
   * @param {string} name - Kategoriename
   * @param {string} color - Hex-Farbe
   * @returns {Object} Kategorie-Objekt
   */
  static createCategory(name, color = '#6B7280') {
    if (!name || name.trim().length === 0) {
      throw new Error('Kategoriename darf nicht leer sein');
    }
    
    return {
      id: this.generateId('cat'),
      name: name.trim(),
      color: color,
      created: new Date().toISOString()
    };
  }

  /**
   * Erstellt einen neuen Tag
   * @param {string} name - Tag-Name
   * @param {string} color - Hex-Farbe
   * @param {boolean} isProfile - Ist dies ein Profil-Tag? (Slice 3)
   * @returns {Object} Tag-Objekt
   */
  static createTag(name, color = '#8B5CF6', isProfile = false) {
    if (!name || name.trim().length === 0) {
      throw new Error('Tag-Name darf nicht leer sein');
    }
    
    return {
      id: this.generateId('tag'),
      name: name.trim(),
      color: color,
      isProfile: isProfile // NEU in Slice 3
    };
  }

  /**
   * Erstellt einen neuen Prompt
   * @param {Object} data - Prompt-Daten
   * @returns {Object} Prompt-Objekt
   */
  static createPrompt(data) {
    const { title, description, content, categoryId, tagIds } = data;
    
    if (!title || title.trim().length === 0) {
      throw new Error('Prompt-Titel darf nicht leer sein');
    }
    if (!content || content.trim().length === 0) {
      throw new Error('Prompt-Inhalt darf nicht leer sein');
    }
    
    const now = new Date().toISOString();
    
    return {
      id: this.generateId('prompt'),
      title: title.trim(),
      description: (description || '').trim(),
      content: content.trim(),
      categoryId: categoryId || null,
      tagIds: Array.isArray(tagIds) ? tagIds : [],
      created: now,
      modified: now
    };
  }

  /**
   * Validiert die Datenstruktur
   * @param {Object} data - Zu validierende Daten
   * @returns {boolean} Validierungsergebnis
   */
  static validate(data) {
    if (!data || typeof data !== 'object') return false;
    
    const hasCategories = Array.isArray(data.categories);
    const hasTags = Array.isArray(data.tags);
    const hasPrompts = Array.isArray(data.prompts);
    
    return hasCategories && hasTags && hasPrompts;
  }

  /**
   * Erstellt leere Datenstruktur
   * @returns {Object} Leere Datenstruktur
   */
  static createEmpty() {
    return {
      categories: [],
      tags: [],
      prompts: []
    };
  }

  /**
   * SLICE 3: Hilfsfunktionen für Profile
   */
  
  /**
   * Filtert Profile-Tags aus allen Tags
   * @param {Array} tags - Alle Tags
   * @returns {Array} Nur Profile-Tags
   */
  static getProfiles(tags) {
    return tags.filter(tag => tag.isProfile === true);
  }

  /**
   * Filtert normale Tags (keine Profile)
   * @param {Array} tags - Alle Tags
   * @returns {Array} Nur normale Tags
   */
  static getNormalTags(tags) {
    return tags.filter(tag => !tag.isProfile);
  }

  /**
   * Prüft ob ein Tag ein Profil ist
   * @param {Object} tag - Tag-Objekt
   * @returns {boolean}
   */
  static isProfile(tag) {
    return tag && tag.isProfile === true;
  }
  
  /**
   * SLICE 4: Draft entity methods
   */
  static createDraft(title = 'Untitled Draft') {
    return {
  	id: this.generateId('draft'),
  	title: title.trim(),
  	parts: [],
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
   * SLICE 4: Template entity methods
   */
  static createTemplate(frameworkKey, name, values = {}) {
    return {
  	id: this.generateId('template'),
  	frameworkKey: frameworkKey,
  	name: name.trim(),
  	values: values,
  	created: new Date().toISOString(),
  	modified: new Date().toISOString()
    };
  }
  
  /**
   * SLICE 4: Validate draft structure
   */
  static validateDraft(draft) {
    if (!draft || typeof draft !== 'object') return false;
  
    const hasId = typeof draft.id === 'string';
    const hasTitle = typeof draft.title === 'string';
    const hasParts = Array.isArray(draft.parts);
    const hasMetadata = draft.metadata && typeof draft.metadata === 'object';
  
    return hasId && hasTitle && hasParts && hasMetadata;
  }
  
}

// Export für Module (Browser-kompatibel)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataModel;
}