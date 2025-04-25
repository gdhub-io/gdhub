import React, { useState, useRef, useEffect } from 'react'
import { PageViews } from '@/components/PageViews'
import { ArrowLeftOutlined, ClockCircleOutlined, LockOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Button, Card, Flex, Image, Spin, Typography } from 'antd'
import axios from 'axios'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import styles from './styles.module.scss'
import { PublicLayout } from '../../../layouts/PublicLayout'

const { Title, Text } = Typography

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
}

export default function ProjectReport() {
	const router = useRouter()
	const { projectReportId } = router.query
	const { t } = useTolgee()
	const { data: session } = useSession()
	const [imageError, setImageError] = useState(false)
	const [contentImageError, setContentImageError] = useState(false)
	const [contentHeight, setContentHeight] = useState(0)
	const contentRef = useRef<HTMLDivElement>(null)

	const { data: post, isLoading } = useQuery<Post>({
		queryKey: ['projectReport', projectReportId],
		queryFn: async () => {
			const { data } = await axios.get(`/api/devlog/${projectReportId}`)
			return data
		},
		enabled: !!projectReportId,
	})

	useEffect(() => {
		if (contentRef.current) {
			const height = contentRef.current.offsetHeight
			setContentHeight(height)
		}
	}, [post?.content])

	const getImageFromContent = (content: string) => {
		const imgMatches = content.match(/!\[.*?\]\((.*?)\)/g) || content.match(/<img[^>]+src="([^">]+)"/g)
		return imgMatches
			? imgMatches
					.map((match) => {
						const srcMatch = match.match(/\((.*?)\)/) || match.match(/src="([^">]+)"/)
						return srcMatch ? srcMatch[1] : null
					})
					.filter(Boolean)
			: []
	}

	const firstImageFromContent = post?.content ? getImageFromContent(post.content)[0] : null
	const allImages = post?.content ? getImageFromContent(post.content) : []

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

	const headerImage = post?.coverImage
		? post.coverImage
		: firstImageFromContent
			? firstImageFromContent
			: post?.project?.coverImage
				? post.project.coverImage
				: undefined

	const isContentTruncated = post?.content ? post.content.length > 500 : false
	const truncatedContent = isContentTruncated && !session ? post?.content?.slice(0, 500) + '...' : post?.content || ''

	const contentWithLimitedImages =
		!session && allImages.length > 3
			? allImages.slice(0, 3).reduce((content, img) => {
					const imgPattern = new RegExp(`!\\[.*?\\]\\(${img}\\)|<img[^>]+src="${img}"`, 'g')
					return (content || '').replace(imgPattern, '')
				}, post?.content || '')
			: post?.content || ''

	if (isLoading) {
		return (
			<PublicLayout>
				<Flex justify="center" align="center" style={{ height: '100vh' }}>
					<Spin size="large" />
				</Flex>
			</PublicLayout>
		)
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
				{headerImage && (
					<>
						<meta property="og:image" content={headerImage} />
						<meta property="twitter:image" content={headerImage} />
					</>
				)}
			</Head>
			<PublicLayout
				title={t('page.devlog.title', 'Project report by {projectName}', {
					projectName: post?.project?.name || 'Untitled',
				})}
				subTitle={post?.project?.description || undefined}
				extra={headerExtra}
				backgroundImage={headerImage || undefined}
			>
				<div className={styles.container}>
					<Card>
						<Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
							<Flex align="center" gap={8}>
								{post?.author?.image && (
									<Image
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
										{post?.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}
									</Text>
								</Flex>
								<PageViews path={`/devlog/${post?.id}`} containerStyle={{ fontSize: '12px' }} />
							</Flex>
						</Flex>

						<div className={styles.content}>
							<ReactMarkdown
								rehypePlugins={[rehypeSanitize]}
								components={{
									img: ({ node, ...props }) => (
										<div style={{ margin: '16px 0' }}>
											<Image
												src={props.src || ''}
												alt={props.alt || ''}
												style={{
													maxWidth: '100%',
													height: 'auto',
													borderRadius: '8px',
												}}
											/>
										</div>
									),
									p: ({ node, ...props }) => (
										<p
											{...props}
											style={{
												margin: '16px 0',
												lineHeight: '1.6',
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
								}}
							>
								{(session ? post?.content : contentWithLimitedImages) || ''}
							</ReactMarkdown>
							{true && (
								<Card
									style={{
										marginTop: 24,
										background: 'rgba(0, 0, 0, 0.02)',
										border: '1px solid rgba(0, 0, 0, 0.06)',
									}}
								>
									<Flex align="center" justify="space-between">
										<Flex align="center" gap={8}>
											<LockOutlined />
											<Text type="secondary">
												{t('page.devlog.contentLocked', 'Full text is available to authorized users')}
											</Text>
										</Flex>
										<Link href="/signin">
											<Button type="primary">{t('page.devlog.signIn', 'Sign in')}</Button>
										</Link>
									</Flex>
								</Card>
							)}
						</div>
					</Card>
				</div>
			</PublicLayout>
		</>
	)
}
