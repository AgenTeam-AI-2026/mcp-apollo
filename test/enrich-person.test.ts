import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApolloClient } from '../src/apollo-client.js';
import { enrichPerson } from '../src/tools/enrich-person.js';
import { ApolloError } from '../src/types.js';

const mockPost = vi.fn();
vi.mock('../src/apollo-client.js', () => ({
  ApolloClient: vi.fn().mockImplementation(() => ({ post: mockPost })),
}));

const client = new ApolloClient('test-key');
const mockRateLimits = { limit: 50, remaining: 44, reset: 3600 };

const mockFullPerson = {
  id: 'person_002',
  name: 'John Smith',
  first_name: 'John',
  last_name: 'Smith',
  title: 'CTO',
  headline: 'Building the future',
  email: 'john@example.com',
  email_status: 'verified',
  phone_numbers: [{ raw_number: '+1-555-0100', type: 'work' }],
  linkedin_url: 'https://linkedin.com/in/johnsmith',
  twitter_url: null,
  photo_url: null,
  city: 'San Francisco',
  state: 'CA',
  country: 'United States',
  organization: { name: 'ExampleCorp', primary_domain: 'example.com' },
  employment_history: [
    { organization_name: 'ExampleCorp', title: 'CTO', start_date: '2021-01', end_date: null, current: true },
  ],
};

beforeEach(() => vi.clearAllMocks());

describe('enrichPerson', () => {
  it('enriches a person by email', async () => {
    mockPost.mockResolvedValueOnce({ data: { person: mockFullPerson }, rateLimits: mockRateLimits });

    const result = JSON.parse(await enrichPerson(client, { email: 'john@example.com' }));

    expect(result.person.id).toBe('person_002');
    expect(result.person.email).toBe('john@example.com');
    expect(result.person.email_status).toBe('verified');
    expect(result.person.employment_history).toHaveLength(1);
    expect(result.rate_limits.remaining).toBe(44);
  });

  it('enriches a person by LinkedIn URL', async () => {
    mockPost.mockResolvedValueOnce({ data: { person: mockFullPerson }, rateLimits: mockRateLimits });

    await enrichPerson(client, { linkedin_url: 'https://linkedin.com/in/johnsmith' });

    expect(mockPost).toHaveBeenCalledWith('/people/match', expect.objectContaining({
      linkedin_url: 'https://linkedin.com/in/johnsmith',
    }));
  });

  it('enriches a person by name + company', async () => {
    mockPost.mockResolvedValueOnce({ data: { person: mockFullPerson }, rateLimits: mockRateLimits });

    await enrichPerson(client, {
      first_name: 'John',
      last_name: 'Smith',
      organization_name: 'ExampleCorp',
    });

    expect(mockPost).toHaveBeenCalledWith('/people/match', expect.objectContaining({
      first_name: 'John',
      last_name: 'Smith',
      organization_name: 'ExampleCorp',
    }));
  });

  it('throws ApolloError on 401', async () => {
    mockPost.mockRejectedValueOnce(new ApolloError('Invalid API key', 401, 'UNAUTHORIZED'));
    await expect(enrichPerson(client, { email: 'bad@test.com' })).rejects.toThrow('Invalid API key');
  });
});
