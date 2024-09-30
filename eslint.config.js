import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier";

export default [
  js.configs.recommended,
  {
    plugins: {
      eslintPluginPrettier,
    },
    rules: {
      // "prettier/prettier": "error", FIXME TypeError: Key "rules": Key "prettier/prettier": Could not find plugin "prettier".
      "no-param-reassign": "error",
    },
    // TODO overrides
    ignores: [
      "node_modules",
      "dist",
      "coverage",
      "/.*rc.{,c}js",
      "/*.config.{,c}js",
    ],
  },
];
