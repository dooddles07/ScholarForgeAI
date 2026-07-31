import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// Layer boundaries from docs/03-ARCHITECTURE/PROJECT-STRUCTURE.md. A boundary that is only
// documented is a boundary that will be crossed, so it is a lint error here.
const forbid = (patterns) => ({
  'no-restricted-imports': ['error', { patterns }],
});

const deny = (layer, why) => ({
  group: [`@/${layer}/*`, `**/${layer}/*`],
  message: why,
});

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: forbid([
      deny('parsing', 'UI cannot reach infrastructure directly. Go through a hook.'),
      deny('persistence', 'UI cannot reach storage directly. Go through a hook.'),
      deny('ai', 'UI cannot call the network directly. Go through a hook.'),
    ]),
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: forbid([
      deny('ui', 'The domain layer is pure logic. No React.'),
      deny('parsing', 'The domain layer has no I/O.'),
      deny('persistence', 'The domain layer has no I/O.'),
      deny('ai', 'The domain layer has no I/O.'),
      deny('hooks', 'The domain layer has no React.'),
      { group: ['react', 'react-dom'], message: 'The domain layer is pure logic. No React.' },
    ]),
  },
  {
    files: ['src/parsing/**/*.ts'],
    rules: forbid([
      deny('ui', 'Parsing knows nothing about the interface.'),
      deny('persistence', 'Parsing does not store. It returns.'),
      deny('ai', 'Parsing runs locally and never calls out.'),
    ]),
  },
  {
    files: ['src/persistence/**/*.ts'],
    rules: forbid([
      deny('ui', 'Storage knows nothing about the interface.'),
      deny('parsing', 'Storage does not parse.'),
      deny('ai', 'Storage does not call out.'),
    ]),
  },
  {
    files: ['src/ai/**/*.ts'],
    rules: forbid([
      deny('ui', 'The AI layer knows nothing about the interface.'),
      deny('parsing', 'The AI layer does not parse files.'),
      deny('persistence', 'The AI layer does not store.'),
    ]),
  },
  /* The boundaries above govern what ships. A test asserting that a control actually persisted
     has to read the database to do it, and routing that through a hook would test the hook
     instead of the component. */
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
);
