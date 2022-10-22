import { ProtectedLayout } from '@layouts/ProtectedLayout'
import { NextPageWithLayout } from 'pages/_app'
import Head from 'next/head'
import Link from 'next/link'

const HubPage: NextPageWithLayout = () => {
	return (
		<>
			<Head>
				<title>Hub Page</title>
			</Head>
			<div>
				<Link href="/hub/specialists">
					<a>Specialists</a>
				</Link>
			</div>
		</>
	)
}

HubPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default HubPage
