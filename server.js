const API_URL = "https://v3.football.api-sports.io";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // Test endpoint
    if (url.pathname === "/") {
      return jsonResponse({
        success: true,
        message: "BetKigali API is running"
      });
    }

    // Get leagues
    if (url.pathname === "/api/leagues") {
      return await apiFootball(
        "/leagues",
        env,
        3600
      );
    }

    // Get fixtures by date
    if (url.pathname === "/api/fixtures") {
      const date = url.searchParams.get("date");

      if (!date) {
        return jsonResponse(
          {
            success: false,
            message: "Please provide a date, e.g. ?date=2026-08-20"
          },
          400
        );
      }

      return await apiFootball(
        `/fixtures?date=${encodeURIComponent(date)}`,
        env,
        60
      );
    }

    // Get live matches
    if (url.pathname === "/api/live") {
      return await apiFootball(
        "/fixtures?live=all",
        env,
        20
      );
    }

    return jsonResponse(
      {
        success: false,
        message: "Endpoint not found"
      },
      404
    );
  }
};


/*
  API-FOOTBALL REQUEST
  cacheSeconds:
  - leagues = 1 hour
  - fixtures = 60 seconds
  - live = 20 seconds
*/

async function apiFootball(path, env, cacheSeconds) {

  if (!env.API_FOOTBALL_KEY) {
    return jsonResponse(
      {
        success: false,
        message: "API_FOOTBALL_KEY is not configured"
      },
      500
    );
  }

  /*
    Create a unique cache key for this exact API request.
  */

  const cacheUrl =
    "https://betkigali-cache.internal" + path;

  const cacheRequest = new Request(
    cacheUrl,
    {
      method: "GET"
    }
  );

  const cache = caches.default;

  /*
    Check cache first.
  */

  const cachedResponse = await cache.match(cacheRequest);

  if (cachedResponse) {

    const cachedHeaders =
      new Headers(cachedResponse.headers);

    cachedHeaders.set(
      "X-BetKigali-Cache",
      "HIT"
    );

    addCorsHeaders(cachedHeaders);

    return new Response(
      cachedResponse.body,
      {
        status: cachedResponse.status,
        headers: cachedHeaders
      }
    );
  }

  /*
    No cached data.
    Ask API-Football.
  */

  let response;

  try {

    response = await fetch(
      API_URL + path,
      {
        method: "GET",
        headers: {
          "x-apisports-key": env.API_FOOTBALL_KEY,
          "Accept": "application/json"
        }
      }
    );

  } catch (error) {

    return jsonResponse(
      {
        success: false,
        message: "Could not connect to API-Football",
        error: error.message
      },
      502
    );
  }

  const data = await response.json();

  /*
    If API-Football returns an error,
    do not cache it.
  */

  if (!response.ok) {

    const headers =
      new Headers({
        "Content-Type": "application/json"
      });

    addCorsHeaders(headers);

    headers.set(
      "X-BetKigali-Cache",
      "MISS"
    );

    return new Response(
      JSON.stringify(data),
      {
        status: response.status,
        headers
      }
    );
  }

  /*
    Successful API response.
    Save it in Cloudflare cache.
  */

  const headers =
    new Headers({
      "Content-Type": "application/json",
      "Cache-Control":
        `public, max-age=${cacheSeconds}`,
      "X-BetKigali-Cache":
        "MISS"
    });

  addCorsHeaders(headers);

  const responseToCache =
    new Response(
      JSON.stringify(data),
      {
        status: response.status,
        headers
      }
    );

  /*
    Put successful response into cache.
  */

  await cache.put(
    cacheRequest,
    responseToCache.clone()
  );

  return responseToCache;
}


/*
  JSON response helper
*/

function jsonResponse(data, status = 200) {

  const headers =
    new Headers({
      "Content-Type": "application/json"
    });

  addCorsHeaders(headers);

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers
    }
  );
}


/*
  CORS headers
*/

function corsHeaders() {

  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods":
      "GET, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type"
  };
}


/*
  Add CORS to existing headers
*/

function addCorsHeaders(headers) {

  headers.set(
    "Access-Control-Allow-Origin",
    "*"
  );

  headers.set(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );

  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );
}
