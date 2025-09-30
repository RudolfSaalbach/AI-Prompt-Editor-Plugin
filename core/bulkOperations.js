/**
 * Bulk-Operations Manager für Slice 2
 * Multi-Select und Bulk-Aktionen für Prompts
 */

class BulkOperationsManager {
  constructor() {
    this.selectedPromptIds = new Set();
  }

  /**
   * Toggle Prompt-Selektion
   * @param {string} promptId - Prompt-ID
   */
  toggleSelection(promptId) {
    if (this.selectedPromptIds.has(promptId)) {
      this.selectedPromptIds.delete(promptId);
    } else {
      this.selectedPromptIds.add(promptId);
    }
  }

  /**
   * Alle Prompts selektieren
   * @param {Array} promptIds - Array von Prompt-IDs
   */
  selectAll(promptIds) {
    promptIds.forEach(id => this.selectedPromptIds.add(id));
  }

  /**
   * Alle Prompts deselektieren
   */
  deselectAll() {
    this.selectedPromptIds.clear();
  }

  /**
   * Prüft ob Prompt selektiert ist
   * @param {string} promptId - Prompt-ID
   * @returns {boolean}
   */
  isSelected(promptId) {
    return this.selectedPromptIds.has(promptId);
  }

  /**
   * Gibt Anzahl selektierter Prompts zurück
   * @returns {number}
   */
  getSelectionCount() {
    return this.selectedPromptIds.size;
  }

  /**
   * Gibt Array selektierter IDs zurück
   * @returns {Array}
   */
  getSelectedIds() {
    return Array.from(this.selectedPromptIds);
  }

  /**
   * Bulk-Delete mit Bestätigung
   * @param {Array} promptIds - Zu löschende Prompt-IDs
   * @returns {Object} Bestätigungsdaten
   */
  prepareDeleteConfirmation(promptIds) {
    return {
      count: promptIds.length,
      message: `Möchten Sie wirklich ${promptIds.length} Prompt(s) löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      severity: promptIds.length > 10 ? 'high' : 'medium'
    };
  }

  /**
   * Bulk-Kategorie-Änderung
   * @param {Array} promptIds - Prompt-IDs
   * @param {string} categoryId - Neue Kategorie-ID (null = entfernen)
   */
  prepareBulkCategoryChange(promptIds, categoryId) {
    return {
      promptIds: promptIds,
      categoryId: categoryId,
      count: promptIds.length
    };
  }

  /**
   * Bulk-Tag-Zuordnung
   * @param {Array} promptIds - Prompt-IDs
   * @param {Array} tagIds - Hinzuzufügende Tag-IDs
   * @param {boolean} replace - Tags ersetzen (true) oder hinzufügen (false)
   */
  prepareBulkTagChange(promptIds, tagIds, replace = false) {
    return {
      promptIds: promptIds,
      tagIds: tagIds,
      replace: replace,
      count: promptIds.length
    };
  }

  /**
   * Exportiert selektierte Prompts
   * @param {Array} prompts - Alle Prompts
   * @param {Object} allData - Alle Daten (für Kategorien/Tags)
   * @returns {Object} Export-Daten
   */
  exportSelected(prompts, allData) {
    const selectedPrompts = prompts.filter(p => 
      this.selectedPromptIds.has(p.id)
    );

    // Verwendete Kategorien und Tags sammeln
    const usedCategoryIds = new Set(
      selectedPrompts.map(p => p.categoryId).filter(Boolean)
    );
    const usedTagIds = new Set(
      selectedPrompts.flatMap(p => p.tagIds)
    );

    const exportData = {
      categories: allData.categories.filter(c => usedCategoryIds.has(c.id)),
      tags: allData.tags.filter(t => usedTagIds.has(t.id)),
      prompts: selectedPrompts
    };

    return exportData;
  }

  /**
   * Dupliziert selektierte Prompts
   * @param {Array} prompts - Zu duplizierende Prompts
   * @returns {Array} Neue Prompt-Objekte
   */
  duplicateSelected(prompts) {
    return prompts.map(prompt => {
      const now = new Date().toISOString();
      return {
        ...prompt,
        id: DataModel.generateId('prompt'),
        title: `${prompt.title} (Kopie)`,
        created: now,
        modified: now
      };
    });
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BulkOperationsManager;
}