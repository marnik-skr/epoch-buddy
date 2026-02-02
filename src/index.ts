function cookieHeaderFromSetCookie(setCookie: string[] | null) {
  if (!setCookie?.length) return "";
  // turn ["a=1; Path=/; HttpOnly", "b=2; Path=/"] into "a=1; b=2"
  return setCookie
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

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

    const payloadEncoded = encodeURIComponent(JSON.stringify(payload));
    const target = `${base}?payload=${payloadEncoded}`;

    const browserHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json, text/plain, */*",
      Referer: "https://stake.solanamobile.com/",
      Origin: "https://stake.solanamobile.com",
    };

    // 1) Prime cookies/session (often required)
    const warm = await fetch("https://stake.solanamobile.com/", {
      headers: browserHeaders,
      redirect: "follow",
      cf: { cacheTtl: 0, cacheEverything: false },
    });

    // In Workers, getAll("set-cookie") is supported
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setCookie = (warm.headers as any).getAll
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (warm.headers as any).getAll("set-cookie")
      : null;

    const cookie = cookieHeaderFromSetCookie(setCookie);

    // 2) Call serverFn with cookies
    const r = await fetch(target, {
      method: "GET",
      headers: {
        ...browserHeaders,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      redirect: "follow",
      cf: { cacheTtl: 0, cacheEverything: false },
    });

    const ab = await r.arrayBuffer();
    const bytes = new Uint8Array(ab);
    const text = new TextDecoder("utf-8").decode(bytes);

    // Debug if still empty
    if (!text || text.trim().length === 0) {
      const err = {
        ok: false,
        upstreamStatus: r.status,
        upstreamByteLength: bytes.byteLength,
        warmStatus: warm.status,
        cookiePresent: Boolean(cookie),
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
