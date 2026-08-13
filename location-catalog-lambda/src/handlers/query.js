import { successResponse } from "../shared/response.js";

export async function handler() {
  return successResponse({
    service: "location-catalog",
    status: "ok",
  });
}
