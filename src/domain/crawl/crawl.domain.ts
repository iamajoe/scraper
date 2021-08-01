import { fetchParsedHTMLUrl, isValidURL } from "../../helpers/scrape";
import { get as getConfig } from '../_config/config';
import { IJob } from "../job/job.domain";

// -----------------------------------------------
// methods

const sanitizeContent = (arr: string[]) => {
  return arr.map((data) => {
    if (typeof data !== 'string') {
      return data;
    }

    return data.trim().replace(/\n/g, '');
  });
};

export const getDomData = async (
  $: cheerio.Root,
  retrieveData: (IJob['retrieveData'][0] & {
    retrieverFn?: (el: cheerio.Cheerio, data: string[], $: cheerio.Root) => any
  })[],
  options: IJob['options']
): Promise<{ [key: string]: any[] }> => {
  const results: { [key: string]: any[] } = {};

  const wrappers = $(options.wrapperSelector);
  for (let i = 0; i < wrappers.length; i += 1) {
    const wrapper = $(wrappers[i]);

    // go per item selector
    for (let c = 0; c < retrieveData.length; c += 1) {
      const item = retrieveData[c];

      // set a default for the item
      results[item.name] = results[item.name] == null ? [] : results[item.name];

      const content: any[] = [];

      const el = wrapper.find(item.selector);
      el.each(function (i, val) {
        const singleEl = $(val);

        if (item.retrieverFn != null) {
          content.push(item.retrieverFn(singleEl, results[item.name], $));
        } else if (item.retrieverMethod != null && singleEl[item.retrieverMethod] != null) {
          const params = item.retrieverParams == null ? [] : (Array.isArray(item.retrieverParams) ? item.retrieverParams : [item.retrieverParams]);
          content.push((singleEl[item.retrieverMethod] as Function)(...params));
        } else {
          content.push(singleEl.text());
        }
      });

      // nothing to go on with...
      if (content.length === 0) {
        continue;
      }

      const isArr = Array.isArray(content);
      const arr = !isArr ? [content] : content;
      const sanitized = sanitizeContent(arr);

      // cache the data now
      if (isArr) {
        results[item.name] = results[item.name].concat(sanitized);
      } else {
        results[item.name].push(sanitized[0]);
      }
    }
  }

  return results;
};

export const fetchURL = async(
  url: string,
  retrieveData: (IJob['retrieveData'][0] & {
    retrieverFn?: (el: cheerio.Cheerio, data: string[], $: cheerio.Root) => any
  })[],
  options: IJob['options']
): Promise<{ [key: string]: any[] }> => {
  if (!isValidURL(url)) {
    throw {
      code: 400,
      message: 'requirements are not fullfilled',
      originalErr: 'invalid url',
    };
  }

  // we fetch the page if all is good
  const $ = await fetchParsedHTMLUrl(url, options.isJsRendered);
  return getDomData($, retrieveData, options);

};

export const fetch = async (
  job: IJob,
  writeCallback: (updJob: IJob) => void
) => {
  if (job.resolved) {
    return job;
  }

  const newJob = { ...job };
  newJob.results = newJob.results == null ? {} : newJob.results;
  newJob.options.ignorePages = newJob.options.ignorePages == null ? [] : newJob.options.ignorePages;

  // no reason to continue without sufficient data, resolve it
  if (
    newJob.retrieveData == null ||
    newJob.retrieveData.length === 0 ||
    newJob.queuedUrls == null ||
    newJob.queuedUrls.length === 0
  ) {
    return newJob;
  }

  let time = newJob.options.requestTimer == null ? 500 : newJob.options.requestTimer;
  if (time < 500) { time = 500; }
  newJob.options.requestTimer = time;

  // go url by url crawling
  for (let i = 0; i < newJob.queuedUrls.length; i += 1) {
    const url = newJob.queuedUrls[i];

    if (!isValidURL(url)) {
      continue;
    }

    let found = newJob.options.ignorePages.find(u => u === url) != null;
    if (found) {
      continue;
    }

    const $ = await fetchParsedHTMLUrl(url, newJob.options.isJsRendered);
    const urlResults = await getDomData($, newJob.retrieveData, newJob.options);
    if (getConfig().env !== 'production' && getConfig().env !== 'staging') {
      console.log('fetching:', url, urlResults);
    }

    // merge the old results with the new ones
    const keys = Object.keys(urlResults);
    for (let e = 0; e < keys.length; e += 1) {
      const key = keys[e];

      newJob.results[key] = newJob.results[key] == null ? [] : newJob.results[key];
      for (let f = 0; f < urlResults[key].length; f += 1) {
        const newResult = urlResults[key][f];
        const resFound = newJob.results[key].find(v => v === newResult);
        if (resFound != null) {
          continue;
        }

        newJob.results[key].push(newResult);
      }
    }

    // save onto the file what we got
    newJob.options.ignorePages.push(url);
    writeCallback(newJob);

    // we set a simple throttle here because we don't want to get banned from the pages
    // we're crawling
    await new Promise(resolve => setTimeout(resolve, time));

    // no need to go further without pagination data
    if (newJob.options.pagination?.selector == null) {
      continue;
    }

    const oldQueuedUrlsLen = newJob.queuedUrls.length;
    const pagesResults = await getDomData($, [{
      ...newJob.options.pagination,
      name: 'pagination',
    }], newJob.options);

    // go page by page
    for (let d = 0; d < pagesResults['pagination'].length; d += 1) {
      const page = pagesResults['pagination'][d];
      const newUrl = (new URL(page, url)).href;

      if (!isValidURL(newUrl)) {
        continue;
      }

      // is the url ignored? no need to save it if ignored
      found = newJob.options.ignorePages.find(u => u === newUrl) != null;
      if (found) {
        continue;
      }

      // save to the queued urls of the job, next iteration will pass through this file
      newJob.queuedUrls.push(newUrl);
      writeCallback(newJob);
    }

    // since we have new queued urls because of the pagination we want to break
    // the current iteration and make a new one
    if (oldQueuedUrlsLen !== newJob.queuedUrls.length) {
      return fetch(newJob, writeCallback);
    }
  }

  return newJob;
};
