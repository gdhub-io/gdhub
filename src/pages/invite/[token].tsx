import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Card, Result, Spin, Typography } from 'antd'
import axios from 'axios'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useSession, signIn } from 'next-auth/react'

const { Title, Text, Paragraph } = Typography

const InvitePage = () => {
	const router = useRouter()
	const { token } = router.query
	const { t } = useTolgee()
	const { data: session, status } = useSession()
	const [error, setError] = useState<string | null>(null)

	// Получаем информацию о приглашении
	const {
		data: invitation,
		isLoading: isLoadingInvitation,
		error: invitationError,
	} = useQuery({
		queryKey: ['invitation', token],
		queryFn: () => axios.get(`/api/invitation/${token}`),
		enabled: !!token,
		retry: false,
	})

	useEffect(() => {
		if (invitationError) {
			setError(invitationError.message || 'Failed to load invitation')
		}
	}, [invitationError])

	// Мутация для принятия приглашения
	const { mutateAsync: acceptInvite, isPending: isAccepting } = useMutation({
		mutationFn: () => axios.get(`/api/user/project/team/accept-invite?token=${token}`),
		onSuccess: (response) => {
			if (response.data.redirect) {
				router.push(response.data.redirect)
			}
		},
		onError: (err: any) => {
			setError(err.response?.data?.message || 'Failed to accept invitation')
		},
	})

	// Мутация для отклонения приглашения
	const { mutateAsync: declineInvite, isPending: isDeclining } = useMutation({
		mutationFn: () => axios.get(`/api/user/project/team/decline-invite?token=${token}`),
		onSuccess: () => {
			router.push('/')
		},
		onError: (err: any) => {
			setError(err.response?.data?.message || 'Failed to decline invitation')
		},
	})

	// Если пользователь не авторизован, перенаправляем на страницу входа
	useEffect(() => {
		if (status === 'unauthenticated' && token) {
			signIn(undefined, { callbackUrl: `/invite/${token}` })
		}
	}, [status, token])

	// Обработчик принятия приглашения
	const handleAccept = () => {
		acceptInvite()
	}

	// Обработчик отклонения приглашения
	const handleDecline = () => {
		declineInvite()
	}

	// Если идет загрузка сессии или приглашения
	if (status === 'loading' || isLoadingInvitation) {
		return (
			<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
				<Spin size="large" />
			</div>
		)
	}

	// Если произошла ошибка
	if (error || invitationError) {
		return (
			<div
				style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '20px' }}
			>
				<Card style={{ maxWidth: 600, width: '100%' }}>
					<Result
						status="error"
						title={t('Error')}
						subTitle={error || t('Failed to load invitation')}
						extra={[
							<Button key="home" type="primary" onClick={() => router.push('/')}>
								<T>Go Home</T>
							</Button>,
						]}
					/>
				</Card>
			</div>
		)
	}

	// Если пользователь авторизован и приглашение загружено
	if (session && invitation?.data) {
		const inviteData = invitation.data

		// Проверяем статус приглашения
		if (inviteData.status === 'Accepted') {
			return (
				<div
					style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '20px' }}
				>
					<Card style={{ maxWidth: 600, width: '100%' }}>
						<Result
							status="info"
							title={t('Invitation Already Accepted')}
							subTitle={t('This invitation has already been accepted.')}
							extra={[
								<Button key="home" type="primary" onClick={() => router.push('/')}>
									<T>Go Home</T>
								</Button>,
							]}
						/>
					</Card>
				</div>
			)
		}

		if (inviteData.status === 'Declined') {
			return (
				<div
					style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '20px' }}
				>
					<Card style={{ maxWidth: 600, width: '100%' }}>
						<Result
							status="warning"
							title={t('Invitation Declined')}
							subTitle={t('This invitation has been declined.')}
							extra={[
								<Button key="home" type="primary" onClick={() => router.push('/')}>
									<T>Go Home</T>
								</Button>,
							]}
						/>
					</Card>
				</div>
			)
		}

		if (inviteData.expiresAt && new Date() > new Date(inviteData.expiresAt)) {
			return (
				<div
					style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '20px' }}
				>
					<Card style={{ maxWidth: 600, width: '100%' }}>
						<Result
							status="warning"
							title={t('Invitation Expired')}
							subTitle={t('This invitation has expired.')}
							extra={[
								<Button key="home" type="primary" onClick={() => router.push('/')}>
									<T>Go Home</T>
								</Button>,
							]}
						/>
					</Card>
				</div>
			)
		}

		return (
			<>
				<Head>
					<title>{t('Team Invitation')}</title>
				</Head>
				<div
					style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '20px' }}
				>
					<Card style={{ maxWidth: 600, width: '100%' }}>
						<Title level={2}>
							<T>Team Invitation</T>
						</Title>
						<Paragraph>
							<T
								keyName="invitationText"
								defaultValue="You have been invited by {inviterName} to join the team of project {projectName} as a {position}."
								params={{
									inviterName: inviteData.invitedBy?.name || 'Project founder',
									projectName: inviteData.team?.project?.name || 'Project',
									position: inviteData.position,
								}}
							/>
						</Paragraph>
						<Paragraph>
							<Text strong>
								<T>Start Date</T>:
							</Text>{' '}
							{new Date(inviteData.startedAt).toLocaleDateString()}
						</Paragraph>
						<div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
							<Button onClick={handleDecline} loading={isDeclining}>
								<T>Decline</T>
							</Button>
							<Button type="primary" onClick={handleAccept} loading={isAccepting}>
								<T>Accept Invitation</T>
							</Button>
						</div>
					</Card>
				</div>
			</>
		)
	}

	return null
}

export default InvitePage
