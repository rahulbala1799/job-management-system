module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // Add any custom rules here
    'no-console': ['warn', { 'allow': ['warn', 'error'] }],
    'no-debugger': 'warn',
    'no-alert': 'warn',
    'no-var': 'error',
    'prefer-const': 'error',
    // Explicitly disable problematic rules
    '@typescript-eslint/no-unused-expressions': 'off'
  }
}; 