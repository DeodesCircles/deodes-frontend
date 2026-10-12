"use client";

import { useEffect, useState } from "react";

/**
 * True when the app is served from the dedicated app host
 * (app.deodes.com). Used to switch the shell into "app mode": APP badge,
 * back-to-site link, and app-only chrome. Localhost previews render the
 * neutral (non-app) variant.
 */
export function useAppHost(): boolean {
  const [isAppHost, setIsAppHost] = useState(false);

  useEffect(() => {
    setIsAppHost(window.location.hostname.toLowerCase() === "app.deodes.com");
  }, []);

  return isAppHost;
}
