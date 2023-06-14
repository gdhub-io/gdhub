import { useEffect, useRef, useState } from 'react'
import { Spin } from 'antd'
import Head from 'next/head'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'

const SpecialistsPage: NextPageWithLayout = () => {
	const ref = useRef<any>()
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		if (ref.current) {
			ref.current.src = 'https://airtable.com/embed/shrWvxbQDFtvdRHrj?backgroundColor=cyan&viewControls=on'
		}
		ref.current?.addEventListener('load', handleLoadIframe)

		return () => {
			ref.current?.removeEventListener('load', handleLoadIframe)
		}
	}, [])

	const handleLoadIframe = () => setLoading(false)

	return (
		<>
			<Head>
				<title>Участники</title>
			</Head>
			<div>
				<Spin spinning={loading}>
					<iframe
						ref={ref}
						className="airtable-embed"
						frameBorder="0"
						width="100%"
						height="533"
						style={{ background: 'transparent', border: '1px solid #ccc' }}
					></iframe>
				</Spin>
			</div>
		</>
	)
}

SpecialistsPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default SpecialistsPage
