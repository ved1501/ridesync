// Wraps fetch() and automatically attaches the Authorization header
// when a token is provided. Use this for any request that hits a
// protected (verifyToken-guarded) backend route.
export function authFetch(url, token, options = {}) {
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}
