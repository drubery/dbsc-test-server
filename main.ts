import { cleanupExpiredSessions, clearAllData } from "./db.ts";
import {
  deleteSessionHandler,
  indexHandler,
  startSessionAndRefreshHandler,
  startSessionFormHandler,
} from "./handlers.ts";

await clearAllData();

Deno.cron(
  "Cleanup expired sessions",
  { minute: { every: 1 } },
  cleanupExpiredSessions,
);

Deno.serve(async (request) => {
  const url = new URL(request.url);
  console.log((new Date()).toISOString(), ": request to", url.href);
  if (url.pathname == "/") {
    return indexHandler();
  } else if (url.pathname == "/internal/StartSessionForm") {
    return startSessionFormHandler(request);
  } else if (url.pathname == "/internal/StartSession") {
    return startSessionAndRefreshHandler(request, /*is_registration=*/ true);
  } else if (url.pathname == "/internal/RefreshSession") {
    return startSessionAndRefreshHandler(request, /*is_registration=*/ false);
  } else if (url.pathname == "/internal/DeleteSession") {
    return deleteSessionHandler(request);
  } else {
    console.log("Invalid path ", url.pathname);
    return new Response("", {
      status: 404,
      headers: { "content-type": "text/html" },
    });
  }
});
