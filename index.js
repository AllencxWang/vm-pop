const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const writeJsonFile = require('write-json-file');
const loadJsonFile = require('load-json-file');

const cred = require('./cred');
const pmkdirp = require('./pmkdirp');
const download = require('./download');

const baseDirectory = path.join(__dirname, 'download', cred.courseName);
const jsonFile = path.join(__dirname, `file-list/${cred.courseName}.json`);

(async () => {
  if (!fs.existsSync(jsonFile)) {
    await (async () => {
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
      await page.goto(cred.courseUrl);
    
      const lessons = await page.evaluate(() => {
        const titles = Array.from(document.querySelectorAll('.list-item-title'));
        return titles.map(title => title.innerText.replace(/&/g, 'and'));
      });
    
      const lessonTable = {};
    
      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        await page.click(`.list-item:nth-of-type(${i+1})`);
    
        await new Promise(async (resolve) => {
          console.log('Lesson - ', lesson);
          page.on('response', async (response) => {
            let root = response.url();
            if (root.includes('master.json')) {
              const data = await response.json();
              root = path.join(
                root.substring(0, root.lastIndexOf('/')), data.base_url);
              
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
                // 'segment-0.m4s' is actually a hidden (un-listed) file
                [{url: 'segment-0.m4s'}].concat(segments).reduce((accu, curr) => {
                  accu.push({file: curr.url, url: path.join(baseUrl, curr.url)});
                  return accu;
                }, []);
              
    
              lessonTable[lesson] = {
                audio: getFileLinks(
                  audio.segments, path.join(root, audio.base_url)),
                video: getFileLinks(
                  video.segments, path.join(root, video.base_url))
              }
              resolve();
            }
          });
        });
        page.removeAllListeners('response');
      }
      await browser.close();
      await writeJsonFile(jsonFile, lessonTable);  
    })()
  }
  
  await (async () => {
    const lessonTable = await loadJsonFile(jsonFile);

    for (let lesson in lessonTable) {
      const types = ['audio', 'video'];
      for (let type of types) {
        let directory = path.join(baseDirectory, lesson, type);
        await pmkdirp(directory);
        for (let link of lessonTable[lesson][type]) {
          await download(link.url, path.join(directory, link.file));
        }
      }
    }  
  })();
})();
