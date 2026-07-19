import { apiClient } from './client';

// Participant types
export interface Participant {
  id: number;
  meeting_id: number;
  user_id: number;
  joined_at: string;
  is_muted: boolean;
  is_video_on: boolean;
}

// Participant API functions
export const participantsApi = {
  async removeParticipant(meetingId: number, userId: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/participants/${meetingId}/${userId}`);
  },

  async muteParticipant(meetingId: number, userId: number, isMuted: boolean): Promise<{ message: string; participant: Participant }> {
    return apiClient.put<{ message: string; participant: Participant }>(
      `/participants/${meetingId}/${userId}/mute?is_muted=${isMuted}`
    );
  },

  async muteAllParticipants(meetingId: number, exceptUserId?: number): Promise<{ message: string }> {
    const params = exceptUserId ? `?except_user_id=${exceptUserId}` : '';
    return apiClient.post<{ message: string }>(`/participants/${meetingId}/mute-all${params}`);
  },
};
