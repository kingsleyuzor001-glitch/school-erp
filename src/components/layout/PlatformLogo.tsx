import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type PlatformLogoProps = {
  className?: string;
  imageClassName?: string;
};

const PLATFORM_SETTINGS_ID =
  "00000000-0000-0000-0000-000000000001";

export default function PlatformLogo({
  className = "h-10 w-10",
  imageClassName = "h-full w-full object-contain",
}: PlatformLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadLogo() {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("logo_url")
        .eq("id", PLATFORM_SETTINGS_ID)
        .maybeSingle();

      if (!error && mounted) {
        setLogoUrl(data?.logo_url ?? null);
      }
    }

    loadLogo();

    return () => {
      mounted = false;
    };
  }, []);

  if (logoUrl) {
    return (
      <div className={className}>
        <img
          src={logoUrl}
          alt="Platform logo"
          className={imageClassName}
        />
      </div>
    );
  }

  return (
    <div
      className={`${className} rounded-lg bg-brand-600`}
      aria-label="Platform logo"
    />
  );
}