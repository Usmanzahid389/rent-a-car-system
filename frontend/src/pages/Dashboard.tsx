import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  bookingsApi,
  customersApi,
  dashboardApi,
  vehiclesApi,
  type Booking,
  type Customer,
  type DashboardStats,
  type Vehicle,
} from "../api";
import { useAuth } from "../context/AuthContext";

type Tab = "overview" | "customers" | "vehicles" | "bookings";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function isoToDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function StatusBadge({ status }: { status: Booking["status"] }) {
  return <span className={`badge badge--${status}`}>{status}</span>;
}

export default function Dashboard() {
  const { admin, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    setLoadError(null);
    setBusy(true);
    try {
      const [s, c, v, b] = await Promise.all([
        dashboardApi.stats(),
        customersApi.list(),
        vehiclesApi.list(),
        bookingsApi.list(),
      ]);
      setStats(s);
      setCustomers(c);
      setVehicles(v);
      setBookings(b);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <div className="layout">
      <header className="topbar">
        <div className="brand">
          <strong>Rent-a-car</strong>
          <span className="muted">{admin?.email}</span>
        </div>
        <nav className="nav-tabs" aria-label="Main">
          <button
            type="button"
            className={`nav-tab${tab === "overview" ? " active" : ""}`}
            onClick={() => setTab("overview")}
            aria-current={tab === "overview" ? "page" : undefined}
          >
            Overview
          </button>
          <button
            type="button"
            className={`nav-tab${tab === "customers" ? " active" : ""}`}
            onClick={() => setTab("customers")}
            aria-current={tab === "customers" ? "page" : undefined}
          >
            Customers
          </button>
          <button
            type="button"
            className={`nav-tab${tab === "vehicles" ? " active" : ""}`}
            onClick={() => setTab("vehicles")}
            aria-current={tab === "vehicles" ? "page" : undefined}
          >
            Vehicles
          </button>
          <button
            type="button"
            className={`nav-tab${tab === "bookings" ? " active" : ""}`}
            onClick={() => setTab("bookings")}
            aria-current={tab === "bookings" ? "page" : undefined}
          >
            Bookings
          </button>
          <button type="button" className="link-logout" onClick={logout}>
            Log out
          </button>
        </nav>
      </header>

      <main className="main">
        {loadError && (
          <p className="error banner">
            {loadError} <Link to="/login">Sign in again</Link>
          </p>
        )}
        {busy && !stats && (
          <div className="loading-block" aria-busy="true">
            <div className="spinner" />
            <p className="muted">Loading your dashboard…</p>
          </div>
        )}

        {tab === "overview" && stats && (
          <section className="section">
            <div className="section-head">
              <div>
                <h2>Overview</h2>
                <p className="section-desc muted">
                  Revenue includes <strong>confirmed</strong> bookings only. Total bookings excludes{" "}
                  <strong>cancelled</strong>.
                </p>
              </div>
            </div>
            <div className="stats">
              <div className="stat-card">
                <span className="stat-icon" aria-hidden>
                  📋
                </span>
                <span className="stat-label">Active bookings</span>
                <span className="stat-value">{stats.totalBookings}</span>
                <span className="muted stat-footnote">Non-cancelled reservations</span>
              </div>
              <div className="stat-card stat-card--revenue">
                <span className="stat-icon" aria-hidden>
                  💰
                </span>
                <span className="stat-label">Revenue</span>
                <span className="stat-value">${stats.totalRevenue}</span>
                <span className="muted stat-footnote">From confirmed trips</span>
              </div>
            </div>
          </section>
        )}

        {tab === "customers" && (
          <CustomerSection
            customers={customers}
            onRefresh={loadAll}
            onError={setLoadError}
          />
        )}
        {tab === "vehicles" && (
          <VehicleSection vehicles={vehicles} onRefresh={loadAll} onError={setLoadError} />
        )}
        {tab === "bookings" && (
          <BookingSection
            bookings={bookings}
            customers={customers}
            vehicles={vehicles}
            onRefresh={loadAll}
            onError={setLoadError}
          />
        )}
      </main>
    </div>
  );
}

function CustomerSection({
  customers,
  onRefresh,
  onError,
}: {
  customers: Customer[];
  onRefresh: () => Promise<void>;
  onError: (s: string | null) => void;
}) {
  const [modal, setModal] = useState<Customer | "new" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (modal && modal !== "new") {
      setName(modal.name);
      setEmail(modal.email);
      setPhone(modal.phone ?? "");
    }
    if (modal === "new") {
      setName("");
      setEmail("");
      setPhone("");
    }
  }, [modal]);

  async function save(e: FormEvent) {
    e.preventDefault();
    onError(null);
    setSaving(true);
    try {
      if (modal === "new") {
        await customersApi.create({ name, email, phone: phone || null });
      } else if (modal) {
        await customersApi.update(modal.id, { name, email, phone: phone || null });
      }
      setModal(null);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Customer) {
    if (!confirm(`Delete customer ${c.name}?`)) return;
    onError(null);
    try {
      await customersApi.remove(c.id);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>Customers</h2>
          <p className="section-desc muted">People who can book vehicles. Used when creating reservations.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModal("new")}>
          + Add customer
        </button>
      </div>
      <div className="table-wrap">
        {customers.length === 0 ? (
          <div className="empty-table">
            <p>No customers yet.</p>
            <p className="muted">Add your first customer to start taking bookings.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td>{c.email}</td>
                  <td>{c.phone ?? "—"}</td>
                  <td className="actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModal(c)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => void remove(c)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal === "new" ? "New customer" : "Edit customer"}</h3>
            </div>
            <form onSubmit={(e) => void save(e)} className="form">
              <label>
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Doe" />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="jane@email.com"
                />
              </label>
              <label>
                Phone <span className="muted">(optional)</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 …" />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function VehicleSection({
  vehicles,
  onRefresh,
  onError,
}: {
  vehicles: Vehicle[];
  onRefresh: () => Promise<void>;
  onError: (s: string | null) => void;
}) {
  const [modal, setModal] = useState<Vehicle | "new" | null>(null);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (modal && modal !== "new") {
      setMake(modal.make);
      setModel(modal.model);
      setLicensePlate(modal.licensePlate);
      setDailyRate(modal.dailyRate);
      setIsActive(modal.isActive);
    }
    if (modal === "new") {
      setMake("");
      setModel("");
      setLicensePlate("");
      setDailyRate("");
      setIsActive(true);
    }
  }, [modal]);

  async function save(e: FormEvent) {
    e.preventDefault();
    onError(null);
    setSaving(true);
    try {
      const rate = Number(dailyRate);
      if (Number.isNaN(rate) || rate <= 0) throw new Error("Daily rate must be a positive number");
      if (modal === "new") {
        await vehiclesApi.create({ make, model, licensePlate, dailyRate: rate, isActive });
      } else if (modal) {
        await vehiclesApi.update(modal.id, { make, model, licensePlate, dailyRate: rate, isActive });
      }
      setModal(null);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(v: Vehicle) {
    if (!confirm(`Delete vehicle ${v.make} ${v.model}?`)) return;
    onError(null);
    try {
      await vehiclesApi.remove(v.id);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>Vehicles</h2>
          <p className="section-desc muted">Inactive vehicles cannot be assigned to new bookings.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModal("new")}>
          + Add vehicle
        </button>
      </div>
      <div className="table-wrap">
        {vehicles.length === 0 ? (
          <div className="empty-table">
            <p>No vehicles in the fleet yet.</p>
            <p className="muted">Add a vehicle with a daily rate to enable bookings.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Make / Model</th>
                <th>Plate</th>
                <th>Daily rate</th>
                <th>Bookable</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td>
                    <strong>
                      {v.make} {v.model}
                    </strong>
                  </td>
                  <td>
                    <span className="plate">{v.licensePlate}</span>
                  </td>
                  <td>${v.dailyRate}</td>
                  <td>
                    <span className={v.isActive ? "badge badge--yes" : "badge badge--no"}>
                      {v.isActive ? "Active" : "Off fleet"}
                    </span>
                  </td>
                  <td className="actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModal(v)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => void remove(v)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal === "new" ? "New vehicle" : "Edit vehicle"}</h3>
            </div>
            <form onSubmit={(e) => void save(e)} className="form">
              <label>
                Make
                <input value={make} onChange={(e) => setMake(e.target.value)} required placeholder="Toyota" />
              </label>
              <label>
                Model
                <input value={model} onChange={(e) => setModel(e.target.value)} required placeholder="Corolla" />
              </label>
              <label>
                License plate
                <input
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  required
                  placeholder="ABC-1234"
                />
              </label>
              <label>
                Daily rate (USD)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                  required
                />
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Available for new bookings
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function BookingSection({
  bookings,
  customers,
  vehicles,
  onRefresh,
  onError,
}: {
  bookings: Booking[];
  customers: Customer[];
  vehicles: Vehicle[];
  onRefresh: () => Promise<void>;
  onError: (s: string | null) => void;
}) {
  const [modal, setModal] = useState<Booking | "new" | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [status, setStatus] = useState<"pending" | "confirmed" | "cancelled">("pending");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (modal && modal !== "new") {
      setCustomerId(modal.customerId);
      setVehicleId(modal.vehicleId);
      setStartDate(isoToDatetimeLocal(modal.startDate));
      setEndDate(isoToDatetimeLocal(modal.endDate));
      setTotalPrice(modal.totalPrice);
      setStatus(modal.status);
    }
    if (modal === "new") {
      setCustomerId(customers[0]?.id ?? "");
      setVehicleId(vehicles.find((v) => v.isActive)?.id ?? vehicles[0]?.id ?? "");
      setStartDate("");
      setEndDate("");
      setTotalPrice("");
      setStatus("pending");
    }
  }, [modal, customers, vehicles]);

  async function save(e: FormEvent) {
    e.preventDefault();
    onError(null);
    setSaving(true);
    try {
      const price = Number(totalPrice);
      if (Number.isNaN(price) || price < 0) throw new Error("Total price must be a number");
      const startIso = new Date(startDate).toISOString();
      const endIso = new Date(endDate).toISOString();
      if (modal === "new") {
        await bookingsApi.create({
          customerId,
          vehicleId,
          startDate: startIso,
          endDate: endIso,
          totalPrice: price,
          status,
        });
      } else if (modal) {
        await bookingsApi.update(modal.id, {
          customerId,
          vehicleId,
          startDate: startIso,
          endDate: endIso,
          totalPrice: price,
          status,
        });
      }
      setModal(null);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(b: Booking) {
    if (!confirm("Delete this booking?")) return;
    onError(null);
    try {
      await bookingsApi.remove(b.id);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const activeVehicles = vehicles.filter((v) => v.isActive);

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>Bookings</h2>
          <p className="section-desc muted">Overlapping dates on the same vehicle are blocked automatically.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setModal("new")}
          disabled={customers.length === 0 || activeVehicles.length === 0}
        >
          + Add booking
        </button>
      </div>
      {customers.length === 0 || activeVehicles.length === 0 ? (
        <div className="callout" role="status">
          Add at least one <strong>customer</strong> and one <strong>active vehicle</strong> before you can create a
          booking.
        </div>
      ) : null}
      <div className="table-wrap">
        {bookings.length === 0 ? (
          <div className="empty-table">
            <p>No bookings scheduled.</p>
            <p className="muted">Create a booking to connect a customer with a vehicle and dates.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Pickup</th>
                <th>Return</th>
                <th>Total</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.customer?.name ?? b.customerId}</td>
                  <td>
                    {b.vehicle
                      ? `${b.vehicle.make} ${b.vehicle.model} (${b.vehicle.licensePlate})`
                      : b.vehicleId}
                  </td>
                  <td>{formatDate(b.startDate)}</td>
                  <td>{formatDate(b.endDate)}</td>
                  <td>
                    <strong>${b.totalPrice}</strong>
                  </td>
                  <td>
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModal(b)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => void remove(b)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <div className="modal modal-wide" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal === "new" ? "New booking" : "Edit booking"}</h3>
            </div>
            <form onSubmit={(e) => void save(e)} className="form">
              <label>
                Customer
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Vehicle
                <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id} disabled={!v.isActive}>
                      {v.make} {v.model} — {v.licensePlate}
                      {!v.isActive ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Pickup
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </label>
              <label>
                Return
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </label>
              <label>
                Total price (USD)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(e.target.value)}
                  required
                />
              </label>
              <label>
                Status
                <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                  <option value="pending">pending</option>
                  <option value="confirmed">confirmed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
