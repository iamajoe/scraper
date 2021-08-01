import * as Router from 'koa-router';
import { handleErr } from '../../domain/error/error.domain';
import { getContextAuthId } from './context';

// --------------------------------------------------
// variables

type IGlobalResponse = {
  ok: boolean;
  code: number;
  err: any;
  requestUrl: string;
};

// DEV: based on "htmlResponse.html"
const HTML_RESPONSE = `
<!DOCTYPE html>
<html>
  <head>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet">
    <meta http-equiv="Content-Type" content="text/html" charset="utf-8"/>
    <meta charset="utf-8">
    <title>Crawl</title>
  </head>
  <body style="margin: 0; font-family: 'Roboto',Helvetica,Arial,Lucida,sans-serif; font-weight: 400">
    TODO
  </body>
</html>
`;

// --------------------------------------------------
// methods

const handleErrResponse = (
  err: any,
  env: string,
  ctx: Router.IRouterContext,
  errorHandler?: ((err: any, ctx: any) => Promise<any>) | undefined,
  logger?: {
    verbose: Function;
    error: Function;
  },
) => {
  if (logger != null && logger.verbose != null) {
    logger.verbose('about to set response error', 'response', 'initErr');
  }

  // inform the errors
  if (errorHandler != null) {
    errorHandler(err, ctx);
  } else if (logger != null && logger.error != null) {
    if (err != null && err.originalErr != null) {
      if (err.originalErr instanceof Error) {
        logger.error(err.originalErr.message);
      } else {
        logger.error(err.originalErr);
      }
    } else if (err != null && err.message != null) {
      if (err.message instanceof Error) {
        logger.error(err.message.message);
      } else {
        logger.error(err.message);
      }
    } else {
      logger.error(err);
    }
  }

  // DEV: no need for the stack to go to the logger, the logger
  //      doesn't have a "nice" way to show the stack. we still want
  //      to check the logger in though because maybe it is tests (for example)
  //      and we just want to hide the errors in that case
  // TODO: it should check other way this, maybe through errorHandler? -- js, 19-03-2020
  if (err.stack != null && logger != null) {
    console.error(err.stack);
  }

  const handledErr = handleErr(err, getContextAuthId(ctx));
  let code = handledErr.code < 100 ? 500 : handledErr.code;
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
    code,
    ok: false,
    err: code === 500 ? 'internal server error' : handledErr.message
  };
};

export const handleResponse = (
  env: string,
  errorHandler?: ((err: any, ctx: any) => Promise<any>) | undefined,
  logger?: {
    verbose: Function;
    error: Function;
  },
): Router.IMiddleware => async (ctx, next) => {
  // it was already handled
  if (ctx.state.fulfilled) {
    return;
  }

  if (logger != null) {
    logger.verbose('about to set response', 'response', 'init');
  }

  const bodyResponse = <IGlobalResponse & { data: null; }>{
    ok: true,
    code: 200,
    requestUrl: ctx.request.url,
    data: null,
    err: null
  };

  try {
    await next();

    // it could have been handled with next
    if (ctx.state.fulfilled) {
      return;
    }

    ctx.body = ctx.body != null ? ctx.body : true;
    const rawBody = ctx.body as { [key: string]: any };
    let data = rawBody.data != null ? rawBody.data : rawBody;

    // we don't want a nested level for data
    if (data != null && data.data != null && typeof data.data === 'object' && Object.keys(data.data).length > 0) {
      data = data.data;
    }

    bodyResponse.data = data;
  } catch (err) {
    const newResponse = handleErrResponse(err, env, ctx, errorHandler, logger);
    bodyResponse.ok = newResponse.ok;
    bodyResponse.code = newResponse.code as any;
    bodyResponse.err = newResponse.err;
  }

  // we don't want to change the status if already a specific one
  if (ctx.status !== 400 && ctx.status !== 429) {
    // time to actually populate the response
    ctx.status = typeof bodyResponse.code !== 'number' ? 500 : bodyResponse.code;
  }

  // check what type we should be sending out
  if (ctx.query.format === 'html') {
    ctx.set('Content-type', 'text/html');
    ctx.body = HTML_RESPONSE.replace('[% tmpl_content %]', `${bodyResponse.data}`);
  } else {
    ctx.set('Content-type', 'application/json');
    ctx.body = bodyResponse;
  }

  // all went through, set a flag so that other utils know they can stop
  ctx.state.fulfilled = true;
};
