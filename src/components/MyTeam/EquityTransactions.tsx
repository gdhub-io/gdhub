import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Avatar, Card, Table, Tag, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { EquityTransactionType } from "@/config/prisma-enums";
import styles from "./EquityTransactions.module.scss";

const { Title, Text } = Typography;

interface EquityTransactionsProps {
	projectId: string;
	userId?: string; // Если указан, то показываем только транзакции пользователя
}

interface Transaction {
	id: string;
	fromAllocation?: {
		id: string;
		owner: {
			id: string;
			name: string;
			email: string;
			image?: string;
		};
	} | null;
	toAllocation: {
		id: string;
		owner: {
			id: string;
			name: string;
			email: string;
			image?: string;
		};
	};
	percentage: number;
	transactionType: EquityTransactionType;
	reason?: string;
	createdAt: string;
	createdBy: {
		id: string;
		name: string;
		email: string;
		image?: string;
	};
	promise?: {
		id: string;
		description?: string;
		targetStepId?: string | null;
	} | null;
}

const EquityTransactions: React.FC<EquityTransactionsProps> = ({
	projectId,
	userId,
}) => {
	const { t } = useTranslate();

	// Get transactions
	const {
		data: transactionsData,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["equity-transactions", projectId, userId],
		queryFn: async () => {
			const url = userId
				? `/api/user/project/equity/transaction/user?projectId=${projectId}&userId=${userId}`
				: `/api/user/project/equity/transaction?projectId=${projectId}`;

			const response = await axios.get(url);
			return response.data;
		},
		enabled: !!projectId,
	});

	// Function to render transaction type
	const renderTransactionType = (type: EquityTransactionType) => {
		switch (type) {
			case EquityTransactionType.InitialAllocation:
				return <Tag color="green">{t("First allocation")}</Tag>;
			case EquityTransactionType.Vesting:
				return <Tag color="blue">{t("Vesting")}</Tag>;
			case EquityTransactionType.Transfer:
				return <Tag color="orange">{t("Transfer")}</Tag>;
			case EquityTransactionType.Dilution:
				return <Tag color="red">{t("Dilution")}</Tag>;
			case EquityTransactionType.Increase:
				return <Tag color="green">{t("Increase")}</Tag>;
			default:
				return <Tag>{t("Other type")}</Tag>;
		}
	};

	// Function to render user information
	const renderUser = (user: Transaction["toAllocation"]["owner"]) => {
		return (
			<div className={styles.userInfo}>
				<Avatar
					size="small"
					src={user.image}
					icon={!user.image}
					className={styles.userAvatar}
				/>
				<Text>{user.name || user.email || "User"}</Text>
			</div>
		);
	};

	// Columns for the table
	const columns = [
		{
			title: t("Date"),
			dataIndex: "createdAt",
			key: "createdAt",
			render: (date: string) => dayjs(date).format("DD.MM.YYYY HH:mm"),
		},
		{
			title: t("Type"),
			dataIndex: "transactionType",
			key: "transactionType",
			render: renderTransactionType,
		},
		{
			title: t("From"),
			dataIndex: "fromAllocation",
			key: "fromAllocation",
			render: (fromAllocation: Transaction["fromAllocation"]) =>
				fromAllocation ? renderUser(fromAllocation.owner) : <Text>—</Text>,
		},
		{
			title: t("To"),
			dataIndex: "toAllocation",
			key: "toAllocation",
			render: (toAllocation: Transaction["toAllocation"]) =>
				renderUser(toAllocation.owner),
		},
		{
			title: t("Percentage"),
			dataIndex: "percentage",
			key: "percentage",
			render: (percentage: number) => <Text>{percentage.toFixed(2)}%</Text>,
		},
		{
			title: t("Reason"),
			dataIndex: "reason",
			key: "reason",
			render: (reason: string, record: Transaction) => (
				<Text>
					{reason ||
						(record.promise?.description
							? `Realization of promise: ${record.promise.description}`
							: "—")}
				</Text>
			),
		},
		{
			title: t("Initiator"),
			dataIndex: "createdBy",
			key: "createdBy",
			render: (createdBy: Transaction["createdBy"]) => renderUser(createdBy),
		},
	];

	if (isLoading) {
		return (
			<div className={styles.loading}>
				{t("Loading transaction history...")}
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.error}>
				{t("Error loading transaction history")}
			</div>
		);
	}

	const transactions = transactionsData?.transactions || [];

	return (
		<Card className={styles.container}>
			{transactions.length > 0 ? (
				<Table
					dataSource={transactions}
					columns={columns}
					rowKey="id"
					pagination={{ pageSize: 5 }}
					className={styles.transactionsTable}
				/>
			) : (
				<div className={styles.noData}>{t("No data about transactions")}</div>
			)}
		</Card>
	);
};

export default EquityTransactions;
