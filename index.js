const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const writeJsonFile = require('write-json-file');
const loadJsonFile = require('load-json-file');
const pexec = require('./pexec');
const esc = require('./utils').esc;

const cred = require('./cred');
const pmkdirp = require('./pmkdirp');
const download = require('./download');

const getFilesFromLink = async (link) => {
  const courseName = link.substring(link.lastIndexOf('/') + 1, link.length);
  const outputDirectory = path.join(__dirname, 'download', courseName);
  const jsonFile = path.join(__dirname, `file-list/${courseName}.json`);

  if (!fs.existsSync(jsonFile)) {
    await (async () => {
      const browser = await puppeteer.launch({
        devtools: true,
        headless: false,
        args: [
          '--disable-features=site-per-process',
          '--enable-popup-blocking',
        ], // for intercept iframe vimeo response
      });
      const page = await browser.newPage();
      await page.goto(link);
      await page.type('input[type="password"]', cred.password);
      await page.keyboard.press('Enter');
      await page.waitForNavigation();

      const lessons = [];

      const getLessons = async () => {
        const result = await page.evaluate(() => {
          const next = Array.from(
            document.querySelectorAll('a.page-link')
          ).find((a) => a.innerText.includes('Next'));
          return {
            lessons: Array.from(document.querySelectorAll('a.tx-dark')).map(
              (a) => {
                const text = a.innerText;
                const href = a.href;
                const title = text.substring(
                  text.indexOf(' ') + 1,
                  text.length
                );
                const num = text
                  .substring(0, text.indexOf('.'))
                  .padStart(3, '0');
                return { href, fileName: `${num} - ${title}` };
              }
            ),
            nextPage: next ? next.href : '',
          };
        });
        lessons.push(...result.lessons);
        if (result.nextPage) {
          await page.goto(result.nextPage);
          await getLessons();
        }
      };
      await getLessons();
      browser.on('targetcreated', async (target) => {
        const page = await target.page();
        if (page) page.close();
      });
      for (let lesson of lessons) {
        await page.goto(lesson.href);
        await page.setRequestInterception(true);
        const promise = new Promise(async (resolve) => {
          page.on('request', (request) => {
            if (
              request.isNavigationRequest() &&
              request.redirectChain().length !== 0
            ) {
              page.removeAllListeners('request');
              page.setRequestInterception(false);
              lesson.fileUrl = request.url();
              console.log(courseName, lesson);
              request.abort();
              resolve();
            } else {
              request.continue();
            }
          });
        });
        await page.waitForSelector('#downloadbtn');
        await page.click('#downloadbtn');
        await promise;
      }
      browser.removeAllListeners('targetcreated');
      await browser.close();
      await writeJsonFile(jsonFile, {
        courseName,
        lessons,
      });
    })();
  }

  await (async () => {
    const data = await loadJsonFile(jsonFile);
    await pmkdirp(outputDirectory);

    for (let lesson of data.lessons) {
      const file = path.join(outputDirectory, lesson.fileName);
      await download(lesson.fileUrl, file);
    }
  })();
};

(async () => {
  for (let link of cred.sendcmLinks) {
    await getFilesFromLink(link);
  }
})();
