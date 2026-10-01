import axios from "axios";

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

export async function createRoom(username) {
  const response = await api.post("/api/rooms", {
    username: username.trim(),
  });

  return response.data.data;
}

export async function joinRoom(code, username) {
  const normalizedCode = code.trim().toUpperCase();

  const response = await api.post(
    `/api/rooms/${encodeURIComponent(normalizedCode)}/join`,
    { username: username.trim() }
  );

  return response.data.data;
}

export function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  );
}