import { createDecoder, createVerifier } from "npm:fast-jwt";
import jwkToPem from "npm:jwk-to-pem";
import { escape } from "@std/html/entities";
import {
  cleanupExpiredSessions,
  clearAllData,
  deleteSessionData,
  getAllSessions,
  getNewSessionId,
  getSessionData,
  setSessionData,
} from "./db.ts";

function getNewChallenge() {
  let challenge = "";
  let alphabet = "abcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < 10; i++) {
    challenge += alphabet.charAt(Math.floor(Math.random() * 26));
  }
  return challenge;
}

function getIndexHtml(sessions) {
  return `
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <title>DBSC prototype</title>
    <style>
      :root {
        --bg-color: #FFE6F8;
        --text-color: #000000;
        --title-color: #2800FF;
        --form-bg: #FFF3FC;
        --input-bg: #FFFFFF;
        --input-border: #000000;
        --shadow-color: #9BE7D8;
        --table-border: #dddddd;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg-color: #121212;
          --text-color: #e0e0e0;
          --title-color: #8c7dff;
          --form-bg: #1e1e1e;
          --input-bg: #2d2d2d;
          --input-border: #555555;
          --shadow-color: #2a5c53;
          --table-border: #444444;
        }
      }

      body {
        background-color: var(--bg-color);
        color: var(--text-color);
        transition: background-color 0.3s, color 0.3s;
      }
      .wrapper {
        min-height: 87vh;
        display: grid;
        place-items: center;
        margin: 0 1rem;
      }
      .content {
        display: flex;
        flex-direction: column;
        align-items: left;
        justify-content: left;
      }
      p {
        font-size: 1.25rem;
      }
      .title {
        color: var(--title-color);
        font-style: normal;
        font-weight: bold;
        font-size: 100px;
        line-height: 105%;
        margin: 2rem 0 0;
      }
      .session-form {
        background-color: var(--form-bg);
        padding: 6px;
        border-radius: 8px;
        margin: 20px;
      }
      .session-form button {
        margin-top: 8px;
        margin-bottom: 8px;
      }
      button:hover {
        cursor: pointer;
        box-shadow: -8px 4px 20px var(--shadow-color);
      }
      form {
        margin: 0.75rem 0;
      }
      button,
      input {
        font-family: inherit;
        font-size: 100%;
        background: var(--input-bg);
        color: var(--text-color);
        border: 1px solid var(--input-border);
        box-sizing: border-box;
        border-radius: 4px;
        padding: 0.5rem 1rem;
      }
      label {
        color: var(--text-color);
        font-weight: bold;
      }
      #session-list td, #session-list th {
        border: 1px solid var(--table-border);
        text-align: center;
      }
    </style>
  </head>

  <body>
    <div class="wrapper">
      <div class="content" role="main">

        <h1 class="title">DBSC prototype</h1>

        <div class="session-form">
          <p>Create a new session</p>
          <form method="post" action="/internal/StartSessionForm">
            <table>
              <tr>
                <td align="right"><label for="cinclude">Cookie scope include:</label></td>
                <td><input id="cinclude" name="cinclude" required="required" type="text" value="/trusted" style="text-align:right;"/></td>
              </tr>
              <tr>
                <td align="right"><label for="cexclude">Cookie scope exclude:</label></td>
                <td><input id="cexclude" name="cexclude" required="required" type="text" value="/untrusted" style="text-align:right;"/></td>
              </tr>
              <tr>
                <td align="right"><label for="authCode">Authorization Code:</label></td>
                <td><input id="authCode" name="authCode" type="text" value="auth-code-123" style="text-align:right;"/></td>
              </tr>
              <tr>
                <td align="right"><label for="cname">Cookie name:</label></td>
                <td><input id="cname" name="cname" required="required" type="text" value="cname" style="text-align:right;"/></td>
              </tr>
              <tr>
                <td align="right"><label for="cvalue">Cookie value:</label></td>
                <td><input id="cvalue" name="cvalue" required="required" type="text" value="cvalue" style="text-align:right;"/></td>
              </tr>
              <tr>
                <td align="right"><label for="cexpire">Cookie expire(in sec):</label></td>
                <td><input id="cexpire" name="cexpire" required="required" type="number" value=600 style="text-align:right;"/></td>
              </tr>
              <tr><td></td><td align="right"><button type="submit">Submit</button></td></tr>
            </table>
          </form>
        </div>

        <div id="session-list" class="session-form">
	  ${
    sessions.length == 0 ? `<p>No sessions</p>` : `<form>
              <p>Current sessions</p>
              <table>
                <tr>
                  <th>SessionId</th>
                  <th>CookieName</th>
                  <th>CookieValue</th>
		  <th>CookieLifetime</th>
                  <th>CookieEverRefreshed</th>
                  <th>DeleteSession</th>
                </tr>
                ${
      sessions.map((session) =>
        `<tr>
                    <td>${session.config.session_identifier}</td>
                    <td>${escape(session.cookie.name)}</td>
                    <td>${escape(session.cookie.value)}</td>
		    <td>${session.cookie.lifetime}</td>
                    <td>${session.hasEverRefreshed}</td>
                    <td><button
                        type="submit"
                        formmethod="post"
                        formaction="/internal/DeleteSession"
                        name="id"
                        value="${session.config.session_identifier}"
                      >Delete</button></td>
                  </tr>`
      ).join("")
    }
              </table>
            </form>`
  }
        </div>
      </div>
    </div>
  </body>
</html>
`;
}

export async function indexHandler() {
  const OT_TOKEN =
    "AmZLdzMY1i4ywEl4MffQ2V728OKZiTD2dbHA7Yb/LU3xIDmLuNzNJNNIP2kKG8uN9p77Fl3pwaAfpSRUzAJh0QAAAAB5eyJvcmlnaW4iOiJodHRwczovL2RydWJlcnktZGJzYy10ZXN0LXNlcnZlci5kZW5vLmRldjo0NDMiLCJmZWF0dXJlIjoiRGV2aWNlQm91bmRTZXNzaW9uQ3JlZGVudGlhbHMyIiwiZXhwaXJ5IjoxNzc0MzEwNDAwfQ==";
  const sessions = await getAllSessions();
  return new Response(getIndexHtml(sessions), {
    headers: { "content-type": "text/html", "origin-trial": OT_TOKEN },
  });
}

export async function startSessionFormHandler(request) {
  const form = await request.formData();
  const url = new URL(request.url);

  const cinclude = form.get("cinclude");
  const cexclude = form.get("cexclude");
  const authCode = form.get("authCode") || undefined; // optional field
  const cname = form.get("cname");
  const cvalue = form.get("cvalue");
  const cexpire = form.get("cexpire");

  if (!cinclude || !cexclude || !cname || !cvalue || !cexpire) {
    console.log("Failed registration: missing required form fields");
    return new Response("", {
      status: 400,
      headers: { "content-type": "text/html" },
    });
  }

  const lifetime = Number(cexpire);
  if (isNaN(lifetime)) {
    console.log("Failed registration: cookie expiration must be a number");
    return new Response("", {
      status: 400,
      headers: { "content-type": "text/html" },
    });
  }

  let id = await getNewSessionId();
  let session_config = {
    "session_identifier": id,
    "refresh_url": "/internal/RefreshSession",
    "scope": {
      "origin": url.origin,
      "include_site": false,
      "scope_specification": [
        { "type": "include", "domain": url.hostname, "path": cinclude },
        { "type": "exclude", "domain": url.hostname, "path": cexclude },
      ],
    },
    "credentials": [
      {
        "type": "cookie",
        "name": cname,
        "attributes":
          `Domain=${url.hostname}; Path=/; SameSite=Strict;`,
      },
    ],
  };
  let session_data = {
    config: session_config,
    key: null,
    lastChallenge: getNewChallenge(),
    hasEverRefreshed: false,
    authorization: authCode,
    cookie: {
      name: cname,
      value: cvalue,
      lifetime: lifetime,
    },
    expires: Date.now() + 60 * 60 * 1000,
  };

  await setSessionData(id, session_data);

  let registration_header =
    `(ES256 RS256); path="/internal/StartSession"; challenge="${session_data.lastChallenge}"`;
  if (authCode) {
    registration_header += `; authorization="${authCode}"`;
  }

  return new Response("", {
    status: 303,
    headers: {
      "location": "/",
      "secure-session-registration": registration_header,
      "set-cookie":
        `dbsc-registration-sessions-id=${id}; Domain=${url.hostname}; Path=/; Max-Age=3600000`,
    },
  });
}

export async function startSessionAndRefreshHandler(request, is_registration) {
  const url = new URL(request.url);
  const cookies = request.headers.get("cookie").split("; ").map((cookie) =>
    cookie.split("=")
  );
  let session_id = undefined;
  if (is_registration) {
    for (const cookie of cookies) {
      if (is_registration && cookie[0] == "dbsc-registration-sessions-id") {
        session_id = cookie[1];
      }
    }
  } else {
    session_id = request.headers.get("sec-secure-session-id");
  }

  if (!session_id) {
    console.log("Failed registration: no session id");
    return new Response("", {
      status: 404,
      headers: { "content-type": "text/html" },
    });
  }

  let session_data = await getSessionData(session_id);
  if (session_data == null) {
    console.log("Failed registration: invalid session id", session_id);
    return new Response("", {
      status: 404,
      headers: { "content-type": "text/html" },
    });
  } else if (is_registration && session_data.key != null) {
    console.log("Failed registration: re-registration for", session_id);
    return new Response("", {
      status: 404,
      headers: { "content-type": "text/html" },
    });
  } else if (!is_registration && session_data.key == null) {
    console.log("Failed registration: no key for", session_id);
    return new Response("", {
      status: 404,
      headers: { "content-type": "text/html" },
    });
  }

  if (session_data.lastChallenge == null) {
    console.log("Challenging registration: no last challenge");
    session_data.lastChallenge = getNewChallenge();
    await setSessionData(session_id, session_data);
    return new Response("", {
      status: 403,
      headers: {
        "content-type": "text/html",
        "secure-session-challenge": `"${session_data.lastChallenge}";id="${session_id}"`,
      },
    });
  }

  let registration_response = request.headers.get("secure-session-response");
  if (!registration_response) {
    console.log("Failed registration: no secure-session-response");
    return new Response("", {
      status: 404,
      headers: { "content-type": "text/html" },
    });
  }

  let decoded;
  try {
    const decoder = createDecoder({ complete: true });
    const sections = decoder(registration_response);
    const header = sections.header;
    const payload = sections.payload;
    if (is_registration && !header.jwk) {
      console.log("Failed registration: invalid key");
      return new Response("", {
        status: 401,
        headers: { "content-type": "text/html" },
      });
    }

    if (is_registration) {
      session_data.key = jwkToPem(header.jwk);
    }

    let verifier = createVerifier({ key: session_data.key });
    decoded = verifier(registration_response);
  } catch (e) {
    console.log("Failed registration: invalid signature");
    console.log(e);
    return new Response("", {
      status: 401,
      headers: { "content-type": "text/html" },
    });
  }

  if (
    is_registration &&
    session_data.authorization !== decoded.authorization
  ) {
    console.log("Failed registration: invalid authorization");
    return new Response("", {
      status: 401,
      headers: { "content-type": "text/html" },
    });
  }

  if (session_data.lastChallenge !== decoded.jti) {
    console.log("Failed registration: invalid challenge");
    return new Response("", {
      status: 401,
      headers: { "content-type": "text/html" },
    });
  }

  // Clear the last challenge so we challenge next time.
  session_data.lastChallenge = null;

  if (!is_registration) {
    session_data.hasEverRefreshed = true;
  }

  await setSessionData(session_id, session_data);

  const response_cookie = session_data.cookie;
  const response_cookie_header =
    `${response_cookie.name}=${response_cookie.value}; Domain=${url.hostname}; Path=/; Max-Age=${response_cookie.lifetime}; SameSite=Strict`;

  console.log("Successful registration");
  return new Response(JSON.stringify(session_data.config), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": response_cookie_header,
    },
  });
}

export async function deleteSessionHandler(request) {
  const form = await request.formData();
  if (form.get("id")) {
    await deleteSessionData(form.get("id"));
  }

  return new Response("", {
    status: 303,
    headers: {
      "location": "/",
    },
  });
}
