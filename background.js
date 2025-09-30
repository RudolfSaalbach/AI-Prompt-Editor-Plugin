// Background Service Worker - AI Prompt Manager
// Minimale Logik für WebExtension-Lifecycle

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[AI Prompt Manager] Extension installiert');
  }
  
  if (details.reason === 'update') {
    console.log('[AI Prompt Manager] Extension aktualisiert');
  }
});

console.log('[AI Prompt Manager] Service Worker geladen');