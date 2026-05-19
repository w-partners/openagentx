import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldNotify,
  formatEvent,
  escapeMarkdownV2,
  escapeHtml,
} from '../src/notifications.js';
import type { NotificationPreferences } from '../src/notifications.js';

const allOn: NotificationPreferences = {
  notifications_enabled: true,
  notify_matching: true,
  notify_auctions: true,
  notify_orders: true,
  notify_earnings: true,
  notify_chain: true,
};

const allOff: NotificationPreferences = {
  notifications_enabled: false,
  notify_matching: false,
  notify_auctions: false,
  notify_orders: false,
  notify_earnings: false,
  notify_chain: false,
};

describe('shouldNotify', () => {
  it('returns false when master switch is off', () => {
    assert.equal(
      shouldNotify({ ...allOn, notifications_enabled: false }, {
        type: 'matching_request', title: 't', category: 'c', urgency: 'low', requestId: '1',
      }),
      false,
    );
  });

  it('respects matching flag', () => {
    assert.equal(
      shouldNotify({ ...allOff, notifications_enabled: true, notify_matching: true }, {
        type: 'matching_accepted', providerName: 'p', requestId: '1',
      }),
      true,
    );
    assert.equal(
      shouldNotify({ ...allOff, notifications_enabled: true, notify_matching: false }, {
        type: 'matching_accepted', providerName: 'p', requestId: '1',
      }),
      false,
    );
  });

  it('respects auction flag', () => {
    assert.equal(
      shouldNotify({ ...allOff, notifications_enabled: true, notify_auctions: true }, {
        type: 'auction_bid', bidderName: 'b', offerPrice: 10, auctionId: '1',
      }),
      true,
    );
  });

  it('respects chain flag', () => {
    assert.equal(
      shouldNotify({ ...allOff, notifications_enabled: true, notify_chain: true }, {
        type: 'chain_step', chainName: 'c', stepName: 's', stepIndex: 0, status: 'completed',
      }),
      true,
    );
  });

  it('always notifies agent_created (when master switch on)', () => {
    assert.equal(
      shouldNotify({ ...allOff, notifications_enabled: true }, {
        type: 'agent_created', agentName: 'a', agentId: '1',
      }),
      true,
    );
  });
});

describe('formatEvent', () => {
  it('formats matching_request with urgency emoji', () => {
    const out = formatEvent({
      type: 'matching_request', title: 'Task', category: 'dev', urgency: 'urgent', requestId: 'abcdefghij',
    });
    assert.match(out, /🟠/);
    assert.match(out, /Title: Task/);
    assert.match(out, /\/accept abcdefgh/);
  });

  it('formats auction_new with budget', () => {
    const out = formatEvent({
      type: 'auction_new', title: 'X', category: 'c', budget: 99.5, auctionId: 'abc12345',
    });
    assert.match(out, /\$99\.50/);
    assert.match(out, /\/bid abc12345/);
  });

  it('formats earning', () => {
    const out = formatEvent({ type: 'earning', amount: 5, source: 'gig' });
    assert.match(out, /\$5\.00/);
    assert.match(out, /gig/);
  });

  it('formats chain_step status icons', () => {
    assert.match(
      formatEvent({ type: 'chain_step', chainName: 'c', stepName: 's', stepIndex: 0, status: 'completed' }),
      /✅/,
    );
    assert.match(
      formatEvent({ type: 'chain_step', chainName: 'c', stepName: 's', stepIndex: 1, status: 'failed' }),
      /❌/,
    );
    assert.match(
      formatEvent({ type: 'chain_step', chainName: 'c', stepName: 's', stepIndex: 1, status: 'running' }),
      /🔄/,
    );
  });

  it('formats low_balance', () => {
    const out = formatEvent({ type: 'low_balance', balance: 1.23 });
    assert.match(out, /\$1\.23/);
  });
});

describe('escape helpers', () => {
  it('escapes MarkdownV2 special characters', () => {
    assert.equal(escapeMarkdownV2('a.b_c*d'), 'a\\.b\\_c\\*d');
    assert.equal(escapeMarkdownV2('[link](url)'), '\\[link\\]\\(url\\)');
  });

  it('escapes HTML entities', () => {
    assert.equal(escapeHtml('<b>&</b>'), '&lt;b&gt;&amp;&lt;/b&gt;');
  });
});
