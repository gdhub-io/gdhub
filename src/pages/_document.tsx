import { Html, Head, Main, NextScript } from 'next/document'
import { GTM_ID } from '@/helpers/gtm'

export default function Document() {
	return (
		<Html lang="en">
			<Head>
				<link rel="icon" href="/favicon.svg" />
			</Head>
			<body>
				<noscript>
					<iframe
						src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
						height="0"
						width="0"
						style={{ display: 'none', visibility: 'hidden' }}
					/>
				</noscript>
				<Main />
				<NextScript />
			</body>
		</Html>
	)
}
