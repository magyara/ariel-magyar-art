import { z } from 'zod';
import { AVAILABILITY, IMAGE_SLOTS, REQUIRED_SLOTS } from '../../src/types.js';
import type { AdminArtworkInput, Availability } from '../../src/types.js';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const text = (max: number) => z.string().trim().max(max);

/** Blob uploads are absolute URLs; older pieces use site-relative paths like /images/x.jpg. */
export const imageUrl = z
    .string()
    .max(2000)
    .refine((v) => /^\/(?!\/)/.test(v) || /^https:\/\//.test(v), 'Must be an https URL or a /path on this site');

export const artworkInputSchema = z
    .object({
        title: text(200).min(1, 'Title is required'),
        place: text(200),
        medium: text(200).min(1, 'Medium is required'),
        width: z.number().positive(),
        height: z.number().positive(),
        year: z.number().int().min(1900).max(2100),
        availability: z.enum(AVAILABILITY as [Availability, ...Availability[]]),
        priceDollars: z.number().int().min(0).nullable(),
        priceCents: z.number().int().min(0).max(99).nullable(),
        featured: z.boolean(),
        story: text(5000),
        categories: z.array(text(60).min(1)).max(20),
        display: z.union([
            z.object({ id: z.number().int().positive() }),
            z.object({ venue: text(200).min(1), city: text(200).min(1), startDate: date, endDate: date }),
            z.null(),
        ]),
        images: z
            .array(z.object({ slot: z.enum(IMAGE_SLOTS), url: imageUrl }))
            .max(IMAGE_SLOTS.length),
    })
    .superRefine((a, ctx) => {
        const slots = a.images.map((i) => i.slot);
        if (new Set(slots).size !== slots.length) {
            ctx.addIssue({ code: 'custom', path: ['images'], message: 'Each image slot can only be used once' });
        }
        for (const slot of REQUIRED_SLOTS) {
            if (!slots.includes(slot)) {
                ctx.addIssue({ code: 'custom', path: ['images'], message: `${slot} image is required` });
            }
        }
    });

export function parseArtworkInput(body: unknown): { data: AdminArtworkInput } | { error: string } {
    const parsed = artworkInputSchema.safeParse(body);
    if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return { error: `${issue.path.join('.') || 'input'}: ${issue.message}` };
    }
    return { data: parsed.data };
}
