export type Severity = "INFO" | "WARNING" | "ERROR";

/**
 * One JSON line per event. Cloud Run forwards stdout to Cloud Logging, which reads `severity`
 * and links entries to traces through the `logging.googleapis.com/trace` field.
 */
export function log(
  severity: Severity,
  message: string,
  fields: Record<string, unknown> = {},
  traceHeader?: string,
) {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const traceId = traceHeader?.split("/")[0];
  const entry = {
    severity,
    message,
    ...fields,
    ...(traceId && project
      ? { "logging.googleapis.com/trace": `projects/${project}/traces/${traceId}` }
      : {}),
  };
  (severity === "ERROR" ? console.error : console.log)(JSON.stringify(entry));
}
