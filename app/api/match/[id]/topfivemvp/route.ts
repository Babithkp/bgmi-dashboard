import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        const match = await prisma.match.findUnique({
            where: { id },
            include: {
                playerPerformances: {
                    include: {
                        player: true,
                    },
                },
                winTeam: true,
            },
        });

        if (!match) {
            return NextResponse.json(
                { error: "Match not found" },
                { status: 404 }
            );
        }

        if (match.playerPerformances.length === 0) {
            return NextResponse.json(
                { error: "No performances found" },
                { status: 404 }
            );
        }

        const sorted = [...match.playerPerformances].sort(
            (a, b) => b.totalPoints - a.totalPoints
        );

        const top5 = sorted.slice(0, 5);

        return NextResponse.json({
            matchId: match.id,
            matchName: match.name,
            players: top5.map((p, index) => ({
                rank: index + 1,
                player: p.player,
                placementPoints: p.placementPoints,
                finishesPoints: p.finishesPoints,
                totalPoints: p.totalPoints,
                teamContribution: p.teamContribution,
                status: p.status,
            })),
        });

    } catch (error) {
        console.error("TOP 5 MVP ERROR:", error);

        return NextResponse.json(
            { error: "Failed to fetch Top 5 MVPs" },
            { status: 500 }
        );
    }
}
