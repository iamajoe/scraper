/* istanbul ignore file */

import * as request from 'supertest';
import { assert } from 'chai';
import { init } from './main';

// --------------------------------------------------
// methods

// --------------------------------------------------
// test suite

describe("main", () => {
  it('runs', async () => {
    const res = await init({ hideLogs: true });
    assert.isOk(res);
    assert.isObject(res);

    if (res != null) {
      assert.isOk(res.close);

      // close the server
      await res.close();
    }
  });
});
