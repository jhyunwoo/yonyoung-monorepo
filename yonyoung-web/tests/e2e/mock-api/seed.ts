import { DEFAULT_SITE_SETTINGS } from "../../../shared/contracts/api-contracts";
import type { ApiAuditActor } from "../../../shared/contracts/api-contracts";
import type { MockRole, MockState } from "./contracts";

const now = Date.now();

const actor = (
  id: string,
  name: string,
  role: string | null,
  familyName: string | null = null,
  givenName: string | null = null,
): ApiAuditActor => ({ id, name, familyName, givenName, role });

const users = [
  {
    id: "user-president",
    name: "김회장",
    email: "president@yonyoung.test",
    image: "https://images.mock.local/users/president.jpg",
    showcaseImageUrls: ["https://images.mock.local/showcase/president-1.jpg"],
    familyName: "김",
    givenName: "회장",
    college: "문과대학",
    department: "국어국문학과",
    studentNumber: "2019000001",
    phoneNumber: "010-1111-1111",
    collaborationAvailable: true,
    personalLink: "https://instagram.com/president",
    role: "president",
    generationId: "gen-59",
    generationIds: ["gen-59", "gen-58"],
    createdAt: now - 1000 * 60 * 60 * 24 * 500,
    updatedAt: now - 1000 * 60 * 60 * 24,
    updatedBy: null,
  },
  {
    id: "user-vice",
    name: "이부회장",
    email: "vice@yonyoung.test",
    image: "https://images.mock.local/users/vice.jpg",
    showcaseImageUrls: ["https://images.mock.local/showcase/vice-1.jpg"],
    familyName: "이",
    givenName: "부회장",
    college: "공과대학",
    department: "전기전자공학과",
    studentNumber: "2020000002",
    phoneNumber: "010-2222-2222",
    collaborationAvailable: true,
    personalLink: "https://instagram.com/vice",
    role: "vice_president",
    generationId: "gen-59",
    generationIds: ["gen-59"],
    createdAt: now - 1000 * 60 * 60 * 24 * 400,
    updatedAt: now - 1000 * 60 * 60 * 24,
    updatedBy: null,
  },
  {
    id: "user-manager",
    name: "박부장",
    email: "manager@yonyoung.test",
    image: "https://images.mock.local/users/manager.jpg",
    showcaseImageUrls: ["https://images.mock.local/showcase/manager-1.jpg"],
    familyName: "박",
    givenName: "부장",
    college: "사회과학대학",
    department: "정치외교학과",
    studentNumber: "2021000003",
    phoneNumber: "010-3333-3333",
    collaborationAvailable: true,
    personalLink: "https://instagram.com/manager",
    role: "manager",
    generationId: "gen-59",
    generationIds: ["gen-59"],
    createdAt: now - 1000 * 60 * 60 * 24 * 350,
    updatedAt: now - 1000 * 60 * 60 * 24,
    updatedBy: null,
  },
  {
    id: "user-member",
    name: "최부원",
    email: "member@yonyoung.test",
    image: "https://images.mock.local/users/member.jpg",
    showcaseImageUrls: ["https://images.mock.local/showcase/member-1.jpg"],
    familyName: "최",
    givenName: "부원",
    college: "공과대학",
    department: "컴퓨터과학과",
    studentNumber: "2022000004",
    phoneNumber: "010-4444-4444",
    collaborationAvailable: true,
    personalLink: "https://instagram.com/member",
    role: "regular_member",
    generationId: "gen-59",
    generationIds: ["gen-59"],
    createdAt: now - 1000 * 60 * 60 * 24 * 200,
    updatedAt: now - 1000 * 60 * 60 * 24,
    updatedBy: null,
  },
  {
    id: "user-unverified",
    name: "신규회원",
    email: "unverified@yonyoung.test",
    image: null,
    showcaseImageUrls: [],
    familyName: "신",
    givenName: "규회원",
    college: "공과대학",
    department: "산업공학과",
    studentNumber: "2023000005",
    phoneNumber: "010-5555-5555",
    collaborationAvailable: false,
    personalLink: null,
    role: "unverified",
    generationId: "gen-59",
    generationIds: ["gen-59"],
    createdAt: now - 1000 * 60 * 60 * 24 * 20,
    updatedAt: now - 1000 * 60 * 60 * 24,
    updatedBy: null,
  },
] as const;

const generations = [
  {
    id: "gen-58",
    name: "58기",
    sortOrder: 58,
    startDate: new Date("2023-03-01").getTime(),
    endDate: new Date("2024-02-29").getTime(),
    createdAt: now - 1000 * 60 * 60 * 24 * 700,
    updatedAt: now - 1000 * 60 * 60 * 24,
    updatedBy: actor("user-president", "김회장", "president", "김", "회장"),
  },
  {
    id: "gen-59",
    name: "59기",
    sortOrder: 59,
    startDate: new Date("2024-03-01").getTime(),
    endDate: new Date("2025-02-28").getTime(),
    createdAt: now - 1000 * 60 * 60 * 24 * 300,
    updatedAt: now - 1000 * 60 * 60 * 24,
    updatedBy: actor("user-president", "김회장", "president", "김", "회장"),
  },
];

const activities = [
  {
    id: "act-1",
    title: "교내 출사",
    description: "<p>봄 학기 교내 출사 활동입니다.</p>",
    startDate: new Date("2025-03-10").getTime(),
    endDate: new Date("2025-03-10").getTime(),
    coverImageUrl: "https://images.mock.local/activities/act-1-cover.jpg",
    generationId: "gen-59",
    createdAt: now - 1000 * 60 * 60 * 48,
    updatedAt: now - 1000 * 60 * 60 * 24,
    updatedBy: actor("user-manager", "박부장", "manager", "박", "부장"),
    detailImages: [
      {
        id: "act-1-img-1",
        activityId: "act-1",
        imageUrl: "https://images.mock.local/activities/act-1-1.jpg",
        sortOrder: 0,
        createdAt: now - 1000 * 60 * 60 * 48,
        updatedAt: now - 1000 * 60 * 60 * 48,
      },
    ],
  },
  {
    id: "act-2",
    title: "연고전 보도",
    description: "<p>연고전 보도 사진 촬영.</p>",
    startDate: new Date("2025-10-01").getTime(),
    endDate: new Date("2025-10-03").getTime(),
    coverImageUrl: "https://images.mock.local/activities/act-2-cover.jpg",
    generationId: "gen-58",
    createdAt: now - 1000 * 60 * 60 * 72,
    updatedAt: now - 1000 * 60 * 60 * 48,
    updatedBy: actor("user-manager", "박부장", "manager", "박", "부장"),
    detailImages: [],
  },
];

const exhibitions = [
  {
    id: "exh-1",
    title: "정기 사진전",
    startDate: new Date("2025-08-10").getTime(),
    endDate: new Date("2025-08-16").getTime(),
    generationId: "gen-59",
    place: "연세대학교 학생회관",
    coverImageUrl: "https://images.mock.local/exhibitions/exh-1-cover.jpg",
    description: "<p>59기 정기 사진전입니다.</p>",
    createdAt: now - 1000 * 60 * 60 * 96,
    updatedAt: now - 1000 * 60 * 60 * 48,
    updatedBy: actor("user-vice", "이부회장", "vice_president", "이", "부회장"),
    detailImages: [
      {
        id: "exh-1-img-1",
        exhibitionId: "exh-1",
        imageUrl: "https://images.mock.local/exhibitions/exh-1-1.jpg",
        sortOrder: 0,
        createdAt: now - 1000 * 60 * 60 * 96,
        updatedAt: now - 1000 * 60 * 60 * 96,
      },
    ],
  },
];

const generationNotices = [
  {
    id: "gnotice-1",
    generationId: "gen-59",
    title: "59기 공지",
    content: "<p>59기 모임 안내</p>",
    imageUrls: [],
    author: {
      id: "user-manager",
      name: "박부장",
      familyName: "박",
      givenName: "부장",
      image: "https://images.mock.local/users/manager.jpg",
      role: "manager",
    },
    createdAt: now - 1000 * 60 * 60 * 24,
    updatedAt: now - 1000 * 60 * 60 * 24,
    updatedBy: actor("user-manager", "박부장", "manager", "박", "부장"),
  },
];

const globalNotices = [
  {
    id: "notice-1",
    title: "전체 공지",
    content: "<p>전체 운영 공지입니다.</p>",
    imageUrls: [],
    author: {
      id: "user-president",
      name: "김회장",
      familyName: "김",
      givenName: "회장",
      image: "https://images.mock.local/users/president.jpg",
      role: "president",
    },
    createdAt: now - 1000 * 60 * 60 * 12,
    updatedAt: now - 1000 * 60 * 60 * 12,
    updatedBy: actor("user-president", "김회장", "president", "김", "회장"),
  },
];

const linktrees = [
  {
    id: "linktree-1",
    name: "공식 채널",
    createdAt: now - 1000 * 60 * 60 * 100,
    updatedAt: now - 1000 * 60 * 60 * 20,
    updatedBy: actor("user-manager", "박부장", "manager", "박", "부장"),
    items: [
      {
        id: "linktree-item-1",
        linktreeId: "linktree-1",
        name: "Instagram",
        link: "https://instagram.com/yonyongpage",
        createdAt: now - 1000 * 60 * 60 * 100,
        updatedAt: now - 1000 * 60 * 60 * 20,
        updatedBy: actor("user-manager", "박부장", "manager", "박", "부장"),
      },
    ],
  },
];

const marketItems = [
  {
    id: "market-1",
    sellerId: "user-member",
    name: "필름 카메라",
    imageUrls: [
      "https://images.mock.local/market/market-1-1.jpg",
      "https://images.mock.local/market/market-1-2.jpg",
    ],
    manufacturer: "Canon",
    productCode: "AE-1",
    conditionGrade: "B",
    description: "정상 작동합니다.",
    price: 120000,
    status: "selling",
    seller: {
      id: "user-member",
      name: "최부원",
      familyName: "최",
      givenName: "부원",
      image: "https://images.mock.local/users/member.jpg",
      role: "regular_member",
    },
    createdAt: now - 1000 * 60 * 60 * 10,
    updatedAt: now - 1000 * 60 * 60 * 10,
    updatedBy: actor("user-member", "최부원", "regular_member", "최", "부원"),
  },
];

const marketComments = [
  {
    id: "market-comment-1",
    itemId: "market-1",
    author: {
      id: "user-manager",
      name: "박부장",
      familyName: "박",
      givenName: "부장",
      image: "https://images.mock.local/users/manager.jpg",
      role: "manager",
    },
    content: "관심 있습니다!",
    createdAt: now - 1000 * 60 * 60 * 5,
    updatedAt: now - 1000 * 60 * 60 * 5,
    updatedBy: actor("user-manager", "박부장", "manager", "박", "부장"),
  },
];

const recruitingPlan = {
  year: 2026,
  title: "2026 상반기 연영회 모집",
  content: "<p>모집 일정 안내</p>",
  promotionImageUrls: ["https://images.mock.local/recruiting/banner.jpg"],
  recruitmentStartAt: new Date("2026-03-01").getTime(),
  recruitmentEndAt: new Date("2026-03-20").getTime(),
  createdAt: now - 1000 * 60 * 60 * 24 * 7,
  updatedAt: now - 1000 * 60 * 60 * 24,
};

const auditLogs = [
  {
    id: "audit-1",
    resourceType: "global_notice",
    resourceId: "notice-1",
    action: "create",
    actor: actor("user-president", "김회장", "president", "김", "회장"),
    changedFields: ["title", "content"],
    createdAt: now - 1000 * 60 * 60 * 12,
  },
];

export const defaultRoleUserId: Record<Exclude<MockRole, "guest">, string> = {
  president: "user-president",
  vice_president: "user-vice",
  manager: "user-manager",
  member: "user-member",
  unverified: "user-unverified",
};

export const createMockState = (): MockState => ({
  users: users.map((user) => ({ ...user })),
  generations: generations.map((generation) => ({ ...generation })),
  activities: activities.map((activity) => ({
    ...activity,
    detailImages: activity.detailImages.map((image) => ({ ...image })),
  })),
  exhibitions: exhibitions.map((exhibition) => ({
    ...exhibition,
    detailImages: exhibition.detailImages.map((image) => ({ ...image })),
  })),
  notices: {
    generation: generationNotices.map((notice) => ({ ...notice })),
    global: globalNotices.map((notice) => ({ ...notice })),
  },
  linktrees: linktrees.map((linktree) => ({
    ...linktree,
    items: linktree.items.map((item) => ({ ...item })),
  })),
  marketItems: marketItems.map((item) => ({ ...item, imageUrls: [...item.imageUrls] })),
  comments: marketComments.map((comment) => ({ ...comment })),
  recruitingPlan: { ...recruitingPlan },
  siteSettings: { ...DEFAULT_SITE_SETTINGS },
  uploads: {},
  auditLogs: auditLogs.map((log) => ({ ...log, changedFields: [...log.changedFields] })),
  subscriptions: [],
});
