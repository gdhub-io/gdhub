"use client";

import {
	IconBuilding,
	IconMail,
	IconPhone,
	IconUserCircle,
} from "@tabler/icons-react";
import { Card, Flex, Typography } from "antd";
import { useEffect, useState } from "react";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import styles from "./style.module.scss";

const { Title } = Typography;

type EntityIcon = "user" | "building";
type ContactType = "email" | "phone";

type FieldRow = { label: string; value: string };
type Contact = { type: ContactType; value: string };

type Entity = {
	name: string;
	icon: EntityIcon;
	fields: FieldRow[];
	contacts: Contact[];
};

type Office = {
	country: string;
	flag?: string;
	entity: Entity;
};

const founder: Entity = {
	name: "Individual Entrepreneur DZMITRY DRYNAU",
	icon: "user",
	fields: [
		{ label: "Registration date", value: "27/06/2023" },
		{ label: "Legal entity code", value: "306422564" },
		{
			label: "Administrator",
			value: "LEPL National Agency of Public Registry",
		},
		{
			label: "Registered address",
			value: "Georgia, Tbilisi, Samgori District, Police Street I Dead End, N5",
		},
		{
			label: "Certificate",
			value: "Certificate of state registration of a legal entity (2023)",
		},
	],
	contacts: [
		{ type: "email", value: "office@gdhub.io" },
		{ type: "phone", value: "+995 599 157 334" },
	],
};

const representativeOffices: Office[] = [
	{
		country: "Lithuania",
		entity: {
			name: "VšĮ Žaidimų Kūrėjų Hubas",
			icon: "building",
			fields: [
				{ label: "Registration date", value: "11/07/2025" },
				{ label: "Legal entity code", value: "307277444" },
				{
					label: "Registered address",
					value: "Vilnius, Giedraičių g. 39-R53, LT-09302",
				},
				{
					label: "Administrator",
					value: "Juridinių asmenų registras",
				},
			],
			contacts: [
				{ type: "email", value: "office@gdhub.io" },
				{ type: "phone", value: "+370 67253194" },
			],
		},
	},
];

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
							{representativeOffices.map(({ country, flag, entity }) => (
								<div key={country}>
									<div className={styles.countryRow}>
										{!!flag && (
											<span className={styles.countryFlag} aria-hidden>
												{flag}
											</span>
										)}
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
