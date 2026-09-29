import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Feeding = {
  fed_date: string;
  feeder_name: string;
  fed_at: string;
};

const BUCHAREST_TZ = "Europe/Bucharest";

function bucharestToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUCHAREST_TZ }).format(new Date());
}

function bucharestDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUCHAREST_TZ }).format(d);
}

function getMariaDbConfig() {
  const config = {
    host: process.env["MARIADB_HOST"],
    user: process.env["MARIADB_USER"],
    password: process.env["MARIADB_PASSWORD"],
    database: process.env["MARIADB_DATABASE"],
  };
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([name]) => `MARIADB_${name.toUpperCase()}`);

  if (missing.length > 0) {
    throw new Error(`Lipsesc variabilele de mediu MariaDB: ${missing.join(", ")}`);
  }

  return {
    ...config,
    port: Number(process.env["MARIADB_PORT"] ?? 3306),
  };
}

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const mysql = await import("mysql2/promise");
  const conn = await mysql.createConnection(getMariaDbConfig());
  try {
    const [rows] = await conn.query(sql, params);
    return rows as T[];
  } finally {
    await conn.end();
  }
}

function toIsoDate(v: Date | string): string {
  if (v instanceof Date) {
    // mysql2 returnează Date în fusul orar al serverului; luăm componentele locale
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(v).slice(0, 10);
}

function toIsoDateTime(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : String(v);
}

export const getStatus = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await query<{ fed_date: Date | string; feeder_name: string; fed_at: Date | string }>(
    "SELECT fed_date, feeder_name, fed_at FROM feedings WHERE fed_date >= ? ORDER BY fed_date DESC",
    [bucharestDaysAgo(6)],
  );
  const feedings: Feeding[] = rows.map((r) => ({
    fed_date: toIsoDate(r.fed_date),
    feeder_name: r.feeder_name,
    fed_at: toIsoDateTime(r.fed_at),
  }));
  return { feedings, today: bucharestToday() };
});

export const getAllFeedings = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await query<{ fed_date: Date | string; feeder_name: string; fed_at: Date | string }>(
    "SELECT fed_date, feeder_name, fed_at FROM feedings ORDER BY fed_date DESC",
  );
  return rows.map((r) => ({
    fed_date: toIsoDate(r.fed_date),
    feeder_name: r.feeder_name,
    fed_at: toIsoDateTime(r.fed_at),
  })) as Feeding[];
});

export const recordFeeding = createServerFn({ method: "POST" })
  .validator((d) => z.object({ name: z.string().trim().min(1).max(40) }).parse(d))
  .handler(async ({ data }) => {
    try {
      await query("INSERT INTO feedings (fed_date, feeder_name, fed_at) VALUES (?, ?, NOW())", [
        bucharestToday(),
        data.name,
      ]);
      return { ok: true as const };
    } catch (e) {
      // 1062 = intrare duplicată -> a mâncat deja azi
      if (typeof e === "object" && e !== null && (e as { errno?: number }).errno === 1062) {
        return { ok: false as const, reason: "already-fed" };
      }
      throw new Error("Eroare la salvare");
    }
  });
