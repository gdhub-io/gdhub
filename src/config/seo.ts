import { DefaultSeoProps } from 'next-seo'

const config: DefaultSeoProps = {
	defaultTitle: 'Game Developers Hub',
	description: 'Веб-сервис & сообщество для всех, кто хочет создавать инди-игры или участвовать в их разработке',
	openGraph: {
		type: 'website',
		locale: 'ru_RU',
		url: 'https://gdhub.io/',
		siteName: 'Game Developers Hub',
		images: [
			{
				url: 'https://cdn.sanity.io/images/3ao2jrg0/prod/d27665d440ec6fa51d543dd893bfa35bc38e71ef-512x512.png',
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
}

export default config
