import { NextResponse } from "next/server";

import { apiRoot } from "@/lib/server-api";

// Generic pass-through so external clients (signed agents, Stripe webhooks)
// can reach the FastAPI surface through this deployment's single origin.
// The request path is preserved verbatim because agent signatures cover it.
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "transfer-encoding"
]);

async function proxy(request: Request, params: { path: string[] }): Promise<Response> {
  const targetPath = `/api/v1/${params.path.join("/")}`;
  const { search } = new URL(request.url);

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  const response = await fetch(`${apiRoot}${targetPath.slice("/api/v1".length)}${search}`, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
    redirect: "manual"
  });

  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await context.params);
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await context.params);
}

export async function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await context.params);
}

export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await context.params);
}

export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await context.params);
}
