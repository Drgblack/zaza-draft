module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/node:fs [external] (node:fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:fs", () => require("node:fs"));

module.exports = mod;
}),
"[externals]/node:path [external] (node:path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:path", () => require("node:path"));

module.exports = mod;
}),
"[project]/app/api/draft/generate/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "dynamic",
    ()=>dynamic,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ajv$2f$dist$2f$ajv$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/ajv/dist/ajv.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ajv$2d$formats$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/ajv-formats/dist/index.js [app-route] (ecmascript)");
;
;
;
;
const runtime = "nodejs";
const dynamic = "force-dynamic";
function loadSchema() {
    const p = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["resolve"])(process.cwd(), "gpts", "draft", "schema.json");
    // strip BOM just in case
    return JSON.parse((0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["readFileSync"])(p, "utf-8").replace(/^\uFEFF/, ""));
}
const ajv = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ajv$2f$dist$2f$ajv$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]({
    allErrors: true,
    strict: false,
    removeAdditional: "all"
});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ajv$2d$formats$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(ajv);
const draftSchema = loadSchema();
const validate = ajv.compile(draftSchema);
async function POST(req) {
    try {
        const body = await req.json().catch(()=>({}));
        const mock = {
            opening_line: "Thank you for your ongoing support.",
            main_comment: "Based on the details you shared, I drafted a clear, empathetic update that acknowledges strengths and outlines one next step. We will focus on structuring ideas before writing and using a simple checklist to get started independently.",
            closing_line: "If helpful, I can share example prompts for that checklist.",
            tone: "supportive",
            safeguards_applied: [
                "privacy",
                "tone-check",
                "bias-check"
            ],
            meta: {
                language: body?.language || "EN",
                reading_time_seconds: 18,
                version: "1.0.0"
            }
        };
        if (!validate(mock)) {
            return new Response(JSON.stringify({
                error: "Mock failed schema validation",
                details: validate.errors
            }), {
                status: 500,
                headers: {
                    "content-type": "application/json"
                }
            });
        }
        return new Response(JSON.stringify(mock), {
            status: 200,
            headers: {
                "content-type": "application/json"
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({
            error: "Bad request",
            details: err?.message || String(err)
        }), {
            status: 400,
            headers: {
                "content-type": "application/json"
            }
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__a6560d84._.js.map