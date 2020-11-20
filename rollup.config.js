import babel from "rollup-plugin-babel";
import { uglify } from "rollup-plugin-uglify";
import { eslint } from "rollup-plugin-eslint";
import resolve from "rollup-plugin-node-resolve";
import rollupTypescript from "rollup-plugin-typescript2";

export default {
  input: "src/main.ts",
  output: [
    {
      file: "dist/monitor.js",
      name: "monitor",
      format: "iife",
    },
    // {
    //   file: "dist/monitor.cjs.js",
    //   format: "cjs",
    //   exports: "default",
    // },
  ],
  plugins: [
    resolve(),
    eslint({
      throwOnError: true,
      throwOnWarning: true,
      include: ["src/**/*.ts"],
      exclude: ["node_modules/**", "lib/**", "*.js"],
    }),
    process.env.NODE_ENV === "production" && uglify(),
    rollupTypescript(),
    babel({
      runtimeHelpers: true,
      exclude: "node_modules/**",
      extensions: [".ts"],
    }),
  ],
};
