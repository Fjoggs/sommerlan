import { showError } from "./errorHandler.js";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public url: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_URL = "http://localhost:8080/api";

type Model = "game" | "lan" | "user";

export const fetchById = async <T>(model: Model, id: number): Promise<T> =>
  apiCall(`${model}/${id}`);

export const fetchAll = async <T>(model: Model): Promise<T> => apiCall(model);

export const create = async <T>(model: Model, formData: FormData): Promise<T> =>
  apiCall(model, { method: "POST", body: formData });

export const deleteEntry = async (model: Model, id: number) =>
  deleteApiCall(`${model}/${id}`);

const apiCall = async <T>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  const res = await fetch(`${API_URL}/${url}/`, options);
  if (!res.ok) {
    const action = options.method || "GET";
    throw new ApiError(
      `${res.status}: Failed to ${action.toUpperCase()} ${url.split("/")[0]}`,
      res.status,
      url,
    );
  }

  return res.json();
};

const deleteApiCall = async (url: string): Promise<void> => {
  const res = await fetch(`${API_URL}/${url}/`, { method: "DELETE" });
  if (res.status !== 204) {
    throw new ApiError(
      `Failed to DELETE ${url.split("/")[0]}`,
      res.status,
      url,
    );
  }
};

const apiCallErrorHandler = async <T>(
  url: string,
  options: RequestInit = {},
): Promise<T | undefined> => {
  try {
    return await apiCall<T>(url, options);
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "An error occurred";
    showError(message);
    return undefined;
  }
};
