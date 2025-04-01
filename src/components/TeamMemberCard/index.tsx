import { useEffect } from 'react'
import React from 'react'
import { useGameDifficulties, useGameGenres, useGameSettings } from '@/hooks/library'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { TbBrandTelegram } from '@react-icons/all-files/tb/TbBrandTelegram'
import { TbMail } from '@react-icons/all-files/tb/TbMail'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Col, Descriptions, Modal, Row, Space, Spin, Button } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import Image from 'next/image'
import Link from 'next/link'
import styles from './style.module.scss'

interface TeamMemberCardProps {
	memberId: string
	open: boolean
	onCancel: () => void
}

const TeamMemberCard = ({ memberId, open, onCancel }: TeamMemberCardProps) => {
	const { t } = useTolgee()
	const { getGameGenreName } = useGameGenres()
	const { getGameSettingName } = useGameSettings()
	const { getGameDifficultyName } = useGameDifficulties()

	const {
		data: member,
		refetch: refetchMember,
		isFetching: processing,
	} = useQuery(
		['team-member', memberId],
		() =>
			axios.get<
				prismaClient.TeamMember & {
					team: { project: prismaClient.Project }
					speciality: prismaClient.Speciality
					user: prismaClient.User & {
						specialities: prismaClient.Speciality[]
						profile: prismaClient.Profile & {
							preferedGenres: prismaClient.GameGenre[]
							preferedSettings: prismaClient.GameSetting[]
							preferedDifficulties: prismaClient.GameDifficultyLevel[]
						}
					}
				}
			>('/api/user/project/team/member', {
				params: { id: memberId },
			}),
		{ enabled: !!memberId, refetchInterval: false, refetchOnWindowFocus: false }
	)

	useEffect(() => {
		if (open && memberId) {
			refetchMember()
		}
	}, [open])

	const handleCancel = () => {
		onCancel()
	}

	return (
		<Modal
			centered
			title={<T>Team Member Card</T>}
			width={800}
			destroyOnClose
			maskClosable={false}
			open={open}
			onCancel={handleCancel}
			confirmLoading={processing}
			footer={null}
		>
			<Spin spinning={processing}>
				{!!member && (
					<>
						<Row gutter={[24, 24]}>
							<Col xs={{ span: 24, order: 1 }} md={{ span: 18, order: 0 }}>
								<div className={styles.specialityTitle}>
									<h1>{member?.data.user.name}</h1>
									{member?.data.speciality.name} ({member?.data.speciality.level})
								</div>

								<Descriptions layout="horizontal" column={1} size="small" labelStyle={{ fontWeight: 'bold' }}>
									<Descriptions.Item label={t('Project')}>{member.data.team.project.name}</Descriptions.Item>
									<Descriptions.Item label={t('Joined')}>
										{dayjs(member.data.startedAt).format('LLL')}
									</Descriptions.Item>
								</Descriptions>

								<Descriptions
									title={t('About the participant')}
									className={styles.descriptionBlock}
									layout="horizontal"
									column={1}
									size="small"
									labelStyle={{ fontWeight: 'bold' }}
								>
									{!!member?.data.speciality.portfolioUrl && (
										<Descriptions.Item label={<T>CV/Portfolio</T>}>
											<Link href={member?.data.speciality.portfolioUrl} target="_blank">
												<Button size="small">
													<T>Go</T>
												</Button>
											</Link>
										</Descriptions.Item>
									)}
									<Descriptions.Item label={<T>Free time</T>}>
										<T
											keyName="fromTo"
											defaultValue="from {fromDate} to {toDate} hours a week"
											params={{
												fromDate: member.data.user.profile.timeForWork[0],
												toDate: member.data.user.profile.timeForWork[1],
											}}
										/>
									</Descriptions.Item>
									<Descriptions.Item label={<T>Place of residence</T>}>
										{[member.data.user.profile.country, member.data.user.profile.city].join(', ')}
									</Descriptions.Item>
									<Descriptions.Item label={<T>Motivation</T>}>{member.data.user.profile.motivation}</Descriptions.Item>
								</Descriptions>
							</Col>
							<Col xs={{ span: 24, order: 0 }} md={{ span: 6, order: 1 }}>
								<Space direction="vertical" align="center" style={{ width: '100%' }}>
									{!!member.data.user.image && (
										<div className={styles.avatar}>
											<Image src={member.data.user.image} alt="project member avatar" width={160} height={160} />
										</div>
									)}
									{!!member.data?.allowedContacts.includes('email') && (
										<Link target="_blank" href={'mailto:' + member.data.user.email}>
											<Button icon={<TbMail size={16} style={{ position: 'relative', marginRight: 5 }} />}>
												Email
											</Button>
										</Link>
									)}

									{!!member.data?.allowedContacts.includes('telegram') && (
										<Link target="_blank" href={'https://t.me/' + member.data?.user.profile.tgNickname}>
											<Button icon={<TbBrandTelegram size={16} style={{ position: 'relative', marginRight: 5 }} />}>
												Telegram
											</Button>
										</Link>
									)}
								</Space>
							</Col>
						</Row>

						<Descriptions
							title={t('About specialty')}
							className={styles.descriptionBlock}
							layout="vertical"
							column={1}
							size="small"
							labelStyle={{ fontWeight: 'bold' }}
						>
							<Descriptions.Item label={t('Specialization')}>{member.data.speciality.specialization}</Descriptions.Item>
							<Descriptions.Item label={t('Skills')}>{member.data.speciality.skills}</Descriptions.Item>
							<Descriptions.Item label={t('I use it in work')}>
								{member.data.speciality.tools || t('(tools are not indicated)')}
							</Descriptions.Item>
							<Descriptions.Item label={t('Experience')}>
								{member.data.speciality.jobs || t('(places of work are not indicated)')}
							</Descriptions.Item>
							<Descriptions.Item label={t('Where I received knowledge')}>
								{member.data.speciality.schools || t('(places of training are not indicated)')}
							</Descriptions.Item>
						</Descriptions>
					</>
				)}
			</Spin>
		</Modal>
	)
}

export default TeamMemberCard
