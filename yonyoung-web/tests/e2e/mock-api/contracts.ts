import type {
  ApiActivity,
  ApiAuditLog,
  ApiExhibition,
  ApiGeneration,
  ApiGenerationNotice,
  ApiGlobalNotice,
  ApiLinktree,
  ApiMarketComment,
  ApiMarketItem,
  ApiMarketPushSubscriptionInput,
  ApiRecruitingPlan,
  ApiSiteSettings,
  ApiUser,
} from "../../../shared/contracts/api-contracts";

export type MockRole =
  | "guest"
  | "unverified"
  | "member"
  | "manager"
  | "vice_president"
  | "president";

export type MockNoticeState = {
  generation: ApiGenerationNotice[];
  global: ApiGlobalNotice[];
};

export type MockUploadObject = {
  objectKey: string;
  publicUrl: string;
  uploaded: boolean;
  contentType: string;
  fileSize: number;
};

export type MockState = {
  users: ApiUser[];
  generations: ApiGeneration[];
  activities: ApiActivity[];
  exhibitions: ApiExhibition[];
  notices: MockNoticeState;
  linktrees: ApiLinktree[];
  marketItems: ApiMarketItem[];
  comments: ApiMarketComment[];
  recruitingPlan: ApiRecruitingPlan | null;
  siteSettings: ApiSiteSettings;
  uploads: Record<string, MockUploadObject>;
  auditLogs: ApiAuditLog[];
  subscriptions: ApiMarketPushSubscriptionInput[];
};

export type MockSessionUser = Pick<
  ApiUser,
  | "id"
  | "email"
  | "name"
  | "image"
  | "familyName"
  | "givenName"
  | "college"
  | "department"
  | "studentNumber"
  | "phoneNumber"
  | "collaborationAvailable"
  | "personalLink"
  | "role"
  | "generationId"
  | "generationIds"
>;
