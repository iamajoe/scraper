/* istanbul ignore file */
import { assert } from 'chai';
import { rndKey } from '../../_test-utils';
import { getList } from './crawl.domain';

// --------------------------------------------------
// variables

// console.log = () => {};

// --------------------------------------------------
// methods

// --------------------------------------------------
// test suite

describe('crawl.domain', () => {
  describe("getList", () => {
    it('should error if url not valid', async () => {
      const url = rndKey();

      // make the request
      let res;
      let resErr;

      try {
        res = await getList(url, [], {});
      } catch (err) {
        resErr = err;
      }

      // set tests
      assert.isNotOk(res);
      assert.ok(resErr);
      assert.equal(resErr.code, 400);
    });

    it('runs', async () => {
      const url = 'https://www.workingnomads.co/jobs?category=development';

      // make the request
      const listing = await getList(url, [
        {
          name: 'tags',
          selector: '.tag a',
          retrieverFn: el => el.text()
        }
      ], {
        wrapperSelector: '.tags',
        isJsRendered: true
      });
      assert.ok(listing?.tags);
      assert.ok(listing?.tags.length > 0);

      // lets find one or two
      assert.ok(listing.tags.find(t => t === 'web application development'));
      assert.ok(listing.tags.find(t => t === 'telecom'));
      assert.ok(listing.tags.find(t => t === 'security'));
    });
  });
});
