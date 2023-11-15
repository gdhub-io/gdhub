import { fetcher } from '@/helpers/fetcher'
import { IMessage, NotificationBell, NovuProvider, PopoverNotificationCenter } from '@novu/notification-center'
import { theme } from 'antd'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import useSWRImmutable from 'swr/immutable'

export const NotificationsBell = () => {
	const { token: themeToken } = theme.useToken()
	const router = useRouter()
	const { data: session }: any = useSession()

	const { data } = useSWRImmutable({ url: '/api/service/novu/signature' }, fetcher)

	const handleClick = (notification: IMessage) => {
		const { url } = notification.payload as any
		router.push(url)
	}

	return (
		<NovuProvider
			i18n="ru"
			subscriberId={session?.user.id}
			applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_CLIENT_APP_ID as string}
			subscriberHash={data?.signature}
			styles={{
				bellButton: {
					root: {
						borderRadius: 16,
						padding: 1,
						':hover': { backgroundColor: '#0000000f' },
						svg: { color: '#111111' },
					},
				},
			}}
		>
			<PopoverNotificationCenter
				onNotificationClick={handleClick}
				colorScheme="light"
				showUserPreferences={false}
				theme={{ common: { fontFamily: themeToken.fontFamily } }}
			>
				{({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
			</PopoverNotificationCenter>
		</NovuProvider>
	)
}
