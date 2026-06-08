"""
Wayback Machine site cloner — produces a 1:1 offline copy.

Improvements over the original:
- BFS queue instead of recursion (no stack overflow)
- Wayback CDX API pre-seeds every known URL for the snapshot date
- CSS files parsed for url() and @import references
- srcset, poster, data-src, video/audio src attributes crawled
- Retry with exponential backoff on transient errors
- Failed URLs logged to failed_urls.txt for inspection
"""

import requests, os, re, time, json
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from collections import deque

SNAPSHOT   = "https://web.archive.org/web/20191123195549"
SITE       = "http://www.liquidinjection.net"
SITE_HOST  = urlparse(SITE).netloc          # "www.liquidinjection.net"
OUT        = "liquidinjection"
DELAY      = 0.5                            # seconds between requests

visited    = set()
failed     = []
queue      = deque()


# ── path helpers ─────────────────────────────────────────────────────────────

def strip_wayback(url):
    """Remove the https://web.archive.org/web/TIMESTAMP/ prefix."""
    return re.sub(r'https?://web\.archive\.org/web/\d+[a-z_]*/','', url)

def local_path(url):
    bare = strip_wayback(url)
    # Use /{1,} so both "http://" and archive.org's occasional "http:/" are stripped
    bare = re.sub(r'https?:/{1,}', '', bare).split("?")[0].split("#")[0]
    # Split host and path before any extension check so ".net" TLD isn't treated as an extension
    parts = bare.split("/", 1)
    host  = re.sub(r':\d+$', '', parts[0])          # strip port — illegal on Windows
    path  = parts[1].rstrip("/") if len(parts) > 1 else ""
    if not path:
        rel = os.path.join(host, "index.html")
    else:
        _, ext = os.path.splitext(path.split("/")[-1])
        if ext:
            rel = os.path.join(host, *path.split("/"))
        else:
            rel = os.path.join(host, *path.split("/"), "index.html")
    return os.path.normpath(os.path.join(OUT, rel))

def to_archive_url(url):
    """Ensure url goes through the Wayback snapshot."""
    if "web.archive.org" in url:
        return url
    # strip default port so archive.org doesn't redirect to a different timestamp
    url = re.sub(r'(https?://[^/]+):(?:80|443)(/|$)', r'\1\2', url)
    return f"{SNAPSHOT}/{url}"


# ── network ──────────────────────────────────────────────────────────────────

SESSION = requests.Session()
SESSION.headers["User-Agent"] = "Mozilla/5.0"

def fetch(url, retries=4):
    for attempt in range(retries):
        try:
            r = SESSION.get(url, timeout=20, allow_redirects=True)
            r.raise_for_status()
            return r
        except requests.exceptions.HTTPError as e:
            if e.response is not None and e.response.status_code in (404, 403, 410):
                print(f"  {e.response.status_code}: {url}")
                return None
            wait = 2 ** attempt
            print(f"  HTTP error ({e}), retry in {wait}s …")
            time.sleep(wait)
        except Exception as e:
            wait = 2 ** attempt
            print(f"  Error ({e}), retry in {wait}s …")
            time.sleep(wait)
    failed.append(url)
    print(f"  FAILED: {url}")
    return None

def save(path, data, binary=False):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    mode = "wb" if binary else "w"
    kwargs = {} if binary else {"encoding": "utf-8", "errors": "replace"}
    with open(path, mode, **kwargs) as f:
        f.write(data)


# ── CDX API — discover every archived URL for this host ──────────────────────

def seed_from_cdx():
    """Query Wayback CDX API to get all URLs archived near the snapshot date."""
    print("Seeding URLs from Wayback CDX API …")
    cdx = (
        "https://web.archive.org/cdx/search/cdx"
        f"?url={SITE_HOST}/*"
        "&output=json"
        "&fl=timestamp,original"
        "&filter=statuscode:200"
        "&limit=10000"
        "&collapse=urlkey"             # one entry per unique URL across all time
    )
    for attempt in range(5):
        try:
            r = SESSION.get(cdx, timeout=60)
            r.raise_for_status()
            rows = r.json()
            if rows and rows[0] == ["timestamp", "original"]:
                rows = rows[1:]
            for ts, orig in rows:
                arc = f"https://web.archive.org/web/{ts}/{orig}"
                if arc not in visited:
                    queue.append(arc)
            print(f"  CDX seeded {len(rows)} URLs")
            return
        except Exception as e:
            wait = 5 * (2 ** attempt)
            print(f"  CDX attempt {attempt+1} failed ({e}), retry in {wait}s …")
            time.sleep(wait)
    print("  CDX seed failed after retries, continuing with crawl only")


# ── asset & link extraction ───────────────────────────────────────────────────

CSS_URLS = re.compile(r'url\(["\']?([^"\')\s]+)["\']?\)|@import\s+["\']([^"\']+)["\']', re.I)

def enqueue_asset(src, base_url):
    if not src or src.startswith("data:") or src.startswith("javascript:"):
        return
    abs_url = urljoin(base_url, src)
    if SITE_HOST not in abs_url and "web.archive.org" not in abs_url:
        return
    arc = to_archive_url(abs_url)
    if arc not in visited:
        queue.append(arc)

def process_html(r, url, lp):
    soup = BeautifulSoup(r.text, "html.parser")

    # assets
    asset_attrs = [
        ("img",    ["src", "data-src"]),
        ("script", ["src"]),
        ("link",   ["href"]),
        ("source", ["src"]),
        ("video",  ["src", "poster"]),
        ("audio",  ["src"]),
        ("iframe", ["src"]),
    ]
    for tag, attrs in asset_attrs:
        for el in soup.find_all(tag):
            for attr in attrs:
                src = el.get(attr, "")
                if src:
                    enqueue_asset(src, url)
            # srcset="url1 1x, url2 2x"
            for srcset_el in el.get("srcset", "").split(","):
                parts = srcset_el.strip().split()
                if parts:
                    enqueue_asset(parts[0], url)

    # rewrite to relative paths and save
    for tag, attrs in asset_attrs:
        for el in soup.find_all(tag):
            for attr in attrs:
                src = el.get(attr, "")
                if not src or src.startswith("data:"):
                    continue
                abs_url  = urljoin(url, src)
                if SITE_HOST in abs_url or "web.archive.org" in abs_url:
                    ap = local_path(to_archive_url(abs_url))
                    el[attr] = os.path.relpath(ap, os.path.dirname(lp)).replace("\\", "/")

    # remove Wayback toolbar injected by archive.org
    for el in soup.find_all(id=re.compile(r'wm-', re.I)):
        el.decompose()
    for el in soup.find_all("script", src=re.compile(r'archive\.org', re.I)):
        el.decompose()

    save(lp, str(soup))

    # follow links
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith(("#", "mailto:", "javascript:", "tel:")):
            continue
        abs_url = urljoin(url, href)
        if SITE_HOST in abs_url:
            arc = to_archive_url(abs_url)
            if arc not in visited:
                queue.append(arc)

def process_css(r, url, lp):
    text = r.text
    for m in CSS_URLS.finditer(text):
        src = m.group(1) or m.group(2)
        enqueue_asset(src, url)
    save(lp, text)


# ── main crawl loop ───────────────────────────────────────────────────────────

def crawl():
    seed_from_cdx()
    queue.append(f"{SNAPSHOT}/{SITE}/")

    while queue:
        url = queue.popleft()
        if url in visited:
            continue
        visited.add(url)

        print(f"GET {url}")
        r = fetch(url)
        if not r:
            continue

        lp   = local_path(url)
        ctype = r.headers.get("content-type", "")

        if "html" in ctype:
            process_html(r, url, lp)
        elif "css" in ctype:
            process_css(r, url, lp)
        else:
            save(lp, r.content, binary=True)

        time.sleep(DELAY)

    # write failure log
    if failed:
        log = os.path.join(OUT, "failed_urls.txt")
        save(log, "\n".join(failed))
        print(f"\n{len(failed)} URLs failed — see {log}")


if __name__ == "__main__":
    crawl()
    print(f"\nDone — files saved to ./{OUT}/")
