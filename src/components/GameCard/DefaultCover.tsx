import { Typography } from "antd";
import type React from "react";
import { useMemo } from "react";
import styles from "./styles.module.scss";

const { Title } = Typography;

const COLOR_PALETTES = [
	// Dark palette
	["#1a202c", "#2d3748"],
	["#171923", "#2d3748"],
];

/**
 * Generates a background color based on the project title
 * @param {string} title - Project title
 * @returns {string} CSS background gradient
 */
const generateBackground = (title: string): string => {
	// Generate a hash from the title
	let hash = 0;
	for (let i = 0; i < title.length; i++) {
		hash = title.charCodeAt(i) + ((hash << 5) - hash);
	}

	const [color1, color2] = COLOR_PALETTES[0];

	// Add some subtle variation to the angle
	const angle = 135 + (hash % 50);

	return `linear-gradient(${angle}deg, ${color1}, ${color2})`;
};

const getInitials = (title: string): string => {
	if (!title) return "?";

	const words = title.split(" ");
	if (words.length === 1) {
		return title.substring(0, 2).toUpperCase();
	}

	return (words[0][0] + words[1][0]).toUpperCase();
};

interface DefaultCoverProps {
	title: string;
	className?: string;
}

const DefaultCover: React.FC<DefaultCoverProps> = ({ title, className }) => {
	const background = useMemo(() => generateBackground(title), [title]);
	const initials = useMemo(() => getInitials(title), [title]);

	return (
		<div
			className={`${styles.defaultCover} ${className || ""}`}
			style={{ background }}
		>
			<div className={styles.defaultCoverContent}>
				<Title level={2} className={styles.defaultCoverInitials}>
					{initials}
				</Title>
			</div>
		</div>
	);
};

export default DefaultCover;
