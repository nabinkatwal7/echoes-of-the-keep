import { scanEvents } from "@/lib/campaigns/queries";
import type { Viewer } from "@/lib/campaigns/visibility";

/** All events a viewer may see for a campaign (single scan, large limit). */
export async function getVisibleEventsForTest(campaignId: string, viewer: Viewer) {
  return (await scanEvents(campaignId, viewer, 0, 1000)).events;
}
