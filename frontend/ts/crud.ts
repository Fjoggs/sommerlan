// ts/crud.ts
import { showError } from "./errorHandler.js";

const API_URL = "http://localhost:8080/api";

type Model = "game" | "lan" | "user";

export const fetchById = async <T>(
  model: Model,
  id: number,
): Promise<T | undefined> => apiCall(`${model}/${id}`);

export const fetchAll = async <T>(model: Model): Promise<T[] | undefined> =>
  apiCall(`${model}`);

export const create = async <T>(
  model: Model,
  formData: FormData,
): Promise<T | undefined> =>
  apiCall(`${model}`, { method: "POST", body: formData });

export const deleteEntry = async (model: Model, id: number): Promise<void> =>
  deleteApiCall(`${model}/${id}`);

const apiCall = async <T>(
  url: string,
  options: RequestInit = {},
): Promise<T | undefined> => {
  try {
    const res = await fetch(`${API_URL}/${url}/`, options);

    if (!res.ok) {
      const action = options.method || "GET";
      showError(
        `${res.status}: Failed to ${action.toUpperCase()} ${url.split("/")[0]}`,
      );
      return;
    }
    return res.json();
  } catch (error) {
    showError("A network error occured");
  }
};

const deleteApiCall = async (url: string): Promise<void> => {
  try {
    const res = await fetch(`${API_URL}/${url}/`, { method: "DELETE" });

    if (res.status !== 204) {
      showError(`Failed to DELETE ${url.split("/")[0]}`);
      return;
    }
  } catch (error) {
    showError("A network error occured");
  }
};
