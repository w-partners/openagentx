import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERACTION_TYPE_PING,
  INTERACTION_TYPE_APPLICATION_COMMAND,
  RESPONSE_TYPE_PONG,
  RESPONSE_TYPE_CHANNEL_MESSAGE,
  MESSAGE_FLAG_EPHEMERAL,
  getStringOption,
  getNumberOption,
  getBooleanOption,
  ephemeralReply,
  publicReply,
  createDispatcher,
} from '../src/commands.js';
import type { DiscordInteraction } from '../src/commands.js';

describe('option helpers', () => {
  it('reads string options', () => {
    assert.equal(getStringOption([{ name: 'q', type: 3, value: 'hello' }], 'q'), 'hello');
    assert.equal(getStringOption([], 'q'), '');
    assert.equal(getStringOption(undefined, 'q'), '');
  });

  it('reads number options', () => {
    assert.equal(getNumberOption([{ name: 'n', type: 4, value: 42 }], 'n'), 42);
    assert.equal(getNumberOption([{ name: 'n', type: 3, value: '5.5' }], 'n'), 5.5);
    assert.ok(Number.isNaN(getNumberOption([], 'n')));
    assert.ok(Number.isNaN(getNumberOption([{ name: 'n', type: 3, value: 'abc' }], 'n')));
  });

  it('reads boolean options', () => {
    assert.equal(getBooleanOption([{ name: 'b', type: 5, value: true }], 'b'), true);
    assert.equal(getBooleanOption([{ name: 'b', type: 5, value: false }], 'b'), false);
    assert.equal(getBooleanOption([], 'b'), false);
  });
});

describe('reply helpers', () => {
  it('builds ephemeral reply', () => {
    const r = ephemeralReply('hi');
    assert.equal(r.type, RESPONSE_TYPE_CHANNEL_MESSAGE);
    assert.equal(r.data?.content, 'hi');
    assert.equal(r.data?.flags, MESSAGE_FLAG_EPHEMERAL);
  });

  it('builds public reply', () => {
    const r = publicReply('hi');
    assert.equal(r.type, RESPONSE_TYPE_CHANNEL_MESSAGE);
    assert.equal(r.data?.content, 'hi');
    assert.equal(r.data?.flags, undefined);
  });
});

describe('createDispatcher', () => {
  const dispatch = createDispatcher({
    echo: (ctx) => `echo: ${getStringOption(ctx.options, 'msg')}`,
    boom: () => {
      throw new Error('kaboom');
    },
    fancy: () => publicReply('public message'),
  });

  it('responds to PING with PONG', async () => {
    const r = await dispatch({ id: '1', type: INTERACTION_TYPE_PING, token: 't' });
    assert.equal(r.type, RESPONSE_TYPE_PONG);
  });

  it('rejects unknown interaction types', async () => {
    const r = await dispatch({ id: '1', type: 99, token: 't' });
    assert.equal(r.type, RESPONSE_TYPE_CHANNEL_MESSAGE);
    assert.match(r.data?.content ?? '', /Unsupported/);
  });

  it('runs a matching handler with string return', async () => {
    const interaction: DiscordInteraction = {
      id: '1',
      type: INTERACTION_TYPE_APPLICATION_COMMAND,
      token: 't',
      user: { id: 'u1', username: 'tester' },
      data: { name: 'echo', options: [{ name: 'msg', type: 3, value: 'hi' }] },
    };
    const r = await dispatch(interaction);
    assert.equal(r.data?.content, 'echo: hi');
    assert.equal(r.data?.flags, MESSAGE_FLAG_EPHEMERAL);
  });

  it('honors a handler returning a full response', async () => {
    const interaction: DiscordInteraction = {
      id: '1',
      type: INTERACTION_TYPE_APPLICATION_COMMAND,
      token: 't',
      user: { id: 'u1', username: 'tester' },
      data: { name: 'fancy' },
    };
    const r = await dispatch(interaction);
    assert.equal(r.data?.content, 'public message');
    assert.equal(r.data?.flags, undefined);
  });

  it('falls back to unknown handler', async () => {
    const interaction: DiscordInteraction = {
      id: '1',
      type: INTERACTION_TYPE_APPLICATION_COMMAND,
      token: 't',
      data: { name: 'nope' },
    };
    const r = await dispatch(interaction);
    assert.match(r.data?.content ?? '', /Unknown command/);
  });

  it('captures handler errors', async () => {
    const interaction: DiscordInteraction = {
      id: '1',
      type: INTERACTION_TYPE_APPLICATION_COMMAND,
      token: 't',
      data: { name: 'boom' },
    };
    const r = await dispatch(interaction);
    assert.match(r.data?.content ?? '', /kaboom/);
  });

  it('supports custom onError', async () => {
    const customDispatch = createDispatcher(
      { boom: () => { throw new Error('x'); } },
      { onError: () => 'custom error' },
    );
    const r = await customDispatch({
      id: '1',
      type: INTERACTION_TYPE_APPLICATION_COMMAND,
      token: 't',
      data: { name: 'boom' },
    });
    assert.equal(r.data?.content, 'custom error');
  });

  it('extracts userId from member.user', async () => {
    let captured = '';
    const d = createDispatcher({
      who: (ctx) => {
        captured = ctx.userId;
        return 'ok';
      },
    });
    await d({
      id: '1',
      type: INTERACTION_TYPE_APPLICATION_COMMAND,
      token: 't',
      member: { user: { id: 'guild-user', username: 'g' } },
      data: { name: 'who' },
    });
    assert.equal(captured, 'guild-user');
  });
});
