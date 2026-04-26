import * as cheerio from "cheerio";
import ipaddr from "ipaddr.js";
import dns from "dns/promises";

/**
 * Basic Article Scraper using Cheerio to extract readable text.
 * Hardened for SSRF, size limits, and timeouts.
 */
export async function scrapeArticleToText(url: string): Promise<string> {
  try {
    // 1. SSRF Protection: Parse URL and resolve IP
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error("Invalid URL format");
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }

    const dnsLookup = await dns.lookup(parsedUrl.hostname);
    const ip = ipaddr.parse(dnsLookup.address);
    if (ip.range() === "private" || ip.range() === "loopback") {
      throw new Error("Access to local or private networks is strictly prohibited");
    }

    // 2. Timeout & Payload limits
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Sawti-TTS-Bot/1.0",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch URL with status: ${response.status}`);
    }

    // Content Type Validation
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("xhtml+xml")) {
      throw new Error("URL must point to an HTML webpage");
    }

    // Size limit (2MB) stream reader logic bypassing direct .text() overflow
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 2_000_000) {
      throw new Error("Payload too large (Max 2MB)");
    }

    let html = "";
    const reader = response.body?.getReader();
    if (reader) {
      let bytesReceived = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesReceived += value.length;
        if (bytesReceived > 2_000_000) {
          throw new Error("Payload too large (Max 2MB mid-stream)");
        }
        html += new TextDecoder().decode(value);
      }
    } else {
      html = await response.text();
    }

    const $ = cheerio.load(html);

    // Remove scripts, styles, and navigational elements
    $("script, style, nav, footer, header, aside, .ad, .advertisement, [role='banner'], [role='contentinfo']").remove();

    // Prioritize standard article containers, fallback to body text and specifically grab <p> tags
    let contentNodes = $("article p, .post-content p, .entry-content p, .content p");
    
    if (contentNodes.length === 0) {
      contentNodes = $("p");
    }

    let textArray: string[] = [];
    contentNodes.each((_, element) => {
      const pText = $(element).text().trim();
      if (pText.length > 20) {
        textArray.push(pText);
      }
    });

    const finalString = textArray.join("\n\n");
    if (!finalString) {
      throw new Error("No readable text content found at this URL.");
    }

    return finalString;
  } catch (error: any) {
    console.error("Scraping error:", error);
    throw new Error(`Scraping failed: ${error.message}`);
  }
}
