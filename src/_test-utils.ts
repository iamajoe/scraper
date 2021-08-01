import { init as initCmdApp } from '../src/cmd/main';
import { AsyncReturnType } from '../src/helpers/interfaces';
// import { close as closePostgres } from './infrastructure/postgresql/_postgresql';

// -------------------------------------------------------------------------
// variables

// -------------------------------------------------------------------------
// methods

export const rndKey = () => `${Math.round(Math.random() * 100000)}`;

// ------------------------------------
// V2

export const testInitApp = async (initServer: boolean, runQueue = false) => {
  const app = await initCmdApp({
    hideLogs: true,
    disableServer: !initServer,
    dontRunQueue: !runQueue
  });

  return app;
};

export const testCleanup = async (repos?: Partial<AsyncReturnType<ReturnType<typeof testInitApp>>>['repos']) => {
  if (repos == null) { return; }

  // no need to worry about the error, we're just cleaning up for tests
  const promises = Object.keys(repos).map((r) => {
    if (repos[r] == null || repos[r].cleanAll == null) {
      return;
    }

    return repos[r].cleanAll().catch(() => {})
  });
  await Promise.all(promises);

  // wait a bit more so that the db catches up
  await (new Promise(resolve => setTimeout(resolve, 250)));
};

export const testClose = async (app?: Partial<AsyncReturnType<ReturnType<typeof testInitApp>>>) => {
  if (app == null) {
    return;
  }

  // if (app?.db != null) {
  //   await closePostgres(app.db);
  // }

  if (app.repos != null) {
    await testCleanup(app.repos);
  }

  if (app.close != null) {
    await app.close();
  }
};
