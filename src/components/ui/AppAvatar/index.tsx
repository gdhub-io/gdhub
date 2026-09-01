"use client";

import { Avatar, type AvatarProps } from "antd";
import { avatarImage } from "@/helpers/image";

/** antd's own default disc, used when the size comes from an `Avatar.Group`. */
const DEFAULT_AVATAR_SIZE = 32;

const NAMED_SIZES: Record<string, number> = {
	small: 24,
	default: DEFAULT_AVATAR_SIZE,
	large: 40,
};

function resolveSize(size: AvatarProps["size"]): number {
	if (typeof size === "number") return size;
	if (typeof size === "string") return NAMED_SIZES[size] ?? DEFAULT_AVATAR_SIZE;
	// Responsive `{ xs: 24, xl: 64 }` — ask for the largest breakpoint it can grow to.
	if (size && typeof size === "object") {
		const values = Object.values(size).filter(
			(v): v is number => typeof v === "number",
		);
		if (values.length) return Math.max(...values);
	}
	return DEFAULT_AVATAR_SIZE;
}

/**
 * antd `<Avatar>` that asks Sanity for a disc-sized crop instead of the whole
 * upload. Identical API — a non-Sanity or non-string `src` passes through.
 */
export function AppAvatar({ src, size, ...rest }: AvatarProps) {
	return (
		<Avatar
			{...rest}
			size={size}
			src={typeof src === "string" ? avatarImage(src, resolveSize(size)) : src}
		/>
	);
}
