import type { GetServerSidePropsContext } from "next";
import { NextSeo } from "next-seo";

const TestSeo = ({ title }: any) => (
	<>
		<NextSeo title={title} />
		<p>Simple Usage</p>
	</>
);

export const getServerSideProps = async (
	context: GetServerSidePropsContext,
) => {
	return {
		props: { title: "Home Page Title" },
	};
};

export default TestSeo;
