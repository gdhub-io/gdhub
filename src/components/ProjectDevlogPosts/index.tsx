import React, { useState } from 'react'
import { PageViews } from '@/components/PageViews'
import { ClockCircleOutlined, HistoryOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Flex, Typography, Skeleton } from 'antd'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './styles.module.scss'

const { Title, Text } = Typography

interface DevlogPost {
	id: string
	projectId: string
	content: string
	coverImage?: string
	publishedAt: string
	video: string | null
	project?: {
		name: string
		coverImage: string
		slug: string
	}
}

interface ProjectDevlogPostsProps {
	projectId: string
}

const DefaultCover = ({ title }: { title: string }) => {
	return (
		<div className={styles.defaultCover}>
			<div className={styles.defaultCoverContent}>
				<div className={styles.defaultCoverInitials}>{title ? title.charAt(0).toUpperCase() : '?'}</div>
			</div>
		</div>
	)
}

const PostCard: React.FC<{ post: DevlogPost; onClick: (e: React.MouseEvent) => void }> = ({ post, onClick }) => {
	const { t } = useTolgee()
	const router = useRouter()
	const [imageError, setImageError] = useState(false)
	const [contentImageError, setContentImageError] = useState(false)

	const cleanMarkdown = (text: string) => {
		return text
			.replace(/\*\*(.*?)\*\*/g, '$1') // Удаляем **
			.replace(/\*(.*?)\*/g, '$1') // Удаляем *
			.replace(/\[(.*?)\]\((.*?)\)/g, '$1') // Удаляем [text](url)
			.replace(/!\[(.*?)\]\((.*?)\)/g, '') // Удаляем ![alt](url)
			.replace(/#{1,6}\s/g, '') // Удаляем заголовки
			.replace(/`(.*?)`/g, '$1') // Удаляем код
			.replace(/```.*?\n([\s\S]*?)```/g, '$1') // Удаляем блоки кода
			.trim()
	}

	const handleProjectClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		router.push(`/project/${post.project?.slug}`)
	}

	const truncateText = (text: string | undefined, maxLength: number) => {
		if (!text) return ''
		if (text.length <= maxLength) return text
		return text.slice(0, maxLength) + '...'
	}

	const getInitials = (title: string) => {
		if (!title) return ''
		return title
			.split(' ')
			.map((word) => word[0])
			.join('')
			.toUpperCase()
			.slice(0, 2)
	}

	const formatDate = (dateString: string | undefined) => {
		if (!dateString) return ''
		try {
			const date = new Date(dateString)
			return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		} catch (e) {
			return ''
		}
	}

	const getImageFromContent = (content: string) => {
		const imgMatch = content.match(/!\[.*?\]\((.*?)\)/) || content.match(/<img[^>]+src="([^">]+)"/)
		return imgMatch ? imgMatch[1] : null
	}

	const stripHtml = (html: string) => {
		return html.replace(/<[^>]*>/g, '')
	}

	return (
		<Link href={`/devlog/${post.id}`}>
			<div className={styles.postCard} onClick={onClick}>
				<div className={styles.postContent}>
					<div className={styles.postImage}>
						{!imageError && post.coverImage ? (
							<Image
								src={post.coverImage}
								alt={post.project?.name || ''}
								width={240}
								height={240}
								unoptimized
								onError={() => setImageError(true)}
							/>
						) : !contentImageError && getImageFromContent(post.content) ? (
							<Image
								src={getImageFromContent(post.content)!}
								alt={post.project?.name || ''}
								width={240}
								height={240}
								unoptimized
								onError={() => setContentImageError(true)}
							/>
						) : !contentImageError && post.project?.coverImage ? (
							<Image
								src={post.project.coverImage}
								alt={post.project.name}
								width={240}
								height={240}
								unoptimized
								onError={() => setContentImageError(true)}
							/>
						) : (
							<div className={styles.defaultCover}>
								<div className={styles.defaultCoverContent}>
									<div className={styles.defaultCoverInitials}>{getInitials(post.project?.name || '')}</div>
								</div>
							</div>
						)}
					</div>
					<div className={styles.textContent}>
						<p className={styles.postExcerpt}>{truncateText(cleanMarkdown(stripHtml(post.content)), 300)}</p>
						<div className={styles.postMeta}>
							<Link href={`/project/${post.project?.slug}`} onClick={(e) => e.stopPropagation()}>
								{post.project?.name}
							</Link>
							<span role="separator">•</span>
							<span>
								<ClockCircleOutlined style={{ marginRight: 4 }} />
								{formatDate(post.publishedAt)}
							</span>
							<PageViews path={`/devlog/${post.id}`} />
						</div>
					</div>
				</div>
			</div>
		</Link>
	)
}

const PostSkeleton = () => {
	return (
		<div className={styles.postCard}>
			<div className={styles.postContent}>
				<div className={styles.postImage}>
					<Skeleton.Node active style={{ width: 240, height: 240 }} />
				</div>
				<div className={styles.textContent}>
					<Skeleton.Input active style={{ width: '70%', height: 24, marginBottom: 8 }} />
					<Skeleton active paragraph={{ rows: 2 }} style={{ marginBottom: 12 }} />
					<div className={styles.postMeta}>
						<Skeleton.Input active style={{ width: '30%', height: 16 }} />
						<span>•</span>
						<Skeleton.Input active style={{ width: '20%', height: 16 }} />
					</div>
				</div>
			</div>
		</div>
	)
}

const ProjectDevlogPosts: React.FC<ProjectDevlogPostsProps> = ({ projectId }) => {
	const { t } = useTolgee()

	const { data: projectReports, isLoading } = useQuery(
		['project-reports', projectId],
		() =>
			axios.get<DevlogPost[]>(`/api/project/reports`, {
				params: { projectId },
			}),
		{
			enabled: !!projectId,
			refetchOnWindowFocus: false,
		}
	)

	const posts = projectReports?.data || []

	if (isLoading) {
		return (
			<div className={styles.devlogPostsContainer}>
				<Flex justify="space-between" wrap>
					<Title level={2}>
						<HistoryOutlined style={{ marginRight: 8 }} />
						{t('page.project.last-updates', 'Last updates')}
					</Title>
				</Flex>
				<div className={styles.postsList}>
					{[...Array(3)].map((_, index) => (
						<div key={index} className={styles.postWrapper}>
							<PostSkeleton />
						</div>
					))}
				</div>
			</div>
		)
	}

	if (!posts.length) {
		return <div className={styles.empty}>{t('No devlog posts yet')}</div>
	}

	return (
		<div className={styles.devlogPostsContainer}>
			<Flex justify="space-between" wrap>
				<Title level={2}>
					<HistoryOutlined style={{ marginRight: 8 }} />
					{t('page.project.last-updates', 'Last updates')}
				</Title>
			</Flex>

			<div className={styles.postsList}>
				{posts.map((post) => (
					<div key={post.id} className={styles.postWrapper}>
						<PostCard post={post} onClick={(e) => e.stopPropagation()} />
					</div>
				))}
			</div>
		</div>
	)
}

export default ProjectDevlogPosts
