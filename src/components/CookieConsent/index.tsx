import { MouseEvent, useEffect, useState } from 'react'
import { T } from '@tolgee/react'
import { Button, Flex, Grid, Space, Typography } from 'antd'
import Cookies from 'js-cookie'
import Link from 'next/link'
import styles from './style.module.scss'

const { Text } = Typography

const USER_CONSENT_COOKIE_KEY = 'cookie_consent_is_true'
const USER_CONSENT_COOKIE_EXPIRE_DATE = 365

export const CookieConsent = () => {
	const screens = Grid.useBreakpoint()
	const [cookieConsentIsTrue, setCookieConsentIsTrue] = useState(true)

	useEffect(() => {
		const consentIsTrue = Cookies.get(USER_CONSENT_COOKIE_KEY) === 'true'
		setCookieConsentIsTrue(consentIsTrue)
	}, [])

	const onClick = (e: MouseEvent<any>) => {
		e.preventDefault()

		if (!cookieConsentIsTrue) {
			Cookies.set(USER_CONSENT_COOKIE_KEY, 'true', {
				expires: USER_CONSENT_COOKIE_EXPIRE_DATE,
			})
			setCookieConsentIsTrue(true)
		}
	}

	if (cookieConsentIsTrue) {
		return null
	}

	return (
		<div className={styles.cookieContainer}>
			<Flex gap={32} align="center" vertical={screens.lg ? false : true}>
				<Text>
					<T keyName="popup.cookie.text">
						This website uses cookies to improve the user experience. By using our website you agree to the use of all
						cookies in accordance with our Cookie policy.
					</T>
				</Text>

				<Space size="large" wrap={screens.xl ? false : true}>
					<Link href="/cookie-policy">
						<Button>
							<T keyName="popup.cookie.more">Read more</T>
						</Button>
					</Link>
					<Button type="primary" onClick={onClick}>
						<T keyName="popup.cookie.accept">I accept</T>
					</Button>
				</Space>
			</Flex>
		</div>
	)
}
