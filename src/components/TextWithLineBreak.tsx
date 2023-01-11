import parse from 'html-react-parser'
import { LinkItUrl } from 'react-linkify-it'

export const TextWithLineBreak = ({ text }: { text: string }) => {
	const parseText = (t: string) => t.replace(/\n/g, '<br />')
	const textToPparagraphs = (t: string) => t.split('\n\n').map((str, key) => <p key={key}>{parse(parseText(str))}</p>)

	return <LinkItUrl>{textToPparagraphs(text)}</LinkItUrl>
}
