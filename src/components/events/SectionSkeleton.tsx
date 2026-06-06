import { Skeleton } from "antd";
import type React from "react";

interface SectionSkeletonProps {
	title: string;
	description?: string;
}

const SectionSkeleton: React.FC<SectionSkeletonProps> = ({
	title,
	description,
}) => (
	<section style={{ marginBottom: 32 }}>
		{description && (
			<Skeleton.Input
				style={{ width: 400, height: 20, marginBottom: 20 }}
				active
			/>
		)}
		<div style={{ display: "flex", gap: 24 }}>
			{[1].map((i) => (
				<div
					key={i}
					style={{
						width: 320,
						height: 370,
						borderRadius: 20,
						background: "#fff",
						display: "flex",
						flexDirection: "column",
						padding: 0,
						position: "relative",
					}}
				>
					{/* Image imitation */}
					<Skeleton.Image
						style={{
							width: "100%",
							height: 200,
							borderTopLeftRadius: 20,
							borderTopRightRadius: 20,
						}}
						active
					/>
					{/* Date imitation */}
					<div style={{ position: "absolute", top: 12, right: 12 }}>
						<Skeleton.Button
							style={{ width: 48, height: 24, borderRadius: 12 }}
							active
							size="small"
						/>
					</div>
					{/* Icon and type imitation */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 8,
							marginTop: 16,
							marginLeft: 16,
						}}
					>
						<Skeleton.Avatar shape="circle" size={24} active />
						<Skeleton.Input
							style={{ width: 60, height: 20 }}
							active
							size="small"
						/>
					</div>
					{/* Title imitation */}
					<div style={{ marginTop: 12, marginLeft: 16, marginRight: 16 }}>
						<Skeleton.Input
							style={{ width: "90%", height: 24 }}
							active
							size="medium"
						/>
					</div>
					{/* Subtitle imitation */}
					<div style={{ marginTop: 8, marginLeft: 16, marginRight: 16 }}>
						<Skeleton.Input
							style={{ width: "70%", height: 18 }}
							active
							size="small"
						/>
					</div>
				</div>
			))}
		</div>
	</section>
);

export default SectionSkeleton;
