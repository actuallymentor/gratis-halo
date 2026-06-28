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

test( `wrong invite code shows graphical feedback`, async ( { page } ) => {
    await page.route( `**/api/invite/verify`, route => route.continue( {
        headers: {
            ...route.request().headers(),
            'x-forwarded-for': `playwright-${ Date.now() }`,
        },
    } ) )

    await page.goto( `/login` )
    await page.getByLabel( `Invite code` ).fill( `definitely-not-the-code` )
    await page.getByRole( `button`, { name: `Continue with Oura` } ).click()

    await expect( page.getByRole( `alert` ) ).toContainText( `That invite code is not valid.` )
    await expect( page.getByRole( `status` ).filter( {
        hasText: `That invite code is not valid.`,
    } ) ).toBeVisible()
} )
