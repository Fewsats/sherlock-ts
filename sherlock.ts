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
  private accessToken?: string
  private contact?: Contact
  
  constructor(accessToken?: string) {
    this.accessToken = accessToken
  }

  async me() {
    if (!this.accessToken) throw 'Not authenticated'
    const r = await fetch(`${API_URL}/api/v0/auth/me`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    })
    return await r.json()
  }

  async search(query: string) {
    const params = new URLSearchParams({ query })
    const r = await fetch(`${API_URL}/api/v0/domains/search?${params}`)
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

  async getContactInformation() {
    if (!this.accessToken) throw 'Not authenticated'
    const r = await fetch(`${API_URL}/api/v0/users/contact-information`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    })
    return await r.json()
  }

  async setContactInformation(contact: Contact) {
    if (!this.accessToken) throw 'Not authenticated'
    const r = await fetch(`${API_URL}/api/v0/users/contact-information`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contact)
    })
    return await r.json()
  }

  setContact(contact: Contact) {
    this.contact = contact
  }

  async getPurchaseOffers(domain: string, searchId: string, contact?: Contact) {
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

  async purchaseDomain(searchId: string, domain: string, paymentMethod: string = 'credit_card') {
    if (!this.accessToken) throw 'Not authenticated'
    const contact = await this.getContactInformation()
    if (!contact) throw 'Contact information is required'
    
    const offers = await this.getPurchaseOffers(domain, searchId, contact)
    return await this.getPaymentDetails(
      offers.payment_request_url,
      offers.offers[0].id,
      paymentMethod,
      offers.payment_context_token
    )
  }

  async getPaymentDetails(paymentRequestUrl: string, offerId: string, paymentMethod: string, paymentContextToken: string) {
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

  asTools() {
    return {
      me: {
        description: 'Makes an authenticated request to verify the current authentication status and retrieve basic user details',
        parameters: z.object({}),
        execute: async () => await this.me()
      },
      setContactInformation: {
        description: 'Set the contact information that will be used for domain purchases and ICANN registration',
        parameters: z.object({
          first_name: z.string().describe('First name'),
          last_name: z.string().describe('Last name'),
          email: z.string().describe('Email address'),
          address: z.string().describe('Street address'),
          city: z.string().describe('City'),
          state: z.string().describe('Two-letter state code for US/Canada or province name'),
          postal_code: z.string().describe('Postal code'),
          country: z.string().describe('Two-letter country code')
        }),
        execute: async (contact: Contact) => await this.setContactInformation(contact)
      },
      getContactInformation: {
        description: 'Get the contact information for the Sherlock user',
        parameters: z.object({}),
        execute: async () => await this.getContactInformation()
      },
      searchDomains: {
        description: 'Search for domain names. Returns prices in USD cents.',
        parameters: z.object({
          query: z.string().describe('The domain name to search for')
        }),
        execute: async ({ query }: { query: string }) => await this.search(query)
      },
      purchaseDomain: {
        description: 'Purchase a domain. This method won\'t charge your account, it will return the payment information needed to complete the purchase',
        parameters: z.object({
          searchId: z.string().describe('Search ID from a previous search request'),
          domain: z.string().describe('Domain name to purchase'),
          paymentMethod: z.string().default('credit_card').describe('Payment method to use {\'credit_card\', \'lightning\'}')
        }),
        execute: async ({ searchId, domain, paymentMethod = 'credit_card' }: {
          searchId: string,
          domain: string,
          paymentMethod?: string
        }) => await this.purchaseDomain(searchId, domain, paymentMethod)
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
      updateDnsRecord: {
        description: 'Update an existing DNS record',
        parameters: z.object({
          domainId: z.string().describe('The domain ID'),
          recordId: z.string().describe('The record ID'),
          type: z.string().default('TXT').describe('Record type'),
          name: z.string().default('test-2').describe('Record name'),
          value: z.string().default('test-2').describe('Record value'),
          ttl: z.number().default(3600).describe('Time to live')
        }),
        execute: async ({ domainId, recordId, ...params }: {
          domainId: string,
          recordId: string,
          type?: string,
          name?: string,
          value?: string,
          ttl?: number
        }) => await this.updateDns(domainId, recordId, params)
      },
      deleteDnsRecord: {
        description: 'Delete a DNS record',
        parameters: z.object({
          domainId: z.string().describe('The domain ID'),
          recordId: z.string().describe('The record ID')
        }),
        execute: async ({ domainId, recordId }: {
          domainId: string,
          recordId: string
        }) => await this.deleteDns(domainId, recordId)
      }
    }
  }

}