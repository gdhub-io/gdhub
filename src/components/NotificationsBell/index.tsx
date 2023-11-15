import { IMessage, NotificationBell, NovuProvider, PopoverNotificationCenter } from '@novu/notification-center'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'

export const NotificationsBell = () => {
	const router = useRouter()
	const { data: session } = useSession()

	// const { data } = useSWRImmutable({ url: '/api/services/novu/signature' }, fetcher)
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
						borderRadius: '50%',
						// padding: 2,
						height: 36,
						width: 36,
						':hover': { backgroundColor: '#F33921', svg: { color: '#fff' } },
						svg: { color: '#111111', scale: 2 },
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
