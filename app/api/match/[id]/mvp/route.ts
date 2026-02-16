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
        return NextResponse.json({
          error: "No performances found",
        });
      }
  
      const mvp = match.playerPerformances.reduce((best, current) =>
        current.totalPoints > best.totalPoints ? current : best
      );
  
      return NextResponse.json({
        matchId: match.id,
        matchName: match.name,
        mvp: mvp.player,
        totalPoints: mvp.totalPoints,
      });
  
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to fetch MVP" },
        { status: 500 }
      );
    }
  }
  