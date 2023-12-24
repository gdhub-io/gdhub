import { publicThemeConfig, landingThemeConfig } from '@/config/theme'
import { ConfigProvider, Layout } from 'antd'
import enLocale from 'antd/locale/en_US'
import ruLocale from 'antd/locale/ru_RU'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

export const EmptyLayout = ({ children, type = 'light' }: any) => {
	const router = useRouter()

	return (
		<ConfigProvider
			theme={type == 'light' ? landingThemeConfig : publicThemeConfig}
			locale={router.locale == 'en' ? enLocale : ruLocale}
		>
			<Layout className={styles.container}>{children}</Layout>
		</ConfigProvider>
	)
}
