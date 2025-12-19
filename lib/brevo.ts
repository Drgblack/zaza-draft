import "server-only";
import { getBrevoSdk } from "@/lib/brevo";

// Use require so Next definitely treats it as runtime Node usage
export function getBrevoSdk() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("sib-api-v3-sdk");
  const SibApiV3Sdk = getBrevoSdk();

}
