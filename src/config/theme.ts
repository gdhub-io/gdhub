import { ThemeConfig, theme } from 'antd'
import { Lora as AppFont } from 'next/font/google'

const mainFont = AppFont({ weight: ['400'], subsets: ['latin', 'cyrillic'] })

export const themeConfig: ThemeConfig = {
	algorithm: [theme.darkAlgorithm, theme.compactAlgorithm],
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
		fontFamily: mainFont.style.fontFamily,
		colorPrimary: '#F15541',
		colorInfo: '#F15541',
		colorBgBase: '#050505',
		colorTextBase: '#ffffff',
		fontSize: 16,
		sizeStep: 4,
		sizeUnit: 4,
		borderRadius: 2,
		wireframe: false,
	},
	components: {
		Button: {
			size: 16,
			sizeLG: 18,
			controlHeight: 52,
			controlHeightLG: 72,
			controlHeightSM: 36,
			fontSize: 16,
			fontSizeLG: 18,
			colorBgContainer: 'transparent',
			colorBorder: '#F15541',
			paddingContentHorizontal: 32,
			paddingContentVertical: 16,
		},
		Typography: {
			fontSize: 16,
		},
		Layout: {
			colorBgBody: 'transparent',
			colorBgHeader: 'transparent',
		},
		Menu: { colorBgContainer: 'transparent' },
		Spin: {
			fontSize: 16,
			controlHeight: 48,
			controlHeightLG: 52,
		},
	},
}
