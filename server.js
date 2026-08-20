const API_URL = "https://v3.football.api-sports.io";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Test endpoint
    if (url.pathname === "/") {
      return Response.json({
        success: true,
        message: "BetKigali API is running"
      });
    }

    // Get leagues
    if (url.pathname === "/api/leagues") {
      return await apiFootball("/leagues", env);
    }

    // Get fixtures by date
    if (url.pathname === "/api/fixtures") {
      const date = url.searchParams.get("date");

      if (!date) {
        return Response.json(
          {
            success: false,
            message: "Please provide a date, e.g. ?date=2026-08-20"
          },
          { status: 400 }
        );
      }

      return await apiFootball(
        `/fixtures?date=${encodeURIComponent(date)}`,
        env
      );
    }

    // Get live matches
    if (url.pathname === "/api/live") {
      return await apiFootball("/fixtures?live=all", env);
    }

    return Response.json(
      {
        success: false,
        message: "Endpoint not found"
      },
      { status: 404 }
    );
  }
};

async function apiFootball(path, env) {
  if (!env.API_FOOTBALL_KEY) {
    return Response.json(
      {
        success: false,
        message: "API_FOOTBALL_KEY is not configured"
      },
      { status: 500 }
    );
  }

  const response = await fetch(API_URL + path, {
    method: "GET",
    headers: {
      "x-apisports-key": env.API_FOOTBALL_KEY
    }
  });

  const data = await response.json();

  return Response.json(data, {
    status: response.status
  });
}
