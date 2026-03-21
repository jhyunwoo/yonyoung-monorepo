import type { CoreRole } from "@/shared/contracts/auth-roles";

export const API_ERROR_CODES = [
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "INTERNAL_ERROR",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export type ApiErrorEnvelope = {
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
  };
};

export type DataEnvelope<T> = {
  data: T;
};

export type ApiKnownRole = CoreRole;
export type ApiRole = ApiKnownRole | (string & {});

export type ApiAuditResourceType =
  | "generation"
  | "activity"
  | "exhibition"
  | "generation_notice"
  | "global_notice"
  | "market_item"
  | "market_comment"
  | "linktree"
  | "linktree_item"
  | "user";

export type ApiAuditAction = "create" | "update" | "delete";

export type ApiAuditActor = {
  id: string;
  name: string;
  familyName: string | null;
  givenName: string | null;
  role: ApiRole | null;
};

export type ApiAuditLog = {
  id: string;
  resourceType: ApiAuditResourceType;
  resourceId: string;
  action: ApiAuditAction;
  actor: ApiAuditActor | null;
  changedFields: string[];
  createdAt: number;
};

export type ApiGeneration = {
  id: string;
  name: string;
  sortOrder: number;
  startDate: number;
  endDate: number;
  createdAt: number;
  updatedAt: number;
  updatedBy: ApiAuditActor | null;
};

export type ApiCreateGenerationInput = {
  name: string;
  sortOrder: number;
  startDate: number;
  endDate: number;
};

export type ApiUpdateGenerationInput = Partial<ApiCreateGenerationInput>;

export type ApiActivityImage = {
  id: string;
  activityId: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export type ApiActivity = {
  id: string;
  title: string;
  description: string;
  startDate: number;
  endDate: number;
  coverImageUrl: string;
  generationId: string;
  createdAt: number;
  updatedAt: number;
  updatedBy: ApiAuditActor | null;
  detailImages: ApiActivityImage[];
};

export type ApiCreateActivityInput = {
  title: string;
  description: string;
  startDate: number;
  endDate: number;
  coverImageUrl: string;
  generationId: string;
};

export type ApiUpdateActivityInput = Partial<ApiCreateActivityInput>;

export type ApiListActivitiesQuery = {
  generationId?: string;
};

export type ApiCreateActivityImageInput = {
  imageUrl: string;
  sortOrder: number;
};

export type ApiUpdateActivityImageInput = Partial<ApiCreateActivityImageInput>;

export type ApiUpdateActivityImageBatchItemInput = {
  imageId: string;
  imageUrl?: string;
  sortOrder?: number;
};

export type ApiExhibitionImage = {
  id: string;
  exhibitionId: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export type ApiExhibition = {
  id: string;
  title: string;
  startDate: number;
  endDate: number;
  generationId: string;
  place: string;
  coverImageUrl: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  updatedBy: ApiAuditActor | null;
  detailImages: ApiExhibitionImage[];
};

export type ApiCreateExhibitionInput = {
  title: string;
  startDate: number;
  endDate: number;
  generationId: string;
  place: string;
  coverImageUrl: string;
  description: string;
};

export type ApiUpdateExhibitionInput = Partial<ApiCreateExhibitionInput>;

export type ApiListExhibitionsQuery = {
  generationId?: string;
};

export type ApiCreateExhibitionImageInput = {
  imageUrl: string;
  sortOrder: number;
};

export type ApiUpdateExhibitionImageInput = Partial<ApiCreateExhibitionImageInput>;

export type ApiUpdateExhibitionImageBatchItemInput = {
  imageId: string;
  imageUrl?: string;
  sortOrder?: number;
};

export type ApiNoticeAuthor = {
  id: string;
  name: string;
  familyName: string | null;
  givenName: string | null;
  image: string | null;
  role: ApiRole | null;
};

export type ApiGenerationNotice = {
  id: string;
  generationId: string;
  title: string;
  content: string;
  imageUrls: string[];
  author: ApiNoticeAuthor;
  createdAt: number;
  updatedAt: number;
  updatedBy: ApiAuditActor | null;
};

export type ApiCreateGenerationNoticeInput = {
  title: string;
  content: string;
  imageUrls?: string[];
};

export type ApiUpdateGenerationNoticeInput = Partial<ApiCreateGenerationNoticeInput>;

export type ApiGlobalNotice = {
  id: string;
  title: string;
  content: string;
  imageUrls: string[];
  author: ApiNoticeAuthor;
  createdAt: number;
  updatedAt: number;
  updatedBy: ApiAuditActor | null;
};

export type ApiCreateGlobalNoticeInput = {
  title: string;
  content: string;
  imageUrls?: string[];
};

export type ApiUpdateGlobalNoticeInput = Partial<ApiCreateGlobalNoticeInput>;

export type ApiMarketItemStatus = "selling" | "reserved" | "sold";
export type ApiMarketConditionGrade = "A" | "B" | "C" | "D";

export type ApiMarketSeller = {
  id: string;
  name: string;
  familyName: string | null;
  givenName: string | null;
  image: string | null;
  role: ApiRole | null;
};

export type ApiMarketItem = {
  id: string;
  sellerId: string;
  name: string;
  imageUrls: string[];
  manufacturer: string | null;
  productCode: string | null;
  conditionGrade: ApiMarketConditionGrade | null;
  description: string | null;
  price: number;
  status: ApiMarketItemStatus;
  seller: ApiMarketSeller;
  createdAt: number;
  updatedAt: number;
  updatedBy: ApiAuditActor | null;
};

export type ApiCreateMarketItemInput = {
  name: string;
  imageUrls: string[];
  manufacturer?: string | null;
  productCode?: string | null;
  conditionGrade?: ApiMarketConditionGrade | null;
  description?: string | null;
  price: number;
};

export type ApiUpdateMarketItemInput = Partial<{
  name: string;
  imageUrls: string[];
  manufacturer: string | null;
  productCode: string | null;
  conditionGrade: ApiMarketConditionGrade | null;
  description: string | null;
  price: number;
}>;

export type ApiUpdateMarketItemStatusInput = {
  status: ApiMarketItemStatus;
};

export type ApiListMarketItemsQuery = {
  status?: ApiMarketItemStatus;
  sellerId?: string;
  page?: number;
  pageSize?: number;
};

export type ApiMarketComment = {
  id: string;
  itemId: string;
  author: ApiMarketSeller;
  content: string;
  createdAt: number;
  updatedAt: number;
  updatedBy: ApiAuditActor | null;
};

export type ApiCreateMarketCommentInput = {
  content: string;
};

export type ApiUpdateMarketCommentInput = Partial<ApiCreateMarketCommentInput>;

export type ApiMarketPushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type ApiLinktreeItem = {
  id: string;
  linktreeId: string;
  name: string;
  link: string;
  createdAt: number;
  updatedAt: number;
  updatedBy: ApiAuditActor | null;
};

export type ApiLinktree = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  updatedBy: ApiAuditActor | null;
  items: ApiLinktreeItem[];
};

export type ApiCreateLinktreeInput = {
  name: string;
};

export type ApiUpdateLinktreeInput = Partial<ApiCreateLinktreeInput>;

export type ApiCreateLinktreeItemInput = {
  name: string;
  link: string;
};

export type ApiUpdateLinktreeItemInput = Partial<ApiCreateLinktreeItemInput>;

export type ApiSiteSettings = {
  footerOpenChatUrl: string;
  footerInstagramId: string;
  footerEmail: string;
  footerPhone: string;
  footerAddress: string;
  donateBankName: string;
  donateAccountNumber: string;
  donateAccountHolder: string;
};

export type ApiUpdateSiteSettingsInput = Partial<ApiSiteSettings>;

export const DEFAULT_SITE_SETTINGS: ApiSiteSettings = {
  footerOpenChatUrl: "https://open.kakao.com/o/snVWZ4th",
  footerInstagramId: "yonyongpage",
  footerEmail: "kimse0604@naver.com",
  footerPhone: "010-6814-1800",
  footerAddress: "서울특별시 서대문구 연희로 50 연세대학교 대강당 nn호",
  donateBankName: "예시은행",
  donateAccountNumber: "123-456-789012",
  donateAccountHolder: "연영회",
};

export type ApiRecruitingPlan = {
  year: number;
  title: string;
  content: string;
  promotionImageUrls: string[];
  recruitmentStartAt: number;
  recruitmentEndAt: number;
  createdAt: number;
  updatedAt: number;
};

export type ApiUpsertCurrentRecruitingPlanInput = {
  title: string;
  content: string;
  promotionImageUrls: string[];
  recruitmentStartAt: number;
  recruitmentEndAt: number;
};

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  showcaseImageUrls: string[];
  familyName: string | null;
  givenName: string | null;
  college: string | null;
  department: string | null;
  studentNumber: string | null;
  phoneNumber: string | null;
  collaborationAvailable: boolean;
  personalLink: string | null;
  role: ApiRole | null;
  generationId: string | null;
  generationIds?: string[];
  createdAt: number;
  updatedAt: number;
  updatedBy: ApiAuditActor | null;
};

export type ApiUserResourceHistoryResourceType =
  | "activity"
  | "exhibition"
  | "generation_notice"
  | "global_notice"
  | "linktree"
  | "linktree_item";

export type ApiUserResourceHistoryItem = {
  id: string;
  resourceType: ApiUserResourceHistoryResourceType;
  resourceId: string;
  resourceTitle: string | null;
  action: ApiAuditAction;
  changedFields: string[];
  isDeleted: boolean;
  generationId: string | null;
  linktreeId: string | null;
  createdAt: number;
};

export type ApiUserResourceHistory = {
  items: ApiUserResourceHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ApiPublicGenerationMember = {
  id: string;
  name: string;
  image: string | null;
  showcaseImageUrls: string[];
  familyName: string | null;
  givenName: string | null;
  collaborationAvailable: boolean;
  personalLink: string | null;
  role: ApiRole | null;
  generationId: string;
};

export type ApiGenerationMemberSummary = {
  id: string;
  generationId: string;
  name: string;
  image: string | null;
  familyName: string | null;
  givenName: string | null;
  department: string | null;
  collaborationAvailable: boolean;
  personalLink: string | null;
  role: ApiRole | null;
};

export type ApiPublicGenerationWithMembers = {
  id: string;
  name: string;
  sortOrder: number;
  startDate: number;
  endDate: number;
  members: ApiPublicGenerationMember[];
};

export type ApiAdminUpdateUserInput = {
  name?: string;
  image?: string | null;
  showcaseImageUrls?: string[];
  familyName?: string | null;
  givenName?: string | null;
  college?: string | null;
  department?: string | null;
  studentNumber?: string | null;
  phoneNumber?: string | null;
  collaborationAvailable?: boolean;
  personalLink?: string | null;
  role?: CoreRole;
  generationIds?: string[];
  generationId?: string | null;
};

export type ApiMemberProfileUpdateInput = {
  image?: string | null;
  showcaseImageUrls?: string[];
  familyName?: string | null;
  givenName?: string | null;
  college?: string | null;
  department?: string | null;
  studentNumber?: string | null;
  phoneNumber?: string | null;
  collaborationAvailable?: boolean;
  personalLink?: string | null;
};

export type ApiUpdateUserInput = ApiAdminUpdateUserInput | ApiMemberProfileUpdateInput;

export type ApiBulkUpdateUserRoleInput = {
  userIds: string[];
  role: CoreRole;
};

export type ApiAdminDashboardStats = {
  usersTotal: number;
  unverifiedUsersTotal: number;
  generationsTotal: number;
  selectedGenerationMembersTotal: number;
  selectedGenerationActivitiesTotal: number;
  selectedGenerationExhibitionsTotal: number;
  linktreeLinksTotal: number;
  r2StorageUsedBytes: number;
  r2StorageLimitBytes: number;
  r2StorageUsageAvailable: boolean;
};

export type ApiPresignRequest = {
  fileName: string;
  contentType: string;
  fileSize: number;
};

export type ApiPresignResponse = {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
  requiredHeaders?: Record<string, string>;
};

export type ApiMultipartUploadInitRequest = {
  fileName: string;
  contentType: string;
  fileSize: number;
};

export type ApiMultipartUploadInitResponse = {
  uploadId: string;
  objectKey: string;
  publicUrl: string;
  partSize: number;
  maxPartNumber: number;
};

export type ApiMultipartUploadPartRequest = {
  uploadId: string;
  objectKey: string;
  partNumber: number;
};

export type ApiMultipartUploadPartResponse = {
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
};

export type ApiMultipartUploadedPart = {
  partNumber: number;
  etag: string;
};

export type ApiMultipartUploadCompleteRequest = {
  uploadId: string;
  objectKey: string;
  parts: ApiMultipartUploadedPart[];
};

export type ApiMultipartUploadCompleteResponse = {
  objectKey: string;
  publicUrl: string;
};

export type ApiMultipartUploadAbortRequest = {
  uploadId: string;
  objectKey: string;
};
