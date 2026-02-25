import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
    await prisma.matchTeam.updateMany({
        where: { status: "Eliminated" },
        data: { status: "Displayed" },
    })
    return NextResponse.json({ success: true })
}

export async function GET() {
    try {
        const totalAliveTeams = await prisma.matchTeam.count({
            where: { status: "Live" },
        });
        const teams = await prisma.matchTeam.findMany({
            where: { status: "Eliminated" },
        });
        return NextResponse.json({
            teams: teams.map((team) => ({
                rank: Math.max(totalAliveTeams + 1, 0),
                name: team.name,
                image: team.image,
                status: team.status,
            })),
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}