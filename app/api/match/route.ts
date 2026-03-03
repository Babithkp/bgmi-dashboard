import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";



type TeamStats = {
  teamName: string;
  totalFinishPoints: number;
  totalPoints: number;
  aliveCount: number;
  deadCount: number;
  teamImage: string;
  teamGroupImage: string;
  totalWins: number;
  status: string | null;
  matchesPlayed: number;
};

function resolveTeamStatusImage(
  aliveCount: number,
  tournament: {
    allDead?: string | null;
    oneAlive?: string | null;
    twoAlive?: string | null;
    threeAlive?: string | null;
    fourAlive?: string | null;
  } | null
) {
  if (!tournament) return null;

  if (aliveCount === 0) return tournament.allDead;
  if (aliveCount === 1) return tournament.oneAlive;
  if (aliveCount === 2) return tournament.twoAlive;
  if (aliveCount === 3) return tournament.threeAlive;

  return tournament.fourAlive;
}

export async function GET() {
  try {
    const match = await prisma.match.findFirst({
      where: { status: "Live" },
      orderBy: { updatedAt: "desc" },
      include: {
        group: {
          select: { name: true },
        },
        tournament: {
          select: {
            allDead: true,
            oneAlive: true,
            twoAlive: true,
            threeAlive: true,
            fourAlive: true,
          },
        },
        matchTeam: {
          include: {
            playerPerformances: true,
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

    if (!match.tournamentId) {
      return NextResponse.json(
        { error: "Tournament not linked to match" },
        { status: 400 }
      );
    }

    const tournamentMatches = await prisma.match.findMany({
      where: {
        tournamentId: match.tournamentId,
        winnerId: { not: null },
      },
      include: {
        winTeam: {
          select: {
            name: true,
          },
        },
      },
    });

    const winMap: Record<string, number> = {};

    for (const m of tournamentMatches) {
      const teamName = m.winTeam?.name;
      if (!teamName) continue;

      winMap[teamName] = (winMap[teamName] || 0) + 1;
    }
    const allTournamentMatches = await prisma.match.findMany({
      where: {
        tournamentId: match.tournamentId,
      },
      include: {
        matchTeam: {
          select: { name: true },
        },
      },
    });

    const matchCountMap: Record<string, number> = {};

    for (const m of allTournamentMatches) {
      for (const team of m.matchTeam) {
        matchCountMap[team.name] =
          (matchCountMap[team.name] || 0) + 1;
      }
    }

    const teamStats = match.matchTeam.reduce<Record<string, TeamStats>>(
      (acc, team) => {
        if (!acc[team.id]) {
          acc[team.id] = {
            teamName: team.name,
            teamImage: team.image,
            teamGroupImage: team.groupImage,
            status: team.status,
            totalFinishPoints: 0,
            totalPoints: team.totalPoints,
            aliveCount: 0,
            deadCount: 0,
            totalWins: winMap[team.name] || 0,
            matchesPlayed: matchCountMap[team.name] || 0,
          };
        }

        team.playerPerformances.forEach((perf) => {
          acc[team.id].totalFinishPoints += perf.finishesPoints;

          if (perf.status === "Alive") acc[team.id].aliveCount++;
          if (perf.status === "Dead") acc[team.id].deadCount++;
        });

        return acc;
      },
      {}
    );

    const rankedTeams = Object.values(teamStats)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((team, index) => ({
        teamRank: index + 1,
        teamName: team.teamName,
        teamImage: team.teamImage,
        teamGroupImage: team.teamGroupImage,
        totalWins: team.totalWins,
        matchesPlayed: team.matchesPlayed,
        teamTotalFinishPoints: team.totalFinishPoints,
        teamTotalPoints: team.totalPoints,
        aliveCount: team.aliveCount,
        deadCount: team.deadCount,
        status: team.status,
        aliveimage: resolveTeamStatusImage(
          team.aliveCount,
          match.tournament
        ),
      }));

    return NextResponse.json({
      matchName: match.name,
      groupName: match.group?.name,
      status: match.status,
      teams: rankedTeams,
    });

  } catch (error) {
    console.error("TEAM RANK ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch match data" },
      { status: 500 }
    );
  }
}





export async function POST(req: Request) {
  try {
    const { title, tournamentId, groupId } = await req.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }

    if (!tournamentId) {
      return NextResponse.json({ error: "Tournament required" }, { status: 400 });
    }

    if (!groupId) {
      return NextResponse.json({ error: "Group required" }, { status: 400 });
    }

    const groupTeams = await prisma.groupTeamTournament.findMany({
      where: {
        groupId,
        tournamentId,
      },
      include: {
        team: {
          include: {
            players: {
              where: {
                order: {
                  lte: 3,
                },
              },
              orderBy: {
                order: "asc",
              },
            },
          },
        },
      },
    });

    if (!groupTeams.length) {
      return NextResponse.json(
        { error: "No teams assigned to this group" },
        { status: 400 }
      );
    }

    const match = await prisma.match.create({
      data: {
        name: title.trim(),
        tournamentId,
        groupId,
        status: "Live",
      },
    });

    await prisma.matchTeam.createMany({
      data: groupTeams.map(({ team }) => ({
        teamId: team.id,
        name: team.name,
        image: team.image,
        groupImage: team.groupImage,
        group: groupId,
        status: "Live",
        matchId: match.id,
      })),
    });

    const createdMatchTeams = await prisma.matchTeam.findMany({
      where: { matchId: match.id },
    });

    const performances = createdMatchTeams.flatMap((matchTeam) => {
      const originalTeam = groupTeams.find(
        (gt) => gt.team.name === matchTeam.name
      )?.team;

      return (originalTeam?.players ?? []).map((player) => ({
        playerId: player.id,
        name: player.name,
        gameName: player.gameName,
        image: player.image,
        matchTeamId: matchTeam.id,
        status: "Alive",
      }));
    });

    if (performances.length > 0) {
      await prisma.matchPlayerPerformance.createMany({
        data: performances,
      });
    }

    return NextResponse.json({ success: true, match });

  } catch (error) {
    console.error("Create Match Error:", error);

    return NextResponse.json(
      { error: "Failed to create match" },
      { status: 500 }
    );
  }
}

