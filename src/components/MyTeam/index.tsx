import type {
	PaymentRateType,
	Team,
	TeamInvestor,
	TeamInvitation,
	TeamMember,
	TeamVacancy,
	User,
} from "@gdhub-io/gdhub-prisma";
import {
	IconAlertCircle,
	IconCoin,
	IconDotsVertical,
	IconExternalLink,
	IconHandStop,
	IconPencil,
	IconPlus,
	IconTrash,
	IconUserSearch,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Avatar,
	Button,
	Dropdown,
	Flex,
	Grid,
	Modal,
	message,
	Popover,
	Space,
	Table,
	Tabs,
	Tag,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useCallback, useContext, useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import ModernTable from "@/components/ModernTable";
import tableStyles from "@/components/ModernTable/ModernTable.module.scss";
import EquityShareModal from "@/components/modals/EquityShareModal";
import InviteMemberModal from "@/components/modals/InviteMemberModal";
import MemberEquityPromiseModal from "@/components/modals/MemberEquityPromiseModal";
import TeamMemberCard from "@/components/TeamMemberCard";
import { EmptyState } from "@/components/ui";
import { TeamMemberStatus } from "@/config/prisma-enums";
import { ProjectContext } from "@/contexts/ProjectContext";
import { gtmEventTrigger } from "@/helpers/gtm";
import EquitySection from "./EquitySection";
import InvestorModal from "./InvestorModal";
import ProjectAdviceArchiveModal from "./ProjectAdviceArchiveModal";

const { Paragraph, Text } = Typography;

/** Team member row with the offered compensation of the vacancy they applied through. */
type TeamMemberRow = TeamMember & {
	user: User;
	vacancy?: Pick<TeamVacancy, "offeredAmount" | "offeredRateType"> | null;
};

const getTelegramExpertLink = (specialityId: string) => {
	return `https://t.me/gdhub_experts_bot/app?startapp=expert_${specialityId}`;
};

const MyTeam = () => {
	const screens = Grid.useBreakpoint();
	const { t } = useTranslate();
	const [modal, contextHolder] = Modal.useModal();
	const contextProject = useContext(ProjectContext)?.contextProject;
	const { can } = useAccess();
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
	const [isEquityModalOpen, setIsEquityModalOpen] = useState(false);
	const [isMemberEquityPromiseModalOpen, setIsMemberEquityPromiseModalOpen] =
		useState(false);
	const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
	const [showMemberCard, setShowMemberCard] = useState(false);
	const [activeTab, setActiveTab] = useState<string>("members");
	const [isAddInvestorModalOpen, setIsAddInvestorModalOpen] = useState(false);
	const [selectedInvestorId, setSelectedInvestorId] = useState<string | null>(
		null,
	);
	const [adviceArchiveModal, setAdviceArchiveModal] = useState<{
		open: boolean;
		advisor: any | null;
	}>({
		open: false,
		advisor: null,
	});

	const {
		data: team,
		refetch: fetchMyTeam,
		isLoading: isLoadingMyTeam,
	} = useQuery({
		queryKey: ["user-project-team", contextProject?.team?.id],
		queryFn: () =>
			axios.get<
				Team & {
					members: TeamMemberRow[];
				}
			>("/api/user/project/team", {
				params: { teamId: contextProject?.team?.id },
			}),
		enabled: !!contextProject?.team?.id,
	});

	const {
		data: pendingInvitations,
		refetch: fetchPendingInvitations,
		isLoading: isLoadingPendingInvitations,
	} = useQuery({
		queryKey: ["team-pending-invitations", contextProject?.team?.id],
		queryFn: () =>
			axios.get<TeamInvitation[]>(
				"/api/user/project/team/pending-invitations",
				{
					params: { teamId: contextProject?.team?.id },
				},
			),
		enabled: !!contextProject?.team?.id && can("project.equity.view"),
	});

	const {
		data: advisors,
		refetch: fetchAdvisors,
		isLoading: isLoadingAdvisors,
		isFetched: isFetchedAdvisors,
	} = useQuery({
		queryKey: ["team-advisors", contextProject?.team?.id],
		queryFn: () =>
			axios.get<
				(User & {
					_count: any;
					specialities: { id: string; name: string }[];
				})[]
			>("/api/user/project/team/advisors", {
				params: { teamId: contextProject?.team?.id },
			}),
		enabled: !!contextProject?.team?.id,
	});

	const {
		data: investors,
		refetch: fetchInvestors,
		isLoading: isLoadingInvestors,
		isFetched: isFetchedInvestors,
	} = useQuery({
		queryKey: ["team-investors", contextProject?.team?.id],
		queryFn: () =>
			axios.get<TeamInvestor[]>("/api/user/project/team/investors", {
				params: { teamId: contextProject?.team?.id },
			}),
		enabled: !!contextProject?.team?.id,
	});

	const {
		data: projectEquity,
		refetch: fetchProjectEquity,
		isLoading: isLoadingEquity,
	} = useQuery({
		queryKey: ["project-equity", contextProject?.id],
		queryFn: () =>
			axios.get("/api/user/project/equity", {
				params: { projectId: contextProject?.id },
			}),
		enabled: !!contextProject?.id,
	});

	const { mutateAsync: fireMember, isPending: isFiring } = useMutation({
		mutationFn: (data: { id: string }) =>
			axios.put<void>("/api/user/project/vacancy/candidate/fire", data),
		onSuccess: () => {
			fetchMyTeam();
		},
	});

	const { mutateAsync: cancelInvitation, isPending: isCanceling } = useMutation(
		{
			mutationFn: (data: { id: string }) =>
				axios.delete<void>("/api/user/project/team/invitation", {
					params: data,
				}),
			onSuccess: () => {
				fetchPendingInvitations();
			},
		},
	);

	const { mutateAsync: deleteInvestor } = useMutation({
		mutationFn: (id: string) =>
			axios.delete(`/api/project/team-investor/${id}`),
		onSuccess: () => {
			fetchInvestors();
			message.success(t("Investor deleted"));
		},
		onError: () => message.error(t("Failed to delete investor")),
	});

	const handleFired = useCallback(
		async (teamMember: TeamMember) => {
			modal.confirm({
				title: t("Are you sure you want to fire this member?"),
				destroyOnHidden: true,
				type: "confirm",
				okText: "Yes",
				okType: "primary",
				cancelText: "No",
				icon: <IconAlertCircle />,
				content: t(
					"This action will dismisse the member from the team and delete all their equity promises.",
				),
				async onOk() {
					try {
						await fireMember({ id: teamMember.id });

						gtmEventTrigger("job", {
							action: "fire",
							vacancyName: teamMember.position,
							projectName: contextProject?.name,
						});

						message.success(t("The employee is dismissed"));
					} catch (error: any) {
						console.error(error);

						message.error(error.message);
					}
				},
				onCancel() {},
			});
		},
		[t, fireMember, fetchMyTeam],
	);

	const handleCancelInvitation = async (invitationId: string) => {
		try {
			await cancelInvitation({ id: invitationId });
			message.success(t("Invitation canceled"));
		} catch (error: any) {
			console.error(error);
			message.error(error.message);
		}
	};

	const handleOpenInviteModal = () => {
		setIsInviteModalOpen(true);
	};

	const handleCloseInviteModal = () => {
		setIsInviteModalOpen(false);
	};

	const handleInviteSuccess = () => {
		setIsInviteModalOpen(false);
		fetchMyTeam();
		fetchPendingInvitations();
	};

	const handleOpenEquityModal = () => {
		setIsEquityModalOpen(true);
	};

	const handleCloseEquityModal = () => {
		setIsEquityModalOpen(false);
	};

	const handleEquityUpdateSuccess = () => {
		setIsEquityModalOpen(false);
		fetchProjectEquity();
	};

	const getMemberShare = (memberId: string) => {
		if (!projectEquity?.data?.equityAllocations) return null;
		return projectEquity.data.equityAllocations.find(
			(share: any) => share.teamMemberId === memberId,
		);
	};

	const getMemberPromisePercentage = (memberId: string) => {
		if (!projectEquity?.data?.equityAllocations) return null;

		const memberPromises = projectEquity.data.equityAllocations
			.filter((allocation: any) => allocation.teamMemberId === memberId)
			.flatMap((allocation: any) => allocation.promises);

		return memberPromises.reduce(
			(acc: number, promise: any) => acc + promise.percentage,
			0,
		);
	};

	const handleOpenMemberEquityPromiseModal = (
		member: TeamMember & { user: User },
	) => {
		setSelectedMemberId(member.id);
		setIsMemberEquityPromiseModalOpen(true);
	};

	const handleCloseMemberEquityPromiseModal = () => {
		setIsMemberEquityPromiseModalOpen(false);
		setSelectedMemberId(null);
	};

	const handleDeleteMemberEquityPromise = () => {
		handleCloseMemberEquityPromiseModal();
		fetchProjectEquity();
	};

	const handleMemberEquityPromiseUpdateSuccess = (
		percentage: number,
		vested: boolean,
		targetStepId?: string,
	) => {
		handleCloseMemberEquityPromiseModal();
		fetchProjectEquity();
	};

	const getMaxAvailableShare = (currentPromiseShare: number) => {
		if (!projectEquity?.data) return 0;

		const teamTotal = projectEquity.data.equityAllocations?.reduce(
			(sum: number, share: any) =>
				sum +
				share.percentage +
				share.promises.reduce(
					(acc: number, promise: any) => acc + promise.percentage,
					0,
				),
			0,
		);
		const allocated =
			projectEquity.data.platformShare +
			projectEquity.data.mentorFundShare +
			projectEquity.data.investmentReserve +
			teamTotal;

		const remainingPercentage = 100 - allocated + currentPromiseShare;

		return Math.min(remainingPercentage, 97);
	};

	const handleShowMemberCard = (memberId: string) => {
		setSelectedMemberId(memberId);
		setShowMemberCard(true);
	};

	const handleCloseMemberCard = () => {
		setShowMemberCard(false);
		setSelectedMemberId(null);
	};

	const totalAdviceRequests =
		advisors?.data?.reduce(
			(sum, adv) => sum + (adv._count?.adviceRequestsForMe || 0),
			0,
		) || 0;
	const mentorFundShare = projectEquity?.data?.mentorFundShare || 0;

	// Calculate if all investment reserve is distributed
	const investmentReserve = projectEquity?.data?.investmentReserve || 0;
	const totalInvestorShare = (investors?.data || []).reduce(
		(sum, inv) => sum + (inv.share || 0),
		0,
	);
	const noAvailableInvestorShare =
		investmentReserve > 0 && totalInvestorShare >= investmentReserve;

	// Short suffix shown after the offered amount, mirrors VacancyCard wording.
	const rateSuffix: Record<PaymentRateType, string> = {
		Hourly: t("vacancy.rate.hourly", "/ hour"),
		OneTime: t("vacancy.rate.oneTime", "one-time"),
		Monthly: t("vacancy.rate.monthly", "/ month"),
	};

	const columns: ColumnsType<TeamMemberRow> = [
		{
			title: t("Team Member"),
			dataIndex: "id",
			key: "id",
			render: (value, record) => (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "flex-start",
					}}
				>
					<div
						role="button"
						tabIndex={0}
						style={{ display: "flex", alignItems: "center" }}
						onClick={() => handleShowMemberCard(record.id)}
					>
						<Avatar
							shape="square"
							size={32}
							src={record.user.image || null}
							style={{ marginRight: 8, cursor: "pointer" }}
						/>
						<span style={{ fontWeight: 500, cursor: "pointer" }}>
							{record.user.name}
						</span>
					</div>
					<Text type="secondary" style={{ fontSize: 12, marginLeft: 40 }}>
						{record.position || t("No position specified")}
					</Text>
				</div>
			),
		},
		{
			title: t("Position"),
			dataIndex: "position",
			key: "position",
			responsive: ["md"],
			render: (value, member) => {
				return member.status === TeamMemberStatus.Founder ? (
					<Space>
						<Text>{value}</Text>
						<Tag color="gold">founder</Tag>
					</Space>
				) : (
					value
				);
			},
		},
		{
			title: t("table.team.compensation", "Compensation"),
			key: "compensation",
			responsive: ["md"],
			render: (_, member) => {
				const amount = member.vacancy?.offeredAmount;
				const rateType = member.vacancy?.offeredRateType;

				// Only members who applied through a paid vacancy have offered terms.
				if (amount == null || rateType == null) {
					return <Text type="secondary">-</Text>;
				}

				return (
					<Text strong>
						€{amount.toLocaleString()} {rateSuffix[rateType]}
					</Text>
				);
			},
		},
		{
			title: t("Start and End Dates"),
			dataIndex: "startedAt",
			responsive: ["md"],
			key: "startedAt",
			render(value, member) {
				const startedAt = dayjs(member.startedAt).format("DD.MM.YYYY");
				const finishedAt = member.finishedAt
					? dayjs(member.finishedAt).format("DD.MM.YYYY")
					: t("present").toString();

				return (
					<Text className={tableStyles.tableMemberDates}>
						{t("start-and-end-dates", "from {fromDate} to {toDate}", {
							fromDate: startedAt,
							toDate: finishedAt,
						})}
					</Text>
				);
			},
		},
		{
			title: t("Time for work"),
			dataIndex: ["user", "profile", "timeForWork"],
			key: "timeForWork",
			responsive: ["md"],
			render: (value) => {
				if (!value) return null;

				if (value[0] === value[1]) {
					return (
						<Text>
							{value[0]} {t("hours/week")}
						</Text>
					);
				}

				return (
					<Text>
						{value[0]} - {value[1]} {t("hours/week")}
					</Text>
				);
			},
		},
		{
			title: t("Promises"),
			key: "promises",
			align: "center",
			render: (_, member) => {
				if (
					member.status === TeamMemberStatus.Fired ||
					member.status === TeamMemberStatus.Rejected
				) {
					return <Text type="secondary">-</Text>;
				}

				const memberShare = getMemberShare(member.id);

				if (!memberShare?.promises.length) {
					return (
						<Button
							type="text"
							size="small"
							icon={<IconHandStop />}
							onClick={() => handleOpenMemberEquityPromiseModal(member)}
						>
							{t("component.myTeam.makePromise", "Make Promise")}
						</Button>
					);
				}

				return <Text>{memberShare.promises[0].percentage.toFixed(1)}%</Text>;
			},
		},
		{
			title: t("Shares"),
			key: "shares",
			align: "center",
			render: (_, member) => {
				const shares = getMemberShare(member.id);

				if (!shares) {
					return <Text type="secondary">-</Text>;
				}

				return <Text>{shares.percentage.toFixed(1)}%</Text>;
			},
		},

		{
			title: "",
			key: "actions",
			render: (_, member) => {
				if (
					!can("project.members.remove") ||
					member.status === TeamMemberStatus.Fired
				)
					return null;

				const items = [
					{
						key: "edit-promise",
						label: t("Change Promise"),
						disabled: !getMemberShare(member.id)?.promises.length,
						icon: <IconHandStop size={16} />,
						onClick: () => handleOpenMemberEquityPromiseModal(member),
					},

					// {
					// 	key: 'transfer-share',
					// 	label: t('Transfer Share'),
					// 	icon: <BiTransfer size={16} />,
					// 	disabled: true,
					// },
					{
						type: "divider",
					},
					{
						key: "fire-member",
						label: t("Fire Member"),
						icon: <IconTrash size={16} />,
						disabled:
							member.status === TeamMemberStatus.Founder ||
							member.status === (TeamMemberStatus.Fired as any),
						danger: true,
						onClick: () => handleFired(member),
					},
				];

				return (
					<Dropdown
						menu={{
							items: items as any,
							onClick: ({ key, domEvent }) => {
								domEvent.stopPropagation();
							},
						}}
						trigger={["click"]}
					>
						<Button icon={<IconDotsVertical />} type="text" />
					</Dropdown>
				);
			},
		},
	];

	const pendingInvitationsColumns: ColumnsType<TeamInvitation> = [
		{
			title: t("Email"),
			key: "email",
			dataIndex: "email",
		},
		{
			title: t("Position"),
			dataIndex: "position",
			key: "position",
		},
		{
			title: t("Invited At"),
			dataIndex: "createdAt",
			key: "createdAt",
			responsive: ["md"],
			render: (value) => dayjs(value).format("DD.MM.YYYY"),
		},
		{
			title: t("Expires At"),
			dataIndex: "expiresAt",
			key: "expiresAt",
			responsive: ["md"],
			render: (value) => dayjs(value).format("DD.MM.YYYY"),
		},
		{
			key: "actions",
			title: t("Actions"),
			render: (_, invitation) => (
				<Button
					danger
					ghost
					onClick={() => handleCancelInvitation(invitation.id)}
				>
					{t("component.myTeam.cancel", "Cancel")}
				</Button>
			),
		},
	];

	// Advisors columns (conditionally hide some columns for non-authors)
	const advisorsColumnsBase: ColumnsType<
		User & { _count: any; specialities: any[] }
	> = [
		{
			key: "name",
			title: t("Name"),
			dataIndex: ["profile", "name"],
			render: (value, advisor) => {
				return (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "flex-start",
						}}
					>
						<div style={{ display: "flex", alignItems: "center" }}>
							<Avatar
								shape="square"
								size={32}
								src={advisor.image || null}
								style={{ marginRight: 8 }}
							/>
							<span style={{ fontWeight: 500 }}>{value}</span>
						</div>
						{advisor.specialities?.length ? (
							<Text type="secondary" style={{ fontSize: 12, marginLeft: 40 }}>
								{advisor.specialities.map((s: any) => s.name).join(", ")}
							</Text>
						) : null}
					</div>
				);
			},
		},
		{
			key: "approvedRequests",
			title: t("Approved requests"),
			dataIndex: ["_count", "adviceRequestsForMe"],
			align: "center",
			render: (value) => value || "-",
		},
		{
			key: "approximateShares",
			title: t("Approximate shares"),
			dataIndex: "_count",
			align: "center",
			render: (_count, advisor) => {
				if (!totalAdviceRequests || !mentorFundShare) return "-";
				const requests = _count?.adviceRequestsForMe || 0;
				if (requests < 3) return "-";
				const share = (requests / totalAdviceRequests) * mentorFundShare;
				return share.toFixed(2) + "%";
			},
		},
		{
			key: "actions",
			align: "right",
			title: "",
			render: (_, advisor) => (
				<>
					<Button
						type="default"
						href={getTelegramExpertLink(advisor.specialities[0].id)}
						target="_blank"
						rel="noopener noreferrer"
					>
						{t("New request")}
						<IconExternalLink style={{ marginLeft: 8 }} />
					</Button>
					{can("project.members.remove") && (
						<Button
							type="text"
							style={{ marginLeft: 8 }}
							onClick={() => handleOpenAdviceArchive(advisor)}
						>
							{t("Archive")}
						</Button>
					)}
				</>
			),
		},
	];

	const advisorsColumns = can("project.equity.view")
		? advisorsColumnsBase
		: advisorsColumnsBase.filter(
				(col) => col.key === "name" || col.key === "actions",
			);

	const investorsColumns: ColumnsType<TeamInvestor> = [
		{
			key: "name",
			title: t("Name"),
			dataIndex: "name",
			render: (value) => {
				return <Text strong>{value}</Text>;
			},
		},
		{
			key: "value",
			title: t("Value"),
			dataIndex: "value",
			render: (value, record) => {
				return (
					<Text>
						{value} {record.currency}
					</Text>
				);
			},
		},
		{
			key: "share",
			title: t("Share"),
			dataIndex: "share",
			render: (value) => {
				return <Text>{value}%</Text>;
			},
		},
		{
			key: "purchasedAt",
			title: t("Deal date"),
			dataIndex: "purchasedAt",
			render: (value) => {
				return <Text>{value ? dayjs(value).format("DD.MM.YYYY") : "-"}</Text>;
			},
		},
		{
			key: "actions",
			align: "right",
			render: (_, investor) => {
				const items = [
					{
						key: "edit",
						label: (
							<span style={{ display: "flex", alignItems: "center", gap: 8 }}>
								<IconPencil style={{ fontSize: 16 }} />
								{t("Edit")}
							</span>
						),
						onClick: () => handleEditInvestor(investor.id),
					},
					{
						type: "divider",
					},
					{
						key: "delete",
						label: (
							<Flex align="center" gap={8}>
								<IconTrash style={{ fontSize: 16 }} />
								{t("Delete")}
							</Flex>
						),
						danger: true,
						onClick: () => handleDeleteInvestor(investor.id),
					},
				];
				return (
					<Dropdown
						menu={{
							items: items as any,
							onClick: ({ key, domEvent }) => {
								domEvent.stopPropagation();
								if (key === "edit") handleEditInvestor(investor.id);
							},
						}}
						trigger={["click"]}
					>
						<Button icon={<IconDotsVertical />} type="text" />
					</Dropdown>
				);
			},
		},
	];

	const handleOpenAdviceArchive = (advisor: any) => {
		setAdviceArchiveModal({ open: true, advisor });
	};
	const handleCloseAdviceArchive = () => {
		setAdviceArchiveModal({ open: false, advisor: null });
	};

	const handleEditInvestor = (id: string) => {
		setSelectedInvestorId(id);
		setIsAddInvestorModalOpen(true);
	};

	const handleDeleteInvestor = async (id: string) => {
		const investor = investors?.data?.find((inv) => inv.id === id);
		Modal.confirm({
			title: (
				<span>
					{t(
						"modal.confirm.deleteInvestor",
						"Are you sure you want to delete investor information for {name}?",
						{
							name: investor?.name,
						},
					)}
				</span>
			),
			okType: "danger",
			onOk: async () => {
				await deleteInvestor(id);
			},
		});
	};

	return (
		<>
			{/* The project's equity breakdown */}
			{projectEquity?.data && contextProject?.id && (
				<EquitySection
					projectId={contextProject.id}
					canManageEquity={can("project.equity.manage")}
					equityData={projectEquity.data}
					teamMembers={team?.data.members || []}
					onManageEquity={handleOpenEquityModal}
				/>
			)}

			<Tabs
				size="large"
				activeKey={activeTab}
				onChange={setActiveTab}
				tabBarExtraContent={{
					right: (
						<div style={{ marginTop: -4 }}>
							{can("project.members.invite") &&
								(activeTab === "members" ||
								activeTab === "pending-invitations" ? (
									screens.xs ? (
										<Button
											type="primary"
											onClick={handleOpenInviteModal}
											icon={<IconPlus />}
										/>
									) : (
										<Button
											type="primary"
											onClick={handleOpenInviteModal}
											icon={<IconPlus />}
										>
											{t("component.myTeam.inviteMember", "Invite Member")}
										</Button>
									)
								) : activeTab === "advisors" ? (
									screens.xs ? (
										<Link href="/hub/experts" passHref legacyBehavior>
											<Button
												type="primary"
												style={{ marginLeft: 8 }}
												icon={<IconPlus />}
											/>
										</Link>
									) : (
										<Link href="/hub/experts" passHref legacyBehavior>
											<Button
												type="primary"
												style={{ marginLeft: 8 }}
												icon={<IconPlus />}
											>
												{t("component.myTeam.findMentors", "Find mentors")}
											</Button>
										</Link>
									)
								) : activeTab === "investors" ? (
									screens.xs ? (
										<Popover
											content={
												noAvailableInvestorShare
													? t("No available shares for new investor")
													: undefined
											}
											trigger={noAvailableInvestorShare ? "hover" : undefined}
										>
											<Button
												type="primary"
												onClick={() => setIsAddInvestorModalOpen(true)}
												icon={<IconPlus />}
												disabled={noAvailableInvestorShare}
											/>
										</Popover>
									) : (
										<Popover
											content={
												noAvailableInvestorShare
													? t("No available shares for new investor")
													: undefined
											}
											trigger={noAvailableInvestorShare ? "hover" : undefined}
										>
											<Button
												type="primary"
												onClick={() => setIsAddInvestorModalOpen(true)}
												icon={<IconPlus />}
												disabled={noAvailableInvestorShare}
											>
												{t("component.myTeam.addInvestor", "Add investor")}
											</Button>
										</Popover>
									)
								) : null)}
							{contextProject?.team?.id && (
								<InvestorModal
									teamId={contextProject.team.id}
									open={isAddInvestorModalOpen}
									onOk={() => {
										setIsAddInvestorModalOpen(false);
										setSelectedInvestorId(null);
										fetchInvestors();
									}}
									onCancel={() => {
										setIsAddInvestorModalOpen(false);
										setSelectedInvestorId(null);
									}}
									investmentReserve={
										projectEquity?.data?.investmentReserve || 0
									}
									investors={investors?.data || []}
									teamInvestorId={selectedInvestorId || undefined}
								/>
							)}
						</div>
					),
				}}
			>
				<Tabs.TabPane tab={t("Members")} key="members">
					<ModernTable
						loading={isLoadingMyTeam || isFiring}
						columns={columns}
						dataSource={team?.data.members?.map((m: any) => ({
							...m,
							key: m.id,
						}))}
						pagination={false}
					/>
				</Tabs.TabPane>
				{can("project.members.invite") &&
					pendingInvitations?.data &&
					pendingInvitations.data.length > 0 && (
						<Tabs.TabPane
							tab={t("Pending Invitations")}
							key="pending-invitations"
						>
							<ModernTable
								loading={isLoadingPendingInvitations || isCanceling}
								columns={pendingInvitationsColumns}
								dataSource={
									pendingInvitations?.data?.map((invitation) => ({
										...invitation,
										key: invitation.id,
									})) || []
								}
								pagination={false}
							/>
						</Tabs.TabPane>
					)}
				<Tabs.TabPane tab={t("Advisors")} key="advisors">
					{isFetchedAdvisors && advisors?.data?.length ? (
						<ModernTable
							loading={isLoadingAdvisors}
							columns={advisorsColumns}
							dataSource={
								advisors?.data?.map((advisor) => ({
									...advisor,
									key: advisor.id,
								})) || []
							}
							pagination={false}
						/>
					) : (
						<EmptyState
							icon={IconUserSearch}
							title={t("Does not have any advisors yet.")}
							description={t(
								"Find an expert or a mentor on the Experts page and send a consultation request.",
							)}
							action={
								<Link href="/hub/experts">
									<Button>{t("Browse experts")}</Button>
								</Link>
							}
						/>
					)}
				</Tabs.TabPane>
				{can("project.equity.view") && (
					<Tabs.TabPane tab={t("Investors")} key="investors">
						{isFetchedInvestors && investors?.data?.length ? (
							<>
								<Paragraph type="secondary" style={{ marginTop: 16 }}>
									{t("table.investors.description")}
								</Paragraph>

								<ModernTable
									loading={isLoadingInvestors}
									columns={investorsColumns}
									dataSource={
										investors?.data?.map((investor) => ({
											...investor,
											key: investor.id,
										})) || []
									}
									pagination={false}
									summary={(pageData) => {
										// Calculate total value and share
										const totalValueByCurrency: Record<string, number> = {};
										let totalShare = 0;
										(investors?.data || []).forEach((inv) => {
											if (inv.currency) {
												totalValueByCurrency[inv.currency] =
													(totalValueByCurrency[inv.currency] || 0) +
													(inv.value || 0);
											}
											totalShare += inv.share || 0;
										});
										return (
											<Table.Summary.Row
												style={{ background: "var(--gd-color-border)" }}
											>
												<Table.Summary.Cell
													index={(investors?.data?.length || 0) + 1}
												>
													<Text strong>
														{t("component.myTeam.total", "Total")}
													</Text>
												</Table.Summary.Cell>
												<Table.Summary.Cell
													index={(investors?.data?.length || 0) + 2}
												>
													<Text strong>
														{Object.entries(totalValueByCurrency)
															.map(
																([currency, value]) => `${value} ${currency}`,
															)
															.join(", ")}
													</Text>
												</Table.Summary.Cell>
												<Table.Summary.Cell
													index={(investors?.data?.length || 0) + 3}
													colSpan={3}
												>
													<Text strong>{totalShare}%</Text>
												</Table.Summary.Cell>
											</Table.Summary.Row>
										);
									}}
								/>
							</>
						) : (
							<EmptyState
								icon={IconCoin}
								title={t("Does not have any investors yet")}
								description={t(
									"Investors who back this project will be listed here.",
								)}
							/>
						)}
					</Tabs.TabPane>
				)}
			</Tabs>

			{contextProject?.team?.id && (
				<>
					{contextHolder}
					<InviteMemberModal
						open={isInviteModalOpen}
						onOk={handleInviteSuccess}
						onCancel={handleCloseInviteModal}
						teamId={contextProject?.team?.id || ""}
						projectName={contextProject?.name || ""}
					/>
					<EquityShareModal
						open={isEquityModalOpen}
						onOk={handleEquityUpdateSuccess}
						onCancel={handleCloseEquityModal}
						projectEquity={projectEquity?.data}
						investors={investors?.data}
					/>
					{selectedMemberId && (
						<MemberEquityPromiseModal
							open={isMemberEquityPromiseModalOpen}
							onOk={handleMemberEquityPromiseUpdateSuccess}
							onCancel={handleCloseMemberEquityPromiseModal}
							onDelete={handleDeleteMemberEquityPromise}
							memberId={selectedMemberId}
							memberName={
								team?.data.members.find((m: any) => m.id === selectedMemberId)
									?.user.name || "Unknown"
							}
							promiseId={getMemberShare(selectedMemberId)?.promises[0]?.id}
							maxShare={getMaxAvailableShare(
								getMemberPromisePercentage(selectedMemberId) || 0,
							)}
							projectId={contextProject?.id || ""}
							isVested={getMemberShare(selectedMemberId)?.vested || true}
						/>
					)}
				</>
			)}

			{selectedMemberId && (
				<TeamMemberCard
					memberId={selectedMemberId}
					open={showMemberCard}
					onCancel={handleCloseMemberCard}
				/>
			)}

			<ProjectAdviceArchiveModal
				open={adviceArchiveModal.open}
				advisor={adviceArchiveModal.advisor}
				projectId={contextProject?.id || ""}
				onClose={handleCloseAdviceArchive}
			/>
		</>
	);
};

export default MyTeam;
