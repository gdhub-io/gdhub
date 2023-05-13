import { useEffect, useState } from 'react'
import styles from './style.module.scss'

const LoadingScreen = ({ visible }: any) => {
	const [enabled, setEnabled] = useState(true)

	useEffect(() => {
		setEnabled(visible)
	}, [visible])

	return (
		<div className={styles.pageLoader} style={{ opacity: enabled ? 1 : 0, zIndex: enabled ? 9999 : -1 }}>
			<div className="loader">
				<div className="loader-style panelLoad">
					<div className="cube-face cube-face-front">G</div>
					<div className="cube-face cube-face-back">D</div>
					<div className="cube-face cube-face-left">H</div>
					<div className="cube-face cube-face-right">U</div>
					<div className="cube-face cube-face-bottom">B</div>
					<div className="cube-face cube-face-top">.</div>
				</div>
			</div>
		</div>
	)
}

export default LoadingScreen
