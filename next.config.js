/** @type {import('next').NextConfig} */

const withLess = require('next-with-less')

const nextConfig = {
	lessLoaderOptions: {},
	reactStrictMode: false,
	output: 'standalone',
	webpack: (config) => {
		config.module.rules.push({
			test: /\.svg$/,
			use: ['@svgr/webpack'],
		})

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

module.exports = withLess(nextConfig)
