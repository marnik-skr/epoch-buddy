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

    const r = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json, text/plain, */*",
        Referer: "https://stake.solanamobile.com/",
        Origin: "https://stake.solanamobile.com",
      },
    });

    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        // optional but nice if your app calls it directly
        "access-control-allow-origin": "*",
      },
    });
  },
};
