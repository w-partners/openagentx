import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TelegramBotClient,
  parseCommand,
  createRouter,
} from '../src/bot.js';
import type { TelegramUpdate } from '../src/bot.js';

function mockFetch() {
  const calls: Array<{ url: string; body: unknown }> = [];
  const fn = async (input: string | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ url, body });
    return new Response(JSON.stringify({ ok: true, result: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return { calls, fn: fn as unknown as typeof fetch };
}

describe('TelegramBotClient', () => {
  it('throws when token is missing', () => {
    assert.throws(() => new TelegramBotClient(''), /token is required/);
  });

  it('sends a message with default Markdown', async () => {
    const { calls, fn } = mockFetch();
    const client = new TelegramBotClient('TOKEN', { fetch: fn });
    await client.sendMessage(123, 'hello');
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.url, 'https://api.telegram.org/botTOKEN/sendMessage');
    const body = calls[0]!.body as Record<string, unknown>;
    assert.equal(body.chat_id, 123);
    assert.equal(body.text, 'hello');
    assert.equal(body.parse_mode, 'Markdown');
    assert.equal(body.disable_web_page_preview, true);
  });

  it('includes reply_markup when provided', async () => {
    const { calls, fn } = mockFetch();
    const client = new TelegramBotClient('TOKEN', { fetch: fn });
    await client.sendMessage(1, 'x', {
      reply_markup: { inline_keyboard: [[{ text: 'a', callback_data: 'a' }]] },
    });
    const body = calls[0]!.body as Record<string, unknown>;
    assert.ok(body.reply_markup);
  });

  it('answers callback queries', async () => {
    const { calls, fn } = mockFetch();
    const client = new TelegramBotClient('TOKEN', { fetch: fn });
    await client.answerCallbackQuery('cb1', 'thanks');
    assert.match(calls[0]!.url, /answerCallbackQuery$/);
    const body = calls[0]!.body as Record<string, unknown>;
    assert.equal(body.callback_query_id, 'cb1');
    assert.equal(body.text, 'thanks');
  });

  it('sets and deletes webhook', async () => {
    const { calls, fn } = mockFetch();
    const client = new TelegramBotClient('TOKEN', { fetch: fn });
    await client.setWebhook('https://example.com/hook', 'secret');
    await client.deleteWebhook();
    assert.match(calls[0]!.url, /setWebhook$/);
    const body0 = calls[0]!.body as Record<string, unknown>;
    assert.equal(body0.url, 'https://example.com/hook');
    assert.equal(body0.secret_token, 'secret');
    assert.match(calls[1]!.url, /deleteWebhook$/);
  });

  it('supports a custom apiBase', async () => {
    const { calls, fn } = mockFetch();
    const client = new TelegramBotClient('TOKEN', { fetch: fn, apiBase: 'https://proxy.example' });
    await client.sendMessage(1, 'x');
    assert.equal(calls[0]!.url, 'https://proxy.example/botTOKEN/sendMessage');
  });
});

describe('parseCommand', () => {
  it('returns null for non-command text', () => {
    assert.equal(parseCommand('hello'), null);
    assert.equal(parseCommand(''), null);
  });

  it('parses a bare command', () => {
    assert.deepEqual(parseCommand('/start'), { command: '/start', args: '' });
  });

  it('parses a command with args', () => {
    assert.deepEqual(parseCommand('/search hello world'), { command: '/search', args: 'hello world' });
  });

  it('strips @botname suffix', () => {
    assert.deepEqual(parseCommand('/start@MyBot extra'), { command: '/start', args: 'extra' });
  });

  it('lowercases the command', () => {
    assert.deepEqual(parseCommand('/HELP'), { command: '/help', args: '' });
  });

  it('trims surrounding whitespace', () => {
    assert.deepEqual(parseCommand('  /ping  '), { command: '/ping', args: '' });
  });
});

describe('createRouter', () => {
  it('dispatches commands and passes args', async () => {
    const { fn } = mockFetch();
    const client = new TelegramBotClient('TOKEN', { fetch: fn });
    const log: string[] = [];
    const route = createRouter(client, {
      commands: {
        '/echo': (ctx) => {
          log.push(`echo:${ctx.args}:${ctx.chatId}`);
        },
      },
    });
    const update: TelegramUpdate = {
      message: { chat: { id: 42 }, text: '/echo hi there' },
    };
    await route(update);
    assert.deepEqual(log, ['echo:hi there:42']);
  });

  it('falls back to onText for non-command messages', async () => {
    const { fn } = mockFetch();
    const client = new TelegramBotClient('TOKEN', { fetch: fn });
    const log: string[] = [];
    const route = createRouter(client, {
      onText: (ctx) => {
        log.push(`text:${ctx.text}`);
      },
    });
    await route({ message: { chat: { id: 1 }, text: 'just chatting' } });
    assert.deepEqual(log, ['text:just chatting']);
  });

  it('invokes onUnknownCommand for unmatched /command', async () => {
    const { fn } = mockFetch();
    const client = new TelegramBotClient('TOKEN', { fetch: fn });
    const log: string[] = [];
    const route = createRouter(client, {
      onUnknownCommand: (ctx) => {
        log.push(`unknown:${ctx.message.text}`);
      },
    });
    await route({ message: { chat: { id: 1 }, text: '/nope' } });
    assert.deepEqual(log, ['unknown:/nope']);
  });

  it('routes callback queries by longest prefix', async () => {
    const { fn } = mockFetch();
    const client = new TelegramBotClient('TOKEN', { fetch: fn });
    const log: string[] = [];
    const route = createRouter(client, {
      callbacks: {
        'toggle_': (ctx) => { log.push(`toggle:${ctx.data}`); },
        'toggle_notify_': (ctx) => { log.push(`notify:${ctx.data}`); },
      },
    });
    await route({
      callback_query: {
        id: 'cb1',
        from: { id: 1, first_name: 'A' },
        message: { chat: { id: 9 } },
        data: 'toggle_notify_matching',
      },
    });
    assert.deepEqual(log, ['notify:toggle_notify_matching']);
  });

  it('invokes onError when handler throws', async () => {
    const { fn } = mockFetch();
    const client = new TelegramBotClient('TOKEN', { fetch: fn });
    const errors: string[] = [];
    const route = createRouter(client, {
      commands: {
        '/boom': () => { throw new Error('kaboom'); },
      },
      onError: (err) => {
        errors.push(err instanceof Error ? err.message : 'unknown');
      },
    });
    await route({ message: { chat: { id: 1 }, text: '/boom' } });
    assert.deepEqual(errors, ['kaboom']);
  });

  it('swallows errors silently when no onError is provided', async () => {
    const { fn } = mockFetch();
    const client = new TelegramBotClient('TOKEN', { fetch: fn });
    const route = createRouter(client, {
      commands: { '/boom': () => { throw new Error('x'); } },
    });
    // Should not reject.
    await route({ message: { chat: { id: 1 }, text: '/boom' } });
  });

  it('ignores updates with neither message nor callback', async () => {
    const { fn } = mockFetch();
    const client = new TelegramBotClient('TOKEN', { fetch: fn });
    const route = createRouter(client, { onText: () => { throw new Error('should not run'); } });
    await route({});
  });
});
