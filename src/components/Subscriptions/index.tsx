import { Alert, Card, Col, Row, Typography } from 'antd'

const { Title, Text, Paragraph } = Typography

export const SubscriptionsList = () => {
	return (
		<Row gutter={16}>
			<Col span={10} offset={2}>
				<Card title="Gamelab" extra={<></>} type="inner" actions={[<>Бесплатно</>]}>
					<Paragraph type="secondary">
						Инкубационная программа, позволяющая начать разработку проекта по заданному пайплайну с менторской
						поддержкой.
					</Paragraph>
					<Paragraph>
						Данный формат работы включает:
						<ul>
							<li>Инструменты для формирования команды</li>
							<li>Инструменты оценки прогесса</li>
							<li>Менторская поддержка</li>
							<li>Информационная поддержка</li>
						</ul>
						<Alert action="Запуск проектов проходит не чаще 4 раз в год" />
					</Paragraph>
				</Card>
			</Col>
			<Col span={10}>
				<Card title="Indie" type="inner" actions={[<>Бесплатно</>]}>
					<Paragraph type="secondary">Самостоятельная работа над проектом для тех, кому не подходит Gamelab.</Paragraph>
					<Paragraph>
						Данный формат работы включает:
						<ul>
							<li>Инструменты для формирования команды</li>
							<li>Информационная поддержка</li>
						</ul>
					</Paragraph>
				</Card>
			</Col>
		</Row>
	)
}
