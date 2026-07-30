import { getToken, removeToken, getServerUrl } from "../utils/storage";

let baseUrl = "";

export const setBaseUrl = (url) => {
  baseUrl = url.replace(/\/+$/, "");
};

export const getBaseUrl = () => baseUrl;

const request = async (endpoint, options = {}) => {
  if (!baseUrl) {
    const stored = await getServerUrl();
    if (stored) baseUrl = stored;
  }

  const token = await getToken();

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    await removeToken();
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const text = await response.text();
    let message;
    try {
      const parsed = JSON.parse(text);
      message = parsed.message || parsed.error || text;
    } catch {
      message = text || `Request failed with status ${response.status}`;
    }
    throw new Error(message);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
};

export const api = {
  login: (email, password) =>
    request("/api/auth", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getDashboard: () => request("/api/dashboard"),

  getProjects: () => request("/api/projects"),

  getTasks: () => request("/api/tasks"),

  getContacts: () => request("/api/contacts"),

  getInvoices: () => request("/api/invoices"),

  getNotifications: () => request("/api/notifications"),

  getCalendar: () => request("/api/calendar"),

  getEmployees: () => request("/api/employees"),
};
