import { IconEye } from "@tabler/icons-react";
import { useTolgee } from "@tolgee/react";
import { Space } from "antd";
import type { CSSProperties } from "react";
import { formatCompactCount } from "@/helpers/format";

interface ViewCountProps {
	/**
	 * Distinct viewers, from the platform's own counter. It arrives with the
	 * content, so this component only formats — it used to ask the Google
	 * Analytics Data API per card, which cost a request per row and lagged a day
	 * behind.
	 */
	count: number;
	containerStyle?: CSSProperties;
	iconStyle?: CSSProperties;
	textStyle?: CSSProperties;
	/** Below this the number says more about the counter than about the content. */
	minViews?: number;
}

/**
 * How many people saw a piece of content — a feed card on screen counts, not
 * just an opened page, which is why this is a view count and not a page view.
 */
export const ViewCount = ({
	count,
	containerStyle,
	iconStyle = { fontSize: "12px" },
	textStyle = { fontSize: "12px" },
	minViews = 10,
}: ViewCountProps) => {
	const { getLanguage } = useTolgee();

	// Locally the counter starts empty and the threshold would hide every number
	// there is, which reads as "the feature is broken" rather than "nobody looked".
	const threshold = process.env.NODE_ENV === "development" ? 0 : minViews;

	if (count < threshold) return null;

	return (
		<Space size={4} style={containerStyle}>
			<IconEye style={iconStyle} />
			<span style={textStyle}>{formatCompactCount(count, getLanguage())}</span>
		</Space>
	);
};
