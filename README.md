# drachtio-srf ![Build Status](https://github.com/drachtio/drachtio-srf/workflows/CI/badge.svg)

[![drachtio logo](http://davehorton.github.io/drachtio-srf/img/definition-only-cropped.png)](https://drachtio.org)

Welcome to the Drachtio Signaling Resource framework (drachtio-srf), the Node.js framework for SIP Server applications.

Please visit [drachtio.org](https://drachtio.org) for getting started instructions, API documentation, sample apps and more!

*Example proxy*
```js
  const Srf = require('drachtio-srf');
  const srf = new Srf();

  srf.connect({
    host: '192.168.32.5',
    port: 9022,
    secret: 'cymru'
  }) ;
  
  srf.invite((req, res) => {
    srf.proxyRequest(req, ['sip.example1.com', 'sip.example2.com'], {
      recordRoute: true,
      followRedirects: true,
      provisionalTimeout: '2s'
    }).then((results) => {
      console.log(JSON.stringify(result)); 
      // {finalStatus: 200, finalResponse:{..}, responses: [..]}
    });
  });
  ```
*Example Back-to-back user agent*
  ```js
  const Srf = require('drachtio-srf');
  const srf = new Srf();

  srf.connect({
    host: '192.168.32.5',
    port: 9022,
    secret: 'cymru'
  }) ;
    const Srf = require('drachtio-srf');
  const srf = new Srf();

  srf.invite((req, res) => {
    srf.createB2BUA('sip:1234@10.10.100.1', req, res, {localSdpB: req.body})
      .then(({uas, uac}) => {
        console.log('call connected');

        // when one side terminates, hang up the other
        uas.on('destroy', () => { uac.destroy(); });
        uac.on('destroy', () => { uas.destroy(); });
        return;
      })
      .catch((err) => {
        console.log(`call failed to connect: ${err}`);
      });
  });
  ```
*Example sending a request (OPTIONS ping)*
  ```js
  const Srf = require('drachtio-srf');
  const srf = new Srf();

  srf.connect({host: '127.0.0.1', port: 9022, secret: 'cymru'});

  srf.on('connect', (err, hp) => {
    if (err) return console.log(`Error connecting: ${err}`);
    console.log(`connected to server listening on ${hp}`);

    setInterval(optionsPing, 10000);
  });

  function optionsPing() {
    srf.request('sip:tighthead.drachtio.org', {
      method: 'OPTIONS',
      headers: {
        'Subject': 'OPTIONS Ping'
      }
    }, (err, req) => {
      if (err) return console.log(`Error sending OPTIONS: ${err}`);
      req.on('response', (res) => {
        console.log(`Response to OPTIONS ping: ${res.status}`);
      });
    });
  }
  ```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing and [Testcontainers](https://testcontainers.com/) for integration tests.

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests (requires Docker)
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Legacy Tests

The original Mocha/Tape tests are still available:

```bash
# Run legacy integration tests
npm run legacy:test

# Run legacy unit tests
npm run legacy:unittests
```

### Integration Tests

Integration tests use Testcontainers to automatically spin up Docker containers with drachtio-server. This ensures tests run in an isolated, reproducible environment.

Requirements:
- Docker must be installed and running
- Sufficient permissions to create Docker containers

For more information on the migration to modern testing tools, see [MIGRATION.md](./MIGRATION.md).
