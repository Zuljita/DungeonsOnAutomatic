# Plugin Security and Safety Guidelines

## Version 1.0

This document outlines security requirements, safety guidelines, and best practices for DOA plugin development and distribution.

## Security Threat Model

### Attack Vectors

| Vector | Risk Level | Mitigation |
|--------|------------|------------|
| **Malicious Code Execution** | High | Sandboxing, code review |
| **Data Exfiltration** | High | Network restrictions, file system limits |
| **Resource Exhaustion** | Medium | CPU/memory limits, timeouts |
| **Dependency Vulnerabilities** | Medium | Automated scanning, trusted sources |
| **Configuration Injection** | Medium | Input validation, sanitization |
| **Supply Chain Attacks** | High | Code signing, trusted registries |

### Asset Protection

- **User Data**: Generated dungeons, configuration files, custom data
- **System Resources**: CPU, memory, disk space, network  
- **DOA Core**: Application integrity, core functionality
- **Host System**: File system, environment variables, system processes

## Plugin Sandboxing Architecture

All plugins run in a restricted sandbox with limited access to system resources:

```typescript
interface PluginSandbox {
  // Allowed DOA APIs
  core: {
    types: typeof import('../core/types');
  };
  
  // Controlled environment  
  environment: {
    random: () => number; // Seeded RNG only
    console: Pick<Console, 'log' | 'warn' | 'error'>;
    setTimeout: (fn: Function, ms: number) => NodeJS.Timeout;
    clearTimeout: (id: NodeJS.Timeout) => void;
  };
  
  // Blocked APIs (undefined in sandbox)
  blocked: {
    fs: undefined;
    process: undefined;
    http: undefined;
    net: undefined;
    crypto: undefined; // Use provided random() instead
  };
}
```

### Resource Limits

```typescript
interface ResourceLimits {
  maxMemoryMB: 64; // Maximum memory usage
  maxExecutionTimeMs: 30000; // 30 second timeout  
  maxFileSize: 1024 * 1024; // 1MB for data files
  maxCallStackDepth: 100; // Prevent stack overflow
  maxIterations: 100000; // Prevent infinite loops
}
```

### File System Access

Plugins have read-only access to their own directory and DOA's data directories:

```typescript
interface FileSystemAccess {
  allowedPaths: {
    read: [
      './plugin-directory/**/*', // Plugin's own files
      './data/**/*.json', // DOA data files  
      './node_modules/@doa/**/*' // DOA dependencies only
    ];
    write: []; // No write access
  };
  
  blockedPaths: [
    '/',
    '/home/**/*',
    '/etc/**/*',
    '../**/*', // No parent directory access
    '.env',
    '.env.*'
  ];
}
```

## Code Signing and Distribution

### Plugin Signing Requirements

All community plugins must be cryptographically signed:

```typescript
interface PluginSignature {
  algorithm: 'RSA-PSS' | 'ECDSA-P256';
  publicKey: string; // PEM format
  signature: string; // Base64 encoded signature
  timestamp: string; // RFC 3339 timestamp
  codeHash: string; // SHA-256 hash of plugin code
}
```

### Trusted Publishers

```typescript
interface TrustedPublisher {
  id: string; // Publisher identifier
  name: string; // Display name  
  publicKey: string; // Verification key
  verified: boolean; // Verified by DOA team
  trustLevel: 'community' | 'verified' | 'official';
  maxPermissions: PluginPermissions;
}
```

### Plugin Registry Security

- **Automated Scanning**: All uploaded plugins are scanned for malware
- **Manual Review**: High-risk plugins undergo manual code review
- **Reputation System**: User ratings and security reports
- **Takedown Process**: Rapid removal of malicious plugins

## Best Practices for Plugin Developers

### Secure Coding Guidelines

#### Input Validation
```typescript
// DO: Validate all inputs
function generateEncounter(options: EncounterOptions): Encounter {
  const validatedOptions = EncounterOptionsSchema.parse(options);
  // ... implementation
}

// DON'T: Trust input data
function generateEncounter(options: any): Encounter {
  if (options.level > 100) { // What if options.level is a string?
    // ... potentially unsafe
  }
}
```

#### Error Handling
```typescript
// DO: Handle errors gracefully
try {
  const result = riskyOperation();
  return result;
} catch (error) {
  // Log error without exposing sensitive information
  console.error('Operation failed:', error.message);
  return defaultValue;
}

// DON'T: Expose internal details
catch (error) {
  throw new Error(`Database connection failed: ${dbConnectionString}`);
}
```

#### Resource Management
```typescript
// DO: Clean up resources
function processLargeDataset(data: unknown[]): Result {
  const processedItems: Result[] = [];
  
  try {
    for (const item of data.slice(0, MAX_ITEMS)) { // Limit processing
      processedItems.push(processItem(item));
    }
  } finally {
    // Clean up any resources
    cleanup();
  }
  
  return processedItems;
}
```

### Dependency Security

#### Safe Dependencies
```json
{
  "dependencies": {
    "lodash": "^4.17.21",
    "zod": "^3.20.0"
  },
  "devDependencies": {
    "@types/node": "^18.0.0"
  }
}
```

#### Avoid Risky Packages
- Packages with known vulnerabilities
- Unmaintained packages (no updates > 2 years)
- Packages with suspicious behavior
- Native binaries without source code

### Configuration Security

```typescript
// DO: Use environment-specific defaults
const config = {
  apiEndpoint: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000/api'
    : 'https://api.example.com',
  
  // Don't hardcode secrets
  apiKey: process.env.API_KEY || '',
  
  // Validate configuration
  timeout: Math.min(Number(process.env.TIMEOUT) || 5000, 30000)
};

// DON'T: Hardcode sensitive information  
const config = {
  apiKey: 'sk_live_abcd1234', // Never do this
  databaseUrl: 'postgresql://user:password@host/db' // Never do this
};
```