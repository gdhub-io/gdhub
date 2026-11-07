import { Skeleton } from "antd";
import {
	getHubSectionShellClass,
	HubSectionBody,
	HubSectionHeader,
} from "./HubSection";
import rowStyles from "./sidebarRow.module.scss";

type HubSectionRowsSkeletonProps = {
	rows?: number;
	/** `circle` for avatar rows (members, people); `square` for tiles and covers. */
	media?: "square" | "circle";
};

/** Placeholder rows with the exact geometry of `HubSectionRow`. */
export function HubSectionRowsSkeleton({
	rows = 3,
	media = "square",
}: HubSectionRowsSkeletonProps) {
	return Array.from({ length: rows }, (_, index) => (
		<div
			// biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
			key={index}
			className={rowStyles.row}
			aria-hidden
		>
			<div className={rowStyles.left}>
				<Skeleton.Avatar active shape={media} size={32} />
				<div className={rowStyles.text}>
					<Skeleton.Input
						active
						size="small"
						style={{ width: 140, minWidth: 0, height: 14 }}
					/>
					<Skeleton.Input
						active
						size="small"
						style={{ width: 90, minWidth: 0, height: 11, marginTop: 4 }}
					/>
				</div>
			</div>
		</div>
	));
}

type HubSidebarSkeletonProps = HubSectionRowsSkeletonProps & {
	/** Already-translated. Without it the title is a bar too. */
	title?: string;
};

/** A hub sidebar card while its data loads: the real header, rows as placeholders. */
export function HubSidebarSkeleton({
	title,
	rows,
	media,
}: HubSidebarSkeletonProps) {
	return (
		<section className={getHubSectionShellClass("sidebar")} aria-busy>
			<HubSectionHeader
				title={
					title ?? (
						<Skeleton.Input
							active
							size="small"
							style={{ width: 120, minWidth: 0 }}
						/>
					)
				}
			/>
			<HubSectionBody flush>
				<HubSectionRowsSkeleton rows={rows} media={media} />
			</HubSectionBody>
		</section>
	);
}
