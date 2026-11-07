"use client";

import EditorJS, { type OutputData } from "@editorjs/editorjs";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	Breadcrumb,
	Button,
	Flex,
	message,
	Popover,
	Skeleton,
	Space,
	Switch,
	Typography,
	theme,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import trim from "lodash/trim";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BlogPostStatus } from "@/config/prisma-enums";
import styles from "./style.module.scss";
import { tools } from "./tools";

// Simple hash function for content comparison
const generateHash = (content: any): string => {
	return JSON.stringify(content);
};

const { Title, Text } = Typography;

export default function BlogPostEditor({ id }: { id?: string }) {
	const { token } = theme.useToken();
	const [postTitle, setPostTitle] = useState("New Blog Post");
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [initialContentHash, setInitialContentHash] = useState<string>("");
	const [isNavigating] = useState(false);

	const editorHolderId = "blog-post-editor";
	const editorInstance = useRef<EditorJS | null>(null);
	const editorHolderRef = useRef<HTMLDivElement>(null);
	const editorInitialized = useRef(false);

	const {
		data: post,
		refetch: refetchPost,
		isPending,
	} = useQuery({
		queryKey: ["blog-post-editor", "document", id],
		queryFn: () => {
			return axios.get(`/api/admin/post/${id}`);
		},
		enabled: !!id,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		refetchOnReconnect: false,
		refetchInterval: false,
		refetchIntervalInBackground: false,
	});
	// Without an id there is nothing to load: the editor opens a new post at once.
	const loadingPost = !!id && isPending;

	const { mutateAsync: changeStatus, isPending: isChangingStatus } =
		useMutation({
			mutationFn: (status: BlogPostStatus) => {
				return axios.put(`/api/admin/post/${id}`, { status });
			},
			onSuccess: () => {
				refetchPost();
				message.success("Blog post status changed successfully");
			},
			onError: () => {
				message.error("Failed to change blog post status");
			},
		});

	const { mutateAsync: saveDocument, isPending: isSavingDocument } =
		useMutation({
			mutationFn: (content: OutputData) => {
				return axios.put(`/api/admin/post/${id}`, {
					title: postTitle,
					content,
					status: post?.data?.status,
				});
			},
			onSuccess: () => {
				setHasUnsavedChanges(false);
				refetchPost();
				message.success("Blog post saved successfully");
			},
			onError: () => {
				message.error("Failed to save blog post");
			},
		});

	useEffect(() => {
		if (post?.data) {
			setPostTitle(post.data.title);
			// Set initial content hash when document data is loaded
			const initialContent = post.data.content || {};
			setInitialContentHash(generateHash(initialContent));

			// Clear EditorJS cache and reinitialize editor with document content when data is loaded
			if (typeof window !== "undefined" && window.localStorage) {
				const editorCacheKey = `editorjs-${editorHolderId}`;
				localStorage.removeItem(editorCacheKey);
			}

			// Destroy existing editor and reinitialize with new data
			if (editorInstance.current) {
				destroyEditor();
				// Small delay to ensure cleanup is complete
				setTimeout(() => {
					initEditor();
				}, 100);
			} else {
				initEditor();
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [post]);

	// Handle beforeunload event to warn about unsaved changes
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (hasUnsavedChanges && !isNavigating) {
				e.preventDefault();
				e.returnValue =
					"You have unsaved changes. Are you sure you want to leave?";
				return "You have unsaved changes. Are you sure you want to leave?";
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [hasUnsavedChanges, isNavigating]);

	// TODO: App Router migration — `router.events` API has no equivalent in next/navigation.
	// The previous Pages Router implementation used router.events to intercept route changes
	// and confirm before discarding unsaved edits. There is no direct replacement in App Router;
	// the recommended approach is to intercept Link clicks and the browser back button manually
	// or use a custom solution. For now this is left as a TODO so we don't fabricate behavior.
	// The `beforeunload` handler above still covers full-page navigations / closes.

	const initEditor = useCallback(async () => {
		if (editorInitialized.current || editorInstance.current !== null) return;

		try {
			// Determine initial content based on whether we have document data or not
			const initialContent = post?.data?.content || {};

			// Clear EditorJS cache to prevent showing stale data
			if (typeof window !== "undefined" && window.localStorage) {
				const editorCacheKey = `editorjs-${editorHolderId}`;
				localStorage.removeItem(editorCacheKey);
			}

			editorInstance.current = new EditorJS({
				holder: editorHolderId,
				autofocus: true,
				readOnly: false,
				inlineToolbar: true,
				minHeight: 30,
				placeholder: "Start typing...",
				sanitizer: {
					paragraph: {
						preserveNewlines: true,
					},
				},
				data: initialContent,
				tools: tools,
				onReady: () => {
					editorInitialized.current = true;

					// Set initial document title from first header block
					if (initialContent.blocks && initialContent.blocks.length > 0) {
						const firstBlock = initialContent.blocks[0];
						if (
							firstBlock.type === "header" &&
							firstBlock.data &&
							firstBlock.data.text
						) {
							setPostTitle(trim(firstBlock.data.text));
						}
					}

					// [for development environment] Remove all codex-editor elements except the first one
					const children =
						editorHolderRef.current?.getElementsByClassName("codex-editor");
					if (children && children.length > 1) {
						children[0].remove();
					}
				},
				onChange: async () => {
					try {
						const content: OutputData | undefined =
							await editorInstance.current?.save();

						// Update document title from first header block
						if (content && content.blocks && content.blocks.length > 0) {
							const firstBlock = content.blocks[0];
							if (
								firstBlock.type === "header" &&
								firstBlock.data &&
								firstBlock.data.text
							) {
								setPostTitle(trim(firstBlock.data.text));
							}
						}

						// Check for content changes
						if (content) {
							const currentContentHash = generateHash(content);
							const hasChanges = currentContentHash !== initialContentHash;
							setHasUnsavedChanges(hasChanges);
						}
					} catch (error) {
						console.warn("Error saving editor content:", error);
					}
				},
			});

			editorInitialized.current = true;
		} catch (error) {
			console.error("Error initializing editor:", error);
			editorInitialized.current = false;
		}
	}, [post, initialContentHash]);

	const destroyEditor = useCallback(() => {
		if (editorInstance.current) {
			try {
				if (typeof editorInstance.current.destroy === "function") {
					editorInstance.current.destroy();
				}
				editorInstance.current = null;
				editorInitialized.current = false;
				if (editorHolderRef.current) editorHolderRef.current.innerHTML = "";
			} catch (error) {
				console.warn("Error destroying editor:", error);
			}
		}
		editorInstance.current = null;
		editorInitialized.current = false;
	}, []);

	useEffect(() => {
		// Check if the component is mounted
		if (typeof window === "undefined") return;

		// Only initialize editor if we have document data or if this is a new document (no id)
		if (post?.data || !id) {
			initEditor();
		}

		return () => {
			destroyEditor();
		};
	}, [initEditor, destroyEditor, post, id]);

	const handleSaveBlogPost = useCallback(async () => {
		try {
			const content: OutputData | undefined =
				await editorInstance.current?.save();
			if (content) {
				await saveDocument(content);
			}
		} catch (error) {
			message.error("Failed to save blog post");
		}
	}, [saveDocument]);

	const handleChangeStatus = useCallback(
		async (checked: boolean) => {
			await changeStatus(
				checked ? BlogPostStatus.Published : BlogPostStatus.Draft,
			);
		},
		[changeStatus],
	);

	return (
		<div>
			<Breadcrumb
				items={[
					{
						title: (
							<Link
								href="/admin/posts"
								className={styles.stepTitle}
								style={{ color: token.colorPrimary }}
							>
								Blog posts
							</Link>
						),
					},
					{
						title: <span className={styles.stepTitle}>Editor</span>,
					},
				]}
				style={{ marginTop: 16 }}
			/>
			<div>
				<Flex justify="space-between" align="center">
					<div>
						{loadingPost ? (
							<Flex vertical gap="small" className={styles.postTitle}>
								<Skeleton.Input active size="large" />
								<Skeleton.Input active size="small" />
							</Flex>
						) : (
							<>
								<Title
									level={1}
									className={styles.postTitle}
									editable={{
										triggerType: ["text"],
										maxLength: 150,

										onChange: (value) => setPostTitle(value),
									}}
								>
									{postTitle}
								</Title>
								{post?.data?.updatedAt && (
									<p className={styles.postSubtitle}>
										Last updated on{" "}
										{dayjs(post.data.updatedAt).format("DD/MM/YYYY")}
									</p>
								)}
							</>
						)}
					</div>
					<Space>
						{loadingPost ? (
							<Skeleton.Button active size="small" />
						) : (
							<Space>
								<Text type="secondary">{post?.data?.status}</Text>
								<Popover
									content={
										hasUnsavedChanges
											? "You should save the post first"
											: "Change status"
									}
								>
									<Switch
										title="Change status"
										disabled={hasUnsavedChanges}
										checked={post?.data?.status === BlogPostStatus.Published}
										onChange={handleChangeStatus}
									/>
								</Popover>
							</Space>
						)}
						<Button
							type="primary"
							onClick={handleSaveBlogPost}
							disabled={!hasUnsavedChanges}
							loading={isSavingDocument}
						>
							Save
						</Button>
					</Space>
				</Flex>
			</div>
			<div className={styles.postContainer}>
				{loadingPost && (
					<Skeleton active title={false} paragraph={{ rows: 8 }} />
				)}
				<div id={editorHolderId} ref={editorHolderRef} />
			</div>
		</div>
	);
}
