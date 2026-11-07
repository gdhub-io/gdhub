import { Skeleton } from "antd";

/** A page-sized placeholder while a lazily loaded page component downloads. */
export function PageLoading() {
	return <Skeleton active title paragraph={{ rows: 6 }} />;
}
