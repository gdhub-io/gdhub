import { type Project, ProjectStatus, type User } from "@gdhub-io/gdhub-prisma";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Card,
	Col,
	Descriptions,
	Grid,
	Row,
	Space,
	Typography,
} from "antd";
import axios from "axios";
import Link from "next/link";
import { AppImage } from "@/components/ui/AppImage";
import styles from "./style.module.scss";

type ProjectsSectionArgs = {
	stageId: string;
	status?: ProjectStatus;
};

const { Title } = Typography;

export const StageProjectsSection = ({
	stageId,
	status = ProjectStatus.Registered,
}: ProjectsSectionArgs) => {
	const screens = Grid.useBreakpoint();
	const { t } = useTranslate();

	const { data: projects, isFetching: isLoadingProjecIdeas } = useQuery({
		queryKey: ["projects", stageId],
		queryFn: () =>
			axios.get<(Project & { author: User })[]>("/api/season/stage/projects", {
				params: { stageId, status },
			}),
	});

	if (!projects?.data.length) {
		return (
			<Space style={{ width: "100%", marginTop: 32 }} orientation="vertical">
				<Title level={5}>
					{t(
						"component.stageProjectsSection.projectListByStage",
						"Project list by stage",
					)}
				</Title>
				<p>
					{t("component.stageProjectsSection.noProjectsYet", "No projects yet")}
				</p>
			</Space>
		);
	}

	return (
		<Space style={{ width: "100%", marginTop: 32 }} orientation="vertical">
			<Title level={5}>
				{t(
					"component.stageProjectsSection.projectListByStage",
					"Project list by stage",
				)}
			</Title>
			{projects.data.map((project, idx: number) => (
				<Row
					key={`season-project-${idx.toString()}`}
					gutter={[
						{ md: 24, xs: 24 },
						{ md: 24, xs: 24 },
					]}
				>
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
									<AppImage
										alt="cover"
										src={project.coverImage}
										fill
										sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
									/>
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
											<Descriptions.Item>
												<Typography.Paragraph ellipsis={{ rows: 4 }}>
													{project.description}
												</Typography.Paragraph>
											</Descriptions.Item>
											<Descriptions.Item label={t("Author")}>
												{project.author.name}{" "}
											</Descriptions.Item>
											<Descriptions.Item label={t("Genre")}>
												{project.genre}
											</Descriptions.Item>
											<Descriptions.Item label={t("Game Setting")}>
												{project.setting}
											</Descriptions.Item>
											<Descriptions.Item label={t("Platform")}>
												{project.platform}
											</Descriptions.Item>
										</Descriptions>
										<Descriptions layout="vertical" column={1}>
											<Descriptions.Item label={t("Visual style")}>
												{project.visualStyle}
											</Descriptions.Item>
										</Descriptions>
										<Link href={`/project/${project.slug}`} target="_blank">
											<Button
												type="primary"
												style={{ width: "100%", marginTop: "10px" }}
											>
												{t(
													"component.stageProjectsSection.onThePageOfTheProject",
													"On the page of the project",
												)}
											</Button>
										</Link>
									</div>
								}
							/>
						</Card>
					</Col>
				</Row>
			))}
		</Space>
	);
};
