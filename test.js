const puppeteer = require("puppeteer");
const fs = require("fs");

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
  const [hotelLink] = await page.$x("//a[contains(text(), 'Hotels')]");
  await hotelLink.click();
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

  const [viewHotel] = await newPage.$x(
    `//*[@id="search_results_table"]/div[2]/div/div/div/div[6]/div[1]/div[1]/div[2]/div/div[1]/div[1]/div/div[1]/div/h3/a`
  );

  viewHotel.click();
  const hotelviewProm = getNewPageWhenLoaded();
  const hotelPage = await hotelviewProm;

  await hotelPage.waitForTimeout(4000);
  let html = await hotelPage.content();

  fs.writeFile("./output/hotel.html", html, (err) => {
    if (err) {
      console.error(err);
    }
    // file written successfully
  });

  const table = await hotelPage.$("#hprt-table");
  //   console.log(prices[1][2].split("\n"));
  await table.screenshot({ path: "./out/all-prices.png" });
  await browser.close();
})();
