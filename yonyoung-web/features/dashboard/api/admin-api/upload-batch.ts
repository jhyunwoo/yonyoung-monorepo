import {
  PRESIGN_PATHS,
  uploadWithPresign,
} from "@/features/dashboard/api/admin-api/upload";

type PresignPath = (typeof PRESIGN_PATHS)[keyof typeof PRESIGN_PATHS];

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

export const uploadFilesWithPresign = async (input: {
  presignPath: PresignPath;
  files: File[];
  onProgress?: (progressPercent: number) => void;
}): Promise<string[]> => {
  if (input.files.length === 0) {
    return [];
  }

  if (input.onProgress) {
    input.onProgress(0);
  }

  const progressByFile = new Array<number>(input.files.length).fill(0);
  const emitProgress = () => {
    if (!input.onProgress) {
      return;
    }

    const totalProgress = progressByFile.reduce((sum, value) => sum + value, 0);
    const averageProgress = totalProgress / input.files.length;
    input.onProgress(clampProgress(averageProgress));
  };

  const uploadedUrls = await Promise.all(
    input.files.map((file, index) =>
      uploadWithPresign({
        presignPath: input.presignPath,
        file,
        onProgress: input.onProgress
          ? (progressPercent) => {
              progressByFile[index] = clampProgress(progressPercent);
              emitProgress();
            }
          : undefined,
      }),
    ),
  );

  if (input.onProgress) {
    input.onProgress(100);
  }

  return uploadedUrls;
};
