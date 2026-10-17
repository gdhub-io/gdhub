"use client";

import {
	IconBuilding,
	IconMail,
	IconPhone,
	IconUserCircle,
} from "@tabler/icons-react";
import { Card } from "antd";
import dayjs from "dayjs";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import { hubLegalEntity } from "@/config/legal/entities";
import styles from "./style.module.scss";

type EntityIcon = "user" | "building";
type ContactType = "email" | "phone";

type Entity = {
	name: string;
	icon: EntityIcon;
	fields: { label: string; value: string }[];
	contacts: { type: ContactType; value: string }[];
};

const legal = hubLegalEntity();

const operator: Entity = {
	name: legal.name,
	icon: "building",
	fields: [
		{ label: "Legal entity code", value: legal.code },
		{ label: "Registered address", value: legal.address },
		{
			label: "Registration date",
			value: dayjs(legal.registeredAt).format("DD/MM/YYYY"),
		},
		{ label: "Registry", value: legal.registry },
	],
	contacts: [
		{ type: "email", value: legal.email },
		{ type: "phone", value: legal.phone },
	],
};

const AvatarIcon = ({ icon }: { icon: EntityIcon }) => {
	if (icon === "user") return <IconUserCircle size={20} stroke={1.75} />;
	return <IconBuilding size={20} stroke={1.75} />;
};

const ContactIcon = ({ type }: { type: ContactType }) => {
	if (type === "email") return <IconMail size={14} stroke={1.75} />;
	return <IconPhone size={14} stroke={1.75} />;
};

const EntityCard = ({ entity }: { entity: Entity }) => (
	<Card className={styles.card} variant="borderless">
		<div className={styles.header}>
			<div className={styles.avatar}>
				<AvatarIcon icon={entity.icon} />
			</div>
			<div className={styles.titleBlock}>
				<strong className={styles.entityName}>{entity.name}</strong>
			</div>
		</div>

		<hr className={styles.divider} />

		<dl className={styles.fields}>
			{entity.fields.map((field) => (
				<div className={styles.fieldRow} key={field.label}>
					<dt className={styles.fieldLabel}>{field.label}</dt>
					<dd className={styles.fieldValue}>{field.value}</dd>
				</div>
			))}
		</dl>

		{entity.contacts.length > 0 && (
			<>
				<hr className={styles.divider} />
				<div className={styles.contacts}>
					{entity.contacts.map((contact) => (
						<span
							key={`${contact.type}-${contact.value}`}
							className={styles.chip}
						>
							<ContactIcon type={contact.type} />
							<span>{contact.value}</span>
						</span>
					))}
				</div>
			</>
		)}
	</Card>
);

export function LegalDetailsClient() {
	return (
		<>
			<PublicPageHeader
				title="Legal Details"
				subTitle="The legal entity that operates gdhub.io"
			/>
			<div className="layout-background">
				<EntityCard entity={operator} />
			</div>
		</>
	);
}
