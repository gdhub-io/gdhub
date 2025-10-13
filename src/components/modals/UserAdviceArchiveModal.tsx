import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { GoLinkExternal } from "@react-icons/all-files/go/GoLinkExternal";
import { IconBan, IconCancel, IconCheck, IconClock } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Modal, Tooltip, theme } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import React from "react";
import ModernTable from "../ModernTable";

interface UserAdviceArchiveModalProps {
	open: boolean;
	user: any;
	onClose: () => void;
}

const UserAdviceArchiveModal: React.FC<UserAdviceArchiveModalProps> = ({
	open,
	user,
	onClose,
}) => {
	const { t } = useTranslate();
	const { token: themeToken } = theme.useToken();

	const {
		data: adviceRequests,
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["user-advice-archive", user?.id],
		queryFn: () =>
			axios.get<prismaClient.AdviceRequest[]>("/api/user/advice-requests", {
				params: { userId: user?.id },
			}),
		enabled: !!user?.id,
	});

	React.useEffect(() => {
		if (open && user?.id) {
			refetch();
		}
	}, [open, user?.id]);

	const columns: ColumnsType<prismaClient.AdviceRequest> = [
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
						icon = <IconCheck style={{ color: "#52c41a", fontSize: 22 }} />;
						text = t("Approved");
						break;
					case "Rejected":
						icon = <IconCancel style={{ color: "#ff4d4f", fontSize: 22 }} />;
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
					case "Created":
					default:
						icon = <IconClock style={{ color: "#1890ff", fontSize: 8 }} />;
						text = t("Created");
						break;
				}
				return <Tooltip title={text}>{icon}</Tooltip>;
			},
		},
		{
			title: t("Project"),
			dataIndex: ["project", "name"],
			key: "projectName",
			render: (name: string) => name || "-",
		},
		{
			title: t("From"),
			dataIndex: "fromUser",
			key: "fromUser",
			render: (fromUser: any, record: any) =>
				fromUser?.profile?.name || record?.fromTelegramUser?.name || "-",
		},
		{
			title: t("To"),
			dataIndex: "toUser",
			key: "toUser",
			render: (toUser: any) => toUser?.profile?.name || "-",
		},
		{
			title: t("Topic"),
			dataIndex: "topic",
			key: "topic",
		},
		{
			title: t("Comment/Feedback"),
			key: "commentFeedback",
			render: (_: any, record: prismaClient.AdviceRequest) => (
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
		{
			title: t("Actions"),
			key: "actions",
			render: (_: any, record: prismaClient.AdviceRequest) => (
				<Link
					href={`https://t.me/gdhub_experts_bot/app?startapp=areq_${record.id}`}
				>
					<Button type="text" size="small">
						{t("Go to request")}
						<GoLinkExternal />
					</Button>
				</Link>
			),
		},
	];

	return (
		<Modal
			centered
			open={open}
			onCancel={onClose}
			onOk={onClose}
			title={t("Your advice requests archive")}
			width={"80%"}
			footer={null}
			destroyOnHidden
		>
			<ModernTable
				loading={isLoading}
				columns={columns}
				dataSource={
					adviceRequests?.data?.map((r: any) => ({ ...r, key: r.id })) || []
				}
				pagination={false}
				size="small"
			/>
		</Modal>
	);
};

export default UserAdviceArchiveModal;
