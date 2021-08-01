import * as Koa from 'koa';
import * as Router from 'koa-router';
// import * as jwt from 'koa-jwt';
import { Server, createServer } from 'http';

import { get as getConfig } from '../../domain/_config/config';
import { IRepositories } from '../../infrastructure/repositories';

// middlewares
import * as bodyParser from 'koa-bodyparser';
import * as cors from '@koa/cors';
import * as helmet from 'koa-helmet';
import { parseState as parseStateMiddleware } from './middleware/state';
import { init as requestMiddleware } from './middleware/request';

import { handleErr } from '../../domain/error/error.domain';
import { serverSetRoles } from './roles';
import { getContextAuthId } from './context';

// nested servers
import { actions as actionsCrawl } from '../../domain/crawl/crawl.server';
import { actions as actionsStatus } from '../../domain/status/status.server';

// --------------------------------------------------
// variables

export type ServerAction<T extends { [key: string]: any; }> = (
  ctx: Router.IRouterContext,
  repositories: IRepositories,
  params: T
) => Promise<any>;

export type ServerActionResponse<T> = {
  service: string;
  params: {
    [key: string]: any;
  };
  ok: boolean;
  code: number;
  action: string;

  data?: T;
  err?: any;
  stack?: string;
};

export type ServerResponse<T> = {
  actions: ServerActionResponse<T>[];
};

const SERVER_ROUTER_FNS: { [key: string]: { [key: string]: ServerAction<any>; } } = {
  crawl: actionsCrawl,
  status: actionsStatus,
};

// --------------------------------------------------
// methods

const getToken = (ctx: Koa.Context): string => {
  if (ctx.header != null && ctx.header.authorization != null && ctx.header.authorization.length > 0) {
    const parts = ctx.header.authorization.trim().split(' ');
    if (parts.length < 2) {
      return parts[0];
    }

    const scheme = parts[0];
    const credentials = parts[1];

    if (/^Bearer$/i.test(scheme)) {
      return credentials;
    }
  }

  if (ctx.query != null && ctx.query.t != null && ctx.query.t.length > 0) {
    return ctx.query.t as string;
  }

  return '';
};

const handleAction = async <T>(
  ctx: Router.IRouterContext,
  repositories: IRepositories,
  action: {
    service: string;
    action: string;
    params: { [key: string]: any; };
  }
): Promise<ServerActionResponse<T>> => {
  const service = action.service;
  const actionName = action.action;
  const params = action.params == null ? {} : action.params;

  return Promise.resolve()
  .then(() => {
    if (
      service == null ||
      actionName == null ||
      SERVER_ROUTER_FNS[service] == null ||
      SERVER_ROUTER_FNS[service][actionName] == null
    ) {
      throw {
        code: 400,
        message: 'bad request',
      };
    }

    return SERVER_ROUTER_FNS[service][actionName](ctx, repositories, params);
  })
  .then(result => ({
    service,
    params,
    ok: true as true,
    code: 200,
    action: actionName,
    data: result,
  }))
  .catch((err) => {
    if (err != null && err.originalErr != null) {
      if (err.originalErr instanceof Error) {
        console.error(err.originalErr.message);
      } else {
        console.error(err.originalErr);
      }
    } else if (err != null && err.message != null) {
      if (err.message instanceof Error) {
        console.error(err.message.message);
      } else {
        console.error(err.message);
      }
    } else {
      console.error(err);
    }

    // DEV: no need for the stack to go to the console, the console
    //      doesn't have a "nice" way to show the stack. we still want
    //      to check the console in though because maybe it is tests (for example)
    //      and we just want to hide the errors in that case
    // TODO: it should check other way this, maybe through errorHandler? -- js, 19-03-2020
    if (err.stack != null) {
      console.error(err.stack);
    }

    const handled = handleErr(err,  getContextAuthId(ctx));
    let code = handled.code < 100 ? 500 : handled.code;
    code = code > 550 ? 500 : (code as any);

    // lets try to make it a number
    try {
      const parsedCode = parseInt(`${code}`, 10);
      if (!isNaN(parsedCode)) {
        code = parsedCode;
      }
    } catch (err) {
      // DEV: just ignore...
    }

    return {
      ...handled,
      service,
      params,
      code: code as number,
      ok: false as false,
      action: actionName,
      data: undefined,
      err: code === 500 ? 'internal server error' : handled.message
    };
  });
};

const handleV1 = (
  repositories: IRepositories
): Router.IMiddleware => async (ctx) => {
  // we need the actions in sync because one can depend on the other
  let p: Promise<any> = Promise.resolve();
  const results = [] as any[];

  try {
    const { actions } = (<any>ctx.request).body as {
      actions: {
        service: string;
        action: string;
        params: { [key: string]: any; };
      }[];
    };
    const parsedActions = actions == null || !Array.isArray(actions) ? [] : actions;

    for (let i = 0; i < parsedActions.length; i += 1) {
      const action = parsedActions[i];
      p = p.then(async () => {
        const result = await handleAction(ctx, repositories, action);
        results.push(result);
      });
    }
  } catch (err) {
    // it should never error in this case
    p = p.then(() => {
      console.error(err);

      results.push({
        ok: false,
        code: 500,
        err: 'internal server error'
      });
    });
  }

  // time to cache the data
  await p;
  ctx.body = { actions: results };
};

export const close = async (server?: Server) => {
  if (server != null) {
    return server.close();
  }
};

export const open = async (server?: Server) => {
  if (server != null) {
    console.info(`Server listening on ${getConfig().builtHost} with environment ${getConfig().env}`);
  }
};

export const setRouter = (
  repositories: IRepositories,
): Router.IMiddleware => async (ctx, next) => {
  ctx.state = ctx.state == null ? {} : ctx.state;
  ctx.state.appVersion = ctx.request.headers['x-app-version'];

  // TODO: need better origins! dangerous in live without tokens

  // api options method (related to fixing cors)
  if (ctx.request.method.toLowerCase() === 'options') {
    ctx.set('Access-Control-Allow-Methods', 'HEAD,POST,OPTIONS');
    ctx.set('Access-Control-Allow-Origin', '*');
    ctx.set('Access-Control-Allow-Headers', ctx.get('Access-Control-Request-Headers'));
    ctx.status = 204;
    return next();
  }

  ctx.set('Content-type', 'application/json');
  ctx.status = 200;

  // we only support these methdods
  if (ctx.request.method.toLowerCase() === 'post') {
    if (ctx.request.url.toLowerCase() === '/v1') {
      await handleV1(repositories)(ctx, next);
      return next();
    }
  }

  const err = {
    // DEV: we want to use 404 so that AWS doesn't degrade because of it
    // code: 405,
    code: 404,
    message: `${ctx.request.method} ${ctx.request.url} - method not allowed`,
    url: ctx.request.url
  };

  ctx.body = {
    ok: false,
    code: err.code,
    err: err.message,
  };
  ctx.status = err.code;

  console.error(err.message, 'middleware', 'initNotAllowed');
};

export const init = async (
  repositories: IRepositories,
) => {
  const lib = new Koa();

  // DEV: our nginx is expecting http
  // app.server = config.protocol === 'https' ? httpsCreateServer({}, app.lib.callback()) : createServer(app.lib.callback());
  const server = createServer(lib.callback());

  lib.use(
    bodyParser({
      formLimit: '5mb',
      textLimit: '5mb',
      jsonLimit: '5mb',
    }),
  );
  lib.use(requestMiddleware(true));

  // ensure no caching of our responses
  lib.use(async (ctx, next) => {
    ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    ctx.set('Expires', '0');

    return next();
  });

  // lib.use(rateLimitMiddleware(app));
  lib.use(helmet());
  lib.use(parseStateMiddleware());
  // lib.use(async (ctx, next) => {
  //   const secret = getConfig().security.authentication.secret;
  //   const middleware = jwt({
  //     secret,
  //     getToken,
  //     key: 'authUser',
  //     passthrough: true,
  //   });

  //   return middleware(ctx, next);
  // });

  lib.use(cors({
    // TODO: should handle those origins better, instead of wildcard
    origin: '*',
    credentials: true,
    allowMethods: 'HEAD,POST,OPTIONS',
  }));

  // time to set all the roles of the user
  lib.use((ctx, next) => {
    return serverSetRoles(repositories)(ctx as any, next);
  });

  lib.use(setRouter(repositories));
  server.listen(getConfig().port).on('error', err => console.error(err));

  return server;
};
