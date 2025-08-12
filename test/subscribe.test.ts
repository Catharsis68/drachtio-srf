import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { sippUac, DockerCompose, DockerComposeEnvironment } from './sipp';
import Uas from './scripts/uas';
import debug from 'debug';

const log = debug('drachtio:test');

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('UAS - Subscribe', () => {
  let uas: Uas;
  let env: DockerComposeEnvironment;

  beforeAll(async () => {
    env = await new DockerCompose(
      './test/docker-compose-testbed.yaml'
    ).up();
  }, 20000);

  afterAll(async () => {
    await env.down();
  });

  afterEach(() => {
    if (uas) {
      uas.disconnect();
    }
  });

  it('should accept a subscribe', async () => {
    uas = new Uas();
    uas.on('connected', (dialog) => {
      (dialog as any).destroy();
    });

    await uas.acceptSubscribe();
    await sippUac('uac-subscribe.xml');
  });
});
