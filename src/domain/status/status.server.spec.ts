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

describe('status.server', () => {
  let app: AsyncReturnType<ReturnType<typeof testInitApp>>;

  before(async () => (app = (await testInitApp(true))));
  after(async () => {
    await testClose(app);
    app = null as any;
  });
  beforeEach(() => testCleanup(app.repos));
  afterEach(() => testCleanup(app.repos));

  describe('get', () => {
    it('runs', async () => {
      // make the request
      const { body }: { body: ServerResponse<{
        env: string;
        host: string;
        commit: string;
      }> } = await request(app.server)
        .post(`/v1`)
        .send({
          actions: [{
            service: 'status',
            action: 'get',
            params: {}
          }]
        })
        .expect('Content-Type', /json/)
        .expect(200);

      assert.ok(body);
      assert.ok(body.actions);
      assert.equal(body.actions.length, 1);

      assert.equal(body.actions[0].code, 200);
      assert.ok(!body.actions[0].err);
      assert.ok(body.actions[0].data?.env);
      assert.ok(body.actions[0].data?.host);
      assert.ok(body.actions[0].data?.commit);
    });
  });
});
