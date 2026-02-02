export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const wallet = url.searchParams.get("wallet");
    if (!wallet) return new Response("missing wallet", { status: 400 });

    const serverFnId =
      "4eb74835670b7e44403eae377fb961dd4f2c14876e162be713b9777807d871be";
    const base = `https://stake.solanamobile.com/_serverFn/${serverFnId}`;

    const payload = {
      t: {
        t: 10,
        i: 0,
        p: {
          k: ["data"],
          v: [
            {
              t: 10,
              i: 1,
              p: { k: ["walletAddress"], v: [{ t: 1, s: wallet }] },
              o: 0,
            },
          ],
        },
        o: 0,
      },
      f: 63,
      m: [],
    };

    const body = `payload=${encodeURIComponent(JSON.stringify(payload))}`;

    const r = await fetch(base, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: "https://stake.solanamobile.com/",
        Origin: "https://stake.solanamobile.com",
      },
      redirect: "follow",
      cf: { cacheTtl: 0, cacheEverything: false },
    });

    // ✅ Read raw bytes then decode (more reliable than r.text())
    const ab = await r.arrayBuffer();
    const bytes = new Uint8Array(ab);
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

    // If upstream is empty/unreadable, return a JSON error we can see in app logs
    if (!text || text.trim().length === 0) {
      const err = {
        ok: false,
        upstreamStatus: r.status,
        upstreamByteLength: bytes.byteLength,
        upstreamHeaders: Object.fromEntries(r.headers.entries()),
      };
      return new Response(JSON.stringify(err, null, 2), {
        status: 502,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
          "access-control-allow-origin": "*",
        },
      });
    }

    return new Response(text, {
      status: r.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    });
  },
};
