import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { InstantsearchAdapter } from "@gdhub-io/gdhub-typesense/dist/adapter";
import { BsFilter } from "@react-icons/all-files/bs/BsFilter";
import { useTranslate } from "@tolgee/react";
import {
	Badge,
	Button,
	Card,
	Col,
	Drawer,
	Grid,
	Row,
	Space,
	Tag,
	Typography,
} from "antd";
import type { GetServerSidePropsContext } from "next";
import dynamic from "next/dynamic";
import { getSession, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import {
	ClearRefinements,
	Configure,
	Highlight,
	Hits,
	InstantSearch,
	Pagination,
	RefinementList,
	SearchBox,
	Stats,
	useInstantSearch,
} from "react-instantsearch";
import { hasRole } from "@/helpers/user";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import type { NextPageWithLayout } from "@/pages/_app";
import { prisma } from "@/services/prisma";
import styles from "./style.module.scss";

const SpecialistPreviewModal = dynamic(
	() => import("@/components/modals/SpecialistPreviewModal"),
	{ ssr: false },
);

const { Paragraph, Text, Title } = Typography;

const SpecialistsPage: NextPageWithLayout = ({
	usersCount,
	specialitiesCount,
	hasApprovedProjects = false,
}: any) => {
	const session = useSession();
	const { t } = useTranslate();
	const [openedFilter, setOpenFilter] = useState(false);
	const [selectedSpecialistId, setSelectedSpecialistId] = useState<
		string | undefined
	>();
	const screens = Grid.useBreakpoint();
	const searchAdapter = useMemo(
		() =>
			new InstantsearchAdapter({
				host: process.env.NEXT_PUBLIC_TYPESENSE_HOST as string,
				port: parseInt(process.env.NEXT_PUBLIC_TYPESENSE_PORT as string),
				protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL as string,
				apiKey: process.env.NEXT_PUBLIC_TYPESENSE_API_KEY as string,
			}),
		[],
	);

	// biome-ignore lint/correctness/noNestedComponentDefinitions: <explanation>
	const Hit = ({ hit }: any) => {
		return (
			<Card
				hoverable
				onClick={() => setSelectedSpecialistId(hit.id)}
				style={{ cursor: "pointer", position: "relative" }}
			>
				<Card.Meta
					title={
						<Title level={4}>
							<Highlight attribute="name" hit={hit} />
						</Title>
					}
					description={
						<Space
							direction="vertical"
							size={16}
							style={{ width: "100%", marginTop: 8 }}
						>
							{!!hit.specialization && (
								<div style={{ marginTop: 4 }}>
									<Highlight attribute="specialization" hit={hit} />
								</div>
							)}
						</Space>
					}
				/>

				<Space wrap style={{ marginTop: 16 }}>
					<Text type="secondary">{t("Level")}:</Text>
					<Tag color="default">
						<Highlight attribute="level" hit={hit} />
					</Tag>
					{!!hit.direction && (
						<>
							<Text type="secondary">{t("Direction")}:</Text>
							<Tag color="default">
								<Highlight attribute="direction" hit={hit} />
							</Tag>
						</>
					)}
					{!!hit.timeForWorkMin && !!hit.timeForWorkMax && (
						<>
							<Text type="secondary">{t("Free time")}:</Text>
							<Tag color="default">
								<Highlight attribute="timeForWorkMin" hit={hit} /> -{" "}
								<Highlight attribute="timeForWorkMax" hit={hit} />
							</Tag>
						</>
					)}
				</Space>
			</Card>
		);
	};

	if (!hasRole(prismaClient.UserRole.Author, session) || !hasApprovedProjects) {
		return (
			<ProtectedLayout title={t("Community Members")}>
				<div className={styles.container}>
					<p>
						{t(
							"page.hub.members.text1",
							"Any registered user of our portal is considered a community member. Today we are",
						)}{" "}
						<strong>{usersCount}</strong>.
					</p>
					<p>
						{t(
							"page.hub.members.text2.part1",
							"Those of us who have indicated a major in our profile are considered members who are open to offers to participate in the development of indie projects. As of today",
						)}{" "}
						<strong>{specialitiesCount}</strong>{" "}
						{t("page.hub.members.text2.part2", "specialists are registered.")}
					</p>
					<p>
						{t(
							"page.hub.members.text3",
							"Authors of indie projects have access to a database of specialists and can invite them to their projects. For this you need to create a project and and bring your project to the recruiting stage.",
						)}
					</p>
				</div>
			</ProtectedLayout>
		);
	}

	return (
		<ProtectedLayout title={t("Community Members")}>
			<div className={styles.container}>
				<InstantSearch
					searchClient={searchAdapter.searchClient}
					indexName={
						process.env.NEXT_PUBLIC_TYPESENSE_SPECIALISTS_SCHEMA as string
					}
				>
					<Configure optionalFilters={["isActive:true"]} />
					<Row gutter={[16, 16]} align="middle" style={{ marginBottom: 24 }}>
						<Col flex="auto">
							<SearchBox
								placeholder={t(
									"hub.members.searchPlaceholder",
									"Type search query...",
								)}
							/>
						</Col>
						{!screens.lg && (
							<Col>
								<SearchMobileFilter
									onClick={() => setOpenFilter(true)}
									resetButtonText={t("Clear filter")}
								/>
							</Col>
						)}
					</Row>
					<Row justify="end" className={styles.stats}>
						<Stats />
					</Row>

					<Row gutter={[16, 16]}>
						<Col xs={{ span: 24 }} lg={{ span: 8 }}>
							{screens.lg ? <SearchFilter /> : null}
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
						title={t("hub.members.searchFilter", "Search filter")}
						className={styles.container}
						onClose={() => setOpenFilter(false)}
						placement="right"
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
	);
};

export default SpecialistsPage;

function NoResultsBoundary({ children, fallback }: any) {
	const { results } = useInstantSearch();
	if (!results.__isArtificial && results.nbHits === 0) {
		return (
			<>
				{fallback}
				<div hidden>{children}</div>
			</>
		);
	}

	return children;
}

function NoResults() {
	const { indexUiState } = useInstantSearch();
	const { t } = useTranslate();

	return (
		<Paragraph type="secondary">
			{t("hub.members.noResults", "No results for")}&nbsp;
			<q>{indexUiState.query}</q>.
		</Paragraph>
	);
}

const SearchFilter = ({ onClear }: { onClear?: () => void }) => {
	const { t } = useTranslate();

	return (
		<Card className={styles.filterCard}>
			<Space direction="vertical" size={24} style={{ width: "100%" }}>
				<div>
					<Title level={5}>{t("hub.members.direction", "Direction")}</Title>
					<RefinementList attribute="direction" />
				</div>

				<div>
					<Title level={5}>{t("hub.members.level", "Level")}</Title>
					<RefinementList attribute="level" />
				</div>

				<div>
					<Title level={5}>{t("hub.members.skills", "Skills")}</Title>
					<RefinementList attribute="skills" />
				</div>

				<ClearRefinements
					translations={{ resetButtonText: t("Clear filter") }}
				/>
			</Space>
		</Card>
	);
};

function SearchMobileFilter({ onClick, resetButtonText }: any) {
	const { indexUiState } = useInstantSearch();
	const [count, setCount] = useState(0);
	const { t } = useTranslate();

	useEffect(() => {
		let _count = 0;

		if (
			!indexUiState?.refinementList ||
			Object.entries(indexUiState.refinementList).length == 0
		) {
			setCount(_count);
			return;
		}

		for (const attr of Object.values(indexUiState.refinementList)) {
			_count += attr.length;
		}

		setCount(_count);
	}, [indexUiState]);

	return (
		<Space>
			<Button onClick={onClick} icon={<BsFilter />}>
				{t("hub.members.filter", "Filter")}&nbsp;
				<Badge count={count} size="small" />
			</Button>
			{count > 0 && <ClearRefinements translations={{ resetButtonText }} />}
		</Space>
	);
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
	const session = await getSession(context);
	const usersCount = await prisma.user.count();
	const specialitiesCount = await prisma.speciality.count();
	const hasApprovedProjects = await prisma.project.count({
		where: {
			authorId: session?.user.id,
			status: prismaClient.ProjectStatus.Approved,
		},
	});

	return {
		props: {
			usersCount,
			specialitiesCount,
			hasApprovedProjects:
				hasApprovedProjects !== 0 ||
				session?.user.roles.includes(prismaClient.UserRole.Admin),
		},
	};
}
