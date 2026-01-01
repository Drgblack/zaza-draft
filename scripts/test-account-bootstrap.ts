import assert from "node:assert"
import type { FirestoreLike } from "../lib/account-bootstrap"
import { ensureUserDocument } from "../lib/account-bootstrap"

class MockUserRef {
  private existsFlag: boolean
  dataStore: Record<string, unknown>
  deleted = false
  constructor(exists = false, initialData: Record<string, unknown> = {}) {
    this.existsFlag = exists
    this.dataStore = initialData
  }
  get() {
    return Promise.resolve({
      exists: this.existsFlag,
      data: () => (this.existsFlag ? this.dataStore : undefined),
    })
  }
  set(data: Record<string, unknown>, options?: { merge?: boolean }) {
    if (options?.merge) {
      this.dataStore = { ...this.dataStore, ...data }
    } else {
      this.dataStore = data
    }
    this.existsFlag = true
    return Promise.resolve()
  }
}

class MockCollection {
  private userRef: MockUserRef
  constructor(userRef: MockUserRef) {
    this.userRef = userRef
  }
  doc(_id: string) {
    return this.userRef
  }
}

class MockFirestore implements FirestoreLike {
  private userRef: MockUserRef
  constructor(userRef: MockUserRef) {
    this.userRef = userRef
  }
  collection(_path: string) {
    return new MockCollection(this.userRef)
  }
  settings() {
    return this
  }
  waitForPendingWrites() {
    return Promise.resolve()
  }
  enablePersistence() {
    return Promise.resolve()
  }
  terminate() {
    return Promise.resolve()
  }
}

async function main() {
  const newDoc = new MockUserRef(false)
  const firestore = new MockFirestore(newDoc)
  const firstResult = await ensureUserDocument(firestore, "uid-test")
  assert.strictEqual(firstResult, true)
  const existingDoc = new MockUserRef(true, { plan: "free" })
  const firestore2 = new MockFirestore(existingDoc)
  const secondResult = await ensureUserDocument(firestore2, "uid-test")
  assert.strictEqual(secondResult, false)
  console.log("Account bootstrap helper test passed.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
