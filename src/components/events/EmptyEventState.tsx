import React from 'react'
import { useTranslate } from '@tolgee/react'
import { Typography } from 'antd'
import Image from 'next/image'
import styles from './emptyState.module.scss'

const { Title, Paragraph } = Typography

const EmptyEventState: React.FC = () => {
	const { t } = useTranslate()

	return (
		<div className={styles.emptyStateContainer}>
			<div className={styles.imageContainer}>
				<Image
					src="/images/events-empty.png"
					alt="Event illustration"
					width={256}
					height={256}
					className={styles.emptyIllustration}
				/>
			</div>

			<Title level={4} className={styles.title}>
				{t('page.hub.events.empty.title', 'No events yet')}
			</Title>

			<Paragraph className={styles.description}>
				{t(
					'page.hub.events.empty.description',
					'There are currently no events. Stay tuned for upcoming meetups, workshops, and game jams!'
				)}
			</Paragraph>
		</div>
	)
}

export default EmptyEventState
