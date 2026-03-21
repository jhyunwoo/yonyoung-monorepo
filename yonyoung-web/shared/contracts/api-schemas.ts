import { z } from "zod";
import { CORE_ROLE_VALUES } from "@/shared/contracts/auth-roles";

const timestampSchema = z.number().finite();
const nullableStringSchema = z.string().nullable();
const donateAccountNumberRegex = /^[0-9-]+$/;

export const apiRoleSchema = z.string();

export const apiAuditActorSchema = z.object({
  id: z.string(),
  name: z.string(),
  familyName: nullableStringSchema,
  givenName: nullableStringSchema,
  role: apiRoleSchema.nullable(),
});

export const apiGenerationSchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number().int(),
  startDate: timestampSchema,
  endDate: timestampSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  updatedBy: apiAuditActorSchema.nullable(),
});

export const apiCreateGenerationInputSchema = z.object({
  name: z.string().trim().min(1),
  sortOrder: z.number().int(),
  startDate: timestampSchema,
  endDate: timestampSchema,
});

export const apiUpdateGenerationInputSchema = apiCreateGenerationInputSchema.partial();

export const apiActivityImageSchema = z.object({
  id: z.string(),
  activityId: z.string(),
  imageUrl: z.url(),
  sortOrder: z.number().int(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const apiActivitySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  startDate: timestampSchema,
  endDate: timestampSchema,
  coverImageUrl: z.url(),
  generationId: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  updatedBy: apiAuditActorSchema.nullable(),
  detailImages: z.array(apiActivityImageSchema),
});

export const apiCreateActivityInputSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string(),
  startDate: timestampSchema,
  endDate: timestampSchema,
  coverImageUrl: z.url(),
  generationId: z.string(),
});

export const apiUpdateActivityInputSchema = apiCreateActivityInputSchema.partial();

export const apiCreateActivityImageInputSchema = z.object({
  imageUrl: z.url(),
  sortOrder: z.number().int(),
});

export const apiUpdateActivityImageInputSchema =
  apiCreateActivityImageInputSchema.partial();

export const apiUpdateActivityImageBatchItemInputSchema = z.object({
  imageId: z.string(),
  imageUrl: z.url().optional(),
  sortOrder: z.number().int().optional(),
});

export const apiExhibitionImageSchema = z.object({
  id: z.string(),
  exhibitionId: z.string(),
  imageUrl: z.url(),
  sortOrder: z.number().int(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const apiExhibitionSchema = z.object({
  id: z.string(),
  title: z.string(),
  startDate: timestampSchema,
  endDate: timestampSchema,
  generationId: z.string(),
  place: z.string(),
  coverImageUrl: z.url(),
  description: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  updatedBy: apiAuditActorSchema.nullable(),
  detailImages: z.array(apiExhibitionImageSchema),
});

export const apiCreateExhibitionInputSchema = z.object({
  title: z.string().trim().min(1),
  startDate: timestampSchema,
  endDate: timestampSchema,
  generationId: z.string(),
  place: z.string().trim().min(1),
  coverImageUrl: z.url(),
  description: z.string(),
});

export const apiUpdateExhibitionInputSchema = apiCreateExhibitionInputSchema.partial();

export const apiCreateExhibitionImageInputSchema = z.object({
  imageUrl: z.url(),
  sortOrder: z.number().int(),
});

export const apiUpdateExhibitionImageInputSchema =
  apiCreateExhibitionImageInputSchema.partial();

export const apiUpdateExhibitionImageBatchItemInputSchema = z.object({
  imageId: z.string(),
  imageUrl: z.url().optional(),
  sortOrder: z.number().int().optional(),
});

export const apiNoticeAuthorSchema = z.object({
  id: z.string(),
  name: z.string(),
  familyName: nullableStringSchema,
  givenName: nullableStringSchema,
  image: nullableStringSchema,
  role: apiRoleSchema.nullable(),
});

export const apiGenerationNoticeSchema = z.object({
  id: z.string(),
  generationId: z.string(),
  title: z.string(),
  content: z.string(),
  imageUrls: z.array(z.url()),
  author: apiNoticeAuthorSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  updatedBy: apiAuditActorSchema.nullable(),
});

export const apiGlobalNoticeSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  imageUrls: z.array(z.url()),
  author: apiNoticeAuthorSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  updatedBy: apiAuditActorSchema.nullable(),
});

const createNoticeInputBaseSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  imageUrls: z.array(z.url()).optional(),
});

export const apiCreateGenerationNoticeInputSchema = createNoticeInputBaseSchema;
export const apiUpdateGenerationNoticeInputSchema = createNoticeInputBaseSchema.partial();
export const apiCreateGlobalNoticeInputSchema = createNoticeInputBaseSchema;
export const apiUpdateGlobalNoticeInputSchema = createNoticeInputBaseSchema.partial();

export const apiLinktreeItemSchema = z.object({
  id: z.string(),
  linktreeId: z.string(),
  name: z.string(),
  link: z.url(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  updatedBy: apiAuditActorSchema.nullable(),
});

export const apiLinktreeSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  updatedBy: apiAuditActorSchema.nullable(),
  items: z.array(apiLinktreeItemSchema),
});

export const apiCreateLinktreeInputSchema = z.object({
  name: z.string().trim().min(1),
});

export const apiUpdateLinktreeInputSchema = apiCreateLinktreeInputSchema.partial();

export const apiCreateLinktreeItemInputSchema = z.object({
  name: z.string().trim().min(1),
  link: z.url(),
});

export const apiUpdateLinktreeItemInputSchema =
  apiCreateLinktreeItemInputSchema.partial();

export const apiSiteSettingsSchema = z.object({
  footerOpenChatUrl: z.url(),
  footerInstagramId: z.string(),
  footerEmail: z.string().email(),
  footerPhone: z.string(),
  footerAddress: z.string(),
  donateBankName: z.string(),
  donateAccountNumber: z
    .string()
    .trim()
    .max(50, { message: "계좌번호는 최대 50자까지 입력할 수 있습니다." })
    .regex(donateAccountNumberRegex, {
      message: "계좌번호는 숫자와 -만 입력할 수 있습니다.",
    }),
  donateAccountHolder: z.string(),
});

export const apiUpdateSiteSettingsInputSchema = apiSiteSettingsSchema.partial();

export const apiRecruitingPlanSchema = z.object({
  year: z.number().int(),
  title: z.string(),
  content: z.string(),
  promotionImageUrls: z.array(z.url()),
  recruitmentStartAt: timestampSchema,
  recruitmentEndAt: timestampSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const apiUpsertCurrentRecruitingPlanInputSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  promotionImageUrls: z.array(z.url()),
  recruitmentStartAt: timestampSchema,
  recruitmentEndAt: timestampSchema,
});

export const apiMarketItemStatusSchema = z.enum(["selling", "reserved", "sold"]);
export const apiMarketConditionGradeSchema = z.enum(["A", "B", "C", "D"]);

export const apiMarketSellerSchema = z.object({
  id: z.string(),
  name: z.string(),
  familyName: nullableStringSchema,
  givenName: nullableStringSchema,
  image: nullableStringSchema,
  role: apiRoleSchema.nullable(),
});

export const apiMarketItemSchema = z.object({
  id: z.string(),
  sellerId: z.string(),
  name: z.string(),
  imageUrls: z.array(z.url()),
  manufacturer: nullableStringSchema,
  productCode: nullableStringSchema,
  conditionGrade: apiMarketConditionGradeSchema.nullable(),
  description: nullableStringSchema,
  price: z.number().finite(),
  status: apiMarketItemStatusSchema,
  seller: apiMarketSellerSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  updatedBy: apiAuditActorSchema.nullable(),
});

export const apiCreateMarketItemInputSchema = z.object({
  name: z.string().trim().min(1),
  imageUrls: z.array(z.url()).min(1),
  manufacturer: nullableStringSchema.optional(),
  productCode: nullableStringSchema.optional(),
  conditionGrade: apiMarketConditionGradeSchema.nullable().optional(),
  description: nullableStringSchema.optional(),
  price: z.number().finite(),
});

export const apiUpdateMarketItemInputSchema = apiCreateMarketItemInputSchema
  .partial()
  .extend({
    imageUrls: z.array(z.url()).optional(),
  });

export const apiUpdateMarketItemStatusInputSchema = z.object({
  status: apiMarketItemStatusSchema,
});

export const apiMarketCommentSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  author: apiMarketSellerSchema,
  content: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  updatedBy: apiAuditActorSchema.nullable(),
});

export const apiCreateMarketCommentInputSchema = z.object({
  content: z.string().trim().min(1),
});

export const apiUpdateMarketCommentInputSchema =
  apiCreateMarketCommentInputSchema.partial();

export const apiMarketPushSubscriptionInputSchema = z.object({
  endpoint: z.url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export const apiUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  image: nullableStringSchema,
  showcaseImageUrls: z.array(z.url()),
  familyName: nullableStringSchema,
  givenName: nullableStringSchema,
  college: nullableStringSchema,
  department: nullableStringSchema,
  studentNumber: nullableStringSchema,
  phoneNumber: nullableStringSchema,
  collaborationAvailable: z.boolean(),
  personalLink: nullableStringSchema,
  role: apiRoleSchema.nullable(),
  generationId: z.string().nullable(),
  generationIds: z.array(z.string()).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  updatedBy: apiAuditActorSchema.nullable(),
});

export const apiGenerationMemberSummarySchema = z.object({
  id: z.string(),
  generationId: z.string(),
  name: z.string(),
  image: nullableStringSchema,
  familyName: nullableStringSchema,
  givenName: nullableStringSchema,
  department: nullableStringSchema,
  collaborationAvailable: z.boolean(),
  personalLink: nullableStringSchema,
  role: apiRoleSchema.nullable(),
});

export const apiPublicGenerationMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: nullableStringSchema,
  showcaseImageUrls: z.array(z.url()),
  familyName: nullableStringSchema,
  givenName: nullableStringSchema,
  collaborationAvailable: z.boolean(),
  personalLink: nullableStringSchema,
  role: apiRoleSchema.nullable(),
  generationId: z.string(),
});

export const apiPublicGenerationWithMembersSchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number().int(),
  startDate: timestampSchema,
  endDate: timestampSchema,
  members: z.array(apiPublicGenerationMemberSchema),
});

export const apiBulkUpdateUserRoleInputSchema = z.object({
  userIds: z.array(z.string()).min(1),
  role: z.enum(CORE_ROLE_VALUES),
});

export const apiAdminUpdateUserInputSchema = z.object({
  name: z.string().optional(),
  image: nullableStringSchema.optional(),
  showcaseImageUrls: z.array(z.url()).optional(),
  familyName: nullableStringSchema.optional(),
  givenName: nullableStringSchema.optional(),
  college: nullableStringSchema.optional(),
  department: nullableStringSchema.optional(),
  studentNumber: nullableStringSchema.optional(),
  phoneNumber: nullableStringSchema.optional(),
  collaborationAvailable: z.boolean().optional(),
  personalLink: nullableStringSchema.optional(),
  role: z.enum(CORE_ROLE_VALUES).optional(),
  generationIds: z.array(z.string()).optional(),
  generationId: z.string().nullable().optional(),
});

export const apiMemberProfileUpdateInputSchema = z.object({
  image: nullableStringSchema.optional(),
  showcaseImageUrls: z.array(z.url()).optional(),
  familyName: nullableStringSchema.optional(),
  givenName: nullableStringSchema.optional(),
  college: nullableStringSchema.optional(),
  department: nullableStringSchema.optional(),
  studentNumber: nullableStringSchema.optional(),
  phoneNumber: nullableStringSchema.optional(),
  collaborationAvailable: z.boolean().optional(),
  personalLink: nullableStringSchema.optional(),
});

export const apiUpdateUserInputSchema = z.union([
  apiAdminUpdateUserInputSchema,
  apiMemberProfileUpdateInputSchema,
]);

export const apiAdminDashboardStatsSchema = z.object({
  usersTotal: z.number().int(),
  unverifiedUsersTotal: z.number().int(),
  generationsTotal: z.number().int(),
  selectedGenerationMembersTotal: z.number().int(),
  selectedGenerationActivitiesTotal: z.number().int(),
  selectedGenerationExhibitionsTotal: z.number().int(),
  linktreeLinksTotal: z.number().int(),
  r2StorageUsedBytes: z.number().int(),
  r2StorageLimitBytes: z.number().int(),
  r2StorageUsageAvailable: z.boolean(),
});

export const apiPresignRequestSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
});

export const apiPresignResponseSchema = z.object({
  uploadUrl: z.url(),
  objectKey: z.string(),
  publicUrl: z.url(),
  requiredHeaders: z.record(z.string(), z.string()).optional(),
});

export const apiAuditResourceTypeSchema = z.enum([
  "generation",
  "activity",
  "exhibition",
  "generation_notice",
  "global_notice",
  "market_item",
  "market_comment",
  "linktree",
  "linktree_item",
  "user",
]);

export const apiAuditActionSchema = z.enum(["create", "update", "delete"]);

export const apiAuditLogSchema = z.object({
  id: z.string(),
  resourceType: apiAuditResourceTypeSchema,
  resourceId: z.string(),
  action: apiAuditActionSchema,
  actor: apiAuditActorSchema.nullable(),
  changedFields: z.array(z.string()),
  createdAt: timestampSchema,
});
