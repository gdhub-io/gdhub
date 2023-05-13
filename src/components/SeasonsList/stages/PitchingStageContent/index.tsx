import { Button, Spin } from 'antd'
import moment from 'moment-timezone'
import Link from 'next/link'
import styles from './style.module.less'

const PitchingStageContent = ({ season, stage }: any) => {
	return (
		<div className={styles.container}>
			<Spin spinning={!season}>
				<p>
					На данном этапе команды готовят презентации и демо (mvp) своих проектов. В этот раз задача команд -
					подготовить и провести короткий питч (на 10 минут) своего проекта с целью поиска финансирования на его
					доработку и релиза.
				</p>
				<p>
					Питчи проектов состоятся {moment(stage['Finished At']).format('DD MMM, YYYY')} года н нашем{' '}
					<Link href="https://www.youtube.com/channel/UCKesPh-gDVTaHrT_HDUWkeQ" target="_blank">
						Youtube-канале
					</Link>
					.
				</p>
				<Link href={`/${season.Slug}/demo-day`} target="_blank">
					<Button type="primary">Регистрация на Demo Day</Button>
				</Link>
			</Spin>
		</div>
	)
}

export default PitchingStageContent
