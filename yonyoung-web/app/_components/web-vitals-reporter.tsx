"use client";

import { useReportWebVitals } from "next/web-vitals";

const DEFAULT_SAMPLE_RATE = 0.1;

const deterministicSampleValue = (input: string): number => {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash / 2 ** 32;
};

const shouldSample = (sampleRate: number, key: string): boolean => {
  if (sampleRate >= 1) {
    return true;
  }

  if (sampleRate <= 0) {
    return false;
  }

  return deterministicSampleValue(key) < sampleRate;
};

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (!shouldSample(DEFAULT_SAMPLE_RATE, metric.id)) {
      return;
    }

    const payload = {
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
      path: window.location.pathname,
      sampledAt: Date.now(),
    };

    navigator.sendBeacon("/api/internal/web-vitals", JSON.stringify(payload));
  });

  return null;
}
