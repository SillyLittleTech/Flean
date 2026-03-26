// eslint.config.js — ESLint v9+ flat config
// Mirrors .eslintrc.json for local development; DeepSource still reads .eslintrc.json.
import globals from 'globals';

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        browser: 'readonly'
      }
    },
    rules: {
      'no-console': 'off'
    }
  }
];
