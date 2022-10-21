import { useEffect } from 'react'
import { Button, Layout } from 'antd'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './style.module.less'

const { Header, Footer, Sider, Content } = Layout

export const ProtectedLayout = ({ children }: any) => {
	const router = useRouter()
	const { data: session } = useSession()

	useEffect(() => {
		if (!session) router.push('/')
	}, [session])

	return (
		<Layout>
			<Header>
				<Link href="/hub">
					<a className={styles.logo}>Game Developers Hub</a>
				</Link>
				{!!session && <Button onClick={() => signOut()}>Logout</Button>}
			</Header>
			<Content>{children}</Content>
			<Footer>Footer</Footer>
		</Layout>
	)
}
