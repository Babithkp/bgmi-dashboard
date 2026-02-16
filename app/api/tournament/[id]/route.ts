import { uploadToS3 } from "@/lib/fileUpload";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
      
      const { id } = await context.params
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            include: {
                teamTournaments: {
                    include: {
                        team: true
                    }
                }
            },
        })
        if (!tournament) {
            return NextResponse.json(
                { error: "Tournament not found" },
                { status: 404 }
            )
        }
        return NextResponse.json(tournament)
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch tournament" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> }
  ) {
    try {
      const { id } = await context.params;
      const formData = await req.formData();
  
      const name = formData.get("name") as string;
      const thumbnail = formData.get("thumbnail") as File | null;
      const teamsRaw = formData.get("teams") as string;
  
      const teams: string[] = JSON.parse(teamsRaw);
  
      let imageUrl;
  
      if (thumbnail) {
        const buffer = Buffer.from(await thumbnail.arrayBuffer());
        const ext = thumbnail.name.split(".").pop();
        const key = `dashboard/tournaments/${Date.now()}.${ext}`;
  
        imageUrl = await uploadToS3(buffer, key, thumbnail.type);
      }
  
      await prisma.tournament.update({
        where: { id },
        data: {
          name,
          ...(imageUrl && { image: imageUrl }),
        },
      });
  
      const existingRelations = await prisma.teamTournament.findMany({
        where: { tournamentId: id },
      });
  
      const existingTeamIds = existingRelations.map(r => r.teamId);
  
      const teamsToAdd = teams.filter(t => !existingTeamIds.includes(t));
      const teamsToRemove = existingTeamIds.filter(t => !teams.includes(t));
  
      if (teamsToAdd.length > 0) {
        await prisma.teamTournament.createMany({
          data: teamsToAdd.map(teamId => ({
            teamId,
            tournamentId: id,
          })),
        });
      }
  
      if (teamsToRemove.length > 0) {
        await prisma.teamTournament.deleteMany({
          where: {
            tournamentId: id,
            teamId: { in: teamsToRemove },
          },
        });
      }
  
      const updatedTournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          teamTournaments: {
            include: {
              team: true,
            },
          },
        },
      });
  
      return NextResponse.json(updatedTournament);
  
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to update tournament" },
        { status: 500 }
      );
    }
  }
  
