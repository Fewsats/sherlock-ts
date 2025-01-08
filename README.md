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
