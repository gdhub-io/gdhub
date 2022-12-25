export const getBase64File = (file: any) =>
	new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.readAsDataURL(file)
		reader.onload = () => resolve(reader.result)
		reader.onerror = (error) => reject(error)
	})

export const normUploadFile = (e: any) => {
	console.log('normUploadFile', e)
	if (Array.isArray(e)) {
		return e
	}
	return e && e.fileList
}
