import { useTranslate } from '@tolgee/react'
import { Typography } from 'antd'
import styles from './style.module.scss'

export const EmptyDevLog = ({ projectName }: { projectName?: string }) => {
	const { t } = useTranslate()

	return (
		<div className={styles.emptyDevLog}>
			<div className={styles.emptyIllustration}>
				<svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
					<rect x="40" y="40" width="120" height="80" rx="4" fill="#f0f0f0" stroke="#d9d9d9" strokeWidth="2" />
					<rect x="50" y="50" width="100" height="10" rx="2" fill="#d9d9d9" />
					<rect x="50" y="70" width="80" height="6" rx="2" fill="#d9d9d9" />
					<rect x="50" y="85" width="60" height="6" rx="2" fill="#d9d9d9" />
					<rect x="50" y="100" width="40" height="6" rx="2" fill="#d9d9d9" />
					<path d="M100 140 L110 130 L90 130 Z" fill="#1890ff" />
					<circle cx="100" cy="150" r="10" fill="#1890ff" />
				</svg>
			</div>
			<Typography.Title level={4}>{t('devlog.empty.title', 'Your devlog is empty')}</Typography.Title>
			<Typography.Paragraph className={styles.emptyDescription}>
				{t('devlog.empty.description', 'Share your progress on the development of {projectName}', {
					projectName: projectName || 'your game',
				})}
				{t('devlog.empty.description2', ' will help attract attention to the project and get feedback.')}
			</Typography.Paragraph>
		</div>
	)
}
