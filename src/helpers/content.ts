export const getCleanTextContent = (content: string, maxLength: number = 200) => {
	// Удаляем markdown изображения
	const withoutMarkdownImages = content.replace(/!\[.*?\]\(.*?\)/g, '')
	// Удаляем HTML изображения
	const withoutHtmlImages = withoutMarkdownImages.replace(/<img[^>]*>/g, '')
	// Удаляем все HTML теги
	const withoutHtml = withoutHtmlImages.replace(/<[^>]*>/g, '')
	// Удаляем markdown синтаксис
	const withoutMarkdown = withoutHtml
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // ссылки [text](url) -> text
		.replace(/[*_~`]+/g, '') // жирный, курсив, зачеркнутый текст и код
		.replace(/#{1,6}\s/g, '') // заголовки
		.replace(/^\s*[-+*]\s/gm, '') // списки
		.replace(/^\s*\d+\.\s/gm, '') // нумерованные списки
		.replace(/\n\s*>\s*/g, ' ') // цитаты
		.replace(/\n\s*\|\s*([^|]+\s*\|)+/g, ' ') // таблицы
	// Удаляем лишние пробелы и переносы строк
	const cleanText = withoutMarkdown.replace(/\s+/g, ' ').trim()
	return cleanText.slice(0, maxLength)
}
