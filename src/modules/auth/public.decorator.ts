import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marks a route that can be called without logging in.
// Every other route needs a valid admin token.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
