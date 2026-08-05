import { z } from 'zod';

export const inquirySchema = z.object({
  kind: z.enum(['contact', 'commission']),
  name: z.string().trim().min(1, 'Please include your name.').max(120),
  email: z.string().trim().email('Please check your email address.').max(200),
  message: z.string().trim().min(5, 'Please add a little more detail.').max(5000),
  projectType: z.string().trim().max(120).optional(),
  timeline: z.string().trim().max(200).optional(),
  artwork: z.string().trim().max(200).optional(),
  /** Honeypot — real people leave this empty. */
  company: z.string().max(0).optional(),
});

export type Inquiry = z.infer<typeof inquirySchema>;
