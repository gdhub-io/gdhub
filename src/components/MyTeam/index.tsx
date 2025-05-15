import { useCallback, useContext, useState } from 'react'
import EquityShareModal from '@/components/modals/EquityShareModal'
import InviteMemberModal from '@/components/modals/InviteMemberModal'
import MemberEquityPromiseModal from '@/components/modals/MemberEquityPromiseModal'
import ModernTable from '@/components/ModernTable'
import tableStyles from '@/components/ModernTable/ModernTable.module.scss'
import TeamMemberCard from '@/components/TeamMemberCard'
import { ProjectContext } from '@/contexts/ProjectContext'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { EditOutlined } from '@ant-design/icons'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { AiOutlinePlus } from '@react-icons/all-files/ai/AiOutlinePlus'
import { BiTrash } from '@react-icons/all-files/bi/BiTrash'
import { GoLinkExternal } from '@react-icons/all-files/go/GoLinkExternal'
import { MdOutlineHandshake } from '@react-icons/all-files/md/MdOutlineHandshake'
import { MdOutlineMonetizationOn } from '@react-icons/all-files/md/MdOutlineMonetizationOn'
import { MdOutlineSupportAgent } from '@react-icons/all-files/md/MdOutlineSupportAgent'
import { TbDotsVertical } from '@react-icons/all-files/tb/TbDotsVertical'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import {
	Button,
	Grid,
	message,
	Typography,
	Tag,
	Space,
	Dropdown,
	Modal,
	Avatar,
	Tabs,
	Empty,
	Flex,
	Table,
	Popover,
} from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import EquitySection from './EquitySection'
import InvestorModal from './InvestorModal'
import ProjectAdviceArchiveModal from './ProjectAdviceArchiveModal'

const { Paragraph, Text } = Typography

const getTelegramExpertLink = (specialityId: string) => {
	return `https://t.me/gdhub_experts_bot/app?startapp=expert_${specialityId}`
}

const MyTeam = () => {
	const screens = Grid.useBreakpoint()
	const { t } = useTolgee()
	const [modal, contextHolder] = Modal.useModal()
	const contextProject = useContext(ProjectContext)?.contextProject
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
	const [isEquityModalOpen, setIsEquityModalOpen] = useState(false)
	const [isMemberEquityPromiseModalOpen, setIsMemberEquityPromiseModalOpen] = useState(false)
	const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
	const [showMemberCard, setShowMemberCard] = useState(false)
	const [activeTab, setActiveTab] = useState<string>('members')
	const [isAddInvestorModalOpen, setIsAddInvestorModalOpen] = useState(false)
	const [selectedInvestorId, setSelectedInvestorId] = useState<string | null>(null)
	const [adviceArchiveModal, setAdviceArchiveModal] = useState<{
		open: boolean
		advisor: any | null
	}>({
		open: false,
		advisor: null,
	})

	const {
		data: team,
		refetch: fetchMyTeam,
		isLoading: isLoadingMyTeam,
	} = useQuery(
		['user-project-team', contextProject?.teamId],
		() =>
			axios.get<prismaClient.Team & { members: (prismaClient.TeamMember & { user: prismaClient.User })[] }>(
				'/api/user/project/team',
				{
					params: { teamId: contextProject?.teamId },
				}
			),
		{
			enabled: !!contextProject?.teamId,
		}
	)

	const {
		data: pendingInvitations,
		refetch: fetchPendingInvitations,
		isLoading: isLoadingPendingInvitations,
	} = useQuery(
		['team-pending-invitations', contextProject?.teamId],
		() =>
			axios.get<prismaClient.TeamInvitation[]>('/api/user/project/team/pending-invitations', {
				params: { teamId: contextProject?.teamId },
			}),
		{
			enabled: !!contextProject?.teamId && !!contextProject?.isProjectAuthor,
		}
	)

	const {
		data: advisors,
		refetch: fetchAdvisors,
		isLoading: isLoadingAdvisors,
		isFetched: isFetchedAdvisors,
	} = useQuery(
		['team-advisors', contextProject?.teamId],
		() =>
			axios.get<(prismaClient.User & { _count: any; specialities: { id: string; name: string }[] })[]>(
				'/api/user/project/team/advisors',
				{
					params: { teamId: contextProject?.teamId },
				}
			),
		{
			enabled: !!contextProject?.teamId,
		}
	)

	const {
		data: investors,
		refetch: fetchInvestors,
		isLoading: isLoadingInvestors,
		isFetched: isFetchedInvestors,
	} = useQuery(
		['team-investors', contextProject?.teamId],
		() =>
			axios.get<prismaClient.TeamInvestor[]>('/api/user/project/team/investors', {
				params: { teamId: contextProject?.teamId },
			}),
		{
			enabled: !!contextProject?.teamId,
		}
	)

	const {
		data: projectEquity,
		refetch: fetchProjectEquity,
		isLoading: isLoadingEquity,
	} = useQuery(
		['project-equity', contextProject?.id],
		() =>
			axios.get('/api/user/project/equity', {
				params: { projectId: contextProject?.id },
			}),
		{
			enabled: !!contextProject?.id,
		}
	)

	const { mutateAsync: fireMember, isLoading: isFiring } = useMutation(
		(data: { id: string }) => axios.put<void>('/api/user/project/vacancy/candidate/fire', data),
		{
			onSuccess: () => {
				fetchMyTeam()
			},
		}
	)

	const { mutateAsync: cancelInvitation, isLoading: isCanceling } = useMutation(
		(data: { id: string }) => axios.delete<void>('/api/user/project/team/invitation', { params: data }),
		{
			onSuccess: () => {
				fetchPendingInvitations()
			},
		}
	)

	const { mutateAsync: deleteInvestor } = useMutation(
		(id: string) => axios.delete(`/api/project/team-investor/${id}`),
		{
			onSuccess: () => {
				fetchInvestors()
				message.success(t('Investor deleted'))
			},
			onError: () => message.error(t('Failed to delete investor')),
		}
	)

	const handleFired = useCallback(
		async (teamMemberId: string) => {
			modal.confirm({
				title: t('Are you sure you want to fire this member?'),
				destroyOnClose: true,
				type: 'confirm',
				okText: 'Yes',
				okType: 'primary',
				cancelText: 'No',
				icon: <ExclamationCircleOutlined />,
				content: t('This action will dismisse the member from the team and delete all their equity promises.'),
				async onOk() {
					try {
						await fireMember({ id: teamMemberId })
						fetchMyTeam()

						message.success(t('The employee is dismissed'))
					} catch (error: any) {
						console.log(error)

						message.error(error.message)
					}
				},
				onCancel() {},
			})
		},
		[t, fireMember, fetchMyTeam]
	)

	const handleCancelInvitation = async (invitationId: string) => {
		try {
			await cancelInvitation({ id: invitationId })
			message.success(t('Invitation canceled'))
		} catch (error: any) {
			console.log(error)
			message.error(error.message)
		}
	}

	const handleOpenInviteModal = () => {
		setIsInviteModalOpen(true)
	}

	const handleCloseInviteModal = () => {
		setIsInviteModalOpen(false)
	}

	const handleInviteSuccess = () => {
		setIsInviteModalOpen(false)
		fetchMyTeam()
		fetchPendingInvitations()
	}

	const handleOpenEquityModal = () => {
		setIsEquityModalOpen(true)
	}

	const handleCloseEquityModal = () => {
		setIsEquityModalOpen(false)
	}

	const handleEquityUpdateSuccess = () => {
		setIsEquityModalOpen(false)
		fetchProjectEquity()
	}

	const getMemberShare = (memberId: string) => {
		if (!projectEquity?.data?.equityAllocations) return null
		return projectEquity.data.equityAllocations.find((share: any) => share.teamMemberId === memberId)
	}

	const getMemberPromisePercentage = (memberId: string) => {
		if (!projectEquity?.data?.equityAllocations) return null

		const memberPromises = projectEquity.data.equityAllocations
			.filter((allocation: any) => allocation.teamMemberId === memberId)
			.flatMap((allocation: any) => allocation.promises)

		console.log(memberId, memberPromises)

		return memberPromises.reduce((acc: number, promise: any) => acc + promise.percentage, 0)
	}

	const handleOpenMemberEquityPromiseModal = (member: prismaClient.TeamMember & { user: prismaClient.User }) => {
		setSelectedMemberId(member.id)
		setIsMemberEquityPromiseModalOpen(true)
	}

	const handleCloseMemberEquityPromiseModal = () => {
		setIsMemberEquityPromiseModalOpen(false)
		setSelectedMemberId(null)
	}

	const handleDeleteMemberEquityPromise = () => {
		handleCloseMemberEquityPromiseModal()
		fetchProjectEquity()
	}

	const handleMemberEquityPromiseUpdateSuccess = (percentage: number, vested: boolean, targetStepId?: string) => {
		handleCloseMemberEquityPromiseModal()
		fetchProjectEquity()
	}

	const getMaxAvailableShare = (currentPromiseShare: number) => {
		if (!projectEquity?.data) return 0

		const teamTotal = projectEquity.data.equityAllocations?.reduce(
			(sum: number, share: any) =>
				sum + share.percentage + share.promises.reduce((acc: number, promise: any) => acc + promise.percentage, 0),
			0
		)
		const allocated =
			projectEquity.data.platformShare +
			projectEquity.data.mentorFundShare +
			projectEquity.data.investmentReserve +
			teamTotal

		const remainingPercentage = 100 - allocated + currentPromiseShare

		return Math.min(remainingPercentage, 97)
	}

	const handleShowMemberCard = (memberId: string) => {
		setSelectedMemberId(memberId)
		setShowMemberCard(true)
	}

	const handleCloseMemberCard = () => {
		setShowMemberCard(false)
		setSelectedMemberId(null)
	}

	const totalAdviceRequests = advisors?.data?.reduce((sum, adv) => sum + (adv._count?.adviceRequestsForMe || 0), 0) || 0
	const mentorFundShare = projectEquity?.data?.mentorFundShare || 0

	// Calculate if all investment reserve is distributed
	const investmentReserve = projectEquity?.data?.investmentReserve || 0
	const totalInvestorShare = (investors?.data || []).reduce((sum, inv) => sum + (inv.share || 0), 0)
	const noAvailableInvestorShare = investmentReserve > 0 && totalInvestorShare >= investmentReserve

	const columns: ColumnsType<prismaClient.TeamMember & { user: prismaClient.User }> = [
		{
			title: t('Team Member'),
			dataIndex: 'id',
			key: 'id',
			render: (value, record) => (
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
					<div style={{ display: 'flex', alignItems: 'center' }} onClick={() => handleShowMemberCard(record.id)}>
						<Avatar
							shape="square"
							size={32}
							src={record.user.image || null}
							style={{ marginRight: 8, cursor: 'pointer' }}
						/>
						<span style={{ fontWeight: 500, cursor: 'pointer' }}>{record.user.name}</span>
					</div>
					<Text type="secondary" style={{ fontSize: 12, marginLeft: 40 }}>
						{record.position || t('No position specified')}
					</Text>
				</div>
			),
		},
		{
			title: t('Position'),
			dataIndex: 'position',
			key: 'position',
			responsive: ['md'],
			render: (value, member) => {
				return member.status === prismaClient.TeamMemberStatus.Founder ? (
					<Space>
						<Text>{value}</Text>
						<Tag color="gold">founder</Tag>
					</Space>
				) : (
					value
				)
			},
		},
		{
			title: t('Start and End Dates'),
			dataIndex: 'startedAt',
			responsive: ['md'],
			key: 'startedAt',
			render(value, member) {
				let startedAt = dayjs(member.startedAt).format('DD.MM.YYYY')
				let finishedAt = member.finishedAt ? dayjs(member.finishedAt).format('DD.MM.YYYY') : t('present').toString()

				return (
					<Text className={tableStyles.tableMemberDates}>
						{t('start-and-end-dates', 'from {fromDate} to {toDate}', {
							fromDate: startedAt,
							toDate: finishedAt,
						})}
					</Text>
				)
			},
		},
		{
			title: t('Time for work'),
			dataIndex: ['user', 'profile', 'timeForWork'],
			key: 'timeForWork',
			responsive: ['md'],
			render: (value) => {
				if (!value) return null

				if (value[0] === value[1]) {
					return (
						<Text>
							{value[0]} {t('hours/week')}
						</Text>
					)
				}

				return (
					<Text>
						{value[0]} - {value[1]} {t('hours/week')}
					</Text>
				)
			},
		},
		{
			title: t('Promises'),
			key: 'promises',
			align: 'center',
			render: (_, member) => {
				if (
					member.status === prismaClient.TeamMemberStatus.Fired ||
					member.status === prismaClient.TeamMemberStatus.Rejected
				) {
					return <Text type="secondary">-</Text>
				}

				const memberShare = getMemberShare(member.id)

				if (!memberShare?.promises.length) {
					return (
						<Button
							type="text"
							size="small"
							icon={<MdOutlineHandshake />}
							onClick={() => handleOpenMemberEquityPromiseModal(member)}
						>
							<T>Make Promise</T>
						</Button>
					)
				}

				return <Text>{memberShare.promises[0].percentage.toFixed(1)}%</Text>
			},
		},
		{
			title: t('Shares'),
			key: 'shares',
			align: 'center',
			render: (_, member) => {
				const shares = getMemberShare(member.id)

				if (!shares) {
					return <Text type="secondary">-</Text>
				}

				return <Text>{shares.percentage.toFixed(1)}%</Text>
			},
		},

		{
			title: '',
			key: 'actions',
			render: (_, member) => {
				if (!contextProject?.isProjectAuthor || member.status === prismaClient.TeamMemberStatus.Fired) return null

				const items = [
					{
						key: 'edit-promise',
						label: t('Change Promise'),
						disabled: !getMemberShare(member.id)?.promises.length,
						icon: <MdOutlineHandshake size={16} />,
						onClick: () => handleOpenMemberEquityPromiseModal(member),
					},

					// {
					// 	key: 'transfer-share',
					// 	label: t('Transfer Share'),
					// 	icon: <BiTransfer size={16} />,
					// 	disabled: true,
					// },
					{
						type: 'divider',
					},
					{
						key: 'fire-member',
						label: t('Fire Member'),
						icon: <BiTrash size={16} />,
						disabled:
							member.status === prismaClient.TeamMemberStatus.Founder ||
							member.status === (prismaClient.TeamMemberStatus.Fired as any),
						danger: true,
						onClick: () => handleFired(member.id),
					},
				]

				return (
					<Dropdown
						menu={{
							items: items as any,
							onClick: ({ key, domEvent }) => {
								domEvent.stopPropagation()
							},
						}}
						trigger={['click']}
					>
						<Button icon={<TbDotsVertical />} type="text" className="light-gray-text-btn" />
					</Dropdown>
				)
			},
		},
	]

	const pendingInvitationsColumns: ColumnsType<prismaClient.TeamInvitation> = [
		{
			title: t('Email'),
			key: 'email',
			dataIndex: 'email',
		},
		{
			title: t('Position'),
			dataIndex: 'position',
			key: 'position',
		},
		{
			title: t('Invited At'),
			dataIndex: 'createdAt',
			key: 'createdAt',
			responsive: ['md'],
			render: (value) => dayjs(value).format('DD.MM.YYYY'),
		},
		{
			title: t('Expires At'),
			dataIndex: 'expiresAt',
			key: 'expiresAt',
			responsive: ['md'],
			render: (value) => dayjs(value).format('DD.MM.YYYY'),
		},
		{
			key: 'actions',
			title: t('Actions'),
			render: (_, invitation) => (
				<Button danger ghost onClick={() => handleCancelInvitation(invitation.id)}>
					<T>Cancel</T>
				</Button>
			),
		},
	]

	// Advisors columns (conditionally hide some columns for non-authors)
	const advisorsColumnsBase: ColumnsType<prismaClient.User & { _count: any; specialities: any[] }> = [
		{
			key: 'name',
			title: t('Name'),
			dataIndex: ['profile', 'name'],
			render: (value, advisor) => {
				return (
					<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
						<div style={{ display: 'flex', alignItems: 'center' }}>
							<Avatar shape="square" size={32} src={advisor.image || null} style={{ marginRight: 8 }} />
							<span style={{ fontWeight: 500 }}>{value}</span>
						</div>
						{advisor.specialities?.length ? (
							<Text type="secondary" style={{ fontSize: 12, marginLeft: 40 }}>
								{advisor.specialities.map((s: any) => s.name).join(', ')}
							</Text>
						) : null}
					</div>
				)
			},
		},
		{
			key: 'approvedRequests',
			title: t('Approved requests'),
			dataIndex: ['_count', 'adviceRequestsForMe'],
			align: 'center',
			render: (value) => value || '-',
		},
		{
			key: 'approximateShares',
			title: t('Approximate shares'),
			dataIndex: '_count',
			align: 'center',
			render: (_count, advisor) => {
				if (!totalAdviceRequests || !mentorFundShare) return '-'
				const requests = _count?.adviceRequestsForMe || 0
				if (requests < 3) return '-'
				const share = (requests / totalAdviceRequests) * mentorFundShare
				return share.toFixed(2) + '%'
			},
		},
		{
			key: 'actions',
			align: 'right',
			title: '',
			render: (_, advisor) => (
				<>
					<Button
						type="default"
						href={getTelegramExpertLink(advisor.specialities[0].id)}
						target="_blank"
						rel="noopener noreferrer"
					>
						{t('New request')}
						<GoLinkExternal style={{ marginLeft: 8 }} />
					</Button>
					{contextProject?.isProjectAuthor && (
						<Button type="text" style={{ marginLeft: 8 }} onClick={() => handleOpenAdviceArchive(advisor)}>
							{t('Archive')}
						</Button>
					)}
				</>
			),
		},
	]

	const advisorsColumns = contextProject?.isProjectAuthor
		? advisorsColumnsBase
		: advisorsColumnsBase.filter((col) => col.key === 'name' || col.key === 'actions')

	const investorsColumns: ColumnsType<prismaClient.TeamInvestor> = [
		{
			key: 'name',
			title: t('Name'),
			dataIndex: 'name',
			render: (value) => {
				return <Text strong>{value}</Text>
			},
		},
		{
			key: 'value',
			title: t('Value'),
			dataIndex: 'value',
			render: (value, record) => {
				return (
					<Text>
						{value} {record.currency}
					</Text>
				)
			},
		},
		{
			key: 'share',
			title: t('Share'),
			dataIndex: 'share',
			render: (value) => {
				return <Text>{value}%</Text>
			},
		},
		{
			key: 'purchasedAt',
			title: t('Deal date'),
			dataIndex: 'purchasedAt',
			render: (value) => {
				return <Text>{value ? dayjs(value).format('DD.MM.YYYY') : '-'}</Text>
			},
		},
		{
			key: 'actions',
			align: 'right',
			render: (_, investor) => {
				const items = [
					{
						key: 'edit',
						label: (
							<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
								<EditOutlined style={{ fontSize: 16 }} />
								{t('Edit')}
							</span>
						),
						onClick: () => handleEditInvestor(investor.id),
					},
					{
						type: 'divider',
					},
					{
						key: 'delete',
						label: (
							<Flex align="center" gap={8}>
								<BiTrash style={{ fontSize: 16 }} />
								{t('Delete')}
							</Flex>
						),
						danger: true,
						onClick: () => handleDeleteInvestor(investor.id),
					},
				]
				return (
					<Dropdown
						menu={{
							items: items as any,
							onClick: ({ key, domEvent }) => {
								domEvent.stopPropagation()
								if (key === 'edit') handleEditInvestor(investor.id)
							},
						}}
						trigger={['click']}
					>
						<Button icon={<TbDotsVertical />} type="text" className="light-gray-text-btn" />
					</Dropdown>
				)
			},
		},
	]

	const handleOpenAdviceArchive = (advisor: any) => {
		setAdviceArchiveModal({ open: true, advisor })
	}
	const handleCloseAdviceArchive = () => {
		setAdviceArchiveModal({ open: false, advisor: null })
	}

	const handleEditInvestor = (id: string) => {
		setSelectedInvestorId(id)
		setIsAddInvestorModalOpen(true)
	}

	const handleDeleteInvestor = async (id: string) => {
		const investor = investors?.data?.find((inv) => inv.id === id)
		Modal.confirm({
			title: (
				<span>
					{t('modal.confirm.deleteInvestor', 'Are you sure you want to delete investor information for {name}?', {
						name: investor?.name,
					})}
				</span>
			),
			okType: 'danger',
			onOk: async () => {
				await deleteInvestor(id)
			},
		})
	}

	return (
		<>
			{/* Отображение информации о долях проекта */}
			{projectEquity?.data && contextProject?.id && (
				<EquitySection
					projectId={contextProject.id}
					isProjectAuthor={contextProject.isProjectAuthor || false}
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
							{contextProject?.isProjectAuthor &&
								(activeTab === 'members' || activeTab === 'pending-invitations' ? (
									screens.xs ? (
										<Button type="primary" onClick={handleOpenInviteModal} icon={<AiOutlinePlus />} />
									) : (
										<Button type="primary" onClick={handleOpenInviteModal} icon={<AiOutlinePlus />}>
											<T>Invite Member</T>
										</Button>
									)
								) : activeTab === 'advisors' ? (
									screens.xs ? (
										<Link href="/hub/mentors" passHref legacyBehavior>
											<Button type="primary" style={{ marginLeft: 8 }} icon={<AiOutlinePlus />} />
										</Link>
									) : (
										<Link href="/hub/mentors" passHref legacyBehavior>
											<Button type="primary" style={{ marginLeft: 8 }} icon={<AiOutlinePlus />}>
												<T>Find mentors</T>
											</Button>
										</Link>
									)
								) : activeTab === 'investors' ? (
									screens.xs ? (
										<Popover
											content={noAvailableInvestorShare ? t('No available shares for new investor') : undefined}
											trigger={noAvailableInvestorShare ? 'hover' : undefined}
										>
											<Button
												type="primary"
												onClick={() => setIsAddInvestorModalOpen(true)}
												icon={<AiOutlinePlus />}
												disabled={noAvailableInvestorShare}
											/>
										</Popover>
									) : (
										<Popover
											content={noAvailableInvestorShare ? t('No available shares for new investor') : undefined}
											trigger={noAvailableInvestorShare ? 'hover' : undefined}
										>
											<Button
												type="primary"
												onClick={() => setIsAddInvestorModalOpen(true)}
												icon={<AiOutlinePlus />}
												disabled={noAvailableInvestorShare}
											>
												<T>Add investor</T>
											</Button>
										</Popover>
									)
								) : null)}
							{contextProject?.teamId && (
								<InvestorModal
									teamId={contextProject.teamId}
									open={isAddInvestorModalOpen}
									onOk={() => {
										setIsAddInvestorModalOpen(false)
										setSelectedInvestorId(null)
										fetchInvestors()
									}}
									onCancel={() => {
										setIsAddInvestorModalOpen(false)
										setSelectedInvestorId(null)
									}}
									investmentReserve={projectEquity?.data?.investmentReserve || 0}
									investors={investors?.data || []}
									teamInvestorId={selectedInvestorId || undefined}
								/>
							)}
						</div>
					),
				}}
			>
				<Tabs.TabPane tab={t('Members')} key="members">
					<ModernTable
						loading={isLoadingMyTeam || isFiring}
						columns={columns}
						dataSource={team?.data.members?.map((m: any) => ({ ...m, key: m.id }))}
						pagination={false}
					/>
				</Tabs.TabPane>
				{contextProject?.isProjectAuthor && pendingInvitations?.data && pendingInvitations.data.length > 0 && (
					<Tabs.TabPane tab={t('Pending Invitations')} key="pending-invitations">
						<ModernTable
							loading={isLoadingPendingInvitations || isCanceling}
							columns={pendingInvitationsColumns}
							dataSource={pendingInvitations?.data?.map((invitation) => ({ ...invitation, key: invitation.id })) || []}
							pagination={false}
						/>
					</Tabs.TabPane>
				)}
				<Tabs.TabPane tab={t('Advisors')} key="advisors">
					{isFetchedAdvisors && advisors?.data?.length ? (
						<ModernTable
							loading={isLoadingAdvisors}
							columns={advisorsColumns}
							dataSource={advisors?.data?.map((advisor) => ({ ...advisor, key: advisor.id })) || []}
							pagination={false}
						/>
					) : (
						<Empty
							style={{ marginTop: 32 }}
							image={<MdOutlineSupportAgent size={64} color="#bfbfbf" />}
							description={
								<span>
									{t('Does not have any advisors yet.')}
									<br />
									{t('If you need one, you can find experts or mentors on the ')}
									<Link href="/hub/mentors">Mentors page</Link>
									{t(' and send a consultation request.')}
								</span>
							}
						/>
					)}
				</Tabs.TabPane>
				{contextProject?.isProjectAuthor && (
					<Tabs.TabPane tab={t('Investors')} key="investors">
						{isFetchedInvestors && investors?.data?.length ? (
							<>
								<Paragraph type="secondary" style={{ marginTop: 16 }}>
									{t('table.investors.description')}
								</Paragraph>

								<ModernTable
									loading={isLoadingInvestors}
									columns={investorsColumns}
									dataSource={investors?.data?.map((investor) => ({ ...investor, key: investor.id })) || []}
									pagination={false}
									summary={(pageData) => {
										// Calculate total value and share
										const totalValueByCurrency: Record<string, number> = {}
										let totalShare = 0
										;(investors?.data || []).forEach((inv) => {
											if (inv.currency) {
												totalValueByCurrency[inv.currency] =
													(totalValueByCurrency[inv.currency] || 0) + (inv.value || 0)
											}
											totalShare += inv.share || 0
										})
										return (
											<Table.Summary.Row style={{ background: '#eee' }}>
												<Table.Summary.Cell index={(investors?.data?.length || 0) + 1}>
													<Text strong>Total</Text>
												</Table.Summary.Cell>
												<Table.Summary.Cell index={(investors?.data?.length || 0) + 2}>
													<Text strong>
														{Object.entries(totalValueByCurrency)
															.map(([currency, value]) => `${value} ${currency}`)
															.join(', ')}
													</Text>
												</Table.Summary.Cell>
												<Table.Summary.Cell index={(investors?.data?.length || 0) + 3} colSpan={3}>
													<Text strong>{totalShare}%</Text>
												</Table.Summary.Cell>
											</Table.Summary.Row>
										)
									}}
								/>
							</>
						) : (
							<Empty
								style={{ marginTop: 32 }}
								image={<MdOutlineMonetizationOn size={64} color="#bfbfbf" />}
								description={t('Does not have any investors yet')}
							/>
						)}
					</Tabs.TabPane>
				)}
			</Tabs>

			{contextProject?.teamId && (
				<>
					{contextHolder}
					<InviteMemberModal
						open={isInviteModalOpen}
						onOk={handleInviteSuccess}
						onCancel={handleCloseInviteModal}
						teamId={contextProject?.teamId || ''}
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
							memberName={team?.data.members.find((m: any) => m.id === selectedMemberId)?.user.name || 'Unknown'}
							promiseId={getMemberShare(selectedMemberId)?.promises[0]?.id}
							maxShare={getMaxAvailableShare(getMemberPromisePercentage(selectedMemberId) || 0)}
							projectId={contextProject?.id || ''}
							isVested={getMemberShare(selectedMemberId)?.vested || true}
						/>
					)}
				</>
			)}

			{selectedMemberId && (
				<TeamMemberCard memberId={selectedMemberId} open={showMemberCard} onCancel={handleCloseMemberCard} />
			)}

			<ProjectAdviceArchiveModal
				open={adviceArchiveModal.open}
				advisor={adviceArchiveModal.advisor}
				projectId={contextProject?.id || ''}
				onClose={handleCloseAdviceArchive}
			/>
		</>
	)
}

export default MyTeam
