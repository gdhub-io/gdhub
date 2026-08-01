import type {
	MatchingSpecialistAndProject,
	Project,
	User,
} from "@gdhub-io/gdhub-prisma";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Alert, Button, Card, Col, Descriptions, Grid, Row } from "antd";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import styles from "./style.module.scss";

type ProjectsSectionArgs = {
	seasonId?: string;
	seasonSlug?: string;
};

export const SeasonProjectsSection = ({
	seasonId,
	seasonSlug,
}: ProjectsSectionArgs) => {
	const screens = Grid.useBreakpoint();
	const { data: session } = useSession();
	const { t } = useTranslate();

	const { data: projects, isFetching: isLoadingProjecs } = useQuery({
		queryKey: ["projects", seasonId],
		queryFn: () =>
			axios.get<
				(Project & {
					availableSpecialists: MatchingSpecialistAndProject[];
					author: User;
				})[]
			>("/api/projects", {}),
		enabled: !!seasonId || !!seasonSlug,
	});

	if (!projects?.data.length) {
		return <p>{t("season-projects-section.no-project", "No project yet.")}</p>;
	}

	return (
		<Row
			gutter={[
				{ md: 24, xs: 24 },
				{ md: 24, xs: 24 },
			]}
		>
			{projects.data.map((project, idx: number) => (
				<Col
					key={`season-project-${idx.toString()}`}
					xs={{ span: 24 }}
					md={{ span: 12 }}
					lg={{ span: 8 }}
					xl={{ span: 6 }}
				>
					<Card
						className={styles.card}
						cover={
							project.coverImage ? (
								<Image alt="cover" src={project.coverImage} fill />
							) : null
						}
					>
						<Card.Meta
							description={
								<div className={styles.projectDescriptions}>
									<Descriptions
										title={project.name}
										layout={screens.md ? "horizontal" : "vertical"}
										column={1}
									>
										<Descriptions.Item
											label={t("season-projects-section.author", "Author")}
										>
											{project.author.name}{" "}
										</Descriptions.Item>
										<Descriptions.Item
											label={t("season-projects-section.genre", "Genre")}
										>
											{project.genre}
										</Descriptions.Item>
										<Descriptions.Item
											label={t(
												"season-projects-section.game-setting",
												"Game Setting",
											)}
										>
											{project.setting}
										</Descriptions.Item>
										<Descriptions.Item
											label={t("season-projects-section.platform", "Platform")}
										>
											{project.platform}
										</Descriptions.Item>
									</Descriptions>
									<Descriptions layout="vertical" column={1}>
										<Descriptions.Item
											label={t(
												"season-projects-section.visual-style",
												"Visual style",
											)}
										>
											{project.visualStyle}
										</Descriptions.Item>
									</Descriptions>
									<Link href={`/project/${project.slug}`}>
										<Button
											type="primary"
											style={{ width: "100%", marginTop: "10px" }}
										>
											{t(
												"season-projects-section.button.on-the-page-of-the-project",
												"On the page of the project",
											)}
										</Button>
									</Link>
									{!!project.availableSpecialists?.filter(
										(as) => as.id == session?.user.id,
									).length && (
										<Alert
											showIcon
											type="success"
											title={`${t("season-projects-section.project-suits-you", "The project suits you")} ${project.availableSpecialists[0]?.avgScore}%`}
											style={{ marginTop: 16 }}
										/>
									)}
								</div>
							}
						/>
					</Card>
				</Col>
			))}
		</Row>
	);
};
