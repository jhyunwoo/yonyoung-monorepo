export type GenerationEntity = {
  id: string;
  name: string;
  sortOrder: number;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: AuditActorEntity | null;
};

export type AuditResourceType =
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

export type AuditAction = "create" | "update" | "delete";

export type AuditActorEntity = {
  id: string;
  name: string;
  familyName: string | null;
  givenName: string | null;
  role: string | null;
};

export type AuditLogEntity = {
  id: string;
  resourceType: AuditResourceType;
  resourceId: string;
  action: AuditAction;
  actor: AuditActorEntity | null;
  changedFields: string[];
  createdAt: Date;
};

export type ActivityImageEntity = {
  id: string;
  activityId: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ActivityEntity = {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  coverImageUrl: string;
  generationId: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: AuditActorEntity | null;
  detailImages: ActivityImageEntity[];
};

export type ExhibitionImageEntity = {
  id: string;
  exhibitionId: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ExhibitionEntity = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  generationId: string;
  place: string;
  coverImageUrl: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: AuditActorEntity | null;
  detailImages: ExhibitionImageEntity[];
};

export type LinktreeItemEntity = {
  id: string;
  linktreeId: string;
  name: string;
  link: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: AuditActorEntity | null;
};

export type LinktreeEntity = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: AuditActorEntity | null;
  items: LinktreeItemEntity[];
};

export type NoticeAuthorEntity = {
  id: string;
  name: string;
  familyName: string | null;
  givenName: string | null;
  image: string | null;
  role: string | null;
};

export type GenerationNoticeEntity = {
  id: string;
  generationId: string;
  title: string;
  content: string;
  imageUrls: string[];
  author: NoticeAuthorEntity;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: AuditActorEntity | null;
};

export type GlobalNoticeEntity = {
  id: string;
  title: string;
  content: string;
  imageUrls: string[];
  author: NoticeAuthorEntity;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: AuditActorEntity | null;
};

export type MarketItemStatus = "selling" | "reserved" | "sold";
export type MarketConditionGrade = "A" | "B" | "C" | "D";

export type MarketSellerEntity = {
  id: string;
  name: string;
  familyName: string | null;
  givenName: string | null;
  image: string | null;
  role: string | null;
};

export type MarketItemEntity = {
  id: string;
  sellerId: string;
  name: string;
  imageUrls: string[];
  manufacturer: string | null;
  productCode: string | null;
  conditionGrade: MarketConditionGrade | null;
  description: string | null;
  price: number;
  status: MarketItemStatus;
  seller: MarketSellerEntity;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: AuditActorEntity | null;
};

export type MarketCommentEntity = {
  id: string;
  itemId: string;
  author: MarketSellerEntity;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: AuditActorEntity | null;
};

export type MarketPushSubscriptionEntity = {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SiteSettingsEntity = {
  footerOpenChatUrl: string;
  footerInstagramId: string;
  footerEmail: string;
  footerPhone: string;
  footerAddress: string;
  donateBankName: string;
  donateAccountNumber: string;
  donateAccountHolder: string;
};

export type RecruitingPlanEntity = {
  year: number;
  title: string;
  content: string;
  promotionImageUrls: string[];
  recruitmentStartAt: Date;
  recruitmentEndAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type UserEntity = {
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
  role: string | null;
  generationId: string | null;
  generationIds?: string[];
  createdAt: Date;
  updatedAt: Date;
  updatedBy: AuditActorEntity | null;
};

export type UserResourceHistoryResourceType =
  | "activity"
  | "exhibition"
  | "generation_notice"
  | "global_notice"
  | "linktree"
  | "linktree_item";

export type UserResourceHistoryItemEntity = {
  id: string;
  resourceType: UserResourceHistoryResourceType;
  resourceId: string;
  resourceTitle: string | null;
  action: AuditAction;
  changedFields: string[];
  isDeleted: boolean;
  generationId: string | null;
  linktreeId: string | null;
  createdAt: Date;
};

export type UserResourceHistoryEntity = {
  items: UserResourceHistoryItemEntity[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminDashboardStatsEntity = {
  usersTotal: number;
  unverifiedUsersTotal: number;
  generationsTotal: number;
  selectedGenerationMembersTotal: number;
  selectedGenerationActivitiesTotal: number;
  selectedGenerationExhibitionsTotal: number;
  linktreeLinksTotal: number;
};

export type DataService = {
  createAuditLog: (input: {
    resourceType: AuditResourceType;
    resourceId: string;
    action: AuditAction;
    actorId: string | null;
    actorName: string;
    actorRole: string | null;
    changedFields: string[];
  }) => Promise<void>;
  listAuditLogs: (
    resourceType: AuditResourceType,
    resourceId: string,
    limit: number,
  ) => Promise<AuditLogEntity[]>;
  getLatestAuditActor: (
    resourceType: AuditResourceType,
    resourceId: string,
  ) => Promise<AuditActorEntity | null>;
  listLatestAuditActors: (
    resourceType: AuditResourceType,
    resourceIds: string[],
  ) => Promise<Record<string, AuditActorEntity | null>>;

  listGenerations: () => Promise<GenerationEntity[]>;
  createGeneration: (input: {
    name: string;
    sortOrder: number;
    startDate: number;
    endDate: number;
  }) => Promise<GenerationEntity>;
  getGenerationById: (id: string) => Promise<GenerationEntity | null>;
  updateGeneration: (
    id: string,
    input: Partial<{
      name: string;
      sortOrder: number;
      startDate: number;
      endDate: number;
    }>,
  ) => Promise<GenerationEntity | null>;
  deleteGeneration: (id: string) => Promise<boolean>;

  listActivities: (generationId?: string) => Promise<ActivityEntity[]>;
  listPublicActivities: () => Promise<ActivityEntity[]>;
  createActivity: (input: {
    title: string;
    description: string;
    startDate: number;
    endDate: number;
    coverImageUrl: string;
    generationId: string;
  }) => Promise<ActivityEntity>;
  getActivityById: (id: string) => Promise<ActivityEntity | null>;
  updateActivity: (
    id: string,
    input: Partial<{
      title: string;
      description: string;
      startDate: number;
      endDate: number;
      coverImageUrl: string;
      generationId: string;
    }>,
  ) => Promise<ActivityEntity | null>;
  deleteActivity: (id: string) => Promise<boolean>;
  addActivityImage: (
    activityId: string,
    input: { imageUrl: string; sortOrder: number },
  ) => Promise<ActivityImageEntity | null>;
  addActivityImages: (
    activityId: string,
    input: Array<{ imageUrl: string; sortOrder: number }>,
  ) => Promise<ActivityImageEntity[] | null>;
  updateActivityImage: (
    activityId: string,
    imageId: string,
    input: Partial<{ imageUrl: string; sortOrder: number }>,
  ) => Promise<ActivityImageEntity | null>;
  updateActivityImages: (
    activityId: string,
    input: Array<{
      imageId: string;
      imageUrl?: string;
      sortOrder?: number;
    }>,
  ) => Promise<ActivityImageEntity[] | null>;
  deleteActivityImage: (activityId: string, imageId: string) => Promise<boolean>;

  listExhibitions: (generationId?: string) => Promise<ExhibitionEntity[]>;
  listPublicExhibitions: () => Promise<ExhibitionEntity[]>;
  createExhibition: (input: {
    title: string;
    startDate: number;
    endDate: number;
    generationId: string;
    place: string;
    coverImageUrl: string;
    description: string;
  }) => Promise<ExhibitionEntity>;
  getExhibitionById: (id: string) => Promise<ExhibitionEntity | null>;
  updateExhibition: (
    id: string,
    input: Partial<{
      title: string;
      startDate: number;
      endDate: number;
      generationId: string;
      place: string;
      coverImageUrl: string;
      description: string;
    }>,
  ) => Promise<ExhibitionEntity | null>;
  deleteExhibition: (id: string) => Promise<boolean>;
  addExhibitionImage: (
    exhibitionId: string,
    input: { imageUrl: string; sortOrder: number },
  ) => Promise<ExhibitionImageEntity | null>;
  addExhibitionImages: (
    exhibitionId: string,
    input: Array<{ imageUrl: string; sortOrder: number }>,
  ) => Promise<ExhibitionImageEntity[] | null>;
  updateExhibitionImage: (
    exhibitionId: string,
    imageId: string,
    input: Partial<{ imageUrl: string; sortOrder: number }>,
  ) => Promise<ExhibitionImageEntity | null>;
  updateExhibitionImages: (
    exhibitionId: string,
    input: Array<{
      imageId: string;
      imageUrl?: string;
      sortOrder?: number;
    }>,
  ) => Promise<ExhibitionImageEntity[] | null>;
  deleteExhibitionImage: (
    exhibitionId: string,
    imageId: string,
  ) => Promise<boolean>;

  listLinktrees: () => Promise<LinktreeEntity[]>;
  createLinktree: (input: { name: string }) => Promise<LinktreeEntity>;
  getLinktreeById: (id: string) => Promise<LinktreeEntity | null>;
  updateLinktree: (
    id: string,
    input: Partial<{ name: string }>,
  ) => Promise<LinktreeEntity | null>;
  deleteLinktree: (id: string) => Promise<boolean>;
  addLinktreeItem: (
    linktreeId: string,
    input: { name: string; link: string },
  ) => Promise<LinktreeItemEntity | null>;
  updateLinktreeItem: (
    linktreeId: string,
    itemId: string,
    input: Partial<{ name: string; link: string }>,
  ) => Promise<LinktreeItemEntity | null>;
  deleteLinktreeItem: (linktreeId: string, itemId: string) => Promise<boolean>;

  listGenerationNotices: (generationId: string) => Promise<GenerationNoticeEntity[]>;
  createGenerationNotice: (
    generationId: string,
    input: {
      title: string;
      content: string;
      imageUrls: string[];
      authorId: string;
    },
  ) => Promise<GenerationNoticeEntity | null>;
  getGenerationNoticeById: (
    generationId: string,
    noticeId: string,
  ) => Promise<GenerationNoticeEntity | null>;
  updateGenerationNotice: (
    generationId: string,
    noticeId: string,
    input: Partial<{
      title: string;
      content: string;
      imageUrls: string[];
    }>,
  ) => Promise<GenerationNoticeEntity | null>;
  deleteGenerationNotice: (generationId: string, noticeId: string) => Promise<boolean>;

  listGlobalNotices: () => Promise<GlobalNoticeEntity[]>;
  createGlobalNotice: (input: {
    title: string;
    content: string;
    imageUrls: string[];
    authorId: string;
  }) => Promise<GlobalNoticeEntity | null>;
  getGlobalNoticeById: (noticeId: string) => Promise<GlobalNoticeEntity | null>;
  updateGlobalNotice: (
    noticeId: string,
    input: Partial<{
      title: string;
      content: string;
      imageUrls: string[];
    }>,
  ) => Promise<GlobalNoticeEntity | null>;
  deleteGlobalNotice: (noticeId: string) => Promise<boolean>;

  listMarketItems: (input: {
    status?: MarketItemStatus;
    sellerId?: string;
    page?: number;
    pageSize?: number;
  }) => Promise<MarketItemEntity[]>;
  createMarketItem: (input: {
    sellerId: string;
    name: string;
    imageUrls: string[];
    manufacturer: string | null;
    productCode: string | null;
    conditionGrade: MarketConditionGrade | null;
    description: string | null;
    price: number;
  }) => Promise<MarketItemEntity | null>;
  getMarketItemById: (id: string) => Promise<MarketItemEntity | null>;
  updateMarketItem: (
    id: string,
    input: Partial<{
      name: string;
      imageUrls: string[];
      manufacturer: string | null;
      productCode: string | null;
      conditionGrade: MarketConditionGrade | null;
      description: string | null;
      price: number;
    }>,
  ) => Promise<MarketItemEntity | null>;
  updateMarketItemStatus: (
    id: string,
    status: MarketItemStatus,
  ) => Promise<MarketItemEntity | null>;
  deleteMarketItem: (id: string) => Promise<boolean>;
  listMarketCommentsByItemId: (itemId: string) => Promise<MarketCommentEntity[]>;
  createMarketComment: (input: {
    itemId: string;
    authorId: string;
    content: string;
  }) => Promise<MarketCommentEntity | null>;
  getMarketCommentById: (id: string) => Promise<MarketCommentEntity | null>;
  updateMarketComment: (
    id: string,
    input: Partial<{ content: string }>,
  ) => Promise<MarketCommentEntity | null>;
  deleteMarketComment: (id: string) => Promise<boolean>;
  upsertMarketPushSubscription: (input: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }) => Promise<MarketPushSubscriptionEntity | null>;
  deleteMarketPushSubscription: (input: {
    userId: string;
    endpoint: string;
  }) => Promise<boolean>;
  listMarketPushSubscriptionsByUserId: (
    userId: string,
  ) => Promise<MarketPushSubscriptionEntity[]>;

  getSiteSettings: () => Promise<SiteSettingsEntity>;
  updateSiteSettings: (
    input: Partial<{
      footerOpenChatUrl: string;
      footerInstagramId: string;
      footerEmail: string;
      footerPhone: string;
      footerAddress: string;
      donateBankName: string;
      donateAccountNumber: string;
      donateAccountHolder: string;
    }>,
  ) => Promise<SiteSettingsEntity>;

  getCurrentRecruitingPlan: () => Promise<RecruitingPlanEntity | null>;
  upsertCurrentRecruitingPlan: (input: {
    title: string;
    content: string;
    promotionImageUrls: string[];
    recruitmentStartAt: Date;
    recruitmentEndAt: Date;
  }) => Promise<RecruitingPlanEntity>;

  listUsers: () => Promise<UserEntity[]>;
  listUsersByIds: (userIds: string[]) => Promise<UserEntity[]>;
  listUsersByGenerationIds: (generationIds: string[]) => Promise<UserEntity[]>;
  countUsersByRole: (role: string) => Promise<number>;
  getUserById: (id: string) => Promise<UserEntity | null>;
  listUserResourceHistory: (input: {
    userId: string;
    page: number;
    pageSize: number;
    action?: AuditAction;
  }) => Promise<UserResourceHistoryEntity>;
  updateUser: (
    id: string,
    input: Partial<{
      name: string;
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
      role: string;
      generationIds: string[];
      generationId: string | null;
    }>,
  ) => Promise<UserEntity | null>;
  bulkUpdateUsersRole: (input: {
    userIds: string[];
    role: string;
  }) => Promise<UserEntity[]>;
  getAdminDashboardStats: (generationSortOrder: number | null) => Promise<AdminDashboardStatsEntity>;
  deleteUser: (id: string) => Promise<boolean>;
};

export type PresignService = {
  issuePresignedPutUrl: (input: {
    actorId: string;
    resource: "activities" | "exhibitions" | "users" | "notices" | "market";
    slot: "cover" | "detail" | "profile" | "image";
    fileName: string;
    contentType: string;
    fileSize: number;
  }) => Promise<{
    uploadUrl: string;
    objectKey: string;
    publicUrl: string;
    requiredHeaders: Record<string, string>;
  }>;
  initiateMultipartUpload: (input: {
    actorId: string;
    resource: "activities" | "exhibitions" | "users" | "notices" | "market";
    slot: "cover" | "detail" | "profile" | "image";
    fileName: string;
    contentType: string;
    fileSize: number;
  }) => Promise<{
    uploadId: string;
    objectKey: string;
    publicUrl: string;
    partSize: number;
    maxPartNumber: number;
  }>;
  issueMultipartUploadPartUrl: (input: {
    uploadId: string;
    objectKey: string;
    partNumber: number;
  }) => Promise<{
    uploadUrl: string;
    requiredHeaders: Record<string, string>;
  }>;
  completeMultipartUpload: (input: {
    uploadId: string;
    objectKey: string;
    parts: Array<{ partNumber: number; etag: string }>;
  }) => Promise<{
    objectKey: string;
    publicUrl: string;
  }>;
  abortMultipartUpload: (input: {
    uploadId: string;
    objectKey: string;
  }) => Promise<void>;
};
