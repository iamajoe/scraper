import { Server } from 'http';

// core
import { init as initConfig } from '../domain/_config/config';

import { init as initServer, open as openServer, close as closeServer } from '../interfaces/server/server';
import { init as initRepos } from '../infrastructure/repositories';
import { runQueue } from '../domain/job/job.domain';


export const init = async (
  options: {
    hideLogs: boolean;
    socketNamespace?: string;
    disableServer?: boolean;
    disableLib?: boolean;
    dontRunQueue?: boolean;
    bypassConfig?: Partial<ReturnType<typeof initConfig>>;
  } = { hideLogs: false },
) => {
  const config = initConfig(options.bypassConfig);

  // override console when under testing
  if (config.env === 'testing') {
    // console.log = () => {};
    console.error = () => {};
    console.info = () => {};
  }

  const reposData = await initRepos();
  let server: Server | undefined;

  const app = {
    config,
    server,
    repos: reposData.repos
  };

  if (!options.disableServer && !options.disableLib) {
    server = await initServer(reposData.repos);
    app.server = server;
  }

  if (!options.dontRunQueue) {
    // TODO: need to read the errors coming from the queue as well
    runQueue();
  }

  openServer(server);

  return {
    app,

    config,
    server,
    repos: reposData.repos,

    close: async () => {
      if (server != null) {
        await closeServer(server);
      }

      await reposData.close();
    },
  };
};
