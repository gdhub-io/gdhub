import { SwaggerLayout } from '@/layouts/SwaggerLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { GetStaticProps, InferGetStaticPropsType } from 'next'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import { createSwaggerSpec } from 'next-swagger-doc'
import 'swagger-ui-react/swagger-ui.css'

const SwaggerUI = dynamic<{ spec: any }>(import('swagger-ui-react') as any, { ssr: false })

const ApiDoc: NextPageWithLayout = ({ spec }: InferGetStaticPropsType<typeof getStaticProps>) => {
	const { status } = useSession()

	if (status == 'unauthenticated') {
		return <>You need authenticate for access to the API documentation.</>
	}

	return <SwaggerUI spec={spec} />
}

ApiDoc.getLayout = (page) => <SwaggerLayout>{page}</SwaggerLayout>

export const getStaticProps: GetStaticProps = async () => {
	const spec: Record<string, any> = createSwaggerSpec({
		apiFolder: 'src/pages/api',
		definition: {
			openapi: '3.0.0',
			tags: [{ name: 'Images' }],
			info: {
				title: 'gdhub.api documentation',
				version: '1.0',
			},
			servers: [{ url: process.env.NEXT_PUBLIC_APP_URI as string }],
		},
	})

	return {
		props: {
			spec,
		},
	}
}

export default ApiDoc
