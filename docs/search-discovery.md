# Link previews and search discovery

The public app URL is `https://vibeshibe.github.io/openambience/`. Its HTML includes Open Graph and Twitter summary-card metadata with the existing 512 × 512 PNG logo, explicit image dimensions, and alternative text. These tags are present in the initial response, so preview crawlers do not need JavaScript. Platforms choose their own preview layout and may cache earlier previews.

The page also provides a descriptive title, a meta description, a canonical URL, and visible introductory text explaining the mixer without JavaScript. JavaScript is required to populate the sound library and play audio. `sitemap.xml` lists the canonical homepage; it deliberately omits app assets and alternate spellings such as `index.html`.

## Live-site audit — 2026-10-05

Before these changes were published, the homepage returned HTTP 200 with no `X-Robots-Tag` header and no `noindex` meta tag. The origin's `https://vibeshibe.github.io/robots.txt` returned 404, which permits crawling. The site was crawlable, but a public site-restricted search returned no results. That search does not establish whether Google has indexed the page; use Search Console to confirm.

There is intentionally no project-level `robots.txt`: crawlers read this file at the origin root, not at `/openambience/robots.txt`. This repository cannot control the origin-root file through its project Pages deployment. No robots file is required to allow crawling. If an origin-root file is added later, ensure it allows `/openambience/` and optionally advertises the sitemap URL.

## Request indexing after publishing

The site owner's verification file, `googleda261d29beb9c725.html`, is included at the project root. After deployment it is available at `https://vibeshibe.github.io/openambience/googleda261d29beb9c725.html`. Keep its contents unchanged and retain it after verification. Publishing the file does not itself complete verification or request indexing; finish those steps in the owner's Search Console account.

1. Add `https://vibeshibe.github.io/openambience/` as a **URL-prefix property** in [Google Search Console](https://search.google.com/search-console/). Verification requires the site owner's Google account. Publish the HTML verification file or meta tag supplied by Google; never invent a token.
2. Submit `https://vibeshibe.github.io/openambience/sitemap.xml` in the property's Sitemaps panel.
3. Inspect the canonical homepage, test the live URL, and request indexing. Monitor the indexing result there. Google says crawling can take days to weeks and does not guarantee inclusion or ranking.
4. For Bing, add the URL to [Bing Webmaster Tools](https://www.bing.com/webmasters/) and follow its verification and sitemap submission flow.

The sitemap and metadata support discovery; useful public links to the app also help people find it. Search-console submissions and verification have not been performed by this repository change.

## Maintenance and validation

- When moving domains or publishing a fork, update the absolute canonical, Open Graph, and Twitter image URLs in `index.html` and the URL in `sitemap.xml` together. Runtime app paths remain relative.
- Check the deployed page and PNG return HTTP 200 without authentication, and that the sitemap is served as XML. Inspect raw HTML to confirm the tags are present without running JavaScript.
- Share the deployed URL in the intended chat platforms to check their rendering. Previously shared links may retain cached previews until the platform fetches them again.

References: [Open Graph metadata](https://ogp.me/), [Google's robots.txt handling, including 404 responses](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt), and [requesting a Google recrawl](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).
