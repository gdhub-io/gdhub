/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useRef, useState } from 'react'
import { PageViews } from '@/components/PageViews'
import { PublicLayout } from '@/layouts/PublicLayout'
import { ArrowLeftOutlined, ClockCircleOutlined, LockOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Button, Card, Flex, Image as AntImage, Spin, Typography } from 'antd'
import axios from 'axios'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { getSession } from 'next-auth/react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import styles from './styles.module.scss'

const { Text } = Typography

interface Post {
	id: string
	title: string
	content: string
	coverImage?: string
	createdAt: string
	viewsCount: number
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
		const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
		const { data: post } = await axios.get(`${baseUrl}/api/devlog/${projectReportId}`)

		console.log('Post data:', {
			coverImage: post.coverImage,
			projectCoverImage: post.project?.coverImage,
			contentLength: post.content?.length,
		})

		// Обрезаем контент для неавторизованных пользователей
		if (!session) {
			const truncatedContent = post.content.length > 500 ? post.content.slice(0, 500) + '...' : post.content
			post.content = truncatedContent
		}

		// Определяем pageCover из контента
		const markdownImages = post.content.match(/!\[.*?\]\((.*?)\)/g) || []
		const htmlImages = post.content.match(/<img[^>]+src="([^">]+)"/g) || []
		const allImages = [...markdownImages, ...htmlImages]

		console.log('Found images:', {
			markdownImages,
			htmlImages,
			allImages,
		})

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

		console.log('Image extraction:', {
			firstImageFromContent,
			projectCoverImage: post.project?.image,
		})

		post.pageCover = firstImageFromContent || post.project?.image

		console.log('Final pageCover:', post.pageCover)

		return {
			props: {
				post,
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

const MarkdownImage = ({ src, alt }: { src: string; alt: string }) => {
	const [isClient, setIsClient] = useState(false)

	useEffect(() => {
		setIsClient(true)
	}, [])

	if (!isClient) {
		return (
			<span style={{ display: 'block', margin: '16px 0' }}>
				<img
					src={src}
					alt={alt}
					style={{
						maxWidth: '100%',
						height: 'auto',
						borderRadius: '8px',
					}}
				/>
			</span>
		)
	}

	return (
		<span style={{ display: 'block', margin: '16px 0' }}>
			<AntImage
				src={src}
				alt={alt}
				preview={true}
				style={{
					maxWidth: '100%',
					height: 'auto',
					borderRadius: '8px',
				}}
			/>
		</span>
	)
}

export default function ProjectReport({ post, isAuthenticated }: PageProps) {
	const router = useRouter()
	const { projectReportId } = router.query
	const { t } = useTolgee()

	const getInitials = (title: string) => {
		if (!title) return ''
		return title
			.split(' ')
			.map((word) => word[0])
			.join('')
			.toUpperCase()
			.slice(0, 2)
	}

	const DefaultCover = () => (
		<div className={styles.defaultCover}>
			<div className={styles.defaultCoverContent}>
				<div className={styles.defaultCoverInitials}>{getInitials(post?.project?.name || '')}</div>
			</div>
		</div>
	)

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
			<Head>
				{post.pageCover && (
					<>
						<meta property="og:image" content={post.pageCover} />
						<meta property="twitter:image" content={post.pageCover} />
					</>
				)}
			</Head>
			<PublicLayout
				title={t('page.devlog.title', 'Project report by {projectName}', {
					projectName: post?.project?.name || 'Untitled',
				})}
				subTitle={post?.project?.description || undefined}
				extra={headerExtra}
				backgroundImage={post.pageCover || undefined}
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
							<ReactMarkdown
								rehypePlugins={[rehypeSanitize]}
								components={{
									img: ({ node, ...props }) => <MarkdownImage src={props.src || ''} alt={props.alt || ''} />,
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
							{!isAuthenticated && (
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
