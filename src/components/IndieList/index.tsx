import { T } from '@tolgee/react'
import { Typography } from 'antd'
import { SeasonProjectsSection } from '../SeasonProjectsSection'

const { Title, Paragraph } = Typography

export const IndieList = () => {
	return (
		<>
			<Title level={2} style={{ marginTop: 60 }}>
				<T>Recommendations for game projects</T>
			</Title>

			<SeasonProjectsSection seasonSlug="indie" />
		</>
	)
}
