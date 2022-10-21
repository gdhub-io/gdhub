import { useEffect } from 'react'
import { ProtectedLayout } from '@layouts/ProtectedLayout'
import { NextPageWithLayout } from 'pages/_app'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import { useRouter } from 'next/router'

const HubPage: NextPageWithLayout = ({ course, recruitmentGroups, webinarStartedAt }: any) => {
	const router = useRouter()
	const { data: session } = useSession()

	useEffect(() => {
		if (!session) router.push('/')
	}, [session])

	return (
		<>
			<Head>
				<title>Hub Page</title>
			</Head>
			<div>Content</div>
		</>
	)
}

HubPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default HubPage
