import { ThemeConfig, theme } from 'antd'
import { Mulish as AppFont } from 'next/font/google'

const mainFont = AppFont({ subsets: ['latin', 'cyrillic'] })

export const themeConfig: ThemeConfig = {
	algorithm: [theme.darkAlgorithm, theme.compactAlgorithm],
	token: {
		fontFamily: mainFont.style.fontFamily,
		colorPrimary: '#F15541',
		colorInfo: '#F15541',
		colorBgBase: '#050505',
		colorTextBase: '#FFFDFC',
		colorText: '#FFFDFC',
		fontSize: 16,
		sizeStep: 4,
		sizeUnit: 4,
		borderRadius: 2,
		wireframe: false,
	},
	components: {
		Avatar: {
			groupOverlapping: -16,
		},
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
