import { PublicLayout } from '@/layouts/PublicLayout'
import { ClockCircleOutlined, UserOutlined } from '@ant-design/icons'
import { useTolgee } from '@tolgee/react'
import { Card, Flex, Image as AntImage, Typography } from 'antd'
import axios from 'axios'
import { GetServerSideProps } from 'next'
import Link from 'next/link'
import styles from './style.module.scss'

const { Text, Title } = Typography

interface BlogPost {
	id: string
	title: string
	slug: string
	content: any
	coverImage?: string
	publishedAt: string
	description?: string
	authors: Array<{
		name: string
		image?: string
	}>
}

interface PageProps {
	posts: BlogPost[]
}

export const getServerSideProps: GetServerSideProps<PageProps> = async () => {
	try {
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
		const response = await axios.get(`${baseUrl}/api/blog`)
		const posts = response.data || []

		return {
			props: {
				posts,
			},
		}
	} catch (error) {
		console.error('Error fetching blog posts:', error)
		return {
			props: {
				posts: [],
			},
		}
	}
}

export default function BlogPage({ posts }: PageProps) {
	const { t } = useTolgee()

	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		return date.toISOString().split('T')[0].split('-').reverse().join('/')
	}

	return (
		<PublicLayout
			title={t('page.blog.title', 'Blog')}
			subTitle={t('page.blog.subtitle', 'The latest news and articles')}
			seo={{ title: 'Blog | gdhub.io' }}
		>
			<div className={styles.container}>
				<div className={styles.header}>
					<Title level={2}>{t('page.blog.postsCount', '{{count}} posts', { count: posts.length })}</Title>
				</div>

				<div className={styles.posts}>
					{posts.map((post) => {
						const author = post.authors?.[0]
						return (
							<Link key={post.id} href={`/blog/${post.slug}`} className={styles.cardLink}>
								<Card className={styles.postCard} hoverable>
									{post.coverImage && (
										<div className={styles.coverImage}>
											<AntImage
												src={post.coverImage}
												alt={post.title}
												preview={false}
												style={{ width: '100%', height: '200px', objectFit: 'cover' }}
											/>
										</div>
									)}
									<div className={styles.postContent}>
										<div className={styles.postTopMeta}>
											<Text className={styles.postDate}>{formatDate(post.publishedAt)}</Text>
											<div className={styles.authorWrap}>
												{author?.image ? (
													<AntImage
														src={author.image}
														alt={author.name}
														width={28}
														height={28}
														style={{ borderRadius: '50%' }}
														preview={false}
													/>
												) : (
													<UserOutlined style={{ fontSize: '20px' }} />
												)}
												<Text className={styles.authorName}>{author?.name || 'Anonymous'}</Text>
											</div>
										</div>
										<Title level={4} className={styles.postTitle}>
											{post.title}
										</Title>
										{post.description && <Text className={styles.postExcerpt}>{post.description}</Text>}
										<div className={styles.readMoreWrap}>
											<button className={styles.readMoreBtn}>{t('page.blog.readMore', 'Read More')}</button>
										</div>
									</div>
								</Card>
							</Link>
						)
					})}
				</div>
			</div>
		</PublicLayout>
	)
}
