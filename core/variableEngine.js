/**
 * Variable Engine - High-End Variable System
 * Smart variables, auto-completion, type validation
 */

class VariableEngine {
  constructor() {
    this.variables = new Map();
    this.smartVariables = this.initSmartVariables();
  }

  /**
   * Smart built-in variables
   */
  initSmartVariables() {
    return {
      // Date/Time
      'date': () => new Date().toLocaleDateString('de-DE'),
      'date.iso': () => new Date().toISOString().split('T')[0],
      'date.us': () => new Date().toLocaleDateString('en-US'),
      'date.long': () => new Date().toLocaleDateString('de-DE', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      }),
      'time': () => new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      'time.full': () => new Date().toLocaleTimeString('de-DE'),
      'datetime': () => new Date().toLocaleString('de-DE'),
      'timestamp': () => Date.now().toString(),
      'year': () => new Date().getFullYear().toString(),
      'month': () => (new Date().getMonth() + 1).toString().padStart(2, '0'),
      'day': () => new Date().getDate().toString().padStart(2, '0'),
      'weekday': () => new Date().toLocaleDateString('de-DE', { weekday: 'long' }),
      
      // User context
      'user.name': () => localStorage.getItem('ai_pm_username') || 'User',
      'user.email': () => localStorage.getItem('ai_pm_email') || '',
      'user.company': () => localStorage.getItem('ai_pm_company') || '',
      
      // Document metadata
      'doc.title': () => document.title || '',
      'doc.url': () => window.location.href || '',
      
      // Random generators
      'uuid': () => crypto.randomUUID(),
      'random.number': () => Math.floor(Math.random() * 1000000).toString(),
      'random.hex': () => Math.floor(Math.random() * 16777215).toString(16),
      
      // Clipboard (if available)
      'clipboard': async () => {
        try {
          return await navigator.clipboard.readText();
        } catch {
          return '';
        }
      }
    };
  }

  /**
   * Parse text and extract all variables
   */
  parse(text) {
    const regex = /\{\{([^}]+)\}\}/g;
    const found = new Set();
    let match;

    while ((match = regex.exec(text)) !== null) {
      const varName = match[1].trim();
      found.add(varName);
    }

    return Array.from(found);
  }

  /**
   * Detect variable type
   */
  detectType(varName) {
    if (varName.startsWith('date.') || varName === 'date' || varName === 'time' || 
        varName === 'datetime' || varName === 'timestamp') {
      return 'datetime';
    }
    if (varName.startsWith('user.')) return 'user';
    if (varName.startsWith('doc.')) return 'document';
    if (varName.startsWith('random.') || varName === 'uuid') return 'random';
    if (varName === 'clipboard') return 'clipboard';
    return 'custom';
  }

  /**
   * Check if variable is smart (built-in)
   */
  isSmart(varName) {
    return varName in this.smartVariables;
  }

  /**
   * Get variable value
   */
  async getValue(varName) {
    // Smart variable
    if (this.isSmart(varName)) {
      const fn = this.smartVariables[varName];
      return await fn();
    }

    // Custom variable
    return this.variables.get(varName) || '';
  }

  /**
   * Set custom variable
   */
  setValue(varName, value) {
    this.variables.set(varName, value);
  }

  /**
   * Delete custom variable
   */
  deleteVariable(varName) {
    this.variables.delete(varName);
  }

  /**
   * Clear all custom variables
   */
  clearAll() {
    this.variables.clear();
  }

  /**
   * Get all custom variables
   */
  getAllCustom() {
    return Array.from(this.variables.entries()).map(([name, value]) => ({
      name,
      value,
      type: this.detectType(name)
    }));
  }

  /**
   * Resolve all variables in text
   */
  async resolve(text, customValues = {}) {
    // Merge custom values
    const merged = new Map([...this.variables, ...Object.entries(customValues)]);
    
    let resolved = text;
    const variables = this.parse(text);

    for (const varName of variables) {
      let value;
      
      if (this.isSmart(varName)) {
        value = await this.getValue(varName);
      } else if (merged.has(varName)) {
        value = merged.get(varName);
      } else {
        value = `{{${varName}}}`; // Keep unresolved
      }

      const regex = new RegExp(`\\{\\{\\s*${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'g');
      resolved = resolved.replace(regex, value);
    }

    return resolved;
  }

  /**
   * Get unresolved variables
   */
  getUnresolved(text) {
    const all = this.parse(text);
    const unresolved = [];

    for (const varName of all) {
      if (!this.isSmart(varName) && !this.variables.has(varName)) {
        unresolved.push(varName);
      }
    }

    return unresolved;
  }

  /**
   * Validate variable name
   */
  validateName(varName) {
    const errors = [];
    
    if (!varName || varName.trim().length === 0) {
      errors.push('Variable name cannot be empty');
    }
    
    if (!/^[a-zA-Z_][a-zA-Z0-9_\.]*$/.test(varName)) {
      errors.push('Variable name must start with letter/underscore and contain only letters, numbers, dots, underscores');
    }
    
    if (varName.length > 100) {
      errors.push('Variable name too long (max 100 characters)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get autocomplete suggestions
   */
  getSuggestions(prefix = '') {
    const suggestions = [];
    
    // Smart variables
    Object.keys(this.smartVariables).forEach(name => {
      if (name.toLowerCase().includes(prefix.toLowerCase())) {
        suggestions.push({
          name,
          type: this.detectType(name),
          smart: true,
          description: this.getDescription(name)
        });
      }
    });
    
    // Custom variables
    this.variables.forEach((value, name) => {
      if (name.toLowerCase().includes(prefix.toLowerCase())) {
        suggestions.push({
          name,
          type: 'custom',
          smart: false,
          value: value.length > 50 ? value.substring(0, 50) + '...' : value
        });
      }
    });

    return suggestions.sort((a, b) => {
      if (a.smart && !b.smart) return -1;
      if (!a.smart && b.smart) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get variable description
   */
  getDescription(varName) {
    const descriptions = {
      'date': 'Current date (DD.MM.YYYY)',
      'date.iso': 'Current date (ISO: YYYY-MM-DD)',
      'date.us': 'Current date (US: MM/DD/YYYY)',
      'date.long': 'Current date (long format)',
      'time': 'Current time (HH:MM)',
      'time.full': 'Current time (HH:MM:SS)',
      'datetime': 'Current date and time',
      'timestamp': 'Unix timestamp',
      'year': 'Current year',
      'month': 'Current month (01-12)',
      'day': 'Current day (01-31)',
      'weekday': 'Current weekday name',
      'user.name': 'Your name',
      'user.email': 'Your email',
      'user.company': 'Your company',
      'doc.title': 'Document title',
      'doc.url': 'Current URL',
      'uuid': 'Generate UUID v4',
      'random.number': 'Random 6-digit number',
      'random.hex': 'Random hex color',
      'clipboard': 'Content from clipboard'
    };
    
    return descriptions[varName] || 'Custom variable';
  }

  /**
   * Export variables to JSON
   */
  exportToJSON() {
    return {
      variables: this.getAllCustom(),
      exported: new Date().toISOString()
    };
  }

  /**
   * Import variables from JSON
   */
  importFromJSON(data, mode = 'merge') {
    if (!data.variables || !Array.isArray(data.variables)) {
      throw new Error('Invalid variable data');
    }

    const stats = {
      added: 0,
      updated: 0,
      skipped: 0
    };

    if (mode === 'replace') {
      this.clearAll();
    }

    data.variables.forEach(({ name, value }) => {
      const validation = this.validateName(name);
      if (!validation.valid) {
        stats.skipped++;
        return;
      }

      if (mode === 'skip' && this.variables.has(name)) {
        stats.skipped++;
      } else {
        const existed = this.variables.has(name);
        this.setValue(name, value);
        
        if (existed) {
          stats.updated++;
        } else {
          stats.added++;
        }
      }
    });

    return stats;
  }

  /**
   * Create variable pack from current variables
   */
  createPack(name, description = '') {
    return {
      id: `pack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description.trim(),
      variables: this.getAllCustom(),
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = VariableEngine;
}