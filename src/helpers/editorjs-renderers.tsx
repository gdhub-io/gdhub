import { Card, Flex, Typography } from "antd";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const { Text, Title } = Typography;

interface LinkToolData {
	link: string;
	meta?: {
		title?: string;
		description?: string;
		image?: {
			url?: string;
		};
	};
}

const DefaultLinkImage = () => (
	<Flex
		align="center"
		justify="center"
		style={{
			width: "100%",
			height: "100%",
			backgroundColor: "#f0f0f0",
			color: "#999",
		}}
	>
		<svg
			width="48"
			height="48"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-label="Link preview"
		>
			<title>Link preview</title>
			<path
				d="M3.9 12C3.9 10.29 5.29 8.9 7 8.9H11V7H7C4.24 7 2 9.24 2 12C2 14.76 4.24 17 7 17H11V15.1H7C5.29 15.1 3.9 13.71 3.9 12ZM8 13H16V11H8V13ZM17 7H13V8.9H17C18.71 8.9 20.1 10.29 20.1 12C20.1 13.71 18.71 15.1 17 15.1H13V17H17C19.76 17 22 14.76 22 12C22 9.24 19.76 7 17 7Z"
				fill="currentColor"
			/>
		</svg>
	</Flex>
);

const LinkToolRenderer = ({ data }: { data: LinkToolData }) => {
	const [imageError, setImageError] = useState(false);

	if (!data?.link) {
		return <div />;
	}

	const hasImage = data.meta?.image?.url && !imageError;

	return (
		<Card
			style={{
				margin: "16px 0",
				transition: "all 0.3s ease",
				cursor: "pointer",
			}}
			bodyStyle={{ padding: 0 }}
			styles={{
				body: {
					padding: 0,
				},
			}}
			hoverable
		>
			<Link
				href={data.link}
				target="_blank"
				rel="noopener noreferrer"
				style={{
					textDecoration: "none",
					color: "inherit",
					display: "block",
				}}
			>
				<Flex style={{ minHeight: "120px" }}>
					<Flex
						vertical
						justify="center"
						style={{
							flex: 1,
							padding: "16px",
						}}
					>
						{data.meta?.title && (
							<Title level={5} style={{ margin: "0 0 8px 0" }}>
								{data.meta.title}
							</Title>
						)}
						{data.meta?.description && (
							<Text style={{ marginBottom: 8, display: "block" }}>
								{data.meta.description.slice(0, 120)}...
							</Text>
						)}
						<Text
							type="secondary"
							style={{
								fontSize: "12px",
								wordBreak: "break-all",
							}}
						>
							{new URL(data.link).hostname}
						</Text>
					</Flex>
					<div
						style={{
							position: "relative",
							width: "64px",
							height: "64px",
							margin: "8px",
							borderRadius: "8px",
							overflow: "hidden",
						}}
					>
						{hasImage && data.meta?.image?.url ? (
							<Image
								src={data.meta.image.url}
								alt={data.meta?.title || "Link preview"}
								fill
								style={{
									objectFit: "cover",
								}}
								unoptimized
								onError={() => setImageError(true)}
							/>
						) : (
							<DefaultLinkImage />
						)}
					</div>
				</Flex>
			</Link>
		</Card>
	);
};

export const editorjsRenderers = {
	linkTool: LinkToolRenderer,
};
