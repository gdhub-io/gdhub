import { ThemeConfig, theme } from 'antd'
import { Rubik as AppFont } from 'next/font/google'

const mainFont = AppFont({ weight: ['400'], subsets: ['latin', 'cyrillic'] })

export const themeConfig: ThemeConfig = {
	algorithm: theme.defaultAlgorithm,
	// token: {
	// 	fontFamily: mainFont.style.fontFamily,
	// 	colorPrimary: '#0e0e0e',
	// 	fontSize: 16,
	// 	borderRadius: 4,
	// 	wireframe: true,
	// 	lineHeight: 1.5,
	// 	colorLink: '#0e0e0e',
	// 	colorLinkHover: '#22a7c5',
	// 	colorLinkActive: '#22a7c5',
	// 	colorBgLayout: '#fff',
	// },
	// components: {
	// 	Menu: {
	// 		// colorItemTextSelected: '#fff',
	// 		colorBgTextActive: '#dfdfdf',
	// 		colorItemBgSelected: '#22a7c5',
	// 	},
	// 	Dropdown: {
	// 		colorPrimary: '#fff',
	// 		colorPrimaryBorder: '#19384f',
	// 		controlItemBgActiveHover: '#14293c',
	// 	},
	// 	Select: {
	// 		controlItemBgActive: '#b2f3e9',
	// 	},
	// },

	token: {
		colorPrimary: '#07ad92',
		fontSize: 16,
		borderRadius: 8,
		wireframe: true,
		colorLink: '#07ad92',
		colorLinkHover: '#25ba9c',
		colorLinkActive: '#008775',
	},
	components: {
		Spin: {
			fontSize: 16,
			controlHeight: 48,
			controlHeightLG: 52,
		},
	},
}
