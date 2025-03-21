import { useState } from 'react'
import EquityTransferModal from '@/components/modals/EquityTransferModal'
import { AiOutlineHistory } from '@react-icons/all-files/ai/AiOutlineHistory'
import { useTolgee } from '@tolgee/react'
import { Card, Typography, Button, Space, Modal } from 'antd'
import { useSession } from 'next-auth/react'
import EquityPlot from './EquityPlot'
import styles from './EquitySection.module.scss'
import EquityTransactions from './EquityTransactions'

const { Title } = Typography

interface EquitySectionProps {
	projectId: string
	isProjectAuthor: boolean
	equityData: any
	teamMembers: any[]
	onManageEquity: () => void
}

const EquitySection: React.FC<EquitySectionProps> = ({
	projectId,
	isProjectAuthor,
	equityData,
	teamMembers,
	onManageEquity,
}) => {
	const { t } = useTolgee()
	const { data: session } = useSession()
	const [transferModalVisible, setTransferModalVisible] = useState<boolean>(false)
	const [transactionsModalVisible, setTransactionsModalVisible] = useState<boolean>(false)

	// Проверяем наличие аллокации доли для текущего пользователя
	const userAllocation = equityData?.equityAllocations?.find(
		(allocation: any) => allocation.ownerId === session?.user?.id
	)

	const hasUserEquity = !!userAllocation && userAllocation.percentage > 0

	return (
		<Card className={styles.equityCard}>
			<Space direction="vertical" style={{ width: '100%' }} size="middle">
				<div className={styles.titleContainer}>
					<Typography.Text strong>{t('Equity Distribution')}</Typography.Text>
					<Space>
						{hasUserEquity && !isProjectAuthor && (
							<Button onClick={() => setTransferModalVisible(true)} type="default">
								{t('Transfer My Share')}
							</Button>
						)}
						<Button
							className="gray-text-btn"
							icon={<AiOutlineHistory />}
							onClick={() => setTransactionsModalVisible(true)}
							type="text"
						></Button>
						{isProjectAuthor && <Button onClick={onManageEquity}>{t('Manage Equity')}</Button>}
					</Space>
				</div>

				<div className={styles.plotContainer}>
					<EquityPlot
						teamMembers={teamMembers}
						platformShare={equityData?.platformShare || 3}
						mentorFundShare={equityData?.mentorFundShare || 7}
						investmentReserve={equityData?.investmentReserve || 40}
						teamShares={
							equityData?.equityAllocations?.map((allocation: any) => ({
								id: allocation.id,
								memberId: allocation.teamMemberId,
								userId: allocation.ownerId,
								name:
									teamMembers.find((m: any) => m.userId === allocation.ownerId)?.user?.name ||
									allocation.owner?.name ||
									t('Team Member'),
								percentage: allocation.percentage,
								vested: true, // По умолчанию все доли считаются полученными
								promises: allocation.promises || [],
							})) || []
						}
					/>
				</div>
			</Space>

			{/* Модальное окно для передачи доли */}
			<EquityTransferModal
				open={transferModalVisible}
				onCancel={() => setTransferModalVisible(false)}
				projectId={projectId}
				currentUserId={session?.user?.id || ''}
				teamMembers={teamMembers}
			/>

			{/* Модальное окно для истории транзакций */}
			<Modal
				title={t('Transactions History')}
				open={transactionsModalVisible}
				onCancel={() => setTransactionsModalVisible(false)}
				footer={null}
				width={800}
			>
				<EquityTransactions projectId={projectId} />
			</Modal>
		</Card>
	)
}

export default EquitySection
