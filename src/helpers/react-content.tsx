import { SiEpicgames } from '@react-icons/all-files/si/SiEpicgames'
import {
	IconBrandApple,
	IconBrandDiscord,
	IconBrandFacebook,
	IconBrandGooglePlay,
	IconBrandItch,
	IconBrandLinkedin,
	IconBrandReddit,
	IconBrandSteam,
	IconBrandTelegram,
	IconBrandTwitter,
	IconBrandYoutube,
} from '@tabler/icons-react'

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

export const platformOptions = [
	{ value: 'steam', label: 'Steam', icon: <IconBrandSteam /> },
	{ value: 'google-play', label: 'Google Play', icon: <IconBrandGooglePlay /> },
	{ value: 'epic-store', label: 'Epic Store', icon: <SiEpicgames size={20} /> },
	{ value: 'itch-io', label: 'itch.io', icon: <IconBrandItch /> },
	{ value: 'app-store', label: 'App Store', icon: <IconBrandApple /> },
	{ value: 'youtube', label: 'YouTube', icon: <IconBrandYoutube /> },
	{ value: 'discord', label: 'Discord', icon: <IconBrandDiscord /> },
	{ value: 'facebook', label: 'Facebook', icon: <IconBrandFacebook /> },
	{ value: 'linkedin', label: 'LinkedIn', icon: <IconBrandLinkedin /> },
	{ value: 'twitter', label: 'Twitter/X', icon: <IconBrandTwitter /> },
	{ value: 'reddit', label: 'Reddit', icon: <IconBrandReddit /> },
	{ value: 'telegram', label: 'Telegram', icon: <IconBrandTelegram /> },
]
