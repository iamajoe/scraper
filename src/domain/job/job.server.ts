import Ajv from 'ajv';
import { ServerAction } from '../../interfaces/server/server';
import { IJob } from '../crawl/crawl.domain';
import { createJob } from './job.domain';

// -------------------------------------------------------------------------
// variables

export namespace NJob {
  export namespace NCreate {
    export type IRequestParams = {
      queuedUrls: string[];
      retrieveData: IJob['retrieveData'];
      options: IJob['options'];
    };
    export type IResponse = any;
  }
}

const ajv = new Ajv();

// -------------------------------------------------------------------------
// methods

const validateCreate = ajv.compile({
  type: "object",
  properties: {
    queuedUrls: { type: "array", minItems: 1, items: { type: "string" } },
    retrieveData: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          selector: { type: "string" },
          retrieverMethod: { type: "string", nullable: true },
          retrieverParams: {
            type: ["number", "integer", "string", "boolean", "array", "object", "null"],
            nullable: true
          }
        },
        required: ["name", "selector"],
        additionalProperties: false
      }
    },
    options: {
      type: "object",
      properties: {
        requestTimer: { type: "number", nullable: true },
        wrapperSelector: { type: "string", nullable: true },
        isJsRendered: { type: "boolean", nullable: true },
        ignorePages: { type: "array", items: { type: "string" }, nullable: true },
        pagination: {
          type: "object",
          properties: {
            selector: { type: "string" },
            retrieverMethod: { type: "string", nullable: true },
            retrieverParams: {
              type: ["number", "integer", "string", "boolean", "array", "object", "null"],
              nullable: true
            }
          },
          required: ["selector"],
          additionalProperties: false
        }
      }
    }
  },
  required: ["queuedUrls", "retrieveData"],
  additionalProperties: false
});
const serverCreate: ServerAction<NJob.NCreate.IRequestParams> = async (ctx, repositories, params) => {
  const valid = validateCreate(params);
  if (!valid) {
    throw {
      code: 400,
      message: 'requirements are not fullfilled',
      originalErr : JSON.stringify(validateCreate.errors, null, 2)
    }
  }

  const queuedUrls: { [key: string]: boolean; } = {};
  for (let i = 0; i < params.queuedUrls.length; i += 1) {
    // "false" means that it isn't resolved, we want to fetch it
    queuedUrls[params.queuedUrls[i]] = false;
  }

  return await createJob(
    queuedUrls,
    params.retrieveData,
    params.options == null ? {} : params.options
  );
};

export const actions: { [key: string]: ServerAction<any> } = {
  create: serverCreate,
};
