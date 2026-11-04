/** @type {import('next').NextConfig} */

const originOf = (url) => {
	try {
		return url ? new URL(url).origin : "";
	} catch {
		return "";
	}
};

const appOrigin = originOf(process.env.NEXT_PUBLIC_APP_URL) || "https://gdhub.io";
const typesenseOrigin = process.env.NEXT_PUBLIC_TYPESENSE_HOST
	? `${process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || "https"}://${process.env.NEXT_PUBLIC_TYPESENSE_HOST}${process.env.NEXT_PUBLIC_TYPESENSE_PORT ? `:${process.env.NEXT_PUBLIC_TYPESENSE_PORT}` : ""}`
	: "";
const matrixOrigin = originOf(process.env.NEXT_PUBLIC_MATRIX_CHAT_BASE_URL);

// Report-only for now: violations show in the browser console and block nothing.
// Enforce it once a release has run clean, with a nonce in place of 'unsafe-inline'.
const contentSecurityPolicy = [
	"default-src 'self'",
	`script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://*.google-analytics.com https://cdn.paddle.com https://telegram.org https://*.daily.co https://www.youtube.com https://s.ytimg.com`,
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.paddle.com",
	// Avatars, covers and devlog images come from user-supplied hosts.
	"img-src 'self' data: blob: https:",
	"media-src 'self' blob: https:",
	"font-src 'self' data: https://fonts.gstatic.com",
	[
		"connect-src 'self'",
		typesenseOrigin,
		matrixOrigin,
		originOf(process.env.NEXT_PUBLIC_TOLGEE_API_URL),
		"https://*.novu.co wss://*.novu.co",
		"https://*.googleapis.com",
		"https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
		"https://*.paddle.com",
		"https://*.daily.co wss://*.daily.co",
		"https://cdn.sanity.io",
	]
		.filter(Boolean)
		.join(" "),
	"frame-src 'self' https://*.paddle.com https://*.daily.co https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://oauth.telegram.org https://www.googletagmanager.com",
	"worker-src 'self' blob:",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self' https://accounts.google.com",
	// The certificate page frames its own PDF, so 'self' and not 'none'.
	"frame-ancestors 'self'",
].join("; ");

const securityHeaders = [
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{ key: "X-Frame-Options", value: "SAMEORIGIN" },
	// Daily call rooms need the camera, microphone and screen share.
	{
		key: "Permissions-Policy",
		value:
			"camera=(self \"https://*.daily.co\"), microphone=(self \"https://*.daily.co\"), display-capture=(self \"https://*.daily.co\"), geolocation=(), payment=(self \"https://*.paddle.com\"), usb=()",
	},
	// No includeSubDomains until every *.gdhub.io host is known to answer on HTTPS.
	{ key: "Strict-Transport-Security", value: "max-age=63072000" },
	{ key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
];

const nextConfig = {
	reactStrictMode: true,
	// `.next/standalone` is read by the Docker image and by nothing else, so the
	// Dockerfile's builder stage is what asks for it. Defaulting it on cost every
	// other build an output mode nobody reads, and on Vercel it was worse than
	// wasted: since Next 16.3 the Turbopack standalone build stops emitting
	// `.next/next-server.js.nft.json`, which the Vercel builder opens and fails
	// without.
	output: process.env.NEXT_OUTPUT_STANDALONE ? "standalone" : undefined,

	// Lets `dev:test` run beside the ordinary dev server: Next refuses a second
	// instance sharing one build directory.
	distDir: process.env.NEXT_DIST_DIR || ".next",
	// The stand opens every page in one session: without dropping what the disk
	// cache already holds, its dev server grew past 20 GB (GDHUB-130).
	experimental: process.env.NEXT_DIST_DIR
		? { turbopackMemoryEviction: "full" }
		: {},
	// Legal texts are read from disk at request time; without this they are not
	// in the serverless bundle and every legal page renders empty in production.
	outputFileTracingIncludes: {
		"/**": ["./docs/legal/**/*.md"],
		// The AI curator samples video frames with this binary in the daily cron.
		"/api/cron/checkpoints": ["./node_modules/ffmpeg-static/ffmpeg"],
	},
	serverExternalPackages: [
		"discord.js",
		"matrix-js-sdk",
		"@gdhub-io/gdhub-prisma",
		"@prisma/client",
		"@prisma/adapter-pg",
		"ffmpeg-static",
	],
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
			// Avatars generated by the mock seed in @gdhub-io/gdhub-prisma. Without
			// this, signing in as a seeded user throws the whole shell into an
			// error boundary — `next/image` refuses the host.
			{ protocol: "https", hostname: "cdn.jsdelivr.net" },
		],
	},
	env: {
		NEXT_PUBLIC_ENV: "PRODUCTION",
	},
	transpilePackages: [
		"@mdxeditor/editor",
		"@ant-design",
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

		return config;
	},
	redirects: async () => [
		// /profile/settings/X → /user/settings/X (settings moved from
		// protected/profile → (app)/(spaces)/user/settings).
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
		// Personal lists moved from the hub into the user space.
		{
			source: "/hub/courses/my",
			destination: "/user/courses",
			permanent: true,
		},
		{
			source: "/hub/events/my",
			destination: "/user/events",
			permanent: true,
		},
		{
			source: "/hub/experts/my-requests",
			destination: "/user/advice-requests",
			permanent: true,
		},
		// The hub docs viewer was dropped; documentation lives on its own domain.
		// The legal texts moved from Notion to versioned files under /legal.
		...[
			["/terms", "terms-of-use"],
			["/privacy-policy", "privacy-policy"],
			["/cookie-policy", "cookie-policy"],
			["/refund-policy", "refund-policy"],
			["/project-requirements", "project-requirements"],
		].map(([source, slug]) => ({
			source,
			destination: `/legal/${slug}`,
			permanent: true,
		})),
		{
			source: "/hub/docs",
			destination: "https://docs.gdhub.io",
			permanent: false,
		},
		{
			source: "/hub/docs/:path*",
			destination: "https://docs.gdhub.io",
			permanent: false,
		},
	],
	headers: async () => [
		{ source: "/:path*", headers: securityHeaders },
		// The hero game's models: a week in the browser cache, so a returning
		// visitor loads none of them; a rebuilt model reaches everyone within it.
		{
			source: "/models/hero-game/:path*",
			headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
		},
		{
			source: "/api/:path*",
			headers: [
				// No other origin calls this API from a browser; the mobile app is native and has its own backend.
				{ key: "Access-Control-Allow-Origin", value: appOrigin },
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
