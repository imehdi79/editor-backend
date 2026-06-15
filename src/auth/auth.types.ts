/** Shape stored on `request.user` after the JWT guard runs. */
export interface AuthUser {
  userId: string;
  email: string;
}

/** Signed JWT payload. */
export interface JwtPayload {
  sub: string; // user id
  email: string;
}
