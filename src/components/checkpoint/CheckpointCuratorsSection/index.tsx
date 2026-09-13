import { IconUser } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { AppImage } from "@/components/ui/AppImage";
import { avatarImage } from "@/helpers/image";
import type { FeaturedCurator } from "@/repositories/checkpoint-curators";
import { CheckpointSection } from "../CheckpointSection";
import { SectionIntro } from "../SectionIntro";
import styles from "./style.module.scss";

/** Takes itself off the page when there is nobody to show. */
export const CheckpointCuratorsSection = ({
	curators,
}: {
	curators: FeaturedCurator[];
}) => {
	const { t } = useTranslate();

	if (!curators.length) return null;

	return (
		<CheckpointSection tone="dark">
			<div className={styles.layout}>
				<SectionIntro
					eyebrow={t("checkpointLanding.curators.eyebrow", "Featured curators")}
					headline={t(
						"checkpointLanding.curators.headline",
						"Meet the people behind each Checkpoint.",
					)}
				/>

				<ul className={styles.cards}>
					{curators.map((curator) => (
						<li key={curator.id} className={styles.card}>
							<div className={styles.photo}>
								{curator.image ? (
									<AppImage
										src={avatarImage(curator.image, 440)}
										alt={curator.name}
										className={styles.photoImage}
										width={440}
										height={440}
									/>
								) : (
									<IconUser size={48} className={styles.photoPlaceholder} />
								)}
							</div>

							<div className={styles.info}>
								<p className={styles.role}>{curator.role}</p>
								<h3 className={styles.name}>{curator.name}</h3>
								<p className={styles.experience}>{curator.specialization}</p>
								<p className={styles.bio}>{curator.summary}</p>
							</div>
						</li>
					))}
				</ul>
			</div>
		</CheckpointSection>
	);
};
