import { NextResponse } from "next/server";

/** Uniform registration ack — does not reveal whether the email already exists. */
export function registerAckResponse(): NextResponse {
  return NextResponse.json({ success: true }, { status: 200 });
}
