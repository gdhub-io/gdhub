import { useState } from 'react'
import { useWorkDirections } from '@/hooks/library'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Avatar, Card, Col, Form, Row, Select, Spin, Tag, Typography } from 'antd'
import axios from 'axios'
import styles from './styles.module.scss'

const { Text, Title } = Typography

type Mentor = {
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

const MentorsPage = () => {
	const { t } = useTolgee()
	const [selectedWorkDirection, setSelectedWorkDirection] = useState<string | undefined>(undefined)
	const { options: workDirectionOptions } = useWorkDirections()

	const { data: mentors, isLoading } = useQuery<Mentor[]>(
		['mentors', selectedWorkDirection],
		() => axios.get('/api/mentors', { params: { workDirectionId: selectedWorkDirection } }).then((res) => res.data),
		{ keepPreviousData: true }
	)

	const handleFilterChange = (value: string) => {
		setSelectedWorkDirection(value || undefined)
	}

	const getTelegramExpertLink = (specialityId: string) => {
		return `https://t.me/gdhub_experts_bot/app?startapp=expert_${specialityId}`
	}

	const handleMentorClick = (mentor: Mentor) => {
		if (mentor.specialities.length > 0) {
			window.open(getTelegramExpertLink(mentor.specialities[0].id), '_blank')
		}
	}

	return (
		<ProtectedLayout
			title={t('mentors.page.title', 'Mentors')}
			subTitle={t(
				'mentors.page.description',
				'On this page, you can find mentors who are ready to help with your questions. Click on a mentor card to contact them via Telegram'
			)}
			seo={{
				title: t('mentors.page.title', 'Mentors'),
				description: t(
					'mentors.page.description',
					'On this page, you can find mentors who are ready to help with your questions.'
				),
			}}
		>
			<div className={styles.filterContainer}>
				<Form variant="filled">
					<Select
						allowClear
						placeholder={t('mentors.page.filter', 'Filter by specialization')}
						options={workDirectionOptions}
						onChange={handleFilterChange}
						className={styles.filterSelect}
					/>
				</Form>
			</div>

			<Spin spinning={isLoading}>
				<div className={styles.mentorsHint}>
					<Text type="secondary">
						<T keyName="mentors.page.click_hint">Click on a mentor card to contact them via Telegram</T>
					</Text>
				</div>
				<Row gutter={[24, 24]} className={styles.mentorsGrid}>
					{mentors?.map((mentor) => (
						<Col xs={24} sm={12} md={8} lg={6} key={mentor.id}>
							<Card className={styles.mentorCard} hoverable onClick={() => handleMentorClick(mentor)}>
								<div className={styles.mentorCardHeader}>
									<div className={styles.mentorCardAvatar}>
										{mentor.image ? (
											<Avatar size="large" src={mentor.image} shape="square" />
										) : (
											<Avatar size="large" shape="square" style={{ background: '#1890ff' }}>
												{mentor.name?.charAt(0).toUpperCase()}
											</Avatar>
										)}
									</div>
									<div className={styles.mentorCardInfo}>
										<Title level={3} className={styles.mentorCardName}>
											{mentor.name}
										</Title>
										{mentor.specialities.length > 0 && (
											<>
												<Text type="secondary" className={styles.mentorSpeciality}>
													{mentor.specialities[0].name}
												</Text>
												<div className={styles.mentorTags}>
													<Tag color="blue">{mentor.specialities[0].direction.name}</Tag>
													<Tag color="green">{mentor.specialities[0].level}</Tag>
												</div>
											</>
										)}
									</div>
								</div>
								<div className={styles.mentorCardContent}>
									<div className={styles.questionsSection}>
										<Text type="secondary" strong>
											<T keyName="mentors.page.telegram.questions">Ready to answer questions about:</T>
										</Text>
										<ul className={styles.questionsList}>
											{mentor.specialities.flatMap((s) =>
												s.openForQuestions.map((q, idx) => <li key={`${s.id}-${idx}`}>{q}</li>)
											)}
										</ul>
									</div>
									{mentor.profile?.tgNickname && (
										<div className={styles.telegramLink}>
											<Text type="secondary">
												<T keyName="mentors.page.telegram.label">Telegram:</T>
											</Text>
											<a href={`https://t.me/${mentor.profile.tgNickname}`} target="_blank" rel="noopener noreferrer">
												@{mentor.profile.tgNickname}
											</a>
										</div>
									)}
								</div>
							</Card>
						</Col>
					))}
				</Row>

				{mentors?.length === 0 && !isLoading && (
					<div className={styles.noResults}>
						<Text>
							<T keyName="mentors.page.noResults">No mentors found with the selected filter.</T>
						</Text>
					</div>
				)}
			</Spin>
		</ProtectedLayout>
	)
}

export default MentorsPage
