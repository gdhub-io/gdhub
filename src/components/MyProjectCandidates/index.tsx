import type {
	Speciality,
	TeamVacancy,
	User,
	VacancyApplication,
} from "@gdhub-io/gdhub-prisma";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Skeleton, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import { useContext, useState } from "react";
import ProjectCandidatePreviewModal from "@/components/modals/ProjectCandidatePreviewModal";
import { LoadError } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { skeletonColumns, skeletonRows } from "@/components/ui/table";
import { ProjectContext } from "@/contexts/ProjectContext";

const MyProjectCandidates = () => {
	const contextProject = useContext(ProjectContext)?.contextProject;
	const { t } = useTranslate();
	const isProjectArchived =
		!contextProject || !!contextProject.isProjectArchived;
	const [showCandidatePreviewModal, setShowCandidatePreviewModal] =
		useState(false);
	const [selectedCandidateId, setSelectedCandidateId] = useState<string>();

	const {
		data: candidates,
		refetch: refetchCandidates,
		isFetching: isLoadingCandidates,
		isPending: isPendingCandidates,
		isError: isCandidatesError,
	} = useQuery({
		queryKey: ["candidates", contextProject?.id],
		queryFn: () =>
			axios.get<
				(VacancyApplication & {
					vacancy: TeamVacancy;
					speciality: Speciality;
					user: User & { specialities: Speciality[] };
				})[]
			>("/api/user/project/candidates", {
				params: { teamId: contextProject?.team?.id },
			}),
		enabled: !!contextProject,
	});

	const columns: ColumnsType<
		VacancyApplication & {
			vacancy: TeamVacancy;
			speciality: Speciality;
			user: User & { specialities: Speciality[] };
		}
	> = [
		{
			title: t("Candidate"),
			dataIndex: "id",
			key: "id",
			render: (value, record) => (
				<>
					<div
						role="button"
						tabIndex={0}
						style={{
							cursor: isProjectArchived ? "default" : "pointer",
							fontWeight: "bold",
						}}
						onClick={() => handleShowCandidate(record.id)}
					>
						<Space>
							<AppAvatar
								shape="square"
								size={32}
								src={record.user.image || null}
							/>
							{record.user.name}
						</Space>
					</div>
					<small>
						{record.speciality?.name} / {record.speciality.level}
					</small>
				</>
			),
		},
		{
			title: t("Open position"),
			dataIndex: "vacancyId",
			responsive: ["md"],
			key: "vacancyId",
			render: (_, record) => {
				return record.vacancy?.title;
			},
		},
		{
			title: t("Obtained"),
			dataIndex: "createdAt",
			responsive: ["md"],
			key: "createdAt",
			render: (value) => dayjs(value).format("LLL"),
		},
		{
			key: "actions",
			responsive: ["md"],
		},
	];

	const handleShowCandidate = (id: string) => {
		if (isProjectArchived) return;

		setSelectedCandidateId(id);
		setShowCandidatePreviewModal(true);
	};

	const handleApproveCandidate = () => {
		setShowCandidatePreviewModal(false);
		refetchCandidates();
	};

	return (
		<>
			<Space align="center" style={{ marginTop: 60 }}>
				<h3 style={{ margin: 0 }}>
					{t(
						"components.my-project-candidates.responsesOnVacancies",
						"Responses on open positions",
					)}
				</h3>
				{isPendingCandidates ? (
					<Skeleton.Button active size="small" />
				) : (
					candidates && <Tag color="gray">{candidates.data.length}</Tag>
				)}
			</Space>

			{isPendingCandidates || isCandidatesError || candidates?.data.length ? (
				<>
					<Table
						loading={!isPendingCandidates && isLoadingCandidates}
						style={{
							border: "1px solid var(--gd-color-text-tertiary)",
							overflow: "hidden",
							borderRadius: "var(--gd-radius-panel)",
							marginTop: 16,
						}}
						columns={isPendingCandidates ? skeletonColumns(columns) : columns}
						rowKey="id"
						dataSource={
							isPendingCandidates
								? skeletonRows<NonNullable<typeof candidates>["data"][number]>(
										3,
										"id",
									)
								: candidates?.data
						}
						pagination={false}
						locale={
							isCandidatesError
								? {
										emptyText: (
											<LoadError bare onRetry={() => refetchCandidates()} />
										),
									}
								: undefined
						}
					/>

					{!isProjectArchived && (
						<ProjectCandidatePreviewModal
							candidateId={selectedCandidateId}
							open={showCandidatePreviewModal}
							onCancel={() => {
								setShowCandidatePreviewModal(false);
								setSelectedCandidateId(undefined);
							}}
							onOk={handleApproveCandidate}
						/>
					)}
				</>
			) : (
				<p style={{ marginTop: 12, color: "gray" }}>
					{t(
						"components.my-project-candidates.noApplicationsForParticipation",
						"There are no applications for participation at the moment",
					)}
				</p>
			)}
		</>
	);
};

export default MyProjectCandidates;
