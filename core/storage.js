/**
 * Storage Manager - Complete with Variable Packs
 */

class StorageManager {
  constructor() {
    this.storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;
    this.STORAGE_KEY = 'aiPromptManager_data';
  }

  async load() {
    try {
      const result = await this.storage.get(this.STORAGE_KEY);
      const data = result[this.STORAGE_KEY];
      
      if (data && DataModel.validate(data)) {
        if (!data.drafts) data.drafts = [];
        if (!data.templates) data.templates = [];
        if (!data.variablePacks) data.variablePacks = [];
        return data;
      }
      
      return DataModel.createEmpty();
    } catch (error) {
      console.error('[Storage] Load error:', error);
      return DataModel.createEmpty();
    }
  }

  async save(data) {
    try {
      if (!DataModel.validate(data)) {
        throw new Error('Invalid data structure');
      }
      await this.storage.set({ [this.STORAGE_KEY]: data });
    } catch (error) {
      console.error('[Storage] Save error:', error);
      throw error;
    }
  }

  async clear() {
    await this.storage.remove(this.STORAGE_KEY);
  }

  // Categories
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
    if (index === -1) throw new Error('Category not found');
    data.categories[index] = { ...data.categories[index], ...updates };
    await this.save(data);
    return data.categories[index];
  }

  async deleteCategory(id) {
    const data = await this.load();
    data.prompts.forEach(p => { if (p.categoryId === id) p.categoryId = null; });
    data.categories = data.categories.filter(c => c.id !== id);
    await this.save(data);
  }

  // Tags
  async addTag(name, color, isProfile = false) {
    const data = await this.load();
    const tag = DataModel.createTag(name, color, isProfile);
    data.tags.push(tag);
    await this.save(data);
    return tag;
  }

  async updateTag(id, updates) {
    const data = await this.load();
    const index = data.tags.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Tag not found');
    data.tags[index] = { ...data.tags[index], ...updates };
    await this.save(data);
    return data.tags[index];
  }

  async deleteTag(id) {
    const data = await this.load();
    data.prompts.forEach(p => { p.tagIds = p.tagIds.filter(tid => tid !== id); });
    data.tags = data.tags.filter(t => t.id !== id);
    await this.save(data);
  }

  // Prompts
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
    if (index === -1) throw new Error('Prompt not found');
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

  // Drafts
  async saveDraft(draft) {
    const data = await this.load();
    if (!data.drafts) data.drafts = [];
    
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
    return data.drafts?.find(d => d.id === draftId) || null;
  }

  async loadAllDrafts() {
    const data = await this.load();
    return data.drafts || [];
  }

  async deleteDraft(draftId) {
    const data = await this.load();
    if (data.drafts) {
      data.drafts = data.drafts.filter(d => d.id !== draftId);
      await this.save(data);
    }
  }

  // Templates
  async saveTemplate(template) {
    const data = await this.load();
    if (!data.templates) data.templates = [];
    
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
    if (data.templates) {
      data.templates = data.templates.filter(t => t.id !== templateId);
      await this.save(data);
    }
  }

  // Variable Packs
  async saveVariablePack(pack) {
    const data = await this.load();
    if (!data.variablePacks) data.variablePacks = [];
    
    const index = data.variablePacks.findIndex(p => p.id === pack.id);
    if (index === -1) {
      data.variablePacks.push(pack);
    } else {
      data.variablePacks[index] = pack;
    }
    
    await this.save(data);
    return pack;
  }

  async loadAllVariablePacks() {
    const data = await this.load();
    return data.variablePacks || [];
  }

  async deleteVariablePack(packId) {
    const data = await this.load();
    if (data.variablePacks) {
      data.variablePacks = data.variablePacks.filter(p => p.id !== packId);
      await this.save(data);
    }
  }

  // Backups
  async loadBackups() {
    const allData = await this.storage.get(null);
    const backups = Object.keys(allData)
      .filter(key => key.startsWith('aiPromptManager_backup_'))
      .map(key => ({
        key: key,
        timestamp: allData[key].timestamp,
        date: allData[key].date,
        size: JSON.stringify(allData[key].data).length
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
    return backups;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}