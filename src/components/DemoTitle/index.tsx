import { Season } from '@prisma/client'
import styles from './style.module.scss'

export const DemoTitle = ({ season }: { season: Season }) => {
	if (!season) return null

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
				Команды из <span style={{ color: '#ffbb33' }}>{`{ ${season?.name} }`}</span> расскажут о своих инди-проектах
				<br />в виде коротких питчей
			</p>
		</div>
	)
}
