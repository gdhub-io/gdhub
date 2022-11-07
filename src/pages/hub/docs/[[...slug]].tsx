import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@layouts/ProtectedLayout'
import { getPages } from '@services/notion'
import { NextPageWithLayout } from 'pages/_app'
import { Render } from '@9gustin/react-notion-render'
import { Col, Menu, message, Row, Select, Spin, Grid } from 'antd'
import { DateTime } from 'luxon'
import Head from 'next/head'
import { useRouter } from 'next/router'
import styles from './style.module.less'
import '@9gustin/react-notion-render/dist/index.css'

const DocsPage: NextPageWithLayout = ({ pages }: { pages?: any[] }) => {
	const screens = Grid.useBreakpoint()
	const router = useRouter()
	const { slug } = router.query
	const [loading, setLoading] = useState(true)
	const [docsMenu, setDocsMenu] = useState<any[]>()
	const [pageSlug, setPageSlug] = useState<any>()
	const [pageContent, setPageContent] = useState<any>(null)
	const [pageProperties, setPageProperties] = useState<any>()

	useEffect(() => {
		if (!pages) return

		const {
			properties: { Slug },
		} = pages[0]

		const currentPageSlug = slug ? slug[0] : Slug.rich_text[0].plain_text

		setPageSlug(currentPageSlug)
		setPageProperties(getPageProperties(currentPageSlug))

		if (!slug) {
			router.push('/hub/docs/' + Slug.rich_text[0].plain_text, undefined, { shallow: true })
		}
	}, [slug])

	useEffect(() => {
		setLoading(false)
		if (!!pages) {
			setDocsMenu(
				pages.map((page: any) => {
					const {
						properties: { Slug, Name },
					} = page

					return {
						key: Slug.rich_text[0].plain_text,
						label: Name.title[0].plain_text,
					}
				})
			)
		}
	}, [])

	useEffect(() => {
		if (pageSlug) {
			fetchPageContent(pageSlug)
		}
	}, [pageSlug])

	const getPageProperties = (slug: string) => {
		const currentPage = pages?.find((page: any) => page.properties.Slug.rich_text[0].plain_text === slug)

		return currentPage
	}

	const handleMainMenuSelect = async ({ key }: any) => {
		try {
			await fetchPageContent(key)
			await router.push('/hub/docs/' + key, undefined, { shallow: true })
			setPageProperties(getPageProperties(key))
		} catch (error: any) {}
	}

	const handleMobileMenuSelect = async (value: any) => {
		try {
			await fetchPageContent(value)
			await router.push('/hub/docs/' + value, undefined, { shallow: true })
			setPageProperties(getPageProperties(value))
		} catch (error: any) {}
	}

	const fetchPageContent = async (pageSlug: string) => {
		try {
			setLoading(true)

			const response = await fetch('/api/notion/page', {
				method: 'post',
				headers: {
					'Type-Content': 'application/json',
				},
				body: new URLSearchParams({
					pageSlug,
				}),
			})

			if (!response.ok) {
				throw new Error()
			}

			const page = await response.json()
			setPageContent(page)
			setPageProperties(getPageProperties(pageSlug))
			setLoading(false)
		} catch (error: any) {
			setLoading(false)
			message.error(`The page didn't found`)
		}
	}

	return (
		<>
			<Head>
				<title>{pageProperties?.properties.Name.title[0].plain_text || 'Документация'}</title>
			</Head>
			<div className={styles.container}>
				<Row>
					<Col xs={{ span: 24 }} md={{ span: 6 }} xl={{ span: 5 }} xxl={{ span: 4 }}>
						{screens.md ? (
							<Menu
								className="main-menu"
								defaultSelectedKeys={[pageSlug]}
								mode="vertical"
								theme="light"
								items={docsMenu}
								onSelect={handleMainMenuSelect}
							/>
						) : (
							<Select
								defaultValue={pageSlug}
								className="mobile-menu"
								options={docsMenu?.map((i) => ({ label: i.label, value: i.key }))}
								onSelect={handleMobileMenuSelect}
							/>
						)}
					</Col>
					<Col xs={{ span: 24 }} md={{ span: 18 }} xl={{ span: 19 }} xxl={{ span: 20 }}>
						<Spin spinning={loading}>
							<section className="main-container">
								<div className="content-header">
									<h1>{pageProperties?.properties.Name.title[0].plain_text}</h1>
									<small>
										Обновлено{' '}
										{DateTime.fromISO(pageProperties?.last_edited_time).toFormat('d LLL, yyyy', { locale: 'ru-RU' })}
									</small>
								</div>
								<Render blocks={pageContent} useStyles />
							</section>
						</Spin>
					</Col>
				</Row>
			</div>
		</>
	)
}

DocsPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export const getServerSideProps = async (context: any) => {
	const pages = await getPages()

	return {
		props: {
			pages,
		},
	}
}

export default DocsPage
