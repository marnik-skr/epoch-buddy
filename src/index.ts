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

    // ✅ EXACT shape the browser used (GET with payload in query)
    const payloadEncoded = encodeURIComponent(JSON.stringify(payload));
    const target = `${base}?payload=${payloadEncoded}`;

    const r = await fetch(target, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json, text/plain, */*",
        Referer: "https://stake.solanamobile.com/",
        Origin: "https://stake.solanamobile.com",
        "Accept-Language": "en-US,en;q=0.9",

        // these “browser-ish” headers can matter on some setups
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
      },
      redirect: "follow",
      cf: { cacheTtl: 0, cacheEverything: false },
    });

    const text = await r.text();

    // If upstream is still empty, return JSON debug (so we can see exactly why)
    if (!text || text.trim().length === 0) {
      const err = {
        ok: false,
        upstreamStatus: r.status,
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
