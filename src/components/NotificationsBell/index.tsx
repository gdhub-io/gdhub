import { IMessage, NotificationBell, NovuProvider, PopoverNotificationCenter } from '@novu/notification-center'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'

export const NotificationsBell = () => {
	const router = useRouter()
	const { data: session } = useSession()

	const { data: signature } = useQuery(['novu-signature', session?.user.id], () =>
		axios.get<{ signature: string }>('/api/services/novu/signature')
	)

	const handleClick = (notification: IMessage) => {
		const { url } = notification.payload as any
		router.push(url)
	}

	return (
		<NovuProvider
			i18n="ru"
			subscriberId={session?.user.id}
			applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_CLIENT_APP_ID as string}
			subscriberHash={signature?.data.signature}
			styles={{
				bellButton: {
					root: {
						borderRadius: '0px',
						padding: 8,
						height: 40,
						width: 40,
						':hover': { backgroundColor: '#F33921', svg: { color: '#fff' } },
						svg: { color: '#8e8e8e', scale: 2 },
					},
				},
			}}
		>
			<PopoverNotificationCenter onNotificationClick={handleClick} colorScheme="light">
				{({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
			</PopoverNotificationCenter>
		</NovuProvider>
	)
}
