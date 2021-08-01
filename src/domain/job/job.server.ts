import { enforceDataExists } from '../../helpers/enforce-data';
import { ServerAction } from '../../interfaces/server/server';
import { IJob, createJob } from './job.domain';

// -------------------------------------------------------------------------
// variables

export namespace NJob {
  export namespace NCreate {
    export type IRequestParams = {
      queuedUrls: IJob['queuedUrls'],
      retrieveData: IJob['retrieveData'],
      options: IJob['options']
    };
    export type IResponse = {
      list: { [key: string]: any }[];
    };
  }
}

// -------------------------------------------------------------------------
// methods

const serverCreate: ServerAction<NJob.NCreate.IRequestParams> = async (ctx, repositories, params) => {
  enforceDataExists(params, ['queuedUrls', 'retrieveData']);

  return await createJob(
    params.queuedUrls,
    params.retrieveData,
    params.options == null ? {} : params.options
  );
};

export const actions: { [key: string]: ServerAction<any> } = {
  create: serverCreate,
};
