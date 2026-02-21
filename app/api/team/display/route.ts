import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
) {
    const { id } = await request.json()
    await prisma.matchTeam.update({
        where: { id },
        data: { status: "Displayed" },
    })
    return NextResponse.json({ success: true })
}