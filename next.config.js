/** @type {import('next').NextConfig} */

const nextConfig = {
	reactStrictMode: true,
	output: 'standalone',
	i18n: {
		locales: ['en', 'ru'],
		defaultLocale: 'en',
	},
	experimental: {
		// serverComponentsExternalPackages: ['bullmq'],
		// instrumentationHook: true,
	},
	images: {
		remotePatterns: [
			{ protocol: 'https', hostname: 'images.unsplash.com' },
			{ protocol: 'https', hostname: 'lh3.googleusercontent.com' },
			{ protocol: 'https', hostname: 's3.us-west-2.amazonaws.com' },
			{ protocol: 'https', hostname: 'cdn.sanity.io' },
			{ protocol: 'https', hostname: 'loremflickr.com' },
			{ protocol: 'https', hostname: 'avatars.githubusercontent.com' },
			{ protocol: 'https', hostname: 'v3.fal.media' },
			{ protocol: 'https', hostname: 'placehold.co' },
			{ protocol: 'https', hostname: 'matrix.gdhub.io' },
		],
	},
	env: {
		NEXT_PUBLIC_ENV: 'PRODUCTION', //your next configs goes here
	},
	transpilePackages: [
		'@mdxeditor/editor',
		'@ant-design',
		'@ant-design/x',
		'@rc-component/util',
		'rc-input',
		'rc-util',
		'rc-pagination',
		'rc-picker',
		'rc-notification',
		'rc-tooltip',
		'rc-tree',
		'rc-table',
	],
	webpack: (config) =>
	{
		config.module.rules.push({
			test: /\.svg$/,
			use: ['@svgr/webpack'],
		})

		config.experiments = { ...config.experiments, topLevelAwait: true }

		config.cache = {
			type: 'memory',
			cacheUnaffected: true,
		}

		return config
	},
	headers: async () => [
		{
			source: '/api/:path*',
			headers: [
				{ key: 'Access-Control-Allow-Origin', value: '*' },
				{ key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
				{
					key: 'Access-Control-Allow-Headers',
					value:
						'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
				},
			],
		},
	],
}

module.exports = nextConfig
