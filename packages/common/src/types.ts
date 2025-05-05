import zod from 'zod';

export const SignupSchema = zod.object({
    username: zod
        .string()
        .min(3, 'Username must be at least 3 characters long')
        .max(20, 'Username must be at most 20 characters long')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),

    email:zod
        .string()
        .email('Invalid email address')
        .max(50, 'Email must be at most 50 characters long'),

    password: zod
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(50, 'Password must be at most 50 characters long'),
});

export const SigninSchema = zod.object({
    email:zod
        .string()
        .email('Invalid email address')
        .max(50, 'Email must be at most 50 characters long'),

    password: zod
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(50, 'Password must be at most 50 characters long'),
});

export const createRoomSchema = zod.object({
    name: zod
        .string()
        .min(1, "Room name is required"),

    slug: zod
        .string()
        .min(1, "Slug is required"), 

    public: zod
    .boolean()
    .optional(), // <-- optional if user wants, default false
});
