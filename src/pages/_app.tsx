import '@/styles/globals.scss'
import React, { ReactNode, useEffect, useState } from 'react'
import { CookieConsent } from '@/components/CookieConsent'
import LoadingScreen from '@/components/LoadingScreen'
import { AvailableLocales, defaultLocale } from '@/config/locale'
import SEOSettings from '@/config/seo'
import { publicThemeConfig, secondFont } from '@/config/theme'
import { GTM_ID, pageview } from '@/helpers/gtm'
import { tolgeeService } from '@/services/tolgee'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TolgeeProvider, useTolgeeSSR } from '@tolgee/react'
import { ConfigProvider } from 'antd'
import enLocale from 'antd/locale/en_US'
import ruLocale from 'antd/locale/ru_RU'
import dayjs from 'dayjs'
import localeData from 'dayjs/plugin/localeData'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import weekday from 'dayjs/plugin/weekday'
import { NextPage } from 'next'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import Script from 'next/script'
import { SessionProvider } from 'next-auth/react'
import 'dayjs/locale/en'
import { DefaultSeo } from 'next-seo'
import NProgress from 'nprogress'

dayjs.extend(localizedFormat)
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(localeData)
dayjs.extend(relativeTime)
dayjs.extend(weekday)
dayjs.locale(defaultLocale)

NProgress.configure({ showSpinner: false })

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
			setTimeout(() => setShowContent(true), 150)
		}, 150)
	}

	useEffect(() => {
		setLoadingOff()
		dayjs.locale(ssrTolgee.getLanguage() || AvailableLocales.en)
	}, [])

	useEffect(() => {
		document.body.style.overflow = showContent ? 'unset' : 'hidden'
	}, [showContent])

	const routeChangeStart = (...args: any) => {
		NProgress.start()
	}

	const routeChangeComplete = (url: string) => {
		if (process.env.NODE_ENV == 'production') pageview(url)

		NProgress.done()
	}

	useEffect(() => {
		router.events.on('routeChangeStart', routeChangeStart)
		router.events.on('routeChangeComplete', routeChangeComplete)

		return () => {
			router.events.off('routeChangeStart', routeChangeStart)
			router.events.off('routeChangeComplete', routeChangeComplete)
		}
	}, [router.events])

	return (
		<>
			<DefaultSeo {...SEOSettings[ssrTolgee.getLanguage() as AvailableLocales]} />
			<style jsx global>{`
				:root {
					--second-font-family: ${secondFont.style.fontFamily}, sans-serif;
				}
			`}</style>
			{process.env.NODE_ENV == 'production' && (
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
			)}

			<TolgeeProvider tolgee={ssrTolgee} fallback="Loading...">
				{/* <ErrorBoundary> */}
				<QueryClientProvider client={queryClient}>
					{/* <CheckHealth> */}
					<ConfigProvider theme={publicThemeConfig} locale={ssrTolgee.getLanguage() == 'en' ? enLocale : ruLocale}>
						<SessionProvider session={session}>
							<div className="app-container" style={{ opacity: showContent ? 1 : 0 }}>
								{getLayout(<Component {...pageProps} />)}
							</div>
						</SessionProvider>
					</ConfigProvider>
					{/* </CheckHealth> */}
					<CookieConsent />
					<LoadingScreen visible={loading} />
					{process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
				</QueryClientProvider>
				{/* </ErrorBoundary> */}
			</TolgeeProvider>
		</>
	)
}
