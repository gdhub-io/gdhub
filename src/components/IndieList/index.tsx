import { useTranslate } from '@tolgee/react'
import { Typography } from 'antd'
import { SeasonProjectsSection } from '../SeasonProjectsSection'

const { Title, Paragraph } = Typography

export const IndieList = () => {
	const { t } = useTranslate()

	return (
		<>
			<Title level={2} style={{ marginTop: 60 }}>
				{t('component.indieList.title', 'Game Projects')}
			</Title>
			<Paragraph>{t('component.indieList.description', 'Projects developed independently by users.')}</Paragraph>

			<SeasonProjectsSection seasonSlug="indie" />
		</>
	)
}
