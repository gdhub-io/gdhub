/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from 'react'
import { PageViews } from '@/components/PageViews'
import { getCleanTextContent } from '@/helpers/content'
import { PublicLayout } from '@/layouts/PublicLayout'
import { ArrowLeftOutlined, ClockCircleOutlined, LockOutlined } from '@ant-design/icons'
import { useTolgee } from '@tolgee/react'
import { Button, Card, Flex, Image as AntImage, Typography } from 'antd'
import axios from 'axios'
import { GetServerSideProps } from 'next'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { getSession } from 'next-auth/react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import styles from './styles.module.scss'

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false })

const { Text } = Typography

interface Post {
	id: string
	title: string
	content: string
	coverImage?: string
	createdAt: string
	viewsCount: number
	video?: string
	author: {
		name: string
		image?: string
	}
	project?: {
		name: string
		slug: string
		description?: string
		coverImage?: string
	}
	pageCover?: string
}

interface PageProps {
	post: Post
	contentLength: number
	isAuthenticated: boolean
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (context) => {
	const projectReportId = context.params?.projectReportId as string
	const session = await getSession(context)

	if (!projectReportId) {
		return {
			notFound: true,
		}
	}

	try {
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
		const { data: post } = await axios.get(`${baseUrl}/api/devlog/${projectReportId}`)
		const contentLength = post.content.length

		// Обрезаем контент для неавторизованных пользователей
		if (!session) {
			const truncatedContent = post.content.length > 1000 ? post.content.slice(0, 1000) + '...' : post.content
			post.content = truncatedContent
		}

		// Определяем pageCover из контента
		const markdownImages = post.content.match(/!\[.*?\]\((.*?)\)/g) || []
		const htmlImages = post.content.match(/<img[^>]+src="([^">]+)"[^>]*>/g) || []
		const allImages = [...markdownImages, ...htmlImages]

		const firstImageFromContent =
			allImages.length > 0
				? allImages
						.map((match: string) => {
							// Пробуем найти URL в markdown формате
							const markdownMatch = match.match(/\((.*?)\)/)
							if (markdownMatch) return markdownMatch[1]

							// Пробуем найти URL в HTML формате
							const htmlMatch = match.match(/src="([^">]+)"/)
							if (htmlMatch) return htmlMatch[1]

							return null
						})
						.filter(Boolean)[0]
				: null

		// Убедимся, что pageCover всегда строка или null
		post.pageCover = firstImageFromContent || post.project?.coverImage || null

		return {
			props: {
				post,
				contentLength,
				isAuthenticated: !!session,
			},
		}
	} catch (error) {
		console.error('Error fetching post:', error)
		return {
			notFound: true,
		}
	}
}

const MarkdownImage = ({
	src,
	alt,
	width,
	height,
	isInline,
}: {
	src: string
	alt: string
	width?: string
	height?: string
	isInline?: boolean
}) => {
	const [isClient, setIsClient] = useState(false)

	useEffect(() => {
		setIsClient(true)
	}, [])

	const containerStyle = {
		display: isInline ? 'inline-block' : 'block',
		margin: isInline ? '0 8px' : '16px 0',
		verticalAlign: 'middle',
	}

	if (!isClient) {
		return (
			<span style={containerStyle}>
				<img
					src={src}
					alt={alt}
					width={width}
					style={{
						maxWidth: '100%',
						height: 'auto',
						borderRadius: '8px',
						verticalAlign: 'middle',
					}}
				/>
			</span>
		)
	}

	return (
		<span style={containerStyle} className={styles.imagePreview}>
			<AntImage
				src={src}
				alt={alt}
				width={width}
				preview={{
					rootClassName: styles.imagePreview,
				}}
				style={{
					maxWidth: '100%',
					height: 'auto',
					borderRadius: '8px',
					verticalAlign: 'middle',
				}}
			/>
		</span>
	)
}

export default function ProjectReport({ post, contentLength, isAuthenticated }: PageProps) {
	const { t } = useTolgee()

	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		return date.toISOString().split('T')[0].split('-').reverse().join('/')
	}

	if (!post) {
		return null
	}

	const headerExtra = (
		<Link href={`/project/${post.project?.slug}`}>
			<Button
				icon={<ArrowLeftOutlined />}
				type="text"
				className={styles.backButton}
				style={{
					color: 'rgba(255, 255, 255, 0.65)',
					transition: 'color 0.3s',
					position: 'relative',
					top: '4px',
				}}
				onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
				onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)')}
			/>
		</Link>
	)

	return (
		<>
			<PublicLayout
				title={t('page.devlog.title', 'Project report by {projectName}', {
					projectName: post?.project?.name || 'Untitled',
				})}
				subTitle={getCleanTextContent(post?.project?.description || '', 100) || undefined}
				extra={headerExtra}
				backgroundImage={post.pageCover || undefined}
				seo={{
					title: post?.project?.name || 'Untitled',
					description: getCleanTextContent(post?.content || ''),
					openGraph: {
						images: [
							{
								url: post.pageCover || '',
								alt: post?.project?.name || 'Untitled',
							},
						],
					},
				}}
			>
				<div className={styles.container}>
					<Card>
						<Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
							<Flex align="center" gap={8}>
								{post?.author?.image && (
									<AntImage
										src={post.author.image}
										alt={post.author.name}
										width={32}
										height={32}
										style={{ borderRadius: '50%' }}
									/>
								)}
								<Text strong>{post?.author?.name || 'Аноним'}</Text>
							</Flex>
							<Flex align="center" gap={16}>
								<Flex align="center" gap={8}>
									<ClockCircleOutlined style={{ fontSize: '12px' }} />
									<Text type="secondary" style={{ fontSize: '12px' }}>
										{post?.createdAt ? formatDate(post.createdAt) : ''}
									</Text>
								</Flex>
								<PageViews path={`/devlog/${post?.id}`} containerStyle={{ fontSize: '12px' }} />
							</Flex>
						</Flex>

						<div className={styles.content} style={{ position: 'relative' }}>
							{post.video && (
								<div className={styles.video}>
									<ReactPlayer url={post.video} width="100%" height="100%" controls />
								</div>
							)}
							<ReactMarkdown
								rehypePlugins={[
									[rehypeRaw as any],
									[
										rehypeSanitize as any,
										{
											tagNames: ['img', 'u', 'strong', 'em', 'a', 'p', 'br', 'div', 'span'],
											attributes: {
												img: ['src', 'alt', 'width', 'height', 'style'],
												a: ['href', 'target', 'rel'],
												'*': ['style', 'className'],
											},
										},
									],
								]}
								components={{
									img: ({ node, ...props }) => {
										// Проверяем, есть ли пробелы до и после тега img
										const isInline =
											(node?.position?.start?.column ?? 0) > 1 &&
											post?.content?.charAt(node?.position?.start?.offset ?? 0 - 1) !== '\n' &&
											post?.content?.charAt(node?.position?.end?.offset ?? 0) !== '\n'

										return (
											<MarkdownImage
												src={props.src || ''}
												alt={props.alt || ''}
												width={props.width as string}
												height={props.height as string}
												isInline={isInline}
											/>
										)
									},
									p: ({ node, ...props }) => (
										<p
											{...props}
											style={{
												margin: '16px 0',
												lineHeight: '1.6',
												whiteSpace: 'pre-wrap',
											}}
										/>
									),
									ul: ({ node, ...props }) => (
										<ul
											{...props}
											style={{
												margin: '16px 0',
												paddingLeft: '24px',
											}}
										/>
									),
									li: ({ node, ...props }) => (
										<li
											{...props}
											style={{
												margin: '8px 0',
											}}
										/>
									),
									u: ({ node, ...props }) => (
										<u
											{...props}
											style={{
												textDecoration: 'underline',
											}}
										/>
									),
								}}
							>
								{post?.content || ''}
							</ReactMarkdown>
							{!isAuthenticated && contentLength > post?.content?.length && (
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
													{t('page.devlog.contentLocked', 'Full text is available to authorized users')}
												</Text>
											</Flex>
											<Link href="/signin">
												<Button type="primary">{t('page.devlog.signIn', 'Sign in')}</Button>
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
