import axios from "axios";

export const base_url = "https://rawi-backend.vercel.app";

export const axiosInstance = axios.create({
  baseURL: base_url,
  headers: {
    "Content-Type": "application/json",
  },
});