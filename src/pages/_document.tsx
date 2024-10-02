import { GTM_ID } from '@/helpers/gtm'
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs'
import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document'

// export default class CustomDocument extends Document {
// 	render() {
// 		return (
// 			<Html>
// 				<Head>
// 					<link rel="icon" href="/favicon.svg" />
// 				</Head>
// 				<body>
// 					{process.env.NEXT_PUBLIC_APP_URI !== 'http://localhost:3000' && (
// 						<noscript>
// 							<iframe
// 								src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
// 								height="0"
// 								width="0"
// 								style={{ display: 'none', visibility: 'hidden' }}
// 							/>
// 						</noscript>
// 					)}
// 					<Main />
// 					<NextScript />
// 				</body>
// 			</Html>
// 		)
// 	}
// }

const MyDocument = () => (
	<Html>
		<Head>
			<link rel="icon" href="/favicon.svg" />
			{/* the 2 links provided by Google fonts */}
			<link rel="preconnect" href="https://fonts.googleapis.com" />
			<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
		</Head>
		<body>
			{process.env.NODE_ENV == 'production' && (
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

MyDocument.getInitialProps = async (ctx: DocumentContext) => {
	const cache = createCache()
	const originalRenderPage = ctx.renderPage

	// Run the React rendering logic synchronously
	ctx.renderPage = () =>
		originalRenderPage({
			// Useful for wrapping the whole react tree
			enhanceApp: (App) => (props) => (
				// <StyleProvider cache={cache}>*/}
				<App {...props} />
				// </StyleProvider>
			),
			// Useful for wrapping in a per-page basis
			// enhanceComponent: (Component) => Component,
		})

	// Run the parent `getInitialProps`, it now includes the custom `renderPage`
	const initialProps = await Document.getInitialProps(ctx)
	const style = extractStyle(cache, true)

	return {
		...initialProps,
		styles: (
			<>
				{initialProps.styles}
				<style dangerouslySetInnerHTML={{ __html: style }} />
			</>
		),
	}
}

export default MyDocument
