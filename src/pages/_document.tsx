import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document'
import { GTM_ID } from '@/helpers/gtm'

export default class CustomDocument extends Document {
	static async getInitialProps(ctx: DocumentContext) {
		const originalRenderPage = ctx.renderPage

		// Run the React rendering logic synchronously
		ctx.renderPage = () =>
			originalRenderPage({
				// Useful for wrapping the whole react tree
				enhanceApp: (App) => App,
				// Useful for wrapping in a per-page basis
				enhanceComponent: (Component) => Component,
			})

		// Run the parent `getInitialProps`, it now includes the custom `renderPage`
		const initialProps = await Document.getInitialProps(ctx)

		return initialProps
	}

	render() {
		return (
			<Html lang="en">
				<Head>
					<link rel="icon" href="/favicon.svg" />
				</Head>
				<body>
					{process.env.NEXT_PUBLIC_APP_URI !== 'http://localhost:3000' && (
						<noscript>
							<iframe
								src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
								height="0"
								width="0"
								style={{ display: 'none', visibility: 'hidden' }}
							/>
						</noscript>
					)}
					<Main />
					<NextScript />
				</body>
			</Html>
		)
	}
}
