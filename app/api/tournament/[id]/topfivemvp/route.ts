import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Player, Team } from "../mvp/route";



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
                                player: {
                                    include: {
                                        team: true,
                                    },
                                },
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
            return NextResponse.json(
                { error: "No matches found" },
                { status: 404 }
            );
        }

        const allPerformances = tournament.matches.flatMap(
            (match) => match.playerPerformances
        );

        if (allPerformances.length === 0) {
            return NextResponse.json(
                { error: "No performances found" },
                { status: 404 }
            );
        }

        const teamTotals = allPerformances.reduce((acc, perf) => {
            const teamId = perf.player.team?.id;

            if (!teamId) return acc;

            if (!acc[teamId]) {
                acc[teamId] = {
                    team: perf.player.team,
                    totalPoints: 0,
                    players: {},
                };
            }

            acc[teamId].totalPoints += perf.totalPoints;


            const playerId = perf.player.id;

            if (!acc[teamId].players[playerId]) {
                acc[teamId].players[playerId] = {
                    player: perf.player,
                    totalPoints: 0,
                    placementPoints: 0,
                    finishesPoints: 0,
                    teamContribution: 0,
                };
            }

            acc[teamId].players[playerId].totalPoints += perf.totalPoints;
            acc[teamId].players[playerId].placementPoints += perf.placementPoints;
            acc[teamId].players[playerId].finishesPoints += perf.finishesPoints;
            acc[teamId].players[playerId].teamContribution += perf.teamContribution;

            return acc;
        }, {} as Record<string, {
            team: Team | null;
            totalPoints: number;
            players: Record<string, {
                player: Player;
                totalPoints: number;
                placementPoints: number;
                finishesPoints: number;
                teamContribution: number;
            }>;
        }>);

        const top5Teams = Object.values(teamTotals)
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .slice(0, 5);

        return NextResponse.json({
            tournamentName: tournament.name,
            teams: top5Teams.map((teamData, index) => ({
                rank: index + 1,
                name: teamData.team?.name,
                image: teamData.team?.image,
                totalPoints: teamData.totalPoints,
                players: Object.values(teamData.players)
                    .sort((a, b) => b.totalPoints - a.totalPoints)
                    .map((p) => ({
                        name: p.player.name,
                        image: p.player.image,
                        totalPoints: p.totalPoints,
                        placementPoints: p.placementPoints,
                        finishesPoints: p.finishesPoints,
                        teamContribution: Number(p.teamContribution.toFixed(2)),
                    })),
            })),
        });

    } catch (error) {
        console.error("TOP 5 TEAMS ERROR:", error);

        return NextResponse.json(
            { error: "Failed to fetch Top 5 Teams" },
            { status: 500 }
        );
    }
}
