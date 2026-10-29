import type EditorJS from "@editorjs/editorjs";
import type { OutputData } from "@editorjs/editorjs";
import {
	IconArrowsDiagonal,
	IconArrowsDiagonalMinimize2,
	IconX,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Modal, Skeleton, Tooltip, Typography } from "antd";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { ComposerToolbar } from "./ComposerToolbar";
import styles from "./style.module.scss";

const DevLogPostEditor = dynamic(() => import("./DevLogPostEditor"), {
	ssr: false,
});

const { Text } = Typography;

type ComposerProps = {
	author?: { name?: string | null; image?: string | null };
	/** The line under the name: the project, then the stage the post is filed under. */
	context: string;
	/** An existing post is being edited: the button reads Save. */
	editing?: boolean;
	loading?: boolean;
	saving?: boolean;
	initialData?: OutputData;
	onCancel: () => void;
	onSubmit: (content: OutputData) => void;
};

const Composer = ({
	author,
	context,
	editing,
	loading,
	saving,
	initialData,
	onCancel,
	onSubmit,
	fullscreen,
	onToggleFullscreen,
}: ComposerProps & {
	fullscreen: boolean;
	onToggleFullscreen: () => void;
}) => {
	const { t } = useTranslate();
	const editorRef = useRef<EditorJS | null>(null);
	const [edited, setEdited] = useState<OutputData>();
	const content = edited ?? initialData;
	const empty = !content?.blocks.length;
	const cancelLabel = t("modal.dev-log-post.cancel", "Cancel");
	const fullscreenLabel = fullscreen
		? t("modal.dev-log-post.fullscreen.exit", "Exit full screen")
		: t("modal.dev-log-post.fullscreen.enter", "Full screen");

	return (
		<Flex vertical gap={16} className={styles.composer}>
			<Flex gap={12} align="center">
				<AppAvatar size={40} src={author?.image || undefined}>
					{author?.name?.[0]}
				</AppAvatar>
				<Flex vertical gap={4} flex={1}>
					<Text strong>{author?.name}</Text>
					<Text type="secondary" className={styles.context}>
						{context}
					</Text>
				</Flex>
				{/* Wrapped: globals.scss forces a display on `.ant-btn` that a class cannot undo. */}
				<span className={`${styles.corner} ${styles.desktopOnly}`}>
					<Tooltip title={fullscreenLabel}>
						<Button
							aria-label={fullscreenLabel}
							type="text"
							size="small"
							className={styles.chrome}
							icon={
								fullscreen ? (
									<IconArrowsDiagonalMinimize2 size={20} />
								) : (
									<IconArrowsDiagonal size={20} />
								)
							}
							onClick={onToggleFullscreen}
						/>
					</Tooltip>
				</span>
				{/* A phone gets the dialog full screen already, and no room for Cancel below. */}
				<span className={`${styles.corner} ${styles.mobileOnly}`}>
					<Button
						aria-label={cancelLabel}
						type="text"
						size="small"
						className={styles.chrome}
						icon={<IconX size={20} />}
						onClick={onCancel}
					/>
				</span>
			</Flex>

			<div className={styles.body}>
				{loading ? (
					<Skeleton
						active
						className={styles.skeleton}
						paragraph={{ rows: 3 }}
					/>
				) : (
					<DevLogPostEditor
						editorRef={editorRef}
						initialData={initialData}
						placeholder={t(
							"modal.dev-log-post.placeholder",
							"What moved on the project?",
						)}
						onChange={setEdited}
					/>
				)}
			</div>

			<Flex justify="space-between" align="center" gap={12}>
				<ComposerToolbar editorRef={editorRef} disabled={loading} />
				<Flex gap={8}>
					<span className={styles.desktopOnly}>
						<Button onClick={onCancel}>{cancelLabel}</Button>
					</span>
					<Tooltip
						title={
							empty && !loading
								? t("modal.dev-log-post.empty", "Write something first")
								: undefined
						}
					>
						<Button
							type="primary"
							disabled={empty}
							loading={saving}
							// Read the editor itself: its onChange is debounced, so `content`
							// can miss a block inserted a moment before the click.
							onClick={async () => {
								const latest = (await editorRef.current?.save()) ?? content;
								if (latest) onSubmit(latest);
							}}
						>
							{editing
								? t("modal.dev-log-post.save", "Save")
								: t("modal.dev-log-post.post", "Post")}
						</Button>
					</Tooltip>
				</Flex>
			</Flex>
		</Flex>
	);
};

/**
 * Frames `IDeWH` (empty), `X0HR8` (with content), `pGE34` (edit, loading) and
 * `Hxjri` (full screen).
 */
export const ComposerView = ({
	open,
	...composer
}: ComposerProps & { open: boolean }) => {
	const [fullscreen, setFullscreen] = useState(false);

	return (
		<Modal
			centered
			destroyOnHidden
			width={fullscreen ? "100vw" : { xs: "100vw", md: 720 }}
			rootClassName={
				fullscreen ? `${styles.modal} ${styles.fullscreen}` : styles.modal
			}
			open={open}
			onCancel={composer.onCancel}
			afterClose={() => setFullscreen(false)}
			mask={{ closable: false }}
			closable={false}
			footer={null}
		>
			<Composer
				{...composer}
				fullscreen={fullscreen}
				onToggleFullscreen={() => setFullscreen((value) => !value)}
			/>
		</Modal>
	);
};
