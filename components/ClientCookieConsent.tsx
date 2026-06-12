"use client";

import { useEffect, useState } from "react";
import CookieConsent from "./CookieConsent";

export default function ClientCookieConsent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <CookieConsent />;
}
