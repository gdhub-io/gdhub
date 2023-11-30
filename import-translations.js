const fs = require('fs')
const https = require('https')
const decompress = require('decompress')
const { config } = require('dotenv')

config()

async function main() {
	const url = 'https://tolgee.gdhub.io/v2/projects/export?ak=' + process.env.NEXT_PUBLIC_TOLGEE_API_KEY

	console.log(url)

	https.get(url, (res) => {
		// Image will be stored at this path
		const path = `${__dirname}/src/i18n/i18n.zip`
		const filePath = fs.createWriteStream(path)
		res.pipe(filePath)
		filePath.on('finish', () => {
			filePath.close()
			console.log('Download of temp files completed')

			decompress(path, `${__dirname}/src/i18n`)
				.then((files) => {
					console.log(
						'Unzipped files',
						files.map((f) => f.path)
					)

					fs.rm(path, (error) => {
						if (error) {
							console.log(error)
						} else {
							console.log('The temp files were removed')
						}
					})
				})
				.catch((error) => {
					console.log(error)
				})
		})
	})
}

main()
	.then(async () => {
		//
	})
	.catch(async (e) => {
		console.error(e)
		process.exit(1)
	})
