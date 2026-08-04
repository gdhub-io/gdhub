import type { Project, ProjectStatus } from "@gdhub-io/gdhub-prisma";
import { IconExternalLink, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { T } from "@tolgee/react";
import { Badge, Button, Grid, List, Popconfirm, Space, Typography } from "antd";
import axios from "axios";
import Link from "next/link";
import { useState } from "react";

type ProjectsSectionArgs = {
	seasonId: string;
	status: ProjectStatus;
};

const { Title } = Typography;

export const UserSeasonProjectsList = ({
	seasonId,
	status,
}: ProjectsSectionArgs) => {
	const screens = Grid.useBreakpoint();
	const [showUserProjectModal, setShowUserProjectModal] = useState(false);
	const [selectedProject, setSelectedProject] = useState<string>();

	const {
		data: projects,
		isFetching: isLoadingUserSeasonProjects,
		refetch: refreshUserProjects,
	} = useQuery({
		queryKey: ["user-season-projects", seasonId],
		queryFn: () =>
			axios.get<Project[]>("/api/user/projects", {
				params: { seasonId, status },
			}),
		refetchInterval: Infinity,
		refetchOnWindowFocus: false,
	});

	const { mutateAsync: deleteProject } = useMutation({
		mutationFn: ({ id }: { id: string }) =>
			axios.delete<Project>("/api/user/project", {
				params: { id },
			}),
	});

	const handleEditUserProject = (userProjectId: string) => {
		setSelectedProject(userProjectId);
		setShowUserProjectModal(true);
	};

	const handleCloseModal = () => {
		setSelectedProject(undefined);
		setShowUserProjectModal(false);
	};

	const handleSaveUserProject = async () => {
		handleCloseModal();
		refreshUserProjects();
	};

	const handleDeleteIdea = async (projectId: string) => {
		await deleteProject({ id: projectId });
		await refreshUserProjects();
	};

	if (!projects?.data.length) {
		return (
			<p>
				<T keyName="no-user-projects" />
			</p>
		);
	}

	return (
		<Space style={{ width: "100%", marginTop: 32 }} orientation="vertical">
			<Title level={5}>
				<T keyName="userProjectList" />
			</Title>
			<List
				itemLayout={screens.xs ? "vertical" : "horizontal"}
				loading={isLoadingUserSeasonProjects}
				size="small"
				bordered
				dataSource={projects?.data}
				renderItem={(userProject) => (
					<List.Item>
						<List.Item.Meta
							title={
								<>
									{userProject.name}
									<div style={{ opacity: 0.5, fontSize: "11px" }}>
										{userProject.genre}
									</div>
								</>
							}
							description={
								<>
									<Typography.Paragraph ellipsis>
										{userProject.description}
									</Typography.Paragraph>
									{!screens.md && !!userProject.conceptLink && (
										<Link
											href={userProject.conceptLink}
											target="_blank"
											style={{ marginRight: "40px" }}
										>
											<T keyName="concept-link" />
										</Link>
									)}
								</>
							}
						/>
						<Space>
							{screens.md && !!userProject.conceptLink && (
								<Badge
									count={
										<IconExternalLink
											size={12}
											color="var(--gd-color-text-tertiary)"
										/>
									}
									offset={[-32, 4]}
								>
									<Link
										href={userProject.conceptLink}
										target="_blank"
										style={{ marginRight: "40px" }}
									>
										<T keyName="concept-link" />
									</Link>
								</Badge>
							)}
							<Button onClick={() => handleEditUserProject(userProject.id)}>
								<T keyName="change" />
							</Button>
							<Popconfirm
								title={<T keyName="are-you-sure-you-want-to-delete-it" />}
								okText={<T keyName="yes" />}
								cancelText={<T keyName="no" />}
								onConfirm={() => handleDeleteIdea(userProject.id)}
							>
								<Button type="text" danger icon={<IconTrash />} />
							</Popconfirm>
						</Space>
					</List.Item>
				)}
			/>
		</Space>
	);
};
