/* istanbul ignore file */

import * as request from 'supertest';
import { assert } from 'chai';
import { testInitApp, testClose, testCleanup } from '../../_test-utils';
import { AsyncReturnType } from '../../helpers/interfaces';
import { ServerResponse } from '../../interfaces/server/server';

// --------------------------------------------------
// variables

// --------------------------------------------------
// test suite

describe('crawl.server', () => {
  let app: AsyncReturnType<ReturnType<typeof testInitApp>>;

  before(async () => (app = (await testInitApp(true))));
  after(async () => {
    await testClose(app);
    app = null as any;
  });
  beforeEach(() => testCleanup(app.repos));
  afterEach(() => testCleanup(app.repos));

  describe('getList', () => {
    // TODO: handle the errors

    it('runs', async () => {
      // make the request
      const { body }: { body: ServerResponse<{
        list: { [key: string]: any }[]
      }> } = await request(app.server)
        .post(`/v1`)
        .send({
          actions: [{
            service: 'crawl',
            action: 'getList',
            params: {
              url: 'https://www.workingnomads.co/jobs?category=development',
              retrieveData: [{
                name: 'tags',
                selector: '.tag a',
                retrieverMethod: 'text'
              }],
              options: {
                wrapperSelector: '.tags',
                isJsRendered: true
              }
            }
          }]
        })
        .expect('Content-Type', /json/)
        .expect(200);

      assert.ok(body);
      assert.ok(body.actions);
      assert.equal(body.actions.length, 1);

      assert.equal(body.actions[0].code, 200);
      assert.ok(!body.actions[0].err);

      const listing = body.actions[0].data?.list as any;
      assert.ok(listing?.tags);
      assert.ok(listing?.tags.length > 0);

      // lets find one or two
      assert.ok(listing.tags.find(t => t === 'web application development'));
      assert.ok(listing.tags.find(t => t === 'telecom'));
      assert.ok(listing.tags.find(t => t === 'security'));
    });
  });
});
