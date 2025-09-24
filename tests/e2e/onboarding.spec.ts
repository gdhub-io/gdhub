import { test, expect } from '@playwright/test'

test('User completes onboarding flow', async ({ page, request, baseURL }) => {
	const appBase = baseURL || 'http://localhost:3000'

	// login via test helper (no UI buttons)
	const email = `e2e_${Date.now()}@example.com`
	const callback = encodeURIComponent('/registration/onboarding')
	await page.goto(`${appBase}/api/test/login?email=${encodeURIComponent(email)}&callback=${callback}`)

	// redirected to onboarding welcome
	await page.waitForURL('**/registration/onboarding')

	// Welcome step -> click Fill out the profile
	await page.getByRole('button', { name: /Fill out the profile/i }).click()

	// Profile step: fill required fields and save
	await expect(page.getByRole('heading', { name: /User Profile/i })).toBeVisible()
	await page.getByLabel(/First name/i).fill('John')
	await page.getByLabel(/Last name/i).fill('Doe')
	await page.getByLabel(/Year of birth/i).click()
	await page.getByRole('option').first().click()
	await page.getByLabel(/Country/i).fill('United States')
	await page.getByText('United States', { exact: true }).click()
	await page.getByRole('checkbox', { name: /I confirm the accuracy/i }).check()
	await page.getByRole('button', { name: /Save and continue/i }).click()

	// Speciality step: fill required fields and save
	await expect(page.getByRole('heading', { name: /Speciality/i })).toBeVisible()
	await page.getByLabel(/Speciality name/i).fill('Game Designer')
	await page.getByLabel(/Speciality level/i).click()
	await page.getByRole('option').first().click()
	await page.getByLabel(/Work direction/i).click()
	await page.getByRole('option').first().click()
	await page.getByLabel(/Specialization/i).fill('Systems design, economy balance')
	await page.getByLabel(/Experience/i).fill('3 years experience in indie teams')
	await page.getByRole('button', { name: /Save and continue/i }).click()

	// Interests step: choose primaryInterest and some preferences
	await expect(page.getByRole('button', { name: /Save and continue/i })).toBeVisible()
	// segmented may not be accessible; fallback to radio on small screens handled by responsive; click Author segmented by text
	const wantToBe = page.getByText('I want to be', { exact: false })
	if (await wantToBe.count()) {
		await page.getByText('Specialist', { exact: false }).click()
	} else {
		await page.getByRole('radio', { name: /Specialist/i }).check()
	}

	// Optional selects (if present)
	const genres = page.getByLabel(/Genres/i)
	if (await genres.count()) {
		await genres.click()
		await page.getByRole('option').first().click()
		await page.keyboard.press('Escape')
	}

	await page.getByRole('button', { name: /Save and continue/i }).click()

	// Resources step: fill required and save
	await expect(page.getByRole('heading', { name: /Recources|Resources/i })).toBeVisible()
	const min = page.getByPlaceholder(/minimum/i)
	const max = page.getByPlaceholder(/maximum/i)
	await min.fill('5')
	await max.fill('10')
	await page.getByRole('button', { name: /^Save$/i }).click()

	// Completed screen
	await expect(page.getByRole('heading', { name: /Your profile was successfully completed/i })).toBeVisible()
})
