import assert from "node:assert"
import { deleteUserData, hasDeleteConfirm } from "../lib/account-data"
import type { Firestore } from "firebase-admin/firestore"

class MockBatch {
  private firestore: MockFirestore
  constructor(firestore: MockFirestore) {
    this.firestore = firestore
  }
  delete(ref: { path: string }) {
    this.firestore.deletedPaths.push(ref.path)
    return this
  }
  set() {
    return this
  }
  update() {
    return this
  }
  commit() {
    this.firestore.commitCount += 1
    return Promise.resolve()
  }
}

class MockCollection {
  readonly name: string
  private queue: string[][]
  private firestore: MockFirestore
  constructor(name: string, batches: string[][], firestore: MockFirestore) {
    this.name = name
    this.queue = batches.map((batch) => [...batch])
    this.firestore = firestore
  }
  limit() {
    return this
  }
  async get() {
    const next = this.queue.shift() ?? []
    const docs = next.map((id) => ({
      id,
      ref: { path: `${this.name}/${id}` },
    }))
    return {
      docs,
      empty: docs.length === 0,
    }
  }
}

class MockUserRef {
  private collections: Record<string, string[][]>
  deleted = false
  constructor(collections: Record<string, string[][]>) {
    this.collections = collections
  }
  collection(name: string) {
    const batches = this.collections[name] ?? []
    return new MockCollection(name, batches, mockFirestoreInstance)
  }
  async delete() {
    this.deleted = true
  }
}

class MockFirestore {
  deletedPaths: string[] = []
  commitCount = 0
  collectionRefMap: Record<string, Record<string, string[][]>>
  constructor(collections: Record<string, Record<string, string[][]>>) {
    this.collectionRefMap = collections
  }
  collection(name: string) {
    return {
      doc: () => new MockUserRef(this.collectionRefMap[name] ?? {}),
    }
  }
  batch() {
    return new MockBatch(this)
  }
  // Other Firestore methods unused
  async runTransaction() {
    throw new Error("not implemented")
  }
  async getAll() {
    throw new Error("not implemented")
  }
}

const mockFirestoreInstance = new MockFirestore({
  users: {
    snippets: [
      ["snippet-1", "snippet-2"],
      ["snippet-3"],
    ],
    diagnostics: [["status"]],
    rateLimits: [["draftGenerate"]],
  },
})

async function main() {
  assert.strictEqual(hasDeleteConfirm({}), false)
  assert.strictEqual(hasDeleteConfirm({ confirm: false }), false)
  assert.strictEqual(hasDeleteConfirm({ confirm: true }), true)

  await deleteUserData(mockFirestoreInstance as unknown as Firestore, "uid-123")
  assert.deepStrictEqual(mockFirestoreInstance.deletedPaths.sort(), [
    "diagnostics/status",
    "rateLimits/draftGenerate",
    "snippets/snippet-1",
    "snippets/snippet-2",
    "snippets/snippet-3",
  ])
  assert(mockFirestoreInstance.commitCount >= 3)
  console.log("Account delete helper test passed.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
