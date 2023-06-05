import { IMessage, NotificationBell, NovuProvider, PopoverNotificationCenter } from '@novu/notification-center'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'

export const NotificationsBell = () => {
	const router = useRouter()
	const { data: session }: any = useSession()

	const handleClick = (notification: IMessage) => {
		const { url } = notification.payload as any
		router.push(url)
	}

	return (
		<NovuProvider
			i18n="ru"
			subscriberId={session?.user.id}
			applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_CLIENT_APP_ID as string}
		>
			<PopoverNotificationCenter onNotificationClick={handleClick} colorScheme="light">
				{({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
			</PopoverNotificationCenter>
		</NovuProvider>
	)
}
