import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
	stories: ["../src/**/*.stories.@(ts|tsx)"],
	addons: [],
	framework: {
		name: "@storybook/nextjs",
		options: {},
	},
	// `next/font/local` (Geist) emits @font-face rules that point at the raw
	// source path (/src/assets/fonts/…) under @storybook/nextjs, so serve that
	// folder statically at the same path or the font 404s and text falls back.
	staticDirs: [
		"../public",
		{ from: "../src/assets/fonts", to: "/src/assets/fonts" },
	],
	webpackFinal: async (config) => {
		// Mirror next.config.js: import `*.svg` as React components via SVGR.
		// @storybook/nextjs treats svg as a static asset by default, so we
		// exclude svg from that rule and add the SVGR loader instead.
		const assetRule = config.module?.rules?.find((rule) => {
			if (!rule || typeof rule !== "object") return false;
			const test = (rule as { test?: RegExp }).test;
			return test instanceof RegExp && test.test(".svg");
		}) as { exclude?: RegExp } | undefined;

		if (assetRule) {
			assetRule.exclude = /\.svg$/;
		}

		config.module?.rules?.push({
			test: /\.svg$/,
			use: ["@svgr/webpack"],
		});

		// next.config.js enables this; keep parity in case an imported module
		// relies on top-level await.
		config.experiments = { ...config.experiments, topLevelAwait: true };

		return config;
	},
};

export default config;
