"use client";

import {
	IconBuilding,
	IconMail,
	IconPhone,
	IconUserCircle,
} from "@tabler/icons-react";
import { Card, Flex, Typography } from "antd";
import dayjs from "dayjs";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import {
	LEGAL_DETAILS,
	LEGAL_ENTITIES,
	type LegalEntity,
	type LegalEntityKey,
} from "@/config/legal/entities";
import styles from "./style.module.scss";

const { Title } = Typography;

type EntityIcon = "user" | "building";
type ContactType = "email" | "phone";

type Entity = {
	name: string;
	icon: EntityIcon;
	fields: { label: string; value: string }[];
	contacts: { type: ContactType; value: string }[];
};

const toEntity = (key: LegalEntityKey, icon: EntityIcon): Entity => {
	const e: LegalEntity = LEGAL_ENTITIES[key];
	return {
		name: e.name,
		icon,
		fields: [
			{
				label: "Registration date",
				value: dayjs(e.registeredAt).format("DD/MM/YYYY"),
			},
			{ label: "Legal entity code", value: e.code },
			{ label: "Administrator", value: e.registry },
			{ label: "Registered address", value: e.address },
			...(e.certificate
				? [{ label: "Certificate", value: e.certificate }]
				: []),
		],
		contacts: [
			{ type: "email", value: e.email },
			{ type: "phone", value: e.phone },
		],
	};
};

const founder = toEntity(LEGAL_DETAILS.founder, "user");
const offices = LEGAL_DETAILS.offices.map((o) => ({
	country: o.country,
	entity: toEntity(o.entity, "building"),
}));

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
				subTitle="Official legal information about Game Developers Hub and its representative offices"
			/>
			<div className="layout-background">
				<Flex vertical gap={32}>
					<section>
						<Title level={2} className={styles.sectionTitle}>
							Founder
						</Title>
						<EntityCard entity={founder} />
					</section>
					<section>
						<Title level={2} className={styles.sectionTitle}>
							Representative offices
						</Title>
						<Flex vertical gap={20}>
							{offices.map(({ country, entity }) => (
								<div key={country}>
									<div className={styles.countryRow}>
										<span className={styles.countryName}>{country}</span>
									</div>
									<EntityCard entity={entity} />
								</div>
							))}
						</Flex>
					</section>
				</Flex>
			</div>
		</>
	);
}
