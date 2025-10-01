/**
 * Template Manager - Framework templates with variable substitution
 */

class TemplateManager {
  static FRAMEWORKS = {
    CRISE: {
      id: 'framework_crise',
      name: 'CRISE Framework',
      description: 'Context, Role, Instruction, Samples, Evaluation',
      variables: [
        { name: 'context', description: 'Background information', required: true },
        { name: 'role', description: 'AI role/persona', required: true },
        { name: 'instruction', description: 'Main task', required: true },
        { name: 'samples', description: 'Example inputs/outputs', required: false },
        { name: 'evaluation', description: 'Success criteria', required: false }
      ],
      template: `## Context
{{context}}

## Role
You are {{role}}.

## Instruction
{{instruction}}

{{#if samples}}
## Samples
{{samples}}
{{/if}}

{{#if evaluation}}
## Evaluation Criteria
{{evaluation}}
{{/if}}`
    },

    CRAFT: {
      id: 'framework_craft',
      name: 'CRAFT Framework',
      description: 'Cut, Reframe, Add detail, Format, Test',
      variables: [
        { name: 'cut', description: 'Remove unnecessary elements', required: false },
        { name: 'reframe', description: 'Restate the problem', required: true },
        { name: 'detail', description: 'Additional context', required: true },
        { name: 'format', description: 'Output format requirements', required: true },
        { name: 'test', description: 'Quality checks', required: false }
      ],
      template: `{{#if cut}}
## Step 1: Cut
{{cut}}

{{/if}}
## Step 2: Reframe
{{reframe}}

## Step 3: Add Detail
{{detail}}

## Step 4: Format
Deliver the output in this format:
{{format}}

{{#if test}}
## Step 5: Test
{{test}}
{{/if}}`
    },

    TAG: {
      id: 'framework_tag',
      name: 'TAG Framework',
      description: 'Task, Audience, Goal',
      variables: [
        { name: 'task', description: 'What needs to be done', required: true },
        { name: 'audience', description: 'Who is the target audience', required: true },
        { name: 'goal', description: 'Desired outcome', required: true }
      ],
      template: `## Task
{{task}}

## Audience
This is intended for: {{audience}}

## Goal
The desired outcome is: {{goal}}`
    }
  };

  static parseVariables(template) {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables = new Set();
    let match;

    while ((match = regex.exec(template)) !== null) {
      const varName = match[1].trim();
      if (!varName.startsWith('#') && !varName.startsWith('/')) {
        variables.add(varName);
      }
    }

    return Array.from(variables);
  }

  static resolveTemplate(template, values = {}) {
    let resolved = template;

    const conditionalRegex = /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    resolved = resolved.replace(conditionalRegex, (match, varName, content) => {
      return values[varName] ? content : '';
    });

    const varRegex = /\{\{(\w+)\}\}/g;
    resolved = resolved.replace(varRegex, (match, varName) => {
      return values[varName] || match;
    });

    return resolved.trim();
  }

  static getUnresolvedVariables(template, values = {}) {
    const allVars = this.parseVariables(template);
    return allVars.filter(varName => !values[varName]);
  }

  static validateVariables(variables, values = {}) {
    const required = variables.filter(v => v.required);
    const missing = required.filter(v => !values[v.name]);

    return {
      valid: missing.length === 0,
      missing: missing.map(v => v.name)
    };
  }

  static createFromFramework(frameworkKey, customValues = {}) {
    const framework = this.FRAMEWORKS[frameworkKey];
    if (!framework) {
      throw new Error(`Unknown framework: ${frameworkKey}`);
    }

    return {
      id: DataModel.generateId('template'),
      frameworkId: framework.id,
      name: framework.name,
      description: framework.description,
      variables: framework.variables,
      template: framework.template,
      values: customValues,
      created: new Date().toISOString()
    };
  }

  static getPreview(templateInstance) {
    return this.resolveTemplate(
      templateInstance.template,
      templateInstance.values
    );
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TemplateManager;
}