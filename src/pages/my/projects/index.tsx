import { fetcher } from '@helpers/fetcher'
import { ProtectedLayout } from '@layouts/ProtectedLayout'
import { NextPageWithLayout } from 'pages/_app'
import { List } from 'antd'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'

const MyProjectsPage: NextPageWithLayout = () => {
	const {
		data: myProjects,
		mutate: fetchMyProjects,
		isValidating: isLoadingMyProjects,
	} = useSWR(['/api/my/projects'], fetcher, { revalidateOnFocus: false })

	return (
		<>
			<Head>
				<title>Мои проекты</title>
			</Head>
			<h1>Мои проекты</h1>

			{!!myProjects?.data ? (
				<List
					bordered
					dataSource={myProjects.data}
					renderItem={(myProject: any) => (
						<List.Item
							style={{ cursor: 'pointer' }}
							extra={myProject['Cover Image'] ? <Image width={272} alt="logo" src={myProject['Cover Image']} /> : null}
						>
							<Link href={`/my/projects/${myProject.id}`}>{myProject.Name}</Link>
						</List.Item>
					)}
				/>
			) : (
				<p>У вас нет проектов</p>
			)}
		</>
	)
}

MyProjectsPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default MyProjectsPage
