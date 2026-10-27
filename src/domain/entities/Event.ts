export type EventCategory =
  | "Atölye"
  | "Söyleşi"
  | "Buluşma"
  | "Konser"
  | "Diğer";

export interface CommunityEvent {
  id: string;
  communityId?: string | null;
  organizerId: string;
  organizerName?: string;
  title: string;
  category: EventCategory;
  city: string;
  district?: string;
  place?: string;
  startsAt: string;
  endsAt: string;
  description?: string;
  accessibility?: string;
  bring?: string;
  capacity: number;
  currentParticipants: number;
  isCancelled: boolean;
  isJoinedByMe?: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}
