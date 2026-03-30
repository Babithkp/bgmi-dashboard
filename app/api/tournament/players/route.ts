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
  
      // ✅ Teams (from matchTeam, not group)
      const teams = tournament.matches.flatMap(match =>
        match.matchTeam.map(team => ({
          id: team.teamId,
          name: team.name,
          image: team.image
        }))
      );
  
      const uniqueTeams = Array.from(
        new Map(teams.map(team => [team.id, team])).values()
      );
  
      // ✅ Players (merged)
      const playerMap = new Map();
  
      tournament.matches.forEach(match => {
        match.matchTeam.forEach(team => {
          team.playerPerformances.forEach(player => {
            const id = player.playerId;
  
            if (playerMap.has(id)) {
              playerMap.get(id).finishesPoints += player.finishesPoints ?? 0;
            } else {
              playerMap.set(id, {
                id: player.playerId,
                name: player.name,
                finishesPoints: player.finishesPoints ?? 0
              });
            }
          });
        });
      });
  
      const players = [...playerMap.values()].sort(
        (a, b) => b.finishesPoints - a.finishesPoints
      );
  
      return NextResponse.json({
        teams: uniqueTeams,
        players
      });
  
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to fetch players" },
        { status: 500 }
      );
    }
  }