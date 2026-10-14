-- Wake the SSE listener as soon as a campaign event is inserted.
CREATE OR REPLACE FUNCTION notify_campaign_event() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('campaign_events', NEW."campaignId");
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaign_event_notify ON "CampaignEvent";
CREATE TRIGGER campaign_event_notify
AFTER INSERT ON "CampaignEvent"
FOR EACH ROW EXECUTE FUNCTION notify_campaign_event();
