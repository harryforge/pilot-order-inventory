/** PostgreSQL error code for a unique constraint violation. */
const UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(error: unknown, constraint: string): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const driverError = (error as { driverError?: { code?: string; constraint?: string } })
    .driverError;
  return driverError?.code === UNIQUE_VIOLATION && driverError.constraint === constraint;
}
