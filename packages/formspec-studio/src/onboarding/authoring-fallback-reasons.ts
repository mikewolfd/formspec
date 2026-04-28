/** @filedesc Stable fallback reason taxonomy for authoring method telemetry. */
export const AUTHORING_FALLBACK_REASONS = {
  GROUP_REJECTED_BY_USER: 'group_rejected_by_user',
  ALL_REJECTED_BY_USER: 'all_rejected_by_user',
  AI_CHANGESET_REJECTED: 'ai_changeset_rejected',
  CAPABILITY_COMMAND_PARSE_ERROR: 'capability_command_parse_error',
  CAPABILITY_COMMAND_EXECUTION_ERROR: 'capability_command_execution_error',
  CAPABILITY_COMMAND_UNKNOWN_ACTION: 'capability_command_unknown_action',
} as const;

export type AuthoringFallbackReason =
  typeof AUTHORING_FALLBACK_REASONS[keyof typeof AUTHORING_FALLBACK_REASONS];

