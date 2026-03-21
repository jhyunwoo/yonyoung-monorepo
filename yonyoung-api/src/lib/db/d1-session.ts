type D1SessionMode = "off" | "first-primary" | "first-unconstrained";

type D1SequentialSessionResult = {
  database: D1Database | D1DatabaseSession;
  mode: D1SessionMode;
  bookmark: string | null;
};

export const resolveD1SessionMode = (value: string | undefined): D1SessionMode => {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "first-primary" ||
    normalized === "first-unconstrained" ||
    normalized === "off"
  ) {
    return normalized;
  }

  return "off";
};

export const createD1SequentialSession = (
  database: D1Database,
  input?: {
    mode?: D1SessionMode;
    bookmark?: string | null;
  },
): D1SequentialSessionResult => {
  const mode = input?.mode ?? "off";
  if (mode === "off") {
    return {
      database,
      mode,
      bookmark: null,
    };
  }

  const bookmark = input?.bookmark?.trim();
  const anchor = bookmark && bookmark.length > 0 ? bookmark : mode;
  let session: D1DatabaseSession;
  try {
    session = database.withSession(anchor);
  } catch {
    return {
      database,
      mode: "off",
      bookmark: null,
    };
  }

  return {
    database: session,
    mode,
    bookmark: session.getBookmark(),
  };
};
