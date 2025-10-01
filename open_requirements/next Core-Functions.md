Absolut. Basierend auf deiner finalen Auswahl habe ich die Ideen in einen professionellen und klaren Anforderungskatalog überführt. Dieses Dokument kann als direkte Vorlage für die Entwicklung dienen.

---

### **Anforderungskatalog: Promptmanager Core-Funktionen**

Version: 1.0

Datum: 01.10.2025

Dieses Dokument beschreibt die funktionalen Anforderungen für die Kernfunktionen eines lokalen Promptmanagement-Tools. Die priorisierten Funktionen zielen auf maximale Benutzerfreundlichkeit und Effizienz bei minimalem initialem Entwicklungsaufwand ab.

---

### **F01: Favoriten-Management**

- **1.1. User Story:** Als regelmäßiger Nutzer möchte ich meine wichtigsten Prompts als Favoriten markieren können, damit ich sie in einer gesonderten Ansicht jederzeit schnell und ohne Suche finde.

- **1.2. Funktionale Anforderungen:**
  
  - **FR-1.2.1 (Markierung):** Jeder Prompt in der Hauptlistenansicht muss über ein klickbares Steuerelement (z. B. ein Stern-Icon) verfügen, um seinen Favoritenstatus umzuschalten (An/Aus).
  
  - **FR-1.2.2 (Persistenz):** Der Favoritenstatus eines Prompts muss dauerhaft gespeichert werden und über Anwendungsneustarts hinweg bestehen bleiben.
  
  - **FR-1.2.3 (Dedizierte Ansicht):** Die Benutzeroberfläche muss einen klar erkennbaren Navigationspunkt (z. B. einen Menüeintrag oder einen Filter-Button "Favoriten") bereitstellen.
  
  - **FR-1.2.4 (Filterung):** Bei Aktivierung der Favoriten-Ansicht darf die Liste ausschließlich Prompts enthalten, die als Favorit markiert sind.

- **1.3. Akzeptanzkriterien:**
  
  - ✅ Ein Klick auf das Favoriten-Icon ändert dessen visuellen Zustand (z. B. gefüllt/leer).
  
  - ✅ Die Favoriten-Ansicht aktualisiert sich sofort, wenn ein Prompt hinzugefügt oder entfernt wird.
  
  - ✅ Nach einem Neustart der Anwendung ist der Favoritenstatus aller Prompts korrekt wiederhergestellt.

---

### **F02: Visuelle Anpassung der Benutzeroberfläche**

- **2.1. User Story:** Als Nutzer möchte ich das Erscheinungsbild der Anwendung an meine Vorlieben und meine Arbeitsumgebung anpassen können, um die Ergonomie zu verbessern und die Augenbelastung zu reduzieren.

- **2.2. Funktionale Anforderungen:**
  
  - **FR-2.2.1 (Theme-Auswahl):** Die Anwendung muss in den Einstellungen eine Option bieten, um zwischen einem hellen (Light Mode) und einem dunklen (Dark Mode) Anzeigemodus zu wechseln.
  
  - **FR-2.2.2 (Globale Anwendung):** Die Theme-Auswahl muss sich konsistent auf alle Elemente der Benutzeroberfläche auswirken (Hintergründe, Schriftfarben, Steuerelemente etc.).
  
  - **FR-2.2.3 (Persistenz des Themes):** Die gewählte Theme-Einstellung muss gespeichert und beim nächsten Start der Anwendung automatisch geladen werden.
  
  - **FR-2.2.4 (Anpassbare Spalten):** Die Anwendung muss dem Nutzer ermöglichen, die Sichtbarkeit der Spalten in der Hauptlistenansicht (z. B. über ein Kontextmenü oder eine Einstellungs-Checkbox) individuell zu konfigurieren.
  
  - **FR-2.2.5 (Persistenz der Spalten):** Die Konfiguration der sichtbaren Spalten muss gespeichert und bei Neustarts wiederhergestellt werden.

- **2.3. Akzeptanzkriterien:**
  
  - ✅ Das Umschalten des Themes aktualisiert die gesamte UI ohne Verzögerung und ohne Neustart.
  
  - ✅ In beiden Themes sind alle Texte und Bedienelemente klar lesbar und unterscheidbar.
  
  - ✅ Das Ausblenden einer Spalte entfernt diese sofort aus der Ansicht; das Einblenden fügt sie wieder hinzu.
  
  - ✅ Die beim Schließen der App aktive Theme- und Spaltenkonfiguration ist beim nächsten Start wieder aktiv.

---

### **F03: Dynamische Prompts mit Platzhaltern**

- **3.1. User Story:** Als Power-User möchte ich Prompt-Vorlagen mit variablen Teilen erstellen, damit ich schnell kontextspezifische Prompts generieren kann, ohne jedes Mal den gesamten Text manuell anpassen zu müssen.

- **3.2. Funktionale Anforderungen:**
  
  - **FR-3.2.1 (Platzhalter-Erkennung):** Das System muss Text-Platzhalter anhand der Syntax `{{platzhalter_name}}` im Prompt-Text identifizieren.
  
  - **FR-3.2.2 (Modale Eingabemaske):** Wenn der Kopiervorgang für einen Prompt mit mindestens einem Platzhalter gestartet wird, muss eine modale Eingabemaske (Dialogfenster) erscheinen. Der direkte Kopiervorgang wird unterbrochen.
  
  - **FR-3.2.3 (Dynamische Formulargenerierung):** Die Eingabemaske muss für jeden einzigartigen Platzhalter ein entsprechendes Eingabefeld dynamisch generieren. Der Name des Platzhalters (`platzhalter_name`) dient als Beschriftung (Label) für das Feld.
  
  - **FR-3.2.4 (Erweiterte Syntax für Auswahllisten):** Das System muss zusätzlich eine erweiterte Syntax für vordefinierte Optionen erkennen: `{{label:OptionA|OptionB|OptionC}}`.
  
  - **FR-3.2.5 (Generierung von Dropdown-Menüs):** Wird ein Platzhalter mit der erweiterten Syntax erkannt, muss in der Eingabemaske anstelle eines freien Textfeldes ein Dropdown-Menü mit den definierten Optionen (`OptionA`, `OptionB` etc.) angezeigt werden.
  
  - **FR-3.2.6 (Rendering & Kopieren):** Nach Bestätigung der Eingabemaske durch den Nutzer ersetzt das System alle Platzhalter im ursprünglichen Prompt-Text mit den eingegebenen bzw. ausgewählten Werten und kopiert erst dann das finale Ergebnis in die Zwischenablage.

- **3.3. Akzeptanzkriterien:**
  
  - ✅ Ein Prompt ohne Platzhalter wird wie gewohnt sofort und ohne Dialog kopiert.
  
  - ✅ Für den Text `Antworte auf {{frage}} im Ton {{stil:freundlich|formell}}` erscheint ein Dialog mit einem Textfeld "frage" und einem Dropdown "stil".
  
  - ✅ Wenn der Nutzer "Was ist KI?" eingibt und "formell" auswählt, wird exakt "Antworte auf Was ist KI? im Ton formell" in die Zwischenablage kopiert.
  
  - ✅ Die Eingabemaske ist blockierend, d.h. der Kopiervorgang wird erst nach Bestätigung oder Abbruch des Dialogs abgeschlossen.
