# Testing Guide

## Overview

This project has been modernized with [Vitest](https://vitest.dev/) for unit testing and [Testcontainers](https://testcontainers.com/) for integration testing. The migration maintains backward compatibility with legacy Mocha/Tape tests.

## Quick Start

```bash
# Install dependencies
npm install

# Run all modern tests
npm test

# Run unit tests
npm run test:unit

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

### Unit Tests (`test/unit-tests/`)

Unit tests focus on individual modules without external dependencies:

- **parser.test.ts**: SIP message parsing tests (28 tests ✓)
- **wire-protocol.test.ts**: Wire protocol tests (7 tests, currently skipped)

### Integration Tests (`test/integration/`)

Integration tests use Testcontainers to spin up real Docker containers:

- **basic.test.ts**: Basic integration tests with drachtio-server

**Requirements for Integration Tests:**
- Docker must be installed and running
- Sufficient Docker permissions
- Network access to pull Docker images

### Legacy Tests

Original Mocha/Tape tests are preserved for backward compatibility:

```bash
# Run legacy unit tests
npm run legacy:unittests

# Run legacy integration tests (requires docker-compose)
npm run legacy:test
```

## Writing Tests

### Unit Test Example (Vitest)

```typescript
import { describe, it, expect } from 'vitest';
import MyModule from '../../lib/my-module';

describe('MyModule', () => {
  it('should do something', () => {
    const result = MyModule.doSomething();
    expect(result).toBe(expected);
  });
});
```

### Integration Test Example (Testcontainers)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import Srf from '../../lib/srf';

describe('Integration Tests', () => {
  let container: StartedTestContainer;
  let srf: Srf;

  beforeAll(async () => {
    // Start drachtio-server container
    container = await new GenericContainer('drachtio/drachtio-server:latest')
      .withCommand(['drachtio', '--contact', 'sip:*;transport=udp'])
      .withExposedPorts(9022)
      .withWaitStrategy(Wait.forLogMessage('drachtio ready'))
      .start();

    // Connect to the container
    const port = container.getMappedPort(9022);
    const host = container.getHost();
    
    srf = new Srf();
    await srf.connect({ host, port, secret: 'cymru' });
  }, 60000); // 60 second timeout for container startup

  afterAll(async () => {
    if (srf) srf.disconnect();
    if (container) await container.stop();
  });

  it('should connect successfully', () => {
    expect(srf).toBeDefined();
  });
});
```

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)

The Vitest configuration includes:
- TypeScript support
- Node.js environment
- Code coverage with v8
- Appropriate timeouts for container tests
- Global test APIs (describe, it, expect, etc.)

### TypeScript Configuration

Two TypeScript configurations are provided:
- `tsconfig.json`: Main configuration
- `tsconfig.test.json`: Extended configuration for tests

## Coverage

Generate code coverage reports:

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory:
- HTML report: `coverage/index.html`
- JSON report: `coverage/coverage-final.json`

## Continuous Integration

Tests can be run in CI environments. Integration tests require Docker:

```yaml
# Example GitHub Actions workflow
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:integration
```

## Troubleshooting

### Integration Tests Fail

**Docker not running:**
```
Error: Could not find a valid Docker environment
```
Solution: Ensure Docker is installed and running.

**Port conflicts:**
```
Error: Port 9022 is already in use
```
Solution: Stop any existing drachtio-server instances or wait for tests to clean up.

### Unit Tests Timeout

If tests timeout, you may need to:
1. Increase the timeout in `vitest.config.ts`
2. Check for async operations that aren't properly awaited
3. Ensure proper cleanup in `afterEach` hooks

### Legacy Tests

If legacy tests fail:
```bash
# Reinstall dependencies
npm install

# Try running individual test files
npm run legacy:unittests
```

## Best Practices

1. **Keep tests fast**: Unit tests should run in milliseconds
2. **Isolate tests**: Each test should be independent
3. **Clean up resources**: Always clean up in `afterEach` or `afterAll`
4. **Use descriptive names**: Test names should clearly describe what is being tested
5. **Test behavior, not implementation**: Focus on what the code does, not how
6. **Mock external dependencies**: Unit tests should not depend on external services

## Migration Notes

See [MIGRATION.md](./MIGRATION.md) for detailed information about the migration from Mocha/Tape to Vitest and the addition of Testcontainers.

## Contributing

When adding new tests:
1. Use Vitest for all new tests
2. Place unit tests in `test/unit-tests/`
3. Place integration tests in `test/integration/`
4. Use TypeScript for type safety
5. Follow existing test patterns
6. Ensure tests pass before submitting PRs

```bash
# Before submitting a PR
npm run lint
npm run test:unit
npm run legacy:unittests
```
