"use client";

import type {
	Event,
	EventScheduleItem,
	User,
	WorkDirection,
} from "@gdhub-io/gdhub-prisma";
import { useTolgee } from "@tolgee/react";
import { Flex, Typography } from "antd";
import Blocks from "editorjs-blocks-react-renderer";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { AppImage } from "@/components/ui/AppImage";
import { editorjsRenderers } from "@/helpers/editorjs-renderers";
import { hasEventEnded } from "@/helpers/event";
import { formatEventPeriod } from "@/helpers/format";
import styles from "./EventConferenceOrGamelabView.module.scss";
import { EventPanel } from "./EventPanel";
import { EventRegisterAction } from "./EventRegisterAction";
import { EventSchedule, type ScheduleItem } from "./EventSchedule";

const { Title, Text } = Typography;

/**
 * A conference or game lab, as the public sees it.
 *
 * The difference from a meetup is billing: these are the events people travel
 * for, so the cover leads at full width and the name sits under it in the
 * middle of the page, rather than in the header band. Everything below — what
 * it is, the programme, the one action — is the same furniture.
 */
const EventConferenceOrGamelabView = ({
	event,
	schedule,
}: {
	event: Event & { schedule: EventScheduleItem[] };
	workDirections: WorkDirection[];
	schedule: (EventScheduleItem & { speakers: User[] })[];
}) => {
	const { t, getLanguage } = useTolgee();
	const { data: session } = useSession();

	const isFinished = hasEventEnded(
		schedule?.length ? schedule : event.schedule,
	);

	return (
		<div className={styles.contentContainer}>
			{/* Pulled up into the header band, so the cover bridges the two. */}
			{event.image && (
				<div className={styles.coverWrap}>
					<div className={styles.cover}>
						<AppImage
							src={event.image}
							alt={event.title}
							fill
							sizes="(max-width: 900px) 90vw, 900px"
							style={{ objectFit: "cover" }}
							priority
						/>
					</div>
				</div>
			)}

			<Flex vertical align="center" gap={8} className={styles.titleBlock}>
				<Title level={1} className={styles.title}>
					{event.title}
				</Title>
				{event.shortDescription && (
					<Text type="secondary" className={styles.subtitle}>
						{event.shortDescription}
					</Text>
				)}
				{schedule.length > 0 && (
					<Flex vertical align="center" className={styles.dates}>
						<Text type="secondary" className={styles.datesLabel}>
							{t("event.dates", "Dates")}
						</Text>
						<Text strong className={styles.datesValue}>
							{formatEventPeriod(
								schedule[0].startDate,
								schedule[schedule.length - 1].endDate,
								getLanguage() || "en",
								"day",
							)}
						</Text>
					</Flex>
				)}
			</Flex>

			<Flex vertical gap={32}>
				<EventPanel title={t("event.about", "About")}>
					{event.content ? (
						<div className={styles.content}>
							<Blocks
								data={JSON.parse(event.content as string)}
								renderers={editorjsRenderers}
							/>
						</div>
					) : (
						<div className={styles.description}>
							<ReactMarkdown
								rehypePlugins={[rehypeRaw as never]}
								remarkPlugins={[remarkGfm]}
								skipHtml={false}
							>
								{event.description || ""}
							</ReactMarkdown>
						</div>
					)}
				</EventPanel>

				<EventPanel title={t("event.schedule", "Schedule")} flush>
					<EventSchedule
						items={schedule as ScheduleItem[]}
						locale={getLanguage() || "en"}
					/>
				</EventPanel>

				<Flex justify="center" className={styles.register}>
					<EventRegisterAction event={event} isFinished={isFinished} />
				</Flex>
			</Flex>
		</div>
	);
};

export default EventConferenceOrGamelabView;
