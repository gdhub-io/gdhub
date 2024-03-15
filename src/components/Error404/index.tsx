import { CSSProperties, ReactNode } from 'react'
import { T } from '@tolgee/react'
import { Space, Button, Typography } from 'antd'
import Link from 'next/link'
import styles from './style.module.scss'

const { Paragraph } = Typography

export const Error404 = ({
	callbackUrl = '/',
	textBackButton = <T>Back to home</T>,
	theme = 'dark',
	containerStyle,
}: {
	callbackUrl?: string
	textBackButton?: ReactNode | string
	theme?: 'dark' | 'light'
	containerStyle?: CSSProperties
}) => {
	return (
		<div className={`${styles.errorPageContainer} ${styles[`theme-` + theme]}`} style={containerStyle}>
			<Space direction="vertical">
				<div className={styles.notFound}>
					<h1>
						<T>Error 404</T>
					</h1>
				</div>
				<Paragraph>
					<T>Sorry, we couldn&apos;t find the page you&apos;re looking for.</T>
				</Paragraph>
				<Button>
					<Link href={callbackUrl}>{textBackButton}</Link>
				</Button>
			</Space>
		</div>
	)
}
