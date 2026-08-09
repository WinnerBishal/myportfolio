import { defineCollection, z } from "astro:content";
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    name: z.string().optional(),
    tools: z.array(z.string()).optional(),
    image: z.string().optional(),
    description: z.string().optional(),
    permalink: z.string().optional(),
    external_url: z.string().optional(),
    use_math: z.boolean().optional(),
    /**
     * Position in the projects grid. Explicit so filenames can be readable
     * slugs instead of doubling as sort keys; entries without one fall to the
     * end, ordered by id.
     */
    order: z.number().optional(),
    /**
     * Silent looping clip used in place of the still thumbnail. `image` stays
     * the poster frame, so layout and fallbacks keep working.
     */
    motion: z.string().optional(),
    /** A PDF this project is written up in, shown as a report panel. */
    report: z
      .object({
        file: z.string(),
        title: z.string().optional(),
        pages: z.number().optional(),
        sizeMb: z.number().optional(),
        cover: z.string().optional()
      })
      .optional()
  })
});

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    layout: z.string().optional(),
    title: z.string().optional(),
    article_title: z.string().optional(),
    description: z.string().optional(),
    abstract: z.string().optional(),
    tags: z.array(z.string()).optional(),
    color: z.string().optional(),
    style: z.string().optional(),
    read_more_type: z.string().optional(),
    read_more_url: z.string().optional(),
    paper_url: z.string().optional(),
    authors: z.array(z.object({
      name: z.string(),
      orcid: z.string().optional(),
      email: z.string().optional(),
      doi: z.string().optional()
    })).optional()
  })
});

/**
 * Short-form entries for the home feed: news items, notes, and thoughts that
 * are not full research articles. `url` makes an entry link out; without one it
 * simply reads on the home page.
 */
const notes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/notes" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    kind: z.enum(["news", "note", "thought"]).default("note"),
    summary: z.string().optional(),
    url: z.string().optional()
  })
});

export const collections = { projects, posts, notes };
