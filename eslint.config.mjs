import nextConfig from "eslint-config-next/core-web-vitals";
import reactHooks from "eslint-plugin-react-hooks";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    // Global ignores — applied before file scanning to avoid NTFS-corrupted dirs
    ignores: [
      ".next/**",
      ".next-fresh/**",
      ".next-build/**",
      ".dist/**",
      ".build-output-*/**",
      "node_modules/**",
      "outputs/**",
      "*.log",
      "**/app/api/admin/reviews/**",
    ],
  },
  ...nextConfig,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
    },
  },
];

export default eslintConfig;
