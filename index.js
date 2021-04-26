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

const baseDirectory = path.join(__dirname, 'download', cred.courseName);
const jsonFile = path.join(__dirname, `file-list/${cred.courseName}.json`);

(async () => {
  if (!fs.existsSync(jsonFile)) {
    await (async () => {
      const browser = await puppeteer.launch({
        // devtools: true,
        // headless: false,
        args: ['--disable-features=site-per-process'], // for intercept iframe vimeo response
      });
      const page = await browser.newPage();
      await page.goto(cred.homepage);
      await page.click('#__layout > div > div > div > header > button');
      await page.waitFor(2000);
      await page.click(
        '#__layout > div > div > div > header > div > nav > div.navbar-secondary.notlogged > button.button.primary.-small'
      );
      await page.waitFor(2000);
      await page.type('input[type="email"]', cred.username);
      await page.type('input[type="password"]', cred.password);
      await page.click(
        '#__layout > div > div.v--modal-overlay.scrollable > div > div.v--modal-box.v--modal > form > div.form-actions > button'
      );
      await page.waitFor(2000);
      await page.goto(cred.courseUrl);
      await page.waitFor(2000);
      const lessons = await page.evaluate(() => {
        const titles = Array.from(
          document.querySelectorAll('.list-item-title')
        );
        return titles.map((title) => title.innerText.replace(/&/g, 'and'));
      });

      const lessonTable = {};

      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        await page.click(`.list-item:nth-of-type(${i + 1})`);
        await new Promise(async (resolve) => {
          console.log('Lesson - ', lesson);
          page.on('response', async (response) => {
            let root = response.url();
            if (root.includes('master.json')) {
              const data = await response.json();
              root = path.join(
                root.substring(0, root.lastIndexOf('/')),
                data.base_url
              );

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
                console.log('video:', v);
              }

              const getFileLinks = (segments, baseUrl) =>
                // 'segment-0.m4s' is actually a hidden (un-listed) file
                [{ url: 'segment-0.m4s' }]
                  .concat(segments)
                  .reduce((accu, curr) => {
                    accu.push({
                      file: curr.url,
                      url: path.join(baseUrl, curr.url),
                    });
                    return accu;
                  }, []);

              lessonTable[lesson] = {
                audio: getFileLinks(
                  audio.segments,
                  path.join(root, audio.base_url)
                ),
                video: getFileLinks(
                  video.segments,
                  path.join(root, video.base_url)
                ),
              };
              resolve();
            }
          });
        });
        page.removeAllListeners('response');
      }
      await browser.close();
      await writeJsonFile(jsonFile, lessonTable);
    })();
  }

  await (async () => {
    const lessonTable = await loadJsonFile(jsonFile);

    for (let lesson in lessonTable) {
      const types = ['audio', 'video'];
      const mergedFiles = [];
      const lessonDirectory = path.join(baseDirectory, lesson);
      for (let type of types) {
        let directory = path.join(lessonDirectory, type);
        await pmkdirp(directory);
        const files = [];
        for (let link of lessonTable[lesson][type]) {
          const file = path.join(directory, link.file);
          await download(link.url, file);
          files.push(esc(file));
        }

        // merge video/audio chunks
        const mergedFile = path.join(lessonDirectory, `${type}.m4s`);
        const cmd = `cat ${files.join(' ')} > ${esc(mergedFile)}`;
        await pexec(cmd);

        mergedFiles.push(esc(mergedFile));
      }

      // combine video with audio
      const outputFile = esc(path.join(baseDirectory, `${lesson}.mp4`));
      const cmd = `MP4Box -add ${mergedFiles[0]} -add ${mergedFiles[1]} -new ${outputFile}`;
      await pexec(cmd);
      await pexec(`rm ${mergedFiles.join(' ')}`);
    }
  })();
})();
