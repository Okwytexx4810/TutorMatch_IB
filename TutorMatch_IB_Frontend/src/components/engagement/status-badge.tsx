import { Badge } from "@/components/ui/badge";
import {
  BOOKING_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
  type BookingStatus,
  type RequestStatus,
} from "@/types/engagement";

/** Status chip for a tutor request. Labels/variants live in one shared map. */
export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const meta = REQUEST_STATUS_LABELS[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

/** Status chip for a booking. */
export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const meta = BOOKING_STATUS_LABELS[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}