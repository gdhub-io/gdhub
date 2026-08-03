"use client";
import { IconFilter, IconSearch, IconShieldCheck } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import {
	Avatar,
	Badge,
	Button,
	Input,
	Popover,
	Row,
	Select,
	Space,
	Tag,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SortOrder } from "antd/es/table/interface";
import axios from "axios";
import dayjs from "dayjs";
import debounce from "lodash/debounce";
import { useEffect, useMemo, useState } from "react";
import { UserRolesModal } from "@/components/admin/UserRolesModal";
import ModernTable from "@/components/ModernTable";
import { AdminSpace } from "@/components/spaces/AdminSpace";
import { ROLE_META } from "@/config/permissions/role-meta";
import { SPACE_ROLES, type SpaceRole } from "@/config/permissions/roles";
import { SPACE_TYPES, type SpaceType } from "@/config/spaces";
import { permissionCatalog } from "@/services/access/role-catalog";
import styles from "./style.module.scss";

const { Title, Text } = Typography;

type MembershipSummary = { spaceType: string; role: string; count: number };

type AdminUserRow = {
	id: string;
	image: string | null;
	name: string;
	email: string | null;
	createdAt: string;
	lastModifiedAt: string;
	specializations: string[];
	skillCapital: {
		scTotal: number;
		leadershipCapital: number;
		executionCapital: number;
		mentorshipCapital: number;
	};
	memberships: MembershipSummary[];
};

type AdminUsersResponse = {
	data: AdminUserRow[];
	meta: {
		currentPage: number;
		pageCount?: number;
		totalCount?: number;
	};
};

type SortField =
	| "createdAt"
	| "name"
	| "scTotal"
	| "leadershipCapital"
	| "executionCapital"
	| "mentorshipCapital";

const isSortField = (value?: string): value is SortField =>
	[
		"createdAt",
		"name",
		"scTotal",
		"leadershipCapital",
		"executionCapital",
		"mentorshipCapital",
	].includes(value || "");

export default function UsersAdminPage() {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [sortField, setSortField] = useState<SortField | undefined>(
		"createdAt",
	);
	const [sortOrder, setSortOrder] = useState<SortOrder>("descend");
	const [editing, setEditing] = useState<AdminUserRow | null>(null);
	const [searchInput, setSearchInput] = useState("");
	const [search, setSearch] = useState("");
	const [spaceType, setSpaceType] = useState<SpaceType>();
	const [role, setRole] = useState<SpaceRole>();
	const [permission, setPermission] = useState<string>();

	const activeFilters = [spaceType, role, permission].filter(Boolean).length;

	const permissionOptions = useMemo(
		() =>
			SPACE_TYPES.map((type) => ({
				label: type,
				options: permissionCatalog(type).map((value) => ({
					value,
					label: value,
				})),
			})),
		[],
	);

	// Filtering narrows the result set, so the current page may no longer exist.
	const applySearch = useMemo(
		() =>
			debounce((value: string) => {
				setSearch(value.trim());
				setPage(1);
			}, 400),
		[],
	);

	useEffect(() => () => applySearch.cancel(), [applySearch]);

	const applyFilter = (change: () => void) => {
		change();
		setPage(1);
	};

	const resetFilters = () =>
		applyFilter(() => {
			setSpaceType(undefined);
			setRole(undefined);
			setPermission(undefined);
		});

	const { data: response, isFetching } = useQuery({
		queryKey: [
			"admin",
			"users",
			page,
			pageSize,
			sortField,
			sortOrder,
			search,
			spaceType,
			role,
			permission,
		],
		queryFn: () =>
			axios
				.get<AdminUsersResponse>("/api/admin/users", {
					params: {
						page,
						limit: pageSize,
						sortField,
						sortOrder: sortOrder || undefined,
						search: search || undefined,
						spaceType,
						role,
						permission,
					},
				})
				.then((r) => r.data),
		refetchOnWindowFocus: false,
	});

	const columns: ColumnsType<AdminUserRow> = useMemo(
		() => [
			{
				title: "Photo",
				dataIndex: "image",
				key: "image",
				width: 70,
				render: (value, record) => (
					<Avatar src={value || undefined}>
						{!value && record.name ? record.name[0] : null}
					</Avatar>
				),
			},
			{
				title: "Name",
				dataIndex: "name",
				key: "name" as SortField,
				sorter: true,
				sortOrder: sortField === "name" ? sortOrder : null,
				render: (value, record) => (
					<Space orientation="vertical" size={0}>
						<Text>{value}</Text>
						<Text type="secondary">{record.email || "—"}</Text>
					</Space>
				),
			},
			{
				title: "Roles",
				dataIndex: "memberships",
				key: "memberships",
				render: (memberships: MembershipSummary[]) =>
					memberships.length ? (
						<Space size={[4, 4]} wrap>
							{memberships.map((membership) => (
								<Tag key={`${membership.spaceType}:${membership.role}`}>
									{membership.spaceType} · {membership.role.toLowerCase()}
									{membership.count > 1 ? ` ×${membership.count}` : ""}
								</Tag>
							))}
						</Space>
					) : (
						<Text type="secondary">—</Text>
					),
			},
			{
				title: "Specializations",
				dataIndex: "specializations",
				key: "specializations",
				render: (specializations: string[]) =>
					specializations.length ? (
						<Space size={[4, 4]} wrap>
							{specializations.map((specialization) => (
								<Tag key={specialization}>{specialization}</Tag>
							))}
						</Space>
					) : (
						<Text type="secondary">—</Text>
					),
			},
			{
				title: "Skill Capital",
				dataIndex: ["skillCapital", "scTotal"],
				key: "scTotal" as SortField,
				width: 180,
				sorter: true,
				sortOrder: sortField === "scTotal" ? sortOrder : null,
				render: (_, record) => (
					<Space orientation="vertical" size={0}>
						<Text>{record.skillCapital.scTotal}</Text>
						<Text type="secondary" className={styles.capitalBreakdown}>
							{`L ${record.skillCapital.leadershipCapital} · E ${record.skillCapital.executionCapital} · M ${record.skillCapital.mentorshipCapital}`}
						</Text>
					</Space>
				),
			},
			{
				title: "Created",
				key: "createdAt" as SortField,
				width: 120,
				align: "right",
				sorter: true,
				sortOrder: sortField === "createdAt" ? sortOrder : null,
				render: (_, record) => (
					<Popover content={dayjs(record.createdAt).format("LLL")}>
						<Text>{dayjs(record.createdAt).fromNow()}</Text>
					</Popover>
				),
			},
			{
				title: "Last Modified",
				key: "lastModifiedAt",
				width: 120,
				align: "right",
				render: (_, record) => (
					<Popover content={dayjs(record.lastModifiedAt).format("LLL")}>
						<Text type="secondary">
							{dayjs(record.lastModifiedAt).fromNow()}
						</Text>
					</Popover>
				),
			},
			{
				title: "",
				key: "actions",
				width: 100,
				align: "right",
				render: (_, record) => (
					<Button
						size="small"
						icon={<IconShieldCheck size={14} />}
						onClick={() => setEditing(record)}
					>
						Roles
					</Button>
				),
			},
		],
		[sortField, sortOrder],
	);

	return (
		<AdminSpace>
			<div className={styles.main}>
				<Row justify="space-between" align="middle" gutter={[16, 16]} wrap>
					<Title level={2} className={styles.pageTitle}>
						Users
					</Title>
					<Space size={12} wrap>
						<Input
							allowClear
							variant="filled"
							prefix={<IconSearch size={16} />}
							placeholder="Search by name, email or specialization"
							className={styles.searchInput}
							value={searchInput}
							onChange={(event) => {
								setSearchInput(event.target.value);
								applySearch(event.target.value);
							}}
						/>
						<Popover
							trigger="click"
							placement="bottomRight"
							title={
								<div className={styles.filtersHeader}>
									<Text strong>Filters</Text>
									<Button
										type="link"
										size="small"
										disabled={!activeFilters}
										onClick={resetFilters}
									>
										Reset
									</Button>
								</div>
							}
							content={
								<div className={styles.filtersPanel}>
									<div className={styles.filtersField}>
										<Text type="secondary">Space type</Text>
										<Select
											allowClear
											variant="filled"
											placeholder="All space types"
											value={spaceType}
											options={SPACE_TYPES.map((type) => ({
												value: type,
												label: type,
											}))}
											onChange={(value) =>
												applyFilter(() => setSpaceType(value))
											}
										/>
									</div>
									<div className={styles.filtersField}>
										<Text type="secondary">Role</Text>
										<Select
											allowClear
											variant="filled"
											placeholder="Any role"
											value={role}
											options={SPACE_ROLES.map((value) => ({
												value,
												label: ROLE_META[value]?.title || value,
											}))}
											onChange={(value) => applyFilter(() => setRole(value))}
										/>
									</div>
									<div className={styles.filtersField}>
										<Text type="secondary">Permission</Text>
										<Select
											allowClear
											showSearch
											variant="filled"
											placeholder="Any permission"
											value={permission}
											options={permissionOptions}
											onChange={(value) =>
												applyFilter(() => setPermission(value))
											}
										/>
									</div>
								</div>
							}
						>
							<Button icon={<IconFilter size={16} />}>
								Filters
								{activeFilters ? (
									<Badge count={activeFilters} size="small" color="#222222" />
								) : null}
							</Button>
						</Popover>
					</Space>
				</Row>
				<ModernTable
					loading={isFetching}
					rowKey="id"
					dataSource={response?.data || []}
					columns={columns}
					onChange={(pagination, _filters, sorter) => {
						const sortState = Array.isArray(sorter) ? sorter[0] : sorter;
						const nextOrder = sortState?.order || null;
						const nextColumnKey =
							typeof sortState?.columnKey === "string"
								? sortState.columnKey
								: undefined;

						if (!nextOrder || !isSortField(nextColumnKey)) {
							setSortField(undefined);
							setSortOrder(null);
						} else {
							setSortField(nextColumnKey);
							setSortOrder(nextOrder);
						}

						setPage(pagination.current || 1);
					}}
					pagination={{
						current: page,
						pageSize,
						total: response?.meta.totalCount || 0,
						showSizeChanger: true,
						pageSizeOptions: [10, 20, 50, 100],
						onChange: (nextPage, nextPageSize) => {
							setPage(nextPage);
							setPageSize(nextPageSize);
						},
						onShowSizeChange: (nextPage, nextPageSize) => {
							setPage(nextPage);
							setPageSize(nextPageSize);
						},
					}}
				/>
			</div>

			{/* Keyed by user: a fresh modal per person, so unsaved edits never leak. */}
			<UserRolesModal
				key={editing?.id}
				user={editing}
				onClose={() => setEditing(null)}
			/>
		</AdminSpace>
	);
}
