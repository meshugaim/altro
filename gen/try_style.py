#!/usr/bin/env python3
"""One-off: generate the opulent arab-roman 'Aladdin palace' grand hall in a few
candidate styles so we can pick the look before regenerating the whole palace."""
import os, sys, json, time, urllib.request, urllib.error
KEY = os.environ["SKYBOX_KEY"]; BASE = "https://backend.blockadelabs.com/api/v1"
PROMPT = ("interior of the grandest most opulent palace ever imagined, a sumptuous fusion of "
  "Roman palazzo and Arabian Nights palace, soaring gilded horseshoe arches, intricate Moorish "
  "geometric tilework and mosaics, polychrome marble floors, gold leaf everywhere, a carved "
  "muqarnas honeycomb ceiling, crystal chandeliers, lush silk drapery and cushions, a central "
  "marble fountain, lavish maximalist Orientalist grandeur, warm golden light, photoreal, no people, no text")
NEG = "plain, austere, empty, modern, minimal, fisheye distortion, warped lines, watermark, text, people"
def req(method, path, body=None):
    r = urllib.request.Request(f"{BASE}{path}", data=json.dumps(body).encode() if body else None, method=method,
        headers={"x-api-key": KEY, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=60) as resp: return json.load(resp)
    except urllib.error.HTTPError as e: print("HTTP", e.code, e.read().decode()[:300]); sys.exit(1)
for style in [int(s) for s in sys.argv[1:]] or [119, 122]:
    out = req("POST", "/skybox", {"skybox_style_id": style, "seed": 8800001, "prompt": PROMPT, "negative_text": NEG})
    rid = out.get("id"); print(f"style {style}: queued {rid}")
    t0 = time.time()
    while time.time()-t0 < 240:
        rq = req("GET", f"/imagine/requests/{rid}").get("request", {})
        if rq.get("status") == "complete":
            urllib.request.urlretrieve(rq["file_url"], f"img/raw/try_{style}.jpg"); print(f"  style {style}: saved img/raw/try_{style}.jpg"); break
        if rq.get("status") in ("error","abort"): print("  fail", rq.get("error_message")); break
        time.sleep(6)
print("DONE")
