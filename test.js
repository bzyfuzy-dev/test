const puppeteer = require("puppeteer");
const fs = require("fs");
const date = new Date();
let todayArr = date.toLocaleDateString("en-GB").split("/").reverse();
todayArr[2] = ("0" + (Number(todayArr[2]) + 1)).slice(-2);
let nextDay = todayArr.join("-");

(async () => {
  let browser = await puppeteer.launch({
    args: ["--start-maximized"],
    devtools: true,
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });
  await page.goto("https://booking.com", {
    waitUntil: "networkidle2",
  });

  const needs = await page.$('[data-ats="44"]');
  const [hotelsLink] = await needs.$x("//a[contains(text(), 'Hotels')]");

  await hotelsLink.click();
  const getNewPageWhenLoaded = async () => {
    return new Promise((x) =>
      browser.on("targetcreated", async (target) => {
        if (target.type() === "page") {
          const newPage = await target.page();
          await newPage.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
          });
          const newPagePromise = new Promise((y) =>
            newPage.once("domcontentloaded", () => y(newPage))
          );
          const isPageLoaded = await newPage.evaluate(
            () => document.readyState
          );
          return isPageLoaded.match("complete|interactive")
            ? x(newPage)
            : x(newPagePromise);
        }
      })
    );
  };
  const newPagePromise = getNewPageWhenLoaded();
  const newPage = await newPagePromise;
  const [moreButton] = await newPage.$x(
    `//*[@id="hoteldeals_for_today"]/div[2]/button`
  );

  await moreButton.click();

  await newPage.waitForTimeout(4000);

  const [orderByPrice] = await newPage.$x(
    `//*[@id="ajaxsrwrap"]/div[1]/div/div/div[2]/ul/li[3]/a`
  );
  await orderByPrice.click();

  await newPage.waitForTimeout(4000);
  await newPage.screenshot({ path: "./out/hotels.png", fullPage: true });

  const hotelCards = await newPage.$$('[data-testid="property-card"]');

  for (let i = 0; i < hotelCards.length; i++) {
    let withMeal = await hotelCards[i].$('[data-testid="gallery-ribbon"]');
    if (withMeal) {
      let hotelTitle = await hotelCards[i].$('[data-testid="title"]');
      let hotelT = await newPage.evaluate((el) => el.textContent, hotelTitle);
      const hotelLink = await hotelCards[i].$('[data-testid="title-link"]');
      hotelLink.click();
      let hotelViewPromise = getNewPageWhenLoaded();
      let hotelViewPage = await hotelViewPromise;

      await ssTable(hotelViewPage, hotelT);

      // hotelViewPage.click(
      //   `#hp_availability_style_changes > div.sb-searchbox__outer > form > div > div.xp__dates.xp__group`
      // );
      // await hotelViewPage.waitForTimeout(500);
      // await hotelViewPage.click(
      //   `#hp_availability_style_changes > div.sb-searchbox__outer > form > div > div.xp__dates.xp__group > div.xp-calendar.searchbox-calendar--with-prices > div > div > div.bui-calendar__content > div:nth-child(1) > table > tbody > tr > td[data-date="${nextDay}"]`
      // );
      // await hotelViewPage.waitForTimeout(250);

      // let [submitButton] = hotelViewPage.$x(
      //   '//*[@id="frm"]/div[1]/div[4]/div[2]/button'
      // );
      // if (submitButton) {
      //   await submitButton.click();
      //   await hotelViewPage.waitForTimeout(4000);
      //   // let nextDayHotelViewPromise = getNewPageWhenLoaded();
      //   // let nextDayHotelViewPage = await nextDayHotelViewPromise;
      //   await ssTable(hotelViewPage, hotelT + "-next_day");
      //   console.log("here");
      // }

      await hotelViewPage.waitForTimeout(1000);
      await hotelViewPage.close();
    }
  }
  await browser.close();
})();

async function ssTable(page, title) {
  await page.waitForTimeout(4000);
  const table = await page.$("#hprt-table");
  let priceRows = await page.$$("#hprt-table tr");
  priceRows.shift();
  let cheapest = {
    index: 0,
    price: 100000000,
  };
  for (let j = 0; j < priceRows.length; j++) {
    let priceElem = await priceRows[j].$("span.prco-valign-middle-helper");
    let priceString = await page.evaluate((el) => el.textContent, priceElem);
    let price = Number(priceString.replace(/[^0-9.-]+/g, ""));

    if (cheapest.price > price) {
      cheapest.price = price;
      cheapest.index = j;
    }
    // const price = priceRows[j].$eval;
  }
  priceRows[cheapest.index].screenshot({
    path: `./out/${title}-cheap.png`,
  });

  await table.screenshot({ path: `./out/${title}.png` });

  page.click(
    `#hp_availability_style_changes > div.sb-searchbox__outer > form > div > div.xp__dates.xp__group`
  );
  await page.waitForTimeout(3000);
  // await page.close();
}
