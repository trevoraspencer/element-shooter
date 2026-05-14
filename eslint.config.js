import js from '@eslint/js';
import globals from 'globals';
import unicornPlugin from 'eslint-plugin-unicorn';

export default [
    // Base recommended rules
    js.configs.recommended,

    // Register the unicorn plugin so its rules are available
    {
        plugins: {
            unicorn: unicornPlugin,
        },
    },

    // Source files in js/ — vanilla browser scripts (no modules)
    {
        files: ['js/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                // CDN-loaded Matter.js (v0.20.0)
                Matter: 'readonly',
            },
        },
        rules: {
            // Scripts share global scope via <script> tags — cross-file references
            // are resolved at runtime, so no-undef is not useful here.
            'no-undef': 'off',

            // Top-level declarations are "exports" consumed by other scripts;
            // warn-only keeps the signal without breaking the build.
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'off',

            // --- Naming conventions ---
            // camelCase for functions, variables, and object properties.
            // Constants use UPPER_SNAKE_CASE (handled by allowList for
            // top-level declarations that are consumed by other scripts).
            camelcase: [
                'warn',
                {
                    properties: 'always',
                    ignoreDestructuring: true,
                    allow: ['^UNICODE_', '^EPSILON_', '^phase_'],
                },
            ],

            // File naming — kebab-case matches existing files
            // (element-entity.js, elements-data.js, etc.)
            'unicorn/filename-case': [
                'warn',
                {
                    cases: { kebabCase: true },
                },
            ],

            // --- Complexity analysis ---
            // Warn when cyclomatic complexity exceeds 20
            complexity: ['warn', { max: 20 }],
        },
    },

    // Ignore patterns
    {
        ignores: ['node_modules/', 'dist/', 'build/'],
    },
];
