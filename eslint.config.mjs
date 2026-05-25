import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // TypeScript rules — enable useful checks
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/prefer-as-const": "warn",

    // React rules — keep helpful warnings
    "react-hooks/exhaustive-deps": "warn",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",

    // Next.js rules
    "@next/next/no-img-element": "off",

    // React 19 strict effect rule — disable because useEffect data fetching with
    // loading states is a standard and intentional pattern in this codebase
    "react-hooks/set-state-in-effect": "off",

    // General JavaScript — enable key rules
    "prefer-const": "warn",
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-unreachable": "warn",
    "no-useless-escape": "warn",
    "no-fallthrough": "warn",
    "no-case-declarations": "off",
  },
}, {
  files: ["scripts/**"],
  rules: {
    "no-console": "off",
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills"]
}];

export default eslintConfig;
