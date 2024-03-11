import HeroBgImage from '@/assets/images/landing/hero-bg.png'
import { DefaultSeoProps } from 'next-seo'
import { AvailableLocales } from './locale'

const config: Record<AvailableLocales, DefaultSeoProps> = {
	en: {
		defaultTitle: 'Game Developers Hub',
		titleTemplate: '%s | GDHub',
		description: 'Web service & community for everyone who wants to create or participate in indie games',
		openGraph: {
			type: 'website',
			locale: 'en-US',
			siteName: 'Game Developers Hub',
			images: [
				{
					url: `${process.env.NEXT_PUBLIC_APP_URI}/api/og?t=${'Game Developers Hub'}&st=for%20everyone%20who%20wants%20to%20make%20video%20games&img=${process.env.NEXT_PUBLIC_APP_URI + HeroBgImage.src}`,
					width: 1200,
					height: 360,
					alt: 'Game Developers Hub Cover',
					type: 'image/png',
				},
			],
		},
		twitter: {
			handle: '@gamedev_hub',
			site: '@site',
			cardType: 'summary_large_image',
		},
	},
	ru: {
		defaultTitle: 'Game Developers Hub',
		titleTemplate: '%s | GDHub',
		description: 'Веб-сервис & сообщество для всех, кто хочет создавать инди-игры или участвовать в их разработке',
		openGraph: {
			type: 'website',
			locale: 'ru-RU',
			url: 'https://gdhub.io/ru/',
			siteName: 'Game Developers Hub',
			images: [
				{
					url: `${process.env.NEXT_PUBLIC_APP_URI}/api/og?t=${'Хаб разработчиков игр'}&st=${'для всех, кто хочет делать видеоигры'}&img=${process.env.NEXT_PUBLIC_APP_URI + HeroBgImage.src}`,
					width: 512,
					height: 512,
					alt: 'Game Developers Logo',
					type: 'image/png',
				},
			],
		},
		twitter: {
			handle: '@gamedev_hub',
			site: '@site',
			cardType: 'summary_large_image',
		},
	},
}

export default config
