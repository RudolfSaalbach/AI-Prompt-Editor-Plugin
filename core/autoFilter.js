/**
 * Auto-Filter Manager für Slice 3
 * URL-basierte Profil-Erkennung und Filterung
 */

class AutoFilterManager {
  constructor() {
    this.enabled = false;
    this.currentUrl = '';
    this.detectedProfiles = [];
  }

  /**
   * Aktiviert/Deaktiviert Auto-Filter
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Prüft ob Auto-Filter aktiv ist
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Setzt aktuelle URL
   * @param {string} url
   */
  setCurrentUrl(url) {
    this.currentUrl = url;
    this.detectedProfiles = this.detectProfiles(url);
  }

  /**
   * Erkennt Profile basierend auf URL
   * @param {string} url
   * @returns {Array} Erkannte Profile-Namen
   */
  detectProfiles(url) {
    if (!url) return [];

    const profiles = [];
    const lowerUrl = url.toLowerCase();

    // Domain-basierte Erkennung
    const domainMap = {
      'github.com': 'GitHub',
      'gitlab.com': 'GitLab',
      'stackoverflow.com': 'StackOverflow',
      'reddit.com': 'Reddit',
      'twitter.com': 'Twitter',
      'x.com': 'Twitter',
      'linkedin.com': 'LinkedIn',
      'facebook.com': 'Facebook',
      'youtube.com': 'YouTube',
      'medium.com': 'Medium',
      'dev.to': 'Dev.to',
      'notion.so': 'Notion',
      'figma.com': 'Figma',
      'slack.com': 'Slack',
      'discord.com': 'Discord',
      'jira.atlassian': 'Jira',
      'trello.com': 'Trello',
      'asana.com': 'Asana',
      'monday.com': 'Monday',
      'airtable.com': 'Airtable'
    };

    // Prüfe jede Domain
    for (const [domain, profileName] of Object.entries(domainMap)) {
      if (lowerUrl.includes(domain)) {
        profiles.push(profileName);
      }
    }

    // Keyword-basierte Erkennung (fallback)
    const keywords = {
      'code': 'Coding',
      'docs': 'Documentation',
      'api': 'API',
      'blog': 'Blogging',
      'shop': 'E-Commerce',
      'mail': 'Email'
    };

    for (const [keyword, profileName] of Object.entries(keywords)) {
      if (lowerUrl.includes(keyword) && profiles.length === 0) {
        profiles.push(profileName);
      }
    }

    return profiles;
  }

  /**
   * Filtert Prompts basierend auf erkannten Profilen
   * @param {Array} prompts - Alle Prompts
   * @param {Array} allTags - Alle Tags (inkl. Profile)
   * @returns {Array} Gefilterte Prompts
   */
  filterPrompts(prompts, allTags) {
    if (!this.enabled || this.detectedProfiles.length === 0) {
      return prompts;
    }

    // Finde Profile-Tag-IDs für erkannte Profile
    const profileTagIds = allTags
      .filter(tag => 
        tag.isProfile && 
        this.detectedProfiles.includes(tag.name)
      )
      .map(tag => tag.id);

    if (profileTagIds.length === 0) {
      return prompts;
    }

    // Filtere Prompts die mindestens ein erkanntes Profil haben
    return prompts.filter(prompt => 
      prompt.tagIds.some(tagId => profileTagIds.includes(tagId))
    );
  }

  /**
   * Gibt erkannte Profile zurück
   * @returns {Array} Array von Profil-Namen
   */
  getDetectedProfiles() {
    return this.detectedProfiles;
  }

  /**
   * Matched Profile mit vorhandenen Tags
   * @param {Array} allTags - Alle Tags
   * @returns {Array} Matched Profile-Tags
   */
  getMatchedProfileTags(allTags) {
    const profileTags = allTags.filter(tag => tag.isProfile);
    
    return profileTags.filter(tag => 
      this.detectedProfiles.includes(tag.name)
    );
  }

  /**
   * Holt aktuelle URL vom aktiven Tab
   * @returns {Promise<string>}
   */
  static async getCurrentTabUrl() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab ? tab.url : '';
    } catch (error) {
      console.error('Fehler beim Abrufen der Tab-URL:', error);
      return '';
    }
  }

  /**
   * Erstellt Auto-Filter Statistik
   * @param {Array} allPrompts - Alle Prompts
   * @param {Array} filteredPrompts - Gefilterte Prompts
   * @returns {Object} Statistik
   */
  getFilterStats(allPrompts, filteredPrompts) {
    return {
      total: allPrompts.length,
      filtered: filteredPrompts.length,
      hidden: allPrompts.length - filteredPrompts.length,
      profiles: this.detectedProfiles,
      enabled: this.enabled
    };
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AutoFilterManager;
}