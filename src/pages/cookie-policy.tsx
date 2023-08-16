import { Render } from '@9gustin/react-notion-render'
import { Typography } from 'antd'
import Head from 'next/head'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import NotionService, { getPage } from '@/services/notion'
import styles from '@/styles/cookie-policy.module.scss'
import '@9gustin/react-notion-render/dist/index.css'

const { Title, Paragraph, Text } = Typography

const PrivacyPolicyPage: NextPageWithLayout = ({ page, blocks }: any) => {
	// const screens = Grid.useBreakpoint()
	// const router = useRouter()
	// const { slug: urlSlug } = router.query
	// const [loading, setLoading] = useState(true)
	// const [docsMenu, setDocsMenu] = useState<any[]>()
	// const [pageSlug, setPageSlug] = useState<any>()
	// const [pageContent, setPageContent] = useState<any>(null)
	// const [pageProperties, setPageProperties] = useState<any>()

	// useEffect(() => {
	// 	if (!pages || pages.length == 0) return

	// 	const {
	// 		properties: { Slug },
	// 	} = pages[0]

	// 	const currentPageSlug = urlSlug ? urlSlug[urlSlug.length - 1] : Slug.rich_text[0].plain_text

	// 	setPageSlug(currentPageSlug)
	// 	setPageProperties(getPageProperties(currentPageSlug))

	// 	if (!urlSlug) {
	// 		router.push('/hub/docs/' + Slug.rich_text[0].plain_text, undefined, { shallow: true })
	// 	}
	// }, [urlSlug])

	// useEffect(() => {
	// 	setLoading(false)
	// 	if (!!pages) {
	// 		console.log(pages)

	// 		setDocsMenu(
	// 			pages.map((page: any) => {
	// 				const {
	// 					properties: { Slug, Name, Childrens },
	// 				} = page

	// 				return {
	// 					key: Slug.rich_text[0].plain_text,
	// 					label: Name.title[0].plain_text,
	// 					// childrens: Childrens.relation.length > 0 ? getChildrens(Childrens.relation) : [],
	// 				}
	// 			})
	// 		)
	// 	}
	// }, [])

	// useEffect(() => {
	// 	if (pageSlug) {
	// 		fetchPageContent(pageSlug)
	// 	}
	// }, [pageSlug])

	// // const getChildrens = (relationsData: any) => {
	// // 	const ids = relationsData.map((rd: any) => rd.id)
	// // 	const results = pages?.find((p: any) => ids.includes(p.id))

	// // 	return results.map((r: any) => {
	// // 		const {
	// // 			properties: { Slug, Name },
	// // 		} = r

	// // 		return {
	// // 			kkey: Slug.rich_text[0].plain_text,
	// // 			label: Name.title[0].plain_text,
	// // 		}
	// // 	})
	// // }

	// const getPageProperties = (slug: string) => {
	// 	const currentPage = pages?.find((page: any) => page.properties.Slug.rich_text[0].plain_text === slug)

	// 	return currentPage
	// }

	// const handleMainMenuSelect = async ({ key }: any) => {
	// 	try {
	// 		await fetchPageContent(key)
	// 		await router.push('/hub/docs/' + key, undefined, { shallow: true })
	// 		setPageProperties(getPageProperties(key))
	// 	} catch (error: any) {}
	// }

	// const handleMobileMenuSelect = async (value: any) => {
	// 	try {
	// 		await fetchPageContent(value)
	// 		await router.push('/hub/docs/' + value, undefined, { shallow: true })
	// 		setPageProperties(getPageProperties(value))
	// 	} catch (error: any) {}
	// }

	// const fetchPageContent = async (pageSlug: string) => {
	// 	try {
	// 		setLoading(true)

	// 		const response = await fetch('/api/notion/page', {
	// 			method: 'post',
	// 			headers: {
	// 				'Type-Content': 'application/json',
	// 			},
	// 			body: new URLSearchParams({
	// 				pageSlug,
	// 			}),
	// 		})

	// 		if (!response.ok) {
	// 			throw new Error()
	// 		}

	// 		const page = await response.json()
	// 		setPageContent(page)
	// 		setPageProperties(getPageProperties(pageSlug))
	// 		setLoading(false)
	// 	} catch (error: any) {
	// 		setLoading(false)
	// 		message.error(`The page didn't found`)
	// 	}
	// }

	return (
		<>
			<Head>
				<title>Cookie Policy</title>
			</Head>

			<div className={styles.container}>
				<Title>{page?.properties.title.title[0].plain_text}</Title>
				<Render blocks={blocks.results} />
				{/* 
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
							{!!pageProperties ? (
								<section className="main-container">
									<div className="content-header">
										<h1>{pageProperties?.properties.Name.title[0].plain_text}</h1>
										<small>
											Обновлено{' '}
											{DateTime.fromISO(pageProperties?.last_edited_time).toFormat('d LLL, yyyy', { locale: 'ru-RU' })}
										</small>
									</div>
									<Render blocks={pageContent} classNames useStyles />
								</section>
							) : (
								<section className="main-container">
									<p>Страница не существует или у вас нет к ней доступа</p>
								</section>
							)}
						</Spin>
					</Col>
				</Row> */}
			</div>
		</>
	)
}

PrivacyPolicyPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export const getStaticProps = async () => {
	const page = await getPage({ pageId: 'c3fb3089-a57e-42f1-8383-3b13ea4842de' })

	const blocks = await NotionService.blocks.children.list({
		block_id: 'c3fb3089-a57e-42f1-8383-3b13ea4842de',
	})

	console.log(page)

	if (!blocks) {
		return {
			notFound: true,
		}
	}

	return {
		props: {
			page,
			blocks,
		},
		revalidate: 60,
	}
}

export default PrivacyPolicyPage
