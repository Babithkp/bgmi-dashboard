import { NextResponse } from "next/server";

export async function POST(
    request: Request,
) {
    const { id } = await request.json()
    console.log(id)
    return NextResponse.json({ success: true })
}