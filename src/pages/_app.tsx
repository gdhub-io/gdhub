import React, { ReactNode, useEffect, useState } from 'react'
import ErrorBoundary from '@components/ErrorBoundary'
import '@styles/globals.scss'
import LoadingScreen from '@components/LoadingScreen'
import SEOSettings from '@config/seo'
import { GTM_ID, pageview } from '@helpers/gtm'
import { PublicLayout } from '@layouts/PublicLayout'
// import moment from 'moment'
import { themeConfig } from 'config/theme'
import { ConfigProvider } from 'antd'
import moment from 'moment-timezone'
import { NextPage } from 'next'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import Script from 'next/script'
import { SessionProvider } from 'next-auth/react'
import 'moment/locale/ru'
import { DefaultSeo } from 'next-seo'

moment.locale('ru')

export type NextPageWithLayout = NextPage & {
	getLayout?: (page: ReactNode) => ReactNode
}

declare type IntrinsicAttributes = {
	style: any
}

type AppPropsWithLayout = AppProps<{ session: any }> & {
	Component: NextPageWithLayout
}

export function reportWebVitals(metric: any) {
	if (process.env.NODE_ENV == 'production') return

	console.log(metric)
}

export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppPropsWithLayout) {
	const router = useRouter()
	const [loading, setLoading] = useState(true)
	const getLayout = Component.getLayout || ((page) => <PublicLayout>{page}</PublicLayout>)

	const setLoadingOff = () => {
		setTimeout(() => setLoading(false), 1500)
	}

	useEffect(() => {
		setLoadingOff()
	}, [])

	useEffect(() => {
		router.events.on('routeChangeStart', () => setLoading(true))
		router.events.on('routeChangeComplete', (url: string) => {
			pageview(url)
			setLoadingOff()
		})
		router.events.on('routeChangeError', () => setLoadingOff())

		return () => {
			router.events.off('routeChangeStart', () => setLoading(true))
			router.events.off('routeChangeComplete', (url: string) => {
				pageview(url)
				setLoadingOff()
			})
			router.events.off('routeChangeError', () => setLoadingOff())
		}
	}, [router.events])

	return (
		<>
			<Script id="gtag-base" src="https://telegram.org/js/telegram-web-app.js" />
			<Script
				id="gtag-base"
				strategy="afterInteractive"
				dangerouslySetInnerHTML={{
					__html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer', '${GTM_ID}');
          `,
				}}
			/>
			<ErrorBoundary>
				<ConfigProvider theme={themeConfig}>
					<SessionProvider session={session}>
						<div
							className="app-container"
							style={{ fontFamily: themeConfig.token?.fontFamily, opacity: loading ? 0 : 1 }}
						>
							<DefaultSeo {...SEOSettings} />
							{getLayout(<Component {...pageProps} />)}
						</div>
					</SessionProvider>
					<LoadingScreen visible={loading} />
				</ConfigProvider>
			</ErrorBoundary>
		</>
	)
}
