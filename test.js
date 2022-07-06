const puppeteer = require("puppeteer");
const fs = require("fs");
var formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",

  // These options are needed to round to whole numbers if that's what you want.
  //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
  //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
});

(async () => {
  let browser = await puppeteer.launch({ devtools: true });

  const page = await browser.newPage();
  await page.setViewport({
    width: 1024,
    height: 768,
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
      await hotelViewPage.waitForTimeout(4000);
      const table = await hotelViewPage.$("#hprt-table");
      let priceRows = await hotelViewPage.$$("#hprt-table tr");
      ("prco-valign-middle-helper");
      priceRows.shift();
      let cheapest = {
        index: 0,
        price: 100000000,
      };
      for (let j = 0; j < priceRows.length; j++) {
        let priceElem = await priceRows[j].$("span.prco-valign-middle-helper");
        let priceString = await hotelViewPage.evaluate(
          (el) => el.textContent,
          priceElem
        );
        let price = Number(priceString.replace(/[^0-9.-]+/g, ""));

        if (cheapest.price > price) {
          cheapest.price = price;
          cheapest.index = j;
        }
        // const price = priceRows[j].$eval;
      }
      priceRows[cheapest.index].screenshot({
        path: `./out/${hotelT}-cheap.png`,
      });

      await table.screenshot({ path: `./out/${hotelT}.png` });
      await hotelViewPage.waitForTimeout(5000);
      await hotelViewPage.close();
    }
  }

  // hotelCards.forEach(async (card) => {
  //   let withBre = await card.$('[data-testid="gallery-ribbon"]');
  //   if (withBre) {
  //     let hotelTitle = await card.$('[data-testid="title"]');
  //     let hotelT = await newPage.evaluate((el) => el.textContent, hotelTitle);
  //     const hotelLink = await card.$('[data-testid="title-link"]');
  //     console.log(hotelT);
  //     console.log(hotelLink);
  //     hotelLink.tap();
  //     // await hotelLink.evaluate((a) => a.click());
  //     let hotelViewPromise = getNewPageWhenLoaded();
  //     let hotelViewPage = await hotelViewPromise;
  //     await hotelViewPage.waitForTimeout(4000);

  //     // const table = await hotelViewPage.$("#hprt-table");
  //     // await table.screenshot({ path: `./out/${hotelT}.png` });
  //     // await hotelViewPage.waitForTimeout(5000);
  //     // await hotelViewPage.close();
  //   }
  // });

  //   const [viewHotel] = await newPage.$x(
  //     `//*[@id="search_results_table"]/div[2]/div/div/div/div[6]/div[1]/div[1]/div[2]/div/div[1]/div[1]/div/div[1]/div/h3/a`
  //   );

  //   await viewHotel.click();
  //   const hotelviewProm = getNewPageWhenLoaded();
  //   const hotelPage = await hotelviewProm;

  //   await hotelPage.waitForTimeout(4000);

  //   //   let html = await hotelPage.content();

  //   //   fs.writeFile("./output/hotel.html", html, (err) => {
  //   //     if (err) {
  //   //       console.error(err);
  //   //     }
  //   //     // file written successfully
  //   //   });

  //   const table = await hotelPage.$("#hprt-table");
  //   //   console.log(prices[1][2].split("\n"));
  //   await table.screenshot({ path: "./out/all-prices.png" });
  await browser.close();
})();
