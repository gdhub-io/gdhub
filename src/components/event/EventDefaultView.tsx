import React from 'react'
import { formatEventPeriod } from '@/helpers/format'
import { gtmEventTrigger } from '@/helpers/gtm'
import { useTolgee } from '@tolgee/react'
import { Button, Typography, Divider, Avatar, Flex, Grid, theme } from 'antd'
import dayjs from 'dayjs'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import styles from './EventDefaultView.module.scss'

const { Title, Paragraph, Text } = Typography

const MAX_VISIBLE_SPEAKERS = 3

const EventDefaultView = ({ event, workDirections, schedule }: any) => {
	const { t, getLanguage } = useTolgee()
	const screens = Grid.useBreakpoint()
	const { data: session } = useSession()
	const { token } = theme.useToken()

	return (
		<Flex gap={48} align="flex-start" className={styles.contentContainer}>
			{/* Левая колонка: инфо */}
			<div style={{ flex: 1 }}>
				<Title level={2}>{t('event.about', 'About')}</Title>
				<Paragraph style={{ fontSize: 18 }}>
					<ReactMarkdown rehypePlugins={[rehypeRaw as any]}>{event.description || ''}</ReactMarkdown>
				</Paragraph>

				<Divider />

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
									<Text type="secondary" style={{ fontSize: 15, margin: '4px 0 10px 0' }}>
										<ReactMarkdown rehypePlugins={[rehypeRaw as any]}>{item.description || ''}</ReactMarkdown>
									</Text>
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
														{speakerSummary && <span style={{ fontSize: 13, color: '#888' }}>{speakerSummary}</span>}
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

				{!!event.url && dayjs().isBefore(dayjs(event.schedule[0]?.startDate)) && (
					<div style={{ maxWidth: 420, margin: '40px 0 0', textAlign: 'center' }}>
						{session ? (
							<Link
								href={event.url}
								target="_blank"
								onClick={() => {
									gtmEventTrigger('event-register-click', {
										event_category: event.type,
										event_label: event.title,
										value: event.url,
										page_url: window.location.href,
									})
								}}
							>
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
			{/* Правая колонка: картинка */}
			{event.image && screens.md && (
				<div style={{ flex: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
					<div
						style={{
							position: 'relative',
							width: '100%',
							maxWidth: 600,
							aspectRatio: '4/5',
							boxShadow: '0 4px 32px #0002',
							borderRadius: 18,
							overflow: 'hidden',
						}}
					>
						<Image src={event.image} alt={event.title} fill style={{ objectFit: 'cover' }} />
					</div>
				</div>
			)}
		</Flex>
	)
}

export default EventDefaultView
