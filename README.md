![icon128.png](C:\Protected_Out\Shared\Neuer%20Ordner\ai-prompt-manager\assets\icon128.png)  

## ✨ AI Prompt Manager

**A professional, feature-rich browser extension for managing, composing, and rapidly deploying your most valuable AI prompts. Elevate your interaction with AI assistants to a new level of efficiency and creativity.**

[](https://github.com/your-username/ai-prompt-manager)
[](LICENSE)
[](https://github.com/your-username/ai-prompt-manager/graphs/commit-activity)

---

AI Prompt Manager is a powerful browser tool designed to revolutionize your workflow with AI assistants like Claude, ChatGPT, Gemini, and more. Say goodbye to scattered notes and endless searching for the right prompt. This extension provides a centralized, highly organized library for all your prompting needs, directly within your browser.

It's built for prompt engineers, developers, writers, marketers, and anyone who relies on AI for their daily tasks. From simple prompt storage to a sophisticated multi-part composition canvas, this tool has you covered.

---

## ✨ Core Features

This extension is packed with features designed for a professional and efficient workflow.

* **🗂️ Centralized Prompt Library:**
  
  * Create, edit, and manage all your prompts in a single, easily accessible interface.
  * Each prompt includes a title, a detailed description, and the main content.
  * All data is stored locally and securely in your browser's storage.

* **🏷️ Advanced Organization:**
  
  * **Categories:** Assign prompts to color-coded **Categories** (e.g., "Development," "Marketing," "Creative Writing") for high-level organization.
  * **Tags:** Add multiple **Tags** to each prompt for granular, flexible filtering (e.g., "JavaScript," "SEO," "Code Review").

* **🔮 Intelligent Auto-Filtering with Profiles:**
  
  * **AI Profiles:** Comes pre-configured with profiles for major AI platforms like **Claude, ChatGPT, Gemini, Copilot, Perplexity**, and more.
  * **Context-Aware Filtering:** The extension can automatically detect the website you are on (e.g., `claude.ai`, `chat.openai.com`) and suggest the most relevant prompts associated with that platform's profile.

* **📝 Powerful Canvas Editor:**
  
  * **Megaprompt Composition:** Build complex, multi-part prompts ("Megaprompts") in the "Canvas" view.
  * **Modular Parts:** Add prompts from your library, framework templates, or free-form text as individual "parts."
  * **Drag & Drop:** Easily reorder parts via drag & drop to structure the perfect prompt flow.
  * **Live Stats:** Get real-time statistics on your composed prompt, including character, word, and estimated token counts.

* **🏗️ Built-in Framework Templates:**
  
  * Jumpstart your prompt engineering with proven frameworks.
  * **CRISE:** Context, Role, Instruction, Samples, Evaluation.
  * **CRAFT:** Cut, Reframe, Add detail, Format, Test.
  * **TAG:** Task, Audience, Goal.
  * Simply fill in the variables, and the extension generates a perfectly structured, high-quality prompt.

* **💾 Drafts & Persistence:**
  
  * **Save Your Work:** Save your Canvas compositions as named **Drafts**.
  * **Load & Iterate:** Easily load, duplicate, or delete drafts to continue your work later or create new variations.

* **🔄 Robust Data Management:**
  
  * **Full Export/Import:** Export your entire library (prompts, tags, categories, drafts) to a single JSON file for backup or migration.
  * **Smart Import:** Choose your import strategy: merge with existing data, overwrite duplicates, or replace the entire library.
  * **Automatic Backups:** The extension automatically saves the last 5 backups, giving you peace of mind.

* **⚡ Workflow Enhancements:**
  
  * **Bulk Operations:** Select multiple prompts to delete, assign to a category, or tag all at once.
  * **Quick Copy:** Instantly copy any prompt's content to the clipboard with a single click.
  * **Keyboard Shortcuts:** Navigate the interface and perform key actions like focusing the search bar or closing modals using keyboard shortcuts (`?` to view all).
  * **Content Script Injection:** Seamlessly injects the composed prompt into the active chat window on supported sites like `claude.ai`.

* **🎨 Modern & Clean UI:**
  
  * A visually appealing, intuitive, and responsive user interface designed for clarity and efficiency.

---

## 🛠️ Installation



**Quick Start (Chrome):**

1. Download and unzip the project repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click **"Load unpacked"** and select the `ai-prompt-manager/` project folder.
5. The AI Prompt Manager icon will appear in your browser's toolbar.

---

## 🚀 Getting Started

1. **Create a Category:** Click the "Categories" tab and create your first category, like "Coding," with a custom color.
2. **Create a Tag:** Go to the "Tags" tab and create a relevant tag, such as "Python" or "Copywriting."
3. **Create your First Prompt:** Navigate to the "Prompts" tab, click "+ New Prompt," fill in the details, and assign your newly created category and tag.
4. **Build a Megaprompt:** Switch to the "Canvas" tab. Click "Add Part" to add your saved prompts or a framework template.
5. **Save your Draft:** Once you've composed a prompt in the Canvas, click "Save" to store it as a reusable draft.
6. **Copy & Use:** Click the "Copy to Clipboard" button and paste the final, composed prompt directly into your AI assistant's chat interface.

---

## 💻 Technology Stack

* **Core:** Built with **Vanilla JavaScript (ES6+)**, HTML5, and CSS3 for maximum performance and zero external dependencies.
* **Browser APIs:** Leverages modern WebExtension APIs, including `chrome.storage` for reliable local data persistence and `chrome.scripting` for seamless page interaction.
* **Architecture:** A clean, modular, and object-oriented architecture. Logic is separated into distinct managers (`StorageManager`, `TemplateManager`, `MegadraftManager`, etc.) for maintainability and scalability.
* **Manifest:** Uses **Manifest V3**, ensuring compliance with the latest browser extension standards for security and performance.

---

## 🤝 Contributing

Contributions are welcome! If you have ideas for new features, have found a bug, or want to improve the code, please feel free to open an issue or submit a pull request.

---

## 📄 License

This project is licensed under the **MIT License**. See the `LICENSE` file for more details.
