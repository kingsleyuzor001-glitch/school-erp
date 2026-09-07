import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const PLATFORM_SETTINGS_ID =
  "00000000-0000-0000-0000-000000000001";

type PlatformNameProps = {
  className?: string;
};

export default function PlatformName({
  className = "",
}: PlatformNameProps) {
  const [platformName, setPlatformName] =
    useState("School ERP");

  useEffect(() => {
    let mounted = true;

    async function loadPlatformName() {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("platform_name")
        .eq("id", PLATFORM_SETTINGS_ID)
        .maybeSingle();

      if (!error && mounted) {
        setPlatformName(
          data?.platform_name?.trim() || "School ERP"
        );
      }
    }

    loadPlatformName();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <span className={className}>
      {platformName}
    </span>
  );
}