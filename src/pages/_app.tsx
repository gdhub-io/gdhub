import '@/styles/globals.scss'
import React, { ReactNode, useEffect, useState } from 'react'
import CheckHealth from '@/components/CheckHealth'
import { CookieConsent } from '@/components/CookieConsent'
import ErrorBoundary from '@/components/ErrorBoundary'
import LoadingScreen from '@/components/LoadingScreen'
import SEOSettings from '@/config/seo'
import { themeConfig } from '@/config/theme'
import { GTM_ID, pageview } from '@/helpers/gtm'
import { tolgeeService } from '@/services/tolgee'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TolgeeProvider, useTolgeeSSR } from '@tolgee/react'
import { ConfigProvider } from 'antd'
import dayjs from 'dayjs'
import localeData from 'dayjs/plugin/localeData'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import weekday from 'dayjs/plugin/weekday'
import { NextPage } from 'next'
import type { AppProps } from 'next/app'
import { Lora } from 'next/font/google'
import { useRouter } from 'next/router'
import Script from 'next/script'
import { SessionProvider } from 'next-auth/react'
import 'dayjs/locale/ru'
import { DefaultSeo } from 'next-seo'

dayjs.extend(localizedFormat)
dayjs.extend(localeData)
dayjs.extend(relativeTime)
dayjs.extend(weekday)
dayjs.locale('en')

const secondFont = Lora({ subsets: ['latin', 'cyrillic'], weight: ['400', '700'], style: ['normal', 'italic'] })

export type NextPageWithLayout<P = {}> = NextPage<P> & {
	getLayout?: (page: ReactNode) => ReactNode
}

// const twentyFourHoursInMs = 1000 * 60 * 60 * 24
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// refetchInterval: false,
			// staleTime: twentyFourHoursInMs,
		},
	},
})

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
	const [showContent, setShowContent] = useState(false)
	const getLayout = Component.getLayout || ((page) => <>{page}</>)
	const ssrTolgee = useTolgeeSSR(tolgeeService, router.locale)

	const setLoadingOff = () => {
		setTimeout(() => {
			setLoading(false)
			setTimeout(() => setShowContent(true), 300)
		}, 300)
	}

	useEffect(() => {
		setLoadingOff()
	}, [])

	useEffect(() => {
		document.body.style.overflow = showContent ? 'unset' : 'hidden'
	}, [showContent])

	useEffect(() => {
		router.events.on('routeChangeStart', () => {
			setShowContent(false)
			setLoading(true)
		})
		router.events.on('routeChangeComplete', (url: string) => {
			pageview(url)
			setLoadingOff()
		})
		router.events.on('routeChangeError', () => setLoadingOff())

		return () => {
			router.events.off('routeChangeStart', () => {
				setShowContent(false)
				setLoading(true)
			})
			router.events.off('routeChangeComplete', (url: string) => {
				pageview(url)
				setLoadingOff()
			})
			router.events.off('routeChangeError', () => setLoadingOff())
		}
	}, [router.events])

	return (
		<>
			<style jsx global>{`
				:root {
					--main-font-family: ${themeConfig?.token?.fontFamily}, sans-serif;
					--second-font-family: ${secondFont.style.fontFamily}, sans-serif;
				}
			`}</style>
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
			<TolgeeProvider tolgee={ssrTolgee}>
				<ErrorBoundary>
					<QueryClientProvider client={queryClient}>
						<ConfigProvider theme={themeConfig}>
							<CheckHealth>
								<SessionProvider session={session}>
									<div
										className="app-container"
										style={{
											fontFamily: themeConfig.token?.fontFamily,
											opacity: showContent ? 1 : 0,
										}}
									>
										<DefaultSeo {...SEOSettings} />
										{getLayout(<Component {...pageProps} />)}
									</div>
								</SessionProvider>
							</CheckHealth>
							<CookieConsent />
							<LoadingScreen visible={loading} />
						</ConfigProvider>

						{process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
					</QueryClientProvider>
				</ErrorBoundary>
			</TolgeeProvider>
		</>
	)
}
