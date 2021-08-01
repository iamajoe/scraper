import * as Koa from 'koa';
// import { observe } from '../helpers/prometheus';

// --------------------------------------------------
// variables

// --------------------------------------------------
// methods

/**
 * inits timer middleware
 */
export const init = (logger?: {
  data: (message: string, ...namespace: string[]) => void;
  error: (err: any, ...namespace: string[]) => void;
}) => async (ctx: Koa.Context, next: Function) => {
  let errToBe = null;

  const start = Date.now();

  // try to retrieve the data
  try {
    await next();
  } catch (err) {
    errToBe = err;
  }

  const { appVersion } = (ctx.state as any) as { appVersion?: string };
  const ms = Date.now() - start;

  // we time so we are sure that the data comes in, body status and what not
  // setTimeout(
  //   () => {
  //     // add it to prometheus
  //     if (ctx.request.url !== '/metrics') {
  //       try {
  //         const status = (ctx.body != null && ctx.body.code != null) ? ctx.body.code : ctx.status;
  //         observe(ctx.request.method, (<any>ctx.request).rawPathUrl, ctx.request.url, status, ms);
  //       } catch (err) {
  //         // DEV: we don't want to error because of monitoring
  //         app.logger.error(`- Request: ${ctx.request.method} ${ctx.request.url} - monitor - ${JSON.stringify(err)}`);
  //       }
  //     }
  //   },
  //   5000
  // );

  if (errToBe != null) {
    if (logger != null) {
      logger.error(`- Request: ${ctx.request.method} ${ctx.request.url} - ${ms}ms - app version: ${appVersion}`);
    }
    throw errToBe;
  }

  if (logger != null) {
    logger.data(`- Request: ${ctx.request.method} ${ctx.request.url} - ${ms}ms - app version: ${appVersion}`);
  }
};
