import * as Sentry from "@sentry/nextjs";
import { getSentryOptions } from "./sentry.shared.config";

Sentry.init(getSentryOptions());
