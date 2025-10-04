export type LinkType =
	| ''
	| 'steam'
	| 'google-play'
	| 'epic-store'
	| 'itch-io'
	| 'app-store'
	| 'youtube'
	| 'discord'
	| 'facebook'
	| 'linkedin'
	| 'twitter'
	| 'reddit'

export type ProjectLink = {
	platform: LinkType
	link: string
	isPrimary: boolean
}
