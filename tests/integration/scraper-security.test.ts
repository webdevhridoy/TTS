import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeArticleToText } from '@/lib/utils/scraping';
import dns from 'dns/promises';

vi.mock('dns/promises', () => ({
  default: { lookup: vi.fn() }
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Article Scraper Security Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should block local SSRF resolution natively via DNS', async () => {
    vi.mocked(dns.lookup).mockResolvedValue({ address: '127.0.0.1', family: 4 } as any);
    
    await expect(scrapeArticleToText('http://localhost:3000')).rejects.toThrow(/Access to local or private networks/);
  });

  it('should block private network mappings', async () => {
    // 169.254 is AWS metadata IP range often used for SSRF attacks
    vi.mocked(dns.lookup).mockResolvedValue({ address: '169.254.169.254', family: 4 } as any);
    await expect(scrapeArticleToText('http://metadata.internal')).rejects.toThrow(/Access to local or private networks/);
  });

  it('should reject invalid Content-Type headers', async () => {
    vi.mocked(dns.lookup).mockResolvedValue({ address: '93.184.216.34', family: 4 } as any);
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/pdf' })
    });

    await expect(scrapeArticleToText('https://example.com/file.pdf')).rejects.toThrow(/HTML webpage/);
  });

  it('should reject oversized payload declarations without stream buffering', async () => {
    vi.mocked(dns.lookup).mockResolvedValue({ address: '93.184.216.34', family: 4 } as any);
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ 
        'content-type': 'text/html',
        'content-length': '3000000' // 3MB exceeding 2MB limit
      })
    });

    await expect(scrapeArticleToText('https://heavy.com')).rejects.toThrow(/Payload too large/);
  });
});
