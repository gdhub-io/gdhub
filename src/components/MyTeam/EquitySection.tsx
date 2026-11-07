import { IconHistory, IconInfoCircle, IconSettings } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Card,
	Flex,
	Grid,
	Modal,
	Popover,
	Skeleton,
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
	/** Whether the viewer may manage the cap table (project.equity.manage). */
	canManageEquity: boolean;
	equityData: any;
	teamMembers: any[];
	onManageEquity: () => void;
}

const EquitySection: React.FC<EquitySectionProps> = ({
	projectId,
	canManageEquity,
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

	// Check whether the current user has an equity allocation
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
			<Space orientation="vertical" style={{ width: "100%" }} size="middle">
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
							<IconInfoCircle
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
						{hasUserEquity && !canManageEquity && (
							<Button
								onClick={() => setTransferModalVisible(true)}
								type="default"
							>
								{t("Transfer My Share")}
							</Button>
						)}
						<Button
							icon={<IconHistory />}
							onClick={() => setTransactionsModalVisible(true)}
							type="text"
						></Button>
						{canManageEquity &&
							(screen.xs ? (
								<Button onClick={onManageEquity} icon={<IconSettings />} />
							) : (
								<Button onClick={onManageEquity} icon={<IconSettings />}>
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
								// The resulting teamShares array
								const shares = [];

								// Add the main (actual, vested) share when there is one
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

								// Add the promised share when there is one
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
			</Space>

			{/* Share transfer modal */}
			<EquityTransferModal
				open={transferModalVisible}
				onCancel={() => setTransferModalVisible(false)}
				projectId={projectId}
				currentUserId={session?.user?.id || ""}
				teamMembers={teamMembers}
			/>

			{/* Transaction history modal */}
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

/** The same card while the equity loads, so the tabs below it do not move. */
export const EquitySectionSkeleton = () => (
	<Card className={styles.equityCard}>
		<Flex vertical gap={16}>
			<Flex justify="space-between" align="center">
				<Skeleton.Input active size="small" />
				<Skeleton.Button active />
			</Flex>
			<Skeleton.Node active style={{ width: "100%", height: 60 }} />
		</Flex>
	</Card>
);

export default EquitySection;
