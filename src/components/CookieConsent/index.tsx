import { MouseEvent, useEffect, useState } from 'react'
import { Button, notification, Space, Typography } from 'antd'
import Cookies from 'js-cookie'
import Link from 'next/link'
import { BiCookie } from 'react-icons/bi'

const { Title, Text, Paragraph } = Typography

const USER_CONSENT_COOKIE_KEY = 'cookie_consent_is_true'
const USER_CONSENT_COOKIE_EXPIRE_DATE = 365

const CookieConsent = () => {
	const [api, contextHolder] = notification.useNotification()
	const [cookieConsentIsTrue, setCookieConsentIsTrue] = useState(true)

	useEffect(() => {
		const consentIsTrue = Cookies.get(USER_CONSENT_COOKIE_KEY) === 'true'
		setCookieConsentIsTrue(consentIsTrue)
	}, [])

	useEffect(() => {
		if (!cookieConsentIsTrue) {
			api.open({
				key: 'cookie-consent',
				message: 'Соглашение о куках',
				placement: 'bottom',
				icon: <BiCookie />,
				description: (
					<Text>
						Этот веб-сайт использует файлы cookie для улучшения взаимодействия с пользователем. Используя наш веб-сайт,
						вы соглашаетесь на использование всех файлов cookie в в соответствии с нашей Политикой в отношении файлов
						cookie.
					</Text>
				),
				duration: 0,
				btn: (
					<Space size="large">
						<Link href="/cookie-policy">Подробнее</Link>
						<Button type="primary" onClick={onClick}>
							Согласен
						</Button>
					</Space>
				),
				closeIcon: null,
				style: {
					width: 600,
				},
			})
		}
	}, [cookieConsentIsTrue])

	const onClick = (e: MouseEvent<any>) => {
		e.preventDefault()

		if (!cookieConsentIsTrue) {
			Cookies.set(USER_CONSENT_COOKIE_KEY, 'true', {
				expires: USER_CONSENT_COOKIE_EXPIRE_DATE,
			})
			setCookieConsentIsTrue(true)
			api.destroy('cookie-consent')
		}
	}

	if (cookieConsentIsTrue) {
		return null
	}

	return contextHolder
}

export default CookieConsent
