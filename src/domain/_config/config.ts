import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// --------------------------------------------------
// variables

export interface IConfig {
  env: string;
  protocol: 'http'|'https';
  host: string;
  port: number;
  timeout: number;

  db: {
    host: string;
    name: string;
    port?: number;
    username?: string;
    password?: string;

    tunnel?: {
      enable?: boolean;

      // ssh settings
      host: string;
      port?: number;
      username?: string;
      password?: string;

      // db settings from inside the ssh
      dbHost: string;
      dbPort: number;
    };
  };

  services: {
    job: {
      queueTimeMs: number;
      queueFolder: string;
    },
    configs: {
      users: {
        resetPasswordSecret: string;
        verifyUserSecret: string;
      };
    };
  };

  security: {
    rateLimit?: { [key: string]: any };
    authentication: {
      secret: string;
    };
  };

  // these are built by the config itself...
  builtHost?: string;
  gitCommit: string;
}

const ENV = process.env.NODE_ENV == null ? (process.env.ENV == null ? 'development' : process.env.ENV) : process.env.NODE_ENV;
let singleton: IConfig;

// --------------------------------------------------
// methods

const setDefault = (original: Partial<IConfig>|null|undefined = null) => {
  // DEV: clone deep so we don't change by reference
  const parsedConfig = <IConfig>(original == null ? {} : original);

  parsedConfig.env = ENV;
  parsedConfig.protocol = parsedConfig.protocol == null ? 'http' : parsedConfig.protocol;
  parsedConfig.host = parsedConfig.host == null ? 'localhost' : parsedConfig.host;
  parsedConfig.port = parsedConfig.port == null ? 4040 : parsedConfig.port;
  parsedConfig.timeout = parsedConfig.timeout == null ? 120000 : parsedConfig.timeout;

  parsedConfig.db = parsedConfig.db == null ? <any>{} : parsedConfig.db;
  parsedConfig.db.host = parsedConfig.db.host == null ? 'localhost' : parsedConfig.db.host;
  parsedConfig.db.name = parsedConfig.db.name == null ? 'boappa_project' : parsedConfig.db.name;

  parsedConfig.security = parsedConfig.security == null ? <any>{} : parsedConfig.security;

  if (parsedConfig.security.authentication != null && parsedConfig.security.authentication.secret == null) {
    parsedConfig.security.authentication.secret = uuidv4();
  }

  parsedConfig.services.job = parsedConfig.services.job == null ? {
    queueTimeMs: 0,
    queueFolder: '',
  } : parsedConfig.services.job;

  if (
    parsedConfig.services.job.queueFolder == null || parsedConfig.services.job.queueFolder?.length === 0
  ) {
    parsedConfig.services.job.queueFolder = `${process.cwd()}/queue`;
  }

  if (
    parsedConfig.services.job.queueTimeMs == null || parsedConfig.services.job.queueTimeMs < 60000
  ) {
    parsedConfig.services.job.queueTimeMs = 60000;
  }

  return parsedConfig;
};

const parseAndCompute = (configToBe: IConfig) => {
  configToBe.port = parseInt(`${configToBe.port == null ? 0 : configToBe.port}`, 10);
  configToBe.db.port = parseInt(`${configToBe.db.port == null ? 0 : configToBe.db.port}`, 10);

  // computed builtHost
  if (configToBe.host.indexOf('localhost') === -1) {
    configToBe.builtHost = `${configToBe.protocol}://${configToBe.host}`;
  } else {
    configToBe.builtHost = `${configToBe.protocol}://${configToBe.host}:${configToBe.port}`;
  }

  return configToBe;
};

export const reset = () => {
  singleton = null as any;
};

export const init = (bypassConfig?: Partial<IConfig>) => {
  // we need the default config
  const defaultConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../config/default.json')).toString());

  // time to get the env config if we have it
  let envConfig = {} as { [key: string]: any };
  const envPath = path.resolve(__dirname, `../../../config/${process.env.NODE_ENV}.json`);
  if (fs.existsSync(envPath)) {
    envConfig = JSON.parse(fs.readFileSync(envPath).toString());
  }

  // DEV: clone deep so we don't change by reference
  const parsedConfig: IConfig = {
    ...(defaultConfig == null ? {} : defaultConfig),
    ...(envConfig == null ? {} : envConfig)
  };

  // handle bypass
  if (bypassConfig != null) {
    // make sure we have all the keys of the bypass in
    // that is the reason we don't use a spread
    const bypassKeys = Object.keys(bypassConfig);
    for (let i = 0; i < bypassKeys.length; i += 1) {
      parsedConfig[bypassKeys[i]] = bypassConfig[bypassKeys[i]];
    }
  }

  singleton = parseAndCompute(setDefault(parsedConfig));

  // get the commit in
  const commitSrc = path.resolve(__dirname, '../../../.commit');
  if (fs.existsSync(commitSrc)) {
    const commit = fs.readFileSync(commitSrc);
    singleton.gitCommit = commit.toString();
  } else {
    singleton.gitCommit = singleton.gitCommit == null ? '' : singleton.gitCommit;
  }

  return singleton;
};

export const get = () => {
  if (singleton == null) {
    return init();
  }

  return singleton;
};
