import { defineCollection, z, reference } from "astro:content";
import { orgLoader } from "./orgloader";

const articleCollection = defineCollection({
  loader: orgLoader(),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    created_at: z.number(),
    related_posts: z.array(reference("article")).optional(),
    archived: z.boolean(),
  }),
});

export const collections = {
  article: articleCollection,
};
