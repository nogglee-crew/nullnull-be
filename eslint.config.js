const js = require('@eslint/js');
const globals = require('globals');
const tseslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');

module.exports = tseslint.config(
    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/coverage/**',
            '**/.next/**',
            '**/.turbo/**',
            '**/.cache/**',
            '**/.vercel/**',
            '**/generated/**',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    prettier,
    {
        files: ['**/*.{js,cjs,mjs,ts,cts,mts}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'no-console': 'off',
        },
    },
    {
        files: ['**/*.{js,cjs,mjs}'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
    {
        files: ['**/*.{ts,cts,mts}'],
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'warn',
                {
                    prefer: 'type-imports',
                    fixStyle: 'inline-type-imports',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    {
        files: ['**/*.md/*.js', '**/*.md/*.ts'],
        rules: {
            'no-undef': 'off',
        },
    },
);
