/**
 * Export/Import Manager
 */

class ExportImportManager {
  static exportToJSON(data, filename = null) {
    if (!DataModel.validate(data)) {
      throw new Error('Invalid data structure for export');
    }

    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      data: data
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().split('T')[0];
    const finalFilename = filename || `ai-prompt-manager-backup-${timestamp}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return finalFilename;
  }

  static async importFromJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const importData = JSON.parse(e.target.result);

          if (!importData.data || !DataModel.validate(importData.data)) {
            throw new Error('Invalid data structure in import file');
          }

          resolve(importData);
        } catch (error) {
          reject(new Error('Failed to parse JSON: ' + error.message));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  static MERGE_STRATEGIES = {
    REPLACE: 'replace',
    MERGE: 'merge',
    OVERWRITE: 'overwrite'
  };

  static mergeData(existingData, importData, strategy = this.MERGE_STRATEGIES.MERGE) {
    const stats = {
      categories: { added: 0, updated: 0, skipped: 0 },
      tags: { added: 0, updated: 0, skipped: 0 },
      prompts: { added: 0, updated: 0, skipped: 0 }
    };

    if (strategy === this.MERGE_STRATEGIES.REPLACE) {
      return {
        data: importData.data,
        stats: {
          categories: { added: importData.data.categories.length, updated: 0, skipped: 0 },
          tags: { added: importData.data.tags.length, updated: 0, skipped: 0 },
          prompts: { added: importData.data.prompts.length, updated: 0, skipped: 0 }
        }
      };
    }

    const result = {
      categories: [...existingData.categories],
      tags: [...existingData.tags],
      prompts: [...existingData.prompts]
    };

    const categoryIdMap = new Map();
    const tagIdMap = new Map();

    importData.data.categories.forEach(importCat => {
      const existing = result.categories.find(c => 
        c.name.toLowerCase() === importCat.name.toLowerCase()
      );

      if (!existing) {
        const newId = DataModel.generateId('cat');
        categoryIdMap.set(importCat.id, newId);
        result.categories.push({
          ...importCat,
          id: newId,
          created: new Date().toISOString()
        });
        stats.categories.added++;
      } else if (strategy === this.MERGE_STRATEGIES.OVERWRITE) {
        categoryIdMap.set(importCat.id, existing.id);
        existing.name = importCat.name;
        existing.color = importCat.color;
        stats.categories.updated++;
      } else {
        categoryIdMap.set(importCat.id, existing.id);
        stats.categories.skipped++;
      }
    });

    importData.data.tags.forEach(importTag => {
      const existing = result.tags.find(t => 
        t.name.toLowerCase() === importTag.name.toLowerCase()
      );

      if (!existing) {
        const newId = DataModel.generateId('tag');
        tagIdMap.set(importTag.id, newId);
        result.tags.push({
          ...importTag,
          id: newId
        });
        stats.tags.added++;
      } else if (strategy === this.MERGE_STRATEGIES.OVERWRITE) {
        tagIdMap.set(importTag.id, existing.id);
        existing.name = importTag.name;
        existing.color = importTag.color;
        stats.tags.updated++;
      } else {
        tagIdMap.set(importTag.id, existing.id);
        stats.tags.skipped++;
      }
    });

    importData.data.prompts.forEach(importPrompt => {
      const existing = result.prompts.find(p => 
        p.title.toLowerCase() === importPrompt.title.toLowerCase() &&
        p.content === importPrompt.content
      );

      if (!existing) {
        const newId = DataModel.generateId('prompt');
        const mappedCategoryId = importPrompt.categoryId 
          ? (categoryIdMap.get(importPrompt.categoryId) || null)
          : null;
        const mappedTagIds = importPrompt.tagIds
          .map(tid => tagIdMap.get(tid))
          .filter(Boolean);

        result.prompts.push({
          ...importPrompt,
          id: newId,
          categoryId: mappedCategoryId,
          tagIds: mappedTagIds,
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        });
        stats.prompts.added++;
      } else if (strategy === this.MERGE_STRATEGIES.OVERWRITE) {
        const mappedCategoryId = importPrompt.categoryId 
          ? (categoryIdMap.get(importPrompt.categoryId) || existing.categoryId)
          : null;
        const mappedTagIds = importPrompt.tagIds
          .map(tid => tagIdMap.get(tid))
          .filter(Boolean);

        existing.title = importPrompt.title;
        existing.description = importPrompt.description;
        existing.content = importPrompt.content;
        existing.categoryId = mappedCategoryId;
        existing.tagIds = mappedTagIds;
        existing.modified = new Date().toISOString();
        stats.prompts.updated++;
      } else {
        stats.prompts.skipped++;
      }
    });

    return { data: result, stats };
  }

  static createAutoBackup(data) {
    const timestamp = Date.now();
    const backupKey = `aiPromptManager_backup_${timestamp}`;
    
    const storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;
    
    const backupData = {
      timestamp: timestamp,
      date: new Date().toISOString(),
      data: data
    };

    storage.set({ [backupKey]: backupData });
    this.cleanupOldBackups();

    return backupKey;
  }

  static async listBackups() {
    const storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;
    const allData = await storage.get(null);
    
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

  static async restoreBackup(backupKey) {
    const storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;
    const result = await storage.get(backupKey);
    
    if (!result[backupKey]) {
      throw new Error('Backup not found');
    }

    return result[backupKey].data;
  }

  static async cleanupOldBackups() {
    const backups = await this.listBackups();
    
    if (backups.length > 5) {
      const storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;
      const toDelete = backups.slice(5).map(b => b.key);
      
      toDelete.forEach(key => {
        storage.remove(key);
      });
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportImportManager;
}