import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
  ) {
    try {
      const { id } = await context.params;
  
      const matches = await prisma.match.findMany({
        where: {
          tournamentId: id,
        },
        include: {
          winTeam: {
            select: {
              id: true,
              name: true,
            }
          },
          matchTeam: {
            include: {
              playerPerformances: true
            },
          },
          group: {
            select: {
              name: true
            }
          }
        },
      });
  
      // ✅ Build match count map
      const matchCountMap: Record<string, number> = {};
  
      for (const m of matches) {
        for (const team of m.matchTeam) {
          matchCountMap[team.name] =
            (matchCountMap[team.name] || 0) + 1;
        }
      }
  
      const updatedMatches = matches.map(match => ({
        ...match,
        matchTeam: match.matchTeam.map(team => ({
            matchesPlayed: matchCountMap[team.name] || 0, // ✅ ADDED
          ...team,
        })),
      }));
  
      return NextResponse.json(updatedMatches);
  
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to fetch matches" },
        { status: 500 }
      );
    }
  }