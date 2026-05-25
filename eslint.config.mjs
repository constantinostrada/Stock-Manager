import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Enforce clean architecture layer boundaries at the lint level
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/infrastructure/*", "../infrastructure/*", "../../infrastructure/*"],
              message:
                "Infrastructure must not be imported directly. Use a use case or repository interface instead.",
            },
            {
              group: ["@/domain/*", "../domain/*", "../../domain/*"],
              message:
                "Domain entities must not be imported into the interfaces layer. Use DTOs from the application layer.",
            },
          ],
        },
      ],
      // Code quality
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];

export default eslintConfig;
