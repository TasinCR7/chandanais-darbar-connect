import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function notifyCommitteeAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("committee-auth-changed"));
  }
}

export function getStoredCommitteeToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = (localStorage.getItem("committee_auth") || "").trim();
    return UUID_REGEX.test(raw) ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Validates the stored committee session token format and, when maintenance/protected bypass
 * needs verification, confirms the token with Supabase instead of trusting localStorage alone.
 */
export function useCommitteeSession(verifyWithServer: boolean) {
  const [token, setToken] = useState<string | null>(() => getStoredCommitteeToken());
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(() => Boolean(verifyWithServer && getStoredCommitteeToken()));

  useEffect(() => {
    const syncToken = () => {
      const next = getStoredCommitteeToken();
      setToken(next);
      if (!next) {
        setVerified(false);
        setVerifying(false);
      }
    };
    window.addEventListener("storage", syncToken);
    window.addEventListener("committee-auth-changed", syncToken);
    return () => {
      window.removeEventListener("storage", syncToken);
      window.removeEventListener("committee-auth-changed", syncToken);
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!token) {
      setVerified(false);
      setVerifying(false);
      return;
    }

    if (!verifyWithServer) {
      setVerified(false);
      setVerifying(false);
      return;
    }

    setVerifying(true);
    (async () => {
      try {
        const { data, error } = await supabase.rpc("validate_committee_session", {
          p_session_token: token,
        });

        let isValid = false;
        if (!error) {
          isValid = data === true;
        } else {
          // Graceful fallback before new SQL migration is applied on remote DB
          const { data: dashData, error: dashErr } = await supabase.rpc(
            "get_committee_dashboard_data",
            { p_session_token: token }
          );
          const payload = dashData as { error?: unknown; member?: unknown } | null;
          isValid = Boolean(!dashErr && payload && !payload.error && payload.member);
        }

        if (!active) return;

        if (!isValid) {
          try {
            localStorage.removeItem("committee_auth");
          } catch {
            // ignore
          }
          setToken(null);
          setVerified(false);
        } else {
          setVerified(true);
        }
      } catch {
        if (active) setVerified(false);
      } finally {
        if (active) setVerifying(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [token, verifyWithServer]);

  return {
    isCommitteeMember: verifyWithServer ? verified : Boolean(token),
    verifyingCommittee: verifying,
  };
}
