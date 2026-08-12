import { useTranslate } from "@tolgee/react";
import { formatDollar } from "@/helpers/format";
import styles from "./style.module.scss";

/**
 * The one number the hero leads with, and the three that give it scale.
 *
 * Stands at the foot of the illustration on a wide screen and centred under the
 * text on a phone. No panel of its own: it reads as a caption on the picture,
 * which is why the figures carry their own contrast rather than a backdrop.
 */
export const HeroStats = ({
	stats,
}: {
	stats: {
		usersCount: number | null;
		specialitiesCount: number | null;
		projectsCount: number | null;
		vacanciesCount: number | null;
		investmentAmount: number;
	};
}) => {
	const { t } = useTranslate();

	return (
		<div className={styles.container}>
			<div className={styles.stats}>
				<div className={styles.figure}>
					<span className={styles.value}>
						{formatDollar(stats?.investmentAmount || 0)}
					</span>
					<span className={styles.caption}>
						{t(
							"component.heroStats.caption",
							"worth of time our members are ready to put into the creation of amazing video games",
						)}
					</span>
				</div>

				<div className={styles.rule} />

				<div className={styles.counts}>
					{t(
						"component.heroStats.counts",
						"{members}+ members · {projects} current projects · {vacancies}+ open positions",
						{
							members: stats?.specialitiesCount ?? 0,
							projects: stats?.projectsCount ?? 0,
							vacancies: stats?.vacanciesCount ?? 0,
						},
					)}
				</div>
			</div>
		</div>
	);
};
