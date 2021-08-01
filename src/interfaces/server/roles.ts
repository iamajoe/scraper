import * as Router from 'koa-router';
// import { IRepositories } from '../../infrastructure/repositories';
import { setContextAuthId, setNewContextRole, getContextRoles, setContextAuthEmail } from './context';

// --------------------------------------------------
// variables

// EPolicyRole is used to create mappings of access in the model
export enum EPolicyRole {
  // CAUTION: if you want to change the result you also need to change on the "server/roles" file
  //          and on the actual repos (unit and society)
  Any = 'any',
  AuthUser = 'authUser',
  Author = 'author',

  CompanyMember = 'companyMember',
  CompanyAdmin = 'companyAdmin',

  ProjectMember = 'projectMember',
  ProjectAdmin = 'projectAdmin',
}

let cacheRoles: { [key: string]: { roles: string[]; until: number; }} = {};

// -------------------------------------------------------------------------
// methods

export const invalidateRolesCacheForUsers = (userIds: number[], all: boolean = false) => {
  if (all) {
    cacheRoles = {};
    return;
  }

  for (let i = 0; i < userIds.length; i += 1) {
    delete cacheRoles[userIds[i]];
  }
};

const getUserRoles = async (
  userId: number,
  userEmail: string,
  repositories: {}
) => {
  if (userId == null || userId < 0) {
    return [];
  }

  // return the cached if under the right time
  if (cacheRoles[userId] != null && (new Date()).getTime() < cacheRoles[userId].until) {
    return cacheRoles[userId].roles;
  }

  // The way the roles are constructed are like this:
  // - authUser.<USER_ID>
  // - author.<USER_ID>
  const userRoles: string[] = [
    `${EPolicyRole['AuthUser']}`,
    `${EPolicyRole['AuthUser']}.${userId}`,
    `${EPolicyRole['AuthUser']}.${userEmail}`,
    `${EPolicyRole['Author']}.${userId}`
  ];

  // cache
  cacheRoles[userId] = {
    roles: userRoles,
    until: (new Date().getTime()) + 60000 // cache for 1 min
  };

  return cacheRoles[userId].roles;
};

const handleAuth = (ctx: Router.IRouterContext) => {
  const authUserId = (ctx.state as any)?.authUser?._id;
  const authUserEmail = (ctx.state as any)?.authUser?.email;

  setContextAuthId(ctx, authUserId);
  return { _id: authUserId, email: authUserEmail };
};

export const setContextUserRoles = async (
  ctx: Router.IRouterContext,
  repositories: {}
) => {
  const { _id, email } = handleAuth(ctx);

  // no need to go further if we don't have an auth user id
  if (_id == null || _id < 0) {
    return;
  }

  // let emailToBe = email;
  // if (emailToBe == null || emailToBe.length === 0) {
  //   const users = await repositories.user.getByIds([_id], ['email']);
  //   emailToBe = users[0]?.email;
  // }

  // if (emailToBe != null && emailToBe.length > 0) {
  //   setContextAuthEmail(ctx, emailToBe);
  // }

  const roles = await getUserRoles(_id, email, repositories);
  for (let i = 0; i < roles.length; i += 1) {
    setNewContextRole(ctx, roles[i]);

    // LEGACY: old systems are still using an old way of doing things
    //         where we don't have ids in, we need to convert the services
    //         before sending this out right
    setNewContextRole(ctx, roles[i].split('.')[0]);
  }

  return ctx;
};

export const serverSetRoles = (
  repositories: {}
) => {
  const routeFn: Router.IMiddleware = async (ctx, next) => {
    await setContextUserRoles(ctx, repositories);
    return next();
  };

  return routeFn;
};

/**
 * Map the policy roles into a parsed version, mimicking the context roles
 */
const mapPolicyRoles = (
  policyRoles?: EPolicyRole[],
  authId?: number,
  authorId?: number
) => {
  // map the policy roles into a parsed version, mimicking the context roles
  const acceptableRoles = [] as string[];

  if (policyRoles == null) {
    return acceptableRoles;
  }

  for (let c = 0; c < policyRoles.length; c += 1) {
    // DEV: we add the point so we know the end is unique
    const role = policyRoles[c];

    // find out the right societies combos
    if (role.indexOf(EPolicyRole['AuthUser']) === 0) {
      if (authId == null) {
        continue;
      }

      acceptableRoles.push(`${EPolicyRole['AuthUser']}.${authId}`);
    } else if (role.indexOf(EPolicyRole['Author']) === 0) {
      if (authorId == null) {
        continue;
      }

      acceptableRoles.push(`${EPolicyRole['Author']}.${authorId}`);
    }
  }

  return acceptableRoles;
};

export const serverEnforceRoles = (ctx: Router.IRouterContext, roles: (EPolicyRole | string)[], logicOperator: 'OR' | 'AND') => {
  if (roles == null || roles.length === 0) {
    return;
  }

  const ctxRoles = getContextRoles(ctx);
  const rolesFound = roles.filter((role) => {
    const found = ctxRoles.find((r) => r === role);
    return found != null;
  });

  if (rolesFound.length === 0 || (logicOperator === 'AND' && rolesFound.length !== roles.length)) {
    throw {
      code: 401,
      message: 'not authorized',
    };
  }
};
