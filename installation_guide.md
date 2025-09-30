# Installation & Setup Guide

## Schritt-für-Schritt Anleitung

### Voraussetzungen

- Chrome 88+ oder Firefox 109+
- Grundlegende Kenntnisse im Umgang mit Browser-Extensions

---

## 📦 Dateien vorbereiten

### 1. Projektstruktur erstellen

Erstellen Sie folgende Ordnerstruktur:

```
ai-prompt-manager/
├── manifest.json
├── background.js
├── README.md
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/
│   ├── content.js
│   └── content.css
├── core/
│   ├── dataModel.js
│   ├── storage.js
│   └── megaprompt.js
└── assets/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### 2. Code-Dateien kopieren

**WICHTIG für popup.js:**
Die Datei popup.js wurde in 2 Teilen bereitgestellt. Diese müssen kombiniert werden:

1. Öffnen Sie eine neue Datei `popup/popup.js`
2. Kopieren Sie **popup.js (Teil 1/2)** komplett hinein
3. **ENTFERNEN** Sie die letzte Zeile aus Teil 1: `function renderTagSelector(`
4. Kopieren Sie **popup.js (Teil 2/2)** direkt darunter
5. Speichern Sie die Datei

**Alternativ:** Beide Teile manuell zusammenführen, sodass die Funktion `renderTagSelector()` nur einmal vorkommt.

### 3. Icons erstellen

Da keine Icons mitgeliefert wurden, erstellen Sie Platzhalter:

**Option A: Online-Tool verwenden**
- https://www.favicon-generator.org/
- Upload ein einfaches Logo/Bild
- Download 16x16, 48x48, 128x128 PNG

**Option B: Professionelle Icons**
- https://www.flaticon.com (kostenlos mit Namensnennung)
- https://fontawesome.com
- https://icons8.com

**Option C: Temporäre Platzhalter**
Erstellen Sie einfarbige PNG-Dateien in den erforderlichen Größen.

---

## 🔧 Installation in Chrome

### Schritt 1: Entwicklermodus aktivieren

1. Öffnen Sie Chrome
2. Navigieren Sie zu `chrome://extensions/`
3. Aktivieren Sie oben rechts den **Entwicklermodus** (Toggle-Switch)

### Schritt 2: Extension laden

1. Klicken Sie auf **"Entpackte Erweiterung laden"**
2. Navigieren Sie zum `ai-prompt-manager/` Ordner
3. Wählen Sie den Ordner aus und klicken Sie auf **"Ordner auswählen"**

### Schritt 3: Verifizierung

1. Die Extension sollte nun in der Liste erscheinen
2. Prüfen Sie auf Fehler (rote Fehlermeldungen)
3. Falls Fehler auftreten: Console öffnen und Fehler beheben

### Schritt 4: Extension testen

1. Klicken Sie auf das Extension-Icon (Puzzle-Symbol oben rechts)
2. Pinnen Sie "AI Prompt Manager" für schnellen Zugriff
3. Klicken Sie auf das Icon → Popup sollte sich öffnen

---

## 🦊 Installation in Firefox

### Schritt 1: Debugging-Seite öffnen

1. Öffnen Sie Firefox
2. Navigieren Sie zu `about:debugging#/runtime/this-firefox`

### Schritt 2: Temporäres Add-on laden

1. Klicken Sie auf **"Temporäres Add-on laden..."**
2. Navigieren Sie zum `ai-prompt-manager/` Ordner
3. Wählen Sie die Datei **manifest.json** aus
4. Klicken Sie auf **"Öffnen"**

### Schritt 3: Verifizierung

1. Das Add-on sollte in der Liste erscheinen
2. Prüfen Sie auf Warnungen oder Fehler
3. Die Browser-Console zeigt eventuelle Probleme

### Schritt 4: Extension testen

1. Das Extension-Icon erscheint in der Toolbar
2. Klicken Sie darauf → Popup sollte sich öffnen

**HINWEIS:** Temporäre Add-ons werden beim Firefox-Neustart entfernt. Für dauerhafte Installation siehe "Production Build".

---

## 🐛 Fehlersuche

### Extension wird nicht geladen

**Chrome:**
```
Fehler: "Manifest file is missing or unreadable"
→ Prüfen Sie, ob manifest.json im Root-Ordner liegt
→ Prüfen Sie JSON-Syntax mit https://jsonlint.com/
```

**Firefox:**
```
Fehler: "There was an error during installation"
→ Browser-Console öffnen (F12)
→ Fehlermeldung lesen und beheben
```

### Icons fehlen

```
Warnung: "Could not load icon 'assets/icon16.png'"
→ Erstellen Sie Platzhalter-Icons
→ Oder kommentieren Sie die Icon-Zeilen im manifest.json aus
```

### Popup öffnet sich nicht

1. Rechtsklick auf Extension-Icon → "Untersuchen"
2. Console auf JavaScript-Fehler prüfen
3. Häufige Ursache: Syntaxfehler in popup.js

### Content Script funktioniert nicht

1. Öffnen Sie https://claude.ai
2. F12 → Console
3. Suchen Sie nach "[AI Prompt Manager] Content Script geladen"
4. Falls nicht vorhanden: manifest.json prüfen

---

## ✅ Verifizierungs-Checkliste

Nach erfolgreicher Installation:

- [ ] Extension erscheint in Browser-Toolbar
- [ ] Popup öffnet sich beim Klick
- [ ] Alle Tabs sind sichtbar (Prompts, Kategorien, Tags, Megaprompt)
- [ ] "+ Neuer Prompt" Button funktioniert
- [ ] Modal öffnet sich
- [ ] Daten werden gespeichert (Test: Prompt erstellen, Browser neu laden)
- [ ] claude.ai öffnen → Content Script lädt
- [ ] Megaprompt einfügen funktioniert

---

## 🔄 Extension aktualisieren

### Entwicklungsmodus

**Chrome:**
1. `chrome://extensions/`
2. Klicken Sie auf das Refresh-Icon bei Ihrer Extension

**Firefox:**
1. `about:debugging`
2. Klicken Sie auf "Neu laden" bei Ihrem Add-on

### Nach Code-Änderungen

1. Änderungen an Dateien speichern
2. Extension neu laden (siehe oben)
3. **Wichtig:** Bei popup.html/css/js: Popup schließen und neu öffnen
4. **Wichtig:** Bei content.js: Webseite neu laden

---

## 📊 Storage überprüfen

### Gespeicherte Daten anzeigen

**Chrome DevTools:**
```javascript
// In Popup → F12 → Console
chrome.storage.local.get('aiPromptManager_data', data => {
  console.log(JSON.stringify(data, null, 2));
});
```

**Firefox DevTools:**
```javascript
// In Popup → F12 → Console
browser.storage.local.get('aiPromptManager_data').then(data => {
  console.log(JSON.stringify(data, null, 2));
});
```

### Storage löschen (Reset)

```javascript
// ACHTUNG: Löscht alle gespeicherten Prompts!
chrome.storage.local.remove('aiPromptManager_data', () => {
  console.log('Storage gelöscht');
});
```

---

## 🚀 Production Build (Optional)

Für die Veröffentlichung im Chrome Web Store oder Firefox Add-ons:

### 1. Code optimieren

- Kommentare entfernen (optional)
- CSS/JS minifizieren (optional)
- Icons in professioneller Qualität

### 2. Zip-Archiv erstellen

**Linux/Mac:**
```bash
cd ai-prompt-manager/
zip -r ai-prompt-manager-v1.0.0.zip . -x "*.git*" "*.DS_Store" "node_modules/*"
```

**Windows:**
- Rechtsklick auf Ordner
- "Senden an" → "ZIP-komprimierter Ordner"

### 3. Hochladen

**Chrome Web Store:**
- https://chrome.google.com/webstore/devconsole/
- Einmalige Gebühr: $5
- Review-Prozess: 1-3 Tage

**Firefox Add-ons:**
- https://addons.mozilla.org/developers/
- Kostenlos
- Review-Prozess: 1-7 Tage

---

## 🔒 Sicherheitshinweise

### Berechtigungen

Die Extension benötigt:
- `storage`: Lokale Datenspeicherung
- `activeTab`: Zugriff auf aktuellen Tab
- `scripting`: Content Script Injection
- `claude.ai`: DOM-Zugriff für Einfüge-Funktion

### Datenschutz

- ✅ Alle Daten bleiben lokal im Browser
- ✅ Keine externe Kommunikation
- ✅ Keine Analytik/Tracking
- ✅ Open Source Code

---

## 📝 Erste Schritte nach Installation

### 1. Kategorie erstellen

1. Öffnen Sie die Extension
2. Tab "Kategorien" → "+ Neue Kategorie"
3. Erstellen Sie z.B. "Entwicklung" (blau) und "Marketing" (grün)

### 2. Tags erstellen

1. Tab "Tags" → "+ Neuer Tag"
2. Erstellen Sie z.B. "Code-Review", "Copywriting", "Research"

### 3. Ersten Prompt erstellen

1. Tab "Prompts" → "+ Neuer Prompt"
2. Titel: "Senior Code Reviewer"
3. Inhalt: "Du bist ein erfahrener Senior-Entwickler..."
4. Kategorie: "Entwicklung"
5. Tags: "Code-Review"
6. Speichern

### 4. Megaprompt testen

1. Erstellen Sie 2-3 Prompts
2. Tab "Megaprompt"
3. Wählen Sie mehrere Prompts aus
4. Klicken Sie "In Zwischenablage"
5. Öffnen Sie claude.ai und fügen Sie ein (Ctrl+V)

---

## 🆘 Support

Bei Problemen:

1. **README.md** durchlesen
2. **Browser-Console** auf Fehler prüfen
3. **GitHub Issues** erstellen (falls Repository verfügbar)
4. **Community** fragen

---

## ✨ Fertig!

Die Extension ist jetzt einsatzbereit.

**Viel Erfolg beim Prompten! 🚀**