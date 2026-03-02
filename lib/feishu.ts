import { ScheduleEvent } from "../types";

let tenantAccessToken = "";
let tokenExpire = 0;

async function getTenantAccessToken() {
  if (tenantAccessToken && Date.now() < tokenExpire) {
    return tenantAccessToken;
  }

  const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
  const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;

  if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
    throw new Error("Missing Feishu API credentials in environment variables");
  }

  const res = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET,
      }),
    }
  );

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Failed to get tenant access token: ${data.msg}`);
  }

  tenantAccessToken = data.tenant_access_token;
  tokenExpire = Date.now() + (data.expire - 60) * 1000;
  return tenantAccessToken;
}

export async function getFeishuEvents(
  startDate?: string,
  endDate?: string
): Promise<ScheduleEvent[]> {
  const token = await getTenantAccessToken();
  const FEISHU_CALENDAR_ID = process.env.FEISHU_CALENDAR_ID || "primary";
  
  // Default to fetching events for the current year if dates are not provided
  let start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
  let end = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), 11, 31);
  
  // ensure start and end have time components for proper parsing if needed, but Date constructor handles "YYYY-MM-DD" as UTC.
  // Feishu requires start_time and end_time in seconds
  const startTimeStr = Math.floor(start.getTime() / 1000).toString();
  const endTimeStr = Math.floor(end.getTime() / 1000).toString();

  let allEvents: any[] = [];
  let pageToken = "";

  do {
    let url = `https://open.feishu.cn/open-apis/calendar/v4/calendars/${FEISHU_CALENDAR_ID}/events?start_time=${startTimeStr}&end_time=${endTimeStr}`;
    if (pageToken) {
      url += `&page_token=${pageToken}`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (data.code !== 0) {
      // If the calendar doesn't exist, we just return empty
      if (data.code === 230006) return []; 
      throw new Error(`Failed to fetch calendar events: ${data.msg}`);
    }

    if (data.data.items) {
      // Filter out events that are deleted/cancelled
      const activeEvents = data.data.items.filter((item: any) => item.status !== 'cancelled');
      allEvents = allEvents.concat(activeEvents);
    }
    pageToken = data.data.page_token;
  } while (pageToken);

  return allEvents.map(mapFeishuEventToScheduleEvent);
}

export async function createFeishuEvent(event: ScheduleEvent): Promise<any> {
  const token = await getTenantAccessToken();
  const FEISHU_CALENDAR_ID = process.env.FEISHU_CALENDAR_ID || "primary";

  // Parse date and time in China timezone (+08:00 for simplicity)
  // For standard scheduling, assume local time
  const startDateTime = new Date(`${event.date}T${event.startTime}:00+08:00`);
  const endDateTime = new Date(`${event.date}T${event.endTime}:00+08:00`);

  const body = {
    summary: event.title,
    description: `类型: ${event.type}
${event.description || ""}
参与人: ${event.participants?.join(", ") || "无"}`,
    start_time: {
      timestamp: Math.floor(startDateTime.getTime() / 1000).toString(),
      timezone: "Asia/Shanghai",
    },
    end_time: {
      timestamp: Math.floor(endDateTime.getTime() / 1000).toString(),
      timezone: "Asia/Shanghai",
    },
  };

  const res = await fetch(
    `https://open.feishu.cn/open-apis/calendar/v4/calendars/${FEISHU_CALENDAR_ID}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Failed to create event: ${data.msg}`);
  }

  return data.data.event;
}

export async function deleteFeishuEvent(eventId: string): Promise<void> {
  const token = await getTenantAccessToken();
  const FEISHU_CALENDAR_ID = process.env.FEISHU_CALENDAR_ID || "primary";

  const res = await fetch(
    `https://open.feishu.cn/open-apis/calendar/v4/calendars/${FEISHU_CALENDAR_ID}/events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await res.json();
  // 230009 means event not found, which is fine for deletion
  if (data.code !== 0 && data.code !== 230009) {
    throw new Error(`Failed to delete event: ${data.msg}`);
  }
}

function mapFeishuEventToScheduleEvent(feishuEvent: any): ScheduleEvent {
  // Try to extract type and description from Feishu description
  const desc = feishuEvent.description || "";
  let type = "一般活动";
  let description = desc;
  let participants: string[] = [];

  const typeMatch = desc.match(/类型:\s*(.*)/);
  if (typeMatch) {
    type = typeMatch[1].trim();
  }
  
  const pMatch = desc.match(/参与人:\s*(.*)/);
  if (pMatch) {
    participants = pMatch[1].split(",").map((s: string) => s.trim()).filter((s: string) => s && s !== "无");
  }

  // Clean description
  description = description.replace(/类型:.*\n/, "").replace(/参与人:.*/, "").trim();

  // Extract start and end times, handling both timestamp (for specific times) and date (for all-day events) formats
  let startTimeMs = 0;
  if (feishuEvent.start_time.timestamp) {
    startTimeMs = parseInt(feishuEvent.start_time.timestamp) * 1000;
  } else if (feishuEvent.start_time.date) {
    startTimeMs = new Date(`${feishuEvent.start_time.date}T00:00:00+08:00`).getTime();
  }

  let endTimeMs = 0;
  if (feishuEvent.end_time.timestamp) {
    endTimeMs = parseInt(feishuEvent.end_time.timestamp) * 1000;
  } else if (feishuEvent.end_time.date) {
    endTimeMs = new Date(`${feishuEvent.end_time.date}T23:59:59+08:00`).getTime();
  }

  // Use a fixed timezone (Asia/Shanghai) formatting
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const startParts = formatter.formatToParts(new Date(startTimeMs));
  const endParts = formatter.formatToParts(new Date(endTimeMs));
  
  const getPart = (parts: Intl.DateTimeFormatPart[], type: string) => parts.find(p => p.type === type)?.value || "";
  
  const dateStr = `${getPart(startParts, "year")}-${getPart(startParts, "month")}-${getPart(startParts, "day")}`;
  const startTimeStr = `${getPart(startParts, "hour")}:${getPart(startParts, "minute")}`;
  const endTimeStr = `${getPart(endParts, "hour")}:${getPart(endParts, "minute")}`;

  return {
    id: feishuEvent.event_id,
    title: feishuEvent.summary || "无标题日程",
    date: dateStr,
    startTime: startTimeStr,
    endTime: endTimeStr,
    type,
    description,
    participants,
  };
}
