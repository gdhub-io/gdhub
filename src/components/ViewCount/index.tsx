import { IconChartBar } from "@tabler/icons-react";
import { useTolgee } from "@tolgee/react";
import {
	META_ICON_STROKE,
	MetaStat,
	type MetaStatSize,
} from "@/components/ui/MetaStat";
import { formatCompactCount } from "@/helpers/format";

interface ViewCountProps {
	/**
	 * Distinct viewers, from the platform's own counter. It arrives with the
	 * content, so this component only formats — it used to ask the Google
	 * Analytics Data API per card, which cost a request per row and lagged a day
	 * behind.
	 */
	count: number;
	size?: MetaStatSize;
	className?: string;
}

/**
 * How many people saw a piece of content — a feed card on screen counts, not
 * just an opened page, which is why this is a view count and not a page view.
 */
export const ViewCount = ({
	count,
	size = "default",
	className,
}: ViewCountProps) => {
	const { getLanguage } = useTolgee();

	return (
		<MetaStat
			size={size}
			className={className}
			icon={
				<IconChartBar
					size="100%"
					stroke={META_ICON_STROKE}
					aria-hidden="true"
				/>
			}
		>
			{formatCompactCount(count, getLanguage())}
		</MetaStat>
	);
};
