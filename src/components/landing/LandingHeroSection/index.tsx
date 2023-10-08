import heroBgImage from '@/assets/images/landing/hero-bg.png'
import StarIcon from '@/assets/images/landing/star.svg'
import Icon from '@ant-design/icons'
import { Button, Col, Row, Space, Typography, theme } from 'antd'
import Image from 'next/image'
import { BsCaretRightFill } from 'react-icons/bs'
import styles from './style.module.scss'
import { HeroStats } from '../HeroStats'

const { Title, Text, Paragraph } = Typography

export const LandingHeroSection = () => {
	const { token } = theme.useToken()

	return (
		<div className={styles.section}>
			<div className={styles.heroImage}>
				<Image src={heroBgImage} fill={true} alt={'hero image'} />
			</div>
			<Row gutter={[16, 16]} wrap>
				<Col xs={{ span: 24 }} xl={{ span: 15 }}>
					<Space size={['large', 'large']} direction="vertical" className={styles.heroMain}>
						<Title>
							Game Developers Hub for everyone who wants to make{' '}
							<span style={{ color: token.colorPrimary }}>video games</span>
						</Title>
						<ul>
							<li>
								<Space>
									<Icon component={StarIcon} rev="item" style={{ fontSize: 32 }} />
									<Text>
										We help Authors of new video games to assemble a team of game designers, programmers, artists,
										animators, etc.
									</Text>
								</Space>
							</li>
							<li>
								<Space>
									<Icon component={StarIcon} rev="span" style={{ fontSize: 32 }} />
									<Text>
										We help game industry professionals find an interesting role for themselves in new projects.
									</Text>
								</Space>
							</li>
						</ul>
						<Button className={styles.heroButton}>
							Get started
							<span className="icon-right">
								<BsCaretRightFill />
							</span>
						</Button>
					</Space>
				</Col>
				<Col xs={{ span: 24 }} xl={{ span: 9 }} style={{ position: 'relative' }}>
					<HeroStats />
				</Col>
			</Row>
		</div>
	)
}
