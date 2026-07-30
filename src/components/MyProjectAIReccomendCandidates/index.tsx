import type {
	MatchingSpecialistAndProject,
	Speciality,
	User,
} from "@gdhub-io/gdhub-prisma";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Avatar, Space, Table, Tag, Typography, theme } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import { useCallback, useState } from "react";
import SpecialistPreviewModal from "../modals/SpecialistPreviewModal";

interface MyProjectAIReccomendCandidatesArgs {
	projectId: string;
}

const { Text } = Typography;

const MyProjectAIReccomendCandidates = ({
	projectId,
}: MyProjectAIReccomendCandidatesArgs) => {
	const { token } = theme.useToken();
	const { t } = useTranslate();
	const [selectedSpecialistId, setSelectedSpecialistId] = useState<
		string | undefined
	>();

	const {
		data: aiCandidates,
		refetch: refetchAICandidates,
		isFetching: isLoadingAICandidates,
	} = useQuery({
		queryKey: ["AICandidates", projectId],
		queryFn: () =>
			axios.get<
				(MatchingSpecialistAndProject & {
					specialist: Speciality & { user: User };
				})[]
			>("/api/user/project/ai-candidates", {
				params: { projectId },
			}),
		enabled: !!projectId,
	});

	const calculateMatcingColor = useCallback((percent: number) => {
		if (percent >= 60 && percent < 80) {
			return token.colorWarning;
		}

		if (percent >= 80) {
			return token.colorSuccess;
		}

		return token.colorError;
	}, []);

	const columns: ColumnsType<any> = [
		{
			title: t("AI Candidate"),
			dataIndex: "specialityId",
			key: "specialityId",
			render: (value, record) => (
				<>
					<div
						role="button"
						tabIndex={0}
						style={{ cursor: "pointer", fontWeight: "bold" }}
						onClick={() => handleShowAICandidate(record.specialityId)}
					>
						<Space>
							<Avatar
								shape="square"
								size={32}
								src={record.specialist.user.image || null}
							/>
							{record.specialist.user?.name}
						</Space>
					</div>
					<small>
						{record.specialist?.name} / {record.specialist.level}
					</small>
				</>
			),
		},
		{
			title: t("Project Compliance"),
			dataIndex: "projectScore",
			responsive: ["md"],
			key: "projectScore",
			align: "center",
			render: (value) => {
				return (
					<Text strong style={{ color: calculateMatcingColor(value) }}>
						{value}%
					</Text>
				);
			},
		},
		{
			title: t("Team Compliance"),
			dataIndex: "teamScore",
			responsive: ["md"],
			key: "teamScore",
			align: "center",
			render: (value) => {
				return (
					<Text strong style={{ color: calculateMatcingColor(value) }}>
						{value}%
					</Text>
				);
			},
		},
		{
			title: t("Author Compliance"),
			dataIndex: "authorScore",
			responsive: ["md"],
			key: "authorScore",
			align: "center",
			render: (value) => {
				return (
					<Text strong style={{ color: calculateMatcingColor(value) }}>
						{value}%
					</Text>
				);
			},
		},
		{
			title: t("Avg. Score"),
			dataIndex: "avgScore",
			responsive: ["md"],
			key: "avgScore",
			align: "center",
			render: (value) => {
				return (
					<Tag
						style={{ padding: "8px 12px" }}
						color={calculateMatcingColor(value)}
					>
						{value}%
					</Tag>
				);
			},
		},
		// {
		// 	title: t('Obtained'),
		// 	dataIndex: 'createdAt',
		// 	responsive: ['md'],
		// 	key: 'createdAt',
		// 	render: (value) => dayjs(value).format('LLL'),
		// },
		// {
		// 	key: 'actions',
		// 	responsive: ['md'],
		// },
	];

	const handleShowAICandidate = (id: string) => {
		setSelectedSpecialistId(id);
	};

	if (!aiCandidates?.data) {
		return null;
	}

	return (
		<>
			<Space align="center" style={{ marginTop: 60 }}>
				<h3 style={{ margin: 0 }}>
					{t(
						"components.my-project-ai-reccomend-candidates.aiReccomendationSpecialists",
						"AI Reccomendation Specialists",
					)}
				</h3>
				<Tag color="gray">{aiCandidates?.data.length || 0}</Tag>
			</Space>

			{aiCandidates?.data.length ? (
				<>
					<Table
						loading={isLoadingAICandidates}
						style={{
							border: "1px solid #aaa",
							overflow: "hidden",
							borderRadius: 16,
							marginTop: 16,
						}}
						columns={columns}
						dataSource={aiCandidates?.data?.map((m: any) => ({
							...m,
							key: m.id,
						}))}
						pagination={false}
					/>

					<SpecialistPreviewModal
						open={!!selectedSpecialistId}
						specialistId={selectedSpecialistId}
						onCancel={() => setSelectedSpecialistId(undefined)}
					/>
				</>
			) : (
				<p style={{ marginTop: 12, color: "gray" }}>
					{t(
						"components.my-project-ai-reccomend-candidates.noAiRecommendations",
						"There are currently no AI recommendations for specialists.",
					)}
				</p>
			)}
		</>
	);
};

export default MyProjectAIReccomendCandidates;
