// Google-only transport. No browser, database or schedule calculations.
export class CalendarError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
export async function fetchEvents({ accessToken, range, fetcher = fetch }) {
  const items = [],
    seen = new Set();
  let pageToken;
  // A bounded full read: never return a truncated schedule as available time.
  for (let page = 0; page < 20; page++) {
    const url = new URL(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    );
    url.search = new URLSearchParams({
      timeMin: range.startDate + "T00:00:00+09:00",
      timeMax: range.endDateExclusive + "T00:00:00+09:00",
      timeZone: "Asia/Tokyo",
      singleEvents: "true",
      orderBy: "startTime",
      showDeleted: "false",
      maxResults: "2500",
      maxAttendees: "1",
      fields:
        "nextPageToken,items(id,status,start,end,eventType,transparency,organizer(self),attendees(self,responseStatus))",
      ...(pageToken ? { pageToken } : {}),
    });
    let response, body;
    try {
      response = await fetcher(url, {
        headers: { Authorization: "Bearer " + accessToken },
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      });
    } catch {
      throw new CalendarError("GOOGLE_NETWORK");
    }
    if (!response.ok)
      throw new CalendarError(
        {
          401: "GOOGLE_RECONNECT",
          403: "GOOGLE_FORBIDDEN",
          429: "GOOGLE_RATE_LIMIT",
        }[response.status] ?? "GOOGLE_UNAVAILABLE",
      );
    try {
      body = await response.json();
    } catch {
      throw new CalendarError("GOOGLE_RESPONSE_INVALID");
    }
    if (
      !body ||
      (body.items !== undefined && !Array.isArray(body.items)) ||
      (body.nextPageToken !== undefined &&
        (typeof body.nextPageToken !== "string" || !body.nextPageToken))
    )
      throw new CalendarError("GOOGLE_RESPONSE_INVALID");
    items.push(...(body.items ?? []));
    if (!body.nextPageToken) return items;
    if (seen.has(body.nextPageToken))
      throw new CalendarError("GOOGLE_RESPONSE_INVALID");
    seen.add(body.nextPageToken);
    pageToken = body.nextPageToken;
  }
  throw new CalendarError("GOOGLE_READ_LIMIT");
}
