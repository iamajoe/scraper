import * as fs from 'fs';
import * as path from 'path';
import { ServerAction } from '../../interfaces/server/server';
import { get as getConfig } from '../_config/config';

// -------------------------------------------------------------------------
// variables

let commit = '';
if (fs.existsSync(path.resolve('bin/.commit'))) {
  commit = fs.readFileSync(path.resolve('bin/.commit')).toString();
} else if (fs.existsSync(path.resolve('.commit'))) {
  commit = fs.readFileSync(path.resolve('.commit')).toString();
}

// -------------------------------------------------------------------------
// methods

const serverGet: ServerAction<{}> = async (ctx, repositories, params) => {
  return {
    commit,
    env: getConfig().env,
    host: (getConfig().builtHost == null ? '' : getConfig().builtHost) as string,
  };
};

export const actions: { [key: string]: ServerAction<{}> } = {
  get: serverGet,
};
