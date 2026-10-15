import { z } from 'zod'

export const checkoutInput = z.object({
  tableToken: z.uuid(),
  customerName: z.string().trim().min(1).max(40),
  customerPhone: z.string().trim().max(20).transform((v) => v.replace(/[\s-]/g, '')).refine(
    (v) => !v || /^(\+62|62|0)8\d{7,12}$/.test(v),
  ).default(''),
  serviceType: z.enum(['dine_in', 'takeaway']),
  items: z.array(z.object({
    menu_item_id: z.number().int().positive().safe(),
    quantity: z.number().int().min(1).max(50),
    note: z.string().max(100).default(''),
  }).strict()).min(1).max(100),
}).strict()
