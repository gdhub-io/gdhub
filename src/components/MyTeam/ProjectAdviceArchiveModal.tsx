import type { AdviceRequest, Profile, User } from "@gdhub-io/gdhub-prisma";
import {
	IconBan,
	IconCircleCheck,
	IconCircleX,
	IconPointFilled,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Modal, Tooltip, theme } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import { useSession } from "next-auth/react";
import React from "react";
import ModernTable from "../ModernTable";

interface ProjectAdviceArchiveModalProps {
	open: boolean;
	projectId: string;
	advisor: User & { profile: Profile };
	onClose: () => void;
}

const ProjectAdviceArchiveModal: React.FC<ProjectAdviceArchiveModalProps> = ({
	open,
	projectId,
	advisor,
	onClose,
}) => {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const { token: themeToken } = theme.useToken();

	const {
		data: advisorAdviceRequests,
		isLoading: isLoadingAdvisorAdviceRequests,
		isError: isAdviceRequestsError,
		refetch: fetchProjectAdviceRequests,
	} = useQuery({
		queryKey: ["project-advice-requests", projectId, advisor?.id],
		queryFn: () =>
			axios.get<AdviceRequest[]>("/api/user/advice-requests", {
				params: { projectId, advisorId: advisor?.id },
			}),
		enabled: !!projectId && !!advisor?.id,
	});

	React.useEffect(() => {
		if (open && projectId) {
			fetchProjectAdviceRequests();
		}
	}, [open, projectId]);

	const adviceArchiveColumns: ColumnsType<AdviceRequest> = [
		{
			title: t("Status"),
			dataIndex: "status",
			key: "status",
			align: "center",
			render: (status: string) => {
				let icon = null;
				let text = "";
				switch (status) {
					case "Approved":
						icon = (
							<IconCircleCheck
								style={{ color: "var(--gd-success-solid)", fontSize: 22 }}
							/>
						);
						text = t("Approved");
						break;
					case "Rejected":
						icon = (
							<IconCircleX
								style={{ color: "var(--gd-danger-solid)", fontSize: 22 }}
							/>
						);
						text = t("Rejected");
						break;
					case "Closed":
						icon = (
							<IconBan
								style={{ color: themeToken.colorTextSecondary, fontSize: 16 }}
							/>
						);
						text = t("Closed");
						break;
					default:
						icon = (
							<IconPointFilled
								style={{ color: "var(--gd-info-solid)", fontSize: 8 }}
							/>
						);
						text = t("Created");
						break;
				}
				return <Tooltip title={text}>{icon}</Tooltip>;
			},
		},
		{
			title: t("From"),
			dataIndex: "fromUser",
			key: "fromUser",
			render: (fromUser: User & { profile: Profile }) => {
				if (!fromUser) return "-";
				if (fromUser.id === session?.user?.id) {
					return t("You");
				}
				return fromUser.profile?.name || "-";
			},
		},
		{
			title: t("Topic"),
			dataIndex: "topic",
			key: "topic",
		},
		{
			title: t("Comment/Feedback"),
			key: "commentFeedback",
			render: (_: any, record: AdviceRequest) => (
				<>
					<span style={{ color: themeToken.colorTextSecondary }}>
						{t("Comment")}:
					</span>{" "}
					{record.comment || "-"}
					<br />
					<span style={{ color: themeToken.colorTextSecondary }}>
						{t("Feedback")}:
					</span>{" "}
					{record.feedback || "-"}
				</>
			),
		},
		{
			title: t("Created At"),
			dataIndex: "createdAt",
			key: "createdAt",
			render: (date: string) => dayjs(date).format("DD.MM.YYYY HH:mm"),
		},
		{
			title: t("Finished At"),
			dataIndex: "finishedAt",
			key: "finishedAt",
			render: (date: string) =>
				date ? dayjs(date).format("DD.MM.YYYY HH:mm") : "-",
		},
	];

	return (
		<Modal
			centered
			open={open}
			onCancel={onClose}
			onOk={onClose}
			title={
				t("Advice requests archive to ") +
				(advisor?.id ? `${advisor.profile.name}` : "Advisors")
			}
			width={"80%"}
			footer={null}
		>
			<ModernTable
				loading={isLoadingAdvisorAdviceRequests}
				error={isAdviceRequestsError}
				onRetry={() => fetchProjectAdviceRequests()}
				columns={adviceArchiveColumns}
				dataSource={
					advisorAdviceRequests?.data?.map((r: any) => ({
						...r,
						key: r.id,
					})) || []
				}
				pagination={false}
				size="small"
			/>
		</Modal>
	);
};

export default ProjectAdviceArchiveModal;
