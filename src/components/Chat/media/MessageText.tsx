import { Typography } from "antd";
import { Fragment } from "react";
import { textSegments } from "@/helpers/chat-media";

/** A message body with its http(s) links clickable, opening in a new tab. */
export function MessageText({ text }: { text: string }) {
	return textSegments(text).map((segment, i) =>
		segment.type === "link" ? (
			<Typography.Link
				// biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder
				key={i}
				href={segment.value}
				target="_blank"
				rel="noopener noreferrer"
			>
				{segment.value}
			</Typography.Link>
		) : (
			// biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder
			<Fragment key={i}>{segment.value}</Fragment>
		),
	);
}
