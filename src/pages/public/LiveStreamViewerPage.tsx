import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicLiveStream, PublicLiveStream } from "../../services/live";
import { Card } from "../../components/ui/Card";

export default function LiveStreamViewerPage() {
  const { schoolSlug } = useParams();
  const [stream, setStream] = useState<PublicLiveStream | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!schoolSlug) return;
    setStream(await getPublicLiveStream(schoolSlug));
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [schoolSlug]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-3xl space-y-4">
        {loading ? (
          <p className="text-center text-sm text-slate-400">Loading…</p>
        ) : !stream ? (
          <Card className="text-center">
            <h1 className="mb-2 font-display text-lg font-bold">No live stream right now</h1>
            <p className="text-sm text-slate-500">Check back later, or refresh this page closer to the event time.</p>
          </Card>
        ) : (
          <>
            <div>
              <h1 className="font-display text-xl font-bold">{stream.title}</h1>
              {stream.status === "live" ? (
                <p className="text-sm font-medium text-rose-600">● Live now</p>
              ) : (
                <p className="text-sm text-slate-500">
                  Starting soon{stream.scheduled_at ? ` — ${new Date(stream.scheduled_at).toLocaleString()}` : ""}
                </p>
              )}
            </div>

            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              <iframe
                key={stream.youtube_video_id}
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${stream.youtube_video_id}?autoplay=${stream.status === "live" ? 1 : 0}`}
                title={stream.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {stream.status === "scheduled" && (
              <p className="text-center text-xs text-slate-400">This page checks for updates automatically — no need to refresh.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}