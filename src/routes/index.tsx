import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import happyImg from "@/assets/harry-happy.png";
import sadImg from "@/assets/harry-sad.png";
import { getAllFeedings, getStatus, recordFeeding } from "@/lib/feeding.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Harry Styles – Hrănitorul de pești" },
      {
        name: "description",
        content: "I-ai dat de mâncare lui Harry Styles azi? O masă pe zi, altfel Poxi, Beto și Josh tipă la tine.",
      },
      { property: "og:title", content: "Harry Styles – Hrănitorul de pești" },
      {
        property: "og:description",
        content: "I-ai dat de mâncare lui Harry Styles azi? O masă pe zi, altfel Poxi, Beto și Josh tipă la tine.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HarryFeeder,
});

const NAME_KEY = "harry-styles-feeder";

function HarryFeeder() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setName(localStorage.getItem(NAME_KEY) ?? "");
    setHydrated(true);
  }, []);

  const { data } = useQuery({
    queryKey: ["feedings"],
    queryFn: () => getStatus(),
  });

  const feedMutation = useMutation({
    mutationFn: (feederName: string) => recordFeeding({ data: { name: feederName } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feedings"] }),
  });

  const feedings = data?.feedings ?? [];
  const today = data?.today ?? "";
  const fedToday = feedings[0]?.fed_date === today;
  const [pdfLoading, setPdfLoading] = useState(false);

  const feed = () => {
    const trimmed = name.trim();
    if (!trimmed || fedToday || feedMutation.isPending) return;
    localStorage.setItem(NAME_KEY, trimmed);
    feedMutation.mutate(trimmed);
  };

  const downloadPdf = async () => {
    setPdfLoading(true);
    try {
      const all = await getAllFeedings();
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      // fonturile standard PDF nu au diacritice românești
      const plain = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Cine l-a hranit pe Harry Styles", 14, 18);
      doc.setFontSize(10);
      doc.text(`Generat: ${format(new Date(), "d MMM yyyy, HH:mm")}`, 14, 25);
      autoTable(doc, {
        startY: 30,
        head: [["Data", "Ora", "Cine l-a hranit"]],
        body: all.map((f) => [
          format(new Date(f.fed_at), "dd.MM.yyyy"),
          format(new Date(f.fed_at), "HH:mm"),
          plain(f.feeder_name),
        ]),
      });
      doc.save("istoric-harry-styles.pdf");
    } finally {
      setPdfLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="font-mono text-sm text-muted-foreground">Se încarcă…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="mx-auto max-w-md px-5 py-8 flex flex-col items-center gap-6">
        <header className="text-center">
          <p
            className={`font-mono text-xs uppercase tracking-[0.3em] ${fedToday ? "text-success" : "text-destructive"}`}
          >
            o masă pe zi · fără excepții
          </p>
          <h1 className="font-display text-6xl leading-none mt-1">HARRY STYLES</h1>
        </header>

        {/* Acvariul lui Harry */}
        <div className="relative w-full h-64 rounded-3xl border-2 border-border overflow-hidden bg-gradient-to-b from-primary/10 via-surface to-primary/5">
          {/* Bule */}
          {[
            { left: "8%", size: 10, delay: "0s", dur: "4.5s" },
            { left: "20%", size: 6, delay: "1.2s", dur: "5s" },
            { left: "38%", size: 8, delay: "2.1s", dur: "4s" },
            { left: "62%", size: 7, delay: "0.6s", dur: "5.5s" },
            { left: "80%", size: 11, delay: "1.8s", dur: "4.2s" },
            { left: "92%", size: 5, delay: "2.8s", dur: "5s" },
          ].map((b, i) => (
            <span
              key={i}
              className="absolute bottom-4 rounded-full border border-accent bg-accent/30 animate-bubble"
              style={{
                left: b.left,
                width: b.size,
                height: b.size,
                animationDelay: b.delay,
                animationDuration: b.dur,
              }}
            />
          ))}
          {/* Alge */}
          <div className="absolute bottom-3 left-5 w-2.5 h-16 rounded-full bg-success/40 animate-seaweed" />
          <div
            className="absolute bottom-3 left-10 w-2 h-10 rounded-full bg-success/25 animate-seaweed"
            style={{ animationDelay: "0.8s" }}
          />
          <div
            className="absolute bottom-3 right-7 w-2.5 h-20 rounded-full bg-success/35 animate-seaweed"
            style={{ animationDelay: "1.4s" }}
          />
          {/* Nisip */}
          <div className="absolute bottom-0 inset-x-0 h-3 bg-secondary/80" />

          {/* Harry înotând */}
          <div
            className={`absolute top-10 ${fedToday ? "animate-swim" : "animate-swim-slow"}`}
            style={{ animationDuration: fedToday ? "11s" : "24s" }}
          >
            <div
              className={`absolute -inset-3 rounded-full blur-xl ${
                fedToday ? "bg-success/30" : "bg-destructive/25"
              }`}
            />
            <img
              src={fedToday ? happyImg : sadImg}
              alt={fedToday ? "Harry Styles, pește fericit" : "Harry Styles, pește supărat"}
              width={816}
              height={816}
              className={`relative w-40 h-40 animate-bob ${
                fedToday ? "drop-shadow-[0_0_12px_rgba(74,222,128,0.45)]" : "drop-shadow-[0_0_12px_rgba(248,113,113,0.4)]"
              }`}
            />
          </div>

          {!fedToday && (
            <div className="absolute right-3 top-3 z-10 bg-destructive text-destructive-foreground font-display text-sm px-3 py-2 rounded-xl rotate-6 shadow-lg">
              JOSH: HRĂNEȘTE-L!
              <div className="absolute left-3 -bottom-1.5 w-3 h-3 bg-destructive rotate-45" />
            </div>
          )}
          {!fedToday && (
            <div className="absolute left-3 top-20 z-10 bg-destructive text-destructive-foreground font-display text-sm px-3 py-2 rounded-xl -rotate-6 shadow-lg">
              POXI: ACUM!!
              <div className="absolute right-3 -bottom-1.5 w-3 h-3 bg-destructive rotate-45" />
            </div>
          )}
        </div>

        {/* Starea */}
        <div
          className={`w-full border-2 rounded-2xl px-5 py-4 text-center ${
            fedToday ? "border-success bg-success/15 text-success" : "border-destructive/50 bg-destructive/10"
          }`}
        >
          <p className="font-display text-3xl tracking-wide">
            {fedToday ? "HARRY A MÂNCAT AZI" : "HARRY NU A MÂNCAT AZI"}
          </p>
        </div>

        {/* Numele + butonul */}
        {!fedToday && (
          <div className="w-full">
            <label htmlFor="feeder-name" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Cine îl hrănește?
            </label>
            <input
              id="feeder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Scrie numele tău…"
              maxLength={40}
              className="mt-1 w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>
        )}

        {!fedToday && (
          <div className="relative w-full">
            <button
              onClick={feed}
              disabled={feedMutation.isPending || !name.trim()}
              className={`w-full font-display text-3xl tracking-wider rounded-2xl py-5 border-b-8 transition-all active:translate-y-1 active:border-b-2 ${
                !name.trim()
                  ? "bg-primary/40 text-primary-foreground/60 border-primary-foreground/10 cursor-not-allowed"
                  : "bg-primary text-primary-foreground border-primary-foreground/20 hover:brightness-110 cursor-pointer"
              }`}
            >
              {feedMutation.isPending ? "SE HRĂNEȘTE…" : "L-AM HRĂNIT"}
            </button>
            {feedMutation.isPending && (
              <div className="pointer-events-none absolute inset-x-0 -top-4 h-48 overflow-hidden">
                {Array.from({ length: 14 }).map((_, i) => (
                  <span
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-primary animate-flake"
                    style={{
                      left: `${(i * 7.3) % 100}%`,
                      animationDelay: `${(i % 7) * 0.12}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Istoric */}
        <section className="w-full border-2 border-border rounded-2xl bg-card px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl tracking-wide">Cine l-a hrănit pe Harry</h2>
            <button
              onClick={downloadPdf}
              disabled={pdfLoading}
              className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-foreground disabled:opacity-50 cursor-pointer"
            >
              {pdfLoading ? "se generează…" : "istoric"}
            </button>
          </div>
          {feedings.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-3">Nimeni nu l-a hrănit încă. Fii primul!</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {feedings.map((f) => (
                <li key={f.fed_date} className="flex items-center justify-between py-2.5">
                  <span className="font-semibold">{f.feeder_name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {format(new Date(f.fed_at), "d MMM yyyy, HH:mm", {
                      locale: ro,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
