"use client";

import { useTranslate } from "@tolgee/react";
import styles from "@/app/(app)/(spaces)/hub/events/style.module.scss";
import eventBackgroundImage from "@/assets/images/public-events-header-bg.jpg";
import {
	type CatalogueEvent,
	EventsCatalogue,
} from "@/components/events/EventsCatalogue";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";

export function EventsClient({ events }: { events: CatalogueEvent[] }) {
	const { t } = useTranslate();

	return (
		<>
			<PublicPageHeader
				title={t("page.events.title", "Events")}
				backgroundImage={eventBackgroundImage.src}
			/>
			<div className="layout-background">
				<div className={styles.container}>
					<EventsCatalogue events={events} />
				</div>
			</div>
		</>
	);
}
