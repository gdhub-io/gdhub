"use client";

import { IconInbox, IconSearch } from "@tabler/icons-react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Alert, Button, Input, message, Segmented, Skeleton } from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdviceRequestCard } from "@/components/advisor/AdviceRequestCard";
import { useChat } from "@/components/Chat/useChat";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PageMeta } from "@/lib/pagination";
import type {
	AdvisorRequest,
	RequestCounts,
	RequestFilter,
} from "@/repositories/advisor.requests";
import styles from "./style.module.scss";

/** The modal pulls in antd's Modal and the talent card; most visits never open it. */
const AdviceRequestModal = dynamic(
	() =>
		import("@/components/advisor/AdviceRequestModal").then(
			(module) => module.AdviceRequestModal,
		),
	{ ssr: false },
);

const SpecialistPreviewModal = dynamic(
	() => import("@/components/modals/SpecialistPreviewModal"),
	{ ssr: false },
);

type RequestsResponse = {
	data: AdvisorRequest[];
	meta: PageMeta;
	counts: RequestCounts;
	askedIn: string | null;
};

const FILTERS: { value: RequestFilter; key: string; label: string }[] = [
	{ value: "new", key: "advisor.requests.filter.new", label: "New" },
	{
		value: "inProgress",
		key: "advisor.requests.filter.inProgress",
		label: "In progress",
	},
	{
		value: "answered",
		key: "advisor.requests.filter.answered",
		label: "Answered",
	},
	{ value: "all", key: "advisor.requests.filter.all", label: "All" },
];

const PAGE_SIZE = 10;

/** How long the search box waits before it costs a request. */
const SEARCH_DEBOUNCE_MS = 300;

export function AdvisorRequestsClient() {
	const { t } = useTranslate();
	const { setSelectedRoomId, setSelectedRoomByAlias, setOpenChatModal } =
		useChat();

	const [filter, setFilter] = useState<RequestFilter>("new");
	const [search, setSearch] = useState("");
	const [debounced, setDebounced] = useState("");
	const [opened, setOpened] = useState<AdvisorRequest | null>(null);
	const [talentCardId, setTalentCardId] = useState<string | undefined>();

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(search), SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [search]);

	const {
		data,
		isLoading,
		isError,
		refetch,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useInfiniteQuery<RequestsResponse>({
		queryKey: ["advisor-requests", filter, debounced],
		initialPageParam: 1,
		queryFn: ({ pageParam }) =>
			axios
				.get<RequestsResponse>("/api/advisor/requests", {
					params: {
						filter,
						search: debounced || undefined,
						page: pageParam,
						limit: PAGE_SIZE,
					},
				})
				.then((res) => res.data),
		getNextPageParam: (last) => last.meta.nextPage,
	});

	const loaded = data?.pages.flatMap((page) => page.data) ?? [];
	const counts = data?.pages[0]?.counts;
	const askedIn = data?.pages[0]?.askedIn ?? null;

	const act = useMutation({
		mutationFn: ({ id, action }: { id: string; action: string }) =>
			axios.put(`/api/user/advice-request/${id}/${action}`).then((r) => r.data),
		onSuccess: () => {
			setOpened(null);
			refetch();
		},
		onError: () =>
			message.error(
				t("advisor.requests.error.action", "That did not go through."),
			),
	});

	const openChat = async (request: AdvisorRequest) => {
		// Rooms created through the registry carry no `advreq-*` alias — open by
		// the stored id, and keep the alias only as the legacy fallback.
		if (request.matrixRoomId) {
			setSelectedRoomId(request.matrixRoomId);
		} else {
			await setSelectedRoomByAlias(`advreq-${request.id}`);
		}

		setOpenChatModal(true);
		setOpened(null);
	};

	const accept = async (request: AdvisorRequest) => {
		const updated = await act.mutateAsync({ id: request.id, action: "accept" });
		await openChat({ ...request, matrixRoomId: updated?.matrixRoomId ?? null });
	};

	const options = FILTERS.map(({ value, key, label }) => {
		const count = counts?.[value];

		return {
			value,
			label: count ? `${t(key, label)} ${count}` : t(key, label),
		};
	});

	return (
		<div className="layout-background">
			<ProtectedPageHeader
				title={t("advisor.requests.title", "Advice requests")}
				subTitle={t(
					"advisor.requests.subtitle",
					"Questions teams sent you as an advisor.",
				)}
			/>

			<div className={styles.toolbar}>
				<Segmented
					value={filter}
					options={options}
					onChange={(value) => setFilter(value as RequestFilter)}
				/>
				<Input
					allowClear
					className={styles.search}
					prefix={<IconSearch size={14} stroke={2} />}
					placeholder={t(
						"advisor.requests.search",
						"Search by person or project",
					)}
					value={search}
					onChange={(event) => setSearch(event.target.value)}
				/>
			</div>

			{isError ? (
				<Alert
					type="error"
					showIcon
					message={t(
						"advisor.requests.error.load",
						"The inbox could not be loaded.",
					)}
					action={
						<Button size="small" onClick={() => refetch()}>
							{t("advisor.requests.error.retry", "Try again")}
						</Button>
					}
				/>
			) : isLoading ? (
				<div className={styles.list}>
					{Array.from({ length: 3 }, (_, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: placeholders carry no identity
						<div key={index} className={styles.skeleton}>
							<Skeleton active avatar paragraph={{ rows: 2 }} />
						</div>
					))}
				</div>
			) : loaded.length === 0 ? (
				<EmptyState
					icon={IconInbox}
					title={t("advisor.requests.empty.title", "No requests waiting")}
					description={t(
						"advisor.requests.empty.description",
						"When someone asks you a question, it lands here. Your card in Hub → Experts is what brings them.",
					)}
					action={
						<Link href="/hub/experts">
							<Button>
								{t("advisor.requests.empty.action", "View my expert card")}
							</Button>
						</Link>
					}
				/>
			) : (
				<>
					<div className={styles.list}>
						{loaded.map((request) => (
							<AdviceRequestCard
								key={request.id}
								request={request}
								askedIn={askedIn}
								busy={act.isPending}
								onShowDetails={setOpened}
								onDecline={(item) =>
									act.mutate({ id: item.id, action: "reject" })
								}
								onMarkDone={(item) =>
									act.mutate({ id: item.id, action: "complete" })
								}
								onOpenChat={openChat}
							/>
						))}
					</div>

					{hasNextPage && (
						<Button
							block
							type="text"
							className={styles.loadMore}
							loading={isFetchingNextPage}
							onClick={() => fetchNextPage()}
						>
							{t("advisor.requests.loadMore", "Load more")}
						</Button>
					)}
				</>
			)}

			<AdviceRequestModal
				request={opened}
				busy={act.isPending}
				onClose={() => setOpened(null)}
				onAccept={accept}
				onDecline={(item) => act.mutate({ id: item.id, action: "reject" })}
				onOpenChat={openChat}
				onViewTalentCard={setTalentCardId}
			/>

			<SpecialistPreviewModal
				open={!!talentCardId}
				specialistId={talentCardId}
				onCancel={() => setTalentCardId(undefined)}
			/>
		</div>
	);
}
