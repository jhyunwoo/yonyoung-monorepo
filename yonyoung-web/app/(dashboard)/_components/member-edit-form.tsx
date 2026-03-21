"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type {
  ApiAdminUpdateUserInput,
  ApiGeneration,
  ApiUser,
} from "@/shared/contracts/api-contracts";
import { AdminApiError } from "@/shared/http/http";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { uploadFilesWithPresign } from "@/features/dashboard/api/admin-api/upload-batch";
import {
  PRESIGN_PATHS,
  uploadWithPresign,
} from "@/features/dashboard/api/admin-api/upload";
import { readFileList } from "@/features/media/upload/image-upload-state";
import {
  MEMBER_ROLE_OPTIONS,
  coerceMemberRoleValue,
  type MemberRoleValue,
} from "@/features/dashboard/members/member-role-options";
import {
  SHOWCASE_MAX_IMAGES,
  normalizeShowcaseImageUrls,
  toShowcaseUploadImageItems,
} from "@/features/media/upload/showcase-images";
import { useImageUploadState } from "@/features/media/upload/use-image-upload-state";
import { Skeleton } from "@/components/ui/skeleton";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import SortableImageGrid from "@/app/(dashboard)/_components/sortable-image-grid";
import UploadProgressBar from "@/app/(dashboard)/_components/upload-progress-bar";

type MemberEditFormProps = {
  user: ApiUser;
  onSaved: (user: ApiUser) => void;
  onCancel?: () => void;
  inline?: boolean;
};

const toNullableText = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "사용자 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
};

export default function MemberEditForm({
  user,
  onSaved,
  onCancel,
  inline = false,
}: MemberEditFormProps) {
  const [name, setName] = useState(user.name);
  const [image, setImage] = useState(user.image ?? "");
  const [familyName, setFamilyName] = useState(user.familyName ?? "");
  const [givenName, setGivenName] = useState(user.givenName ?? "");
  const [college, setCollege] = useState(user.college ?? "");
  const [department, setDepartment] = useState(user.department ?? "");
  const [studentNumber, setStudentNumber] = useState(user.studentNumber ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber ?? "");
  const [role, setRole] = useState<MemberRoleValue>(coerceMemberRoleValue(user.role));
  const [generationIds, setGenerationIds] = useState<string[]>(
    user.generationIds ?? (user.generationId ? [user.generationId] : []),
  );
  const {
    items: showcaseImageItems,
    appendExistingUrls,
    removeItemById: removeShowcaseImageById,
    reorderByIds: reorderShowcaseImagesByIds,
    replaceItems: replaceShowcaseImages,
  } = useImageUploadState({
    initialItems: toShowcaseUploadImageItems(user.showcaseImageUrls),
    maxItems: SHOWCASE_MAX_IMAGES,
  });

  const [allGenerations, setAllGenerations] = useState<ApiGeneration[]>([]);
  const [isLoadingGenerations, setIsLoadingGenerations] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingShowcaseImages, setIsUploadingShowcaseImages] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImageObjectUrl, setSelectedImageObjectUrl] = useState<string | null>(
    null,
  );
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);
  const [showcaseUploadProgressPercent, setShowcaseUploadProgressPercent] = useState<
    number | null
  >(null);
  const profileFileInputRef = useRef<HTMLInputElement | null>(null);
  const showcaseFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(user.name);
    setImage(user.image ?? "");
    setFamilyName(user.familyName ?? "");
    setGivenName(user.givenName ?? "");
    setCollege(user.college ?? "");
    setDepartment(user.department ?? "");
    setStudentNumber(user.studentNumber ?? "");
    setPhoneNumber(user.phoneNumber ?? "");
    setRole(coerceMemberRoleValue(user.role));
    setGenerationIds(
      user.generationIds ?? (user.generationId ? [user.generationId] : []),
    );
    replaceShowcaseImages(toShowcaseUploadImageItems(user.showcaseImageUrls));
    setSelectedImageFile(null);
    setSelectedImageObjectUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return null;
    });
    setUploadProgressPercent(null);
    setShowcaseUploadProgressPercent(null);
    setIsUploadingShowcaseImages(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [replaceShowcaseImages, user]);

  useEffect(() => {
    return () => {
      if (selectedImageObjectUrl) {
        URL.revokeObjectURL(selectedImageObjectUrl);
      }
    };
  }, [selectedImageObjectUrl]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;

    if (selectedImageObjectUrl) {
      URL.revokeObjectURL(selectedImageObjectUrl);
      setSelectedImageObjectUrl(null);
    }

    setSelectedImageFile(nextFile);
    if (!nextFile) {
      return;
    }

    const objectUrl = URL.createObjectURL(nextFile);
    setSelectedImageObjectUrl(objectUrl);
  };

  const handleShowcaseFilesChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = readFileList(event.target.files);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }

    const remainingSlots = SHOWCASE_MAX_IMAGES - showcaseImageItems.length;
    if (remainingSlots <= 0) {
      setErrorMessage(
        `대표 작품 사진은 최대 ${SHOWCASE_MAX_IMAGES}장까지 등록할 수 있습니다.`,
      );
      setSuccessMessage(null);
      return;
    }

    const uploadTargets = files.slice(0, remainingSlots);
    setIsUploadingShowcaseImages(true);
    setShowcaseUploadProgressPercent(0);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const uploadedUrls = await uploadFilesWithPresign({
        presignPath: PRESIGN_PATHS.userProfile,
        files: uploadTargets,
        onProgress: setShowcaseUploadProgressPercent,
      });
      appendExistingUrls(uploadedUrls);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
      setSuccessMessage(null);
    } finally {
      setIsUploadingShowcaseImages(false);
      setShowcaseUploadProgressPercent(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadGenerations = async () => {
      setIsLoadingGenerations(true);
      try {
        const rows = await adminResourceApi.listGenerations();
        if (!isMounted) {
          return;
        }

        setAllGenerations(rows);
      } catch {
        if (!isMounted) {
          return;
        }

        setAllGenerations([]);
      } finally {
        if (isMounted) {
          setIsLoadingGenerations(false);
        }
      }
    };

    void loadGenerations();

    return () => {
      isMounted = false;
    };
  }, []);

  const generationIdSet = useMemo(() => new Set(generationIds), [generationIds]);
  const showcaseImageUrls = useMemo(
    () => showcaseImageItems.map((item) => item.imageUrl),
    [showcaseImageItems],
  );
  const isShowcaseUploadDisabled =
    isSaving ||
    isUploadingShowcaseImages ||
    showcaseImageUrls.length >= SHOWCASE_MAX_IMAGES;

  const toggleGeneration = (generationId: string) => {
    setGenerationIds((previous) => {
      if (previous.includes(generationId)) {
        return previous.filter((item) => item !== generationId);
      }

      return [...previous, generationId];
    });
  };

  const handleSubmit = async () => {
    if (isUploadingShowcaseImages) {
      setErrorMessage("대표 작품 사진 업로드가 완료된 후 저장해 주세요.");
      setSuccessMessage(null);
      return;
    }

    if (name.trim().length === 0) {
      setErrorMessage("이름은 비워둘 수 없습니다.");
      setSuccessMessage(null);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let nextImageValue = image.trim();

      if (selectedImageFile) {
        setUploadProgressPercent(0);
        nextImageValue = await uploadWithPresign({
          presignPath: PRESIGN_PATHS.userProfile,
          file: selectedImageFile,
          onProgress: setUploadProgressPercent,
        });
      }

      const normalizedShowcaseImageUrls = normalizeShowcaseImageUrls(showcaseImageUrls);

      const payload: ApiAdminUpdateUserInput = {
        name: name.trim(),
        image: nextImageValue.length > 0 ? nextImageValue : null,
        familyName: toNullableText(familyName),
        givenName: toNullableText(givenName),
        college: toNullableText(college),
        department: toNullableText(department),
        studentNumber: toNullableText(studentNumber),
        phoneNumber: toNullableText(phoneNumber),
        role,
        generationIds,
        showcaseImageUrls: normalizedShowcaseImageUrls,
      };

      const updated = await adminResourceApi.updateUser(user.id, payload);
      setImage(updated.image ?? "");
      replaceShowcaseImages(toShowcaseUploadImageItems(updated.showcaseImageUrls ?? []));
      setSelectedImageFile(null);
      if (selectedImageObjectUrl) {
        URL.revokeObjectURL(selectedImageObjectUrl);
      }
      setSelectedImageObjectUrl(null);
      setUploadProgressPercent(null);
      onSaved(updated);
      setSuccessMessage("사용자 정보가 저장되었습니다.");
    } catch (error) {
      setUploadProgressPercent(null);
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleShowcaseUploadClick = () => {
    if (isShowcaseUploadDisabled) {
      return;
    }

    showcaseFileInputRef.current?.click();
  };

  const handleProfileImageUploadClick = () => {
    if (isSaving) {
      return;
    }

    profileFileInputRef.current?.click();
  };

  const imagePreviewUrl = selectedImageObjectUrl ?? image;

  return (
    <section
      className={
        inline
          ? "mt-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4"
          : "rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8"
      }
    >
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
        사용자 정보 수정
      </h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        권한이 있는 운영자는 사용자 정보를 수정할 수 있습니다.
      </p>

      <form className="mt-5 space-y-4" action={handleSubmit} noValidate>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Google 이름</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">역할</span>
            <select
              value={role}
              onChange={(event) => setRole(coerceMemberRoleValue(event.target.value))}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2"
            >
              {MEMBER_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            프로필 이미지
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            사진 파일을 선택해 프로필 이미지를 바꿀 수 있습니다.
          </p>

          <div className="mt-3 flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              {imagePreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreviewUrl}
                  alt="프로필 이미지 미리보기"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-600 dark:text-slate-300">
                  없음
                </div>
              )}
            </div>

            <button
              type="button"
              data-testid="member-edit-profile-image-select"
              onClick={handleProfileImageUploadClick}
              disabled={isSaving}
              className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              파일 선택
            </button>
            <input
              ref={profileFileInputRef}
              type="file"
              accept="image/*"
              disabled={isSaving}
              onChange={handleImageChange}
              className="sr-only"
            />
          </div>

          <UploadProgressBar progressPercent={uploadProgressPercent} />
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            대표 작품 사진
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            최대 {SHOWCASE_MAX_IMAGES}장
          </p>

          <button
            type="button"
            data-testid="member-edit-showcase-upload"
            onClick={handleShowcaseUploadClick}
            disabled={isShowcaseUploadDisabled}
            className="mt-3 inline-flex rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            파일 업로드
          </button>
          <input
            ref={showcaseFileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleShowcaseFilesChange}
            disabled={isShowcaseUploadDisabled}
            className="sr-only"
          />

          {isUploadingShowcaseImages ? (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              대표 작품 사진 업로드 중...
            </p>
          ) : null}
          <UploadProgressBar
            progressPercent={showcaseUploadProgressPercent}
            label="대표 작품 사진 업로드 진행률"
          />

          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              마우스로 끌어 대표 작품 사진 순서를 바꿀 수 있습니다.
            </p>
            <SortableImageGrid
              items={showcaseImageItems.map((image, index) => ({
                id: image.id,
                imageUrl: image.imageUrl,
                label: `대표 작품 사진 ${index + 1}`,
                alt: "대표 작품 사진",
              }))}
              onReorder={(nextItems) =>
                reorderShowcaseImagesByIds(nextItems.map((item) => item.id))
              }
              onRemoveItem={removeShowcaseImageById}
              disabled={isSaving || isUploadingShowcaseImages}
              emptyMessage="등록된 대표 작품 사진이 없습니다."
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">성</span>
            <input
              value={familyName}
              onChange={(event) => setFamilyName(event.target.value)}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">이름</span>
            <input
              value={givenName}
              onChange={(event) => setGivenName(event.target.value)}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">대학</span>
            <input
              value={college}
              onChange={(event) => setCollege(event.target.value)}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">학과</span>
            <input
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">학번</span>
            <input
              value={studentNumber}
              onChange={(event) => setStudentNumber(event.target.value)}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">전화번호</span>
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2"
            />
          </label>
        </div>

        <fieldset className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <legend className="px-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            소속 기수
          </legend>
          {isLoadingGenerations ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={`member-generation-loading-${index + 1}`}
                  className="h-9 w-full"
                />
              ))}
            </div>
          ) : allGenerations.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              선택 가능한 기수가 없습니다.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {allGenerations.map((generation) => (
                <li key={generation.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={generationIdSet.has(generation.id)}
                      onChange={() => toggleGeneration(generation.id)}
                      disabled={isSaving}
                    />
                    <span>{generation.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        {errorMessage ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <FormSubmitButton
            data-testid="member-edit-submit"
            disabled={isSaving || isUploadingShowcaseImages}
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            idleLabel="저장"
            pendingLabel="저장 중..."
          />
          {onCancel ? (
            <button
              type="button"
              data-testid="member-edit-cancel"
              onClick={onCancel}
              disabled={isSaving || isUploadingShowcaseImages}
              className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              취소
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
