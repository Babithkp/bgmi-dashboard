import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";



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
              matchTeam: {
                include: {
                  playerPerformances: true,
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
  
      if (!tournament.matches.length) {
        return NextResponse.json(
          { error: "No matches found" },
          { status: 404 }
        );
      }
  
      const allTeams = tournament.matches.flatMap(match => match.matchTeam);
  
      if (!allTeams.length) {
        return NextResponse.json(
          { error: "No teams found" },
          { status: 404 }
        );
      }
  
      const teamTotals = allTeams.reduce((acc, team) => {
        const teamKey = `${team.name}-${team.image}`;
  
        if (!acc[teamKey]) {
          acc[teamKey] = {
            name: team.name,
            image: team.image,
            totalPoints: 0,
            players: {} as Record<string, {
              name: string;
              image: string;
              totalPoints: number;
              placementPoints: number;
              finishesPoints: number;
              teamContribution: number;
            }>,
          };
        }
  
        const teamPoints = team.playerPerformances.reduce(
          (sum, p) => sum + p.totalPoints,
          0
        );
  
        acc[teamKey].totalPoints += teamPoints;
  
        team.playerPerformances.forEach((perf) => {
          const playerKey = `${perf.name}-${perf.image}`;
  
          if (!acc[teamKey].players[playerKey]) {
            acc[teamKey].players[playerKey] = {
              name: perf.name,
              image: perf.image,
              totalPoints: 0,
              placementPoints: 0,
              finishesPoints: 0,
              teamContribution: 0,
            };
          }
  
          acc[teamKey].players[playerKey].totalPoints += perf.totalPoints;
          acc[teamKey].players[playerKey].placementPoints += perf.placementPoints;
          acc[teamKey].players[playerKey].finishesPoints += perf.finishesPoints;
          acc[teamKey].players[playerKey].teamContribution += perf.teamContribution;
        });
  
        return acc;
      }, {} as Record<string, {
        name: string;
        image: string;
        totalPoints: number;
        players: Record<string, {
          name: string;
          image: string;
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
          name: teamData.name,
          image: teamData.image,
          totalPoints: teamData.totalPoints,
  
          players: Object.values(teamData.players)
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .map((p) => ({
              name: p.name,
              image: p.image,
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
  