"use client";

import { MdOutlineAlternateEmail } from "@react-icons/all-files/md/MdOutlineAlternateEmail";
import { Card, Flex, Typography } from "antd";
import { PublicLayout } from "@/layouts/PublicLayout";

const { Text } = Typography;

export default function LegalDetailsPage() {
	return (
		<PublicLayout title="Legal Details">
			<Card>
				<Flex vertical gap={16}>
					<Text strong>Individual Entrepreneur DZMITRY DRYNAU</Text>
					<Text>Registration date: 27/06/2023</Text>
					<Text>
						Administrator of the registration of legal entities: LEPL National
						Agency of Public Registry.
					</Text>
					<Text>Legal entity code: 306422564</Text>
					<Text>
						Registered office address: Georgia, Tbilisi, Samgori District,
						Police Street I Dead End, N5
					</Text>
					<Text>
						Certificate of state registration of a legal entity (2023 г.)
					</Text>
					<Text>Phone: +995 599157334</Text>
					<Text style={{ display: "flex", alignItems: "center", gap: 0 }}>
						Email: office
						<MdOutlineAlternateEmail color="rgba(12, 2, 2, 0.5)" />
						gdhub.io
					</Text>
				</Flex>
			</Card>
		</PublicLayout>
	);
}
