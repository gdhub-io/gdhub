import React from 'react'
import { formatEventPeriod } from '@/helpers/format'
import { useTolgee } from '@tolgee/react'
import { Button, Row, Col, Space, Typography, Divider, Avatar, Flex, Grid, theme } from 'antd'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import styles from './EventDefaultView.module.scss'

const { Title, Paragraph, Text } = Typography

const MAX_VISIBLE_SPEAKERS = 3

const EventConferenceOrGamelabView = ({ event, workDirections, schedule }: any) => {
	const { t, getLanguage } = useTolgee()
	const screens = Grid.useBreakpoint()
	const { data: session } = useSession()
	const { token } = theme.useToken()

	return (
		<div className={styles.contentContainer} style={{ position: 'relative' }}>
			{/* Картинка мероприятия по центру, перекрывает header */}
			{event.image && (
				<div
					style={{
						position: 'relative',
						display: 'flex',
						justifyContent: 'center',
						marginTop: -120,
						marginBottom: 32,
						zIndex: 2,
					}}
				>
					<div
						style={{
							position: 'relative',
							width: screens.xs ? '90vw' : '100%',
							maxWidth: '100%',
							aspectRatio: '16/9',
							boxShadow: '0 4px 32px #0002',
							borderRadius: 18,
							overflow: 'hidden',
						}}
					>
						<Image src={event.image} alt={event.title} fill style={{ objectFit: 'cover' }} />
					</div>
				</div>
			)}

			{/* Название и краткое описание */}
			<div style={{ textAlign: 'center', marginBottom: 16 }}>
				<Title level={1} style={{ marginBottom: 8 }}>
					{event.title}
				</Title>
				{event.shortDescription && <Text style={{ fontSize: 18, color: '#666' }}>{event.shortDescription}</Text>}

				<Flex justify="center" align="middle" gap={32} style={{ margin: '24px 0 0 0' }}>
					<Flex vertical align="center" gap={0}>
						<Text type="secondary" style={{ fontSize: 13 }}>
							{t('event.dates', 'Dates')}
						</Text>
						<Text strong style={{ fontSize: 16 }}>
							{schedule.length > 0
								? formatEventPeriod(
										schedule[0].startDate,
										schedule[schedule.length - 1].endDate,
										getLanguage() || 'en',
										'day'
									)
								: '-'}
						</Text>
					</Flex>
				</Flex>
			</div>

			<Row gutter={[32, 16]}>
				<Col xs={24}>
					<Space className={styles.contentContainer} direction="vertical" size={32} style={{ width: '100%' }}>
						<>
							<Title level={2}>{t('event.about', 'About')}</Title>
							<div style={{ fontSize: 18, whiteSpace: 'pre-line' }}>
								<ReactMarkdown rehypePlugins={[rehypeRaw as any]} remarkPlugins={[remarkGfm]} skipHtml={false}>
									{event.description || ''}
								</ReactMarkdown>
							</div>
						</>

						<Title level={2}>{t('event.schedule', 'Schedule')}</Title>
						<div
							style={{
								marginBottom: 32,
							}}
						>
							{schedule.map((item: any, idx: number) => {
								const visibleSpeakers = (item.speakers || []).slice(0, MAX_VISIBLE_SPEAKERS)
								const extraCount = (item.speakers?.length || 0) - MAX_VISIBLE_SPEAKERS

								return (
									<div
										key={item.id || idx}
										style={{
											background: '#fdfdfd',
											paddingInline: 16,
											borderRadius: 8,
											paddingBlock: 16,
											marginBottom: 16,
										}}
									>
										{/* Линия 1: дата и title */}
										<Flex align="center" gap={16} style={{ marginBottom: 4 }}>
											<span style={{ fontWeight: 600, fontSize: 15, color: '#222', whiteSpace: 'nowrap' }}>
												{formatEventPeriod(item.startDate, item.endDate, getLanguage() || 'en', 'daytime')}
											</span>

											{!!item.title && (
												<>
													<Divider type="vertical" style={{ height: 24 }} />

													<span
														style={{
															fontWeight: 600,
															fontSize: 15,
															color: '#222',
														}}
													>
														{item.title}
													</span>
												</>
											)}
										</Flex>

										{/* Линия 2: описание */}
										{item.description && (
											<div style={{ fontSize: 15, color: '#888', margin: '4px 0 10px 0', whiteSpace: 'pre-line' }}>
												<ReactMarkdown rehypePlugins={[rehypeRaw as any]} remarkPlugins={[remarkGfm]} skipHtml={false}>
													{item.description || ''}
												</ReactMarkdown>
											</div>
										)}

										{/* Линия 3: спикеры */}
										{item.speakers?.length > 0 && (
											<Flex gap={24} style={{ marginTop: 16, flexWrap: 'wrap' }}>
												{visibleSpeakers.map((sp: any, i: number) => {
													const speakerName = sp?.user?.profile?.name || sp?.user?.name || ''
													const speakerAvatar = sp?.user?.image || ''
													const speakerSpeciality = sp?.name || ''
													const speakerSummary = sp?.summary || ''
													return (
														<Flex key={sp.id || i} align="center" gap={12} style={{ minWidth: 220 }}>
															<Avatar
																size={48}
																src={speakerAvatar}
																style={{ background: '#eee', color: '#222', fontSize: 18 }}
															>
																{!speakerAvatar && speakerName ? speakerName[0] : null}
															</Avatar>
															<Flex vertical gap={0} style={{ minWidth: 0 }}>
																<span style={{ fontWeight: 600, fontSize: 15 }}>{speakerName}</span>
																{speakerSpeciality && (
																	<span style={{ fontSize: 13, color: token.colorTextSecondary, fontWeight: 500 }}>
																		{speakerSpeciality}
																	</span>
																)}
																{speakerSummary && (
																	<span style={{ fontSize: 13, color: '#888' }}>{speakerSummary}</span>
																)}
															</Flex>
														</Flex>
													)
												})}
												{extraCount > 0 && (
													<span style={{ marginLeft: 8, color: '#888', fontSize: 13 }}>+{extraCount}</span>
												)}
											</Flex>
										)}
									</div>
								)
							})}
						</div>
					</Space>
				</Col>
			</Row>
			{/* Кнопка регистрации внизу страницы */}
			{event.url && (
				<div style={{ maxWidth: 420, margin: '40px auto 0', textAlign: 'center' }}>
					{session ? (
						<Link href={event.url} target="_blank">
							<Button type="primary" size="large" style={{ width: '100%', maxWidth: 420 }}>
								{t('event.register', 'Register')}
							</Button>
						</Link>
					) : (
						<Link href="/registration">
							<Button type="primary" size="large" style={{ width: '100%', maxWidth: 420 }}>
								{t('event.loginOrRegister', 'Login / Register')}
							</Button>
						</Link>
					)}
				</div>
			)}
		</div>
	)
}

export default EventConferenceOrGamelabView
