import { MdOutlineAlternateEmail } from "@react-icons/all-files/md/MdOutlineAlternateEmail";
import { Card, Flex, Typography } from "antd";
import { PublicLayout } from "@/layouts/PublicLayout";
import type { NextPageWithLayout } from "@/pages/_app";

const { Text } = Typography;

const LegalDetailsPage: NextPageWithLayout = () => {
	return (
		<PublicLayout title="Legal Details">
			<Card>
				<Flex vertical gap={16}>
					<Text strong>VšĮ Žaidimų Kūrėjų Hubas</Text>
					<Text>Registration date: 11/07/2025</Text>
					<Text>
						Administrator of the registration of legal entities: VALSTYBĖS ĮMONĖ
						REGISTRŲ CENTRAS.
					</Text>
					<Text>Legal entity code: 307277444</Text>
					<Text>
						Registered office address: Vilnius, Giedraičių g. 39-R53, LT-09302
					</Text>
					<Text>
						Certificate of state registration of a legal entity (2025 г.)
					</Text>
					<Text>Phone: +370 67253194</Text>
					<Text style={{ display: "flex", alignItems: "center", gap: 0 }}>
						Email: office
						<MdOutlineAlternateEmail color="rgba(12, 2, 2, 0.5)" />
						gdhub.io
					</Text>
				</Flex>
			</Card>
		</PublicLayout>
	);
};

export default LegalDetailsPage;
