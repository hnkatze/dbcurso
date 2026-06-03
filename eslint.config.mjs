import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Legacy CDN/Babel SPA kept only as migration reference — not part of the app.
    "DBs/**",
  ]),
  {
    rules: {
      // Spanish copy uses plenty of apostrophes/quotes in JSX text; they render
      // fine and escaping them hurts readability. Cosmetic rule, turned off.
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
