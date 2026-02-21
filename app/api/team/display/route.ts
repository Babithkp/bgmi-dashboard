import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
) {
    const { teamId } = await request.json()
    await prisma.matchTeam.update({
        where: { id: teamId },
        data: { status: "Displayed" },
    })
    return NextResponse.json({ success: true })
}