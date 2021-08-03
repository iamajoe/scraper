/* istanbul ignore file */

import * as fs from 'fs';
import * as path from 'path';
import * as request from 'supertest';
import { assert } from 'chai';
import { testInitApp, testClose, testCleanup } from '../../_test-utils';
import { AsyncReturnType } from '../../helpers/interfaces';
import { ServerResponse } from '../../interfaces/server/server';
import { get as getConfig } from '../_config/config';

// --------------------------------------------------
// variables

// --------------------------------------------------
// test suite

describe('job.server', () => {
  let app: AsyncReturnType<ReturnType<typeof testInitApp>>;

  before(async () => (app = (await testInitApp(true))));
  after(async () => {
    await testClose(app);
    app = null as any;
  });
  beforeEach(() => testCleanup(app.repos));
  afterEach(() => testCleanup(app.repos));

  describe('create', () => {
    // TODO: handle the errors

    it('should error without queued urls', async () => {
      const requestParams = {
        retrieveData: [{
          name: 'tags',
          selector: '.tag a',
          retrieverMethod: 'text'
        }],
        options: {
          wrapperSelector: '.tags',
          isJsRendered: true
        }
      };

      // make the request
      const { body }: { body: ServerResponse<string> } = await request(app.server)
        .post(`/v1`)
        .send({
          actions: [{
            service: 'job',
            action: 'create',
            params: requestParams
          }]
        })
        .expect('Content-Type', /json/)
        .expect(200);

      assert.ok(body);
      assert.ok(body.actions);
      assert.equal(body.actions.length, 1);

      assert.equal(body.actions[0].code, 400);
      assert.ok(body.actions[0].err);
      assert.ok(!body.actions[0].data);
    });

    it('should error without retrieve data', async () => {
      const requestParams = {
        queuedUrls: ['https://www.workingnomads.co/jobs?category=development'],
        options: {
          wrapperSelector: '.tags',
          isJsRendered: true
        }
      };

      // make the request
      const { body }: { body: ServerResponse<string> } = await request(app.server)
        .post(`/v1`)
        .send({
          actions: [{
            service: 'job',
            action: 'create',
            params: requestParams
          }]
        })
        .expect('Content-Type', /json/)
        .expect(200);

      assert.ok(body);
      assert.ok(body.actions);
      assert.equal(body.actions.length, 1);

      assert.equal(body.actions[0].code, 400);
      assert.ok(body.actions[0].err);
      assert.ok(!body.actions[0].data);
    });

    it('runs', async () => {
      const requestParams = {
        queuedUrls: ['https://www.workingnomads.co/jobs?category=development'],
        retrieveData: [{
          name: 'tags',
          selector: '.tag a',
          retrieverMethod: 'text'
        }],
        options: {
          wrapperSelector: '.tags',
          isJsRendered: true
        }
      };

      // make the request
      const { body }: { body: ServerResponse<string> } = await request(app.server)
        .post(`/v1`)
        .send({
          actions: [{
            service: 'job',
            action: 'create',
            params: requestParams
          }]
        })
        .expect('Content-Type', /json/)
        .expect(200);

      assert.ok(body);
      assert.ok(body.actions);
      assert.equal(body.actions.length, 1);

      assert.equal(body.actions[0].code, 200);
      assert.ok(!body.actions[0].err);

      const idFile = body.actions[0].data;
      assert.ok(idFile);

      const filePath = path.join(getConfig().services.job.queueFolder, `${idFile}_scrape_job.json`);
      assert.ok(fs.existsSync(filePath));

      // make sure there is the data we need inside
      const data = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf-8'} ));
      assert.ok(data?.queuedUrls);
      assert.equal(Object.keys(data?.queuedUrls)[0], requestParams.queuedUrls[0]);
      assert.equal(data?.retrieveData[0]?.selector, requestParams.retrieveData[0].selector);

      fs.unlinkSync(filePath);
    });
  });
});
