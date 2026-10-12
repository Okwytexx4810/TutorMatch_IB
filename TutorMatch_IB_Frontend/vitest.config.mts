import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Node environment: the suites cover pure logic (locations, validation,
    // discovery params). No jsdom/React plugin is pulled in, which also avoids
    // the Babel 8 peer requirement of @vitejs/plugin-react.
    environment: "node",
  },
});