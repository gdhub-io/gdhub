import type EditorJS from "@editorjs/editorjs";
import type { BlockToolData } from "@editorjs/editorjs";
import {
	IconDots,
	IconHeading,
	IconLink,
	IconList,
	IconListCheck,
	IconPhoto,
	IconQuote,
	IconSeparator,
	IconTable,
	IconVideo,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	App,
	Button,
	Dropdown,
	Flex,
	Input,
	type InputRef,
	Popover,
	Space,
	Tooltip,
	Upload,
} from "antd";
import { type RefObject, useRef, useState } from "react";
import { embedDataFromUrl, insertBlock } from "./DevLogPostEditor/blocks";
import { uploadImage } from "./DevLogPostEditor/tools";
import styles from "./style.module.scss";

const ICON_SIZE = 20;

export const ComposerToolbar = ({
	editorRef,
	disabled,
}: {
	editorRef: RefObject<EditorJS | null>;
	disabled?: boolean;
}) => {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const caretIndex = useRef(-1);
	const videoInput = useRef<InputRef>(null);
	const [uploading, setUploading] = useState(false);
	const [videoOpen, setVideoOpen] = useState(false);
	const [videoUrl, setVideoUrl] = useState("");

	const insert = (type: string, data?: BlockToolData) => {
		if (editorRef.current) {
			insertBlock(editorRef.current, caretIndex.current, type, data);
		}
	};

	const handleImage = async (file: File) => {
		setUploading(true);
		const uploaded = await uploadImage(file);
		setUploading(false);

		if (uploaded.success) insert("image", { file: uploaded.file });
	};

	const handleVideo = () => {
		const embed = embedDataFromUrl(videoUrl.trim());
		if (!embed) {
			message.warning(
				t(
					"modal.dev-log-post.video.unsupported",
					"This link is not a video we can embed",
				),
			);
			return;
		}

		insert("embed", embed);
		setVideoOpen(false);
		setVideoUrl("");
	};

	const imageLabel = t("modal.dev-log-post.tool.image", "Image");
	const videoLabel = t("modal.dev-log-post.tool.video", "Video");
	const moreLabel = t("modal.dev-log-post.tool.more", "More blocks");

	const blocks = [
		{
			type: "header",
			data: { text: "", level: 2 },
			label: t("modal.dev-log-post.tool.heading", "Heading"),
			icon: <IconHeading size={ICON_SIZE} />,
		},
		{
			type: "list",
			// The list tool throws on anything short of its full shape.
			data: {
				style: "unordered",
				meta: {},
				items: [{ content: "", meta: {}, items: [] }],
			},
			label: t("modal.dev-log-post.tool.list", "List"),
			icon: <IconList size={ICON_SIZE} />,
		},
		{
			type: "quote",
			label: t("modal.dev-log-post.tool.quote", "Quote"),
			icon: <IconQuote size={ICON_SIZE} />,
		},
	];

	const moreBlocks = [
		{
			type: "checklist",
			label: t("modal.dev-log-post.tool.checklist", "Checklist"),
			icon: <IconListCheck size={16} />,
		},
		{
			type: "table",
			label: t("modal.dev-log-post.tool.table", "Table"),
			icon: <IconTable size={16} />,
		},
		{
			type: "delimiter",
			label: t("modal.dev-log-post.tool.delimiter", "Divider"),
			icon: <IconSeparator size={16} />,
		},
		{
			type: "linkTool",
			label: t("modal.dev-log-post.tool.link", "Link preview"),
			icon: <IconLink size={16} />,
		},
	];

	return (
		<Flex
			gap={4}
			align="center"
			className={styles.tools}
			// Keeps the caret in the editor and remembers the block it was in. The
			// popover and the menu are portals: their events bubble here too, and
			// they must be left alone or the link input could never take focus.
			onMouseDown={(event) => {
				if (!event.currentTarget.contains(event.target as Node)) return;
				event.preventDefault();
				caretIndex.current =
					editorRef.current?.blocks.getCurrentBlockIndex() ?? -1;
			}}
		>
			<Upload
				accept="image/*"
				showUploadList={false}
				disabled={disabled}
				beforeUpload={(file) => {
					handleImage(file);
					return false;
				}}
			>
				<Tooltip title={imageLabel}>
					<Button
						aria-label={imageLabel}
						type="text"
						size="small"
						disabled={disabled}
						loading={uploading}
						icon={<IconPhoto size={ICON_SIZE} />}
					/>
				</Tooltip>
			</Upload>

			<Popover
				trigger="click"
				placement="topLeft"
				open={videoOpen}
				onOpenChange={setVideoOpen}
				// `autoFocus` fires before the popover is on screen and is lost.
				afterOpenChange={(opened) => opened && videoInput.current?.focus()}
				content={
					<Space.Compact className={styles.video}>
						<Input
							ref={videoInput}
							value={videoUrl}
							onChange={(event) => setVideoUrl(event.target.value)}
							onPressEnter={handleVideo}
							placeholder={t(
								"modal.dev-log-post.video.placeholder",
								"Paste a video link",
							)}
						/>
						<Button type="primary" onClick={handleVideo}>
							{t("modal.dev-log-post.video.add", "Add")}
						</Button>
					</Space.Compact>
				}
			>
				{/* No tooltip here or on "more": it would cover what the button opens. */}
				<Button
					aria-label={videoLabel}
					title={videoLabel}
					type="text"
					size="small"
					disabled={disabled}
					icon={<IconVideo size={ICON_SIZE} />}
				/>
			</Popover>

			{blocks.map(({ type, data, label, icon }) => (
				<Tooltip key={type} title={label}>
					<Button
						aria-label={label}
						type="text"
						size="small"
						disabled={disabled}
						icon={icon}
						onClick={() => insert(type, data)}
					/>
				</Tooltip>
			))}

			<Dropdown
				trigger={["click"]}
				placement="topLeft"
				disabled={disabled}
				menu={{
					items: moreBlocks.map(({ type, label, icon }) => ({
						key: type,
						label,
						icon,
					})),
					onClick: ({ key }) => insert(key),
				}}
			>
				<Button
					aria-label={moreLabel}
					title={moreLabel}
					type="text"
					size="small"
					disabled={disabled}
					icon={<IconDots size={ICON_SIZE} />}
				/>
			</Dropdown>
		</Flex>
	);
};
