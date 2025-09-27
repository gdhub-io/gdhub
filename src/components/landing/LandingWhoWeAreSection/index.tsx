import { useEffect, useRef, useState } from 'react'
import ClockIcon from '@/assets/images/icons/clock.svg'
import DiamondIcon from '@/assets/images/icons/diamond.svg'
import GoalIcon from '@/assets/images/icons/goal.svg'
import LightingIcon from '@/assets/images/icons/lightning.svg'
import PeopleIcon from '@/assets/images/icons/people.svg'
import StarIcon from '@/assets/images/icons/star.svg'
import TeamMap from '@/assets/images/landing/team.svg'
import Icon from '@ant-design/icons'
import { useTranslate } from '@tolgee/react'
import { Col, Grid, Row, Tooltip, Typography } from 'antd'
import styles from './style.module.scss'

const { Title, Paragraph, Text } = Typography

const members: any = {
	'team_svg__team-member-1': 'Expert in team management',
	'team_svg__team-member-2': 'Expert in game design',
	'team_svg__team-member-3': 'Expert in Unreal Engine',
	'team_svg__team-member-4': 'Expert in education in the game industry',
	'team_svg__team-member-5': 'Expert in programming',
	'team_svg__team-member-6': 'Expert in game design',
	'team_svg__team-member-7': 'You',
}

export const LandingWhoWeAreSection = () => {
	const { t } = useTranslate()
	const screens = Grid.useBreakpoint()
	const tooltipMemberRef = useRef<any>()
	const [member, setMember] = useState()

	useEffect(() => {
		const teamMembers = document.querySelectorAll('a[class^="team_svg__team-member-"]')

		const handleMemberHover = (e: any) => {
			let coords = e.srcElement.getBoundingClientRect()

			tooltipMemberRef.current.style.left = coords.x + coords.width / 2 + 'px'
			tooltipMemberRef.current.style.top = coords.y + 'px'

			const memberName = e.srcElement.parentNode.className.baseVal as string
			setMember(members[memberName])
		}

		const handleMemberLeave = (e: any) => {
			setMember(undefined)
		}

		for (const t of teamMembers) {
			t.addEventListener('mousemove', handleMemberHover)
			t.addEventListener('mouseleave', handleMemberLeave)
		}

		return () => {
			for (const t of teamMembers) {
				t.removeEventListener('mousemove', handleMemberHover)
				t.removeEventListener('mouseleave', handleMemberLeave)
			}
		}
	}, [])

	return (
		<div id="about" className={styles.section}>
			<div className={styles.container}>
				<div className={styles.preTitle}>{t('landing.about.abovetitle', 'Know about us')}</div>
				<Title level={2}>{t('landing.about.title', 'WHO WE ARE')}</Title>
				<div className={styles.subTitle}>
					{t(
						'landing.about.subtitle',
						'We are a community of professionals from the gaming world who don’t want to be limited to traditional employment.'
					)}
				</div>
				<Row
					gutter={[screens.xs ? 0 : 135, screens.md ? 48 : 40]}
					justify="space-between"
					align="middle"
					className={styles.content}
				>
					<Col xs={{ span: 24 }} lg={{ span: 12 }}>
						<Paragraph>
							{t(
								'landing.about.text1',
								'We started our journey in 2015 when we organized a game development incubator, where we trained and supported young developers, helping them to bring their ideas to life. Since then we have grown to become Gdhub - a unique platform that brings together experienced professionals from different areas of game development into dynamic and creative teams.'
							)}
						</Paragraph>
						<Paragraph>
							{t(
								'landing.about.text2',
								'On Gdhub you can find partners to co-develop commercial video games, as well as share knowledge and experience with other members of the community.'
							)}
						</Paragraph>
						<Paragraph>
							{t(
								'landing.about.text3',
								'We work in a gig economy - an economy of temporary and non-permanent work, which gives us flexibility and independence. We value freedom, creativity and the ability to choose interesting projects.'
							)}
						</Paragraph>
					</Col>
					<Col xs={{ span: 24 }} lg={{ span: 12 }}>
						<TeamMap />
						<div ref={tooltipMemberRef} className="member-point">
							<Tooltip
								open={!!member}
								title={member ? t(member) : ''}
								destroyOnHidden
								classNames={{ root: styles.tooltip }}
							/>
						</div>
					</Col>
				</Row>
				<Title level={3} style={{ textTransform: 'uppercase', marginBottom: screens.xs ? 12 : 48 }}>
					{t('component.landingWhoWeAreSection.coreValues', 'Our Core Values')}
				</Title>
				<div className={styles.valuesLine} />
				<Row gutter={[32, 32]}>
					<Col xs={{ span: 12 }} xl={{ span: 4 }}>
						<Tooltip title={t('The need for liberty')} classNames={{ root: styles.tooltip }}>
							<div className={styles.valuesBlock}>
								<Icon component={LightingIcon} rev="span" size={40} />
								<Text>{t('component.landingWhoWeAreSection.autonomy', 'Autonomy')}</Text>
							</div>
						</Tooltip>
					</Col>
					<Col xs={{ span: 12 }} xl={{ span: 4 }}>
						<Tooltip title={t('The power of self-identity')} classNames={{ root: styles.tooltip }}>
							<div className={styles.valuesBlock}>
								<Icon component={DiamondIcon} rev="span" size={40} />
								<Text>{t('component.landingWhoWeAreSection.individuality', 'Individuality')}</Text>
							</div>
						</Tooltip>
					</Col>
					<Col xs={{ span: 12 }} xl={{ span: 4 }}>
						<Tooltip title={t('Pursuing oppurtunities instead of settling')} classNames={{ root: styles.tooltip }}>
							<div className={styles.valuesBlock}>
								<Icon component={ClockIcon} rev="span" size={40} />
								<Text>{t('component.landingWhoWeAreSection.exploration', 'Exploration')}</Text>
							</div>
						</Tooltip>
					</Col>
					<Col xs={{ span: 12 }} xl={{ span: 4 }}>
						<Tooltip title={t('Setting goals and working towards them')} classNames={{ root: styles.tooltip }}>
							<div className={styles.valuesBlock}>
								<Icon component={GoalIcon} rev="span" size={40} />
								<Text>{t('component.landingWhoWeAreSection.goalOriented', 'Goal-oriented')}</Text>
							</div>
						</Tooltip>
					</Col>
					<Col xs={{ span: 12 }} xl={{ span: 4 }}>
						<Tooltip title={t('Taking risks and making mistakes')} classNames={{ root: styles.tooltip }}>
							<div className={styles.valuesBlock}>
								<Icon component={StarIcon} rev="span" size={40} />
								<Text>{t('component.landingWhoWeAreSection.achiever', 'Achiever')}</Text>
							</div>
						</Tooltip>
					</Col>
					<Col xs={{ span: 12 }} xl={{ span: 4 }}>
						<Tooltip title={t('Mastering communication and networking skills')} classNames={{ root: styles.tooltip }}>
							<div className={styles.valuesBlock}>
								<Icon component={PeopleIcon} rev="span" />
								<Text>{t('component.landingWhoWeAreSection.player', 'Player')}</Text>
							</div>
						</Tooltip>
					</Col>
				</Row>
			</div>
		</div>
	)
}
