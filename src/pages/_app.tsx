import React, { ReactNode, useEffect, useState } from 'react'
import '@/styles/globals.scss'
import { CookieConsent } from '@/components/CookieConsent'
import ErrorBoundary from '@/components/ErrorBoundary'
import LoadingScreen from '@/components/LoadingScreen'
import SEOSettings from '@/config/seo'
import { themeConfig } from '@/config/theme'
import { GTM_ID, pageview } from '@/helpers/gtm'
import { PublicLayout } from '@/layouts/PublicLayout'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ConfigProvider } from 'antd'
import dayjs from 'dayjs'
import localeData from 'dayjs/plugin/localeData'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import weekday from 'dayjs/plugin/weekday'
import { NextPage } from 'next'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import Script from 'next/script'
import { SessionProvider } from 'next-auth/react'
import 'dayjs/locale/ru'
import { DefaultSeo } from 'next-seo'

dayjs.extend(localizedFormat)
dayjs.extend(localeData)
dayjs.extend(relativeTime)
dayjs.extend(weekday)
dayjs.locale('ru')

export type NextPageWithLayout<P = {}> = NextPage<P> & {
	getLayout?: (page: ReactNode) => ReactNode
}

const queryClient = new QueryClient()

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
		document.body.style.overflow = loading ? 'hidden' : 'unset'
	}, [loading])

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
				<QueryClientProvider client={queryClient}>
					<ConfigProvider theme={themeConfig}>
						<SessionProvider session={session}>
							<div
								className="app-container"
								style={{
									fontFamily: themeConfig.token?.fontFamily,
									opacity: loading ? 0 : 1,
									overflow: loading ? 'hidden' : 'initial',
								}}
							>
								<DefaultSeo {...SEOSettings} />
								{getLayout(<Component {...pageProps} />)}
							</div>
						</SessionProvider>
						<CookieConsent />
						<LoadingScreen visible={loading} />
					</ConfigProvider>

					{process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
				</QueryClientProvider>
			</ErrorBoundary>
		</>
	)
}
