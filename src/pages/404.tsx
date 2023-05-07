import styles from '@styles/errors.module.scss'

export default function Custom404() {
	return (
		<div className={styles.errorPageContainer}>
			<div className={styles.notFound}>
				<h1>Error 404</h1>
			</div>
		</div>
	)
}
