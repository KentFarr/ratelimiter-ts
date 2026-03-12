import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: {
        compilerOptions: {
                sKipLibCheck: true,
        },
  }, 
  clean: true,
});
