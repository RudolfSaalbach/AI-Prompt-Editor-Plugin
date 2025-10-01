/**
 * Default AI Profiles
 */

class DefaultProfiles {
  static PROFILES = [
    {
      id: 'profile_claude',
      name: 'Claude',
      color: '#D4A574',
      isProfile: true,
      isDefault: true,
      matchers: ['claude.ai', 'anthropic.com'],
      description: 'Anthropic Claude AI Assistant'
    },
    {
      id: 'profile_chatgpt',
      name: 'ChatGPT',
      color: '#10A37F',
      isProfile: true,
      isDefault: true,
      matchers: ['chat.openai.com', 'chatgpt.com'],
      description: 'OpenAI ChatGPT'
    },
    {
      id: 'profile_gemini',
      name: 'Gemini',
      color: '#4285F4',
      isProfile: true,
      isDefault: true,
      matchers: ['gemini.google.com', 'bard.google.com'],
      description: 'Google Gemini AI'
    },
    {
      id: 'profile_kimi',
      name: 'Kimi',
      color: '#FF6B35',
      isProfile: true,
      isDefault: true,
      matchers: ['kimi.ai', 'kimi.moonshot.cn'],
      description: 'Moonshot AI Kimi'
    },
    {
      id: 'profile_deepseek',
      name: 'DeepSeek',
      color: '#6B4CE6',
      isProfile: true,
      isDefault: true,
      matchers: ['deepseek.com', 'chat.deepseek.com'],
      description: 'DeepSeek AI'
    },
    {
      id: 'profile_copilot',
      name: 'Copilot',
      color: '#0078D4',
      isProfile: true,
      isDefault: true,
      matchers: ['copilot.microsoft.com', 'bing.com/chat'],
      description: 'Microsoft Copilot'
    },
    {
      id: 'profile_perplexity',
      name: 'Perplexity',
      color: '#20808D',
      isProfile: true,
      isDefault: true,
      matchers: ['perplexity.ai'],
      description: 'Perplexity AI Search'
    }
  ];

  static getAll() {
    return this.PROFILES.map(profile => ({
      ...profile,
      created: new Date().toISOString()
    }));
  }

  static findByUrl(url) {
    if (!url) return null;
    const lowerUrl = url.toLowerCase();
    return this.PROFILES.find(profile =>
      profile.matchers.some(matcher => lowerUrl.includes(matcher))
    );
  }

  static isDefault(profileId) {
    return this.PROFILES.some(p => p.id === profileId);
  }

  static mergeWithUserProfiles(userTags) {
    const existingNames = new Set(
      userTags
        .filter(tag => tag.isProfile)
        .map(tag => tag.name.toLowerCase())
    );

    const newDefaults = this.getAll()
      .filter(profile => !existingNames.has(profile.name.toLowerCase()))
      .map(profile => ({
        id: DataModel.generateId('tag'),
        name: profile.name,
        color: profile.color,
        isProfile: true,
        isDefault: true,
        matchers: profile.matchers,
        description: profile.description,
        created: new Date().toISOString()
      }));

    return [...userTags, ...newDefaults];
  }

  static getProfileInfo(profileId) {
    const profile = this.PROFILES.find(p => p.id === profileId);
    
    if (!profile) return null;

    return {
      name: profile.name,
      color: profile.color,
      description: profile.description,
      platforms: profile.matchers.join(', ')
    };
  }

  static matchAll(url) {
    if (!url) return [];
    const lowerUrl = url.toLowerCase();
    return this.PROFILES.filter(profile =>
      profile.matchers.some(matcher => lowerUrl.includes(matcher))
    );
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefaultProfiles;
}