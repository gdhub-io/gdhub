import { Card, Flex, Typography } from "antd";
import parse from "html-react-parser";
import Link from "next/link";
import { useState } from "react";
import { AppImage } from "@/components/ui/AppImage";
import { imageSrcSet, optimizedImage } from "@/helpers/image";

const { Text, Title } = Typography;

interface LinkToolData {
	link: string;
	meta?: {
		title?: string;
		description?: string;
		image?: {
			url?: string;
		};
	};
}

const DefaultLinkImage = () => (
	<Flex
		align="center"
		justify="center"
		style={{
			width: "100%",
			height: "100%",
			backgroundColor: "var(--gd-color-border)",
			color: "var(--gd-color-text-tertiary)",
		}}
	>
		<svg
			width="48"
			height="48"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-label="Link preview"
		>
			<title>Link preview</title>
			<path
				d="M3.9 12C3.9 10.29 5.29 8.9 7 8.9H11V7H7C4.24 7 2 9.24 2 12C2 14.76 4.24 17 7 17H11V15.1H7C5.29 15.1 3.9 13.71 3.9 12ZM8 13H16V11H8V13ZM17 7H13V8.9H17C18.71 8.9 20.1 10.29 20.1 12C20.1 13.71 18.71 15.1 17 15.1H13V17H17C19.76 17 22 14.76 22 12C22 9.24 19.76 7 17 7Z"
				fill="currentColor"
			/>
		</svg>
	</Flex>
);

const LinkToolRenderer = ({ data }: { data: LinkToolData }) => {
	const [imageError, setImageError] = useState(false);

	if (!data?.link) {
		return <div />;
	}

	const hasImage = data.meta?.image?.url && !imageError;

	return (
		<Card
			style={{
				margin: "16px 0",
				transition: "all 0.3s ease",
				cursor: "pointer",
			}}
			bodyStyle={{ padding: 0 }}
			styles={{
				body: {
					padding: 0,
				},
			}}
			hoverable
		>
			<Link
				href={data.link}
				target="_blank"
				rel="noopener noreferrer"
				style={{
					textDecoration: "none",
					color: "inherit",
					display: "block",
				}}
			>
				<Flex style={{ minHeight: "120px" }}>
					<Flex
						vertical
						justify="center"
						style={{
							flex: 1,
							padding: "16px",
						}}
					>
						{data.meta?.title && (
							<Title level={5} style={{ margin: "0 0 8px 0" }}>
								{data.meta.title}
							</Title>
						)}
						{data.meta?.description && (
							<Text style={{ marginBottom: 8, display: "block" }}>
								{data.meta.description.slice(0, 120)}...
							</Text>
						)}
						<Text
							type="secondary"
							style={{
								fontSize: "12px",
								wordBreak: "break-all",
							}}
						>
							{new URL(data.link).hostname}
						</Text>
					</Flex>
					<div
						style={{
							position: "relative",
							width: "64px",
							height: "64px",
							margin: "8px",
							borderRadius: "8px",
							overflow: "hidden",
						}}
					>
						{hasImage && data.meta?.image?.url ? (
							<AppImage
								src={data.meta.image.url}
								alt={data.meta?.title || "Link preview"}
								fill
								sizes="64px"
								style={{
									objectFit: "cover",
								}}
								onError={() => setImageError(true)}
							/>
						) : (
							<DefaultLinkImage />
						)}
					</div>
				</Flex>
			</Link>
		</Card>
	);
};

interface ImageBlockData {
	file?: { url: string; name?: string };
	url?: string;
	caption?: string;
	withBorder?: boolean;
	withBackground?: boolean;
	stretched?: boolean;
}

/** Article body column, so the browser never fetches more than it paints. */
const CONTENT_IMAGE_SIZES = "(max-width: 1024px) 100vw, 1024px";

const ACTION_CLASS_NAMES: Record<string, string> = {
	stretched: "image-block--stretched",
	withBorder: "image-block--with-border",
	withBackground: "image-block--with-background",
};

/**
 * Replaces the library's image renderer, which emits a bare `<img>` pointing at
 * the full-resolution upload — a devlog post with five screenshots was tens of
 * megabytes. Same markup, plus a srcset and lazy loading.
 */
const ImageBlockRenderer = ({
	data,
	className = "",
}: {
	data: ImageBlockData;
	className?: string;
}) => {
	const src = data?.file?.url || data?.url;
	const classNames = [className];
	for (const [action, actionClass] of Object.entries(ACTION_CLASS_NAMES)) {
		if (data[action as keyof ImageBlockData] === true)
			classNames.push(actionClass);
	}

	return (
		<figure className={classNames.filter(Boolean).join(" ") || undefined}>
			{!!src && (
				<img
					src={optimizedImage(src, { width: 1024 })}
					srcSet={imageSrcSet(src)}
					sizes={CONTENT_IMAGE_SIZES}
					alt={data.caption || data.file?.name || ""}
					loading="lazy"
					decoding="async"
				/>
			)}
			{!!data.caption && <figcaption>{parse(data.caption)}</figcaption>}
		</figure>
	);
};

export const editorjsRenderers = {
	image: ImageBlockRenderer,
	linkTool: LinkToolRenderer,
};
