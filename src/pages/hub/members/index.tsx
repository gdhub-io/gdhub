import { useEffect, useState } from 'react'
import SpecialistPreviewModal from '@/components/modals/SpecialistPreviewModal'
import { hasRole } from '@/helpers/user'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { prisma } from '@/services/prisma'
import { InstantsearchAdapter } from '@/services/typesense/adapter'
import { ProjectStatus, UserRole } from '@prisma/client'
import { BsFilter } from '@react-icons/all-files/bs/BsFilter'
import { T, useTolgee } from '@tolgee/react'
import { Badge, Button, Card, Col, Drawer, Grid, Row, Space, Tag, Typography } from 'antd'
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
				actions={[
					<Button key="details" onClick={() => setSelectedSpecialistId(hit.id)}>
						<T>More details</T>
					</Button>,
				]}
			>
				<Card.Meta
					title={
						<Title level={4} style={{ whiteSpace: 'initial' }}>
							<Highlight attribute="name" hit={hit} />
						</Title>
					}
				/>
				{!!hit.direction && (
					<Space wrap>
						<Highlight attribute="direction" hit={hit} />
						<Tag>
							<Highlight attribute="level" hit={hit} />
						</Tag>
					</Space>
				)}
				{!!hit.skills && (
					<div className={styles.hitItem}>
						<Text strong>
							<T>Skills</T>{' '}
						</Text>
						<Highlight attribute="skills" hit={hit} />
					</div>
				)}
				{!!hit.tools && (
					<div className={styles.hitItem}>
						<Text strong>
							<T>Tools & Software</T>{' '}
						</Text>
						<Highlight attribute="tools" hit={hit} />
					</div>
				)}
				{!!hit.specialization && (
					<div className={styles.hitItem}>
						<Text strong>
							<T>Specialization</T>{' '}
						</Text>
						<Highlight attribute="specialization" hit={hit} />
					</div>
				)}
			</Card>
		)
	}

	if (!hasRole(UserRole.Author, session) || !hasApprovedProjects) {
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
					<Configure filters="isActive:true" />
					<SearchBox placeholder="Type search query..." />
					<Row justify="end" className={styles.stats}>
						<Stats />
					</Row>

					<Row gutter={[16, 16]}>
						<Col xs={{ span: 24 }} lg={{ span: 8 }}>
							{screens.lg ? (
								<SearchFilter SearchFilter={t('Clear Filter')} />
							) : (
								<SearchMobileFilter SearchMobileFilter={t('Clear Filter')} onClick={() => setOpenFilter(true)} />
							)}
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

function SearchFilter({ resetButtonText }: any) {
	return (
		<Space direction="vertical" style={{ width: '100%' }}>
			<Card title={<T keyName="workDirection">Work Direction</T>} className={styles.panel}>
				<RefinementList attribute="direction" showMore />
			</Card>
			<Card title={<T keyName="difficultyLevel">Difficulty Level</T>} className={styles.panel}>
				<RefinementList attribute="level" />
			</Card>
			<Card title={<T keyName="country">Country</T>} className={styles.panel}>
				<RefinementList attribute="country" showMore />
			</Card>
			<ClearRefinements translations={{ resetButtonText }} />
		</Space>
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
		where: { authorId: session?.user.id, status: ProjectStatus.Approved },
	})

	return {
		props: {
			usersCount,
			specialitiesCount,
			hasApprovedProjects: hasApprovedProjects !== 0 || session?.user.roles.includes(UserRole.Admin),
		},
	}
}
