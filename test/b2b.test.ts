import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import B2b from './scripts/b2b';
import debug from 'debug';
import { sippUac } from './sipp';

const log = debug('drachtio:test');

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('B2B', () => {
  let b2b: B2b;

  afterEach(() => {
    if (b2b) {
      b2b.disconnect();
    }
  });

  it('handles PRACK for both UAS and UAC', async () => {
    b2b = new B2b();
    await b2b.expectSuccess('sip:sipp-uas-prack', {
      proxyResponseHeaders: ['all'],
      responseHeaders: {
        'Contact': 'sip:foo@localhost',
      },
    });
    await sippUac('uac-prack.xml');
  });

  it('handles INVITE with late sdp', async () => {
    b2b = new B2b();
    await b2b.expectSuccess('sip:sipp-uas', {
      responseHeaders: {
        'Contact': 'sip:foo@localhost',
      },
    });
    await sippUac('uac-nosdp.xml');
  });

  it('handles 200 OK from B', async () => {
    b2b = new B2b();
    await b2b.expectSuccess('sip:sipp-uas', {
      responseHeaders: {
        'Contact': 'sip:foo@localhost',
      },
    });
    await sippUac('uac.xml');
  });

  it('sets tag on 200 OK', async () => {
    b2b = new B2b();
    await b2b.expectSuccess('sip:sipp-uas', {
      responseHeaders: (uacResponse: any) => {
        return { 'To': `tag=${uacResponse.get('Call-ID')}` };
      },
    });
    await sippUac('uac.xml');
  });

  it('CANCELs B leg when CANCEL is received from A', async () => {
    b2b = new B2b();
    await b2b.expectCancel('sip:sipp-uas-cancel');
    await sippUac('uac-cancel.xml');
  });

  it('passes failure', async () => {
    b2b = new B2b();
    await b2b.expectFailure('sip:sipp-uas-404', 404);
    await sippUac('uac-expect-404.xml');
  });

  it('dont pass failure to A if opts.passFailure === false', async () => {
    b2b = new B2b();
    await b2b.expectFailure('sip:sipp-uas-404', 404, 480);
    await sippUac('uac-expect-480.xml');
  });

  it('pass headers from A to B and vice-versa', async () => {
    b2b = new B2b();
    await b2b.passHeaders('sip:sipp-uas');
    await sippUac('uac.xml');
  });

  it('reject if no contact headers in request', async () => {
    b2b = new B2b();
    await b2b.expectFailure('sip:sipp-uas-404', 404, 400);
    await sippUac('uac-expect-400-no-contact-header.xml');
  });

  it('reject if no contact headers in response', async () => {
    b2b = new B2b();
    await b2b.expectFailure('sipp-uas-200-ok-no-contact-cancel', 500, 480);
    await sippUac('uac-expect-480.xml');
  });

  it('can supply headers for response to A', async () => {
    b2b = new B2b();
    await b2b.passHeadersOnResponse('sip:sipp-uas', { 'X-Color': 'green' });
    await sippUac('uac-success-green.xml');
  });

  it('can supply response headers as a function returning an object', async () => {
    b2b = new B2b();
    await b2b.passHeadersOnResponse('sip:sipp-uas', (uacRes: any, headers: any) => {
      return { 'X-Color': 'green' };
    });
    await sippUac('uac-success-green.xml');
  });

  it('pass displayname in From header from A to B', async () => {
    b2b = new B2b();
    await b2b.passHeaders('sip:sipp-uas');
    await sippUac('uac-displayname-from.xml');
  });

  it('provide opts.localSdpA as a function returning a Promise', async () => {
    b2b = new B2b();
    await b2b.sdpAsPromise('sip:sipp-uas');
    await sippUac('uac.xml');
  });

  it('provide opts.localSdpA as a function returning a string', async () => {
    b2b = new B2b();
    await b2b.sdpAsFunctionReturningString('sip:sipp-uas');
    await sippUac('uac.xml');
  });

  it('Srf#createB2BUA(req, res, {uri}) is valid signature', async () => {
    b2b = new B2b();
    await b2b.uriInOpts('sip:sipp-uas');
    await sippUac('uac.xml');
  });

  it('Srf#createB2BUA queues fast requests from B until receiving ACK from A', async () => {
    b2b = new B2b();
    await b2b.immediateReinviteFromB('sip:sipp-uas-fast-reinvite');
    await sippUac('uac-delayed-ack.xml');
  });
});
