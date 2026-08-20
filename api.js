const API_URL = "https://v3.football.api-sports.io";

async function apiFootball(path) {
  const response = await fetch(API_URL + path, {
    method: "GET",
    headers: {
      "x-apisports-key": process.env.API_FOOTBALL_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

module.exports = {
  apiFootball
};
