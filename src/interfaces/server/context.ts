// -------------------------------------------------------------------------
// variables

const MAP = {
  roles: 'archiRoles',
  authUserId: 'archiAuthUserId',
  authUserEmail: 'archiAuthUserEmail',
  authUser: 'archiAuthUser',
  resourceIds: 'archiResourceIds',
};

// -------------------------------------------------------------------------
// methods

export const getContextRoles = (ctx: { [key: string]: any }): string[] =>
  ctx[MAP.roles] == null ? [] : ctx[MAP.roles];
export const setNewContextRole = (ctx: { [key: string]: any }, role: string | undefined) => {
  ctx[MAP.roles] = ctx[MAP.roles] == null ? [] : ctx[MAP.roles];

  if (role != null && ctx[MAP.roles].indexOf(role) === -1) {
    ctx[MAP.roles].push(role);
  }
};

export const getContextAuthId = (ctx: { [key: string]: any }): string | undefined => ctx[MAP.authUserId];
export const setContextAuthId = (ctx: { [key: string]: any }, id: string | undefined) => {
  ctx[MAP.authUserId] = id;
};

export const getContextAuthEmail = (ctx: { [key: string]: any }): string | undefined => ctx[MAP.authUserEmail];
export const setContextAuthEmail = (ctx: { [key: string]: any }, email: string | undefined) => {
  ctx[MAP.authUserEmail] = email;
};

export const getContextResourceIds =  (ctx: { [key: string]: any }): string[] => ctx[MAP.resourceIds] == null ? [] : ctx[MAP.resourceIds];
export const setContextResourceIds = (
  ctx: { [key: string]: any },
  ids?: string[],
) => {
  ctx[MAP.resourceIds] = ids == null ? [] : ids.filter(id => id != null && id.length > 0);
};
