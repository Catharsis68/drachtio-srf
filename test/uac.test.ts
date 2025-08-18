import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { sippUac, DockerCompose, DockerComposeEnvironment } from './sipp';
import Srf from '..';
import config from 'config';
import debug from 'debug';

const log = debug('drachtio:test');

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

function connect(srf: Srf) {
  return new Promise<void>((resolve, reject) => {
    srf.connect(config.get('drachtio-sut'));
    srf.on('connect', () => { resolve(); });
  });
}

describe('UAC', () => {
  let srf: Srf;
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
    if (srf) {
      srf.disconnect();
    }
  });

  it('Srf#createUAC sends PRACK when received RSeq', async () => {
    srf = new Srf();
    await connect(srf);
    const uac = await srf.createUAC('sip:sipp-uas-prack', {
      method: 'INVITE',
      headers: {
        To: 'sip:dhorton@sip.drachtio.org',
        From: 'sip:dhorton@sip.drachtio.org'
      }
    });
    uac.destroy();
  });

  it('Srf#createUAC follows 3XX redirect when asked', async () => {
    srf = new Srf();
    await connect(srf);
    const uac = await srf.createUAC('sip:sipp-uas-302', {
      method: 'INVITE',
      headers: {
        To: 'sip:dhorton@sip.drachtio.org',
        From: 'sip:dhorton@sip.drachtio.org'
      },
      followRedirects: true,
      keepUriOnRedirect: true
    });
    uac.destroy();
  });

  it('Srf#createUAC returns a Promise that resolves with the uac dialog', async () => {
    srf = new Srf();
    await connect(srf);
    const uac = await srf.createUAC('sip:sipp-uas', {
      method: 'INVITE',
      headers: {
        To: 'sip:dhorton@sip.drachtio.org',
        From: 'sip:dhorton@sip.drachtio.org'
      }
    });
  });

  it('Srf#createUAC can take a callback that returns the uac dialog', async () => {
    srf = new Srf();
    await connect(srf);
    const uac = await new Promise((resolve, reject) => {
      srf.createUAC('sip:sipp-uas', {
        method: 'INVITE',
        headers: {
          To: 'sip:dhorton@sip.drachtio.org',
          From: 'sip:dhorton@sip.drachtio.org'
        }
      }, (err: any, uac: any) => {
        if (err) return reject(err);
        resolve(uac);
      });
    });
  });

  it('Srf#createUAC accepts opts.callingNumber', async () => {
    srf = new Srf();
    await connect(srf);
    const uac = await srf.createUAC('sip:sipp-uas', {
      method: 'INVITE',
      callingNumber: '12345',
      headers: {
        'Subject': 'sending Contact based on callingNumber'
      }
    });
    uac.destroy();
  });

  it('Srf#createUAC accepts explicit Contact', async () => {
    srf = new Srf();
    await connect(srf);
    const uac = await srf.createUAC('sip:sipp-uas', {
      method: 'INVITE',
      callingNumber: '12345',
      headers: {
        'Subject': 'sending explicit Contact',
        'Contact': 'sip:foo@localhost'
      }
    });
    uac.destroy();
  });

  it('SipDialog will not send overlapping re-invites', async () => {
    srf = new Srf();
    await connect(srf);
    const uac = await srf.createUAC('sip:sipp-uas-reinvite-overlap', {
      method: 'INVITE',
      headers: {
        To: 'sip:dhorton@sip.drachtio.org',
        From: 'sip:dhorton@sip.drachtio.org'
      }
    });
    const p1 = uac.modify(uac.local.sdp);
    const p2 = uac.modify(uac.local.sdp);
    const p3 = uac.modify(uac.local.sdp);
    await Promise.all([p1, p2, p3]);
    uac.destroy();
  });

  it('SipDialog will handle authentication on re-invites', async () => {
    srf = new Srf();
    await connect(srf);
    const uac = await srf.createUAC('sip:172.29.0.25', {
      method: 'INVITE',
      headers: {
        To: 'sip:dhorton@sip.drachtio.org',
        From: 'sip:dhorton@sip.drachtio.org'
      },
      auth: {
        username: 'foo',
        password: 'bar'
      }
    });
    await uac.modify('hold');
    uac.destroy();
  });

  it('Srf#createUAC can handle digest authentication, sending to same server', async () => {
    srf = new Srf();
    await connect(srf);
    await srf.createUAC('sip:sipp-uas-auth', {
      method: 'INVITE',
      headers: {
        To: 'sip:dhorton@sip.drachtio.org',
        From: 'sip:dhorton@sip.drachtio.org'
      },
      auth: {
        username: 'foo',
        password: 'bar'
      }
    });
  });

  it('Srf#createUAC cannot handle digest without authentication', async () => {
    srf = new Srf();
    await connect(srf);
    try {
      await srf.createUAC('sip:sipp-uas-407-no-auth-header', {
        method: 'INVITE',
        headers: {
          To: 'sip:dhorton@sip.drachtio.org',
          From: 'sip:dhorton@sip.drachtio.org'
        },
        auth: {
          username: 'foo',
          password: 'bar'
        }
      });
      expect.fail('should have thrown');
    } catch (err) {
      //
    }
  });

  it('Srf#createUAC can handle digest authentication', async () => {
    srf = new Srf();
    await connect(srf);
    await srf.createUAC('sip:172.29.0.15', {
      method: 'INVITE',
      headers: {
        To: 'sip:dhorton@sip.drachtio.org',
        From: 'sip:dhorton@sip.drachtio.org'
      },
      auth: {
        username: 'foo',
        password: 'bar'
      }
    });
  });

  it('Srf#createUAC can handle bye with digest authentication', async () => {
    srf = new Srf();
    await connect(srf);
    const uac = await srf.createUAC('sip:172.29.0.24', {
      method: 'INVITE',
      headers: {
        To: 'sip:dhorton@sip.drachtio.org',
        From: 'sip:dhorton@sip.drachtio.org'
      },
      auth: {
        username: 'foo',
        password: 'bar'
      }
    });
    await uac.destroy();
  });

  it('Srf#request can handle digest authentication', async () => {
    srf = new Srf();
    await connect(srf);
    await new Promise<void>((resolve, reject) => {
      srf.request('sip:sipp-uas-auth-register', {
        method: 'REGISTER',
        headers: {
          To: 'sip:dhorton@sip.drachtio.org',
          From: 'sip:dhorton@sip.drachtio.org',
          Contact: '<sip:dhorton@localhost>;expires=3600'
        },
        auth: {
          username: 'foo',
          password: 'bar'
        }
      }, (err: any, req: any) => {
        if (err) return reject(err);
        req.on('response', (res: any) => {
          if (res.status === 200) return resolve();
          reject(new Error(`REGISTER was rejected after auth with ${res.status}`));
        });
      });
    });
  });

  it('Srf#request returns a Promise', async () => {
    srf = new Srf();
    await connect(srf);
    await new Promise<void>((resolve, reject) => {
      srf.request('sip:sipp-uas-auth-register', {
        method: 'REGISTER',
        headers: {
          To: 'sip:dhorton@sip.drachtio.org',
          From: 'sip:dhorton@sip.drachtio.org',
          Contact: '<sip:dhorton@localhost>;expires=3600'
        },
        auth: {
          username: 'foo',
          password: 'bar'
        }
      })
        .then((req) => {
          req.on('response', (res) => {
            if (res.status === 200) return resolve();
            reject(new Error(`REGISTER was rejected after auth with ${res.status}`));
          });
        })
        .catch((err) => {
          reject(err);
        });
    });
  });

  it('srf.request accepts opts.uri', async () => {
    srf = new Srf();
    await connect(srf);
    await new Promise<void>((resolve, reject) => {
      srf.request({
        uri: 'sip:sipp-uas-auth-register',
        method: 'REGISTER',
        headers: {
          To: 'sip:dhorton@sip.drachtio.org',
          From: 'sip:dhorton@sip.drachtio.org',
          Contact: '<sip:dhorton@localhost>;expires=3600'
        },
        auth: {
          username: 'foo',
          password: 'bar'
        }
      })
        .then((req) => {
          req.on('response', (res) => {
            if (res.status === 200) return resolve();
            reject(new Error(`REGISTER was rejected after auth with ${res.status}`));
          });
        })
        .catch((err) => {
          reject(err);
        });
    });
  });

  it('Srf#request can handle digest authentication with empty realm', async () => {
    srf = new Srf();
    await connect(srf);
    await new Promise<void>((resolve, reject) => {
      srf.request('sip:sipp-uas-auth-register-no-realm', {
        method: 'REGISTER',
        headers: {
          To: 'sip:dhorton@sip.drachtio.org',
          From: 'sip:dhorton@sip.drachtio.org',
          Contact: '<sip:dhorton@localhost>;expires=3600'
        },
        auth: {
          username: 'foo',
          password: 'bar'
        }
      }, (err: any, req: any) => {
        if (err) return reject(err);
        req.on('response', (res: any) => {
          if (res.status === 200) return resolve();
          reject(new Error(`REGISTER was rejected after auth with ${res.status}`));
        });
      });
    });
  });

  it('Srf#request can be canceled', async () => {
    srf = new Srf();
    await connect(srf);
    await new Promise<void>((resolve, reject) => {
      let inviteSent: any;
      srf.createUAC('sip:sipp-uas-cancel', {
        headers: {
          To: 'sip:dhorton@sip.drachtio.org',
          From: 'sip:dhorton@sip.drachtio.org'
        }
      }, {
        cbRequest: (err, req) => inviteSent = req,
        cbProvisional: (response) => {
          if (response.status < 200) {
            inviteSent.cancel({ headers: { 'Reason': 'SIP;cause=200;text="Call completed elsewhere"' } });
          }
        }
      }, (err: any, dlg: any) => {
        if (err && err.status === 487) resolve();
        else (reject(`expected 487 response to status, got ${err}`));
      });
    });
  });
});
