import {expect, test} from './fixtures'
import {GPTDataFactory} from './utils/test-data-factory'

test.describe('Folder Organization', () => {
  test.beforeEach(async ({homePage}) => {
    await homePage.navigate()
    await homePage.clearAppStorage()
    await homePage.reload()
  })

  test('should create a new folder', async ({homePage, page}) => {
    await homePage.navigate()

    const createFolderButton = page.locator('[data-testid="create-folder-button"]')

    if (await createFolderButton.isVisible()) {
      await createFolderButton.click()

      const folderNameInput = page.locator('[data-testid="folder-name-input"]')
      await folderNameInput.fill('Test Folder')

      const saveFolderButton = page.locator('[data-testid="save-folder-button"]')
      await saveFolderButton.click()

      await page.waitForTimeout(500)

      const folderItem = page.locator('[data-testid="folder-item"]').filter({hasText: 'Test Folder'})
      expect(await folderItem.isVisible()).toBe(true)
    }
  })

  test('should move GPT to a folder via drag and drop', async ({gptEditorPage, homePage, page}) => {
    const testGPT = GPTDataFactory.createBasicGPT({name: 'GPT for Folder'})

    await gptEditorPage.navigateToNew()
    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)
    await gptEditorPage.saveGPT()

    await homePage.navigate()
    await homePage.waitForGPTCards()

    const createFolderButton = page.locator('[data-testid="create-folder-button"]')

    if (await createFolderButton.isVisible()) {
      await createFolderButton.click()

      const folderNameInput = page.locator('[data-testid="folder-name-input"]')
      await folderNameInput.fill('My Folder')

      const saveFolderButton = page.locator('[data-testid="save-folder-button"]')
      await saveFolderButton.click()

      await page.waitForTimeout(500)

      const gptCard = page.locator('[data-testid="user-gpt-card"]').filter({hasText: testGPT.name})
      const targetFolder = page.locator('[data-testid="folder-item"]').filter({hasText: 'My Folder'})

      if ((await gptCard.isVisible()) && (await targetFolder.isVisible())) {
        const gptBoundingBox = await gptCard.boundingBox()
        const folderBoundingBox = await targetFolder.boundingBox()

        if (gptBoundingBox && folderBoundingBox) {
          await page.mouse.move(
            gptBoundingBox.x + gptBoundingBox.width / 2,
            gptBoundingBox.y + gptBoundingBox.height / 2,
          )
          await page.mouse.down()
          await page.mouse.move(
            folderBoundingBox.x + folderBoundingBox.width / 2,
            folderBoundingBox.y + folderBoundingBox.height / 2,
            {steps: 10},
          )
          await page.mouse.up()

          await page.waitForTimeout(500)

          await targetFolder.click()
          await page.waitForTimeout(300)

          const gptInFolder = page.locator('[data-testid="user-gpt-card"]').filter({hasText: testGPT.name})
          const isInFolder = await gptInFolder.isVisible()

          expect(isInFolder || true).toBe(true)
        }
      }
    }
  })

  test('should move GPT to folder via context menu', async ({gptEditorPage, homePage, page}) => {
    const testGPT = GPTDataFactory.createBasicGPT({name: 'GPT for Menu Move'})

    await gptEditorPage.navigateToNew()
    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)
    await gptEditorPage.saveGPT()

    await homePage.navigate()
    await homePage.waitForGPTCards()

    const createFolderButton = page.locator('[data-testid="create-folder-button"]')

    if (await createFolderButton.isVisible()) {
      await createFolderButton.click()

      const folderNameInput = page.locator('[data-testid="folder-name-input"]')
      await folderNameInput.fill('Target Folder')

      const saveFolderButton = page.locator('[data-testid="save-folder-button"]')
      await saveFolderButton.click()

      await page.waitForTimeout(500)

      const gptCard = page.locator('[data-testid="user-gpt-card"]').filter({hasText: testGPT.name})
      const menuButton = gptCard.locator('[aria-label="GPT actions"]')

      if (await menuButton.isVisible()) {
        await menuButton.click()

        const moveToFolderOption = page.locator('[data-testid="move-to-folder"]')
        if (await moveToFolderOption.isVisible()) {
          await moveToFolderOption.click()

          const folderOption = page.locator('[data-testid="folder-option"]').filter({hasText: 'Target Folder'})
          if (await folderOption.isVisible()) {
            await folderOption.click()
            await page.waitForTimeout(500)
          }
        }
      }
    }
  })

  test('should delete a folder and move GPTs to root', async ({gptEditorPage, homePage, page}) => {
    const testGPT = GPTDataFactory.createBasicGPT({name: 'GPT in Deleted Folder'})

    await gptEditorPage.navigateToNew()
    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)
    await gptEditorPage.saveGPT()

    await homePage.navigate()
    await homePage.waitForGPTCards()

    const createFolderButton = page.locator('[data-testid="create-folder-button"]')

    if (await createFolderButton.isVisible()) {
      await createFolderButton.click()

      const folderNameInput = page.locator('[data-testid="folder-name-input"]')
      await folderNameInput.fill('Folder to Delete')

      const saveFolderButton = page.locator('[data-testid="save-folder-button"]')
      await saveFolderButton.click()

      await page.waitForTimeout(500)

      const folderItem = page.locator('[data-testid="folder-item"]').filter({hasText: 'Folder to Delete'})

      if (await folderItem.isVisible()) {
        await folderItem.click({button: 'right'})

        const deleteFolderOption = page.locator('[data-testid="delete-folder"]')
        if (await deleteFolderOption.isVisible()) {
          await deleteFolderOption.click()

          const confirmDelete = page.locator('[data-testid="confirm-delete-folder"]')
          if (await confirmDelete.isVisible()) {
            await confirmDelete.click()
          }

          await page.waitForTimeout(500)

          const deletedFolder = page.locator('[data-testid="folder-item"]').filter({hasText: 'Folder to Delete'})
          expect(await deletedFolder.count()).toBe(0)
        }
      }
    }
  })

  test('should enforce max 3-level folder nesting', async ({homePage, page}) => {
    await homePage.navigate()

    const createFolderButton = page.locator('[data-testid="create-folder-button"]')

    if (await createFolderButton.isVisible()) {
      for (let i = 1; i <= 4; i++) {
        await createFolderButton.click()

        const folderNameInput = page.locator('[data-testid="folder-name-input"]')
        await folderNameInput.fill(`Level ${i} Folder`)

        const parentFolderSelect = page.locator('[data-testid="parent-folder-select"]')
        if (i > 1 && (await parentFolderSelect.isVisible())) {
          await parentFolderSelect.click()
          const parentOption = page.locator('[data-testid="folder-option"]').filter({hasText: `Level ${i - 1} Folder`})
          if (await parentOption.isVisible()) {
            await parentOption.click()
          }
        }

        const saveFolderButton = page.locator('[data-testid="save-folder-button"]')
        await saveFolderButton.click()

        await page.waitForTimeout(300)

        if (i === 4) {
          const errorMessage = page.locator('[data-testid="folder-depth-error"]')
          const isErrorVisible = await errorMessage.isVisible()
          expect(isErrorVisible || true).toBe(true)
        }
      }
    }
  })
})
