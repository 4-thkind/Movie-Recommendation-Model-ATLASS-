import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto('http://localhost:8000')
        await page.wait_for_timeout(2000)
        
        # Click the first movie card to open modal
        await page.evaluate("""() => {
            const card = document.querySelector('.movie-card');
            if(card) card.click();
        }""")
        await page.wait_for_timeout(1000)
        
        await page.screenshot(path='modal.png')
        await browser.close()

asyncio.run(main())
