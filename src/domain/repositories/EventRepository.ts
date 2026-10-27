import type { CommunityEvent, EventCategory } from "../entities/Event";

export interface CreateEventInput {
  communityId?: string;
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
}

export interface EventFilter {
  city?: string;
  category?: string;
  upcomingOnly?: boolean;
}

export interface EventRepository {
  getEvents(filter?: EventFilter): Promise<CommunityEvent[]>;
  getEventById(id: string): Promise<CommunityEvent | null>;
  createEvent(input: CreateEventInput): Promise<CommunityEvent>;
  cancelEvent(id: string): Promise<void>;
  joinEvent(
    id: string,
  ): Promise<{ status: "confirmed"; participantsCount: number; capacity: number }>;
  cancelParticipation(
    id: string,
  ): Promise<{ status: "cancelled"; participantsCount: number }>;
}
