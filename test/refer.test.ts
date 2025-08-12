import { describe, it, expect } from 'vitest';
import { sippUac } from './sipp';
import ReferB2b from './scripts/refer-b2b';
import ReferUas from './scripts/refer-uas';
import debug from 'debug';

const log = debug('drachtio:test');

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

function connect(connectable: any) {
  return new Promise<void>((resolve, reject) => {
    connectable.on('connect', (err: Error) => {
      if (err) reject(err);
      return resolve();
    });
  });
}

describe('REFER tests', () => {
  it('attended transfer success', async () => {
    const b2b = new ReferB2b();
    const uas = new ReferUas();
    await Promise.all([connect(b2b), connect(uas)]);
    const p1 = sippUac('uac-recv-reinvite.xml');
    const p2 = sippUac('uac-recv-reinvite.xml');
    await Promise.all([p1, p2]);
    b2b.disconnect();
    uas.disconnect();
  });
});
