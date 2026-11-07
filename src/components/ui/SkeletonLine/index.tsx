import { Skeleton } from "antd";
import type { CSSProperties } from "react";

/** One bar of a skeleton, sized to the text or control it stands in for. */
export function SkeletonLine({
	width,
	height = 16,
}: {
	width: CSSProperties["width"];
	height?: number;
}) {
	return <Skeleton.Input active block style={{ width, height, minWidth: 0 }} />;
}
