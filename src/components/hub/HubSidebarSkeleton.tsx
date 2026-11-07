import { Flex, Skeleton } from "antd";
import { SkeletonLine } from "@/components/ui/SkeletonLine";
import {
	getHubSectionShellClass,
	HubSectionBody,
	HubSectionHeader,
} from "./HubSection";
import rowStyles from "./sidebarRow.module.scss";

const ROW_COUNT = 3;

type HubSectionRowsSkeletonProps = {
	/** `circle` for avatar rows (members, people); `square` for tiles and covers. */
	media?: "square" | "circle";
};

/** Placeholder rows with the exact geometry of `HubSectionRow`. */
export function HubSectionRowsSkeleton({
	media = "square",
}: HubSectionRowsSkeletonProps) {
	return Array.from({ length: ROW_COUNT }, (_, index) => (
		<div
			// biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
			key={index}
			className={rowStyles.row}
			aria-hidden
		>
			<div className={rowStyles.left}>
				<Skeleton.Avatar active shape={media} size={32} />
				<Flex vertical gap={4} className={rowStyles.text}>
					<SkeletonLine width={140} height={14} />
					<SkeletonLine width={90} height={11} />
				</Flex>
			</div>
		</div>
	));
}

type HubSidebarSkeletonProps = HubSectionRowsSkeletonProps & {
	/** Already-translated. */
	title: string;
};

/** A hub sidebar card while its data loads: the real header, rows as placeholders. */
export function HubSidebarSkeleton({ title, media }: HubSidebarSkeletonProps) {
	return (
		<section className={getHubSectionShellClass("sidebar")} aria-busy>
			<HubSectionHeader title={title} />
			<HubSectionBody flush>
				<HubSectionRowsSkeleton media={media} />
			</HubSectionBody>
		</section>
	);
}
