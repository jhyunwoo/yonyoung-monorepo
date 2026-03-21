import { createR2PresignService } from "../storage/presign";
import type { AppBindings } from "../../types/honoAppType";

const DEFAULT_HEALTH_TIMEOUT_MS = 3_000;

type HealthCheckService =
  | "d1"
  | "r2"
  | "r2_presign"
  | "durable_object"
  | "assets"
  | "service_binding";

type HealthCheckStatus = "healthy" | "unhealthy" | "skipped";

type HealthCheckResult = {
  service: HealthCheckService;
  binding: string;
  status: HealthCheckStatus;
  detail: string;
  latencyMs?: number;
  error?: string;
};

type HealthReport = {
  status: "healthy" | "unhealthy";
  checkedAt: string;
  durationMs: number;
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    skipped: number;
  };
  checks: HealthCheckResult[];
};

type BindingEntry<T> = {
  name: string;
  binding: T;
};

const roundToTwoDecimals = (value: number): number => {
  return Number(value.toFixed(2));
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "unknown error";
};

const withTimeout = async <T>(
  task: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`health check timeout: ${label} (${timeoutMs}ms)`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([task, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const hasFunction = (value: Record<string, unknown>, key: string): boolean => {
  return typeof value[key] === "function";
};

const isFetcherLike = (value: Record<string, unknown>): boolean => {
  return hasFunction(value, "fetch");
};

const isD1Database = (value: unknown): value is D1Database => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    !isFetcherLike(value) &&
    hasFunction(value, "prepare") &&
    hasFunction(value, "batch")
  );
};

const isR2Bucket = (value: unknown): value is R2Bucket => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    !isFetcherLike(value) &&
    hasFunction(value, "put") &&
    hasFunction(value, "head") &&
    hasFunction(value, "delete")
  );
};

const isDurableObjectNamespace = (
  value: unknown,
): value is DurableObjectNamespace => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    !isFetcherLike(value) &&
    hasFunction(value, "idFromName") &&
    hasFunction(value, "get")
  );
};

const isFetcherBinding = (value: unknown): value is Fetcher => {
  if (!isRecord(value)) {
    return false;
  }

  return isFetcherLike(value);
};

const collectBindings = <T>(
  env: Partial<AppBindings>,
  predicate: (value: unknown) => value is T,
): BindingEntry<T>[] => {
  return Object.entries(env)
    .filter(([, value]) => predicate(value))
    .map(([name, binding]) => ({
      name,
      binding: binding as T,
    }));
};

const runTimedCheck = async (input: {
  service: HealthCheckService;
  binding: string;
  detail: string;
  timeoutMs?: number;
  probe: () => Promise<void | string>;
}): Promise<HealthCheckResult> => {
  const startedAt = performance.now();

  try {
    const probeResult = await withTimeout(
      input.probe(),
      input.timeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS,
      `${input.service}:${input.binding}`,
    );
    return {
      service: input.service,
      binding: input.binding,
      status: "healthy",
      detail: probeResult ?? input.detail,
      latencyMs: roundToTwoDecimals(performance.now() - startedAt),
    };
  } catch (error) {
    return {
      service: input.service,
      binding: input.binding,
      status: "unhealthy",
      detail: input.detail,
      latencyMs: roundToTwoDecimals(performance.now() - startedAt),
      error: toErrorMessage(error),
    };
  }
};

const runD1Checks = async (
  env: Partial<AppBindings>,
): Promise<HealthCheckResult[]> => {
  const d1Bindings = collectBindings(env, isD1Database);

  if (d1Bindings.length === 0) {
    return [
      {
        service: "d1",
        binding: "db",
        status: "unhealthy",
        detail: "D1 binding이 구성되지 않았습니다.",
      },
    ];
  }

  return Promise.all(
    d1Bindings.map((entry) =>
      runTimedCheck({
        service: "d1",
        binding: entry.name,
        detail: "SELECT 1 쿼리로 D1 연결 상태를 확인합니다.",
        probe: async () => {
          const result = await entry.binding
            .prepare("SELECT 1 AS result")
            .first<{ result: number }>();
          if (result?.result !== 1) {
            throw new Error("unexpected D1 result");
          }
        },
      }),
    ),
  );
};

const runR2BucketChecks = async (
  env: Partial<AppBindings>,
): Promise<HealthCheckResult[]> => {
  const r2Bindings = collectBindings(env, isR2Bucket);

  if (r2Bindings.length === 0) {
    return [
      {
        service: "r2",
        binding: "r2",
        status: "unhealthy",
        detail: "R2 bucket binding이 구성되지 않았습니다.",
      },
    ];
  }

  return Promise.all(
    r2Bindings.map((entry) =>
      runTimedCheck({
        service: "r2",
        binding: entry.name,
        detail: "R2 put/head/delete round-trip으로 스토리지 상태를 확인합니다.",
        probe: async () => {
          const key = `__healthchecks__/${entry.name}/${crypto.randomUUID()}`;
          try {
            await entry.binding.put(key, "health-check");
            const object = await entry.binding.head(key);
            if (!object) {
              throw new Error("object was not found after put");
            }
          } finally {
            await entry.binding.delete(key);
          }
        },
      }),
    ),
  );
};

const runR2PresignCheck = async (
  env: Partial<AppBindings>,
): Promise<HealthCheckResult> => {
  return runTimedCheck({
    service: "r2_presign",
    binding: "R2_*",
    detail: "R2 presign 설정/서명 생성을 확인합니다.",
    probe: async () => {
      const presignService = createR2PresignService(env as AppBindings);
      const result = await presignService.issuePresignedPutUrl({
        actorId: "health-check",
        resource: "activities",
        slot: "cover",
        fileName: "health-check.png",
        contentType: "image/png",
        fileSize: 1,
      });
      if (!result.uploadUrl || !result.publicUrl) {
        throw new Error("presigned URL generation failed");
      }
    },
  });
};

const runDurableObjectChecks = async (
  env: Partial<AppBindings>,
): Promise<HealthCheckResult[]> => {
  const namespaces = collectBindings(env, isDurableObjectNamespace);

  if (namespaces.length === 0) {
    return [
      {
        service: "durable_object",
        binding: "*",
        status: "skipped",
        detail: "Durable Object binding이 구성되지 않았습니다.",
      },
    ];
  }

  return Promise.all(
    namespaces.map((entry) =>
      runTimedCheck({
        service: "durable_object",
        binding: entry.name,
        detail: "Durable Object stub fetch로 런타임 상태를 확인합니다.",
        probe: async () => {
          const id = entry.binding.idFromName("__healthcheck__");
          const stub = entry.binding.get(id);
          const response = await stub.fetch("https://healthcheck.internal/health", {
            method: "HEAD",
          });
          if (response.status >= 500) {
            throw new Error(`unexpected DO response status: ${response.status}`);
          }
          return `Durable Object 응답 상태 코드: ${response.status}`;
        },
      }),
    ),
  );
};

const runFetcherBindingChecks = async (
  env: Partial<AppBindings>,
): Promise<HealthCheckResult[]> => {
  const fetcherBindings = collectBindings(env, isFetcherBinding);
  const assetBinding = fetcherBindings.find((entry) => entry.name === "ASSETS");
  const serviceBindings = fetcherBindings.filter((entry) => entry.name !== "ASSETS");

  const checks: Array<Promise<HealthCheckResult>> = [];

  if (!assetBinding) {
    checks.push(
      Promise.resolve({
        service: "assets",
        binding: "ASSETS",
        status: "skipped",
        detail: "ASSETS binding이 구성되지 않았습니다.",
      }),
    );
  } else {
    checks.push(
      runTimedCheck({
        service: "assets",
        binding: assetBinding.name,
        detail: "ASSETS fetch로 정적 자산 서비스 연결을 확인합니다.",
        probe: async () => {
          const response = await assetBinding.binding.fetch(
            "https://assets-health.internal/health",
            {
              method: "HEAD",
            },
          );
          if (response.status >= 500) {
            throw new Error(`unexpected ASSETS response status: ${response.status}`);
          }
          return `ASSETS 응답 상태 코드: ${response.status}`;
        },
      }),
    );
  }

  if (serviceBindings.length === 0) {
    checks.push(
      Promise.resolve({
        service: "service_binding",
        binding: "*",
        status: "skipped",
        detail: "추가 Service binding이 구성되지 않았습니다.",
      }),
    );
  } else {
    for (const entry of serviceBindings) {
      checks.push(
        runTimedCheck({
          service: "service_binding",
          binding: entry.name,
          detail: "Service binding fetch로 응답 가능 여부를 확인합니다.",
          probe: async () => {
            const response = await entry.binding.fetch(
              "https://service-health.internal/health",
              {
                method: "HEAD",
              },
            );
            if (response.status >= 500) {
              throw new Error(
                `unexpected service binding response status: ${response.status}`,
              );
            }
            return `Service binding 응답 상태 코드: ${response.status}`;
          },
        }),
      );
    }
  }

  return Promise.all(checks);
};

const summarizeChecks = (
  checks: HealthCheckResult[],
): HealthReport["summary"] => {
  return checks.reduce(
    (acc, check) => {
      acc.total += 1;
      if (check.status === "healthy") {
        acc.healthy += 1;
      } else if (check.status === "unhealthy") {
        acc.unhealthy += 1;
      } else {
        acc.skipped += 1;
      }
      return acc;
    },
    {
      total: 0,
      healthy: 0,
      unhealthy: 0,
      skipped: 0,
    },
  );
};

export const runInfrastructureHealthChecks = async (
  env: Partial<AppBindings> | undefined,
): Promise<HealthReport> => {
  const startedAt = performance.now();
  const runtimeEnv = env ?? {};

  const [
    d1Checks,
    r2BucketChecks,
    r2PresignCheck,
    durableObjectChecks,
    fetcherBindingChecks,
  ] = await Promise.all([
    runD1Checks(runtimeEnv),
    runR2BucketChecks(runtimeEnv),
    runR2PresignCheck(runtimeEnv),
    runDurableObjectChecks(runtimeEnv),
    runFetcherBindingChecks(runtimeEnv),
  ]);

  const checks = [
    ...d1Checks,
    ...r2BucketChecks,
    r2PresignCheck,
    ...durableObjectChecks,
    ...fetcherBindingChecks,
  ];
  const summary = summarizeChecks(checks);

  return {
    status: summary.unhealthy > 0 ? "unhealthy" : "healthy",
    checkedAt: new Date().toISOString(),
    durationMs: roundToTwoDecimals(performance.now() - startedAt),
    summary,
    checks,
  };
};
