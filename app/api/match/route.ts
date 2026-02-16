import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const { title, tournamentId,group } = await req.json();
    try {
        const match = await prisma.match.create({
            data: {
                name: title,
                status: "Live",
                tournamentId: tournamentId,
                group: group,
            },
        });
        const teamTournaments = await prisma.teamTournament.findMany({
            where: {
                tournamentId: tournamentId,
                group: group,
            },
            include: {
                team: {
                    include: {
                        players: true,
                    },
                },
            },
        });
        const players = teamTournaments.flatMap(
            tt => tt.team?.players ?? []
        );

        if (players.length > 0) {
            await prisma.matchPlayerPerformance.createMany({
                data: players.map(player => ({
                    playerId: player.id,
                    matchId: match.id,
                })),
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Failed to create match" },
            { status: 500 }
        );
    }
}

