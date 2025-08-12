import { describe, it, expect, afterEach } from 'vitest';
import { sippUac } from './sipp';
import Proxy from './scripts/proxy';
import debug from 'debug';

const log = debug('drachtio:test');

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('proxy', () => {
  let proxy: Proxy;

  afterEach(() => {
    if (proxy) {
      proxy.disconnect();
    }
  });

  it('srf.proxyRequest returns a Promise', async () => {
    proxy = new Proxy();
    await proxy.proxyPromise('sipp-uas');
    await sippUac('uac-proxy.xml');
  });

  it('srf.proxyRequest accepts a callback', async () => {
    proxy = new Proxy();
    await proxy.proxyCb('sipp-uas');
    await sippUac('uac-proxy.xml');
  });
});
