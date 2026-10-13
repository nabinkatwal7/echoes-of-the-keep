# ADR 0001: Realtime over SSE + Postgres LISTEN/NOTIFY

**Status:** accepted. **Context:** live sessions need server-to-client updates with replay after reconnects, without extra infrastructure.
**Decision:** persist an event row per change, `NOTIFY` per campaign, stream via SSE with `Last-Event-ID` replay; client actions go through server actions.
**Consequences:** needs a long-lived Node host. The transport sits behind `lib/realtime` so Ably/Pusher can replace it if we deploy serverless.
