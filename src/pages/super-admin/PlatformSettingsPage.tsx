import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/Card";

const PLATFORM_SETTINGS_ID =
  "00000000-0000-0000-0000-000000000001";

export default function PlatformSettingsPage() {
  const [platformName, setPlatformName] = useState("School ERP");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadSettings() {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("platform_settings")
        .select("platform_name, logo_url")
        .eq("id", PLATFORM_SETTINGS_ID)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setPlatformName(data?.platform_name || "School ERP");
      setLogoUrl(data?.logo_url ?? null);
    } catch (err: any) {
      setError(
        err.message || "Unable to load platform settings."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSaveName() {
    const trimmedName = platformName.trim();

    if (!trimmedName) {
      setError("Please enter a platform name.");
      return;
    }

    try {
      setSavingName(true);
      setError(null);
      setSuccess(null);

      const { error: updateError } = await supabase
        .from("platform_settings")
        .update({
          platform_name: trimmedName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", PLATFORM_SETTINGS_ID);

      if (updateError) {
        throw updateError;
      }

      setPlatformName(trimmedName);

      setSuccess(
        "Platform name updated successfully."
      );
    } catch (err: any) {
      setError(
        err.message || "Unable to update platform name."
      );
    } finally {
      setSavingName(false);
    }
  }

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      if (!file.type.startsWith("image/")) {
        throw new Error("Please select an image file.");
      }

      const extension =
        file.name.split(".").pop()?.toLowerCase() || "png";

      const filePath = `platform-logo.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("platform-assets")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("platform-assets")
        .getPublicUrl(filePath);

      /*
       * Add a timestamp to the URL so browsers do not keep showing
       * an older cached version after the platform logo is replaced.
       */
      const cacheBustedUrl =
        `${publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("platform_settings")
        .update({
          logo_url: cacheBustedUrl,
          logo_path: filePath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", PLATFORM_SETTINGS_ID);

      if (updateError) {
        throw updateError;
      }

      setLogoUrl(cacheBustedUrl);

      setSuccess(
        "Platform logo updated successfully."
      );
    } catch (err: any) {
      setError(
        err.message || "Unable to upload platform logo."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">
          Platform Settings
        </h1>

        <p className="text-sm text-slate-500">
          Manage the name and logo of your global platform.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <Card>
        <div className="space-y-5">
          <div>
            <h2 className="font-semibold text-slate-800">
              Platform Name
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              This is the global name of your platform. It will
              appear across the application.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="platform-name"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Platform name
              </label>

              <input
                id="platform-name"
                type="text"
                value={platformName}
                onChange={(e) =>
                  setPlatformName(e.target.value)
                }
                disabled={loading || savingName}
                placeholder="Enter platform name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-100"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveName}
              disabled={
                loading ||
                savingName ||
                !platformName.trim()
              }
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingName
                ? "Saving..."
                : "Save Platform Name"}
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-5">
          <div>
            <h2 className="font-semibold text-slate-800">
              Platform Logo
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              This logo belongs to the platform itself. It is
              separate from individual school branding.
            </p>
          </div>

          <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
            {loading ? (
              <p className="text-sm text-slate-400">
                Loading platform logo...
              </p>
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt={`${platformName} platform logo`}
                className="max-h-28 max-w-64 object-contain"
              />
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-3 h-16 w-16 rounded-xl bg-brand-600" />

                <p className="text-sm text-slate-500">
                  No platform logo uploaded yet.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="inline-block">
              <span className="sr-only">
                Upload platform logo
              </span>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleUpload}
                disabled={uploading}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700 disabled:opacity-50"
              />
            </label>

            {uploading && (
              <p className="mt-2 text-sm text-slate-500">
                Uploading platform logo...
              </p>
            )}
          </div>

          <div className="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Recommended: a square PNG or SVG with a transparent
            background.
          </div>
        </div>
      </Card>
    </div>
  );
}