vm-pop
=====
this repo has nothing to do with `virtual machine` or `view model` or whatever you think the `vm` might be.
`vm` here is simply a website, and `pop` stands for [puppeteer](https://github.com/GoogleChrome/puppeteer). (guess it should be `pup` instead, but, whatever)

###### How it works
- using [puppeteer](https://github.com/GoogleChrome/puppeteer) to get the video play lists from `vm`
- using built-in `curl` to download video / audio chunks
- using built-in `cat` to concanate those chunks into a single video / audio file
- using [MP4Box](https://gpac.wp.imt.fr/mp4box/) to merge the video file with the audio file
 
###### References
* [下载视频流M4S并合成MP4](https://blog.csdn.net/PatrickZheng/article/details/78726509)
* [MPEG-DASH m4v + m4a = mp4](https://github.com/gpac/gpac/issues/778)
