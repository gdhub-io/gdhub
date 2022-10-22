/* eslint-disable react-hooks/exhaustive-deps */
import React, { ReactNode, useEffect, useState } from 'react'
import ErrorBoundary from '@components/ErrorBoundary'
import '@styles/globals.less'
import LoadingScreen from '@components/LoadingScreen'
import { PublicLayout } from '@layouts/PublicLayout'
import { NextPage } from 'next'
import { SessionProvider } from 'next-auth/react'
import type { AppProps } from 'next/app'
import { Router } from 'next/router'

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
	const [loading, setLoading] = useState(false)
	const getLayout = Component.getLayout || ((page) => <PublicLayout>{page}</PublicLayout>)

	Router.events.on('routeChangeStart', () => setLoading(true))
	Router.events.on('routeChangeComplete', () => setLoading(false))
	Router.events.on('routeChangeError', () => setLoading(false))

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
