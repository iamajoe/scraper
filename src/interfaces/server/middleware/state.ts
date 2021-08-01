import * as Router from 'koa-router';

// --------------------------------------------------
// variables

// --------------------------------------------------
// methods

export const parseState = (): Router.IMiddleware => async (ctx, next) => {
  ctx.state = ctx.state == null ? {} : ctx.state;

  return await next();
};
