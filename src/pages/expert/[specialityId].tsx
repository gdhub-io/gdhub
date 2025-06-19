import React from 'react'
import { getCleanTextContent } from '@/helpers/content'
import { PublicLayout } from '@/layouts/PublicLayout'
import { prisma } from '@/services/prisma'
import { ArrowLeftOutlined, LockOutlined } from '@ant-design/icons'
import { useTolgee } from '@tolgee/react'
import { Typography, Button, Space, Card, Flex, Image as AntImage } from 'antd'
import { GetServerSidePropsContext } from 'next'
import Link from 'next/link'
import { getSession } from 'next-auth/react'
import styles from './style.module.scss'

const { Text, Title } = Typography

interface ExpertPageProps {
	isAuthenticated: boolean
	expert: any
	seo?: { title: string; description?: string; image?: string }
}

export default function ExpertPage({ expert, seo, isAuthenticated }: ExpertPageProps) {
	const { t } = useTolgee()

	if (!expert) {
		return null
	}

	return (
		<>
			<PublicLayout
				title={
					<div className={styles.titleContainer}>
						<Link href={`/experts`}>
							<Button
								type="text"
								size="small"
								className={styles.projectTitle}
								onMouseEnter={(e) => {
									const button = e.currentTarget
									const arrow = button.querySelector('.arrow') as HTMLElement
									if (arrow) {
										arrow.style.width = '16px'
										arrow.style.marginRight = '8px'
										arrow.style.opacity = '1'
									}
									button.style.paddingLeft = '8px'
									button.style.paddingRight = '8px'
								}}
								onMouseLeave={(e) => {
									const button = e.currentTarget
									const arrow = button.querySelector('.arrow') as HTMLElement
									if (arrow) {
										arrow.style.width = '0'
										arrow.style.marginRight = '0'
										arrow.style.opacity = '0'
									}
									button.style.paddingLeft = '0'
									button.style.paddingRight = '0'
								}}
							>
								<Space size={0}>
									<ArrowLeftOutlined
										className="arrow"
										style={{
											width: 0,
											marginRight: 0,
											opacity: 0,
											transition: 'all 0.3s ease',
											overflow: 'hidden',
											color: '#ff4d4f',
										}}
									/>
									<span style={{ color: '#ff4d4f' }}>{t('page.expert.back', 'Experts')}</span>
								</Space>
							</Button>
						</Link>
						<Title className={styles.title}>{expert.name}</Title>
					</div>
				}
				subTitle={getCleanTextContent(expert.speciality.summary || '', 100) || undefined}
				backgroundImage={expert.image || undefined}
				seo={{
					title: `${expert.name || 'Untitled Project'} - ${t('page.expert.title', 'Project reports')}`,
					description: getCleanTextContent(expert.speciality.summary || ''),
					openGraph: {
						images: [
							{
								url: expert.image || '',
								alt: expert.name || 'Untitled',
							},
						],
					},
				}}
				styles={{ content: { padding: 0 }, layoutBackground: { padding: 0 } }}
			>
				<div className={styles.container}>
					<Card>
						<Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
							<Flex align="center" gap={8}>
								{expert.image && (
									<AntImage
										src={expert.image}
										alt={expert.name}
										width={32}
										height={32}
										style={{ borderRadius: '50%' }}
										preview={false}
									/>
								)}
								<Text strong>{expert.name || 'Аноним'}</Text>
							</Flex>
						</Flex>

						<div className={styles.content} style={{ position: 'relative' }}>
							{!isAuthenticated && expert.speciality.summary?.length > 0 && (
								<div
									style={{
										position: 'absolute',
										bottom: 0,
										left: 0,
										right: 0,
										height: '300px',
										background:
											'linear-gradient(to bottom, transparent 0%, transparent 40%, rgba(255, 255, 255, 1) 60%, rgba(255, 255, 255, 1) 100%)',
										pointerEvents: 'none',
									}}
								>
									<Card
										style={{
											position: 'absolute',
											bottom: 0,
											left: 0,
											right: 0,
											background: 'transparent',
											border: 'none',
											pointerEvents: 'auto',
										}}
									>
										<Flex align="center" justify="space-between">
											<Flex align="center" gap={8}>
												<LockOutlined style={{ fontSize: '18px' }} />
												<Text strong style={{ fontSize: '16px', color: 'rgba(0, 0, 0, 0.85)' }}>
													{t('page.expert.contentLocked', 'Full text is available to authorized users')}
												</Text>
											</Flex>
											<Link href="/signin">
												<Button type="primary">{t('page.expert.signIn', 'Sign in')}</Button>
											</Link>
										</Flex>
									</Card>
								</div>
							)}
						</div>
					</Card>
				</div>
			</PublicLayout>
		</>
	)
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
	const session = await getSession(context)
	const { specialityId }: any = context.params

	console.log(specialityId)

	const expert = await prisma.user.findFirst({
		where: { specialities: { some: { id: specialityId } } },
		select: {
			id: true,
			name: true,
			image: true,
			investorInTeams: { select: { id: true, name: true } },
			lang: true,
			specialities: { where: { id: specialityId }, select: { id: true, name: true, summary: true } },
			profile: { select: { name: true, motivation: true } },
		},
	})

	if (!expert) {
		return { notFound: true }
	}

	const { specialities, ...expertData } = expert

	return {
		props: {
			isAuthenticated: !!session,
			expert: { ...expertData, speciality: specialities[0] },
			seo: {
				title: expert.profile?.name || expert.name || null,
				description: expert.profile?.motivation || null,
				image: expert.image || null,
			},
		},
	}
}
