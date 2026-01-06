import "server-only";

// Use require so Next definitely treats it as runtime Node usage
export function getBrevoSdk() {
  return require("sib-api-v3-sdk");
}
