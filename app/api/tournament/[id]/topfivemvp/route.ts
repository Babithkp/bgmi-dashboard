import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
export interface Player {
    id: string;
    name: string;
    gameName: string;
    image: string;
    teamId?: string | null;
}

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        const tournament = await prisma.tournament.findUnique({
            where: { id },
            include: {
                matches: {
                    include: {
                        playerPerformances: {
                            include: {
                                player: true,
                            },
                        },
                    },
                },
            },
        });

        if (!tournament) {
            return NextResponse.json(
                { error: "Tournament not found" },
                { status: 404 }
            );
        }

        if (tournament.matches.length === 0) {
            return NextResponse.json({
                error: "No matches found",
            });
        }

        const allPerformances = tournament.matches.flatMap(
            match => match.playerPerformances
        );

        if (allPerformances.length === 0) {
            return NextResponse.json({
                error: "No performances found",
            });
        }

        const playerTotals = allPerformances.reduce((acc, perf) => {
            const playerId = perf.player.id;

            if (!acc[playerId]) {
                acc[playerId] = {
                    player: perf.player,
                    totalPoints: 0,
                };
            }

            acc[playerId].totalPoints += perf.totalPoints;

            return acc;
        }, {} as Record<string, { player: Player; totalPoints: number }>);

        const top5 = Object.values(playerTotals)
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .slice(0, 5);

        return NextResponse.json({
            tournamentId: tournament.id,
            tournamentName: tournament.name,
            top5MVP: top5,
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Failed to fetch tournament MVPs" },
            { status: 500 }
        );
    }
}
