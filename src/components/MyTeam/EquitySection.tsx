import { AiOutlineHistory } from "@react-icons/all-files/ai/AiOutlineHistory";
import { AiOutlineInfoCircle } from "@react-icons/all-files/ai/AiOutlineInfoCircle";
import { AiOutlineSetting } from "@react-icons/all-files/ai/AiOutlineSetting";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Card,
	Flex,
	Grid,
	Modal,
	Popover,
	Space,
	Typography,
} from "antd";
import { useSession } from "next-auth/react";
import { useState } from "react";
import EquityTransferModal from "@/components/modals/EquityTransferModal";
import EquityPlot from "./EquityPlot";
import styles from "./EquitySection.module.scss";
import EquityTransactions from "./EquityTransactions";

const { Title } = Typography;

interface EquitySectionProps {
	projectId: string;
	isProjectAuthor: boolean;
	equityData: any;
	teamMembers: any[];
	onManageEquity: () => void;
}

const EquitySection: React.FC<EquitySectionProps> = ({
	projectId,
	isProjectAuthor,
	equityData,
	teamMembers,
	onManageEquity,
}) => {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const screen = Grid.useBreakpoint();
	const [transferModalVisible, setTransferModalVisible] =
		useState<boolean>(false);
	const [transactionsModalVisible, setTransactionsModalVisible] =
		useState<boolean>(false);

	// Проверяем наличие аллокации доли для текущего пользователя
	const userAllocation = equityData?.equityAllocations?.find(
		(allocation: any) => allocation.ownerId === session?.user?.id,
	);

	const hasUserEquity = !!userAllocation && userAllocation.percentage > 0;

	const equityInfoContent = (
		<div style={{ maxWidth: 400 }}>
			<Typography.Paragraph>
				<strong>Platform:</strong>{" "}
				{t("equity.platform.description", "Commission for using the service")}
			</Typography.Paragraph>
			<Typography.Paragraph>
				<strong>Mentors Fund:</strong>{" "}
				{t(
					"equity.mentorsFund.description",
					"Share for rewarding mentors of the project when it is sold or released",
				)}
			</Typography.Paragraph>
			<Typography.Paragraph>
				<strong>Investment Reserve:</strong>{" "}
				{t(
					"equity.investmentReserve.description",
					"Reserved shares for future investors (can be changed)",
				)}
			</Typography.Paragraph>
			<Typography.Paragraph>
				<strong>Team:</strong>{" "}
				{t(
					"equity.team.description",
					"Shares of the team members (vested or promised when the goal is reached)",
				)}
			</Typography.Paragraph>
			<Typography.Paragraph style={{ marginBottom: 0 }}>
				<strong>Unallocated:</strong>{" "}
				{t(
					"equity.unallocated.description",
					"Free shares for distributing to new participants",
				)}
			</Typography.Paragraph>
		</div>
	);

	return (
		<Card className={styles.equityCard}>
			<Flex vertical>
				<div className={styles.titleContainer}>
					<Space align="center">
						<Typography.Text strong>
							{t("equity.title", "Equity Distribution")}
						</Typography.Text>
						<Popover
							content={equityInfoContent}
							trigger="hover"
							placement="right"
						>
							<AiOutlineInfoCircle
								size={16}
								style={{
									cursor: "pointer",
									color: "rgba(0, 0, 0, 0.45)",
									position: "relative",
									top: 2,
								}}
							/>
						</Popover>
					</Space>
					<Space>
						{hasUserEquity && !isProjectAuthor && (
							<Button
								onClick={() => setTransferModalVisible(true)}
								type="default"
							>
								{t("Transfer My Share")}
							</Button>
						)}
						<Button
							className="gray-text-btn"
							icon={<AiOutlineHistory />}
							onClick={() => setTransactionsModalVisible(true)}
							type="text"
						></Button>
						{isProjectAuthor &&
							(screen.xs ? (
								<Button onClick={onManageEquity} icon={<AiOutlineSetting />} />
							) : (
								<Button onClick={onManageEquity} icon={<AiOutlineSetting />}>
									{t("Manage Equity")}
								</Button>
							))}
					</Space>
				</div>

				<div className={styles.plotContainer}>
					<EquityPlot
						teamMembers={teamMembers}
						platformShare={equityData?.platformShare}
						mentorFundShare={equityData?.mentorFundShare}
						investmentReserve={equityData?.investmentReserve}
						teamShares={
							equityData?.equityAllocations?.flatMap((allocation: any) => {
								// Результирующий массив teamShares
								const shares = [];

								// Добавляем основную (фактическую, vested) долю, если она есть
								if (allocation.percentage > 0) {
									shares.push({
										id: allocation.id,
										memberId: allocation.teamMemberId,
										userId: allocation.ownerId,
										name:
											teamMembers.find(
												(m: any) => m.userId === allocation.ownerId,
											)?.user?.name ||
											allocation.owner?.name ||
											t("Team Member"),
										percentage: allocation.percentage,
										vested: true,
										isFixed: allocation.isFixed || false,
									});
								}

								// Добавляем обещанную (promised) долю, если она есть
								if (
									allocation.promises &&
									allocation.promises.length > 0 &&
									allocation.promises[0].percentage > 0
								) {
									shares.push({
										id: `${allocation.id}-promise`,
										memberId: allocation.teamMemberId,
										userId: allocation.ownerId,
										name:
											teamMembers.find(
												(m: any) => m.userId === allocation.ownerId,
											)?.user?.name ||
											allocation.owner?.name ||
											t("Team Member"),
										percentage: allocation.promises[0].percentage,
										vested: false,
										isFixed: allocation.isFixed || false,
									});
								}

								return shares;
							}) || []
						}
					/>
				</div>
			</Flex>

			{/* Модальное окно для передачи доли */}
			<EquityTransferModal
				open={transferModalVisible}
				onCancel={() => setTransferModalVisible(false)}
				projectId={projectId}
				currentUserId={session?.user?.id || ""}
				teamMembers={teamMembers}
			/>

			{/* Модальное окно для истории транзакций */}
			<Modal
				centered
				title={t("Transactions History")}
				open={transactionsModalVisible}
				onCancel={() => setTransactionsModalVisible(false)}
				footer={null}
				width={"80%"}
			>
				<EquityTransactions projectId={projectId} />
			</Modal>
		</Card>
	);
};

export default EquitySection;
