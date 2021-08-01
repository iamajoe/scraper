import { fetchParsedHTMLUrl, isValidURL } from "../../helpers/scrape";

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

export const getList = async (
  url: string,
  retrieveData: {
    name: string;
    selector: string;
    retrieverMethod?: 'text'|'html'|'attr';
    retrieverParams?: any;
    isPagination?: boolean;
    retrieverFn?: (el: cheerio.Cheerio, data: string[], $: cheerio.Root) => any
  }[],
  options: {
    requestTimer?: number;
    wrapperSelector?: string;
    isJsRendered?: boolean;
    ignorePages?: string[];
  }
): Promise<{ [key: string]: any[] }> => {
  if (!isValidURL(url)) {
    throw {
      code: 400,
      message: 'requirements are not fullfilled',
      originalErr: 'invalid url',
    };
  }

  if (retrieveData == null || retrieveData.length === 0) {
    return {};
  }

  // check first if the url is on the ignored list
  options.ignorePages = options.ignorePages == null ? [] : options.ignorePages;
  const found = options.ignorePages.find(u => u === url) != null;
  if (found) {
    return {};
  }

  console.log('FETCHING URL:', url);
  // we fetch the page if all is good
  const $ = await fetchParsedHTMLUrl(url, options.isJsRendered);

  // we ignore the url so that the nested won't pull it again
  // javascript references work in our favor on this one because we keep
  // fetching this with the same objects / options and lists
  options.ignorePages.push(url);

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

      // handle pagination in case we have it
      if (!item.isPagination) {
        continue;
      }

      // go page by page
      for (let d = 0; d < results[item.name].length; d += 1) {
        const page = results[item.name][d];
        const newUrl = (new URL(page, url)).href;

        if (!isValidURL(newUrl)) {
          continue;
        }

        // we set a simple throttle here because we don't want to get banned from the pages
        // we're crawling
        let time = options.requestTimer == null ? 500 : options.requestTimer;
        if (time < 500) {
          time = 500;
        }

        await new Promise(resolve => setTimeout(resolve, time));

        // set the recurring request so we can keep ask for urls until it is done
        const nestedResults = await getList(newUrl, retrieveData, options);

        // merge the old results with the new ones
        const keys = Object.keys(nestedResults);
        for (let e = 0; e < keys.length; e += 1) {
          const key = keys[e];

          results[key] = results[key] == null ? [] : results[key];
          results[key] = [
            ...results[key],
            ...nestedResults[key]
          ];
        }
      }
    }
  }

  return results;
};
