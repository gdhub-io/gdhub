import styles from './style.module.less'

export const DemoTitle = () => {
	return (
		<div className={styles.content}>
			<h1 className={styles.title}>
				<div className={styles.aboveTitle}>Game Developers Hub</div>
				Demo Day
				<div className={styles.aurora}>
					<div className={styles.item}></div>
					<div className={styles.item}></div>
					<div className={styles.item}></div>
					<div className={styles.item}></div>
				</div>
			</h1>
			<p className={styles.subtitle}>
				Команды <span style={{ color: '#ffbb33' }}>{'{ 11-го сезона Gamelab }'}</span> расскажут о своих инди-проектах
				<br />в виде коротких питчей
			</p>
		</div>
	)
}
