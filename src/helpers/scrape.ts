// tslint:disable-next-line: import-name
import fetch from 'node-fetch';
// import { parseStringPromise } from 'xml2js';
// import * as htmlparser from 'htmlparser2';
import * as cheerio from 'cheerio';
import * as puppeteer from 'puppeteer';
import { get as getConfig } from '../domain/_config/config';

export type INodeRaw = {
  raw?: string;
  data: string;
  type?: string;
  name?: string;
  attribs?: {
    [key: string]: string;
  };
  children?: INodeRaw[];
};

export const isValidURL = (str: string) => {
  if (str == null || typeof str !== 'string' || str.length === 0) {
    return false;
  }

  const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator

  return !!pattern.test(str);
};

export const fetchUrl = async (url: string, isJsRendered: boolean) => {
  if (!isValidURL(url)) {
    throw {
      code: 400,
      message: 'invalid url'
    };
  }

  const isTesting = getConfig().env === 'tests' || getConfig().env === 'testing';
  let raw = '';

  if (isTesting) {
    // DEV: we don't want to keep asking the bbc service, they'll ban us
    const fixturePath = require('path').resolve(__dirname, './fixtures/working_nomad.html');
    raw = require('fs').readFileSync(fixturePath, 'utf-8');
  } else if (isJsRendered) {
    const browser = await puppeteer.launch({
      headless: true
    });
    const page = await browser.newPage();
    await page.goto(url, {
      waitUntil: 'networkidle0',
    });

    raw = await page.evaluate(() => document.documentElement.innerHTML);

    await browser.close();
  } else {
    try {
      // const corsProxy = `https://cors-anywhere.herokuapp.com/${url}`;
      const response = await fetch(url);
      raw = await response.text();
    } catch (err) {
      if (err.code === 'ENOTFOUND' || err.errno === 'ENOTFOUND') {
        throw {
          code: 404,
          message: 'url not found'
        };
      }

      throw err;
    }
  }

  // lets ignore some elements we know that won't help us
  raw = raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  raw = raw.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '');
  raw = raw.replace(/<link\b[^>]*>[\s\S]*?>/g, '');
  raw = raw.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/g, '');
  raw = raw.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/g, '');
  raw = raw.replace(/<!--[^>]*-->/g, '');

  raw = raw.replace(/lang="[a-zA-Z0-9:;\.\s\(\)\-\,]*"/g, '');
  raw = raw.replace(/style="[a-zA-Z0-9:;\.\s\(\)\-\,]*"/g, '');
  raw = raw.replace(/rel="[a-zA-Z0-9:;\.\s\(\)\-\,]*"/g, '');

  // remove framework specifics, javascript has run, we can now remove it
  // it might hurt us when parsing
  raw = raw.replace(/ng-[a-zA-Z0-9:;\.\s\(\)\-\,]*?=".*?"/g, '');
  raw = raw.replace(/v-[a-zA-Z0-9:;\.\s\(\)\-\,]*?=".*?"/g, '');

  return raw;
};

export const convertStrToDOM = (raw: string): cheerio.Root => {
  return cheerio.load(raw);
  // try  {
  //   const dom = htmlparser.parseDocument(raw, {});
  //   const $ = cheerio.load(dom as any);

  //   return $;
  // } catch (errA) {
  //   try {
  //     // TODO: maybe listen to the error better
  //     return cheerio.load(raw);
  //   } catch (errB) {
  //     // TODO: maybe listen to the error better
  //     return cheerio.load('<html></html>');
  //   }
  // }
};

export const fetchParsedHTMLUrl = async (url: string, isJsRendered?: boolean) => {
  try {
    const raw = await fetchUrl(url, isJsRendered != null ? isJsRendered : false);
    return convertStrToDOM(raw);
  } catch (err) {
    // it might've already been treated
    if (err.code != null && err.message != null) {
      throw err;
    }

    throw {
      code: 400,
      message: 'invalid data',
      originalErr: err,
    };
  }
};

export const getDomain = (url: string) => {
  let newUrl = url.replace(/(https?:\/\/)?(www.)?/i, '');
  newUrl = newUrl.split('/')[0];

  const arr = newUrl.split('.');
  if (arr.length < 1) {
    return newUrl;
  }

  return arr[arr.length - 2];
}
