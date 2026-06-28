import { expect, test } from '@playwright/test'

test( `legal routes render through the SPA shell`, async ( { page } ) => {
    await page.goto( `/privacy` )
    await expect( page.getByRole( `heading`, { name: `Privacy` } ) ).toBeVisible()

    await page.goto( `/tos` )
    await expect( page.getByRole( `heading`, { name: `Terms` } ) ).toBeVisible()
} )

test( `login shows the invite gate`, async ( { page } ) => {
    await page.goto( `/login` )
    await expect( page.getByRole( `heading`, { name: `Halo` } ) ).toBeVisible()
    await expect( page.getByLabel( `Invite code` ) ).toBeVisible()
} )

