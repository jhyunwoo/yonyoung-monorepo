type UploadProgressBarProps = {
  progressPercent: number | null;
  label?: string;
  className?: string;
};

const clampProgress = (progress: number): number => {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  if (progress < 0) {
    return 0;
  }
  if (progress > 100) {
    return 100;
  }

  return Math.round(progress);
};

export default function UploadProgressBar({
  progressPercent,
  label = "이미지 업로드 진행률",
  className,
}: UploadProgressBarProps) {
  if (progressPercent === null) {
    return null;
  }

  const normalizedProgress = clampProgress(progressPercent);
  const wrapperClassName = className ?? "mt-2";

  return (
    <div className={wrapperClassName}>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        {label}: {normalizedProgress}%
      </p>
      <div
        className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={normalizedProgress}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-slate-900 transition-all duration-200"
          style={{ width: `${normalizedProgress}%` }}
        />
      </div>
    </div>
  );
}
