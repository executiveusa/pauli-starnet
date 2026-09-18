// Netlify Jev decision gateway for StarNet.
// No browser secret: Netlify AI Gateway injects TYPESAFE_API_KEY at runtime.
// The endpoint is inert unless the caller explicitly sends x-starnet-jev-enabled: 1.

const TYPESAFE_URL = "https://api.typesafe.ai/v1/systemone";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export default async (req: Request, context: any) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  // Emergency server-side kill switch. Normal operation is controlled by the StarNet UI toggle.
  if (Netlify.env.get("STARNET_JEV_DISABLED") === "1") {
    return json(503, { ok: false, disabled: true, reason: "server_kill_switch" });
  }

  if (req.headers.get("x-starnet-jev-enabled") !== "1") {
    return json(409, { ok: false, disabled: true, reason: "jev_toggle_off" });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "bad_json" });
  }

  const state = body && body.state;
  if (state == null) return json(400, { ok: false, error: "state_required" });

  const apiKey = Netlify.env.get("TYPESAFE_API_KEY");
  if (!apiKey) {
    return json(503, {
      ok: false,
      ready: false,
      reason: "netlify_ai_gateway_credentials_unavailable",
      hint: "Add Netlify AI Gateway credits/availability, then retry.",
    });
  }

  const questions = {
    agent: {
      type: "choice",
      instructions: "Which StarNet worker class should own the next step?",
      criteria: {
        hermes: "Orchestration, planning, delegation, or synthesis.",
        heisenberg: "City-level coordination across multiple workers or systems.",
        frontend: "UI, UX, browser, visual, or client-side implementation.",
        infra: "Hosting, deployment, networking, DNS, servers, or runtime infrastructure.",
        research: "Information gathering, comparison, verification, or external research.",
      },
    },
    next_action: {
      type: "choice",
      instructions: "What is the safest useful next action?",
      criteria: {
        inspect: "Read state or inspect the system before changing anything.",
        modify: "Make a bounded reversible change.",
        test: "Run verification without changing production authority.",
        deploy_preview: "Create or update a non-production preview.",
        request_approval: "Stop and ask the human owner for approval.",
        stop: "Do not continue.",
      },
    },
    risk: {
      type: "score",
      instructions: "Score operational risk from low to critical.",
      criteria: [
        "Low: read-only or easily reversible with negligible blast radius.",
        "Medium: bounded write with a clear rollback.",
        "High: production, credentials, data, infrastructure, or broad blast radius.",
        "Critical: destructive, irreversible, financial, ownership, or security-sensitive.",
      ],
    },
    requires_human_approval: {
      type: "noul",
      instructions: "Does this action require human approval under StarNet sovereignty and FirstMate rules?",
      criteria: {
        yes: "Production merge/deploy, destructive action, credentials, DNS, money, ownership, or irreversible effects.",
        no: "Read-only inspection, shadow evaluation, tests, or bounded non-production work.",
      },
    },
    proof_satisfied: {
      type: "noul",
      instructions: "Does the supplied state contain enough evidence to claim the requested outcome is verified?",
    },
  };

  const upstream = await fetch(TYPESAFE_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "starnet-jev-control-plane/1.0",
    },
    body: JSON.stringify({
      model: "jev-latest",
      state,
      questions,
    }),
  });

  const raw = await upstream.text();
  let parsed: any = raw;
  try { parsed = raw ? JSON.parse(raw) : null; } catch {}

  if (!upstream.ok) {
    return json(upstream.status, {
      ok: false,
      upstreamStatus: upstream.status,
      error: parsed,
      requestId: context && context.requestId,
    });
  }

  return json(200, {
    ok: true,
    model: parsed && parsed.model ? parsed.model : "jev-latest",
    answers: parsed && parsed.answers ? parsed.answers : parsed,
    usage: parsed && parsed.usage ? parsed.usage : undefined,
    requestId: context && context.requestId,
  });
};

export const config = {
  path: "/api/jev-decision",
};
