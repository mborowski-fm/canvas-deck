/** Messages between the main window and the presenter-notes window (same browser). */
export type ChannelMsg =
  | { type: 'active'; active: number }
  | { type: 'goto'; index: number }
  | { type: 'hello' }

export const channelName = (room: string) => `canvas-deck:${room}`
