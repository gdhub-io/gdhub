'use client'

import GameCardList from '@/components/GameCard/GameCardList'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Typography } from 'antd'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

const { Paragraph } = Typography

/**
 * Projects page component that displays a list of indie game projects
 *
 * @returns {JSX.Element} Rendered component
 */
const ProjectsPage: NextPageWithLayout = () => {
	const { t } = useTolgee()
	const { data: session } = useSession()

	const {
		data: projects,
		isSuccess,
		isLoading,
	} = useQuery({ queryKey: ['projects'], queryFn: () => axios.get('/api/projects'), enabled: !!session?.user })

	return (
		<ProtectedLayout
			title={t('page.hab.projects.title', 'Indie Game Projects')}
			subTitle={t('page.hab.projects.subtitle', 'Projects developed independently by users')}
		>
			<div className={styles.container}>
				{!isSuccess && !isLoading && <Paragraph type="secondary">There are no projects available to view</Paragraph>}

				<GameCardList games={projects?.data || []} loading={isLoading} />
			</div>
		</ProtectedLayout>
	)
}

export default ProjectsPage
