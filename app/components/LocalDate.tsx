import { useEffect, useState } from "react";

/**
 * Dates in the merchant's own locale and time zone. The server can't know
 * them, so the first render (server and hydration) uses a fixed UTC format and
 * the local one follows after mount: no hydration mismatch.
 */
export function useLocalDate(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  const time = value ? new Date(value).getTime() : NaN;
  const format = (locale?: string, timeZone?: string) =>
    Number.isNaN(time)
      ? ""
      : new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(time);
  const [text, setText] = useState(() => format("en-US", "UTC"));
  const key = `${time}|${JSON.stringify(options)}`;
  useEffect(() => {
    setText(format());
    // `key` covers the value and options.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return text;
}

/** A date for lists, where a hook per row isn't possible. */
export function LocalDate({
  value,
  withTime = false,
}: {
  value: string | Date;
  withTime?: boolean;
}) {
  const text = useLocalDate(
    value,
    withTime ? { dateStyle: "medium", timeStyle: "short" } : undefined,
  );
  return <time dateTime={new Date(value).toISOString()}>{text}</time>;
}
