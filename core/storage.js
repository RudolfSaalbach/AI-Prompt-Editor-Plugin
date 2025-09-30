/**
 * Storage-Abstraktionsschicht
 * Vereinfachter Zugriff auf chrome.storage.local / browser.storage.local
 */

class StorageManager {
  constructor() {
    // Cross-Browser Kompatibilität
    this.storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;
    this.STORAGE_KEY = 'aiPromptManager_data';
  }

  /**
   * Lädt alle Daten aus dem Storage
   * @returns {Promise<Object>} Datenstruktur
   */
  async load() {
    try {
      const result = await this.storage.get(this.STORAGE_KEY);
      const data = result[this.STORAGE_KEY];
      
      // Validierung und Fallback
      if (data && DataModel.validate(data)) {
        return data;
      }
      
      return DataModel.createEmpty();
    } catch (error) {
      console.error('Storage-Fehler beim Laden:', error);
      return DataModel.createEmpty();
    }
  }

  /**
   * Speichert Daten im Storage
   * @param {Object} data - Zu speichernde Datenstruktur
   * @returns {Promise<void>}
   */
  async save(data) {
    try {
      if (!DataModel.validate(data)) {
        throw new Error('Ungültige Datenstruktur');
      }
      
      await this.storage.set({ [this.STORAGE_KEY]: data });
    } catch (error) {
      console.error('Storage-Fehler beim Speichern:', error);
      throw error;
    }
  }

  /**
   * Löscht alle Daten (mit Sicherheitsabfrage im UI)
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      await this.storage.remove(this.STORAGE_KEY);
    } catch (error) {
      console.error('Storage-Fehler beim Löschen:', error);
      throw error;
    }
  }

  /**
   * CRUD-Operationen für Kategorien
   */
  async addCategory(name, color) {
    const data = await this.load();
    const category = DataModel.createCategory(name, color);
    data.categories.push(category);
    await this.save(data);
    return category;
  }

  async updateCategory(id, updates) {
    const data = await this.load();
    const index = data.categories.findIndex(c => c.id === id);
    
    if (index === -1) throw new Error('Kategorie nicht gefunden');
    
    data.categories[index] = { ...data.categories[index], ...updates };
    await this.save(data);
    return data.categories[index];
  }

  async deleteCategory(id) {
    const data = await this.load();
    
    // Prompts von dieser Kategorie lösen
    data.prompts.forEach(p => {
      if (p.categoryId === id) p.categoryId = null;
    });
    
    data.categories = data.categories.filter(c => c.id !== id);
    await this.save(data);
  }

  /**
   * CRUD-Operationen für Tags
   */
  async addTag(name, color) {
    const data = await this.load();
    const tag = DataModel.createTag(name, color);
    data.tags.push(tag);
    await this.save(data);
    return tag;
  }

  async updateTag(id, updates) {
    const data = await this.load();
    const index = data.tags.findIndex(t => t.id === id);
    
    if (index === -1) throw new Error('Tag nicht gefunden');
    
    data.tags[index] = { ...data.tags[index], ...updates };
    await this.save(data);
    return data.tags[index];
  }

  async deleteTag(id) {
    const data = await this.load();
    
    // Tag aus allen Prompts entfernen
    data.prompts.forEach(p => {
      p.tagIds = p.tagIds.filter(tid => tid !== id);
    });
    
    data.tags = data.tags.filter(t => t.id !== id);
    await this.save(data);
  }

  /**
   * CRUD-Operationen für Prompts
   */
  async addPrompt(promptData) {
    const data = await this.load();
    const prompt = DataModel.createPrompt(promptData);
    data.prompts.push(prompt);
    await this.save(data);
    return prompt;
  }

  async updatePrompt(id, updates) {
    const data = await this.load();
    const index = data.prompts.findIndex(p => p.id === id);
    
    if (index === -1) throw new Error('Prompt nicht gefunden');
    
    data.prompts[index] = {
      ...data.prompts[index],
      ...updates,
      modified: new Date().toISOString()
    };
    
    await this.save(data);
    return data.prompts[index];
  }

  async deletePrompt(id) {
    const data = await this.load();
    data.prompts = data.prompts.filter(p => p.id !== id);
    await this.save(data);
  }

  async deletePrompts(ids) {
    const data = await this.load();
    data.prompts = data.prompts.filter(p => !ids.includes(p.id));
    await this.save(data);
  }
  
  /**
   * SLICE 4: Draft CRUD operations
   */
  async saveDraft(draft) {
    const data = await this.load();
  
    if (!data.drafts) {
      data.drafts = [];
    }
  
    const index = data.drafts.findIndex(d => d.id === draft.id);
  
    if (index === -1) {
      data.drafts.push(draft);
    } else {
      data.drafts[index] = draft;
    }
  
    await this.save(data);
    return draft;
  }
  
  async loadDraft(draftId) {
    const data = await this.load();
  
    if (!data.drafts) {
      return null;
    }
  
    return data.drafts.find(d => d.id === draftId) || null;
  }
  
  async loadAllDrafts() {
    const data = await this.load();
    return data.drafts || [];
  }
  
  async deleteDraft(draftId) {
    const data = await this.load();
  
    if (!data.drafts) {
      return;
    }
  
    data.drafts = data.drafts.filter(d => d.id !== draftId);
    await this.save(data);
  }
  
  /**
   * SLICE 4: Template CRUD operations
   */
  async saveTemplate(template) {
    const data = await this.load();
  
    if (!data.templates) {
      data.templates = [];
    }
  
    const index = data.templates.findIndex(t => t.id === template.id);
  
    if (index === -1) {
      data.templates.push(template);
    } else {
      data.templates[index] = template;
    }
  
    await this.save(data);
    return template;
  }
  
  async loadAllTemplates() {
    const data = await this.load();
    return data.templates || [];
  }
  
  async deleteTemplate(templateId) {
    const data = await this.load();
  
    if (!data.templates) {
      return;
    }
  
    data.templates = data.templates.filter(t => t.id !== templateId);
    await this.save(data);
  }  
    
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}