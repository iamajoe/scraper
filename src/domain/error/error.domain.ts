// -------------------------------------------------------------------------
// variables

export interface IError {
  authUserId?: number;
  code: number|string;
  message: string;
  stack: string;
  [key: string]: any;
}

// -------------------------------------------------------------------------
// methods

/**
 * Handles the error message
 * @param err
 */
export const handleErrMsg = (err: any): string => {
  // parse the message of the error and save it
  let errMessage: any = err;
  if (err.message != null) {
    errMessage = err.message;
  } else if (err.msg != null) {
    errMessage = err.message;
  } else if (err.errmsg != null) {
    // DEV: message from mongo
    errMessage = err.errmsg;
  }

  if (Array.isArray(errMessage)) {
    errMessage = errMessage.join(' - ');
  } else if (typeof errMessage === 'object') {
    try {
      errMessage = JSON.stringify(errMessage);
    } catch (err) {
      // DEV: ignore, it shouldn't error just because it can't stringify the json
    }
  }

  return errMessage;
};

/**
 * Handles the error code
 * @param err
 */
export const handleErrCode = (err: any): number|string => {
  // try to convert the code to something we know
  let code: any = err.statusCode || err.code || err.status || 500;

  try {
    code = parseInt(code, 10);
  } catch (err) {
    // DEV: ignore, it shouldn't error just because it can't set the code
  }

  return code;
};

/**
 * Handles the error stack
 * @param err
 */
export const handleErrStack = (err: any): string => {
  // parse the stack of the error and save it
  let errStack: any;
  if (err != null && err.stack != null) {
    if (typeof err.stack !== 'string') {
      try {
        errStack = JSON.stringify(err.stack);
      } catch (err) {
        // DEV: ignore, it shouldn't error just because it can't stringify the json
      }
    } else {
      errStack = err.stack;
    }
  }

  return errStack;
};

export const handleErr = (
  err: any = {},
  userId?: string
): IError => {
  let authUserId: string = err.authUserId;
  if ((authUserId == null || authUserId.length === 0) && userId != null) {
    authUserId = userId;
  }

  const msg = `${handleErrMsg(err)}`;
  let code = handleErrCode(err);

  if (msg.indexOf('method not allowed') !== -1) {
    // for some reason "not allowed" middleware is not coming with the right code
    // we force it here
    code = 405;
  } else if (msg.indexOf('is required') !== -1) {
    // "is required" is generally coming from Mongo, most of the times and making 500
    code = 400;
  }

  return {
    ...err,
    authUserId,
    code,
    message: msg,
    stack: `${handleErrStack(err)}`,
    url: err.url,
  };
};

export const appError = async (
  err: any = {},
  repositories: {},
  authUserId?: string
): Promise<any> => {
  const errHandled = handleErr(err, authUserId);
  const errMsg = {
    message: errHandled.message || err,
    from: errHandled.from || 'backend',
    code: errHandled.statusCode || errHandled.code || errHandled.status || 500,
    stack: errHandled.stack,
    authUserId: errHandled.authUserId,
    url: errHandled.url,
    originalErr: errHandled.originalErr,
  };

  // log...
  // DEV: we want to ignore the not alloweds because these are handled
  //      by the middleware
  if (typeof errMsg.message !== 'string' || errMsg.message.indexOf('method not allowed') === -1) {
    console.error(errMsg);
  }

  // we don't want to save any error code that frontend is creating
  if (errMsg.from === 'backend') {
    if (
      (typeof errMsg.code !== 'string' && errMsg.code < 500) ||
      (typeof errMsg.message === 'string' && errMsg.message.indexOf('method not allowed') !== -1) ||
      (typeof errMsg.code === 'string' && errMsg.code[0] === '4')
    ) {
      return;
    }
  }

  // save the error
  // TODO: what to do now??
  // return await repositories.error.createBackendError(errMsg);
};
