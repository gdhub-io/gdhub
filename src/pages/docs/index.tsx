import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@layouts/ProtectedLayout'
import { getDocumentationVideos } from '@services/airtable'
import { NextPageWithLayout } from 'pages/_app'
import { Card, Col, Row, Tag, Typography } from 'antd'
import CheckableTag from 'antd/lib/tag/CheckableTag'
import Image from 'next/future/image'
import Head from 'next/head'
import Link from 'next/link'
import styles from './style.module.less'

const DocsPage: NextPageWithLayout = ({ videos, tags }: any) => {
	const [selectedTags, setSelectedTags] = useState<string[]>([tags[0]])

	const checkTag = (tag: string, checked: boolean) => {
		if (tag === tags[0] && checked) {
			setSelectedTags([tags[0]])
			return
		}

		let nextSelectedTags = checked ? [...selectedTags, tag] : selectedTags.filter((t) => t !== tag)

		if (nextSelectedTags.length > 1 && nextSelectedTags.includes(tags[0])) {
			nextSelectedTags = nextSelectedTags.filter((t) => t !== tags[0])
		}

		setSelectedTags(nextSelectedTags)
	}

	return (
		<>
			<Head>
				<title>Полезные материалы</title>
			</Head>
			<h1>Полезные материалы</h1>
			<Row gutter={[2, 6]} style={{ paddingBottom: '12px' }}>
				{tags.map((tag: string) => (
					<CheckableTag
						key={tag}
						checked={selectedTags ? selectedTags.indexOf(tag) > -1 : false}
						onChange={(checked) => checkTag(tag, checked)}
					>
						{tag}
					</CheckableTag>
				))}
			</Row>
			<Row gutter={[{ md: 24 }, { md: 24 }]}>
				{videos
					?.filter((v: any) => selectedTags[0] == tags[0] || v.Tags.some((e: any) => selectedTags.includes(e)))
					.map((video: any, idx: number) => (
						<Col key={idx} xs={{ span: 24 }} md={{ span: 12 }} lg={{ span: 8 }} xl={{ span: 6 }}>
							<Link href={video.Link}>
								<a target="_blank">
									<Card
										className={styles.card}
										hoverable
										cover={video.Preview ? <Image alt="cover" src={video.Preview.url} fill /> : null}
									>
										<Card.Meta
											title={video.Name}
											description={
												<>
													<Typography.Paragraph ellipsis={{ rows: 4 }}>{video.Description}</Typography.Paragraph>
													<Row gutter={[2, 6]}>
														{video.Tags.map((tag: any, idx: number) => (
															<Col key={idx}>
																<Tag>{tag}</Tag>
															</Col>
														))}
													</Row>
												</>
											}
										/>
									</Card>
								</a>
							</Link>
						</Col>
					))}
			</Row>
		</>
	)
}

DocsPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export const getServerSideProps = async (context: any) => {
	const videos = await getDocumentationVideos()
	const AllTags: string[] = []

	videos?.map((v: any, i: number) => AllTags.push(...v.Tags))
	const tags = AllTags?.filter((t: any, i: number) => AllTags.indexOf(t) === i)

	return {
		props: {
			videos,
			tags: [`Все / All`, ...tags],
		},
	}
}

export default DocsPage
