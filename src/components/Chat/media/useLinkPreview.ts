import { useQuery } from "@tanstack/react-query";
import { useChatMediaLoaders } from "./loaders";

/** Synapse's preview of a link, once per URL per session; null when it has none. */
export function useLinkPreview(url: string | null) {
	const loaders = useChatMediaLoaders();
	return useQuery({
		queryKey: ["chat", "link-preview", url],
		queryFn: () => (loaders && url ? loaders.loadPreview(url) : null),
		enabled: !!loaders && !!url,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: 60 * 60_000,
		retry: false,
	}).data;
}
