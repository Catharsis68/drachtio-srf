import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { sippUac, DockerCompose, DockerComposeEnvironment } from './sipp';
import Uas from './scripts/uas';
import debug from 'debug';

const log = debug('drachtio:test');

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('UAS', () => {
  let uas: Uas;
  let env: DockerComposeEnvironment;

  beforeAll(async () => {
    env = await new DockerCompose(
      './test/docker-compose-testbed.yaml'
    ).up();
  }, 80000);

  afterAll(async () => {
    await env.down();
  });

  afterEach(() => {
    if (uas) {
      uas.disconnect();
    }
  });

  it('reject INVITE with 503', async () => {
    uas = new Uas();
    await uas.reject(503, {});
    await sippUac('uac-expect-503.xml');
  });

  it('Srf#createUAS returns a promise', async () => {
    uas = new Uas();
    await uas.accept(null, null);
    await sippUac('uac.xml');
  });

  it('Srf#createUAS accepts a callback', async () => {
    uas = new Uas();
    await uas.acceptCb(() => {});
    await sippUac('uac.xml');
  });

  it('Srf#createUAS opts.body is an alias for opts.localSdp', async () => {
    uas = new Uas();
    await uas.accept(null, true);
    await sippUac('uac.xml');
  });

  it('uas dialog created when 200 OK sent', async () => {
    uas = new Uas();
    await uas.accept(null, null);
    const p = new Promise<void>((resolve) => {
      uas.on('connected', (dialog) => {
        (dialog as any).on('destroy', (msg: any, reason: any) => {
          if (reason === 'ACK timeout') {
            resolve();
          }
        });
      });
    });
    await sippUac('uac-drop-all-200.xml');
    await p;
  });

  it('creates a dialog on successful SUBSCRIBE', async () => {
    uas = new Uas();
    await uas.acceptSubscribe();
    const p = new Promise<void>((resolve, reject) => {
      uas.on('connected', async (dlg: any) => {
        expect(dlg.getCountOfSubscriptions()).toEqual(1);
        try {
          await dlg.request({
            method: 'NOTIFY',
            headers: {
              'Event': 'presence',
              'Subscription-State': 'active'
            }
          });
          await dlg.request({
            method: 'NOTIFY',
            headers: {
              'Event': 'presence',
              'Subscription-State': 'terminated'
            }
          });
          expect(dlg.getCountOfSubscriptions()).toEqual(0);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
    await sippUac('uac-subscribe.xml');
    await p;
  });
});
