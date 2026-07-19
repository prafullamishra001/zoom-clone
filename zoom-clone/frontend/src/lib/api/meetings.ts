import { apiClient } from './client';

// Meeting types
export interface Meeting {
  id: number;
  meeting_id: string;
  title?: string;
  description?: string;
  host_id: number;
  scheduled_time?: string;
  duration?: number;
  is_active: boolean;
  created_at: string;
}

export interface ScheduleMeetingRequest {
  title: string;
  description?: string;
  scheduled_time: string;
  duration: number;
}

export interface JoinMeetingRequest {
  meeting_id: string;
  display_name: string;
}

export interface JoinMeetingResponse {
  message: string;
  meeting: Meeting;
  user: {
    id: number;
    name: string;
    email: string;
    display_name: string;
    created_at: string;
  };
}

// Meeting API functions
export const meetingsApi = {
  async createInstantMeeting(hostId: number): Promise<Meeting> {
    return apiClient.post<Meeting>(`/meetings/instant?host_id=${hostId}`);
  },

  async scheduleMeeting(data: ScheduleMeetingRequest, hostId: number): Promise<Meeting> {
    return apiClient.post<Meeting>(`/meetings/schedule?host_id=${hostId}`, data);
  },

  async getMeeting(meetingId: string): Promise<Meeting> {
    return apiClient.get<Meeting>(`/meetings/${meetingId}`);
  },

  async getUpcomingMeetings(userId: number): Promise<Meeting[]> {
    return apiClient.get<Meeting[]>(`/meetings/user/${userId}/upcoming`);
  },

  async getRecentMeetings(userId: number): Promise<Meeting[]> {
    return apiClient.get<Meeting[]>(`/meetings/user/${userId}/recent`);
  },

  async joinMeeting(data: JoinMeetingRequest): Promise<JoinMeetingResponse> {
    return apiClient.post<JoinMeetingResponse>('/meetings/join', data);
  },

  async endMeeting(meetingId: string): Promise<{ message: string; meeting: Meeting }> {
    return apiClient.post<{ message: string; meeting: Meeting }>(`/meetings/${meetingId}/end`);
  },

  async getMeetingParticipants(meetingId: string): Promise<any[]> {
    return apiClient.get<any[]>(`/meetings/${meetingId}/participants`);
  },
};
