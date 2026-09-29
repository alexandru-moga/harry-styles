import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

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

function getPublicClient() {
  return createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export const getStatus = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from("feedings")
    .select("fed_date, feeder_name, fed_at")
    .gte("fed_date", bucharestDaysAgo(6))
    .order("fed_date", { ascending: false })
    .limit(7);

  if (error) throw error;

  return {
    feedings: (data ?? []) as Feeding[],
    today: bucharestToday(),
  };
});

export const getAllFeedings = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from("feedings")
    .select("fed_date, feeder_name, fed_at")
    .order("fed_date", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as Feeding[];
});

export const recordFeeding = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ name: z.string().trim().min(1).max(40) }).parse(d),
  )
  .handler(async ({ data }) => {
    const supabase = getPublicClient();
    const { error } = await supabase.from("feedings").insert({
      feeder_name: data.name,
      fed_date: bucharestToday(),
    });

    if (error) {
      // cineva l-a hrănit deja azi (ziua trebuie să fie unică)
      if (error.code === "23505") return { ok: false as const, reason: "already-fed" };
      throw error;
    }

    return { ok: true as const };
  });
