import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApolloClient, ApolloApiError } from '../src/apollo-client.js';
import { enrichPerson } from '../src/tools/enrich-person.js';

const mockEnrichPerson = vi.fn();
const client = { enrichPerson: mockEnrichPerson } as unknown as ApolloClient;
const rl = { limit: 50, remaining: 44, resetAt: null };

const mockPerson = {
  id: 'p2', name: 'John Smith', first_name: 'John', last_name: 'Smith',
  title: 'CTO', email: 'john@example.com', email_status: 'verified',
  phone_numbers: [{ raw_number: '+1-555-0100', sanitized_number: '+15550100', type: 'work' }],
  linkedin_url: 'https://linkedin.com/in/john', city: 'SF', state: 'CA', country: 'US',
  organization: { id: 'o2', name: 'ExCorp', primary_domain: 'excorp.com' },
  employment_history: [{ _id: 'e1', organization_name: 'ExCorp', title: 'CTO', current: true }],
};

beforeEach(() => vi.clearAllMocks());

describe('enrichPerson', () => {
  it('enriches a person by email', async () => {
    mockEnrichPerson.mockResolvedValueOnce({ data: { person: mockPerson }, rateLimitInfo: rl });
    const result = JSON.parse(await enrichPerson(client, { email: 'john@example.com' }));
    expect(result.person.id).toBe('p2');
    expect(result.person.email).toBe('john@example.com');
    expect(result.rate_limits.remaining).toBe(44);
  });

  it('enriches a person by LinkedIn URL', async () => {
    mockEnrichPerson.mockResolvedValueOnce({ data: { person: mockPerson }, rateLimitInfo: rl });
    await enrichPerson(client, { linkedin_url: 'https://linkedin.com/in/john' });
    expect(mockEnrichPerson).toHaveBeenCalledWith(expect.objectContaining({ linkedin_url: 'https://linkedin.com/in/john' }));
  });

  it('enriches by name + company', async () => {
    mockEnrichPerson.mockResolvedValueOnce({ data: { person: mockPerson }, rateLimitInfo: rl });
    await enrichPerson(client, { first_name: 'John', last_name: 'Smith', organization_name: 'ExCorp' });
    expect(mockEnrichPerson).toHaveBeenCalledWith(expect.objectContaining({
      first_name: 'John', last_name: 'Smith', organization_name: 'ExCorp',
    }));
  });

  it('returns error message when no identifier provided', async () => {
    const result = JSON.parse(await enrichPerson(client, {}));
    expect(result.error).toBeTruthy();
    expect(mockEnrichPerson).not.toHaveBeenCalled();
  });

  it('propagates ApolloApiError on 401', async () => {
    mockEnrichPerson.mockRejectedValueOnce(
      new ApolloApiError('Invalid key', 401, { limit: null, remaining: null, resetAt: null }),
    );
    await expect(enrichPerson(client, { email: 'bad@test.com' })).rejects.toThrow('Invalid key');
  });
});
