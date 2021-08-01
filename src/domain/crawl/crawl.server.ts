import { enforceDataExists } from '../../helpers/enforce-data';
import { ServerAction } from '../../interfaces/server/server';
import { getList } from './crawl.domain';

// -------------------------------------------------------------------------
// variables

export namespace NScrape {
  export namespace NGetList {
    export type IRequestParams = {
      url: string,
      retrieveData: {
        name: string;
        selector: string;
        retrieverMethod?: 'text'|'html'|'attr'; // TODO: implement more...
        retrieverParams?: any;
        isPagination?: boolean;
      }[],
      options?: {
        requestTimer?: number;
        wrapperSelector?: string;
        isJsRendered?: boolean;
        ignorePages?: string[];
      }
    };
    export type IResponse = {
      list: { [key: string]: any }[];
    };
  }
}

// -------------------------------------------------------------------------
// methods

const serverGetList: ServerAction<NScrape.NGetList.IRequestParams> = async (ctx, repositories, params) => {
  enforceDataExists(params, ['url', 'retrieveData']);

  return {
    list: await getList(
      params.url,
      params.retrieveData,
      params.options == null ? {} : params.options
    )
  };
};

export const actions: { [key: string]: ServerAction<any> } = {
  getList: serverGetList,
};
