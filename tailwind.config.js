module.exports = {
	content: ['./src/pages/**/*.{js,ts,jsx,tsx}', './src/components/**/*.{js,ts,jsx,tsx}'],
	mode: 'jit',
	important: true,
	theme: {
		screens: {
			tablet: '576px',
			laptop: '992px',
			desktop: '1200px',
		},
		extend: {
			width: {
				99: '30rem',
			},
			height: {
				700: '700px',
			},
			colors: {
				'dark-purple': ' #242038ff',
				'slate-blue': ' #725ac1ff',
				'middle-blue-purple': ' #8d86c9ff',
				'lavender-gray': '#cac4ceff',
				linen: ' #f7ece1ff',
			},
		},
	},
	plugins: [require('@tailwindcss/forms')],
}
