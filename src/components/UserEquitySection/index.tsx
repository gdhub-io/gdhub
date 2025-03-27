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

	const suffixStyle = {
		fontSize: '16px',
		fontWeight: 400,
	}

	return (
		<Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: '32px' }}>
			<Title level={4}>{t('Your Participation')}</Title>

			<Row gutter={[16, 16]}>
				{Boolean(summary?.data.promisedEquity) && (
					<Col xs={24} sm={12} md={6}>
						<Card style={{ height: '100%', textAlign: 'center' }}>
							<Statistic
								title={t('Promised Equity')}
								value={summary?.data.promisedEquity}
								suffix={<span style={suffixStyle}>%</span>}
								precision={1}
								valueStyle={valueStyle}
							/>
							{summary?.data.workflowStepForVested && (
								<Text type="secondary" style={{ fontSize: '12px' }}>
									{t('After completing')} <b>&quot;{summary?.data.workflowStepForVested}&quot;</b>{' '}
									{t('promised equity will become actual')}
								</Text>
							)}
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
						<Card style={{ height: '100%', textAlign: 'center' }}>
							<Statistic
								title={t('Actual Equity')}
								value={summary?.data.actualEquity}
								suffix={<span style={suffixStyle}>%</span>}
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
					<Card style={{ height: '100%', textAlign: 'center' }}>
						<Statistic
							title={t('Days on Project')}
							value={daysOnProject}
							suffix={<span style={suffixStyle}>{t('days')}</span>}
							valueStyle={valueStyle}
						/>
						{summary?.data.startedAt && (
							<Text type="secondary" style={{ fontSize: '12px' }}>
								{t('Since')}: {dayjs(summary?.data.startedAt).format('DD.MM.YYYY')}
							</Text>
						)}
					</Card>
				</Col>

				<Col xs={24} sm={12} md={6}>
					<Card style={{ height: '100%', textAlign: 'center' }}>
						<Statistic
							title={t('Available Hours')}
							value={summary?.data.availableHours[0] + ' - ' + summary?.data.availableHours[1]}
							suffix={<span style={suffixStyle}>{t('hours/week')}</span>}
							valueStyle={valueStyle}
						/>
						<Text type="secondary" style={{ fontSize: '12px' }}>
							{t('Weekly commitment')}
						</Text>
					</Card>
				</Col>
			</Row>
		</Space>
	)
}

export default UserEquitySection
