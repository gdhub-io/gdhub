"use client";

import type {
	Event,
	EventScheduleItem,
	User,
	WorkDirection,
} from "@gdhub-io/gdhub-prisma";
import { useTolgee } from "@tolgee/react";
import { Flex, Grid } from "antd";
import Blocks from "editorjs-blocks-react-renderer";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { editorjsRenderers } from "@/helpers/editorjs-renderers";
import { hasEventEnded } from "@/helpers/event";
import styles from "./EventDefaultView.module.scss";
import { EventPanel } from "./EventPanel";
import { EventRegisterAction } from "./EventRegisterAction";
import { EventSchedule, type ScheduleItem } from "./EventSchedule";

/**
 * A meetup or jam, as the public sees it.
 *
 * The title and dates live in the page header above, so this is the body: what
 * the event is, what happens when, and the one action the page exists for. The
 * cover keeps its own column on a wide screen and drops below the content when
 * there is no room for it.
 */
const EventDefaultView = ({
	event,
	schedule,
}: {
	event: Event & { schedule: EventScheduleItem[] };
	workDirections: WorkDirection[];
	schedule: (EventScheduleItem & { speakers: User[] })[];
}) => {
	const { t, getLanguage } = useTolgee();
	const screens = Grid.useBreakpoint();

	const isFinished = hasEventEnded(
		schedule?.length ? schedule : event.schedule,
	);

	return (
		<Flex gap={48} align="flex-start" className={styles.contentContainer}>
			<Flex vertical gap={32} flex={1} className={styles.main}>
				<EventPanel title={t("event.about", "About")}>
					{event.content ? (
						<div className={styles.content}>
							<Blocks
								data={JSON.parse(event.content as string)}
								renderers={editorjsRenderers}
							/>
						</div>
					) : (
						<ReactMarkdown rehypePlugins={[rehypeRaw as never]}>
							{event.description || ""}
						</ReactMarkdown>
					)}
				</EventPanel>

				<EventPanel title={t("event.schedule", "Schedule")} flush>
					<EventSchedule
						items={schedule as ScheduleItem[]}
						locale={getLanguage() || "en"}
					/>
				</EventPanel>

				<EventRegisterAction event={event} isFinished={isFinished} />
			</Flex>

			{event.image && screens.lg && (
				<div className={styles.coverColumn}>
					<div className={styles.cover}>
						<Image
							src={event.image}
							alt={event.title}
							fill
							sizes="480px"
							style={{ objectFit: "cover" }}
						/>
					</div>
				</div>
			)}
		</Flex>
	);
};

export default EventDefaultView;
