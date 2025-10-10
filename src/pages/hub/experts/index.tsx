import { useState } from 'react'
import ExpertRequestModal from '@/components/modals/ExpertRequestModal'
import { useWorkDirections } from '@/hooks/library'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useQuery } from '@tanstack/react-query'
import { useTranslate } from '@tolgee/react'
import { Avatar, Button, Card, Col, Form, Row, Select, Spin, Tag, Typography } from 'antd'
import axios from 'axios'
import Link from 'next/link'
import styles from './styles.module.scss'

const { Text, Title } = Typography

type Expert = {
	id: string
	name: string
	image: string | null
	profile: {
		bio: string | null
		tgNickname: string | null
	} | null
	specialities: Array<{
		id: string
		name: string
		level: prismaClient.SkillLevel
		openForQuestions: string[]
		direction: {
			id: string
			name: string
		}
	}>
}

const ExpertsPage = () => {
	const { t } = useTranslate()
	const [selectedWorkDirection, setSelectedWorkDirection] = useState<string | undefined>(undefined)
	const [expertRequestModalOpen, setExpertRequestModalOpen] = useState<string | undefined>(undefined)
	const { options: workDirectionOptions } = useWorkDirections()

	const { data: experts, isLoading } = useQuery<{ data: Expert[] }>({
		queryKey: ['experts', selectedWorkDirection],
		queryFn: () => axios.get('/api/experts', { params: { workDirectionId: selectedWorkDirection } }),
		staleTime: Infinity,
	})

	const handleFilterChange = (value: string) => {
		setSelectedWorkDirection(value || undefined)
	}

	const getTelegramExpertLink = (specialityId: string) => {
		return `https://t.me/gdhub_experts_bot/app?startapp=expert_${specialityId}`
	}

	const handleExpertClick = async (expert: Expert) => {
		setExpertRequestModalOpen(expert.id)
	}

	return (
		<ProtectedLayout
			title={t('experts.page.title', 'Experts')}
			subTitle={t(
				'experts.page.description',
				'On this page, you can find experts who are ready to help with your questions. Click on a expert card to contact them via Telegram'
			)}
			seo={{
				title: t('experts.page.title', 'Experts'),
				description: t(
					'experts.page.description',
					'On this page, you can find experts who are ready to help with your questions.'
				),
			}}
			extra={
				<Link href="/hub/experts/my-requests">
					<Button>{t('page.experts.myExperts', 'My requests')}</Button>
				</Link>
			}
		>
			<div className={styles.filterContainer}>
				<Form variant="filled">
					<Select
						allowClear
						placeholder={t('experts.page.filter', 'Filter by direction')}
						options={workDirectionOptions}
						onChange={handleFilterChange}
						className={styles.filterSelect}
					/>
				</Form>
			</div>

			<Spin spinning={isLoading}>
				<Row gutter={[24, 24]} className={styles.mentorsGrid}>
					{experts?.data.map((expert) => (
						<Col xs={24} sm={12} md={8} lg={6} key={expert.id}>
							<Card className={styles.mentorCard} hoverable onClick={() => handleExpertClick(expert)}>
								<div className={styles.mentorCardHeader}>
									<div className={styles.mentorCardAvatar}>
										{expert.image ? (
											<Avatar size="large" src={expert.image} shape="square" />
										) : (
											<Avatar size="large" shape="square" style={{ background: '#1890ff' }}>
												{expert.name?.charAt(0).toUpperCase()}
											</Avatar>
										)}
									</div>
									<div className={styles.mentorCardInfo}>
										<Title level={3} className={styles.mentorCardName}>
											{expert.name}
										</Title>
										{expert.specialities.length > 0 && (
											<>
												<Text type="secondary" className={styles.mentorSpeciality}>
													{expert.specialities[0].name}
												</Text>
												<div className={styles.mentorTags}>
													<Tag color="blue">{expert.specialities[0].direction.name}</Tag>
													<Tag color="green">{expert.specialities[0].level}</Tag>
												</div>
											</>
										)}
									</div>
								</div>
								<div className={styles.mentorCardContent}>
									<div className={styles.questionsSection}>
										<Text type="secondary" strong>
											{t('experts.page.telegram.questions', 'Ready to answer questions about:')}
										</Text>
										<ul className={styles.questionsList}>
											{expert.specialities.flatMap((s: any) =>
												s.openForQuestions.map((q: any, idx: number) => <li key={`${s.id}-${idx}`}>{q}</li>)
											)}
										</ul>
									</div>
								</div>
							</Card>
						</Col>
					))}
				</Row>

				{experts?.data.length === 0 && !isLoading && (
					<div className={styles.noResults}>
						<Text>{t('experts.page.noResults', 'No experts found with the selected filter.')}</Text>
					</div>
				)}
			</Spin>

			<ExpertRequestModal
				open={!!expertRequestModalOpen}
				onCancel={() => setExpertRequestModalOpen(undefined)}
				onUpdate={() => setExpertRequestModalOpen(undefined)}
				expertId={expertRequestModalOpen || ''}
			/>
		</ProtectedLayout>
	)
}

export default ExpertsPage
