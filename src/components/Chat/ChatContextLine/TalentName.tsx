"use client";

import { IconId } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Tooltip } from "antd";
import { useState } from "react";
import SpecialistPreviewModal from "@/components/modals/SpecialistPreviewModal";

/** A person in the chat's context, with their talent card a click away. */
export function TalentName({
	name,
	specialityId,
}: {
	name: string;
	specialityId?: string | null;
}) {
	const { t } = useTranslate();
	const [open, setOpen] = useState(false);
	const label = t("checkpoints.curator.talentCard", "Talent card");

	return (
		<Flex gap={8} align="center">
			{name}
			{specialityId && (
				<>
					<Tooltip title={label}>
						<Button
							size="small"
							aria-label={label}
							icon={<IconId size={16} stroke={1.6} />}
							onClick={() => setOpen(true)}
						/>
					</Tooltip>
					<SpecialistPreviewModal
						withOffer={false}
						specialistId={specialityId}
						open={open}
						onCancel={() => setOpen(false)}
					/>
				</>
			)}
		</Flex>
	);
}
