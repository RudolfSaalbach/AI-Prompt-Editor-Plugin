/**
 * Export/Import Manager für Slice 2
 * Handles JSON Export/Import mit Duplikatserkennung
 */

class ExportImportManager {
  /**
   * Exportiert alle Daten als JSON-Datei
   * @param {Object} data - Zu exportierende Daten
   * @param {string} filename - Dateiname (optional)
   */
  static exportToJSON(data, filename = null) {
    if (!DataModel.validate(data)) {
      throw new Error('Ungültige Datenstruktur für Export');
    }

    // Metadaten hinzufügen
    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      data: data
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Dateiname generieren
    const timestamp = new Date().toISOString().split('T')[0];
    const finalFilename = filename || `ai-prompt-manager-backup-${timestamp}.json`;

    // Download triggern
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return finalFilename;
  }

  /**
   * Importiert Daten aus JSON-Datei
   * @param {File} file - JSON-Datei
   * @returns {Promise<Object>} Parsed Import-Daten
   */
  static async importFromJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const importData = JSON.parse(e.target.result);

          // Validierung
          if (!importData.data || !DataModel.validate(importData.data)) {
            throw new Error('Ungültige Datenstruktur in Import-Datei');
          }

          resolve(importData);
        } catch (error) {
          reject(new Error('Fehler beim Parsen der JSON-Datei: ' + error.message));
        }
      };

      reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei'));
      reader.readAsText(file);
    });
  }

  /**
   * Merge-Strategien für Import
   */
  static MERGE_STRATEGIES = {
    REPLACE: 'replace',      // Alle Daten ersetzen
    MERGE: 'merge',          // Duplikate überspringen, neue hinzufügen
    OVERWRITE: 'overwrite'   // Duplikate überschreiben
  };

  /**
   * Merged importierte Daten mit existierenden Daten
   * @param {Object} existingData - Aktuelle Daten
   * @param {Object} importData - Importierte Daten
   * @param {string} strategy - Merge-Strategie
   * @returns {Object} Merged Daten + Statistik
   */
  static mergeData(existingData, importData, strategy = this.MERGE_STRATEGIES.MERGE) {
    const stats = {
      categories: { added: 0, updated: 0, skipped: 0 },
      tags: { added: 0, updated: 0, skipped: 0 },
      prompts: { added: 0, updated: 0, skipped: 0 }
    };

    if (strategy === this.MERGE_STRATEGIES.REPLACE) {
      // Kompletter Replace
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

    // ID-Mapping für Referenzen
    const categoryIdMap = new Map();
    const tagIdMap = new Map();

    // Kategorien mergen
    importData.data.categories.forEach(importCat => {
      const existing = result.categories.find(c => 
        c.name.toLowerCase() === importCat.name.toLowerCase()
      );

      if (!existing) {
        // Neu hinzufügen
        const newId = DataModel.generateId('cat');
        categoryIdMap.set(importCat.id, newId);
        result.categories.push({
          ...importCat,
          id: newId,
          created: new Date().toISOString()
        });
        stats.categories.added++;
      } else if (strategy === this.MERGE_STRATEGIES.OVERWRITE) {
        // Überschreiben
        categoryIdMap.set(importCat.id, existing.id);
        existing.name = importCat.name;
        existing.color = importCat.color;
        stats.categories.updated++;
      } else {
        // Skip
        categoryIdMap.set(importCat.id, existing.id);
        stats.categories.skipped++;
      }
    });

    // Tags mergen
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

    // Prompts mergen
    importData.data.prompts.forEach(importPrompt => {
      const existing = result.prompts.find(p => 
        p.title.toLowerCase() === importPrompt.title.toLowerCase() &&
        p.content === importPrompt.content
      );

      if (!existing) {
        // Neu hinzufügen mit gemappten IDs
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
        // Überschreiben
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
        // Skip
        stats.prompts.skipped++;
      }
    });

    return { data: result, stats };
  }

  /**
   * Erstellt automatisches Backup
   * @param {Object} data - Zu sichernde Daten
   * @returns {string} Backup-Key
   */
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

    // Alte Backups löschen (nur letzte 5 behalten)
    this.cleanupOldBackups();

    return backupKey;
  }

  /**
   * Lädt Liste aller Backups
   * @returns {Promise<Array>} Backup-Liste
   */
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

  /**
   * Restored Backup
   * @param {string} backupKey - Backup-Key
   * @returns {Promise<Object>} Restored Daten
   */
  static async restoreBackup(backupKey) {
    const storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;
    const result = await storage.get(backupKey);
    
    if (!result[backupKey]) {
      throw new Error('Backup nicht gefunden');
    }

    return result[backupKey].data;
  }

  /**
   * Löscht alte Backups (behält nur die letzten 5)
   */
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

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportImportManager;
}