import path from "node:path";
import { defineConfig } from "vitest/config";

// Dates render in the machine's zone. Without pinning one, assertions written
// on a UTC+3 laptop pass locally and fail on a UTC runner.
process.env.TZ = "UTC";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		include: ["tests/**/*.test.ts", "src/**/*.test.{ts,tsx}"],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/tests/e2e/**",
			"**/*.integration.test.ts",
		],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
});
