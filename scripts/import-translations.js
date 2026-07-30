const fs = require("node:fs");
const https = require("node:https");
const decompress = require("decompress");
const { config } = require("dotenv");
const { execSync } = require("node:child_process");

config();

async function main ()
{
	const url =
		"https://tolgee.gdhub.io/v2/projects/export?ak=" + process.env.NEXT_PUBLIC_TOLGEE_API_KEY;

	https.get(url, (res) =>
	{
		if (res.statusCode !== 200) {
			res.resume();
			console.error(`Tolgee export failed: HTTP ${res.statusCode}. Translations were NOT updated.`);
			// 5xx means Tolgee is down — don't block the push; 4xx means a bad API key — fail loudly
			process.exit(res.statusCode >= 500 ? 0 : 1);
		}

		// Image will be stored at this path
		const path = `${__dirname}/../src/i18n/i18n.zip`;
		const filePath = fs.createWriteStream(path);
		res.pipe(filePath);
		filePath.on("finish", () =>
		{
			filePath.close();
			console.log("Download of temp files completed");

			decompress(path, `${__dirname}/../src/i18n`)
				.then((files) =>
				{
					console.log(
						"Unzipped files",
						files.map((f) => f.path),
					);

					if (files.length === 0) {
						fs.rmSync(path, { force: true });
						console.error("Tolgee export contained no files. Translations were NOT updated.");
						process.exit(1);
					}

					// Format JSON files after import
					try {
						execSync(
							`bunx biome format --write ${__dirname}/../src/i18n/en.json ${__dirname}/../src/i18n/ru.json`,
							{ stdio: "inherit" },
						);
						console.log("Translation files formatted");
					} catch (error) {
						console.warn("Failed to format translation files:", error.message);
					}

					fs.rm(path, (error) =>
					{
						if (error) {
							console.log(error);
						} else {
							console.log("The temp files were removed");
						}
					});
				})
				.catch((error) =>
				{
					console.log(error);
				});
		});
	});
}

main()
	.then(async () =>
	{
		//
	})
	.catch(async (e) =>
	{
		console.error(e);
		process.exit(1);
	});
