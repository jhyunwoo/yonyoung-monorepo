"use client";

const koreanYearFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  timeZone: "Asia/Seoul",
});

export default function CurrentYear() {
  return <>{koreanYearFormatter.format(Date.now())}</>;
}
