import type { GovernanceOverview } from "@fluxrh/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";

type SessionRpcRow = {
  id: string;
  userId: string;
  userName: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt?: string | null;
  current: boolean;
  status: "active" | "expired";
};

function describeUserAgent(userAgent: string) {
  const browser = /Edg\//.test(userAgent)
    ? "Microsoft Edge"
    : /Chrome\//.test(userAgent)
      ? "Google Chrome"
      : /Firefox\//.test(userAgent)
        ? "Mozilla Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Navegador não identificado";
  const device = /Android/i.test(userAgent)
    ? "Android"
    : /iPhone|iPad/i.test(userAgent)
      ? "iPhone/iPad"
      : /Windows/i.test(userAgent)
        ? "Windows"
        : /Macintosh/i.test(userAgent)
          ? "macOS"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : "Dispositivo não identificado";
  return { browser, device };
}

export class SupabaseGovernanceSecurityRepository {
  constructor(private readonly client: SupabaseClient) {}

  async sessions(): Promise<GovernanceOverview["sessions"]> {
    const { data, error } = await this.client.rpc("list_organization_sessions");
    if (error) throw new Error(`session_list_failed:${error.message}`);
    return ((data ?? []) as SessionRpcRow[]).map((session) => ({
      id: session.id,
      userId: session.userId,
      userName: session.userName,
      ...describeUserAgent(session.userAgent),
      ipAddress: session.ipAddress,
      location: "Localização não armazenada",
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      current: session.current,
      status: session.status,
    }));
  }

  async revokeSession(id: string, justification: string) {
    const { data, error } = await this.client.rpc(
      "revoke_organization_session",
      {
        session_id_value: id,
        justification_value: justification,
      },
    );
    if (error) {
      if (
        error.message.includes("session_not_found") ||
        error.message.includes("current_session_cannot_be_revoked")
      ) {
        return undefined;
      }
      throw new Error(`session_revoke_failed:${error.message}`);
    }
    return data as { id: string; userId: string; status: "revoked" };
  }
}
