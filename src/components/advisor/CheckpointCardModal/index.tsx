"use client";

import {
	IconClock,
	IconExternalLink,
	IconMessageCircle,
	IconWorld,
	IconX,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	App,
	Button,
	Flex,
	Modal,
	Skeleton,
	Tabs,
	Tooltip,
	Typography,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useChat } from "@/components/Chat/useChat";
import {
	legalAcceptances,
	missingLegalCode,
	outdatedLegalCode,
} from "@/components/legal/ClickwrapField";
import { LegalAcceptModal } from "@/components/legal/LegalAcceptModal";
import styles from "@/components/scout/ProjectCardModal/style.module.scss";
import { AppImage } from "@/components/ui/AppImage";
import { platformOptions } from "@/helpers/react-content";
import {
	useAdvisorProject,
	useAnswerCheckpoint,
	useCheckpointChat,
} from "@/hooks/checkpoints";
import { isPending } from "@/lib/checkpoint-status";
import type { AdvisorCheckpointDto } from "@/types/checkpoints";
import { CheckpointTab } from "./CheckpointTab";
import { DevlogsTab } from "./DevlogsTab";
import { PlanTab } from "./PlanTab";
import { ProjectTab } from "./ProjectTab";
import card from "./style.module.scss";
import { TeamTab } from "./TeamTab";

const { Text, Title } = Typography;

export type CheckpointCardModalProps = {
	checkpoint: AdvisorCheckpointDto;
	open: boolean;
	onClose: () => void;
	/** Waiting on this curator's answer: the card is where it is given. */
	answerable?: boolean;
};

/**
 * The checkpoint card: the scout's project card, cut down for the curator a
 * checkpoint is handed to, with the checkpoint itself in front.
 *
 * Same shell and styles, so the two read as one card, but the curator is not
 * weighing a deal: no round, no equity, files, investors or reviews, and the
 * team is its roles, specialities and hours — never its names. The checkpoint
 * they are asked about comes first, and the answer sits where the scout's
 * offer does, so taking it on is done having read what it is.
 */
export function CheckpointCardModal({
	checkpoint,
	open,
	onClose,
	answerable,
}: CheckpointCardModalProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const [tab, setTab] = useState("checkpoint");
	const [termsOpen, setTermsOpen] = useState(false);
	const [termsStale, setTermsStale] = useState(false);
	const { data: project, isLoading } = useAdvisorProject(checkpoint.id, open);
	const answer = useAnswerCheckpoint(checkpoint.id);
	const openChat = useCheckpointChat(checkpoint.id);
	// Its devlogs are for the curator running it; the server sends none before.
	const accepted = !isPending(checkpoint.status);

	useEffect(() => {
		if (open) setTab("checkpoint");
	}, [open]);

	// Taking it on first goes without the terms: the server asks for them only
	// from a curator who has not accepted the version in effect.
	const reply = async (accept: boolean, withTerms = false) => {
		try {
			await answer.mutateAsync({
				accept,
				legal: withTerms ? legalAcceptances(["AdvisorAgreement"]) : undefined,
			});
			setTermsOpen(false);
			onClose();
		} catch (error) {
			if (outdatedLegalCode(error)) {
				setTermsStale(true);
				return;
			}
			if (missingLegalCode(error) === "AdvisorAgreement") {
				setTermsOpen(true);
				return;
			}
			message.error(
				t("advisor.checkpoints.answerFailed", "The answer was not saved"),
			);
		}
	};

	const chat = () =>
		openChat.mutate(undefined, {
			onSuccess: ({ roomId }) => {
				const { setSelectedRoomId, setOpenChatModal } = useChat.getState();
				setSelectedRoomId(roomId);
				setOpenChatModal(true);
			},
			onError: () =>
				message.error(
					t("workflow.aside.chatFailed", "The chat could not open"),
				),
		});

	const meta = project
		? [project.details.genre, project.details.platform]
				.filter(Boolean)
				.join(" · ")
		: "";

	return (
		<>
			<Modal
				open={open}
				onCancel={onClose}
				footer={null}
				closable={false}
				width={960}
				centered
				className={styles.modal}
				classNames={{ body: styles.body }}
				destroyOnHidden
			>
				{isLoading || !project ? (
					<div className={styles.loading}>
						<Skeleton active paragraph={{ rows: 8 }} />
					</div>
				) : (
					<>
						<header className={styles.header}>
							{project.coverImage && (
								<AppImage
									className={styles.cover}
									src={project.coverImage}
									alt=""
									fill
									sizes="960px"
								/>
							)}
							<div className={styles.scrim} />
							<div className={styles.scrimBottom} />

							<Flex
								justify="space-between"
								align="start"
								className={styles.headerTop}
							>
								<Text className={styles.kind}>
									{answerable
										? t("advisor.card.kindRequest", "Checkpoint request")
										: t("advisor.card.kind", "Checkpoint card")}
								</Text>
								<Flex gap={8} align="center">
									<Button
										className={card.projectLink}
										icon={<IconExternalLink size={16} />}
										iconPlacement="end"
										href={`/project/${checkpoint.project.slug}`}
										target="_blank"
									>
										{t("advisor.card.projectPage", "Go to project page")}
									</Button>
									{project.links
										.filter((link) => link.link)
										.slice(0, 3)
										.map((link) => {
											const platform = platformOptions.find(
												(option) => option.value === link.platform,
											);

											return (
												<Tooltip
													key={link.link}
													title={platform?.label ?? link.platform}
												>
													<Button
														className={styles.headerButton}
														icon={platform?.icon ?? <IconWorld size={16} />}
														href={link.link}
														target="_blank"
													/>
												</Tooltip>
											);
										})}
									<Button
										className={styles.close}
										icon={<IconX size={16} />}
										onClick={onClose}
										aria-label={t("common.close", "Close")}
									/>
								</Flex>
							</Flex>

							<Flex
								justify="space-between"
								align="end"
								gap={16}
								className={styles.headerBottom}
							>
								<Flex vertical gap={8} className={styles.titleWrap}>
									<Title level={2} className={styles.title}>
										{project.name}
									</Title>
									<Text className={styles.meta}>{meta}</Text>
								</Flex>

								{accepted && !answerable && (
									<Button
										className={styles.headerAction}
										icon={<IconMessageCircle size={16} />}
										loading={openChat.isPending}
										onClick={chat}
									>
										{t("workflow.aside.chat", "Checkpoint chat")}
									</Button>
								)}

								{answerable && (
									<Flex gap={12} align="center">
										<Button
											className={styles.headerAction}
											onClick={() => reply(false)}
											disabled={answer.isPending}
										>
											{t("advisor.checkpoints.decline", "Turn down")}
										</Button>
										<Button
											type="primary"
											className={styles.headerOffer}
											onClick={() => reply(true)}
											loading={answer.isPending}
										>
											{t("advisor.checkpoints.accept", "Take it on")}
										</Button>
									</Flex>
								)}
							</Flex>
						</header>

						<Tabs
							activeKey={tab}
							onChange={setTab}
							className={styles.tabs}
							items={[
								{
									key: "checkpoint",
									label: t("advisor.brief.checkpoint", "Checkpoint"),
									children: (
										<CheckpointTab checkpoint={checkpoint} project={project} />
									),
								},
								{
									key: "plan",
									label: t("advisor.plan.tab", "Plan"),
									children: <PlanTab checkpoint={checkpoint} />,
								},
								{
									key: "project",
									label: t("advisor.brief.project", "Project"),
									children: <ProjectTab project={project} onOpenTab={setTab} />,
								},
								{
									key: "team",
									label: t("scout.card.tab.team", "Team"),
									children: <TeamTab project={project} />,
								},
								...(accepted
									? [
											{
												key: "devlogs",
												label: t("advisor.card.devlogs", "Devlogs"),
												children: <DevlogsTab devlogs={project.devlogs} />,
											},
										]
									: []),
							]}
						/>

						<footer className={styles.footer}>
							<Flex align="center" gap={8}>
								<IconClock size={14} />
								<span>
									{t("scout.card.updated", "Updated {when}", {
										when: dayjs(project.updatedAt).fromNow(),
									})}
								</span>
							</Flex>
						</footer>
					</>
				)}
			</Modal>
			<LegalAcceptModal
				code="AdvisorAgreement"
				open={termsOpen}
				stale={termsStale}
				okText={t("advisor.checkpoints.acceptTerms", "Accept and take it on")}
				requiredMessage={t(
					"legal.clickwrap.AdvisorAgreement.curate",
					"You need to accept the Advisor Agreement to curate a checkpoint",
				)}
				onCancel={() => setTermsOpen(false)}
				onAccept={() => reply(true, true)}
			/>
		</>
	);
}
