import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function usePortalData(fallback = {}) {
  const [portalData, setPortalData] = useState(fallback);

  useEffect(() => {
    let active = true;

    apiFetch("/api/portal-data")
      .then((data) => {
        if (active && data && typeof data === "object") {
          setPortalData({ ...fallback, ...data });
        }
      })
      .catch(() => {
        // Keep the bundled values available while the API is offline.
      });

    return () => {
      active = false;
    };
  }, []);

  return portalData;
}
