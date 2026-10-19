import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['**/dist', '**/.output', '**/.nitro', '**/.wrangler', '**/node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      // standard z briefu: brak any i console.log
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
      // zmienne z prefiksem _ są celowo nieużywane (np. przy destrukturyzacji)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['api/**/*.ts'],
    languageOptions: { globals: globals.worker },
  },
  prettier,
)
