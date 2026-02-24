import { useId } from "react";

type SkillCapitalIconProps = {
	size?: number;
};

export const SkillCapitalIcon = ({ size = 92 }: SkillCapitalIconProps) => {
	const iconId = useId();
	const bgId = `${iconId}-gem-bg`;
	const coreId = `${iconId}-gem-core`;
	const shadowId = `${iconId}-gem-shadow`;

	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 92 92"
			role="img"
			aria-label="Skill Capital icon"
		>
			<title>Skill Capital Icon</title>
			<defs>
				<radialGradient id={bgId} cx="50%" cy="45%" r="60%">
					<stop offset="0%" stopColor="#fff4f2" />
					<stop offset="58%" stopColor="#ffd8d2" />
					<stop offset="100%" stopColor="#ffffff" />
				</radialGradient>
				<linearGradient id={coreId} x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="#F15541" />
					<stop offset="100%" stopColor="#8C1000" />
				</linearGradient>
				<filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
					<feDropShadow
						dx="0"
						dy="4"
						stdDeviation="3"
						floodColor="rgba(241, 85, 65, 0.35)"
					/>
				</filter>
			</defs>

			<circle cx="46" cy="46" r="40" fill={`url(#${bgId})`} />

			<g transform="translate(46 46)">
				<g>
					<circle
						cx="0"
						cy="0"
						r="34"
						fill="none"
						stroke="rgba(241,85,65,0.35)"
						strokeWidth="2"
					/>
					<path
						d="M 0 -34 A 34 34 0 0 1 24 -24"
						fill="none"
						stroke="#F15541"
						strokeWidth="2.4"
						strokeLinecap="round"
					/>
					<animateTransform
						attributeName="transform"
						type="rotate"
						from="0"
						to="360"
						dur="5.2s"
						repeatCount="indefinite"
					/>
				</g>
			</g>

			<g filter={`url(#${shadowId})`}>
				<g transform="translate(46 46)">
					<polygon points="0,-18 16,12 -16,12" fill={`url(#${coreId})`}>
						<animateTransform
							attributeName="transform"
							type="scale"
							values="1;1.08;1"
							keyTimes="0;0.5;1"
							dur="2.6s"
							repeatCount="indefinite"
						/>
						<animate
							attributeName="opacity"
							values="0.95;1;0.95"
							keyTimes="0;0.5;1"
							dur="2.6s"
							repeatCount="indefinite"
						/>
					</polygon>
				</g>
			</g>
		</svg>
	);
};
