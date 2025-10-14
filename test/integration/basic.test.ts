import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import Srf from '../../lib/srf';

describe('Basic Integration Tests with Testcontainers', () => {
  let drachtioContainer: StartedTestContainer;
  let srf: any;

  beforeAll(async () => {
    // Start drachtio-server container
    drachtioContainer = await new GenericContainer('drachtio/drachtio-server:latest')
      .withCommand(['drachtio', '--contact', 'sip:*;transport=udp', '--loglevel', 'info'])
      .withExposedPorts(9022)
      .withWaitStrategy(Wait.forLogMessage('drachtio ready'))
      .start();

    const port = drachtioContainer.getMappedPort(9022);
    const host = drachtioContainer.getHost();

    // Create SRF instance
    srf = new Srf();
    
    // Connect to drachtio server
    await new Promise<void>((resolve, reject) => {
      srf.on('connect', () => {
        resolve();
      });
      srf.on('error', (err: Error) => {
        reject(err);
      });
      
      srf.connect({
        host,
        port,
        secret: 'cymru'
      });
    });
  }, 60000);

  afterAll(async () => {
    if (srf) {
      srf.disconnect();
    }
    if (drachtioContainer) {
      await drachtioContainer.stop();
    }
  });

  it('should connect to drachtio server', () => {
    expect(srf).toBeDefined();
  });

  it('should be able to use middleware', () => {
    let middlewareCalled = false;
    
    srf.use((req: any, res: any, next: any) => {
      middlewareCalled = true;
      next();
    });

    // Just verify that use() doesn't throw
    expect(middlewareCalled).toBe(false); // Not called until a request comes in
  });

  it('should have parseUri function available', () => {
    expect(typeof Srf.parseUri).toBe('function');
    
    const result = Srf.parseUri('sip:test@example.com');
    expect(result.user).toBe('test');
    expect(result.host).toBe('example.com');
  });
});
