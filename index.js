const puppeteer = require('puppeteer');
const path = require('path');
const cred = require('./cred');

(async () => {
  const browser = await puppeteer.launch({devtools: true});
  const page = await browser.newPage();
  await page.goto(cred.homepage);
  await page.click('#__layout > div > header > button');
  await page.waitFor(2000);
  await page.click('#__layout > div > header > div > nav > div.navbar-secondary.notlogged > button.button.primary.-small');
  await page.waitFor(2000);
  await page.type('input[type="email"]', cred.username);
  await page.type('input[type="password"]', cred.password);
  await page.click('button[type="submit"]');
  await page.waitFor(2000);
  await page.goto(cred.course);

  const video = await page.evaluate((sel) => {
    return document.querySelectorAll(sel);
  }, '.list-item');

  console.log('video', video);

  page.on('response', async response => {
    let root = response.url();
    if (root.includes('master.json')) {
      const data = await response.json();
      root = path.join(
        root.substring(0, root.lastIndexOf('/')), data.base_url);
      const videoLinks = [];
      const audio = data.audio[0];
      let video = null;

      let highestBitrate = 0;
      for (let v of data.video) {
        if (v.width === 1920 && v.height === 1080) {
          video = v;
          break;
        }
        if (v.bitrate > highestBitrate) {
          highestBitrate = v.bitrate;
          video = v;
        }
      }

      const getFileLinks = (segments, baseUrl) =>
        [{url: 'segment-0.m4s'}].concat(segments).reduce((accu, curr) => {
          accu.push(path.join(baseUrl, curr.url));
          return accu;
        }, []);

      const audioFileLinks = getFileLinks(
        audio.segments, path.join(root, audio.base_url));

      const videoFileLinks = getFileLinks(
        video.segments, path.join(root, video.base_url));

      console.log('===================================');
      console.log('audio file links:', audioFileLinks);
      console.log('video file links:', videoFileLinks);
      console.log('-----------------------------------');
    }
  });
  // await browser.close();
})();
