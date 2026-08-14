import { Avatar, Space, Typography } from "antd";
import { toInitials } from "@/components/person-card";
import type { AuditActorRef } from "@/types/audit";

const { Text } = Typography;

export type AuditPersonProps = {
	person: AuditActorRef | null;
	/** Shown under the name — the `source` column for an actor, nothing for a subject. */
	caption?: string | null;
};

/**
 * Who did it, or "System" when the write carried no actor.
 *
 * Shared by the table and the detail modal so the fallback chain can't diverge
 * between them.
 */
export function AuditPerson({ person, caption }: AuditPersonProps) {
	const name = person?.name ?? person?.email ?? person?.id;

	return (
		<Space size={10}>
			<Avatar size={24} src={person?.image || undefined}>
				{person ? toInitials(name) : "S"}
			</Avatar>
			<Space orientation="vertical" size={0}>
				{person ? <Text>{name}</Text> : <Text type="secondary">System</Text>}
				{caption ? <Text type="secondary">{caption}</Text> : null}
			</Space>
		</Space>
	);
}
