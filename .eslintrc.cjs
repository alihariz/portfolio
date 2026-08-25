/* The repo's lint script has always existed; the config never did, so
   `npm run lint` failed on a fresh clone. CI runs it as a gate, so it needs
   to be real. */
module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs', 'scripts/*.mjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['react-refresh'],
  rules: {
    // Off deliberately: this rule is about Vite fast-refresh granularity in
    // dev, not correctness. It fires on a context file and a lib file that
    // are structured correctly, and CI runs with --max-warnings 0.
    'react-refresh/only-export-components': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
}
