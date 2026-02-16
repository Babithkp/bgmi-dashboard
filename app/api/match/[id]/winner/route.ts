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
          winTeam: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          playerPerformances: {
            include: {
              player: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  teamId: true,
                },
              },
            },
          },
        },
      });
  
      if (!match) {
        return NextResponse.json(
          { error: "Match not found" },
          { status: 404 }
        );
      }
  
      if (!match.winTeamId || !match.winTeam) {
        return NextResponse.json(
          { error: "Winner not declared yet" },
          { status: 400 }
        );
      }
  
      const winnerPerformances = match.playerPerformances.filter(
        (p) => p.player.teamId === match.winTeamId
      );
  
      const stats = winnerPerformances.reduce(
        (acc, p) => {
          acc.placementPoints += p.placementPoints;
          acc.finishesPoints += p.finishesPoints;
          acc.totalPoints += p.totalPoints;
          acc.teamContribution += p.teamContribution;
          return acc;
        },
        {
          placementPoints: 0,
          finishesPoints: 0,
          totalPoints: 0,
          teamContribution: 0,
        }
      );
  
      const players = winnerPerformances.map((p) => ({
        id: p.player.id,
        name: p.player.name,
        image: p.player.image,
        placementPoints: p.placementPoints,
        finishesPoints: p.finishesPoints,
        totalPoints: p.totalPoints,
        teamContribution: p.teamContribution,
        status: p.status,
      }));
  
      return NextResponse.json({
        matchId: match.id,
        matchName: match.name,
        team: match.winTeam,
        stats,
        players,
      });
  
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to fetch winning team details" },
        { status: 500 }
      );
    }
  }
  