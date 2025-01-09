# Sherlock Domains TypeScript SDK

A TypeScript implementation of the Sherlock Domains API client.

## Installation

```bash
npm install sherlock-domains
```

## Usage

```typescript
import { Sherlock } from 'sherlock-domains'

// Initialize the client
const sherlock = new Sherlock('your-access-token')

// Search for domains
const results = await sherlock.search('example.com')
console.log(results)
```

## Development

### Building and Publishing

1. Build the package 
`npm run build`. 
2. Once it's error-free, commit changes to git
3. Bump version: `npm run patch`
4. Publish the package: `npm publish`

Alternatively, you can use the Makefile:

```bash
make publish
```
