/* istanbul ignore file */

import { assert } from 'chai';
import {
  getContextRoles,
  setNewContextRole,
  getContextAuthId,
  setContextAuthId
} from './context';

// --------------------------------------------------
// variables

// --------------------------------------------------
// test suite

describe('context', () => {
  describe('getContextRoles', () => {
    it('runs even if no roles', async () => {
      const res = getContextRoles({});

      assert.ok(res);
      assert.deepEqual(res, []);
    });

    it('runs', async () => {
      const res = getContextRoles({ archiRoles: ['foo'] });

      assert.ok(res);
      assert.deepEqual(res, ['foo']);
    });
  });

  describe('setNewContextRole', () => {
    it('runs even if no roles', async () => {
      const ctx: { [key: string]: any } = {};
      setNewContextRole(ctx, 'foo');

      assert.ok(ctx);
      assert.ok(ctx.archiRoles);
      assert.deepEqual(ctx.archiRoles, ['foo']);
    });

    it('runs', async () => {
      const ctx: { [key: string]: any } = { archiRoles: ['bar'] };
      setNewContextRole(ctx, 'foo');

      assert.ok(ctx);
      assert.ok(ctx.archiRoles);
      assert.deepEqual(ctx.archiRoles, ['bar', 'foo']);
    });
  });

  describe('getContextAuthId', () => {
    it('runs even if no id', async () => {
      const res = getContextAuthId({});

      assert.notOk(res);
    });

    it('runs', async () => {
      const ctx: { [key: string]: any } = { archiAuthUserId: '10' };
      const res = getContextAuthId(ctx);

      assert.equal(res, ctx.archiAuthUserId);
    });
  });

  describe('setContextAuthId', () => {
    it('runs even if no auth id', async () => {
      const ctx: { [key: string]: any } = {};
      setContextAuthId(ctx, '2');

      assert.ok(ctx);
      assert.equal('2', ctx.archiAuthUserId);
    });

    it('runs', async () => {
      const ctx: { [key: string]: any } = { archiAuthUserId: '10' };
      setContextAuthId(ctx, '1');

      assert.ok(ctx);
      assert.equal('1', ctx.archiAuthUserId);
    });
  });
});
