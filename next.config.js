/** @type {import('next').NextConfig} */

const withLess = require('next-with-less')

const nextConfig = {
	lessLoaderOptions: {},
	reactStrictMode: true,
	output: 'standalone',
	images: {
		domains: [
			'images.unsplash.com',
			'lh3.googleusercontent.com',
			'dl.airtable.com',
			's3.us-west-2.amazonaws.com',
			'cdn.sanity.io',
		],
	},
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
