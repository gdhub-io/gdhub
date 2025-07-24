import { useContext, useState } from 'react'
import ModernTable from '@/components/ModernTable'
import tableStyles from '@/components/ModernTable/ModernTable.module.scss'
import { ProjectContext } from '@/contexts/ProjectContext'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { HiOutlineTrash } from '@react-icons/all-files/hi/HiOutlineTrash'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Button, Flex, Grid, message, Popconfirm, Space, Typography } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import dynamic from 'next/dynamic'

const { Text } = Typography

const CreateDocumentModal = dynamic(() => import('@/components/modals/CreateDocumentModal'), { ssr: false })

interface ProjectDocument {
	key: string
	Name: string
	Description: string
	FinishedAt: string
	Status: prismaClient.TeamVacancyStatus
	[key: string]: any
}

const MyProjectDocuments = () => {
	const screens = Grid.useBreakpoint()
	const { t } = useTolgee()
	const contextProject = useContext(ProjectContext)?.contextProject
	const [showDocumentModal, setShowDocumentModal] = useState(false)
	const [selectedDocumentId, setSelectedDocumentId] = useState<string>()

	const {
		data: projectDocuments,
		refetch: fetchMyProjectDocuments,
		isLoading: isLoadingMyProjectDocuments,
	} = useQuery(
		['project-team-documents', contextProject?.teamId],
		() =>
			axios.get('/api/user/project/documents', {
				params: { teamId: contextProject?.teamId },
			}),
		{
			enabled: !!contextProject?.teamId,
			refetchOnWindowFocus: false,
		}
	)

	const { mutateAsync: deleteDocument } = useMutation(({ id, teamId }: { id: string; teamId: string }) =>
		axios.delete(`/api/user/project/documents/${id}`, {
			params: { teamId },
		})
	)

	const documentsColumns: ColumnsType<ProjectDocument> = [
		{
			title: t('project.documents.title', 'Title'),
			dataIndex: 'name',
			key: 'name',
			width: '50%',
			render: (value, data) => (
				<Space direction="vertical" size={0} style={{ width: '100%' }}>
					<Text
						className={tableStyles.tableMemberName}
						onClick={() => handleEditDocument(data.id)}
						style={{ cursor: 'pointer' }}
					>
						{value}
					</Text>
					<Text ellipsis type="secondary" style={{ maxWidth: '120px' }}>
						{data.description}
					</Text>
				</Space>
			),
		},
		{
			title: t('project.documents.updatedAt', 'Updated At'),
			dataIndex: 'updatedAt',
			key: 'updatedAt',
			align: 'right',
			responsive: ['md'],
			render: (value) => dayjs(value).format('LLL'),
		},
		{
			key: 'actions',
			width: '1%',
			render: (value, record) => (
				<Space>
					<Popconfirm
						title={t('You definitely want to delete the document?')}
						okText={t('Yes', 'Yes')}
						cancelText={t('No', 'No')}
						onConfirm={() => handleDeleteDocument({ id: record.id, teamId: contextProject?.teamId })}
					>
						<Button type="text" danger>
							<HiOutlineTrash />
						</Button>
					</Popconfirm>
				</Space>
			),
		},
	]

	const handleEditDocument = (id: string) => {
		setSelectedDocumentId(id)
		setShowDocumentModal(true)
	}

	const handleDeleteDocument = async ({ id, teamId }: { id: string; teamId?: string }) => {
		if (!teamId) return

		await deleteDocument({ id, teamId })
		setSelectedDocumentId(undefined)
		fetchMyProjectDocuments()

		message.success(t('project.documents.documentDeleted', 'Document deleted'))
	}

	const handleCreateDocument = () => {
		setShowDocumentModal(false)
		setSelectedDocumentId(undefined)
		fetchMyProjectDocuments()
	}

	const handleCancelCreateDocument = () => {
		setShowDocumentModal(false)
		setSelectedDocumentId(undefined)
	}

	return (
		<>
			<Flex justify="space-between" align="center" style={{ marginTop: 60 }}>
				<Space align="center">
					<h3 style={{ margin: 0 }}>{t('project.documents.title', 'Documents')}</h3>
					<Button onClick={() => setShowDocumentModal(true)}>
						{t('project.documents.addDocument', 'Add document')}
					</Button>
				</Space>
			</Flex>

			{projectDocuments?.data.length > 0 ? (
				<ModernTable
					showHeader={false}
					loading={isLoadingMyProjectDocuments}
					columns={documentsColumns}
					dataSource={projectDocuments?.data?.map((m: any) => ({ ...m, key: m.id }))}
					pagination={false}
				/>
			) : (
				<p style={{ marginTop: 12, color: 'gray' }}>
					{t('project.documents.noDocuments', 'There are no documents at the moment')}
				</p>
			)}

			<CreateDocumentModal
				teamId={contextProject?.teamId}
				projectId={contextProject?.id}
				documentId={selectedDocumentId}
				open={showDocumentModal}
				onCancel={handleCreateDocument}
				onCreate={handleCreateDocument}
			/>
		</>
	)
}

export default MyProjectDocuments
