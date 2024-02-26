import { T } from '@tolgee/react'
import { Typography } from 'antd'
import { SeasonProjectsSection } from '../SeasonProjectsSection'

const { Title, Paragraph } = Typography

export const IndieList = () => {
	return (
		<>
			<Title level={3} style={{ marginTop: 60 }}>
				<T>Other Game Projects</T>
			</Title>
			<Paragraph>
				<T>Projects developed independently by community members (outside the incubation program).</T>
			</Paragraph>

			<SeasonProjectsSection seasonSlug="indie" />
		</>
	)
}
