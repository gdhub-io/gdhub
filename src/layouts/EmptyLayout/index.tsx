import { publicThemeConfig } from '@/config/theme'
import { ConfigProvider, Layout } from 'antd'
import styles from './style.module.scss'

export const EmptyLayout = ({ children }: any) => {
	return (
		<ConfigProvider theme={publicThemeConfig}>
			<Layout className={styles.container}>{children}</Layout>
		</ConfigProvider>
	)
}
