import Link from "next/link";
import type React from "react";

type DevlogPostLinkProps = {
	post: { id: string; isSystem?: boolean | null };
	style?: React.CSSProperties;
	children: React.ReactNode;
};

/**
 * Wraps a devlog card in a link to its public page — except for generated
 * (system) posts, which have no public page: `/api/devlog/[id]` 404s for them,
 * so linking would produce dead URLs and analytics noise.
 */
export const DevlogPostLink = ({
	post,
	style,
	children,
}: DevlogPostLinkProps) => {
	if (post.isSystem) return <>{children}</>;

	return (
		<Link href={`/devlog/${post.id}`} style={style}>
			{children}
		</Link>
	);
};
