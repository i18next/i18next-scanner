const path = require('path');

module.exports = {
  extends: 'trendmicro',
  parser: '@babel/eslint-parser',
  env: {
    browser: true,
    node: true,
    'jest/globals': true,
  },
  plugins: [
    '@babel',
    'jest',
  ],
};
