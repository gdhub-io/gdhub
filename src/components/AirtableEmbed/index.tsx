import { useEffect, useRef, useState } from 'react'
import { Spin } from 'antd'

export const AirtableEmbed = ({ embedLink }: { embedLink: string }) => {
	const ref = useRef<any>()
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		if (ref.current) {
			ref.current.src = embedLink
		}
		ref.current?.addEventListener('load', handleLoadIframe)

		return () => {
			ref.current?.removeEventListener('load', handleLoadIframe)
		}
	}, [])

	const handleLoadIframe = () => setLoading(false)

	return (
		<>
			<Spin spinning={loading}>
				<iframe
					ref={ref}
					className="airtable-embed"
					frameBorder="0"
					width="100%"
					height="533"
					style={{ background: 'transparent', border: '1px solid #ccc', marginBottom: '20px' }}
				></iframe>
			</Spin>
		</>
	)
}
