"use client";

import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import Link from "next/link";
import { useAccess } from "@/components/access/AccessProvider";
import {
	type CatalogueEvent,
	EventsCatalogue,
} from "@/components/events/EventsCatalogue";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import styles from "./style.module.scss";

export default function EventsClient({ events }: { events: CatalogueEvent[] }) {
	const { t } = useTranslate();
	const { can } = useAccess();

	return (
		<div className="layout-background">
			<ProtectedPageHeader
				title={t("page.events.title", "Events")}
				extra={
					// The permission already carries the speciality requirement, so
					// whoever may run an event is exactly who is offered the way in.
					can("hub.events.create") && (
						<Link href="/user/events">
							<Button>{t("page.events.myEvents", "My Events")}</Button>
						</Link>
					)
				}
			/>
			<div className={styles.container}>
				<EventsCatalogue events={events} />
			</div>
		</div>
	);
}
