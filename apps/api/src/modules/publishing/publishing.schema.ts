import { z } from 'zod';

/** The publishing contract (ADR-014, ADR-025). */

export const publishedBusinessSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    published: z.boolean(),
    /**
     * The public address (ADR-021). Non-null once published, and permanent
     * from that moment — a rename retires a handle, it never reassigns one.
     */
    handle: z.string(),
  })
  .describe('A business that is now live on its public booking page.')
  .meta({ id: 'PublishedBusiness' });
