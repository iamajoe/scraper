// -------------------------------------------------------------------------
// variables

export type IRepositories = {
};

let repos: IRepositories;

// -------------------------------------------------------------------------
// methods

const closeRepos = async () => {
};

export const init = async () => {
  await closeRepos();

  return {
    repos,
    close: async () => {
      return await closeRepos();
    },
  };
};

export const get = () => {
  if (repos == null) {
    throw {
      code: 500,
      message: 'internal error',
      originalErr: "respositores weren't initialized",
    };
  }

  return repos;
};
