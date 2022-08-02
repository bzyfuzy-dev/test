import asyncio
import datetime
import os
from pyppeteer import launch
from pyppeteer.page import Page
from pyppeteer.element_handle import ElementHandle
etestse
loop = asyncio.get_event_loop()
result_page = asyncio.get_event_loop().create_future()


async def fetch_price(page, hotel_title: str):
    try:
        await page.setViewport({'width': 1600, 'height': 1024})
        price_table = await page.querySelector("#hprt-table")
        price_rows = await page.querySelectorAll("#hprt-table tr")
        await price_table.screenshot({'path': f'{hotel_title}_prices_table.png'})
        price_rows.pop(0)
        lowest_row = price_rows[0]
        temp = 100000000
        for price_row in price_rows:
            price_element = await price_row.querySelector("span.prco-valign-middle-helper")
            price = await page.evaluate('(el) => Number(el.textContent.replace(/[^0-9.-]+/g, ""))', price_element)
            if temp > price:
                temp = price
                lowest_row = price_row
        await lowest_row.screenshot({'path': f'{hotel_title}_cheapest_room.png'})
    except Exception as e:
        print('catch exception fetch')
        print(e)


async def main():
    try:
        browser = await launch({'headless': False, 'defaultViewport': {'width': 0, 'height': 0},
                                'args': ['--start-maximized']})
        page = await browser.newPage()
        await page.goto('https://booking.com')
        hotels_link = (await page.xpath('//li/a[contains(text(), "Hotels")]'))[0]
        await hotels_link.click()
        await page.waitFor(5000)
        more_button = (await page.xpath('//*[@id="hoteldeals_for_today"]/div/button'))[0]
        await more_button.click()
        await page.waitFor(5000)
        hotel_cards = await page.querySelectorAll('[data-testid="property-card"]')
        if len(hotel_cards) <= 0:
            print("no hotels available")
            await browser.close()
        sort_button = (await page.xpath('//*[@data-component="plank-sorters-bar"]//a[contains(text(), "Price (lowest first)")]'))[0]
        await sort_button.click()
        breakfast_included_selector = await page.querySelector('input[name="mealplan=1"]')
        await page.evaluate('(el) => {if(!el.checked){ el.click(); }}', breakfast_included_selector)
        await page.waitFor(5000)
        hotel_cards = await page.querySelectorAll('[data-testid="property-card"]')
        hotel_title_selector = await hotel_cards[0].querySelector('[data-testid="title"]')
        hotel_title = await page.evaluate('(el) => el.textContent', hotel_title_selector)
        hotel_link = await hotel_cards[0].querySelector('[data-testid="title-link"]')
        await hotel_link.click()
        browser.once('targetcreated',
                     lambda target: result_page.set_result(target))
        hotel_page: Page = await (await result_page).page()
        await hotel_page.waitFor(5000)
        await fetch_price(hotel_page, hotel_title)
        next_day = (datetime.datetime.now() +
                    datetime.timedelta(days=1)).strftime('%Y-%m-%d')
        await hotel_page.setViewport({'width': 1600, 'height': 1024})
        check_form = (await hotel_page.xpath('//*[@id="hp_availability_style_changes"]//form//'))[0]
        open_select_button = (await check_form.xpath('//*[@class="xp__dates xp__group"]'))[0]
        await open_select_button.click()
        await hotel_page.waitFor(500)
        tomorrow = (await check_form.xpath(f'//*[@data-date="{next_day}"]'))[0]
        await tomorrow.click()
        await hotel_page.waitFor(5000)
        submit_button = (await check_form.xpath('//button[@type="submit"]'))[0]
        await submit_button.click()
        await hotel_page.waitFor(5000)
        await fetch_price(hotel_page, hotel_title+"next_day")
        await browser.close()
    except Exception as e:
        pass

if __name__ == '__main__':
    loop.run_until_complete(main())
