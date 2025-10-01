/**
 * Variable Pack Manager - CRUD for Variable Packs
 * High-end pack management with merge strategies
 */

class VariablePackManager {
  constructor(storage) {
    this.storage = storage;
    this.packs = [];
  }

  /**
   * Load all packs from storage
   */
  async load() {
    try {
      const data = await this.storage.load();
      this.packs = data.variablePacks || [];
      return this.packs;
    } catch (error) {
      console.error('[VariablePackManager] Load error:', error);
      return [];
    }
  }

  /**
   * Save packs to storage
   */
  async save() {
    try {
      const data = await this.storage.load();
      data.variablePacks = this.packs;
      await this.storage.save(data);
    } catch (error) {
      console.error('[VariablePackManager] Save error:', error);
      throw error;
    }
  }

  /**
   * Create new pack
   */
  async createPack(packData) {
    const { name, description, variables, tags } = packData;
    
    const validation = this.validatePack({ name, variables });
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Check for duplicate names
    if (this.packs.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('A pack with this name already exists');
    }

    const pack = {
      id: `pack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: (description || '').trim(),
      variables: variables || [],
      tags: tags || [],
      stats: {
        variableCount: (variables || []).length,
        lastUsed: null,
        useCount: 0
      },
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };

    this.packs.push(pack);
    await this.save();
    
    return pack;
  }

  /**
   * Update existing pack
   */
  async updatePack(packId, updates) {
    const index = this.packs.findIndex(p => p.id === packId);
    if (index === -1) {
      throw new Error('Pack not found');
    }

    const pack = this.packs[index];
    
    // Validate if name changed
    if (updates.name && updates.name !== pack.name) {
      if (this.packs.some(p => p.id !== packId && p.name.toLowerCase() === updates.name.toLowerCase())) {
        throw new Error('A pack with this name already exists');
      }
    }

    // Update fields
    Object.assign(pack, {
      ...updates,
      modified: new Date().toISOString()
    });

    // Update stats
    if (updates.variables) {
      pack.stats.variableCount = updates.variables.length;
    }

    await this.save();
    return pack;
  }

  /**
   * Delete pack
   */
  async deletePack(packId) {
    const index = this.packs.findIndex(p => p.id === packId);
    if (index === -1) {
      throw new Error('Pack not found');
    }

    this.packs.splice(index, 1);
    await this.save();
  }

  /**
   * Get pack by ID
   */
  getPack(packId) {
    return this.packs.find(p => p.id === packId);
  }

  /**
   * Get all packs
   */
  getAllPacks() {
    return [...this.packs].sort((a, b) => 
      new Date(b.modified) - new Date(a.modified)
    );
  }

  /**
   * Search packs
   */
  searchPacks(query) {
    const lowerQuery = query.toLowerCase();
    
    return this.packs.filter(pack => 
      pack.name.toLowerCase().includes(lowerQuery) ||
      pack.description.toLowerCase().includes(lowerQuery) ||
      pack.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      pack.variables.some(v => v.name.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Filter packs by tag
   */
  filterByTag(tag) {
    return this.packs.filter(pack => pack.tags.includes(tag));
  }

  /**
   * Apply pack to variable engine
   */
  async applyPack(packId, variableEngine, strategy = 'prompt') {
    const pack = this.getPack(packId);
    if (!pack) {
      throw new Error('Pack not found');
    }

    const conflicts = [];
    const applied = [];

    for (const variable of pack.variables) {
      const existing = variableEngine.variables.has(variable.name);
      
      if (existing && strategy === 'prompt') {
        conflicts.push({
          name: variable.name,
          oldValue: variableEngine.variables.get(variable.name),
          newValue: variable.value
        });
      } else if (existing && strategy === 'skip') {
        // Skip existing
        continue;
      } else {
        // Apply (overwrite or new)
        variableEngine.setValue(variable.name, variable.value);
        applied.push(variable.name);
      }
    }

    // Update stats
    pack.stats.lastUsed = new Date().toISOString();
    pack.stats.useCount++;
    await this.save();

    return {
      applied: applied.length,
      conflicts: conflicts,
      skipped: pack.variables.length - applied.length - conflicts.length
    };
  }

  /**
   * Resolve conflicts
   */
  async resolveConflicts(packId, variableEngine, resolutions) {
    const pack = this.getPack(packId);
    if (!pack) {
      throw new Error('Pack not found');
    }

    let applied = 0;

    resolutions.forEach(({ name, action }) => {
      const variable = pack.variables.find(v => v.name === name);
      if (!variable) return;

      if (action === 'overwrite' || action === 'new') {
        variableEngine.setValue(name, variable.value);
        applied++;
      }
      // 'skip' = do nothing
    });

    return applied;
  }

  /**
   * Duplicate pack
   */
  async duplicatePack(packId) {
    const original = this.getPack(packId);
    if (!original) {
      throw new Error('Pack not found');
    }

    let newName = `${original.name} (Copy)`;
    let counter = 1;
    
    while (this.packs.some(p => p.name === newName)) {
      counter++;
      newName = `${original.name} (Copy ${counter})`;
    }

    return await this.createPack({
      name: newName,
      description: original.description,
      variables: original.variables.map(v => ({ ...v })),
      tags: [...original.tags]
    });
  }

  /**
   * Merge packs
   */
  async mergePacks(packIds, newName, strategy = 'last-wins') {
    const packs = packIds.map(id => this.getPack(id)).filter(Boolean);
    
    if (packs.length === 0) {
      throw new Error('No valid packs selected');
    }

    const merged = new Map();

    packs.forEach(pack => {
      pack.variables.forEach(variable => {
        if (strategy === 'first-wins' && merged.has(variable.name)) {
          return;
        }
        merged.set(variable.name, { ...variable });
      });
    });

    const allTags = [...new Set(packs.flatMap(p => p.tags))];

    return await this.createPack({
      name: newName,
      description: `Merged from ${packs.length} packs`,
      variables: Array.from(merged.values()),
      tags: allTags
    });
  }

  /**
   * Export pack to JSON
   */
  exportPack(packId) {
    const pack = this.getPack(packId);
    if (!pack) {
      throw new Error('Pack not found');
    }

    const exportData = {
      version: '1.0',
      exported: new Date().toISOString(),
      pack: {
        name: pack.name,
        description: pack.description,
        variables: pack.variables,
        tags: pack.tags
      }
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `variable-pack-${pack.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import pack from JSON
   */
  async importPack(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const importData = JSON.parse(e.target.result);

          if (!importData.pack || !importData.pack.name || !importData.pack.variables) {
            throw new Error('Invalid pack file format');
          }

          const pack = await this.createPack({
            name: importData.pack.name,
            description: importData.pack.description || '',
            variables: importData.pack.variables,
            tags: importData.pack.tags || []
          });

          resolve(pack);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Validate pack
   */
  validatePack(packData) {
    const errors = [];

    if (!packData.name || packData.name.trim().length === 0) {
      errors.push('Pack name is required');
    }

    if (packData.name && packData.name.length > 100) {
      errors.push('Pack name too long (max 100 characters)');
    }

    if (packData.variables && !Array.isArray(packData.variables)) {
      errors.push('Variables must be an array');
    }

    if (packData.variables) {
      packData.variables.forEach((v, index) => {
        if (!v.name) {
          errors.push(`Variable at index ${index} has no name`);
        }
        if (v.value === undefined) {
          errors.push(`Variable "${v.name}" has no value`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get pack statistics
   */
  getStats(packId) {
    const pack = this.getPack(packId);
    if (!pack) return null;

    return {
      variableCount: pack.variables.length,
      tagCount: pack.tags.length,
      lastUsed: pack.stats.lastUsed,
      useCount: pack.stats.useCount,
      created: pack.created,
      modified: pack.modified,
      age: Date.now() - new Date(pack.created).getTime()
    };
  }

  /**
   * Get all tags across packs
   */
  getAllTags() {
    const tags = new Set();
    this.packs.forEach(pack => {
      pack.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = VariablePackManager;
}