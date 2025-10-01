/**
 * Datenmodell & Validierung
 */

class DataModel {
  static generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

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

  static createTag(name, color = '#8B5CF6', isProfile = false) {
    if (!name || name.trim().length === 0) {
      throw new Error('Tag-Name darf nicht leer sein');
    }
    
    return {
      id: this.generateId('tag'),
      name: name.trim(),
      color: color,
      isProfile: isProfile
    };
  }

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

  static validate(data) {
    if (!data || typeof data !== 'object') return false;
    
    const hasCategories = Array.isArray(data.categories);
    const hasTags = Array.isArray(data.tags);
    const hasPrompts = Array.isArray(data.prompts);
    
    return hasCategories && hasTags && hasPrompts;
  }

  static createEmpty() {
    return {
      categories: [],
      tags: [],
      prompts: [],
      drafts: [],
      templates: []
    };
  }

  static getProfiles(tags) {
    return tags.filter(tag => tag.isProfile === true);
  }

  static getNormalTags(tags) {
    return tags.filter(tag => !tag.isProfile);
  }

  static isProfile(tag) {
    return tag && tag.isProfile === true;
  }
  
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
  
  static validateDraft(draft) {
    if (!draft || typeof draft !== 'object') return false;
  
    const hasId = typeof draft.id === 'string';
    const hasTitle = typeof draft.title === 'string';
    const hasParts = Array.isArray(draft.parts);
    const hasMetadata = draft.metadata && typeof draft.metadata === 'object';
  
    return hasId && hasTitle && hasParts && hasMetadata;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataModel;
}