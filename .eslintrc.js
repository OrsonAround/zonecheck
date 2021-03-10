module.exports = {
  root: true,
  overrides: [
    {
      files: ['**/*.js'],
      excludedFiles: 'src/**/!(*.spec).js',
      env: {
        node: true,
        browser: false,
        es2021: true,
      },
      parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
      },
      extends: ['airbnb-base', 'plugin:eslint-comments/recommended'],
      rules: {
        'import/prefer-default-export': 'off',
        'no-case-declarations': 'off',
        'no-param-reassign': ['error', { props: false }],
        'import/no-extraneous-dependencies': [
          'error',
          { devDependencies: ['bin/**/*', 'src/**/*.spec.js'] },
        ],
      },
    },
    {
      files: ['src/**/!(*.spec).js'],
      parserOptions: {
        ecmaVersion: 5,
        sourceType: 'script',
      },
      env: {
        node: true,
        es6: false,
        browser: false,
        es2021: false,
      },
      extends: ['airbnb-base/legacy', 'plugin:eslint-comments/recommended'],
      rules: {
        'import/prefer-default-export': 'off',
        'no-case-declarations': 'off',
        'no-param-reassign': ['error', { props: false }],
      },
    },
    {
      files: ['src/**/*.spec.js'],
      env: {
        node: true,
        browser: false,
        es2021: true,
        jest: true,
      },
    },
  ],
};
