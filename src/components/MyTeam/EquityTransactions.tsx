import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Table, Tag, Typography, Card, Avatar } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import styles from './EquityTransactions.module.scss'

const { Title, Text } = Typography

interface EquityTransactionsProps {
	projectId: string
	userId?: string // Если указан, то показываем только транзакции пользователя
}

interface Transaction {
	id: string
	fromAllocation?: {
		id: string
		owner: {
			id: string
			name: string
			email: string
			image?: string
		}
	} | null
	toAllocation: {
		id: string
		owner: {
			id: string
			name: string
			email: string
			image?: string
		}
	}
	percentage: number
	transactionType: prismaClient.EquityTransactionType
	reason?: string
	createdAt: string
	createdBy: {
		id: string
		name: string
		email: string
		image?: string
	}
	promise?: {
		id: string
		description?: string
		targetStepId?: string | null
	} | null
}

const EquityTransactions: React.FC<EquityTransactionsProps> = ({ projectId, userId }) => {
	const { t } = useTolgee()

	// Получаем транзакции
	const {
		data: transactionsData,
		isLoading,
		error,
	} = useQuery(
		['equity-transactions', projectId, userId],
		async () => {
			const url = userId
				? `/api/user/project/equity/transaction/user?projectId=${projectId}&userId=${userId}`
				: `/api/user/project/equity/transaction?projectId=${projectId}`

			const response = await axios.get(url)
			return response.data
		},
		{
			enabled: !!projectId,
		}
	)

	// Функция для отображения типа транзакции
	const renderTransactionType = (type: prismaClient.EquityTransactionType) => {
		switch (type) {
			case prismaClient.EquityTransactionType.InitialAllocation:
				return <Tag color="green">{t('Первичное распределение')}</Tag>
			case prismaClient.EquityTransactionType.Vesting:
				return <Tag color="blue">{t('Вестинг')}</Tag>
			case prismaClient.EquityTransactionType.Transfer:
				return <Tag color="orange">{t('Передача')}</Tag>
			case prismaClient.EquityTransactionType.Dilution:
				return <Tag color="red">{t('Уменьшение доли')}</Tag>
			case prismaClient.EquityTransactionType.Increase:
				return <Tag color="green">{t('Увеличение доли')}</Tag>
			default:
				return <Tag>{t('Другой тип')}</Tag>
		}
	}

	// Функция для отображения информации о пользователе
	const renderUser = (user: Transaction['toAllocation']['owner']) => {
		return (
			<div className={styles.userInfo}>
				<Avatar size="small" src={user.image} icon={!user.image} className={styles.userAvatar} />
				<Text>{user.name || user.email || 'Пользователь'}</Text>
			</div>
		)
	}

	// Колонки для таблицы
	const columns = [
		{
			title: t('Дата'),
			dataIndex: 'createdAt',
			key: 'createdAt',
			render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
		},
		{
			title: t('Тип'),
			dataIndex: 'transactionType',
			key: 'transactionType',
			render: renderTransactionType,
		},
		{
			title: t('От'),
			dataIndex: 'fromAllocation',
			key: 'fromAllocation',
			render: (fromAllocation: Transaction['fromAllocation']) =>
				fromAllocation ? renderUser(fromAllocation.owner) : <Text>—</Text>,
		},
		{
			title: t('Кому'),
			dataIndex: 'toAllocation',
			key: 'toAllocation',
			render: (toAllocation: Transaction['toAllocation']) => renderUser(toAllocation.owner),
		},
		{
			title: t('Доля'),
			dataIndex: 'percentage',
			key: 'percentage',
			render: (percentage: number) => <Text>{percentage.toFixed(2)}%</Text>,
		},
		{
			title: t('Причина'),
			dataIndex: 'reason',
			key: 'reason',
			render: (reason: string, record: Transaction) => (
				<Text>
					{reason || (record.promise?.description ? `Выполнение обещания: ${record.promise.description}` : '—')}
				</Text>
			),
		},
		{
			title: t('Инициатор'),
			dataIndex: 'createdBy',
			key: 'createdBy',
			render: (createdBy: Transaction['createdBy']) => renderUser(createdBy),
		},
	]

	if (isLoading) {
		return <div className={styles.loading}>{t('Loading transaction history...')}</div>
	}

	if (error) {
		return <div className={styles.error}>{t('Error loading transaction history')}</div>
	}

	const transactions = transactionsData?.data || []

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
				<div className={styles.noData}>{t('No data about transactions')}</div>
			)}
		</Card>
	)
}

export default EquityTransactions
