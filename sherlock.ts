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

// Throws error with details if contact info is incomplete
export function requireCompleteContact(contact?: any): asserts contact is Contact {
  if (!contact) {
    throw { error: 'Contact information is required' }
  }
  
  const requiredFields = ['first_name', 'last_name', 'email', 'address', 'city', 'state', 'postal_code', 'country']
  const missingFields = requiredFields.filter(field => !contact[field] || contact[field].trim() === '')
  
  if (missingFields.length > 0) {
    throw { 
      error: `Incomplete contact information: ${missingFields.join(', ')} ${missingFields.length === 1 ? 'is' : 'are'} required and cannot be empty`,
      missingFields
    }
  }
}

export class Sherlock {
  private accessToken?: string
  private contact?: Contact
  
  constructor(accessToken?: string) {
    this.accessToken = accessToken
  }

  async handleResponse(response: Response) {
    const data = await response.json()
    
    // Check for HTTP error status
    if (!response.ok) {
      throw { status: response.status, ...data }
    }
    
    // Check for error field in the response data (even with 200 status)
    if (data && data.error) {
      throw { status: response.status, ...data }
    }
    
    return data
  }

  async me() {
    if (!this.accessToken) throw 'Not authenticated'
    const r = await fetch(`${API_URL}/api/v0/auth/me`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    })
    return this.handleResponse(r)
  }

  async claimAccount(email: string) {
    if (!this.accessToken) throw 'Not authenticated'
    const r = await fetch(`${API_URL}/api/v0/auth/email-link`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    })
    return this.handleResponse(r)
  }

  async search(query: string) {
    const params = new URLSearchParams({ query })
    const r = await fetch(`${API_URL}/api/v0/domains/search?${params}`)
    return this.handleResponse(r)
  }

  async domains() {
    if (!this.accessToken) throw 'Not authenticated'
    const r = await fetch(`${API_URL}/api/v0/domains/domains`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    })
    return this.handleResponse(r)
  }

  async updateNameservers(domainId: string, nameservers: string[]) {
    if (!this.accessToken) throw 'Not authenticated'
    const r = await fetch(`${API_URL}/api/v0/domains/${domainId}/nameservers`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nameservers })
    })
    return this.handleResponse(r)
  }

  async dnsRecords(domainId: string) {
    if (!this.accessToken) throw 'Not authenticated'
    const r = await fetch(`${API_URL}/api/v0/domains/${domainId}/dns/records`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    })
    return this.handleResponse(r)
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
    return this.handleResponse(r)
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
    return this.handleResponse(r)
  }

  async deleteDns(domainId: string, recordId: string) {
    if (!this.accessToken) throw 'Not authenticated'
    const r = await fetch(`${API_URL}/api/v0/domains/${domainId}/dns/records/${recordId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.accessToken}` }
    })
    return this.handleResponse(r)
  }

  async getContactInformation() {
    if (!this.accessToken) throw 'Not authenticated'
    const r = await fetch(`${API_URL}/api/v0/users/contact-information`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    })
    return this.handleResponse(r)
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
    return this.handleResponse(r)
  }

  setContact(contact: Contact) {
    this.contact = contact
  }

  async getPurchaseOffers(domain: string, searchId: string, contact?: Contact) {
    if (!this.accessToken) throw 'Not authenticated'
    const contactInfo = contact || this.contact
    
    // Check contact info is complete
    requireCompleteContact(contactInfo)

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
    return this.handleResponse(r)
  }

  async getX402PurchaseOffers(domain: string, searchId: string, contact?: Contact) {
    if (!this.accessToken) throw 'Not authenticated'
    const contactInfo = contact || this.contact

    requireCompleteContact(contactInfo)

    const r = await fetch(`${API_URL}/api/v0/domains/purchase-x402`, {
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

    const data = await r.json()
    return { status: 402, ...data }
  }

  async purchaseX402(domain: string, searchId: string, paymentSignature: string, contact?: Contact) {
    if (!this.accessToken) throw 'Not authenticated'
    const contactInfo = contact || this.contact

    requireCompleteContact(contactInfo)

    const r = await fetch(`${API_URL}/api/v0/domains/purchase-x402`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'PAYMENT-SIGNATURE': paymentSignature
      },
      body: JSON.stringify({
        domain,
        contact_information: contactInfo,
        search_id: searchId
      })
    })
    return this.handleResponse(r)
  }

  async purchaseDomain(searchId: string, domain: string, paymentMethod: string = 'credit_card') {
    console.log('purchaseDomain', searchId, domain, paymentMethod)
    if (!this.accessToken) throw 'Not authenticated'
    
    const contact = await this.getContactInformation()
    console.log('purchaseDomain', contact)
    
    // This will throw with detailed message if contact info is incomplete
    requireCompleteContact(contact)
    
    const offers = await this.getPurchaseOffers(domain, searchId, contact)
    console.log('purchaseDomain', offers)
    
    // Since we've properly handled errors in getPurchaseOffers,
    // we can safely access these properties
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
    return this.handleResponse(r)
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
      },
      claimAccount: {
        description: 'Claim an account by sending an email link for authentication',
        parameters: z.object({
          email: z.string()
        }),
        execute: async ({ email }: { email: string }) => await this.claimAccount(email)
      },
      updateNameservers: {
        description: 'Update the nameservers for a domain',
        parameters: z.object({
          domainId: z.string(),
          nameservers: z.array(z.string())
        }),
        execute: async ({ domainId, nameservers }: {
          domainId: string,
          nameservers: string[]
        }) => await this.updateNameservers(domainId, nameservers)
      },
      getX402PurchaseOffers: {
        description: 'Get X402 purchase offers for a domain. Returns payment requirements with a 402 status.',
        parameters: z.object({
          domain: z.string(),
          searchId: z.string()
        }),
        execute: async ({ domain, searchId }: {
          domain: string,
          searchId: string
        }) => await this.getX402PurchaseOffers(domain, searchId)
      },
      purchaseX402: {
        description: 'Complete an X402 domain purchase with a payment signature',
        parameters: z.object({
          domain: z.string(),
          searchId: z.string(),
          paymentSignature: z.string()
        }),
        execute: async ({ domain, searchId, paymentSignature }: {
          domain: string,
          searchId: string,
          paymentSignature: string
        }) => await this.purchaseX402(domain, searchId, paymentSignature)
      }
    }
  }

}