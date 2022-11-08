import React, { ReactNode, useEffect, useState } from 'react'
import ErrorBoundary from '@components/ErrorBoundary'
import '@styles/globals.less'
import LoadingScreen from '@components/LoadingScreen'
import { PublicLayout } from '@layouts/PublicLayout'
import { NextPage } from 'next'
import { SessionProvider } from 'next-auth/react'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'

export type NextPageWithLayout = NextPage & {
	getLayout?: (page: ReactNode) => ReactNode
}

declare type IntrinsicAttributes = {
	style: any
}

type AppPropsWithLayout = AppProps<{ session: any }> & {
	Component: NextPageWithLayout
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
		router.events.on('routeChangeComplete', () => setLoadingOff())
		router.events.on('routeChangeError', () => setLoadingOff())

		return () => {
			router.events.off('routeChangeStart', () => setLoading(true))
			router.events.off('routeChangeComplete', () => setLoadingOff())
			router.events.off('routeChangeError', () => setLoadingOff())
		}
	}, [router.events])

	return (
		<ErrorBoundary>
			<SessionProvider session={session}>
				<div className="app-container" style={{ opacity: loading ? 0 : 1 }}>
					{getLayout(<Component {...pageProps} />)}
				</div>
			</SessionProvider>
			<LoadingScreen visible={loading} />
		</ErrorBoundary>
	)
}
