import '@/styles/globals.scss'
import { AntdRegistry } from '@ant-design/nextjs-registry'
export const metadata = {
	title: 'Game Developers Hub',
	description: 'Web service & community for indie games',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body suppressHydrationWarning={true}>
				<AntdRegistry>{children}</AntdRegistry>
			</body>
		</html>
	)
}

