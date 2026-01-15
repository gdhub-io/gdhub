import type { OutputData } from "@editorjs/editorjs";

export const getCleanTextContent = (
	content: string,
	maxLength: number = 200,
) => {
	// Удаляем markdown изображения
	const withoutMarkdownImages = content.replace(/!\[.*?\]\(.*?\)/g, "");
	// Удаляем HTML изображения
	const withoutHtmlImages = withoutMarkdownImages.replace(/<img[^>]*>/g, "");
	// Удаляем все HTML теги
	const withoutHtml = withoutHtmlImages.replace(/<[^>]*>/g, "");
	// Удаляем markdown синтаксис
	const withoutMarkdown = withoutHtml
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1") // ссылки [text](url) -> text
		.replace(/[*_~`]+/g, "") // жирный, курсив, зачеркнутый текст и код
		.replace(/#{1,6}\s/g, "") // заголовки
		.replace(/^\s*[-+*]\s/gm, "") // списки
		.replace(/^\s*\d+\.\s/gm, "") // нумерованные списки
		.replace(/\n\s*>\s*/g, " ") // цитаты
		.replace(/\n\s*\|\s*([^|]+\s*\|)+/g, " "); // таблицы
	// Удаляем лишние пробелы и переносы строк
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
	// Получаем изображения из контента
	const markdownImages = post.content.match(/!\[.*?\]\((.*?)\)/g) || [];
	const htmlImages = post.content.match(/<img[^>]+src="([^">]+)"[^>]*>/g) || [];
	const allImages = [...markdownImages, ...htmlImages];

	const firstImageFromContent =
		allImages.length > 0
			? allImages
					.map((match: string) => {
						// Пробуем найти URL в markdown формате
						const markdownMatch = match.match(/\((.*?)\)/);
						if (markdownMatch) return markdownMatch[1];

						// Пробуем найти URL в HTML формате
						const htmlMatch = match.match(/src="([^">]+)"/);
						if (htmlMatch) return htmlMatch[1];

						return null;
					})
					.filter(Boolean)[0]
			: null;

	// Получаем превью видео, если оно есть
	let videoThumbnail = null;
	if (post.video) {
		// Проверяем, является ли это YouTube видео
		const youtubeMatch = post.video.match(
			/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/,
		);
		if (youtubeMatch) {
			const videoId = youtubeMatch[1];
			videoThumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
		}
		// Проверяем, является ли это Vimeo видео
		const vimeoMatch = post.video.match(/vimeo\.com\/([0-9]+)/);
		if (vimeoMatch) {
			// Для Vimeo нужно делать API запрос, но пока используем статичное превью
			videoThumbnail = `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
		}
		// Проверяем, является ли это прямым URL видео
		if (post.video.match(/\.(mp4|webm|ogg)$/i)) {
			// Для прямых URL видео используем первое изображение из контента или обложку проекта
			videoThumbnail = firstImageFromContent || post.project?.coverImage;
		}
	}

	// Возвращаем pageCover с учетом приоритета
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
