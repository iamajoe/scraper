import * as Router from 'koa-router';

// --------------------------------------------------
// variables

type IObject = { [key: string]: any };

// --------------------------------------------------
// methods

/**
 * handles the request middleware
 */
export const init = (disableBodyConversion = false): Router.IMiddleware => async (ctx, next) => {
  // parse a bit more the data because some data may be coming as
  // something we dont expect or dont want
  const koaKeysToCheck = ['params', 'query', 'body'];
  const nullValues = ['undefined', 'null', 'NULL', undefined, null];
  const booleanTrueValues = ['true', 'TRUE', true];
  const booleanFalseValues = ['false', 'FALSE', false, undefined, null];

  // iterate koa keys
  for (let i = 0; i < koaKeysToCheck.length; i += 1) {
    const koaKey = koaKeysToCheck[i];
    const toCheck: IObject|null = koaKey === 'body' ? ctx.request.body : (<any>ctx)[koaKey];

    // nothing to check
    if (toCheck == null) { continue; }

    // get the object keys to check
    const keysToCheck = Object.keys(toCheck);

    // iterate keys to check
    for (let c = 0; c < keysToCheck.length; c += 1) {
      const key = keysToCheck[c];
      const valToCheck = toCheck[key];

      // iterate the values and find a possible null
      const foundNull = nullValues.filter(nullVal => nullVal === valToCheck);
      if (foundNull.length > 0) {
        delete toCheck[key];
        continue;
      }

      // lets not convert anything on the body if the master app doesn't want it
      if (disableBodyConversion && koaKey === 'body') {
        continue;
      }

      // iterate the values and find a possible true value
      const foundTrueBool = booleanTrueValues.filter(trueVal => trueVal === valToCheck);
      if (foundTrueBool.length > 0) {
        toCheck[key] = true;
        continue;
      }

      // iterate the values and find a possible false value
      const foundFalseBool = booleanFalseValues.filter(falseVal => falseVal === valToCheck);
      if (foundFalseBool.length > 0) {
        toCheck[key] = false;
        continue;
      }

      // could it be a number??
      if (typeof valToCheck === 'string' && !isNaN(<any>valToCheck)) {
        try {
          toCheck[key] = parseInt(valToCheck, undefined);
          continue;
        } catch (err) {
          // nevermind... if it errored, it isn't a number
        }
      }
    }
  }

  return await next();
};
