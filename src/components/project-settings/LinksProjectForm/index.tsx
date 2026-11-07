import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Checkbox,
	Flex,
	Form,
	Grid,
	Input,
	List,
	message,
	Select,
	Space,
	Spin,
	Tooltip,
	Typography,
} from "antd";
import axios from "axios";
import { useCallback, useContext, useEffect, useState } from "react";
import { FormSkeleton } from "@/components/ui/FormSkeleton";
import { ProjectContext } from "@/contexts/ProjectContext";
import { platformOptions } from "@/helpers/react-content";
import type { LinkType, ProjectLink } from "@/types/project";

const { Text } = Typography;

type LinksProjectFormArgs = {
	projectSlug: string;
};

const LinksProjectForm = ({ projectSlug }: LinksProjectFormArgs) => {
	const [form] = Form.useForm();
	const screens = Grid.useBreakpoint();
	const { t } = useTranslate();
	const ctx = useContext(ProjectContext);
	const [links, setLinks] = useState<ProjectLink[]>([]);
	const isProjectArchived =
		!ctx?.contextProject || !!ctx.contextProject.isProjectArchived;

	const { data: projectLinks, isPending: isPendingLinks } = useQuery({
		queryKey: ["project-links", ctx?.contextProject?.id],
		enabled: !!ctx?.contextProject?.id,
		refetchOnWindowFocus: false,
		queryFn: () => {
			return axios
				.get<ProjectLink[]>(`/api/user/project/links`, {
					params: { id: ctx?.contextProject?.id },
				})
				.then((res) => {
					return res.data;
				});
		},
	});

	useEffect(() => {
		if (projectLinks && Array.isArray(projectLinks)) {
			// Transform the data to match the expected format
			const transformedLinks = projectLinks.map((link: any) => ({
				platform: link.platform || "",
				link: link.link || "",
				isPrimary: link.isPrimary || false,
			}));
			setLinks(transformedLinks);

			// Set form values
			const formValues: any = {};
			transformedLinks.forEach((link, index) => {
				formValues[`platform[${index}]`] = link.platform;
				formValues[`link[${index}]`] = link.link;
			});
			form.setFieldsValue(formValues);
		}
	}, [projectLinks, form]);

	const { mutateAsync: saveLinks, isPending: isSavingLinks } = useMutation({
		mutationFn: (links: ProjectLink[]) =>
			axios
				.put(`/api/user/project/link`, { id: ctx?.contextProject?.id, links })
				.then((res) => res.data),
	});

	const getPlatformIcon = (type: LinkType) => {
		const option = platformOptions.find((opt) => opt.value === type);
		return option?.icon;
	};

	const getAvailablePlatformOptions = (currentIndex: number) => {
		const usedPlatforms = links
			.filter((_, i) => i !== currentIndex)
			.map((link) => link.platform as string);

		return platformOptions.filter(
			(option) => !usedPlatforms.includes(option.value),
		);
	};

	const addLink = () => {
		if (isProjectArchived) return;

		if (links.length >= 3) {
			message.warning(t("project.links.maxLinks", "Maximum 3 links allowed"));
			return;
		}

		const newLink: ProjectLink = {
			platform: "" as LinkType,
			link: "",
			isPrimary: links.length === 0,
		};

		setLinks([...links, newLink]);
	};

	const removeLink = (index: number) => {
		if (isProjectArchived) return;

		const updatedLinks = links.filter((_, i) => i !== index);

		// If we removed the primary link, make the first remaining link primary
		if (
			updatedLinks.length > 0 &&
			!updatedLinks.some((link) => link.isPrimary)
		) {
			updatedLinks[0].isPrimary = true;
		}

		setLinks(updatedLinks);
	};

	const updateLink = (index: number, field: keyof ProjectLink, value: any) => {
		if (isProjectArchived) return;

		const updatedLinks = links.map((link, i) => {
			if (i === index) {
				// If setting this link as primary, unset all others
				if (field === "isPrimary" && value === true) {
					return { ...link, [field]: value };
				}
				return { ...link, [field]: value };
			}
			// If setting a link as primary, unset all others
			if (field === "isPrimary" && value === true) {
				return { ...link, isPrimary: false };
			}
			return link;
		});

		setLinks(updatedLinks);
	};

	const handleForm = async () => {
		if (isProjectArchived) return;

		try {
			// Filter out empty links
			const validLinks = links.filter((link) => link.platform && link.link);

			// Validate URL format for non-empty links
			const invalidUrls = validLinks.filter((link) => {
				try {
					new URL(link.link);
					return false;
				} catch {
					return true;
				}
			});

			if (invalidUrls.length > 0) {
				message.error(
					t(
						"project.links.invalidUrls",
						"Please enter valid URLs for all links",
					),
				);
				return;
			}

			// Save the links
			const savedLinks = await saveLinks(validLinks);

			// Update local state with saved data
			setLinks(savedLinks);

			message.success(t("project.links.saved", "Links saved successfully"));
		} catch (error: any) {
			message.error(
				error.message || t("project.links.saveError", "Failed to save links"),
			);
		}
	};

	const renderSelectPlatform = useCallback(
		(link: ProjectLink, idx: number) => {
			return (
				<Form.Item
					key={`platform-select-${idx}`}
					name={`platform[${idx}]`}
					style={{ marginBottom: 0, flex: "0 0 180px" }}
					rules={[
						{
							required: true,
							message: t(
								"project.links.platformRequired",
								"Platform is required",
							),
						},
					]}
				>
					<Select
						value={link.platform || undefined}
						disabled={isProjectArchived}
						labelRender={(option) => (
							<div
								style={{
									width: "60px",
									display: "flex",
									alignItems: "center",
									gap: 8,
								}}
							>
								{getPlatformIcon(option.value as LinkType)}
							</div>
						)}
						optionRender={(option) => (
							<Flex align="center" gap={8}>
								{getPlatformIcon(option.value as LinkType)}
								{option.label}
							</Flex>
						)}
						popupMatchSelectWidth={200}
						style={
							screens.xs
								? { width: "80px", margin: "0px -11px" }
								: { width: "100%", margin: "0px -11px" }
						}
						onChange={(value) => updateLink(idx, "platform", value)}
						placeholder={t("project.links.selectPlatform", "Select")}
						options={getAvailablePlatformOptions(idx)}
					/>
				</Form.Item>
			);
		},
		[links, getAvailablePlatformOptions, screens.xs, t, isProjectArchived],
	);

	if (isPendingLinks) return <FormSkeleton fields={3} />;

	return (
		<Spin spinning={isSavingLinks}>
			<Form
				form={form}
				layout="vertical"
				variant="filled"
				name="project-links-form"
				autoComplete="off"
				requiredMark="optional"
				disabled={isProjectArchived}
			>
				<Flex vertical gap={16}>
					<Flex vertical gap={16} style={{ width: "100%" }}>
						<Text type="secondary">
							{t(
								"project.links.description",
								"Add links to your project on various platforms. The primary link will be displayed prominently on your project page.",
							)}
						</Text>

						<List
							dataSource={links}
							bordered={false}
							locale={{
								emptyText: (
									<Space orientation="vertical">
										<Text type="secondary">
											{t(
												"project.links.noLinks",
												'No links added yet. Click "Add Link" to add first one.',
											)}
										</Text>
									</Space>
								),
							}}
							renderItem={(link, index) => (
								<List.Item
									key={`${link.platform}-${index}`}
									style={{ justifyContent: "flex-end" }}
									actions={[
										<Form.Item
											key={`primary-${index}`}
											valuePropName="checked"
											style={{ marginBottom: 0, flex: "0 0 auto" }}
										>
											<Checkbox
												checked={link.isPrimary}
												disabled={isProjectArchived}
												onChange={(e) =>
													updateLink(index, "isPrimary", e.target.checked)
												}
											>
												<Text type="secondary">
													{t("project.links.primary", "Primary")}
												</Text>
											</Checkbox>
										</Form.Item>,

										<Tooltip
											key="remove"
											title={t("project.links.remove", "Remove link")}
										>
											<Button
												type="text"
												danger
												size="small"
												icon={<IconTrash size={16} />}
												disabled={isProjectArchived}
												style={{ padding: 0 }}
												onClick={() => removeLink(index)}
											/>
										</Tooltip>,
									]}
								>
									<Flex
										gap={12}
										wrap={screens.xs ? "wrap" : "nowrap"}
										align={screens.xs ? "flex-start" : "center"}
										style={{ width: "100%" }}
									>
										<Form.Item
											style={{ marginBottom: 0, flex: "1 1 0" }}
											key={`link-${index}`}
											name={`link[${index}]`}
											rules={[
												{
													required: true,
													message: t(
														"project.links.urlRequired",
														"URL is required",
													),
												},
												{
													type: "url",
													message: t(
														"project.links.urlInvalid",
														"Please enter a valid URL",
													),
												},
											]}
										>
											<Input
												value={link.link}
												addonBefore={renderSelectPlatform(link, index)}
												onChange={(e) =>
													updateLink(index, "link", e.target.value)
												}
												disabled={isProjectArchived}
												placeholder={t(
													"project.links.urlPlaceholder",
													"https://",
												)}
												style={{ width: "100%" }}
											/>
										</Form.Item>
									</Flex>
								</List.Item>
							)}
						/>
					</Flex>

					<Flex gap={12} justify="space-between" align="center">
						<Button
							type="primary"
							onClick={handleForm}
							loading={isSavingLinks}
							disabled={isProjectArchived}
						>
							{t("project.links.save", "Save Links")}
						</Button>

						{links.length < 3 && (
							<Button
								type="dashed"
								onClick={addLink}
								icon={<IconPlus />}
								disabled={isProjectArchived}
							>
								{t("project.links.addLink", "Add Link")}
							</Button>
						)}
					</Flex>
				</Flex>
			</Form>
		</Spin>
	);
};

export default LinksProjectForm;
