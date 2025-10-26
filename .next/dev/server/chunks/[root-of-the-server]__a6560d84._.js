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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$ajv$40$8$2e$17$2e$1$2f$node_modules$2f$ajv$2f$dist$2f$ajv$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/ajv.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$ajv$2d$formats$40$3$2e$0$2e$1_ajv$40$8$2e$17$2e$1$2f$node_modules$2f$ajv$2d$formats$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/ajv-formats@3.0.1_ajv@8.17.1/node_modules/ajv-formats/dist/index.js [app-route] (ecmascript)");
;
;
;
;
const runtime = "nodejs";
const dynamic = "force-dynamic";
const ajv = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$ajv$40$8$2e$17$2e$1$2f$node_modules$2f$ajv$2f$dist$2f$ajv$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]({
    allErrors: true,
    strict: false,
    removeAdditional: "all"
});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$ajv$2d$formats$40$3$2e$0$2e$1_ajv$40$8$2e$17$2e$1$2f$node_modules$2f$ajv$2d$formats$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(ajv);
function loadSchema() {
    const p = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["resolve"])(process.cwd(), "gpts", "draft", "schema.json");
    return JSON.parse((0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["readFileSync"])(p, "utf-8").replace(/^\uFEFF/, ""));
}
// Simple request schema (mapped to Tech/Product spec)
const requestSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        language: {
            type: "string",
            enum: [
                "en",
                "de",
                "es",
                "fr"
            ]
        },
        tone: {
            type: "string",
            enum: [
                "warm",
                "professional",
                "direct",
                "empathetic"
            ]
        },
        notes: {
            type: "string",
            maxLength: 2000
        } // teacher's draft notes/context
    },
    required: [
        "language",
        "tone",
        "notes"
    ]
};
const validateReq = ajv.compile(requestSchema);
const validateOut = ajv.compile(loadSchema());
async function POST(req) {
    try {
        const body = await req.json().catch(()=>({}));
        if (!validateReq(body)) {
            return new Response(JSON.stringify({
                error: "Invalid request",
                details: validateReq.errors
            }), {
                status: 400,
                headers: {
                    "content-type": "application/json"
                }
            });
        }
        // TODO: replace with model call using `body`
        const mock = {
            opening_line: "Thank you for your ongoing support.",
            main_comment: "Based on the details you shared, here is a clear, school-ready draft that acknowledges strengths and suggests one next step. We will focus on structuring ideas before writing and using a simple checklist to get started independently.",
            closing_line: "If helpful, I can share example prompts for that checklist.",
            tone: body.tone || "warm",
            safeguards_applied: [
                "privacy",
                "tone-check",
                "bias-check"
            ],
            meta: {
                language: body.language || "en",
                reading_time_seconds: 18,
                version: "1.0.0"
            }
        };
        if (!validateOut(mock)) {
            return new Response(JSON.stringify({
                error: "Output failed schema validation",
                details: validateOut.errors
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