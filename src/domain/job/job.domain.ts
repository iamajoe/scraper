import * as fs from 'fs';
import * as path from 'path';
import * as mkdirp from 'mkdirp';
import { get as getConfig } from '../_config/config';
import { fetch } from '../crawl/crawl.domain';

export type IJob = {
  resolved?: boolean,
  queuedUrls: string[],
  retrieveData: {
    name: string;
    selector: string;
    retrieverMethod?: 'text'|'html'|'attr';
    retrieverParams?: any;
  }[],
  options: {
    requestTimer?: number;
    wrapperSelector?: string;
    isJsRendered?: boolean;
    ignorePages?: string[];
    pagination?: {
      selector: string;
      retrieverMethod?: 'text'|'html'|'attr';
      retrieverParams?: any;
    }
  },
  results: {
    [key: string]: any[]
  }
};

// -------------------------------------
// methods

// TODO: this probably should be on a repository

export const createJob = async (
  queuedUrls: IJob['queuedUrls'],
  retrieveData: IJob['retrieveData'],
  options: IJob['options']
): Promise<number> => {
  const { queueFolder } = getConfig().services.job;
  mkdirp.sync(queueFolder);

  const id = new Date().getTime();
  const filePath = path.join(queueFolder, `${id}_scrape_job.json`);

  fs.writeFileSync(filePath, JSON.stringify({
    resolved: false,
    queuedUrls,
    retrieveData,
    options,
    results: {}
  }, null, 2));

  return id;
};

export const runQueue = async () => {
  const { queueFolder, queueTimeMs } = getConfig().services.job;
  mkdirp.sync(queueFolder);

  const fileFolder = fs.readdirSync(queueFolder);
  for (let i = 0; i < fileFolder.length; i += 1) {
    if (fileFolder[i].indexOf('.json') === -1) {
      continue;
    }

    try {
      const filePath = path.join(queueFolder, fileFolder[i]);
      let file: IJob = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf-8' }));

      // we need to proceed with this job in this case
      if (!file.resolved && file.queuedUrls.length > 0) {
        const res = await fetch(file, upd => fs.writeFileSync(filePath, JSON.stringify(upd, null, 2)));
        if (res) {
          // all done, lets resolve it and save it
          file = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf-8' }));
          file.resolved = true;
          fs.writeFileSync(filePath, JSON.stringify(file, null, 2));
        }

        // only one in the queue will be handled
        break;
      }
    } catch (err) {
      // DEV: we can safely ignore the error and continue
    }
  }

  // we want to push the next in queue
  return new Promise(resolve => setTimeout(() => resolve(runQueue()), queueTimeMs));
};
