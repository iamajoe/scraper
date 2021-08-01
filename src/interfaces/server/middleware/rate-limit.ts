import * as Koa from 'koa';
import { RateLimit } from 'koa2-ratelimit';
import { get as getConfig } from '../../../domain/_config/config';
import { getContextAuthId } from '../context';

// --------------------------------------------------
// variables

// --------------------------------------------------
// methods

export const init = () => {
  const appConfig = getConfig();

  const config = {
    ...appConfig.security.rateLimit,
    getUserId: async (ctx: Koa.Context) => {
      return getContextAuthId(ctx);
    },
  };

  return RateLimit.middleware(config);
};
