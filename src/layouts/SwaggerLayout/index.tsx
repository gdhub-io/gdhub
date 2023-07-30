import { Layout } from 'antd'
import styles from './style.module.scss'

export const SwaggerLayout = ({ children }: any) => {
	return <Layout className={styles.container}>{children}</Layout>
}
