/** @type {import('next').NextConfig} */

const nextConfig = {
	reactStrictMode: true,
	output: "standalone",
	serverExternalPackages: ["discord.js", "matrix-js-sdk"],
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "images.unsplash.com" },
			{ protocol: "https", hostname: "img.youtube.com" },
			{ protocol: "https", hostname: "lh3.googleusercontent.com" },
			{ protocol: "https", hostname: "s3.us-west-2.amazonaws.com" },
			{ protocol: "https", hostname: "cdn.sanity.io" },
			{ protocol: "https", hostname: "loremflickr.com" },
			{ protocol: "https", hostname: "avatars.githubusercontent.com" },
			{ protocol: "https", hostname: "v3.fal.media" },
			{ protocol: "https", hostname: "placehold.co" },
			{ protocol: "https", hostname: "matrix.gdhub.io" },
		],
	},
	env: {
		NEXT_PUBLIC_ENV: "PRODUCTION",
	},
	transpilePackages: [
		"@mdxeditor/editor",
		"@ant-design",
		"@ant-design/x",
		"@rc-component/util",
		"rc-input",
		"rc-util",
		"rc-pagination",
		"rc-picker",
		"rc-notification",
		"rc-tooltip",
		"rc-tree",
		"rc-table",
	],
	turbopack: {
		rules: {
			"*.svg": {
				loaders: ["@svgr/webpack"],
				as: "*.js",
			},
		},
	},
	webpack: (config) => {
		config.module.rules.push({
			test: /\.svg$/,
			use: ["@svgr/webpack"],
		});

		config.experiments = { ...config.experiments, topLevelAwait: true };

		config.cache = {
			type: "memory",
			cacheUnaffected: true,
		};

		config.ignoreWarnings = config.ignoreWarnings || [];
		config.ignoreWarnings.push({
			module: /@svar-ui\/react-gantt\/dist-full\/index\.css/,
			message: /end value has mixed support, consider using flex-end instead/,
		});

		return config;
	},
	redirects: async () => [
		// /profile/settings/X → /user/settings/X (settings moved from
		// protected/profile → (spaces)/user/settings).
		{
			source: "/profile/settings",
			destination: "/user/settings/general",
			permanent: true,
		},
		{
			source: "/profile/settings/:item",
			destination: "/user/settings/:item",
			permanent: true,
		},
		// Personal spaces moved: /my/* → /user/* (projects→project, events→event).
		// Covers already-sent emails, bookmarks, and external links.
		{
			source: "/my/projects/:path*",
			destination: "/user/project/:path*",
			permanent: true,
		},
		{
			source: "/my/events/:path*",
			destination: "/user/event/:path*",
			permanent: true,
		},
		{
			source: "/my/settings/:path*",
			destination: "/user/settings/:path*",
			permanent: true,
		},
		// Public course detail renamed: /courses/[slug] → /course/[slug].
		{
			source: "/courses/:path*",
			destination: "/course/:path*",
			permanent: true,
		},
	],
	headers: async () => [
		{
			source: "/api/:path*",
			headers: [
				{ key: "Access-Control-Allow-Origin", value: "*" },
				{
					key: "Access-Control-Allow-Methods",
					value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
				},
				{
					key: "Access-Control-Allow-Headers",
					value:
						"X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
				},
			],
		},
	],
};

module.exports = nextConfig;
