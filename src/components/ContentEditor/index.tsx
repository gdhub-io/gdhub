'use client'
import React, { FC } from 'react'
import { env } from '@/helpers/env'
import {
	BoldItalicUnderlineToggles,
	MDXEditorMethods,
	UndoRedo,
	toolbarPlugin,
	linkDialogPlugin,
	CreateLink,
	linkPlugin,
	imagePlugin,
	InsertImage,
	listsPlugin,
	ListsToggle,
	markdownShortcutPlugin,
	DialogButton,
	usePublisher,
	insertDirective$,
	DirectiveDescriptor,
	GenericDirectiveEditor,
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'
import { MDXEditor, headingsPlugin } from '@mdxeditor/editor'
import { notification } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

interface EditorProps {
	markdown: string
	editorRef?: React.MutableRefObject<MDXEditorMethods | null>
	className?: string
	onChange?: (text: string) => void
}

const youtubeDirectiveDescriptor: DirectiveDescriptor = {
	name: 'youtube',
	type: 'leafDirective',
	testNode(node) {
		return node.name === 'youtube'
	},
	// set some attribute names to have the editor display a property editor popup.
	attributes: [],
	// used by the generic editor to determine whether or not to render a nested editor.
	hasChildren: true,
	Editor: GenericDirectiveEditor,
}

const YouTubeButton = () => {
	// grab the insertDirective action (a.k.a. publisher) from the
	// state management system of the directivesPlugin
	const insertDirective = usePublisher(insertDirective$)

	return (
		<DialogButton
			tooltipTitle="Insert Youtube video"
			submitButtonTitle="Insert video"
			dialogInputPlaceholder="Paste the youtube video URL"
			buttonContent="YT"
			onSubmit={(url) => {
				const videoId = new URL(url).searchParams.get('v')
				if (videoId) {
					insertDirective({
						name: 'youtube',
						type: 'leafDirective',
						attributes: { id: videoId },
						children: [],
					} as any)
				} else {
					alert('Invalid YouTube URL')
				}
			}}
		/>
	)
}

const ContentEditor: FC<EditorProps> = ({ markdown, className, editorRef, onChange = () => {} }) => {
	const { data: session } = useSession()

	return (
		<MDXEditor
			ref={editorRef}
			className={`${styles.editor} ${className}`}
			markdown={markdown}
			onChange={onChange}
			plugins={[
				headingsPlugin(),
				linkPlugin(),
				linkDialogPlugin(),
				listsPlugin(),
				markdownShortcutPlugin(),
				// directivesPlugin({ directiveDescriptors: [youtubeDirectiveDescriptor] }),
				imagePlugin({
					imageUploadHandler: async (image: File) => {
						try {
							const data = new FormData()
							data.append('file', image)
							data.append('filename', 'user-file-' + session?.user.id + '-' + dayjs().millisecond())
							data.append('tag', 'user-file')

							const res = await axios.post('/api/file', data)

							return res.data.url
						} catch (error: any) {
							if (error.response.status == 413) {
								notification.error({
									message: `Your file too large. Maximum file size is ${env(
										'NEXT_PUBLIC_UPLOAD_FILE_FOR_REPORT_MAX_SIZE',
										5
									)}Mb.`,
								})
							} else {
								notification.error({ message: 'Some problem with uploading. Try insert other image.' })
							}

							return null
						}
					},
				}),
				toolbarPlugin({
					toolbarContents: () => (
						<>
							{' '}
							<UndoRedo />
							<BoldItalicUnderlineToggles />
							<CreateLink />
							<InsertImage />
							<ListsToggle />
							{/* <YouTubeButton /> */}
						</>
					),
				}),
			]}
		/>
	)
}

export default ContentEditor
