import { ThemeConfig, theme } from 'antd'
import { Mulish as AppFont } from 'next/font/google'

const mainFont = AppFont({ subsets: ['latin', 'cyrillic'] })

export const themeConfig: ThemeConfig = {
	algorithm: [theme.darkAlgorithm, theme.compactAlgorithm],
	token: {
		fontFamily: mainFont.style.fontFamily,
		colorPrimary: 'rgb(241,85,65)',
		colorInfo: 'rgb(241,85,65)',
		colorBgBase: '#050505',
		colorTextBase: '#FFFDFC',
		colorWhite: '#FFFDFC',
		fontSize: 16,
		sizeStep: 4,
		sizeUnit: 4,
		borderRadius: 0,
		wireframe: false,
		colorBgElevated: '#050505',
	},
	components: {
		Avatar: {
			groupOverlapping: -16,
		},
		Button: {
			size: 16,
			sizeLG: 18,
			colorTextBase: '#FFFDFC',
			controlHeight: 52,
			controlHeightLG: 64,
			controlHeightSM: 36,
			fontSize: 16,
			fontSizeLG: 20,
			colorBgContainer: 'transparent',
			colorBorder: '#F15541',
			paddingContentHorizontal: 64,
			paddingContentVertical: 16,
		},
		Typography: {
			fontSize: 16,
		},
		Layout: {
			colorBgBody: 'transparent',
			colorBgHeader: 'transparent',
		},
		Menu: { colorBgContainer: 'transparent', darkItemBg: '#050505' },
		Spin: {
			fontSize: 16,
			controlHeight: 48,
			controlHeightLG: 52,
		},
	},
}
