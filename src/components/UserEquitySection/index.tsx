import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Card, Typography, Space, Row, Col, Statistic } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'

const { Text, Title } = Typography

interface UserEquitySectionProps {
	projectId?: string
}

const UserEquitySection = ({ projectId }: UserEquitySectionProps) => {
	const { t } = useTolgee()

	const {
		data: summary,
		refetch: fetchMemberEquity,
		isLoading: isLoadingMemberEquity,
	} = useQuery(
		['project-equity-member-current', projectId],
		() =>
			axios.get('/api/user/project/member/summary', {
				params: { projectId },
			}),
		{
			enabled: !!projectId,
		}
	)

	const daysOnProject = summary?.data.periodOnProject

	const valueStyle = {
		fontSize: '24px',
		fontWeight: 600,
	}

	return (
		<Space direction="vertical" size="middle" style={{ width: '100%' }}>
			<Title level={4}>{t('Your Project Equity')}</Title>

			<Row gutter={[16, 16]}>
				{Boolean(summary?.data.promisedEquity) && (
					<Col xs={24} sm={12} md={6}>
						<Card style={{ height: '100%' }}>
							<Statistic
								title={t('Promised Equity')}
								value={summary?.data.promisedEquity}
								suffix="%"
								precision={1}
								valueStyle={valueStyle}
							/>
							{summary?.data.nextMilestone && (
								<Text type="secondary" style={{ fontSize: '12px' }}>
									{t('Next milestone')}: {summary?.data.nextMilestone}
								</Text>
							)}
						</Card>
					</Col>
				)}

				{Boolean(summary?.data.actualEquity) && (
					<Col xs={24} sm={12} md={6}>
						<Card style={{ height: '100%' }}>
							<Statistic
								title={t('Actual Equity')}
								value={summary?.data.actualEquity}
								suffix="%"
								precision={1}
								valueStyle={valueStyle}
							/>
							<Text type="secondary" style={{ fontSize: '12px' }}>
								{t('Current vested equity')}
							</Text>
						</Card>
					</Col>
				)}

				<Col xs={24} sm={12} md={6}>
					<Card style={{ height: '100%' }}>
						<Statistic title={t('Days on Project')} value={daysOnProject} suffix={t('days')} valueStyle={valueStyle} />
						{summary?.data.startedAt && (
							<Text type="secondary" style={{ fontSize: '12px' }}>
								{t('Since')}: {dayjs(summary?.data.startedAt).format('DD.MM.YYYY')}
							</Text>
						)}
					</Card>
				</Col>

				<Col xs={24} sm={12} md={6}>
					<Card style={{ height: '100%' }}>
						<Statistic
							title={t('Available Hours')}
							value={summary?.data.availableHours[0] + ' - ' + summary?.data.availableHours[1]}
							suffix={t('hours/week')}
							valueStyle={valueStyle}
						/>
						<Text type="secondary" style={{ fontSize: '12px' }}>
							{t('Weekly commitment')}
						</Text>
					</Card>
				</Col>
			</Row>

			{summary?.data.nextMilestone && summary?.data.currentStep && (
				<Card>
					<Space direction="vertical" size="small" style={{ width: '100%' }}>
						<Text type="secondary">
							{t('Current Step')}: {summary?.data.currentStep}
						</Text>
						<Text type="secondary">
							{t('Next Milestone')}: {summary?.data.nextMilestone}
						</Text>
					</Space>
				</Card>
			)}
		</Space>
	)
}

export default UserEquitySection
