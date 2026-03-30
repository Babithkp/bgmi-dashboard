import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json(
                { error: "Tournament id required" },
                { status: 400 }
            );
        }


        const tournament = await prisma.tournament.findUnique({
            where: { id },
            include: {
                matches: {
                    include: {
                        matchTeam: {
                            include: {
                                playerPerformances: true
                            }
                        },
                        group: {
                            include: {
                                groupTeamTournament: {
                                    include: {
                                        team: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });


        if (!tournament) {
            return NextResponse.json(
                { error: "Tournament not found" },
                { status: 404 }
            );
        }
        const teams = tournament.matches.flatMap(match =>
            match.group.groupTeamTournament.map(gtt => gtt.team)
          );
          const uniqueTeams = Array.from(
            new Map(teams.map(team => [team.id, team])).values()
          );
          const players = tournament.matches.flatMap(match =>
            match.matchTeam.flatMap(team =>
              team.playerPerformances.map(player => ({
                id: player.playerId,
                name: player.name,
              }))
            )
          );

          return NextResponse.json({
            tournamentId: id,
            teams: uniqueTeams,
            players: players.flatMap(player => [player]),
          });

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Failed to fetch players" },
            { status: 500 }
        );
    }
}