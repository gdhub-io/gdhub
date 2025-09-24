export const hasImageUrl = (content: string) => {
	return (
		(content.includes('http') || content.includes('https')) &&
		(content.includes('.jpg') ||
			content.includes('.png') ||
			content.includes('.jpeg') ||
			content.includes('.gif') ||
			content.includes('.webp'))
	)
}

/**
 * Renders content with image URLs extracted and placed below the text.
 * Only direct image URLs (e.g., https://...jpg/png/gif/webp) are supported.
 */
export const renderContentWithImageUrl = (content: string) => {
	// Regex to find direct image URLs
	const urlRegex = /(https?:\/\/[^\s'"]+\.(?:jpg|jpeg|png|gif|webp))/gi
	const imageUrls = [...content.matchAll(urlRegex)].map((m) => m[1])

	// Remove image URLs from the text content
	const textContent = content.replace(urlRegex, '').trim()

	return (
		<div>
			<div>{textContent}</div>
			{imageUrls.length > 0 && (
				<div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
					{imageUrls.map((src, idx) => (
						// eslint-disable-next-line @next/next/no-img-element
						<img key={src + idx} src={src} alt={`image-${idx}`} style={{ maxWidth: '100%', borderRadius: 8 }} />
					))}
				</div>
			)}
		</div>
	)
}
