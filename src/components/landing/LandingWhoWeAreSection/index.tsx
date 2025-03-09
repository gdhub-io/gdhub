import { useEffect, useRef, useState } from 'react'
import ClockIcon from '@/assets/images/icons/clock.svg'
import DiamondIcon from '@/assets/images/icons/diamond.svg'
import GoalIcon from '@/assets/images/icons/goal.svg'
import LightingIcon from '@/assets/images/icons/lightning.svg'
import PeopleIcon from '@/assets/images/icons/people.svg'
import StarIcon from '@/assets/images/icons/star.svg'
import TeamMap from '@/assets/images/landing/team.svg'
import Icon from '@ant-design/icons'
import { T, useTolgee } from '@tolgee/react'
import { Col, Grid, Row, Tooltip, Typography } from 'antd'
import styles from './style.module.scss'

const { Title, Paragraph, Text } = Typography

const members: any = {
	'team_svg__team-member-1': 'Mentor of team management',
	'team_svg__team-member-2': 'Mentor of game design',
	'team_svg__team-member-3': 'Legal officer',
	'team_svg__team-member-4': 'Technical officer',
	'team_svg__team-member-5': 'Mentor of game development',
	'team_svg__team-member-6': 'UI/UX designer',
	'team_svg__team-member-7': 'Community members',
}

export const LandingWhoWeAreSection = () => {
	const { t } = useTolgee()
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
				<div className={styles.preTitle}>
					<T keyName="landing.about.abovetitle">Know about us</T>
				</div>
				<Title level={2}>
					<T keyName="landing.about.title">WHO WE ARE</T>
				</Title>
				<div className={styles.subTitle}>
					<T keyName="landing.about.subtitle">
						We are a community of professionals from the gaming world who don’t want to be limited to traditional
						employment.
					</T>
				</div>
				<Row
					gutter={[screens.xs ? 0 : 135, screens.md ? 48 : 40]}
					justify="space-between"
					align="middle"
					className={styles.content}
				>
					<Col xs={{ span: 24 }} lg={{ span: 12 }}>
						<Paragraph>
							<T keyName="landing.about.text1">
								We started our journey in 2015 when we organized a game development incubator, where we trained and
								supported young developers, helping them to bring their ideas to life. Since then we have grown to
								become Gdhub - a unique platform that brings together experienced professionals from different areas of
								game development into dynamic and creative teams.
							</T>
						</Paragraph>
						<Paragraph>
							<T keyName="landing.about.text2">
								On Gdhub you can find partners to co-develop commercial video games, as well as share knowledge and
								experience with other members of the community.
							</T>
						</Paragraph>
						<Paragraph>
							<T keyName="landing.about.text3">
								We work in a gig economy - an economy of temporary and non-permanent work, which gives us flexibility
								and independence. We value freedom, creativity and the ability to choose interesting projects.
							</T>
						</Paragraph>
					</Col>
					<Col xs={{ span: 24 }} lg={{ span: 12 }}>
						<TeamMap />
						<div ref={tooltipMemberRef} className="member-point">
							<Tooltip
								open={!!member}
								title={member ? t(member) : ''}
								destroyTooltipOnHide
								overlayClassName={styles.tooltip}
							/>
						</div>
					</Col>
				</Row>
				<Title level={3} style={{ textTransform: 'uppercase', marginBottom: screens.xs ? 12 : 48 }}>
					<T>Our Core Values</T>
				</Title>
				<div className={styles.valuesLine} />
				<Row gutter={[32, 32]}>
					<Col xs={{ span: 12 }} xl={{ span: 4 }}>
						<Tooltip title={t('The need for liberty')} overlayClassName={styles.tooltip}>
							<div className={styles.valuesBlock}>
								<Icon
									component={LightingIcon}
									rev="span"
									size={40}
									onPointerEnterCapture={undefined}
									onPointerLeaveCapture={undefined}
								/>
								<Text>
									<T>Autonomy</T>
								</Text>
							</div>
						</Tooltip>
					</Col>
					<Col xs={{ span: 12 }} xl={{ span: 4 }}>
						<Tooltip title={t('The power of self-identity')} overlayClassName={styles.tooltip}>
							<div className={styles.valuesBlock}>
								<Icon
									component={DiamondIcon}
									rev="span"
									size={40}
									onPointerEnterCapture={undefined}
									onPointerLeaveCapture={undefined}
								/>
								<Text>
									<T>Individuality</T>
								</Text>
							</div>
						</Tooltip>
					</Col>
					<Col xs={{ span: 12 }} xl={{ span: 4 }}>
						<Tooltip title={t('Pursuing oppurtunities instead of settling')} overlayClassName={styles.tooltip}>
							<div className={styles.valuesBlock}>
								<Icon
									component={ClockIcon}
									rev="span"
									size={40}
									onPointerEnterCapture={undefined}
									onPointerLeaveCapture={undefined}
								/>
								<Text>
									<T>Exploration</T>
								</Text>
							</div>
						</Tooltip>
					</Col>
					<Col xs={{ span: 12 }} xl={{ span: 4 }}>
						<Tooltip title={t('Setting goals and working towards them')} overlayClassName={styles.tooltip}>
							<div className={styles.valuesBlock}>
								<Icon
									component={GoalIcon}
									rev="span"
									size={40}
									onPointerEnterCapture={undefined}
									onPointerLeaveCapture={undefined}
								/>
								<Text>
									<T>Goal-oriented</T>
								</Text>
							</div>
						</Tooltip>
					</Col>
					<Col xs={{ span: 12 }} xl={{ span: 4 }}>
						<Tooltip title={t('Taking risks and making mistakes')} overlayClassName={styles.tooltip}>
							<div className={styles.valuesBlock}>
								<Icon
									component={StarIcon}
									rev="span"
									size={40}
									onPointerEnterCapture={undefined}
									onPointerLeaveCapture={undefined}
								/>
								<Text>
									<T>Achiever</T>
								</Text>
							</div>
						</Tooltip>
					</Col>
					<Col xs={{ span: 12 }} xl={{ span: 4 }}>
						<Tooltip title={t('Mastering communication and networking skills')} overlayClassName={styles.tooltip}>
							<div className={styles.valuesBlock}>
								<Icon
									component={PeopleIcon}
									rev="span"
									onPointerEnterCapture={undefined}
									onPointerLeaveCapture={undefined}
								/>
								<Text>
									<T>Player</T>
								</Text>
							</div>
						</Tooltip>
					</Col>
				</Row>
			</div>
		</div>
	)
}
