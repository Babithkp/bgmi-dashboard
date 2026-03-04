import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { GroupTypes, MatchPlayerPerformanceTypes, MatchTeamTypes, MatchTypes } from "@/lib/types";

interface LeaderboardTeam {
    teamRank?: number;
    teamId: string;            // real team id (team.teamId)
    teamName: string;
    teamImage: string;
    teamGroupImage: string;
    totalWins: number;
    matchesPlayed: number;
    teamTotalFinishPoints: number;
    placementPoints: number;   // sum across matches
    teamTotalPoints: number;   // sum across matches
    aliveCount: number;
    deadCount: number;
    status?: string | null;
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
                groups: {
                    include: {
                        matches: {
                            include: {
                                winTeam: { select: { id: true } }, // compare by id
                                matchTeam: {
                                    include: {
                                        playerPerformances: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!tournament) {
            return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
        }

        const teamMap: Record<string, LeaderboardTeam> = {};

        (tournament.groups as GroupTypes[]).forEach((group) => {
            group.matches?.forEach((match: MatchTypes) => {

                match.matchTeam?.forEach((team: MatchTeamTypes) => {
                    const key = team.teamId ?? team.name;

                    if (!teamMap[key]) {
                        teamMap[key] = {
                            teamId: key,
                            teamName: team.name,
                            teamImage: team.image,
                            teamGroupImage: team.groupImage || "",
                            totalWins: 0,
                            matchesPlayed: 0,
                            teamTotalFinishPoints: 0,
                            teamTotalPoints: 0,
                            placementPoints: 0,
                            aliveCount: 0,
                            deadCount: 0,
                            status: team.status,
                        };
                    }

                    const teamData = teamMap[key];

                    teamData.matchesPlayed += 1;

                    teamData.teamTotalPoints += team.totalPoints || 0;

                    teamData.placementPoints += team.placementPoints || 0;

                    if (match.winTeam?.id === team.id) {
                        teamData.totalWins += 1;
                    }

                    team.playerPerformances.forEach((player: MatchPlayerPerformanceTypes) => {
                        teamData.teamTotalFinishPoints += player.finishesPoints || 0;

                        if (player.status === "Alive") teamData.aliveCount += 1;
                        else teamData.deadCount += 1;
                    });
                });

            });
        });

        const leaderboard: LeaderboardTeam[] = Object.values(teamMap)
            .sort((a, b) => b.teamTotalPoints - a.teamTotalPoints)
            .map((team, index) => ({
                ...team,
                teamRank: index + 1
            }));

        return NextResponse.json(leaderboard);

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Failed to fetch leaderboard" },
            { status: 500 }
        );
    }
}