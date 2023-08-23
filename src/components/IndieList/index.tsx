import { Typography } from 'antd'
import { SeasonProjectsSection } from '../SeasonProjectsSection'

const { Title, Paragraph } = Typography

export const IndieList = () => {
	return (
		<>
			<Title level={3} style={{ marginTop: 60 }}>
				Другие проекты
			</Title>
			<Paragraph>
				Проекты разрабатываемые участниками сообщества самостоятельно (вне инкубационной программы).
			</Paragraph>

			<SeasonProjectsSection seasonSlug="indie" />
		</>
	)
}
