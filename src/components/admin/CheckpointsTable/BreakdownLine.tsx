"use client";

import own from "./style.module.scss";

export function BreakdownLine({
	label,
	value,
	part,
	head,
}: {
	label: string;
	value: string;
	part?: boolean;
	head?: boolean;
}) {
	return (
		<div
			className={[own.line, part && own.part, head && own.head]
				.filter(Boolean)
				.join(" ")}
		>
			<span>{label}</span>
			<span className={own.value}>{value}</span>
		</div>
	);
}
