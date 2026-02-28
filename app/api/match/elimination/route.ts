import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const eliminatedTeams = await prisma.eliminationTeam.findMany()
        return NextResponse.json(eliminatedTeams)
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: String(error) },
            { status: 500 }
        );
    }
}