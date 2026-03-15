import type { Firestore } from "firebase-admin/firestore"
import { getUserEntitlements, type UserEntitlements } from "@/lib/entitlements"
import { isForcedProUser } from "@/lib/dev/forced-pro-users"
import {
  fetchZazaIdEntitlement,
  type ResolvedDraftEntitlement,
  ZazaIdEntitlementError,
} from "@/lib/zaza-id/entitlements"

export type DraftEntitlementResolutionSource =
  | "development_override"
  | "remote"
  | "remote_terminal"
  | "local_fallback"
  | "local_disabled"

interface ResolveDraftEntitlementOptions {
  uid: string
  firestore: Firestore
  idToken: string
  localEntitlements?: UserEntitlements
}

interface DraftEntitlementResolution {
  entitlement: ResolvedDraftEntitlement
  source: DraftEntitlementResolutionSource
  localEntitlements: UserEntitlements
}

function isFlagEnabled(value: string | undefined) {
  if (!value) {
    return false
  }
  const normalized = value.trim().toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on"
}

export function isZazaIdEntitlementsEnabled() {
  return isFlagEnabled(process.env.ZAZA_ID_ENTITLEMENTS_ENABLED)
}

function buildLocalEntitlement(uid: string): ResolvedDraftEntitlement {
  return {
    userId: uid,
    productKey: "draft",
    hasAccess: true,
    accessType: "comp",
    expiresAt: null,
    source: "direct",
    sourceOrgId: null,
    orgId: null,
    licenceId: null,
    status: "active",
  }
}

function buildDevelopmentOverrideEntitlement(uid: string): ResolvedDraftEntitlement {
  return {
    userId: uid,
    productKey: "draft",
    hasAccess: true,
    accessType: "comp",
    expiresAt: null,
    source: "direct",
    sourceOrgId: null,
    orgId: null,
    licenceId: null,
    status: "active",
  }
}

function buildForcedProLocalEntitlements(uid: string, local: UserEntitlements): UserEntitlements {
  return {
    ...local,
    plan: "pro",
    usageRecord: local.usageRecord,
    usage: {
      ...local.usage,
      plan: "pro",
      limit: null,
      remaining: null,
      unlimited: true,
    },
    isProSubscriber: true,
  }
}

function buildNoAccessEntitlement(uid: string): ResolvedDraftEntitlement {
  return {
    userId: uid,
    productKey: "draft",
    hasAccess: false,
    accessType: "none",
    expiresAt: null,
    source: "none",
    sourceOrgId: null,
    orgId: null,
    licenceId: null,
    status: "none",
  }
}

export function hasDraftEntitlementAccess(entitlement: Pick<ResolvedDraftEntitlement, "hasAccess" | "status">) {
  return entitlement.hasAccess && (entitlement.status === "active" || entitlement.status === "trial")
}

export async function resolveDraftEntitlement({
  uid,
  firestore,
  idToken,
  localEntitlements,
}: ResolveDraftEntitlementOptions): Promise<DraftEntitlementResolution> {
  const forceProUserIdsSet = Boolean((process.env.FORCE_PRO_USER_IDS ?? "").trim())
  const devOverrideFiring = isForcedProUser(uid)

  console.log("[draft-entitlement] resolve", {
    uid,
    forceProUserIdsSet,
    devOverrideFiring,
  })

  const loadLocalEntitlements = async () => localEntitlements ?? getUserEntitlements(uid, firestore)

  if (devOverrideFiring) {
    const local = buildForcedProLocalEntitlements(uid, await loadLocalEntitlements())
    return {
      entitlement: buildDevelopmentOverrideEntitlement(uid),
      source: "development_override",
      localEntitlements: local,
    }
  }

  if (!isZazaIdEntitlementsEnabled()) {
    const local = await loadLocalEntitlements()
    return {
      entitlement: buildLocalEntitlement(uid),
      source: "local_disabled",
      localEntitlements: local,
    }
  }

  try {
    const remoteEntitlement = await fetchZazaIdEntitlement({ idToken, productKey: "draft" })
    const local = await loadLocalEntitlements()
    return {
      entitlement: remoteEntitlement,
      source: "remote",
      localEntitlements: local,
    }
  } catch (error) {
    if (error instanceof ZazaIdEntitlementError && !error.retryable) {
      const local = await loadLocalEntitlements()
      return {
        entitlement: buildNoAccessEntitlement(uid),
        source: "remote_terminal",
        localEntitlements: local,
      }
    }

    const local = await loadLocalEntitlements()
    return {
      entitlement: buildLocalEntitlement(uid),
      source: "local_fallback",
      localEntitlements: local,
    }
  }
}
