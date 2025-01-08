import * as ed from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha512'
import { z } from 'zod'

const API_URL = "https://api.sherlockdomains.com"

// Initialize ed25519 with SHA-512
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m))

export interface Contact {
  first_name: string;
  last_name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export class Sherlock {
  private accessToken: string
  private contact?: Contact
  
  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  // async me() {
  //   if (!this.accessToken) throw 'Not authenticated'
  //   const r = await fetch(`${API_URL}/api/v0/auth/me`, {
  //     headers: { Authorization: `Bearer ${this.accessToken}` }
  //   })
  //   return await r.json()
  // }

  async search(query: string) {
    const params = new URLSearchParams({ query })
    console.log('Search params:', params)
    const r = await fetch(`${API_URL}/api/v0/domains/search?${params}`)
    console.log('Search response:', r)
    return await r.json()
  }

  async domains() {
    if (!this.accessToken) throw 'Not authenticated'
    const r = await fetch(`${API_URL}/api/v0/domains/domains`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    })
    return await r.json()
  }

  async dnsRecords(domainId: string) {
    if (!this.accessToken) throw 'Not authenticated'
    const r = await fetch(`${API_URL}/api/v0/domains/${domainId}/dns/records`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    })
    return await r.json()
  }

  async createDns(domainId: string, {
    type = "TXT",
    name = "test",
    value = "test-1", 
    ttl = 3600
  }) {
    if (!this.accessToken) throw 'Not authenticated'
    const r = await fetch(`${API_URL}/api/v0/domains/${domainId}/dns/records`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [{type, name, value, ttl}]
      })
    })
    return await r.json()
  }

  async updateDns(domainId: string, recordId: string, {
    type = "TXT",
    name = "test-2",
    value = "test-2",
    ttl = 3600
  }) {
    if (!this.accessToken) throw 'Not authenticated'
    const r = await fetch(`${API_URL}/api/v0/domains/${domainId}/dns/records`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [{id: recordId, type, name, value, ttl}]
      })
    })
    return await r.json()
  }

  async deleteDns(domainId: string, recordId: string) {
    if (!this.accessToken) throw 'Not authenticated'
    const r = await fetch(`${API_URL}/api/v0/domains/${domainId}/dns/records/${recordId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.accessToken}` }
    })
    return await r.json()
  }

  async requestPurchase(domain: string, searchId: string, contact?: Contact) {
    if (!this.accessToken) throw 'Not authenticated'
    const contactInfo = contact || this.contact
    if (!contactInfo) throw 'Contact information is required'

    const r = await fetch(`${API_URL}/api/v0/domains/purchase`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain,
        contact_information: contactInfo,
        search_id: searchId
      })
    })
    return await r.json()
  }

  async processPayment(paymentRequestUrl: string, {
    offerId,
    paymentMethod,
    paymentContextToken
  }: {
    offerId: string,
    paymentMethod: string,
    paymentContextToken: string
  }) {
    const r = await fetch(paymentRequestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offer_id: offerId,
        payment_method: paymentMethod,
        payment_context_token: paymentContextToken
      })
    })
    return await r.json()
  }

  setContact(contact: Contact) {
    this.contact = contact
  }

  asTools() {
    return {
      // sherlockMe: {
      //   description: 'Get authenticated user information',
      //   parameters: z.object({}),
      //   execute: async () => await this.me()
      // },
      searchDomains: {
        description: 'Search for domain names. Returns prices in USD cents.',
        parameters: z.object({
          query: z.string().describe('The domain name to search for')
        }),
        execute: async ({ query }: { query: string }) => await this.search(query)
      },
      listDomains: {
        description: 'List domains owned by the authenticated user',
        parameters: z.object({}),
        execute: async () => await this.domains()
      },
      getDnsRecords: {
        description: 'Get DNS records for a domain',
        parameters: z.object({
          domainId: z.string().describe('The domain ID')
        }),
        execute: async ({ domainId }: { domainId: string }) => await this.dnsRecords(domainId)
      },
      createDnsRecord: {
        description: 'Create a new DNS record',
        parameters: z.object({
          domainId: z.string().describe('The domain ID'),
          type: z.string().default('TXT').describe('Record type'),
          name: z.string().default('test').describe('Record name'),
          value: z.string().default('test-1').describe('Record value'),
          ttl: z.number().default(3600).describe('Time to live')
        }),
        execute: async ({ domainId, ...params }: { 
          domainId: string, 
          type?: string, 
          name?: string, 
          value?: string, 
          ttl?: number 
        }) => await this.createDns(domainId, params)
      },
      requestDomainPurchase: {
        description: 'Request a purchase of a domain',
        parameters: z.object({
          domain: z.string().describe('The domain name'),
          searchId: z.string().describe('The search ID'),
          contact: z.object({
            first_name: z.string(),
            last_name: z.string(),
            email: z.string(),
            address: z.string(),
            city: z.string(),
            state: z.string(),
            postal_code: z.string(),
            country: z.string()
          }).optional().describe('Contact information')
        }),
        execute: async ({ domain, searchId, contact }: { 
          domain: string, 
          searchId: string, 
          contact?: Contact 
        }) => await this.requestPurchase(domain, searchId, contact)
      },
      processPayment: {
        description: 'Process a payment for an offer',
        parameters: z.object({
          paymentRequestUrl: z.string().describe('Payment request URL'),
          offerId: z.string().describe('Offer ID'),
          paymentMethod: z.string().describe('Payment method'),
          paymentContextToken: z.string().describe('Payment context token')
        }),
        execute: async ({ paymentRequestUrl, ...params }: { 
          paymentRequestUrl: string, 
          offerId: string, 
          paymentMethod: string, 
          paymentContextToken: string 
        }) => await this.processPayment(paymentRequestUrl, params)
      }
    }
  }

}