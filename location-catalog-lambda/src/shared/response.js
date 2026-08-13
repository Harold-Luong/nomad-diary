const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

export function successResponse(data, { statusCode = 200, meta } = {}) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(meta === undefined ? { data } : { data, meta }),
  };
}
