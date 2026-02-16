import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const tournaments = await prisma.tournament.findMany({
            include: {
                matches: true,
            }
        });
        const teamsCount = await prisma.team.count();
        const playersCount = await prisma.player.count();
        return NextResponse.json({ tournaments, teamsCount, playersCount });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch tournaments" }, { status: 500 });
    }
}