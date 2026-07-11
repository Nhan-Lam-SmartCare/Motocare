import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      "*.backup.*",
      "**/__DEPRECATED_backups/**",
      "**/*.old.*",
      "**/*.legacy.*",
      "**/*.backup.*",
      "src/components/sales/components/SalesHistoryModal.tsx",
      "src/components/inventory/components/InventoryHistorySection.tsx",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // React Hooks rules
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
          allowExportNames: ["useAppContext", "useAuth", "useTheme", "useCart"],
        },
      ],

      // TypeScript rules
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/prefer-as-const": "warn",

      // General quality rules
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "warn",
      "no-var": "error",
      "no-case-declarations": "warn",
      "no-empty": "warn",
      "no-irregular-whitespace": "warn",
      "no-constant-binary-expression": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",

      // Keep runtime-safe lint by disabling high-noise behavior-affecting suggestions
      "react-hooks/exhaustive-deps": "off",

      // Maintainability rules
      "max-lines": "off",
      "max-lines-per-function": "off",
      complexity: "off",
    },
  },
  {
    // C3: keep data access in the repository layer (src/lib/repository) + hooks (src/hooks).
    // UI components importing the raw Supabase client bypass typing/caching and duplicate
    // query logic. Warning (not error) so existing ~34 call-sites can be migrated gradually.
    // See docs/C_FRONTEND_PLAN.md.
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["**/supabaseClient"],
              message:
                "Don't use the raw Supabase client in UI. Add/extend a repository in src/lib/repository and a hook in src/hooks instead (see docs/C_FRONTEND_PLAN.md).",
            },
          ],
        },
      ],
    },
  }
);
