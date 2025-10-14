# Migration to Modern Testing Stack

This document describes the migration of the drachtio-srf package to use modern testing tools.

## Testing Framework Migration

### Vitest

The project has been migrated from Mocha/Tape to [Vitest](https://vitest.dev/), a modern, fast testing framework built on top of Vite.

#### Benefits

- **Faster test execution**: Vitest uses Vite's transformation pipeline for faster startup and execution
- **Better TypeScript support**: Native TypeScript support without additional configuration
- **Modern API**: Compatible with Jest API, making it familiar to most developers
- **Watch mode**: Built-in watch mode with smart re-running
- **Coverage**: Built-in code coverage with v8 or Istanbul
- **ESM support**: Native ESM support

#### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only (requires Docker)
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Testcontainers

Integration tests now use [Testcontainers](https://testcontainers.com/) for spinning up Docker containers as part of the test suite.

#### Benefits

- **Isolated test environment**: Each test run gets a fresh containerized environment
- **No manual setup**: Containers are automatically started and stopped
- **Reproducible**: Tests run the same way locally and in CI
- **Real dependencies**: Test against actual drachtio-server instances

#### Example

```typescript
import { GenericContainer, Wait } from 'testcontainers';
import Srf from '../../lib/srf';

describe('Integration Tests', () => {
  let drachtioContainer: StartedTestContainer;
  let srf: Srf;

  beforeAll(async () => {
    // Start drachtio-server container
    drachtioContainer = await new GenericContainer('drachtio/drachtio-server:latest')
      .withCommand(['drachtio', '--contact', 'sip:*;transport=udp'])
      .withExposedPorts(9022)
      .withWaitStrategy(Wait.forLogMessage('drachtio ready'))
      .start();

    const port = drachtioContainer.getMappedPort(9022);
    const host = drachtioContainer.getHost();

    srf = new Srf();
    await srf.connect({ host, port, secret: 'cymru' });
  });

  afterAll(async () => {
    if (srf) srf.disconnect();
    if (drachtioContainer) await drachtioContainer.stop();
  });

  it('should work', () => {
    // Your test here
  });
});
```

## TypeScript Support

### Current State

The project maintains JavaScript source code in the `lib/` directory with TypeScript type definitions in `lib/@types/index.d.ts`. This provides:

- Type safety for TypeScript consumers
- Backward compatibility with existing JavaScript code
- No breaking changes for current users

### Configuration

Two TypeScript configuration files are provided:

- `tsconfig.json`: Main TypeScript configuration for type checking
- `tsconfig.test.json`: Extended configuration for test files

### Future Full Migration

A complete migration to TypeScript would involve:

1. Converting all JavaScript files in `lib/` to TypeScript
2. Adding proper type annotations throughout the codebase
3. Updating the build process to compile TypeScript to JavaScript
4. Ensuring all type definitions are correct and complete

This is a larger undertaking that would require:
- Careful conversion of ~13 JavaScript files with complex interdependencies
- Thorough testing to ensure no behavioral changes
- Consideration of backward compatibility
- Documentation updates

## Test Structure

### Unit Tests

Located in `test/unit-tests/`, these tests focus on individual modules:

- `parser.test.ts`: Tests for SIP message parsing
- `wire-protocol.test.ts`: Tests for the wire protocol implementation (currently skipped due to infrastructure issues)

### Integration Tests

Located in `test/integration/`, these tests use Testcontainers to test against real drachtio-server instances:

- `basic.test.ts`: Basic integration tests

### Legacy Tests

The original Mocha/Tape tests are still available:

```bash
# Run legacy tests
npm run legacy:test

# Run legacy unit tests
npm run legacy:unittests
```

## Migration Status

- [x] Vitest configuration
- [x] Unit test migration (parser)
- [x] Integration test structure with Testcontainers
- [ ] Wire protocol test fixes (marked as skipped)
- [ ] Full TypeScript source migration (deferred)
- [ ] Migration of all legacy integration tests

## Contributing

When adding new tests:

1. Use Vitest for all new tests
2. Place unit tests in `test/unit-tests/`
3. Place integration tests in `test/integration/`
4. Use Testcontainers for tests that need drachtio-server
5. Follow the existing test patterns and structure

## Dependencies

### Test Dependencies

- `vitest`: Modern test framework
- `@vitest/coverage-v8`: Code coverage provider
- `testcontainers`: Container management for integration tests
- `typescript`: TypeScript compiler for type checking
- `@typescript-eslint/*`: ESLint plugins for TypeScript

### Legacy Dependencies (still required for legacy tests)

- `mocha`: Test framework
- `tape`: Test framework
- `should`: Assertion library

## Notes

- The wire-protocol tests are currently skipped due to socket cleanup timing issues that need to be resolved
- Integration tests require Docker to be available
- Legacy tests can still be run for comparison and verification
