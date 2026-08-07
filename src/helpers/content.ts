import type { OutputData } from "@editorjs/editorjs";

export const getCleanTextContent = (
	content: string,
	maxLength: number = 200,
) => {
	// Strip markdown images
	const withoutMarkdownImages = content.replace(/!\[.*?\]\(.*?\)/g, "");
	// Strip HTML images
	const withoutHtmlImages = withoutMarkdownImages.replace(/<img[^>]*>/g, "");
	// Strip every HTML tag
	const withoutHtml = withoutHtmlImages.replace(/<[^>]*>/g, "");
	// Strip markdown syntax
	const withoutMarkdown = withoutHtml
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1") // links [text](url) -> text
		.replace(/[*_~`]+/g, "") // bold, italic, strikethrough and code
		.replace(/#{1,6}\s/g, "") // headings
		.replace(/^\s*[-+*]\s/gm, "") // lists
		.replace(/^\s*\d+\.\s/gm, "") // numbered lists
		.replace(/\n\s*>\s*/g, " ") // quotes
		.replace(/\n\s*\|\s*([^|]+\s*\|)+/g, " "); // tables
	// Collapse extra spaces and line breaks
	const cleanText = withoutMarkdown.replace(/\s+/g, " ").trim();
	return cleanText.slice(0, maxLength);
};

export const getPageCover = (post: {
	content: string;
	video?: string | null;
	project?: {
		coverImage?: string | null;
	} | null;
}): string | null => {
	// Pull the images out of the content
	const markdownImages = post.content.match(/!\[.*?\]\((.*?)\)/g) || [];
	const htmlImages = post.content.match(/<img[^>]+src="([^">]+)"[^>]*>/g) || [];
	const allImages = [...markdownImages, ...htmlImages];

	const firstImageFromContent =
		allImages.length > 0
			? allImages
					.map((match: string) => {
						// Try to find a markdown-formatted URL
						const markdownMatch = match.match(/\((.*?)\)/);
						if (markdownMatch) return markdownMatch[1];

						// Try to find an HTML-formatted URL
						const htmlMatch = match.match(/src="([^">]+)"/);
						if (htmlMatch) return htmlMatch[1];

						return null;
					})
					.filter(Boolean)[0]
			: null;

	// Take the video poster, when there is one
	let videoThumbnail = null;
	if (post.video) {
		// Is it a YouTube video?
		const youtubeMatch = post.video.match(
			/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/,
		);
		if (youtubeMatch) {
			const videoId = youtubeMatch[1];
			videoThumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
		}
		// Is it a Vimeo video?
		const vimeoMatch = post.video.match(/vimeo\.com\/([0-9]+)/);
		if (vimeoMatch) {
			// Vimeo would need an API call; use a static poster for now
			videoThumbnail = `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
		}
		// Is it a direct video URL?
		if (post.video.match(/\.(mp4|webm|ogg)$/i)) {
			// For a direct video URL use the first image in the content, or the project cover
			videoThumbnail = firstImageFromContent || post.project?.coverImage;
		}
	}

	// Return the pageCover, honouring the priority order
	const result =
		videoThumbnail || firstImageFromContent || post.project?.coverImage || null;
	return result;
};

/**
 * Extracts YouTube video ID from URL
 */
const extractYouTubeVideoId = (url: string): string | null => {
	const youtubeRegex =
		/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
	const match = url.match(youtubeRegex);
	return match ? match[1] : null;
};

/**
 * Gets YouTube thumbnail URL from video ID
 */
const getYouTubeThumbnail = (videoId: string): string => {
	return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

export const getEditorjsPageCover = (content: OutputData) => {
	if (!content?.blocks || !Array.isArray(content.blocks)) {
		return null;
	}

	// Find first block that is either image or embed
	const firstMediaBlock = content.blocks.find(
		(block: OutputData["blocks"][number]) =>
			block.type === "image" || block.type === "embed",
	);

	if (!firstMediaBlock) {
		return null;
	}

	// If it's an image, return the image URL
	if (firstMediaBlock.type === "image") {
		return (firstMediaBlock.data?.file?.url as string) || null;
	}

	// If it's an embed block, check if it's YouTube and get thumbnail
	if (firstMediaBlock.type === "embed") {
		const embedData = firstMediaBlock.data;
		const service = embedData?.service;
		const source = embedData?.source || embedData?.embed;

		// Only process YouTube embeds
		if (service === "youtube" && source) {
			const videoId = extractYouTubeVideoId(source);
			if (videoId) {
				return getYouTubeThumbnail(videoId);
			}
		}
	}

	return null;
};

export const getEditorjsShortContent = (
	content: OutputData,
	maxLength: number = 200,
) => {
	const blocks = content?.blocks || [];

	const text = `${blocks
		.filter(
			(block: OutputData["blocks"][number]) =>
				block.type !== "image" && Boolean(block.data?.text),
		)
		.map((block: OutputData["blocks"][number]) => block.data?.text)
		.join(". ")}`;

	return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};
