import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/features/seo/metadata/seo";
import {
  listPublicActivities,
  listPublicExhibitions,
} from "@/features/public/services/public-read-service";

type StaticSitemapRoute = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
};

const STATIC_ROUTES: StaticSitemapRoute[] = [
  {
    path: "/",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/about",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/about/photographers",
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    path: "/about/recruiting",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/archive",
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    path: "/archive/records",
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    path: "/archive/exhibitions",
    changeFrequency: "daily",
    priority: 0.85,
  },
  {
    path: "/linktree",
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    path: "/donate",
    changeFrequency: "monthly",
    priority: 0.7,
  },
];

const toDate = (timestamp: number): Date => new Date(timestamp);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = resolveSiteUrl();
  const now = new Date();
  const [activities, exhibitions] = await Promise.all([
    listPublicActivities(),
    listPublicExhibitions(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const activityEntries: MetadataRoute.Sitemap = activities.map((activity) => ({
    url: `${siteUrl}/archive/records/${activity.id}`,
    lastModified: toDate(activity.updatedAt),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const exhibitionEntries: MetadataRoute.Sitemap = exhibitions.map((exhibition) => ({
    url: `${siteUrl}/archive/exhibitions/${exhibition.id}`,
    lastModified: toDate(exhibition.updatedAt),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticEntries, ...activityEntries, ...exhibitionEntries];
}
