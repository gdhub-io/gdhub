// @ts-expect-error - no types
import CheckList from '@editorjs/checklist'
import Delimiter from '@editorjs/delimiter'
import { ToolConstructable, ToolSettings } from '@editorjs/editorjs'
import Header from '@editorjs/header'
// @ts-expect-error - no types
import LinkTool from '@editorjs/link'
import List from '@editorjs/list'
// @ts-expect-error - no types
import Marker from '@editorjs/marker'
import Paragraph from '@editorjs/paragraph'
import Quote from '@editorjs/quote'
import Table from '@editorjs/table'

export const tools: {
	[toolName: string]: ToolConstructable | ToolSettings
} = {
	header: {
		class: Header as unknown as ToolConstructable,
		inlineToolbar: ['link'],
	},
	list: {
		class: List as unknown as ToolConstructable,
		inlineToolbar: true,
	},
	paragraph: {
		class: Paragraph as unknown as ToolConstructable,
		inlineToolbar: true,
	},
	linkTool: {
		class: LinkTool,
		inlineToolbar: true,
	},
	quote: {
		class: Quote,
		inlineToolbar: true,
	},
	marker: {
		class: Marker,
		inlineToolbar: true,
	},
	checklist: {
		class: CheckList,
		inlineToolbar: true,
	},
	delimiter: {
		class: Delimiter,
		inlineToolbar: true,
	},
	table: {
		class: Table as unknown as ToolConstructable,
		inlineToolbar: true,
	},
}
