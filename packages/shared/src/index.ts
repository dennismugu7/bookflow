export { formatKes } from "./money";
export { compactKes, formatMinutes } from "./compact";
export { formatUsualGap } from "./gap";
export { initialsFor } from "./initials";
export { areaLine, shortArea } from "./area";
export { PHONE_ERROR, formatKenyanPhone, normalizeKenyanPhone } from "./phone";
export { DELETE_ACCOUNT_URL, PRIVACY_URL, TERMS_URL, WEB_BASE_URL, bookingLink } from "./links";
export {
  DELETION_COUNTER_FROM,
  DELETION_DETAILS_MAX,
  DELETION_REASONS,
  DELETION_REASON_VALUES,
  SUPPORT_EMAIL,
  canContinueDeletion,
  deletionConfirmParts,
  deletionCounter,
  deletionStatement,
  isDeletionReason,
  parseDeletionSummary,
  upcomingWarningParts,
  type DeletionReason,
  type DeletionSummary,
  type DeletionSummarySalon,
  type TextPart,
} from "./account-deletion";
export { SHARE_MESSAGE_MAX, defaultShareMessage, shareText } from "./share";
export {
  GOOGLE_MAPS_URL,
  inspectMapsLink,
  isGoogleMapsUrl,
  mapsEmbedUrl,
  mediaUrl,
  parseGoogleMapsLink,
  resolveMapsLink,
  type LatLng,
  type MapsLinkInfo,
} from "./maps";
export { toSalonSlug } from "./slug";
export {
  BOOKING_ERROR_CODES,
  bookingErrorKind,
  isBookingErrorCode,
  type BookingErrorCode,
  type BookingErrorKind,
} from "./booking-errors";
export type {
  CompositeTypes,
  Database,
  Enums,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./database.types";
export { Constants } from "./database.types";
