import { defineCollection, z, reference } from "astro:content";

const articleCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    created_at: z.number(),
    related_posts: z.array(reference("article")),
  }),
});

export const collections = {
  article: articleCollection,
};
