module.exports = {
  env: {
    node: true,
  },
  parserOptions: {
    ecmaVersion: 5,
    sourceType: 'script',
  },
  extends: ['airbnb-base', 'plugin:eslint-comments/recommended'],
  rules: {
    'import/prefer-default-export': 'off',
    'no-case-declarations': 'off',
  },
};
