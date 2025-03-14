import React from 'react'
import { useTolgee } from '@tolgee/react'
import { Typography } from 'antd'
import Image from 'next/image'
import styles from './emptyState.module.scss'

const { Title, Paragraph } = Typography

interface EmptyProjectsStateProps {
	onCreateProject: () => void
}

const EmptyProjectsState: React.FC<EmptyProjectsStateProps> = ({ onCreateProject }) => {
	const { t } = useTolgee()

	return (
		<div className={styles.emptyStateContainer}>
			<div className={styles.imageContainer}>
				<Image
					src="/images/new-project.png"
					alt="Game development illustration"
					width={256}
					height={256}
					className={styles.emptyIllustration}
				/>
			</div>

			<Title level={4} className={styles.title}>
				{t('page.hub.user-projects.empty.title', 'Start Your Game Development Journey')}
			</Title>

			<Paragraph className={styles.description}>
				{t(
					'page.hub.user-projects.empty.description',
					"You haven't created or joined any projects yet. Begin your game development journey by creating your own project or joining an existing team."
				)}
			</Paragraph>
		</div>
	)
}

export default EmptyProjectsState
