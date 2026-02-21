import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
    await prisma.matchTeam.updateMany({
        where: { status: "Eliminated" },
        data: { status: "Displayed" },
    })
    return NextResponse.json({ success: true })
}