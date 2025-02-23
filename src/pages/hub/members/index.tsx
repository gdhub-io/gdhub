import { useEffect, useState } from 'react'
import SpecialistPreviewModal from '@/components/modals/SpecialistPreviewModal'
import { hasRole } from '@/helpers/user'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { prisma } from '@/services/prisma'
import { InstantsearchAdapter } from '@/services/typesense/adapter'
import { RightOutlined } from '@ant-design/icons'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { BsFilter } from '@react-icons/all-files/bs/BsFilter'
import { T, useTolgee } from '@tolgee/react'
import { Badge, Button, Card, Col, Drawer, Grid, Row, Space, Tag, Typography, Avatar } from 'antd'
import { GetServerSidePropsContext } from 'next'
import { getSession, useSession } from 'next-auth/react'
import {
	SearchBox,
	InstantSearch,
	Hits,
	Pagination,
	RefinementList,
	ClearRefinements,
	Highlight,
	Stats,
	useInstantSearch,
	Configure,
} from 'react-instantsearch'
import styles from './style.module.scss'

const { Paragraph, Text, Title } = Typography

const searchAdapter = new InstantsearchAdapter()

const SpecialistsPage: NextPageWithLayout = ({ usersCount, specialitiesCount, hasApprovedProjects = false }: any) => {
	const session = useSession()
	const { t } = useTolgee()
	const [openedFilter, setOpenFilter] = useState(false)
	const [selectedSpecialistId, setSelectedSpecialistId] = useState<string | undefined>()
	const screens = Grid.useBreakpoint()

	const Hit = ({ hit }: any) => {
		return (
			<Card
				hoverable
				onClick={() => setSelectedSpecialistId(hit.id)}
				style={{ cursor: 'pointer' }}
				actions={[
					<Button
						key="details"
						type="text"
						onClick={(e) => {
							e.stopPropagation()
							setSelectedSpecialistId(hit.id)
						}}
					>
						<Space>
							<T>More details</T>
							<RightOutlined />
						</Space>
					</Button>,
				]}
			>
				<Card.Meta
					avatar={
						<Avatar size={64} src={hit.avatar} style={{ backgroundColor: '#f15541' }}>
							{hit.name?.[0]?.toUpperCase()}
						</Avatar>
					}
					title={
						<Title level={4} style={{ margin: 0 }}>
							<Highlight attribute="name" hit={hit} />
						</Title>
					}
					description={
						<Space direction="vertical" size={16} style={{ width: '100%', marginTop: 8 }}>
							{!!hit.direction && (
								<Space wrap>
									<Tag color="default">
										<Highlight attribute="direction" hit={hit} />
									</Tag>
									<Tag color="default">
										<Highlight attribute="level" hit={hit} />
									</Tag>
								</Space>
							)}

							{!!hit.skills && (
								<div>
									<Text type="secondary" strong>
										<T>Skills</T>
									</Text>
									<div style={{ marginTop: 4 }}>
										<Highlight attribute="skills" hit={hit} />
									</div>
								</div>
							)}

							{!!hit.tools && (
								<div>
									<Text type="secondary" strong>
										<T>Tools & Software</T>
									</Text>
									<div style={{ marginTop: 4 }}>
										<Highlight attribute="tools" hit={hit} />
									</div>
								</div>
							)}

							{!!hit.specialization && (
								<div>
									<Text type="secondary" strong>
										<T>Specialization</T>
									</Text>
									<div style={{ marginTop: 4 }}>
										<Highlight attribute="specialization" hit={hit} />
									</div>
								</div>
							)}
						</Space>
					}
				/>
			</Card>
		)
	}

	if (!hasRole(prismaClient.UserRole.Author, session) || !hasApprovedProjects) {
		return (
			<ProtectedLayout title={t('Community Members')}>
				<div className={styles.container}>
					<p>
						<T keyName="page.hub.members.text1">
							Any registered user of our portal is considered a community member. Today we are
						</T>{' '}
						<strong>{usersCount}</strong>.
					</p>
					<p>
						<T keyName="page.hub.members.text2.part1">
							Those of us who have indicated a major in our profile are considered members who are open to offers to
							participate in the development of indie projects. As of today
						</T>{' '}
						<strong>{specialitiesCount}</strong>{' '}
						<T keyName="page.hub.members.text2.part2">specialists are registered.</T>
					</p>
					<p>
						<T keyName="page.hub.members.text3">
							Authors of indie projects have access to a database of specialists and can invite them to their projects.
							For this you need to create a project and and bring your project to the recruiting stage.
						</T>
					</p>
				</div>
			</ProtectedLayout>
		)
	}

	return (
		<ProtectedLayout title={t('Community Members')}>
			<div className={styles.container}>
				<InstantSearch
					searchClient={searchAdapter.searchClient}
					indexName={process.env.NEXT_PUBLIC_TYPESENSE_SPECIALISTS_SCHEMA as string}
				>
					<Configure optionalFilters={['isActive:true']} />
					<SearchBox placeholder="Type search query..." />
					<Row justify="end" className={styles.stats}>
						<Stats />
					</Row>

					<Row gutter={[16, 16]}>
						<Col xs={{ span: 24 }} lg={{ span: 8 }}>
							{screens.lg ? <SearchFilter /> : <SearchMobileFilter />}
						</Col>
						<Col xs={{ span: 24 }} lg={{ span: 16 }}>
							<NoResultsBoundary fallback={<NoResults />}>
								<Hits hitComponent={Hit} />
								<Pagination />
							</NoResultsBoundary>
						</Col>
					</Row>

					<Drawer
						open={openedFilter}
						title={<T>Search filter</T>}
						className={styles.container}
						onClose={() => setOpenFilter(false)}
					>
						<SearchFilter />
					</Drawer>

					<SpecialistPreviewModal
						open={!!selectedSpecialistId}
						specialistId={selectedSpecialistId}
						onCancel={() => setSelectedSpecialistId(undefined)}
					/>
				</InstantSearch>
			</div>
		</ProtectedLayout>
	)
}

export default SpecialistsPage

function NoResultsBoundary({ children, fallback }: any) {
	const { results } = useInstantSearch()
	if (!results.__isArtificial && results.nbHits === 0) {
		return (
			<>
				{fallback}
				<div hidden>{children}</div>
			</>
		)
	}

	return children
}

function NoResults() {
	const { indexUiState } = useInstantSearch()

	return (
		<Paragraph type="secondary">
			No results for <q>{indexUiState.query}</q>.
		</Paragraph>
	)
}

const SearchFilter = ({ onClear }: { onClear?: () => void }) => {
	return (
		<Card className={styles.filterCard}>
			<Space direction="vertical" size={24} style={{ width: '100%' }}>
				<div>
					<Title level={5}>
						<T>Direction</T>
					</Title>
					<RefinementList attribute="direction" />
				</div>

				<div>
					<Title level={5}>
						<T>Level</T>
					</Title>
					<RefinementList attribute="level" />
				</div>

				<div>
					<Title level={5}>
						<T>Skills</T>
					</Title>
					<RefinementList attribute="skills" />
				</div>

				{onClear && (
					<Button block onClick={onClear}>
						<T>Clear filters</T>
					</Button>
				)}
			</Space>
		</Card>
	)
}

function SearchMobileFilter({ onClick, resetButtonText }: any) {
	const { indexUiState } = useInstantSearch()
	const [count, setCount] = useState(0)

	useEffect(() => {
		let _count = 0

		if (!indexUiState?.refinementList || Object.entries(indexUiState.refinementList).length == 0) {
			setCount(_count)
			return
		}

		for (const attr of Object.values(indexUiState.refinementList)) {
			_count += attr.length
		}

		setCount(_count)
	}, [indexUiState])

	return (
		<Space>
			<Button onClick={onClick} icon={<BsFilter />}>
				<T>Filter</T>&nbsp;
				<Badge count={count} size="small" />
			</Button>
			{count > 0 && <ClearRefinements translations={{ resetButtonText }} />}
		</Space>
	)
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
	const session = await getSession(context)
	const usersCount = await prisma.user.count()
	const specialitiesCount = await prisma.speciality.count()
	const hasApprovedProjects = await prisma.project.count({
		where: { authorId: session?.user.id, status: prismaClient.ProjectStatus.Approved },
	})

	return {
		props: {
			usersCount,
			specialitiesCount,
			hasApprovedProjects: hasApprovedProjects !== 0 || session?.user.roles.includes(prismaClient.UserRole.Admin),
		},
	}
}
