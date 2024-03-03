import MyProjectCandidates from '@/components/MyProjectCandidates'
import MyProjectReports from '@/components/MyProjectReports'
import MyProjectVacancies from '@/components/MyProjectVacancies'
import MyTeam from '@/components/MyTeam'
import { ProtectedProjectLayout } from '@/layouts/ProtectedProjectLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { Project, SeasonStage } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Col, Row, Space, Spin, Typography } from 'antd'
import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { HiExternalLink } from 'react-icons/hi'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'

const { Text } = Typography

const MyProjectPage: NextPageWithLayout = () => {
	const router = useRouter()
	const { t } = useTolgee()
	const slug = router.query.slug as string

	const { data: myProject, isLoading: isLoadingMyProject } = useQuery(
		['user-project', slug],
		() => axios.get<Project & { stage: SeasonStage }>('/api/user/project', { params: { slug } }),
		{
			enabled: !!slug,
			refetchInterval: 60000 * 5,
			refetchOnWindowFocus: false,
		}
	)

	return (
		<ProtectedProjectLayout>
			<Spin spinning={isLoadingMyProject}>
				<Row justify="space-between" align="top">
					<Col xs={{ span: 24 }} md={{ span: 12 }}>
						<h1>{myProject?.data.name}</h1>
					</Col>
					<Col xs={{ span: 24 }} md={{ span: 12 }} style={{ textAlign: 'right' }}>
						<Link href={`/project/${myProject?.data.slug || myProject?.data.id}`} target="_blank">
							<Button type="primary" icon={<HiExternalLink size={16} />}>
								<T>Project page</T>
							</Button>
						</Link>
					</Col>
				</Row>

				<Text style={{ marginTop: 16 }}>
					<ReactMarkdown rehypePlugins={[rehypeRaw as any]}>{myProject?.data.description || ''}</ReactMarkdown>
				</Text>

				{!!myProject?.data && <MyProjectReports project={myProject.data} />}
			</Spin>
		</ProtectedProjectLayout>
	)
}

export default MyProjectPage
