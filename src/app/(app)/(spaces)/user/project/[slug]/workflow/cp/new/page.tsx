import { redirect } from "next/navigation";
import {
	checkoutHref,
	searchParam,
} from "@/components/checkpoints/entry/hrefs";

type Props = {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ step?: string | string[] }>;
};

/** The wizard moved to the light shell of the hub; old links and bookmarks follow it. */
export default async function NewCheckpointPage({
	params,
	searchParams,
}: Props) {
	const { slug } = await params;
	const { step } = await searchParams;

	redirect(checkoutHref(slug, searchParam(step)));
}
