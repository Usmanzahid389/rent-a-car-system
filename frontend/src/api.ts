const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function getToken(): string | null {
  return localStorage.getItem("token");
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token && !path.startsWith("/api/auth")) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401 && !path.startsWith("/api/auth")) {
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    window.dispatchEvent(new Event("auth:logout"));
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      typeof data?.error === "string"
        ? data.error
        : typeof data?.error === "object"
          ? JSON.stringify(data.error)
          : res.statusText;
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return data as T;
}

export type Admin = { id: string; email: string; createdAt?: string };

export async function login(email: string, password: string) {
  return api<{ token: string; admin: Admin }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email: string, password: string) {
  return api<{ token: string; admin: Admin }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
};

export type Vehicle = {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
  dailyRate: string;
  isActive: boolean;
  createdAt: string;
};

export type Booking = {
  id: string;
  customerId: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  totalPrice: string;
  status: "pending" | "confirmed" | "cancelled";
  customer?: { id: string; name: string; email: string };
  vehicle?: {
    id: string;
    make: string;
    model: string;
    licensePlate: string;
  };
};

export type DashboardStats = { totalBookings: number; totalRevenue: string };

export const customersApi = {
  list: () => api<Customer[]>("/api/customers"),
  create: (body: { name: string; email: string; phone?: string | null }) =>
    api<Customer>("/api/customers", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<{ name: string; email: string; phone: string | null }>) =>
    api<Customer>(`/api/customers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => api<void>(`/api/customers/${id}`, { method: "DELETE" }),
};

export const vehiclesApi = {
  list: () => api<Vehicle[]>("/api/vehicles"),
  create: (body: {
    make: string;
    model: string;
    licensePlate: string;
    dailyRate: number | string;
    isActive?: boolean;
  }) => api<Vehicle>("/api/vehicles", { method: "POST", body: JSON.stringify(body) }),
  update: (
    id: string,
    body: Partial<{
      make: string;
      model: string;
      licensePlate: string;
      dailyRate: number | string;
      isActive: boolean;
    }>
  ) => api<Vehicle>(`/api/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => api<void>(`/api/vehicles/${id}`, { method: "DELETE" }),
};

export const bookingsApi = {
  list: () => api<Booking[]>("/api/bookings"),
  create: (body: {
    customerId: string;
    vehicleId: string;
    startDate: string;
    endDate: string;
    totalPrice: number | string;
    status?: string;
  }) => api<Booking>("/api/bookings", { method: "POST", body: JSON.stringify(body) }),
  update: (
    id: string,
    body: Partial<{
      customerId: string;
      vehicleId: string;
      startDate: string;
      endDate: string;
      totalPrice: number | string;
      status: string;
    }>
  ) => api<Booking>(`/api/bookings/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => api<void>(`/api/bookings/${id}`, { method: "DELETE" }),
};

export const dashboardApi = {
  stats: () => api<DashboardStats>("/api/dashboard/stats"),
};
