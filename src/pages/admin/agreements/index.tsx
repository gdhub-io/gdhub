import { AgreementsApp } from "@/components/agreements/AgreementsApp";
import { AdminLayout } from "@/layouts/AdminLayout";
import type { NextPageWithLayout } from "@/pages/_app";

const AgreementsAdminPage: NextPageWithLayout = () => {
	return <AgreementsApp />;
};

AgreementsAdminPage.getLayout = (page) => <AdminLayout>{page}</AdminLayout>;

export default AgreementsAdminPage;
