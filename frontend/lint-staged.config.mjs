// Runs ONLY on staged files (not the whole repo), so legacy code you didn't
// touch never blocks a commit.
//
// - prettier: always formats the staged files.
// - eslint:   "soft" mode — auto-fixes what it can, but `|| true` means a
//             remaining lint error never blocks the commit (legacy-friendly).
//             Real eslint/test enforcement happens on `git push`.
export default {
  '*.{ts,tsx,js,jsx}': [
    'prettier --write',
    (files) =>
      `bash -c "pnpm exec eslint --fix ${files.map((f) => `'${f}'`).join(' ')} || true"`,
  ],
  '*.{json,css,scss,md,html}': ['prettier --write'],
};
