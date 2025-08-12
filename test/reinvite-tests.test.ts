import { describe, it, expect, afterEach } from 'vitest';
import { sippUac } from './sipp';
import Uas from './scripts/uas';
import debug from 'debug';

const log = debug('drachtio:test');

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('reinvite tests', () => {
  let uas: Uas;

  afterEach(() => {
    if (uas) {
      uas.disconnect();
    }
  });

  it('res#send of 200 OK supports fnAck', async () => {
    uas = new Uas();
    const p = uas.handleReinviteScenario();
    await sippUac('uac-send-reinvite-no-sdp.xml');
    await p;
  });
});
