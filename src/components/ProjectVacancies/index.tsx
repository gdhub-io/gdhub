import type { TeamVacancy, WorkDirection } from "@gdhub-io/gdhub-prisma";
import { IconArrowDownRight } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Col, Row, Space, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import VacancyPreviewModal from "@/components/modals/VacancyPreviewModal";
import { StatusDot } from "@/components/ui";
import styles from "./style.module.scss";

const { Title } = Typography;

interface Vacancy {
	key: string;
	title: string;
	description: string;
	finishedAt: string;
	status: string;
	[key: string]: any;
}

interface ProjectVacanciesArgs {
	teamId: string;
}

const ProjectVacancies = ({ teamId }: ProjectVacanciesArgs) => {
	const { data: session } = useSession();
	const pathname = usePathname();
	const { t } = useTranslate();
	const [showVacancyPreviewModal, setShowVacancyPreviewModal] = useState(false);
	const [selectedVacancyId, setSelectedVacancyId] = useState<string>();

	const { data: workDirections } = useQuery({
		queryKey: ["workDirections"],
		queryFn: () =>
			axios.get<WorkDirection[]>("/api/dictionary/work-directions"),
		staleTime: Infinity,
	});

	const {
		data: projectVacancies,
		refetch: fetchMyProjectVacancies,
		isFetching: isLoadingMyProjectVacancies,
	} = useQuery({
		queryKey: ["team-vacancy", teamId],
		queryFn: () =>
			axios.get<
				(TeamVacancy & {
					direction: WorkDirection;
					team: {
						project: {
							id: string;
							slug: string;
							name: string;
							description: string;
						};
					};
				})[]
			>("/api/project/vacancies", { params: { teamId: teamId } }),
		enabled: !!teamId,
	});

	const vacanciesColumns: ColumnsType<Vacancy> = [
		{
			title: t("Name"),
			dataIndex: "title",
			key: "title",
			width: "60%",
			render: (value, record) =>
				session ? (
					<>
						<span
							role="button"
							tabIndex={0}
							style={{ cursor: "pointer", fontWeight: "bold" }}
							onClick={() => handleEditVacancy(record.id)}
						>
							{value}
						</span>{" "}
						{record.status == "draft" && (
							<StatusDot
								tone="neutral"
								label={t(`vacancy.status.${record.status}`, record.status)}
							/>
						)}
					</>
				) : (
					<span style={{ fontWeight: "bold" }}>{value}</span>
				),
		},
		{
			title: t("Direction"),
			dataIndex: "directionId",
			responsive: ["md"],
			key: "directionId",
			render(value) {
				const direction = workDirections?.data.find(
					(direction) => direction.id == value,
				);
				return direction?.name || "unknown";
			},
		},
		{
			title: t("Valid until"),
			dataIndex: "finishedAt",
			responsive: ["md"],
			key: "finishedAt",
			render: (value) => dayjs(value).format("DD.MM.YYYY"),
		},
		{
			key: "actions",
			responsive: ["md"],
			render: (value, record) =>
				session ? (
					<Button onClick={() => handleEditVacancy(record.id)}>
						{t("vacancy.details", "Details")}
					</Button>
				) : (
					<Link href={`/signin?callbackUrl=${pathname}`}>
						<Button>{t("vacancy.enterToSee", "Enter to see")}</Button>
					</Link>
				),
		},
	];

	const handleEditVacancy = (id: string) => {
		setSelectedVacancyId(id);
		setShowVacancyPreviewModal(true);
	};

	const handleSaveVacancy = () => {
		setShowVacancyPreviewModal(false);
		fetchMyProjectVacancies();
	};

	const handleShowVacancy = (id: string) => {
		setSelectedVacancyId(id);
		setShowVacancyPreviewModal(true);
	};

	const handleCloseVacancy = () => {
		setSelectedVacancyId(undefined);
		setShowVacancyPreviewModal(false);
	};

	if (!projectVacancies?.data.length) return null;

	return (
		<>
			<Space orientation="vertical" style={{ width: "100%" }}>
				<Title level={2}>{t("vacancy.title", "Vacancies")}</Title>
				{!!projectVacancies?.data.length && (
					<p style={{ fontSize: 12 }}>
						{t(
							"vacancies.list.description",
							"All project participants, responding to vacancies, accept the conditions that for the period of participation in the selected project, work is not paid until the moment of receipt of funding or if, other conditions are not indicated in vacancies.The time you spent is investment in the project that you choose.From how every member teams, and the team as a whole, will work on the project, depends whether these investments will be able to convert In money or not.In any case, your resume will become more significant when it will have information about participation In real projects.",
						)}
					</p>
				)}
			</Space>

			{projectVacancies?.data ? (
				<>
					<Row gutter={[32, 32]} wrap>
						{projectVacancies.data.map((vacancy, idx) => {
							return (
								<Col
									xs={24}
									sm={12}
									lg={8}
									xxl={6}
									key={`vacancy-${idx.toString()}`}
									className={styles.col}
								>
									<div
										role="button"
										tabIndex={0}
										onClick={() => handleShowVacancy(vacancy.id)}
										className={[
											styles.vacancyCard,
											"bg-direc-" +
												vacancy.direction.name
													.replace(" & ", "-")
													.replace(" ", "-"),
										].join(" ")}
									>
										<div className={styles.validDate}>
											{t("vacancy.validUntil", "Valid until")}{" "}
											{dayjs(vacancy.finishedAt).format("ll")}
										</div>
										<div className={styles.content}>
											<Title level={2} className={styles.title}>
												{vacancy.title}
											</Title>

											<div className={styles.projectName}>
												{vacancy.team.project?.name}
											</div>
										</div>
										<div className={styles.linkBtn}>
											<IconArrowDownRight size={24} />
										</div>
									</div>
								</Col>
							);
						})}
					</Row>

					<VacancyPreviewModal
						vacancyId={selectedVacancyId}
						open={showVacancyPreviewModal}
						onCancel={() => {
							setShowVacancyPreviewModal(false);
							setSelectedVacancyId(undefined);
						}}
						onOk={handleCloseVacancy}
					/>
				</>
			) : (
				<p>
					{t(
						"vacancy.noOpenVacancies",
						"There are no open vacancies at the moment",
					)}
				</p>
			)}
		</>
	);
};

export default ProjectVacancies;
