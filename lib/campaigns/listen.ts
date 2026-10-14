import pg from "pg";

type Wake = () => void;

type Bus = { waiters: Map<string, Set<Wake>>; ready: Promise<void> };

const g = globalThis as unknown as { campaignListen?: Bus };

/**
 * One dedicated Postgres connection for LISTEN. Prisma's pool recycles connections,
 * so it cannot hold LISTEN. If the connection fails, waiters still wake on the timeout
 * and the SSE poll delivers the event.
 */
function bus(): Bus {
  if (g.campaignListen) return g.campaignListen;
  const waiters = new Map<string, Set<Wake>>();
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  const ready = client
    .connect()
    .then(() => client.query("LISTEN campaign_events"))
    .then(() => {
      client.on("notification", (msg) => {
        if (!msg.payload) return;
        const set = waiters.get(msg.payload);
        if (!set) return;
        for (const wake of set) wake();
        set.clear();
      });
    })
    .catch(() => undefined);
  g.campaignListen = { waiters, ready };
  return g.campaignListen;
}

/** Resolves when `campaignId` is notified, or after `ms` so a missed NOTIFY still polls. */
export function waitForCampaign(campaignId: string, ms: number): Promise<void> {
  const { waiters, ready } = bus();
  return new Promise((resolve) => {
    let done = false;
    const wake = () => {
      if (done) return;
      done = true;
      waiters.get(campaignId)?.delete(wake);
      clearTimeout(timer);
      resolve();
    };
    const set = waiters.get(campaignId) ?? new Set();
    set.add(wake);
    waiters.set(campaignId, set);
    const timer = setTimeout(wake, ms);
    void ready.then(() => undefined, wake);
  });
}
