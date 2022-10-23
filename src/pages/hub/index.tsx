import { ProtectedLayout } from '@layouts/ProtectedLayout'
import { NextPageWithLayout } from 'pages/_app'
import { Space } from 'antd'
import Head from 'next/head'
import Link from 'next/link'

const HubPage: NextPageWithLayout = () => {
	return (
		<>
			<Head>
				<title>Hub Page</title>
			</Head>
			<Space>
				<Link href="/profile">
					<a>My profile</a>
				</Link>
				<Link href="/hub/specialists">
					<a>Specialists</a>
				</Link>
			</Space>
		</>
	)
}

HubPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default HubPage
