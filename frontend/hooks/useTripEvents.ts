"use client";

// Live updates for one trip: an EventSource on /api/videos/<key>/events feeding
// tripReducer. The server ends each stream after ~25s and the browser reconnects
// on its own with Last-Event-ID, so only newer places arrive. We close the stream
// on done or error. If SSE can't connect at all, we poll the trip every 3s instead.
import { useCallback, useEffect, useReducer, useState } from "react";

import { fetchTrip, type Stage, type TripOut } from "@/lib/api";
import { initialTripState, tripReducer, type TripEvent } from "@/lib/trip-state";

const POLL_MS = 3000;
const MAX_FAILED_CONNECTS = 4; // native errors in a row with no event received

export function useTripEvents(key: string, initial: TripOut | null, enabled: boolean) {
  const [state, dispatch] = useReducer(tripReducer, initial, initialTripState);
  const [run, setRun] = useState(0); // bumped by restart() to (re)open the stream
  const active = enabled || run > 0;

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;

    const send = (ev: TripEvent) => {
      if (!stopped) dispatch(ev);
    };

    const poll = async () => {
      try {
        const trip = await fetchTrip(key);
        send({ type: "snapshot", trip });
        if (!trip || trip.video.status !== "processing" || trip.stale) return; // finished
      } catch {
        // keep polling through brief backend hiccups
      }
      if (!stopped) pollTimer = setTimeout(poll, POLL_MS);
    };

    const startPolling = () => {
      es?.close();
      es = null;
      if (!stopped && pollTimer === undefined) poll();
    };

    if (typeof EventSource === "undefined") {
      startPolling();
    } else {
      es = new EventSource(`/api/videos/${key}/events`);
      let failedConnects = 0;
      const on = (name: string, handle: (data: never) => void) =>
        es!.addEventListener(name, (e) => {
          const msg = e as MessageEvent<string>;
          if (typeof msg.data !== "string") return; // native error event, handled below
          failedConnects = 0;
          handle(JSON.parse(msg.data) as never);
        });

      on("meta", (video) => send({ type: "meta", video }));
      on("stage", (d: { stage: Stage }) => send({ type: "stage", stage: d.stage }));
      on("place", (place) => send({ type: "place", place }));
      on("done", (d: { status: "done" | "partial"; count: number }) => {
        send({ type: "done", status: d.status, count: d.count });
        es?.close();
      });
      on("error", (d: { code: string }) => {
        send({ type: "error", code: d.code });
        es?.close();
      });

      es.addEventListener("error", (e) => {
        if (typeof (e as MessageEvent).data === "string") return; // server-sent error, handled above
        // Native error. CONNECTING means the browser is already retrying (normal
        // after each ~25s stream); CLOSED means it gave up (e.g. a non-SSE response).
        failedConnects += 1;
        if (es?.readyState === EventSource.CLOSED || failedConnects >= MAX_FAILED_CONNECTS) {
          startPolling();
        }
      });
    }

    return () => {
      stopped = true;
      es?.close();
      clearTimeout(pollTimer);
    };
  }, [key, active, run]);

  const restart = useCallback(() => {
    dispatch({ type: "restart" });
    setRun((r) => r + 1);
  }, []);

  return { state, restart };
}
